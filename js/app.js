// app.js — orchestrator: load data, render, wire all interactions, autosave.
import { loadData, lookupSpell } from "./data.js";
import { computeDerived } from "./calc.js";
import { renderApp } from "./render.js";
import { initTooltips } from "./tooltips.js";
import { mountRoller, rollCheck, rollExpr } from "./roller.js";
import { mountCast, setCastContext, openCast } from "./cast.js";
import * as store from "./storage.js";

const state = { character: null, spellDB: {}, illusionList: [], surge: [], portraitSVG: "", status: { cls: "", msg: "" } };
const root = document.getElementById("app");

/* ---------- path helpers ---------- */
function getByPath(obj, path) { return path.split(".").reduce((o, k) => (o == null ? o : o[k]), obj); }
function setByPath(obj, path, val) {
  const keys = path.split("."); const last = keys.pop();
  const t = keys.reduce((o, k) => (o[k] ??= {}), obj);
  t[last] = val;
}

/* ---------- render ---------- */
function rerender() {
  // preserve focus + caret across the full re-render — ONLY for text/number inputs
  // (buttons keep their natural post-click focus; restoring them would jump focus to the
  //  first element sharing a data-path, e.g. the HP '-' button).
  const active = document.activeElement;
  const isField = active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA");
  const focusPath = isField && active.dataset && active.dataset.path ? active.dataset.path : null;
  const activeTag = isField ? active.tagName : null;
  const selStart = isField && active.selectionStart != null ? active.selectionStart : null;
  const selEnd = isField && active.selectionEnd != null ? active.selectionEnd : null;

  const derived = computeDerived(state.character);
  setCastContext({ spellAttack: derived.spellAttack, spellSaveDC: derived.spellSaveDC, innate: !!(state.character.toggles && state.character.toggles.innateSorcery && state.character.toggles.innateSorcery.on) });
  renderApp(root, { ...state, derived });

  if (focusPath) {
    const el = [...root.querySelectorAll(`[data-path="${CSS.escape(focusPath)}"]`)].find(n => n.tagName === activeTag);
    if (el) { el.focus(); try { if (selStart != null && el.setSelectionRange) el.setSelectionRange(selStart, selEnd); } catch (_) {} }
  }
}

/* ensure an imported/older character has every structure the UI mutates */
function normalize(ch) {
  ch.spellSlots ||= {};
  for (let l = 1; l <= 9; l++) { ch.spellSlots[l] ||= { expended: 0 }; ch.spellSlots[l].expended = Number(ch.spellSlots[l].expended) || 0; }
  ch.deathSaves ||= { successes: 0, failures: 0 };
  ch.deathSaves.successes = Number(ch.deathSaves.successes) || 0;
  ch.deathSaves.failures = Number(ch.deathSaves.failures) || 0;
  ch.conditions ||= [];
  ch.journal ||= [];
  ch.concentration ||= { active: false, spell: "" };
  ch.toggles ||= {};
  ch.coins ||= {};
  ch.resources ||= {};
  ch.hp ||= { current: 0, temp: 0 };
  ch.hp.current = Number(ch.hp.current) || 0;
  ch.hp.temp = Number(ch.hp.temp) || 0;
  (ch.items || []).forEach(it => { if (it.charges) it.charges.current = Number(it.charges.current) || 0; });
  return ch;
}
function persist() {
  store.scheduleSave(state.character, (cls, msg) => {
    const el = document.getElementById("saveStatus");
    if (el) { el.className = "save-status " + cls; el.textContent = cls === "saved" ? "✓ " + (msg || "saved") : "• editing…"; }
  });
}
function change(rerenderToo = true) { if (rerenderToo) rerender(); persist(); }

/* ---------- clamp helper ---------- */
function clampInc(path, delta, max) {
  const cur = Number(getByPath(state.character, path)) || 0;
  let next = cur + delta;
  if (next < 0) next = 0;
  if (max != null && !Number.isNaN(+max) && next > +max) next = +max;
  setByPath(state.character, path, next);
}

