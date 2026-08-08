function modelName(value, fallback = "gpt-4.1-mini") {
  const name = String(value || fallback).trim();
  return name || fallback;
}

function aiConnection(options = {}) {
  const directKey = process.env.OPENAI_API_KEY;
  if (directKey) {
    return {
      apiUrl: "https://api.openai.com/v1/responses",
      token: directKey,
      model: modelName(options.model),
      provider: "openai",
    };
  }

  const gatewayExplicitlyEnabled =
    Boolean(process.env.AI_GATEWAY_API_KEY) ||
    process.env.AI_GATEWAY_ENABLED === "true";
  if (!gatewayExplicitlyEnabled) return null;

  let contextToken = "";
  try {
    contextToken = require("@vercel/oidc").getVercelOidcTokenSync();
  } catch {
    // Local and non-Vercel runtimes may not have a request-scoped workload token.
  }
  const gatewayToken =
    process.env.AI_GATEWAY_API_KEY ||
    process.env.VERCEL_OIDC_TOKEN ||
    contextToken;
  if (!gatewayToken) return null;
  const requested = modelName(options.model);
  return {
    apiUrl: "https://ai-gateway.vercel.sh/v1/responses",
    token: gatewayToken,
    model: requested.includes("/") ? requested : `openai/${requested}`,
    provider: "vercel-ai-gateway",
  };
}

async function resolveAiConnection(options = {}) {
  const current = aiConnection(options);
  if (current) return current;
  if (process.env.AI_GATEWAY_ENABLED !== "true") return null;
  try {
    const token = await require("@vercel/oidc").getVercelOidcToken();
    if (!token) return null;
    const requested = modelName(options.model);
    return {
      apiUrl: "https://ai-gateway.vercel.sh/v1/responses",
      token,
      model: requested.includes("/") ? requested : `openai/${requested}`,
      provider: "vercel-ai-gateway",
    };
  } catch {
    return null;
  }
}

async function checkAiConnection(connection) {
  if (!connection) {
    return { ready: false, reason: "AI authentication is not configured." };
  }
  if (connection.provider !== "vercel-ai-gateway") {
    return { ready: true, reason: null };
  }
  try {
    const response = await fetch("https://ai-gateway.vercel.sh/v1/credits", {
      headers: {
        Authorization: `Bearer ${connection.token}`,
        "Content-Type": "application/json",
      },
    });
    if (response.ok) return { ready: true, reason: null };
    const payload = await response.json().catch(() => ({}));
    return {
      ready: false,
      reason: String(payload.error?.message || `AI Gateway readiness failed (${response.status}).`)
        .replace(/https?:\/\/\S+/g, "")
        .trim()
        .slice(0, 300),
    };
  } catch {
    return { ready: false, reason: "AI Gateway readiness could not be confirmed." };
  }
}

module.exports = {
  aiConnection,
  checkAiConnection,
  resolveAiConnection,
};
