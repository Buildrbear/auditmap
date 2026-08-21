const { authenticatedUser } = require("./_lib/account-auth");
const {
  assertSameOrigin,
  enforceRateLimit,
  featureEnabled,
  requireFeature,
} = require("./_lib/abuse-controls");
const sharp = require("sharp");
const {
  databaseConfig,
  directStorageOrigin,
  storageRequest,
  storageUpload,
  supabaseRequest,
} = require("./_lib/supabase");

const AVATAR_BUCKET = "community-profile-avatars";
const MAX_AVATAR_BYTES = 750 * 1024;
const SUPPORTED_TYPES = {
  "image/jpeg": { extension: "jpg", signature: (buffer) => buffer[0] === 0xff && buffer[1] === 0xd8 },
  "image/webp": { extension: "webp", signature: (buffer) => buffer.subarray(0, 4).toString() === "RIFF" && buffer.subarray(8, 12).toString() === "WEBP" },
};

function parseAvatarDataUrl(value) {
  const match = String(value || "").match(/^data:(image\/(?:jpeg|webp));base64,([a-zA-Z0-9+/=]+)$/);
  if (!match || !SUPPORTED_TYPES[match[1]]) {
    const error = new Error("Choose a JPEG, PNG, HEIC, or WebP photo.");
    error.status = 400;
    throw error;
  }
  const buffer = Buffer.from(match[2], "base64");
  const type = match[1];
  if (!buffer.length || buffer.length > MAX_AVATAR_BYTES || !SUPPORTED_TYPES[type].signature(buffer)) {
    const error = new Error("That profile photo could not be validated. Try another image.");
    error.status = 400;
    throw error;
  }
  return { buffer, type, extension: SUPPORTED_TYPES[type].extension };
}

async function normalizeAvatar(buffer) {
  try {
    return await sharp(buffer, { limitInputPixels: 20_000_000 })
      .rotate()
      .resize(512, 512, { fit: "cover", position: "attention" })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    const error = new Error("That profile photo could not be processed. Try another image.");
    error.status = 400;
    throw error;
  }
}

async function ensureAvatarBucket() {
  try {
    await storageRequest(`bucket/${AVATAR_BUCKET}`);
    return;
  } catch {
    try {
      await storageRequest("bucket", {
        method: "POST",
        body: JSON.stringify({
          id: AVATAR_BUCKET,
          name: AVATAR_BUCKET,
          public: true,
          file_size_limit: MAX_AVATAR_BYTES,
          allowed_mime_types: Object.keys(SUPPORTED_TYPES),
        }),
      });
    } catch (error) {
      const detail = JSON.stringify(error.detail || {});
      if (!/already exists|duplicate/i.test(detail)) throw error;
    }
  }
}

async function updateAuthAvatar(user, avatarUrl) {
  const config = databaseConfig();
  const authResponse = await fetch(`${config.url}/auth/v1/admin/users/${user.id}`, {
    method: "PUT",
    headers: {
      apikey: config.serviceKey,
      Authorization: `Bearer ${config.serviceKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      app_metadata: { ...(user.app_metadata || {}), auditmap_avatar_url: avatarUrl },
    }),
  });
  if (!authResponse.ok) throw new Error("The profile photo was stored but could not be attached to the account.");
}

module.exports = async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    response.status(405).json({ error: "Method not allowed." });
    return;
  }
  try {
    assertSameOrigin(request);
    requireFeature("PROFILE_PHOTOS_ENABLED", "Profile photo uploads are briefly paused.");
    const { user } = await authenticatedUser(request, { requireActive: true });
    if (
      user.app_metadata?.auditmap_demo !== true &&
      !featureEnabled("PUBLIC_PROFILE_PHOTOS_ENABLED", false)
    ) {
      response.status(503).json({
        error: "Public profile photos will open after the review queue is connected.",
        code: "PROFILE_PHOTO_REVIEW_REQUIRED",
      });
      return;
    }
    enforceRateLimit(request, response, {
      name: "profile-avatar",
      subject: user.id,
      limit: 3,
      windowMs: 24 * 60 * 60 * 1000,
    });
    const avatar = parseAvatarDataUrl(request.body?.dataUrl);
    const safeAvatar = await normalizeAvatar(avatar.buffer);
    await ensureAvatarBucket();
    const storagePath = `${user.id}/profile.webp`;
    await storageUpload(`object/${AVATAR_BUCKET}/${storagePath}`, safeAvatar, "image/webp");
    const avatarUrl = `${directStorageOrigin()}/storage/v1/object/public/${AVATAR_BUCKET}/${storagePath}?v=${Date.now()}`;
    await updateAuthAvatar(user, avatarUrl);

    // The auth metadata is the compatibility source until the community migration is live.
    await supabaseRequest(`community_profiles?user_id=eq.${user.id}`, {
      method: "PATCH",
      body: JSON.stringify({ avatar_url: avatarUrl }),
    }).catch(() => null);

    response.status(200).json({ avatarUrl });
  } catch (error) {
    response.status(error.status || 502).json({ error: error.message || "Profile photo upload failed." });
  }
};

module.exports._private = { MAX_AVATAR_BYTES, normalizeAvatar, parseAvatarDataUrl };
