const crypto = require("node:crypto");
const sharp = require("sharp");
const { authenticatedUser } = require("./_lib/account-auth");
const {
  assertSameOrigin,
  enforceRateLimit,
  requireFeature,
} = require("./_lib/abuse-controls");
const {
  databaseReady,
  directStorageOrigin,
  storageDownload,
  storageRequest,
  supabaseRequest,
} = require("./_lib/supabase");

const BUCKET = process.env.CRUMB_MEDIA_BUCKET || "community-media-inbox";
const MEDIA_LIMITS = {
  photo: 12 * 1024 * 1024,
  panorama: 25 * 1024 * 1024,
  photo_360: 50 * 1024 * 1024,
};
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);

function cleanText(value, limit = 180) {
  return String(value || "").trim().slice(0, limit);
}

function cleanUuid(value) {
  const candidate = cleanText(value, 36);
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(candidate)
    ? candidate
    : null;
}

function cleanCoordinate(value, minimum, maximum) {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= minimum && number <= maximum ? number : null;
}

function pilotPlaceAllowed(placeId) {
  const configured = cleanText(process.env.CRUMB_PILOT_PLACE_IDS || "dix-park", 2000)
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return configured.includes("*") || configured.includes(placeId);
}

function safeExtension(fileName, mimeType) {
  const byType = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/heic": "heic",
    "image/heif": "heif",
  };
  const candidate = cleanText(fileName, 180).split(".").pop().toLowerCase();
  return byType[mimeType] || (/^[a-z0-9]{2,5}$/.test(candidate) ? candidate : "jpg");
}

async function institutionForPlace(placeId) {
  const rows = await supabaseRequest(
    `institutions?public_id=eq.${encodeURIComponent(placeId)}&select=id,public_id&limit=1`,
    { method: "GET" },
  );
  return rows?.[0] || null;
}

function encodeStoragePath(path) {
  return path.split("/").map(encodeURIComponent).join("/");
}

async function signedMediaUrl(storagePath, expiresIn = 3600) {
  if (!storagePath) return null;
  const payload = await storageRequest(
    `object/sign/${encodeURIComponent(BUCKET)}/${encodeStoragePath(storagePath)}`,
    { method: "POST", body: JSON.stringify({ expiresIn }) },
  );
  const signed = payload.signedURL || payload.signedUrl || payload.url;
  if (!signed) return null;
  return /^https?:/i.test(signed)
    ? signed
    : `${directStorageOrigin() || ""}/storage/v1${signed.startsWith("/") ? "" : "/"}${signed}`;
}

