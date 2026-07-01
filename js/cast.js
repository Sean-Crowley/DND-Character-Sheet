// cast.js — spell "Cast" flow: auto attack + damage dice, per-spell special handling,
// and an automatic Wild Magic Surge d20 after any leveled spell (surge on a nat 20).
import { rollDice, triggerSurge, getAdvMode } from "./roller.js";

const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const rint = (n) => Math.floor(Math.random() * n) + 1;
const sgn = (n) => (n >= 0 ? "+" : "") + n;

/* roll a dice expression like "8d6", "10d6+40", "1d4+1" */
function rollExpr(expr) {
  const m = String(expr).replace(/\s/g, "").match(/^(\d+)d(\d+)([+-]\d+)?$/i);
  if (!m) return { rolls: [], total: 0, text: expr };
  const n = +m[1], s = +m[2], f = m[3] ? +m[3] : 0;
  const rolls = rollDice(n, s);
  const total = rolls.reduce((a, b) => a + b, 0) + f;
  return { rolls, total, flat: f, text: `${expr} → [${rolls.join(", ")}]${f ? " " + sgn(f) : ""} = <b>${total}</b>` };
}
function attackRoll(bonus, mode) {
  const rolls = mode === "normal" ? [rint(20)] : [rint(20), rint(20)];
  const die = mode === "adv" ? Math.max(...rolls) : mode === "dis" ? Math.min(...rolls) : rolls[0];
  return { die, rolls, total: die + bonus, crit: die === 20, fumble: die === 1, mode };
}
function atkLine(label, r) {
  const rollTxt = r.rolls.length > 1 ? `(${r.rolls.join(r.mode === "adv" ? "/hi " : "/lo ")})` : `d20=${r.die}`;
  const tag = r.crit ? ' <span style="color:var(--good)">CRIT</span>' : r.fumble ? ' <span style="color:var(--danger)">MISS</span>' : "";
  return `${label}: <b>${r.total}</b> <span class="muted">[${rollTxt} ${sgn(r.bonus)}]</span>${tag}`;
}

/* Per-spell cast data (damage scaled for Kaelaxis, level 14). base = as-cast at the spell's own level. */
const CAST = {
  "shocking grasp": { mode: "attack", damage: "3d8", type: "Lightning" },
  "sorcerous burst": { mode: "attack", damage: "3d8", type: "chosen (acid/cold/fire/lightning/poison/psychic/thunder)" },
  "mind sliver": { mode: "save", save: "INT", damage: "3d6", type: "Psychic" },
  "chromatic orb": { mode: "attack", damage: "3d8", type: "chosen", note: "+1d8 per slot level above 1st; can leap to a new target within 30 ft." },
  "magic missile": { mode: "missiles", darts: 3, each: "1d4+1", type: "Force", note: "+1 dart per slot level above 1st. Auto-hits." },
  "scorching ray": { mode: "multiray", rays: 3, damage: "2d6", type: "Fire", note: "+1 ray per slot level above 2nd." },
  "fireball": { mode: "save", save: "DEX", area: true, damage: "8d6", type: "Fire", note: "20-ft radius; half on save. +1d6 per slot above 3rd." },
  "chain lightning": { mode: "save", save: "DEX", damage: "10d8", type: "Lightning", note: "1 primary + up to 3 more within 30 ft; each saves. +1 target per slot above 6th." },
  "disintegrate": { mode: "save", save: "DEX", damage: "10d6+40", type: "Force", note: "On a failed save only; 0 HP → dust. +3d6 per slot above 6th." },
  "prismatic spray": { mode: "prismatic" },
  "animate objects": { mode: "animate" },
  "hold person": { mode: "save", save: "WIS", note: "Paralyzed on fail; repeats save each turn." },
  "hold monster": { mode: "save", save: "WIS", note: "Paralyzed on fail; repeats save each turn." },
  "suggestion": { mode: "save", save: "WIS", note: "Charmed into following a reasonable suggestion." },
  "banishment": { mode: "save", save: "CHA", note: "Banished while you concentrate." },
  "phantasmal force": { mode: "save", save: "INT", note: "Creates an illusion in the target's mind." }
};

