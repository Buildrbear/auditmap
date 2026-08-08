const { createHash, randomBytes } = require("node:crypto");

const buckets = new Map();
const MAX_BUCKETS = 10_000;

class SafetyError extends Error {
  constructor(message, status = 403, code = "SAFETY_CHECK_FAILED") {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function cleanText(value, limit = 500) {
  return String(value || "").trim().slice(0, limit);
}

function featureEnabled(name, defaultValue = true) {
  const value = process.env[name];
  if (value == null || value === "") return defaultValue;
  return !["0", "false", "off", "disabled"].includes(String(value).trim().toLowerCase());
}

function requireFeature(name, message, defaultValue = true) {
  if (!featureEnabled(name, defaultValue)) {
    throw new SafetyError(message, 503, "FEATURE_PAUSED");
  }
}

function clientAddress(request) {
  const forwarded = cleanText(request.headers?.["x-forwarded-for"], 500)
    .split(",")[0]
    .trim();
  return forwarded || cleanText(request.headers?.["x-real-ip"], 120) || "unknown";
}

function stableHash(value, purpose = "request") {
  const salt = process.env.ABUSE_HASH_SALT || process.env.CONTRIBUTION_HASH_SALT;
  const deploymentSalt = salt || process.env.VERCEL_PROJECT_ID || "auditmap-local-safety";
  return createHash("sha256")
    .update(`${purpose}|${cleanText(value, 1000)}|${deploymentSalt}`)
    .digest("hex");
}

function requestFingerprint(request, purpose = "request") {
  return stableHash(clientAddress(request), purpose);
}

function assertSameOrigin(request) {
  const fetchSite = cleanText(request.headers?.["sec-fetch-site"], 40).toLowerCase();
  if (fetchSite === "cross-site") {
    throw new SafetyError("This request must be started from AuditMap.", 403, "CROSS_SITE_REQUEST");
  }
  const origin = cleanText(request.headers?.origin, 500);
  if (!origin) return;
  const forwardedHost = cleanText(
    request.headers?.["x-forwarded-host"] || request.headers?.host,
    300,
  ).split(",")[0];
  if (!forwardedHost) return;
  try {
    if (new URL(origin).host !== forwardedHost) {
      throw new SafetyError("This request must be started from AuditMap.", 403, "ORIGIN_MISMATCH");
    }
  } catch (error) {
    if (error instanceof SafetyError) throw error;
    throw new SafetyError("This request origin could not be verified.", 403, "INVALID_ORIGIN");
  }
}

function pruneBuckets(now) {
  if (buckets.size < MAX_BUCKETS) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
    if (buckets.size < MAX_BUCKETS * 0.8) break;
  }
  if (buckets.size >= MAX_BUCKETS) {
    const oldest = [...buckets.entries()]
      .sort((left, right) => left[1].resetAt - right[1].resetAt)
      .slice(0, Math.ceil(MAX_BUCKETS * 0.2));
    oldest.forEach(([key]) => buckets.delete(key));
  }
}

function enforceRateLimit(request, response, options = {}) {
  const now = Date.now();
  const limit = Math.max(1, Number(options.limit) || 10);
  const windowMs = Math.max(1_000, Number(options.windowMs) || 60_000);
  const subject = options.subject || requestFingerprint(request, options.name || "api");
  const key = `${options.name || "api"}:${stableHash(subject, "rate-limit")}`;
  pruneBuckets(now);
  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }
  bucket.count += 1;
  const remaining = Math.max(0, limit - bucket.count);
  response.setHeader?.("X-RateLimit-Limit", String(limit));
  response.setHeader?.("X-RateLimit-Remaining", String(remaining));
  response.setHeader?.("X-RateLimit-Reset", String(Math.ceil(bucket.resetAt / 1000)));
  if (bucket.count > limit) {
    const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    response.setHeader?.("Retry-After", String(retryAfter));
    console.warn(JSON.stringify({
      event: "rate_limit_exceeded",
      route: options.name || "api",
      requestId: cleanText(request.headers?.["x-vercel-id"], 120) || randomBytes(6).toString("hex"),
      subject: stableHash(subject, "security-log").slice(0, 16),
    }));
    throw new SafetyError(
      options.message || "You’re moving a little quickly. Please wait and try again.",
      429,
      "RATE_LIMITED",
    );
  }
  return { limit, remaining, resetAt: bucket.resetAt };
}

function safetyResponse(response, error, fallback = "This action is temporarily unavailable.") {
  response.status(error.status || 500).json({
    error: error.message || fallback,
    code: error.code || "SAFETY_ERROR",
  });
}

module.exports = {
  SafetyError,
  assertSameOrigin,
  clientAddress,
  enforceRateLimit,
  featureEnabled,
  requestFingerprint,
  requireFeature,
  safetyResponse,
  stableHash,
  _private: { buckets, pruneBuckets },
};
