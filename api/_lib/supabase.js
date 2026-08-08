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
    error.path = path;
    throw error;
  }

  if (response.status === 204) return null;
  return response.json();
}

async function storageRequest(path, options = {}) {
  const config = databaseConfig();
  if (!config) {
    const error = new Error("The shared storage service is not configured.");
    error.code = "STORAGE_NOT_CONFIGURED";
    throw error;
  }
  const response = await fetch(`${config.url}/storage/v1/${path}`, {
    ...options,
    headers: {
      apikey: config.serviceKey,
      Authorization: `Bearer ${config.serviceKey}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(`Storage request failed (${response.status}).`);
    error.detail = payload;
    error.path = path;
    throw error;
  }
  return payload;
}

async function storageDownload(path) {
  const config = databaseConfig();
  if (!config) throw new Error("The shared storage service is not configured.");
  const response = await fetch(`${config.url}/storage/v1/${path}`, {
    headers: {
      apikey: config.serviceKey,
      Authorization: `Bearer ${config.serviceKey}`,
    },
  });
  if (!response.ok) {
    const error = new Error(`Storage download failed (${response.status}).`);
    error.path = path;
    throw error;
  }
  return Buffer.from(await response.arrayBuffer());
}

async function storageUpload(path, body, contentType = "image/jpeg") {
  const config = databaseConfig();
  if (!config) throw new Error("The shared storage service is not configured.");
  const response = await fetch(`${config.url}/storage/v1/${path}`, {
    method: "POST",
    headers: {
      apikey: config.serviceKey,
      Authorization: `Bearer ${config.serviceKey}`,
      "Content-Type": contentType,
      "x-upsert": "true",
    },
    body,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(`Storage upload failed (${response.status}).`);
    error.detail = payload;
    error.path = path;
    throw error;
  }
  return payload;
}

function directStorageOrigin() {
  const config = databaseConfig();
  if (!config) return null;
  try {
    const url = new URL(config.url);
    const projectId = url.hostname.split(".")[0];
    return `${url.protocol}//${projectId}.storage.supabase.co`;
  } catch {
    return config.url;
  }
}

module.exports = {
  databaseConfig,
  databaseReady,
  directStorageOrigin,
  storageDownload,
  storageRequest,
  storageUpload,
  supabaseRequest,
};