const PRISM = {
  1: { c: "Red", type: "Fire", dmg: "12d6", save: "DEX" },
  2: { c: "Orange", type: "Acid", dmg: "12d6", save: "DEX" },
  3: { c: "Yellow", type: "Lightning", dmg: "12d6", save: "DEX" },
  4: { c: "Green", type: "Poison", dmg: "12d6", save: "DEX" },
  5: { c: "Blue", type: "Cold", dmg: "12d6", save: "DEX" },
  6: { c: "Indigo", cond: "DEX save or Restrained → CON saves each turn; 3 fails = Petrified", save: "DEX" },
  7: { c: "Violet", cond: "DEX save or Blinded → WIS save or banished to another plane", save: "DEX" },
  8: { c: "Special", two: true, cond: "Struck by two rays — roll twice more (reroll 8s)" }
};
const ANIMATE = {
  Tiny: { atk: 8, dmg: "1d4+4" }, Small: { atk: 6, dmg: "1d8+4" }, Medium: { atk: 5, dmg: "2d6+4" },
  Large: { atk: 6, dmg: "2d10+4" }, Huge: { atk: 8, dmg: "2d12+4" }
};

let ctx = { spellAttack: 0, spellSaveDC: 8, innate: false };
export function setCastContext(c) { ctx = { ...ctx, ...c }; }

let overlay;
export function mountCast() {
  overlay = document.createElement("div");
  overlay.className = "cast-overlay"; overlay.id = "castOverlay";
  overlay.innerHTML = `<div class="cast-card"><button class="cast-x" id="castClose">✕</button><div id="castBody"></div></div>`;
  document.body.appendChild(overlay);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay || e.target.id === "castClose") return close();
    const b = e.target.closest("[data-cast]");
    if (b) handleInner(b);
  });
}
function close() { overlay.classList.remove("open"); }
function body() { return overlay.querySelector("#castBody"); }
function open(html) { body().innerHTML = html; overlay.classList.add("open"); }
function append(html) { body().insertAdjacentHTML("beforeend", html); }

function attackMode() { return ctx.innate ? "adv" : getAdvMode(); }
function advNote() {
  const m = attackMode();
  return m === "adv" ? ' <span class="cast-adv">advantage</span>' : m === "dis" ? ' <span class="cast-dis">disadvantage</span>' : "";
}

/* the automatic Wild Magic Surge check after a leveled spell */
function wildMagicBlock(spellLevel) {
  if (spellLevel < 1) return "";
  const d = rint(20);
  const fired = d === 20;
  setTimeout(() => { if (fired) triggerSurge(); }, 400);
  return `<div class="cast-wm ${fired ? "fired" : ""}">
    ✦ Wild Magic check: <b>d20 = ${d}</b> — ${fired ? "<b>SURGE!</b> rolling on the table…" : "no surge"}</div>`;
}

export function openCast(name, spell) {
  const key = String(name).toLowerCase();
  const data = CAST[key] || { mode: spell && spell.tags && spell.tags.includes("attack") ? "attack" : "utility" };
  const lvl = spell ? spell.level : 0;
  const header = `<div class="cast-name">${esc(name)}</div><div class="cast-type">${lvl === 0 ? "Cantrip" : "Level " + lvl}${spell && spell.school ? " · " + esc(spell.school) : ""}</div>`;

  if (data.mode === "prismatic") return openPrismatic(name, lvl, header);
  if (data.mode === "animate") return openAnimate(name, lvl, header);

  let out = header;
  const mode = attackMode();

  if (data.mode === "attack") {
    const r = attackRoll(ctx.spellAttack, mode); r.bonus = ctx.spellAttack;
    const dmg = data.damage ? rollExpr(data.damage) : null;
    out += `<div class="cast-sec">${atkLine("Spell attack" + advNote(), r)}</div>`;
    if (dmg) out += `<div class="cast-sec">Damage${data.type ? " (" + esc(data.type) + ")" : ""}: ${dmg.text}${r.crit ? ' <span class="muted">(double dice on crit)</span>' : ""}</div>`;
  } else if (data.mode === "missiles") {
    const darts = data.darts || 3;
    let total = 0; const lines = [];
    for (let i = 1; i <= darts; i++) { const d = rollExpr(data.each); total += d.total; lines.push(`Dart ${i}: ${d.text}`); }
    out += `<div class="cast-sec">${darts} darts auto-hit (${esc(data.type)}) — total <b>${total}</b><div class="muted" style="margin-top:4px">${lines.join("<br>")}</div></div>`;
  } else if (data.mode === "multiray") {
    const rays = data.rays || 3; const lines = [];
    for (let i = 1; i <= rays; i++) { const r = attackRoll(ctx.spellAttack, mode); r.bonus = ctx.spellAttack; const dmg = rollExpr(data.damage); lines.push(`<b>Ray ${i}</b> — ${atkLine("atk" + advNote(), r)} · ${esc(data.type)} ${dmg.text}`); }
    out += `<div class="cast-sec">${lines.join("<br>")}</div>`;
  } else if (data.mode === "save") {
    out += `<div class="cast-sec">Targets make a <b>DC ${ctx.spellSaveDC} ${esc(data.save)}</b> save${data.area ? " (half on success)" : ""}.</div>`;
    if (data.damage) { const dmg = rollExpr(data.damage); out += `<div class="cast-sec">Damage${data.type ? " (" + esc(data.type) + ")" : ""}: ${dmg.text}</div>`; }
  } else {
    out += `<div class="cast-sec muted">No attack or damage to roll for this spell — resolve its effect from the description.</div>`;
  }
  if (data.note) out += `<div class="cast-note">${esc(data.note)}</div>`;
  out += wildMagicBlock(lvl);
  open(out);
}

