const fs = require("fs");
const path = require("path");

const csvPath = path.join(__dirname, "..", "data", "nationwide-major-parks-launch.csv");
const lines = fs.readFileSync(csvPath, "utf8").trim().split(/\r?\n/);
const headers = lines.shift().split(",");

function parseCsvLine(line) {
  const values = [];
  let value = "";
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"' && line[index + 1] === '"' && quoted) {
      value += '"';
      index += 1;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      values.push(value);
      value = "";
    } else {
      value += character;
    }
  }

  values.push(value);
  return Object.fromEntries(headers.map((header, index) => [header, values[index] || ""]));
}

const rows = lines.map(parseCsvLine);
const cityGroups = new Map();
const parkKeys = new Set();
const errors = [];
const excludedTypes = /city hall|town hall|municipal (?:office|offices|building)|government (?:center|office|offices|building)|library|recreation center/i;

for (const row of rows) {
  const cityKey = `${row.state}|${row.city}`;
  const parkKey = `${cityKey}|${row.park}`;

  if (parkKeys.has(parkKey)) errors.push(`Duplicate park: ${parkKey}`);
  if (excludedTypes.test(row.park)) errors.push(`Excluded facility type: ${parkKey}`);
  if (!["anchor", "supporting", "hold"].includes(row.launch_tier)) {
    errors.push(`Invalid launch tier: ${parkKey}`);
  }

  parkKeys.add(parkKey);
  if (!cityGroups.has(cityKey)) cityGroups.set(cityKey, []);
  cityGroups.get(cityKey).push(row);
}

for (const [cityKey, parks] of cityGroups) {
  const anchorCount = parks.filter((park) => park.launch_tier === "anchor").length;
  if (anchorCount !== 1) errors.push(`${cityKey} has ${anchorCount} anchor parks`);
  if (parks.length > 4) errors.push(`${cityKey} has ${parks.length} candidates; maximum is 4`);
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}

const states = new Set(rows.map((row) => row.state));
console.log(
  `Validated ${rows.length} major parks across ${cityGroups.size} city markets and ${states.size} states.`
);
