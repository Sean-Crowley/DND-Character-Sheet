// roller.js — dice engine, roll panel, and the Wild Magic surge (with Controlled Chaos).

let surgeTable = [];
let advMode = "normal";     // normal | adv | dis
const log = [];

const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const rint = (n) => Math.floor(Math.random() * n) + 1;
export function rollDice(count, sides) { const a = []; for (let i = 0; i < count; i++) a.push(rint(sides)); return a; }

function fmt(n) { return (n >= 0 ? "+" : "") + n; }

/* d20 test with modifier + advantage/disadvantage */
export function rollCheck(label, modifier = 0, mode = null) {
  mode = mode || advMode;
  const rolls = mode === "normal" ? [rint(20)] : [rint(20), rint(20)];
  const die = mode === "adv" ? Math.max(...rolls) : mode === "dis" ? Math.min(...rolls) : rolls[0];
  const total = die + modifier;
  const res = {
    label, total, die, rolls, modifier, mode,
    crit: die === 20, fumble: die === 1
  };
  pushResult(res);
  return res;
}

/* arbitrary dice expression like "3d6", "1d8", "2d4+2" */
export function rollExpr(expr, label) {
  const m = String(expr).replace(/\s/g, "").match(/^(\d*)d(\d+)([+-]\d+)?$/i);
  if (!m) return null;
  const count = +(m[1] || 1), sides = +m[2], flat = m[3] ? +m[3] : 0;
  const rolls = rollDice(count, sides);
  const total = rolls.reduce((a, b) => a + b, 0) + flat;
  const res = { label: label || expr, total, rolls, modifier: flat, expr, die: null, crit: false, fumble: false };
  pushResult(res, `${count}d${sides}${flat ? fmt(flat) : ""}`);
  return res;
}

function pushResult(res, exprNote) {
  const panel = document.getElementById("rollerPanel");
  const box = document.getElementById("rollResult");
  const cls = res.crit ? "crit" : res.fumble ? "fumble" : "";
  const label = esc(res.label);
  let detail;
  if (res.die != null) {
    const rollTxt = res.rolls.length > 1 ? `(${res.rolls.join(res.mode === "adv" ? " / take high " : " / take low ")})` : `d20=${res.die}`;
    detail = `${rollTxt} ${fmt(res.modifier)}`;
  } else {
    detail = `${esc(exprNote || res.expr)}: [${res.rolls.join(", ")}]${res.modifier ? " " + fmt(res.modifier) : ""}`;
  }
  if (box) {
    box.className = "roll-result " + cls;
    box.innerHTML = `<div class="total">${res.total}</div><div class="detail">${label} — ${detail}${res.crit ? " · CRIT!" : res.fumble ? " · FUMBLE" : ""}</div>`;
  }
  log.unshift(`<div><b>${res.total}</b> ${label} <span class="muted">${detail}</span></div>`);
  const logEl = document.getElementById("rollLog");
  if (logEl) logEl.innerHTML = log.slice(0, 40).join("");
  if (panel) panel.classList.add("open");
}

export function setAdvMode(mode) {
  advMode = (advMode === mode) ? "normal" : mode;
  document.querySelectorAll(".adv-btn").forEach(b => b.classList.toggle("on", b.dataset.mode === advMode && advMode !== "normal"));
  return advMode;
}
export function getAdvMode() { return advMode; }

/* ---------- Wild Magic Surge ---------- */
function surgeEffectFor(roll) {
  for (const e of surgeTable) {
    const m = String(e.range).match(/(\d+)\s*[-–]?\s*(\d+)?/);
    if (!m) continue;
    const lo = +m[1], hi = m[2] ? +m[2] : lo;
    if (roll >= lo && roll <= hi) return e.effect;
  }
  return "No table entry matched — check your Wild Magic Surge table.";
}

export function triggerSurge() {
  const overlay = document.getElementById("surgeOverlay");
  if (!overlay) return;
  // Controlled Chaos: roll twice, use either.
  const r1 = rint(100), r2 = rint(100);
  const primary = r1;
  overlay.querySelector(".surge-roll").textContent = String(primary).padStart(2, "0");
  overlay.querySelector(".surge-effect").textContent = surgeEffectFor(primary);
  overlay.querySelector(".surge-alt").innerHTML =
    `<b>Controlled Chaos</b> — you rolled <b>${String(r1).padStart(2, "0")}</b> and <b>${String(r2).padStart(2, "0")}</b>; use either:<br>` +
    `<span class="muted">${String(r2).padStart(2, "0")}: ${surgeEffectFor(r2)}</span>`;
  overlay.dataset.r1 = r1; overlay.dataset.r2 = r2;
  overlay.classList.add("open");
  log.unshift(`<div><b>Surge</b> rolled ${r1} / ${r2} <span class="muted">(Controlled Chaos)</span></div>`);
  const logEl = document.getElementById("rollLog"); if (logEl) logEl.innerHTML = log.slice(0, 40).join("");
}

/* ---------- mount UI ---------- */
export function mountRoller(surge) {
  surgeTable = surge || [];

  const fab = document.createElement("button");
  fab.className = "roller-fab"; fab.id = "rollerFab"; fab.title = "Dice roller"; fab.textContent = "🎲";
  document.body.appendChild(fab);

  const panel = document.createElement("div");
  panel.className = "roller-panel"; panel.id = "rollerPanel";
  panel.innerHTML = `
    <h3>⚄ Dice & Wild Magic</h3>
    <button class="surge-btn" id="surgeBtn">✦ Wild Magic Surge (d100 ×2)</button>
    <div class="adv-row">
      <div class="adv-btn" data-mode="adv">Advantage</div>
      <div class="adv-btn" data-mode="dis">Disadvantage</div>
    </div>
    <div class="dice-grid">
      ${["d4", "d6", "d8", "d10", "d12", "d20", "d100"].map(d => `<button class="dice-btn" data-die="${d}">${d}</button>`).join("")}
      <button class="dice-btn" data-check="d20">roll<br>check</button>
    </div>
    <div class="roll-result" id="rollResult"><div class="total">—</div><div class="detail">Click a skill, save, or attack on the sheet, or a die here.</div></div>
    <div class="roll-log" id="rollLog"></div>`;
  document.body.appendChild(panel);

  const overlay = document.createElement("div");
  overlay.className = "surge-overlay"; overlay.id = "surgeOverlay";
  overlay.innerHTML = `<div class="surge-card">
    <h2>WILD MAGIC SURGE</h2>
    <div class="surge-roll">00</div>
    <div class="surge-effect"></div>
    <div class="surge-alt"></div>
    <button class="surge-close" id="surgeClose">Let chaos settle</button>
  </div>`;
  document.body.appendChild(overlay);

  fab.addEventListener("click", () => panel.classList.toggle("open"));
  panel.addEventListener("click", (e) => {
    const die = e.target.closest("[data-die]");
    if (die) return rollExpr("1" + die.dataset.die, die.dataset.die);
    const chk = e.target.closest("[data-check]");
    if (chk) return rollCheck("d20 check", 0);
    const adv = e.target.closest(".adv-btn");
    if (adv) return setAdvMode(adv.dataset.mode);
    if (e.target.closest("#surgeBtn")) return triggerSurge();
  });
  overlay.addEventListener("click", (e) => { if (e.target.id === "surgeClose" || e.target === overlay) overlay.classList.remove("open"); });
}