/* ---- Prismatic Spray: input target count, roll a ray per target ---- */
function openPrismatic(name, lvl, header) {
  open(header + `<div class="cast-sec">How many creatures are in the cone?
    <div class="cast-controls"><input type="number" id="prismN" value="1" min="1" max="20" class="field-input" style="width:64px">
    <button class="btn primary" data-cast="prism-go" data-lvl="${lvl}">Roll rays</button></div></div>
    <div id="prismOut"></div>`);
}
function resolvePrismatic(lvl) {
  const n = Math.max(1, Math.min(20, Number(overlay.querySelector("#prismN").value) || 1));
  let html = "";
  for (let t = 1; t <= n; t++) html += `<div class="cast-target"><b>Target ${t}</b><br>${prismRays()}</div>`;
  overlay.querySelector("#prismOut").innerHTML = html + `<div class="cast-note">Damage rays: DEX save for half. Roll each target's save yourself vs your DC ${ctx.spellSaveDC}.</div>` + wildMagicBlock(lvl);
}
function prismRays(depth = 0) {
  const roll = rint(8); const ray = PRISM[roll];
  let s = `d8=${roll} → <b style="color:var(--magenta)">${ray.c}</b> — `;
  if (ray.dmg) { const dmg = rollExpr(ray.dmg); s += `${ray.type} ${dmg.text} (DEX save half)`; }
  else if (ray.two) { s += ray.cond; if (depth < 2) { s += `<div style="margin-left:14px">↳ ${prismRays(depth + 1)}</div><div style="margin-left:14px">↳ ${prismRays(depth + 1)}</div>`; } }
  else s += ray.cond;
  return s;
}

/* ---- Animate Objects: pick size, roll strikes ---- */
function openAnimate(name, lvl, header) {
  const opts = Object.keys(ANIMATE).map(sz => `<button class="btn" data-cast="anim-size" data-size="${sz}">${sz} (${sgn(ANIMATE[sz].atk)}, ${ANIMATE[sz].dmg})</button>`).join(" ");
  open(header + `<div class="cast-sec">Pick the size of the objects you animated:<div class="cast-controls" style="flex-wrap:wrap">${opts}</div></div><div id="animOut"></div>`);
}
let animStrikeN = 0;
function animateSize(size) {
  animStrikeN = 0;
  const a = ANIMATE[size];
  overlay.querySelector("#animOut").innerHTML =
    `<div class="cast-sec"><b>${size}</b> objects — attack ${sgn(a.atk)}, ${a.dmg} Force. Click once per object you strike with:
     <div class="cast-controls"><button class="btn primary" data-cast="anim-strike" data-size="${size}">⚔ Strike</button></div></div>
     <div id="animStrikes"></div><div class="cast-note">You track each object's HP; this rolls their attacks &amp; damage.</div>`;
}
function animateStrike(size) {
  const a = ANIMATE[size]; animStrikeN++;
  const r = attackRoll(a.atk, getAdvMode()); r.bonus = a.atk;
  const dmg = rollExpr(a.dmg);
  overlay.querySelector("#animStrikes").insertAdjacentHTML("beforeend",
    `<div class="cast-target"><b>Object ${animStrikeN}</b> — ${atkLine("atk", r)} · Force ${dmg.text}</div>`);
}

function handleInner(b) {
  const c = b.dataset.cast;
  if (c === "prism-go") resolvePrismatic(Number(b.dataset.lvl));
  else if (c === "anim-size") animateSize(b.dataset.size);
  else if (c === "anim-strike") animateStrike(b.dataset.size);
}
