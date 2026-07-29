function databaseConfig() {
  const url = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && serviceKey ? { url: url.replace(/\/$/, ""), serviceKey } : null;
}

function databaseReady() {
  return Boolean(databaseConfig());
}

async function supabaseRequest(path, options = {}) {
  const config = databaseConfig();
  if (!config) {
    const error = new Error("The shared database is not configured.");
    error.code = "DATABASE_NOT_CONFIGURED";
    throw error;
  }

  const response = await fetch(`${config.url}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: config.serviceKey,
      Authorization: `Bearer ${config.serviceKey}`,
      "Content-Type": "application/json",
      Prefer: options.prefer || "return=representation",
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const detail = await response.text();
    const error = new Error(`Database request failed (${response.status}).`);
    error.detail = detail;
    throw error;
  }

  if (response.status === 204) return null;
  return response.json();
}

module.exports = {
  databaseReady,
  supabaseRequest,
};
