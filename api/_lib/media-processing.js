const { createHash } = require("node:crypto");
const sharp = require("sharp");
const { storageDownload, storageUpload, supabaseRequest } = require("./supabase");

const BUCKET = process.env.CRUMB_MEDIA_BUCKET || "community-media-inbox";
const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp", "heif"]);

function encodePath(path) {
  return path.split("/").map(encodeURIComponent).join("/");
}

async function jpegDerivative(input, maxEdge, quality) {
  return sharp(input, { limitInputPixels: 120_000_000, failOn: "warning" })
    .rotate()
    .resize({ width: maxEdge, height: maxEdge, fit: "inside", withoutEnlargement: true })
    .flatten({ background: "#ffffff" })
    .jpeg({ quality, chromaSubsampling: "4:2:0", progressive: true })
    .toBuffer({ resolveWithObject: true });
}

async function processOne(item) {
  const source = await storageDownload(
    `object/${encodeURIComponent(BUCKET)}/${encodePath(item.storage_path)}`,
  );
  const checksum = createHash("sha256").update(source).digest("hex");
  if (item.checksum && checksum !== item.checksum) {
    throw new Error("Uploaded media did not match its completed upload checksum.");
  }
  const metadata = await sharp(source, { limitInputPixels: 120_000_000, failOn: "warning" }).metadata();
  if (!ALLOWED_FORMATS.has(metadata.format) || !metadata.width || !metadata.height) {
    throw new Error("Attached media is not a supported decodable image.");
  }
  const orientedWidth = metadata.autoOrient?.width || metadata.width;
  const orientedHeight = metadata.autoOrient?.height || metadata.height;
  if (item.media_kind === "photo_360" && Math.abs(orientedWidth / orientedHeight - 2) > 0.04) {
    throw new Error("A 360 attachment must be a 2:1 equirectangular image.");
  }

  const maxEdge = item.media_kind === "photo" ? 3200 : 8192;
  let derivative = await jpegDerivative(source, maxEdge, item.media_kind === "photo" ? 82 : 86);
  if (item.media_kind === "photo" && derivative.data.length > 4 * 1024 * 1024) {
    derivative = await jpegDerivative(source, 2800, 72);
  }
  const preview = await jpegDerivative(source, 1280, 72);
  const base = item.storage_path.replace(/\.[^.]+$/, "");
  const derivativePath = `${base}.published.jpg`;
  const previewPath = `${base}.preview.jpg`;
  await Promise.all([
    storageUpload(
      `object/${encodeURIComponent(BUCKET)}/${encodePath(derivativePath)}`,
      derivative.data,
    ),
    storageUpload(
      `object/${encodeURIComponent(BUCKET)}/${encodePath(previewPath)}`,
      preview.data,
    ),
  ]);
  const updated = await supabaseRequest(`media?id=eq.${item.id}`, {
    method: "PATCH",
    body: JSON.stringify({
      derivative_path: derivativePath,
      preview_path: previewPath,
      width: derivative.info.width,
      height: derivative.info.height,
      mime_type: "image/jpeg",
      storage_state: "ready",
      metadata: {
        ...(item.metadata || {}),
        sourceFormat: metadata.format,
        derivativeByteSize: derivative.data.length,
        previewByteSize: preview.data.length,
        serverChecksum: checksum,
        serverValidated: true,
        exifRemoved: true,
        processedAt: new Date().toISOString(),
        projection: item.media_kind === "photo_360" ? "equirectangular" : "flat",
      },
    }),
  });
  return updated?.[0];
}

async function processContributionMedia(contributionId) {
  const items = await supabaseRequest(
    `media?contribution_id=eq.${contributionId}&status=in.(pending,rejected)&storage_state=in.(uploaded,rejected,ready)&select=id,storage_path,media_kind,checksum,metadata,storage_state&order=created_at.asc`,
    { method: "GET" },
  );
  const processed = [];
  for (const item of items || []) {
    processed.push(item.storage_state === "ready" ? item : await processOne(item));
  }
  return processed;
}

module.exports = { ALLOWED_FORMATS, processContributionMedia, _private: { jpegDerivative } };
