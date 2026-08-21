const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");

process.env.SUPABASE_URL = "https://auditmap-test.supabase.co";
process.env.SUPABASE_SERVICE_ROLE_KEY = "test-service-key";

const root = path.resolve(__dirname, "..");
const avatarApi = require("../api/profile-avatar");
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const schema = fs.readFileSync(path.join(root, "supabase/schema.sql"), "utf8");

async function run() {
  const demoAvatar = fs.readFileSync(path.join(root, "assets/demo-avatars/maya-chen.webp"));
  const parsed = avatarApi._private.parseAvatarDataUrl(`data:image/webp;base64,${demoAvatar.toString("base64")}`);
  assert.equal(parsed.type, "image/webp");
  assert.equal(parsed.extension, "webp");
  assert.ok(parsed.buffer.length < avatarApi._private.MAX_AVATAR_BYTES);
  assert.throws(() => avatarApi._private.parseAvatarDataUrl("data:text/plain;base64,SGVsbG8="), /Choose a JPEG/);
  assert.throws(() => avatarApi._private.parseAvatarDataUrl("data:image/webp;base64,SGVsbG8="), /could not be validated/);

  const normalized = await avatarApi._private.normalizeAvatar(parsed.buffer);
  const metadata = await sharp(normalized).metadata();
  assert.equal(metadata.format, "webp");
  assert.equal(metadata.width, 512);
  assert.equal(metadata.height, 512);
  assert.equal(metadata.exif, undefined);

  assert.match(app, /account-avatar-input/);
  assert.match(app, /profilePhotoDataUrl/);
  assert.match(app, /Profile photos are public/);
  assert.match(schema, /community-profile-avatars/);
  assert.equal(fs.readdirSync(path.join(root, "assets/demo-avatars")).filter((name) => name.endsWith(".webp")).length, 6);

  console.log("Profile photo validation, privacy copy, and demo avatar checks passed.");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