async function createIntent(request, response) {
  assertSameOrigin(request);
  requireFeature("MEDIA_UPLOADS_ENABLED", "Community media uploads are briefly paused.");
  const { user } = await authenticatedUser(request, { requireActive: true });
  enforceRateLimit(request, response, {
    name: "media-intent",
    subject: user.id,
    limit: 12,
    windowMs: 60 * 60 * 1000,
  });
  const body = request.body || {};
  const placeId = cleanText(body.placeId, 180);
  const mediaKind = MEDIA_LIMITS[body.mediaKind] ? body.mediaKind : null;
  const mimeType = cleanText(body.mimeType, 100).toLowerCase();
  const byteSize = Number(body.sizeBytes);
  if (!pilotPlaceAllowed(placeId)) {
    response.status(403).json({ error: "Crumb media uploads are not enabled for this place yet." });
    return;
  }
  if (!mediaKind || !ALLOWED_TYPES.has(mimeType) || !(byteSize > 0) || byteSize > MEDIA_LIMITS[mediaKind]) {
    response.status(400).json({ error: "Choose a supported image within the upload limit." });
    return;
  }
  const institution = await institutionForPlace(placeId);
  if (!institution) {
    response.status(404).json({ error: "This place is not available for shared media yet." });
    return;
  }
  const pending = await supabaseRequest(
    `media?user_id=eq.${user.id}&status=eq.pending&storage_state=in.(intent,uploaded)&select=id,byte_size&limit=25`,
    { method: "GET" },
  );
  const pendingBytes = (pending || []).reduce(
    (total, item) => total + Math.max(0, Number(item.byte_size) || 0),
    0,
  );
  if ((pending || []).length >= 10 || pendingBytes + byteSize > 100 * 1024 * 1024) {
    response.status(429).json({
      error: "Finish or let us review your current uploads before adding more.",
      code: "MEDIA_PENDING_QUOTA",
    });
    return;
  }
  const mediaId = crypto.randomUUID();
  const extension = safeExtension(body.fileName, mimeType);
  const storagePath = `${user.id}/${institution.id}/${mediaId}.${extension}`;
  await supabaseRequest("media", {
    method: "POST",
    body: JSON.stringify({
      id: mediaId,
      institution_id: institution.id,
      user_id: user.id,
      storage_path: storagePath,
      feature_id: cleanUuid(body.featureId),
      media_kind: mediaKind,
      mime_type: mimeType,
      byte_size: byteSize,
      alt_text: cleanText(body.altText, 300) || null,
      author_name: cleanText(body.authorName, 120) || null,
      status: "pending",
      storage_state: "intent",
      metadata: {
        clientSanitized: Boolean(body.clientSanitized),
        latitude: cleanCoordinate(body.latitude, -90, 90),
        longitude: cleanCoordinate(body.longitude, -180, 180),
        locationScope: cleanText(body.locationScope, 30) || null,
        locationLabel: cleanText(body.locationLabel, 180) || null,
      },
    }),
  });
  const signed = await storageRequest(
    `object/upload/sign/${encodeURIComponent(BUCKET)}/${encodeStoragePath(storagePath)}`,
    { method: "POST", body: "{}" },
  );
  response.status(201).json({
    mediaId,
    bucket: BUCKET,
    storagePath,
    uploadToken: signed.token,
    signedUrl: signed.url || signed.signedURL || null,
    endpoint: `${directStorageOrigin()}/storage/v1/upload/resumable`,
    uploadExpiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    maxBytes: MEDIA_LIMITS[mediaKind],
  });
}

async function completeIntent(request, response) {
  assertSameOrigin(request);
  requireFeature("MEDIA_UPLOADS_ENABLED", "Community media uploads are briefly paused.");
  const { user } = await authenticatedUser(request, { requireActive: true });
  enforceRateLimit(request, response, {
    name: "media-complete",
    subject: user.id,
    limit: 24,
    windowMs: 60 * 60 * 1000,
  });
  const body = request.body || {};
  const mediaId = cleanUuid(body.mediaId);
  if (!mediaId) {
    response.status(400).json({ error: "The uploaded image could not be identified." });
    return;
  }
  const claimedWidth = Number(body.width);
  const claimedHeight = Number(body.height);
  const rows = await supabaseRequest(
    `media?id=eq.${mediaId}&user_id=eq.${user.id}&status=eq.pending&select=id,media_kind,mime_type,byte_size,storage_path,storage_state,metadata&limit=1`,
    { method: "GET" },
  );
  const media = rows?.[0];
  if (!media) {
    response.status(404).json({ error: "That media upload is no longer available." });
    return;
  }
  if (media.storage_state && media.storage_state !== "intent") {
    response.status(409).json({ error: "That upload has already been completed." });
    return;
  }
  if (
    media.media_kind === "photo_360" &&
    Number.isInteger(claimedWidth) &&
    Number.isInteger(claimedHeight) &&
    claimedHeight > 0 &&
    Math.abs(claimedWidth / claimedHeight - 2) > 0.04
  ) {
    response.status(400).json({ error: "A true 360 photo must be a 2:1 equirectangular image." });
    return;
  }
  const encodedPath = media.storage_path.split("/").map(encodeURIComponent).join("/");
  const source = await storageDownload(
    `object/${encodeURIComponent(BUCKET)}/${encodedPath}`,
  );
  if (!source.length || source.length > MEDIA_LIMITS[media.media_kind]) {
    response.status(400).json({ error: "The stored file is outside the allowed upload size." });
    return;
  }
  let imageMetadata;
  try {
    imageMetadata = await sharp(source, {
      failOn: "warning",
      limitInputPixels: 120_000_000,
    }).metadata();
  } catch {
    response.status(400).json({ error: "The uploaded file is not a valid image." });
    return;
  }
  const formats = {
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    heif: media.mime_type === "image/heic" ? "image/heic" : "image/heif",
  };
  const detectedMime = formats[imageMetadata.format];
  const width = imageMetadata.autoOrient?.width || imageMetadata.width;
  const height = imageMetadata.autoOrient?.height || imageMetadata.height;
  if (!detectedMime || !ALLOWED_TYPES.has(detectedMime) || !width || !height || width < 320 || height < 240) {
    response.status(400).json({ error: "The uploaded image format or dimensions could not be verified." });
    return;
  }
  const ratio = width / height;
  if (media.media_kind === "photo_360" && Math.abs(ratio - 2) > 0.04) {
    response.status(400).json({ error: "A true 360 photo must be a 2:1 equirectangular image." });
    return;
  }
  const checksum = crypto.createHash("sha256").update(source).digest("hex");
  const updated = await supabaseRequest(`media?id=eq.${mediaId}`, {
    method: "PATCH",
    body: JSON.stringify({
      width,
      height,
      mime_type: detectedMime,
      byte_size: source.length,
      checksum,
      captured_at: cleanText(body.capturedAt, 80) || null,
      storage_state: "uploaded",
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      metadata: {
        ...(media.metadata || {}),
        projection: media.media_kind === "photo_360" ? "equirectangular" : "flat",
        clientCompletedAt: new Date().toISOString(),
        serverValidated: true,
        sourceFormat: imageMetadata.format,
      },
    }),
  });
  response.status(200).json({ media: updated?.[0] });
}

