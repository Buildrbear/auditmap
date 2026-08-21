function hasDocumentedReuseRights(image) {
  if (!image?.url || !image.source || !image.author || !image.alt) return false;
  const license = String(image.license || "").trim();
  return /\b(public domain|pdm(?:\s+1\.0)?|cc0|cc[ -]?by(?:[ -]?sa)?|by(?:-sa)?(?:\s+\d)|creative commons|permission(?:-| )?(?:cleared|granted)|used with permission)\b/i.test(license);
}

module.exports = { hasDocumentedReuseRights };
