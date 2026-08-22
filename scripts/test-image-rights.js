const assert = require("node:assert/strict");
const { hasDocumentedReuseRights } = require("./lib/image-rights");

const image = {
  url: "/assets/parks/example.jpg",
  source: "https://example.gov/archive/example-park",
  author: "Example public archive",
  alt: "Example Park",
};

for (const license of [
  "Public domain",
  "Public-domain collection image; source attribution retained",
  "PDM 1.0",
  "CC BY-SA 4.0",
  "Free Art License 1.3",
  "FAL",
  "Used with permission",
]) {
  assert.equal(hasDocumentedReuseRights({ ...image, license }), true, license);
}

for (const license of [
  "Official source image",
  "Official municipal park source; attribution retained",
  "Source attribution; rights retained by publisher",
  "See source page for license terms",
]) {
  assert.equal(hasDocumentedReuseRights({ ...image, license }), false, license);
}

assert.equal(hasDocumentedReuseRights({ ...image, source: "", license: "FAL" }), false);
assert.equal(hasDocumentedReuseRights({ ...image, author: "", license: "Public domain" }), false);
assert.equal(hasDocumentedReuseRights({ ...image, alt: "", license: "CC BY 4.0" }), false);

console.log("Image-rights license and metadata contracts passed.");
