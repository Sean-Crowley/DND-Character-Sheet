// build-data.mjs — extract the content-gen workflow result into data files + validate.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dir = dirname(fileURLToPath(import.meta.url));
const DATA = join(__dir, "..", "data");
const ASSETS = join(__dir, "..", "assets");

const OUT = process.argv[2];
if (!OUT) { console.error("usage: node build-data.mjs <workflow-output-file>"); process.exit(1); }

const raw = JSON.parse(readFileSync(OUT, "utf8"));
const r = raw.result || raw;

let problems = 0;
const warn = (m) => { console.log("  ⚠ " + m); problems++; };
const ok = (m) => console.log("  ✓ " + m);

const REQUIRED = ["name", "level", "school", "castingTime", "range", "components", "duration", "concentration", "ritual", "description"];
function checkSpells(list, label) {
  if (!Array.isArray(list) || !list.length) { warn(`${label}: empty!`); return []; }
  let bad = 0;
  for (const s of list) for (const k of REQUIRED) if (s[k] === undefined || s[k] === null || s[k] === "") {
    if (k !== "description") { bad++; } else { bad++; }
  }
  if (bad) warn(`${label}: ${bad} missing required field(s) across ${list.length} spells`);
  else ok(`${label}: ${list.length} spells, all required fields present`);
  return list;
}

const known = checkSpells(r.knownSpells, "knownSpells");
const illusions = checkSpells(r.illusions, "illusions");

// dedupe illusions by name (agents may overlap)
const seen = new Set();
const illDedup = [];
for (const s of illusions) {
  const key = s.name.toLowerCase().trim();
  if (seen.has(key)) continue;
  seen.add(key); illDedup.push(s);
}
if (illDedup.length !== illusions.length) ok(`illusions deduped: ${illusions.length} → ${illDedup.length}`);
// confirm all are Illusion school
const nonIll = illDedup.filter(s => (s.school || "").toLowerCase() !== "illusion");
if (nonIll.length) warn(`illusions: ${nonIll.length} not tagged Illusion (${nonIll.map(s => s.name).join(", ")})`);

// surge table coverage 1..100
const surge = r.surgeTable || [];
if (!surge.length) warn("surgeTable: empty!");
else {
  const covered = new Array(101).fill(false);
  for (const e of surge) {
    const m = String(e.range).match(/(\d+)\s*[-–]?\s*(\d+)?/);
    if (!m) continue;
    const lo = +m[1], hi = m[2] ? +m[2] : lo;
    for (let i = lo; i <= hi; i++) if (i >= 1 && i <= 100) covered[i] = true;
  }
  const gaps = [];
  for (let i = 1; i <= 100; i++) if (!covered[i]) gaps.push(i);
  if (gaps.length) warn(`surgeTable: ${surge.length} entries but ${gaps.length} uncovered rolls (${gaps.slice(0, 12).join(",")}${gaps.length > 12 ? "…" : ""})`);
  else ok(`surgeTable: ${surge.length} entries, full 1–100 coverage`);
}

// portrait
const portrait = r.portrait || {};
const svg = (portrait.svg || "").trim();
if (!svg.startsWith("<svg")) warn("portrait: svg missing or malformed");
else ok(`portrait svg: ${svg.length} chars`);
if (!portrait.prompt) warn("portrait: no image prompt");

// item descriptions
const items = r.itemDescriptions || [];
ok(`itemDescriptions: ${items.length} standard items`);

// write files
writeFileSync(join(DATA, "spells.json"), JSON.stringify(known, null, 2));
writeFileSync(join(DATA, "illusions.json"), JSON.stringify(illDedup, null, 2));
writeFileSync(join(DATA, "wild-magic.json"), JSON.stringify(surge, null, 2));
writeFileSync(join(DATA, "item-reference.json"), JSON.stringify(items, null, 2));
if (svg.startsWith("<svg")) writeFileSync(join(ASSETS, "portrait.svg"), svg);
if (portrait.prompt) writeFileSync(join(ASSETS, "portrait-prompt.txt"), portrait.prompt);

console.log(`\nWrote: spells.json(${known.length}) illusions.json(${illDedup.length}) wild-magic.json(${surge.length}) item-reference.json(${items.length}) portrait.svg portrait-prompt.txt`);
console.log(problems ? `\n${problems} warning(s) — see above.` : "\nAll content validated clean.");