/* ---------- actions ---------- */
const actions = {
  toggle(el) { const k = el.dataset.toggle; const t = state.character.toggles[k]; t.on = !t.on; change(); },

  roll(el) {
    const mod = Number(el.dataset.mod) || 0;
    let mode = null;
    if (el.dataset.forceAdv) mode = "adv";
    if (el.dataset.spellatk && state.character.toggles?.innateSorcery?.on) mode = "adv";
    rollCheck(el.dataset.label || "Roll", mod, mode);
  },
  rollexpr(el) { rollExpr(el.dataset.expr, el.dataset.label); },

  cast(el) { openCast(el.dataset.spell, lookupSpell(state.spellDB, el.dataset.spell)); },

  createslot(el) {
    const lvl = el.dataset.level, cost = Number(el.dataset.cost);
    const sp = state.character.resources && state.character.resources.sorceryPoints;
    if (!sp) return;
    if ((sp.current || 0) < cost) return flash(`Need ${cost} Sorcery Points (have ${sp.current || 0}).`);
    const slot = (state.character.spellSlots ||= {})[lvl];
    if (!slot || (slot.expended || 0) <= 0) return flash(`No expended L${lvl} slot to recover.`);
    sp.current -= cost; slot.expended -= 1;
    flash(`Created a Level ${lvl} slot for ${cost} SP.`); change();
  },

  respip(el) {
    const key = el.dataset.res, idx = Number(el.dataset.index);
    const r = state.character.resources && state.character.resources[key]; if (!r) return;
    const cur = r.current || 0; r.current = (idx < cur) ? idx : idx + 1; change();
  },

  "flavor-add"() {
    const input = document.getElementById("flavorAdd"); if (!input) return;
    const v = input.value.trim(); if (!v) return;
    (state.character.flavorInventory ||= []).push(v); change();
  },
  "flavor-del"(el) { (state.character.flavorInventory || []).splice(Number(el.dataset.index), 1); change(); },

  adjust(el) { clampInc(el.dataset.path, Number(el.dataset.delta), el.dataset.max); change(); },

  slot(el) {
    const lvl = el.dataset.level, idx = Number(el.dataset.index);
    const slot = (state.character.spellSlots ||= {})[lvl] ||= { expended: 0 };
    const cur = slot.expended || 0;
    slot.expended = (idx < cur) ? idx : idx + 1;
    change();
  },
  death(el) {
    const kind = el.dataset.kind === "succ" ? "successes" : "failures";
    const idx = Number(el.dataset.index);
    const ds = state.character.deathSaves ||= { successes: 0, failures: 0 };
    const cur = ds[kind] || 0;
    ds[kind] = (idx < cur) ? idx : idx + 1;
    change();
  },
  charge(el) {
    const it = findItem(el.dataset.item); if (!it || !it.charges) return;
    const cur = Number(it.charges.current) || 0;
    const n = cur + Number(el.dataset.delta);
    it.charges.current = Math.max(0, Math.min(Number(it.charges.max) || 0, n));
    change();
  },
  "charge-pip"(el) {
    const it = findItem(el.dataset.item); if (!it || !it.charges) return;
    const idx = Number(el.dataset.index);
    it.charges.current = (idx < it.charges.current) ? idx : idx + 1;
    change();
  },
  "gaunt-cast"(el) {
    const cost = Number(el.dataset.cost);
    const it = state.character.items.find(i => i.isGauntlet); if (!it) return;
    if (it.attunement && !it.attuned && it.category !== "fused") return flash(`${it.name} isn't attuned — inactive.`);
    if (it.charges.current < cost) return flash(`Not enough charges for ${el.dataset.spell} (need ${cost})`);
    it.charges.current -= cost;
    flash(`Cast ${el.dataset.spell} — spent ${cost} charge${cost > 1 ? "s" : ""} (${it.charges.current} left)`);
    change();
  },
  "item-cast"(el) {
    const it = findItem(el.dataset.item); const cost = Number(el.dataset.cost);
    if (!it || !it.charges) return;
    if (it.attunement && !it.attuned && it.category !== "fused") return flash(`${it.name} isn't attuned — inactive.`);
    if (it.charges.current < cost) return flash(`Not enough charges for ${el.dataset.spell} (need ${cost})`);
    it.charges.current -= cost;
    flash(`Cast ${el.dataset.spell} via ${it.name} — spent ${cost} (${it.charges.current} left)`);
    change();
  },
  condition(el) {
    const name = el.dataset.name; const set = new Set(state.character.conditions || []);
    set.has(name) ? set.delete(name) : set.add(name);
    state.character.conditions = [...set]; change();
  },
  "conc-toggle"() { const c = state.character.concentration ||= { active: false, spell: "" }; c.active = !c.active; change(); },

  attune(el) {
    const it = findItem(el.dataset.item); if (!it) return;
    if (!it.attuned) {
      const count = state.character.items.filter(i => i.attunement && i.attuned && i.category !== "fused").length;
      if (count >= 3) return flash("You already have 3 attuned items. Un-attune one first.");
    }
    it.attuned = !it.attuned; change();
  },

  "journal-add"() {
    const now = new Date();
    const date = now.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    (state.character.journal ||= []).unshift({ date, text: "" });
    change();
  },
  "journal-del"(el) { state.character.journal.splice(Number(el.dataset.index), 1); change(); },

  async "connect-file"() {
    try { const data = await store.connectFile(); state.character = normalize(data); flash("Connected to character.json — auto-saving to disk."); change(); }
    catch (e) { flash("Couldn't connect file: " + e.message); }
  },
  async "save-file"() { try { const where = await store.saveToFile(state.character); flash(where === "download" ? "Downloaded character.json" : "Saved to character.json"); } catch (e) { flash("Save failed: " + e.message); } },
  async import() { try { const data = await store.importJSON(); state.character = normalize(data); flash("Loaded character from file."); change(); } catch (e) { flash("Import failed: " + e.message); } },
  "reset-seed"() { if (confirm("Discard local edits and reload the shipped character.json?")) { store.clearLocal(); state.character = normalize(structuredClone(state.seed)); flash("Reset to shipped data."); change(); } },
  "tip-ac"() {}
};

