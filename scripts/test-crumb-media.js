const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");

process.env.SUPABASE_URL = "https://auditmap-test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";
process.env.CRUMB_PILOT_PLACE_IDS = "dix-park";

const mediaHandler = require("../api/media");
const { IMPACT_POINTS, levelForSummary } = require("../api/_lib/crumb-impact");
const { _private: processing } = require("../api/_lib/media-processing");
const { _private: feed } = require("../api/feed");

function recorder() {
  return {
    statusCode: 200,
    body: null,
    setHeader() {},
    status(value) { this.statusCode = value; return this; },
    json(value) { this.body = value; return this; },
  };
}

async function invoke(body, authorization = "Bearer user-token", action = "intent") {
  const response = recorder();
  await mediaHandler(
    { method: "POST", query: { action }, body, headers: { authorization } },
    response,
  );
  return response;
}

async function run() {
  assert.equal(mediaHandler._private.MEDIA_LIMITS.panorama, 25 * 1024 * 1024);
  assert.equal(mediaHandler._private.MEDIA_LIMITS.photo_360, 50 * 1024 * 1024);
  assert.equal(mediaHandler._private.pilotPlaceAllowed("dix-park"), true);
  assert.equal(mediaHandler._private.pilotPlaceAllowed("other-park"), false);
  assert.equal(mediaHandler._private.safeExtension("phone.heic", "image/jpeg"), "jpg");
  assert.deepEqual(IMPACT_POINTS, {
    approvedText: 1,
    usefulLocation: 1,
    approvedPhoto: 3,
    approvedPanorama: 5,
    approved360: 10,
    acceptedVerification: 4,
    acceptedCorrection: 8,
    uniqueThank: 1,
  });

  const originalFetch = global.fetch;
  const requests = [];
  try {
    global.fetch = async (url, options = {}) => {
      requests.push({ url: String(url), options });
      if (String(url).endsWith("/auth/v1/user")) {
        return Response.json({ id: "11111111-1111-4111-8111-111111111111" });
      }
      if (String(url).includes("/rest/v1/institutions?")) {
        return Response.json([{ id: "22222222-2222-4222-8222-222222222222", public_id: "dix-park" }]);
      }
      if (String(url).includes("/rest/v1/media?")) {
        return Response.json([{
          id: "33333333-3333-4333-8333-333333333333",
          media_kind: "photo_360",
          byte_size: 4_000_000,
          storage_path: "user/place/photo.jpg",
          metadata: {},
        }]);
      }
      if (String(url).endsWith("/rest/v1/media")) return Response.json([{}], { status: 201 });
      if (String(url).includes("/storage/v1/object/upload/sign/")) {
        return Response.json({ token: "signed-upload-token" });
      }
      throw new Error(`Unexpected request: ${url}`);
    };

    const unauthenticated = await invoke({ placeId: "dix-park" }, "");
    assert.equal(unauthenticated.statusCode, 401);
    const outsidePilot = await invoke({ placeId: "other-park", mediaKind: "photo", mimeType: "image/jpeg", sizeBytes: 1000 });
    assert.equal(outsidePilot.statusCode, 403);
    const invalid = await invoke({ placeId: "dix-park", mediaKind: "photo_360", mimeType: "image/jpeg", sizeBytes: 51 * 1024 * 1024 });
    assert.equal(invalid.statusCode, 400);
    const intent = await invoke({ placeId: "dix-park", mediaKind: "photo_360", mimeType: "image/jpeg", sizeBytes: 4_000_000, fileName: "park.jpg" });
    assert.equal(intent.statusCode, 201);
    assert.equal(intent.body.uploadToken, "signed-upload-token");
    assert.match(intent.body.endpoint, /storage\.supabase\.co\/storage\/v1\/upload\/resumable$/);
    assert.ok(new Date(intent.body.uploadExpiresAt) > new Date());
    assert.ok(requests.some((item) => item.url.includes("/storage/v1/object/upload/sign/community-media-inbox/")));
    const invalid360 = await invoke({
      mediaId: "33333333-3333-4333-8333-333333333333",
      width: 3000,
      height: 1000,
      checksum: "a".repeat(64),
    }, "Bearer user-token", "complete");
    assert.equal(invalid360.statusCode, 400);
    assert.match(invalid360.body.error, /2:1/);
  } finally {
    global.fetch = originalFetch;
  }

  const source = fs.readFileSync(path.resolve(__dirname, "../assets/test-media/grand-canyon-trail-of-time-360.jpg"));
  const sourceMetadata = await sharp(source).metadata();
  assert.equal(sourceMetadata.width / sourceMetadata.height, 2);
  assert.ok(sourceMetadata.exif, "The source fixture should exercise EXIF removal.");
  const derivative = await processing.jpegDerivative(source, 3200, 82);
  const metadata = await sharp(derivative.data).metadata();
  assert.equal(metadata.width, 3200);
  assert.equal(metadata.height, 1600);
  assert.equal(metadata.exif, undefined, "Published derivatives must not retain EXIF metadata.");

  assert.equal(feed.freshnessFor("closure", "2026-08-01T00:00:00Z"), "2026-08-08T00:00:00.000Z");
  assert.equal(feed.freshnessFor("condition", "2026-08-01T00:00:00Z"), "2026-08-15T00:00:00.000Z");
  assert.equal(levelForSummary({ points: 150, approvedCrumbs: 20, verifiedCrumbs: 19, placesHelped: 5 }).key, "path_finder");
  assert.equal(levelForSummary({ points: 150, approvedCrumbs: 20, verifiedCrumbs: 20, placesHelped: 5 }).key, "neighborhood_guide");

  console.log("Crumbs media, freshness, pilot, and recognition checks passed.");
}

run().catch((error) => { console.error(error); process.exitCode = 1; });
