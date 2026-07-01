// data.js — loads all JSON data and builds the merged spell lookup.

async function j(url) { const r = await fetch(url); if (!r.ok) throw new Error("load " + url + " " + r.status); return r.json(); }

export async function loadData() {
  const base = new URL("../data/", import.meta.url);
  const u = (f) => new URL(f, base).href;

  const [character, spells, illusions, extra, surge] = await Promise.all([
    j(u("character.json")), j(u("spells.json")), j(u("illusions.json")),
    j(u("extra-spells.json")), j(u("wild-magic.json"))
  ]);

  // merged spell DB (first definition wins so known/authored beats duplicates)
  const spellDB = {};
  for (const s of [...spells, ...extra, ...illusions]) {
    const k = s.name.toLowerCase().trim();
    if (!spellDB[k]) spellDB[k] = s;
  }

  const illusionList = illusions.slice().sort((a, b) => a.level - b.level || a.name.localeCompare(b.name));

  // portrait: prefer a raster image (portrait.png) if present, else the SVG placeholder
  let portraitImg = "", portraitSVG = "";
  const imgUrl = new URL("../assets/portrait.png", import.meta.url).href;
  try { const ri = await fetch(imgUrl, { method: "HEAD" }); if (ri.ok) portraitImg = imgUrl; } catch (_) {}
  if (!portraitImg) {
    try { const r = await fetch(new URL("../assets/portrait.svg", import.meta.url).href); if (r.ok) portraitSVG = await r.text(); } catch (_) {}
  }

  return { seed: character, spellDB, illusionList, surge, portraitImg, portraitSVG };
}

export function lookupSpell(spellDB, name) {
  return spellDB[String(name || "").toLowerCase().trim()] || null;
}