function findItem(id) { return (state.character.items || []).find(i => i.id === id); }

let flashTimer;
function flash(msg) {
  const el = document.getElementById("saveStatus");
  if (!el) return;
  el.className = "save-status dirty"; el.textContent = msg;
  clearTimeout(flashTimer); flashTimer = setTimeout(() => { el.textContent = ""; }, 3500);
}

/* ---------- event wiring ---------- */
function onClick(e) {
  const el = e.target.closest("[data-action]");
  if (!el) return;
  const fn = actions[el.dataset.action];
  if (fn) { e.preventDefault(); fn(el); }
}
function onChange(e) {
  const el = e.target.closest("[data-path]");
  if (!el) return;
  const path = el.dataset.path;
  let val = el.value;
  if (el.type === "number") val = val === "" ? 0 : Number(val);
  if (path === "languages") val = String(val).split(",").map(s => s.trim()).filter(Boolean);
  setByPath(state.character, path, val);
  // `change` fires on blur/commit, so a full recompute+rerender here won't disrupt typing.
  change(true);
}
function onInput(e) {
  if (e.target.id === "illSearch") {
    const q = e.target.value.toLowerCase().trim();
    document.querySelectorAll("#illList .ill").forEach(row => {
      const name = row.getAttribute("data-spell").toLowerCase();
      const meta = row.querySelector(".il-meta")?.textContent.toLowerCase() || "";
      row.style.display = (!q || name.includes(q) || meta.includes(q)) ? "" : "none";
    });
  }
}
function onKey(e) {
  if (e.key === "Escape") {
    document.getElementById("surgeOverlay")?.classList.remove("open");
    document.getElementById("castOverlay")?.classList.remove("open");
    document.getElementById("rollerPanel")?.classList.remove("open");
  }
  if (e.key === "Enter" && e.target.id === "flavorAdd") { e.preventDefault(); actions["flavor-add"](); }
}

/* ---------- boot ---------- */
async function boot() {
  const data = await loadData();
  state.spellDB = data.spellDB;
  state.illusionList = data.illusionList;
  state.surge = data.surge;
  state.portraitImg = data.portraitImg;
  state.portraitSVG = data.portraitSVG;
  state.seed = data.seed;

  // choose the live character: bound file > localStorage > shipped seed
  let ch = await store.tryReconnect();
  if (!ch) ch = store.loadLocal();
  if (!ch) ch = structuredClone(data.seed);
  state.character = normalize(ch);

  initTooltips({
    getSpell: (name) => lookupSpell(state.spellDB, name),
    getItem: (id) => (state.character.items || []).find(i => i.id === id)
  });
  mountRoller(state.surge);
  mountCast();

  document.addEventListener("click", onClick);
  document.addEventListener("change", onChange);
  document.addEventListener("input", onInput);
  document.addEventListener("keydown", onKey);

  rerender();
  state.status = { cls: "saved", msg: store.fileBound() ? "✓ character.json connected" : "✓ ready" };
  const el = document.getElementById("saveStatus");
  if (el) { el.className = "save-status saved"; el.textContent = state.status.msg; }
}

boot().catch(err => {
  root.innerHTML = `<div class="panel" style="padding:24px;margin:40px auto;max-width:640px">
    <h2 style="color:var(--danger)">Failed to load</h2><pre style="color:var(--ink-dim);white-space:pre-wrap">${err.stack || err}</pre>
    <p class="muted">If you opened this file directly (file://), run it via the included <b>launch.bat</b> instead — the app needs a local server to load its data.</p></div>`;
  console.error(err);
});