async function cleanup(request, response) {
  const supplied = cleanText(String(request.headers.authorization || "").replace(/^Bearer\s+/i, ""), 500);
  const expected = process.env.CRON_SECRET || process.env.MODERATION_ADMIN_TOKEN;
  if (!expected || supplied !== expected) {
    response.status(401).json({ error: "Cleanup access could not be confirmed." });
    return;
  }
  const abandoned = await supabaseRequest(
    `media?storage_state=in.(intent,uploaded,rejected)&expires_at=lt.${encodeURIComponent(new Date().toISOString())}&select=id,contribution_id,storage_state,storage_path,preview_path,derivative_path&limit=200`,
    { method: "GET" },
  );
  for (const media of abandoned || []) {
    if (media.storage_state === "uploaded" && media.contribution_id) continue;
    for (const path of [media.storage_path, media.preview_path, media.derivative_path].filter(Boolean)) {
      await storageRequest(`object/${encodeURIComponent(BUCKET)}/${encodeStoragePath(path)}`, {
        method: "DELETE",
      }).catch(() => null);
    }
    await supabaseRequest(`media?id=eq.${media.id}`, {
      method: "PATCH",
      body: JSON.stringify({ storage_state: "abandoned" }),
    });
  }
  const outdated = await supabaseRequest(
    `contributions?moderation_status=eq.published&verification_status=neq.outdated&fresh_until=lt.${encodeURIComponent(new Date().toISOString())}&select=id&limit=500`,
    { method: "GET" },
  );
  if (outdated?.length) {
    await supabaseRequest(`contributions?id=in.(${outdated.map((item) => item.id).join(",")})`, {
      method: "PATCH",
      body: JSON.stringify({ verification_status: "outdated" }),
    });
  }
  const cleaned = (abandoned || []).filter(
    (item) => item.storage_state !== "uploaded" || !item.contribution_id,
  ).length;
  response.status(200).json({ cleaned, aged: outdated?.length || 0 });
}

module.exports = async function handler(request, response) {
  if (!databaseReady()) {
    response.status(503).json({ error: "Shared media storage is not configured." });
    return;
  }
  const action = cleanText(request.query?.action || request.body?.action || "intent", 20);
  if (action === "cleanup" && ["GET", "POST"].includes(request.method)) {
    try {
      return await cleanup(request, response);
    } catch (error) {
      response.status(error.status || 502).json({ error: error.message || "Media cleanup failed." });
      return;
    }
  }
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    response.status(405).json({ error: "Method not allowed." });
    return;
  }
  try {
    if (action === "intent") return await createIntent(request, response);
    if (action === "complete") return await completeIntent(request, response);
    response.status(400).json({ error: "Unknown media action." });
  } catch (error) {
    response.status(error.status || 502).json({ error: error.message || "Media upload failed." });
  }
};

module.exports._private = {
  ALLOWED_TYPES,
  MEDIA_LIMITS,
  pilotPlaceAllowed,
  safeExtension,
  signedMediaUrl,
};
