// render.js — renders the entire sheet from character + derived state.
import { ABILITIES, ABILITY_NAMES, SKILLS, SKILL_NAMES, COIN_CP } from "./rules.js";

const sgn = (n) => (n >= 0 ? "+" : "") + n;
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/* ---------------- top bar ---------------- */
function topbar(ch, d, status) {
  const id = ch.identity;
  const chip = (val, lbl, action, extra = "") =>
    `<div class="corestat ${action ? "clickable" : ""}" ${action || ""} title="${esc(extra)}"><div class="val">${val}</div><div class="lbl">${lbl}</div></div>`;
  const toggles = Object.entries(ch.toggles || {}).map(([k, t]) =>
    `<button class="toggle ${t.on ? "on" : ""}" data-action="toggle" data-toggle="${k}" data-tip="${esc(t.note || "")}"><span class="dot"></span>${esc(t.label || k)}</button>`).join("");
  return `
  <div class="topbar">
    <div class="topbar-id">
      <h1 class="char-name">${esc(id.name)}</h1>
      <div class="char-sub">Level <b>${id.level}</b> ${esc(id.species)} · <b>${esc(id.class)}</b> (${esc(id.subclass)}) · ${esc(id.background)}</div>
      <div class="toggles" style="margin-top:10px">${toggles}</div>
    </div>
    <div class="topbar-core">
      ${chip(sgn(d.prof), "Prof", "", "Proficiency bonus")}
      ${chip(d.ac.total, "Armor", 'data-action="tip-ac"', "AC: " + acExplain(d))}
      ${chip(sgn(d.initiative), "Initiative", 'data-action="roll" data-label="Initiative" data-mod="' + d.initiative + '"', "DEX + Alert")}
      ${chip(ch.speed, "Speed", "", "feet")}
      ${chip(d.passivePerception, "Pass. Perc", "", "10 + Perception")}
      ${chip(esc(id.size[0]), "Size", "", id.size)}
    </div>
  </div>
  <div class="savebar panel" style="padding:10px 16px;margin-bottom:16px">
    <button class="btn" data-action="connect-file" data-tip="Bind character.json on disk for auto-save (Edge/Chrome)">🔗 Connect file</button>
    <button class="btn" data-action="save-file">💾 Save to file</button>
    <button class="btn" data-action="import">📂 Load JSON</button>
    <button class="btn" data-action="reset-seed" data-tip="Discard local edits and reload the shipped character.json">↺ Reset</button>
    <span class="tiny muted">Edits auto-save in this browser. “Connect file” writes straight to character.json.</span>
    <span class="save-status ${status.cls || ""}" id="saveStatus">${esc(status.msg || "")}</span>
  </div>`;
}
function acExplain(d) {
  const parts = [`${d.ac.mageArmorOn ? "Mage Armor 13" : "base 10"} + DEX ${sgn(d.mods.dex)}`];
  if (d.ac.flat) parts.push(`items ${sgn(d.ac.flat)}`);
  if (d.ac.shieldOn) parts.push("Shield +5");
  return parts.join(" ");
}

/* ---------------- abilities ---------------- */
function abilities(ch, d) {
  const cells = ABILITIES.map(ab => {
    const prof = (ch.proficiencies?.saves || []).includes(ab);
    return `<div class="ability">
      ${prof ? '<span class="save-badge" title="save proficiency">◆</span>' : ""}
      <div class="abbr">${ab.toUpperCase()}</div>
      <div class="mod" data-action="roll" data-label="${ABILITY_NAMES[ab]} check" data-mod="${d.mods[ab]}" title="roll ${ABILITY_NAMES[ab]} check">${sgn(d.mods[ab])}</div>
      <div class="score"><input class="field-input" style="width:48px" type="number" data-path="abilities.${ab}" value="${ch.abilities[ab]}"></div>
    </div>`;
  }).join("");
  return panel("Ability Scores", `<div class="abilities">${cells}</div>`);
}

/* ---------------- saves & skills ---------------- */
function saves(ch, d) {
  const rows = ABILITIES.map(ab => {
    const s = d.saves[ab];
    return `<div class="statrow ${s.proficient ? "prof" : ""}" data-action="roll" data-label="${ABILITY_NAMES[ab]} save" data-mod="${s.total}">
      <span class="pip"></span><span class="bonus">${sgn(s.total)}</span><span class="name">${ABILITY_NAMES[ab]}</span></div>`;
  }).join("");
  return panel("Saving Throws", rows);
}
function skills(ch, d) {
  const advSet = new Set((ch.advantages || []).map(a => a.roll));
  const rows = Object.keys(SKILLS).sort((a, b) => SKILL_NAMES[a].localeCompare(SKILL_NAMES[b])).map(sk => {
    const s = d.skills[sk];
    const adv = advSet.has("skill." + sk);
    return `<div class="statrow ${s.kind === "proficient" ? "prof" : s.kind === "expertise" ? "expertise" : ""}" data-action="roll" data-label="${SKILL_NAMES[sk]}" data-mod="${s.total}" ${adv ? 'data-force-adv="1"' : ""}>
      <span class="pip"></span><span class="bonus">${sgn(s.total)}</span>
      <span class="name">${SKILL_NAMES[sk]} <span class="sub">(${s.ability.toUpperCase()})</span></span>
      ${adv ? '<span class="adv">ADV</span>' : ""}</div>`;
  }).join("");
  return panel("Skills", rows);
}

/* ---------------- combat ---------------- */
function combat(ch, d) {
  const hp = ch.hp; const pct = Math.max(0, Math.min(100, Math.round(100 * hp.current / d.maxHP)));
  const deathPips = (kind, n) => [0, 1, 2].map(i =>
    `<span class="pip-slot pip-death ${i < n ? "filled " + kind : ""}" data-action="death" data-kind="${kind}" data-index="${i}"></span>`).join("");
  return panel("Combat", `
    <div class="bigstats">
      <div class="bigstat clickable" data-action="tip-ac"><div class="v">${d.ac.total}</div><div class="l">Armor Class</div></div>
      <div class="bigstat"><div class="v">${sgn(d.initiative)}</div><div class="l">Initiative</div></div>
      <div class="bigstat"><div class="v">${ch.speed}<small> ft</small></div><div class="l">Speed</div></div>
    </div>
    <div class="ac-explain tiny">AC = ${esc(acExplain(d))}</div>
    <div style="text-align:center;margin-top:14px">
      <div class="l muted tiny" style="letter-spacing:.1em">HIT POINTS</div>
      <div class="hp-controls">
        <button class="stepbtn" data-action="adjust" data-path="hp.current" data-delta="-1">−</button>
        <input class="hp-input" type="number" data-path="hp.current" value="${hp.current}">
        <span class="muted">/ ${d.maxHP}</span>
        <button class="stepbtn" data-action="adjust" data-path="hp.current" data-delta="1" data-max="${d.maxHP}">+</button>
      </div>
      <div class="hp-bar"><span style="width:${pct}%"></span></div>
      <div class="tiny muted" style="margin-top:8px">Temp HP
        <button class="stepbtn sm" data-action="adjust" data-path="hp.temp" data-delta="-1">−</button>
        <b style="color:var(--cyan)">${hp.temp}</b>
        <button class="stepbtn sm" data-action="adjust" data-path="hp.temp" data-delta="1">+</button>
      </div>
    </div>
    <div class="two-col" style="margin-top:14px">
      <div>
        <div class="tiny muted">HIT DICE (d${ch.hitDie})</div>
        <div class="piprow"><button class="stepbtn" data-action="adjust" data-path="hitDiceSpent" data-delta="1" data-max="${d.level}" title="spend a hit die">−</button>
          <span class="cval">${d.level - ch.hitDiceSpent}/${d.level}</span>
          <button class="stepbtn" data-action="adjust" data-path="hitDiceSpent" data-delta="-1" title="recover a hit die">+</button></div>
      </div>
      <div>
        <div class="tiny muted">DEATH SAVES</div>
        <div class="piprow" style="margin-top:4px"><span class="tiny" style="color:var(--good)">✓</span>${deathPips("succ", ch.deathSaves.successes)}</div>
        <div class="piprow" style="margin-top:4px"><span class="tiny" style="color:var(--danger)">✗</span>${deathPips("fail", ch.deathSaves.failures)}</div>
      </div>
    </div>`);
}

/* ---------------- spellcasting / slots ---------------- */
function spellcasting(ch, d) {
  const slotRows = [];
  for (let l = 1; l <= 9; l++) {
    const s = d.spellSlots[l]; if (!s.max) continue;
    const pips = Array.from({ length: s.max }, (_, i) =>
      `<span class="pip-slot ${i < s.expended ? "filled" : ""}" data-action="slot" data-level="${l}" data-index="${i}"></span>`).join("");
    slotRows.push(`<div class="slot-row"><span class="slot-lbl">Level ${l}</span><span class="slot-pips">${pips}</span><span class="slot-count">${s.remaining}/${s.max}</span></div>`);
  }
  return panel("Spellcasting", `
    <div class="bigstats">
      <div class="bigstat"><div class="v">${sgn(d.spellMod)}</div><div class="l">Spell Mod (${d.spellAbility.toUpperCase()})</div></div>
      <div class="bigstat"><div class="v">${d.spellSaveDC}</div><div class="l">Save DC</div></div>
      <div class="bigstat clickable" data-action="roll" data-label="Spell attack" data-mod="${d.spellAttack}" data-spellatk="1"><div class="v">${sgn(d.spellAttack)}</div><div class="l">Spell Attack</div></div>
    </div>
    ${ch.toggles?.innateSorcery?.on ? '<div class="tiny" style="color:var(--gold);margin-top:8px;text-align:center">✦ Innate Sorcery active — DC +1 and spell attacks roll with Advantage</div>' : ""}
    <h3 class="sub">Spell Slots</h3>${slotRows.join("") || '<div class="muted tiny">No slots.</div>'}
    <div class="tiny muted" style="margin-top:6px">Tap a pip to set slots remaining.</div>
    <h3 class="sub">Font of Magic <span class="tiny muted" style="letter-spacing:0;text-transform:none">— create slot (Cursed Gem: −1 pt)</span></h3>
    <div class="fom-row">${[[1, 1], [2, 2], [3, 4], [4, 5], [5, 6]].map(([l, c]) => `<button class="fom-btn" data-action="createslot" data-level="${l}" data-cost="${c}" data-tip="Spend ${c} Sorcery Point${c > 1 ? "s" : ""} to recover an expended Level ${l} slot">L${l} · ${c}◆</button>`).join("")}</div>`, "◈");
}

/* ---------------- resources & trackers ---------------- */
function trackers(ch, d) {
  const rows = Object.entries(ch.resources || {}).map(([key, r]) => {
    const max = d.resources[key]?.maxResolved ?? r.max;
    const name = key.replace(/([A-Z])/g, " $1").replace(/^./, c => c.toUpperCase());
    const pips = (typeof max === "number" && max > 0 && max <= 20)
      ? `<div class="piprow" style="margin-top:7px">${Array.from({ length: max }, (_, i) => `<span class="pip-slot ${i < r.current ? "filled" : ""}" data-action="respip" data-res="${key}" data-index="${i}"></span>`).join("")}</div>`
      : "";
    return `<div class="counter" style="flex-direction:column;align-items:stretch;gap:2px">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
        <div class="cname">${esc(name)}<small>${esc(r.recharge ? r.recharge + " rest" : "")}</small></div>
        <div class="piprow">
          <button class="stepbtn sm" data-action="adjust" data-path="resources.${key}.current" data-delta="-1">−</button>
          <span class="cval">${r.current}${max != null ? " / " + max : ""}</span>
          <button class="stepbtn sm" data-action="adjust" data-path="resources.${key}.current" data-delta="1" data-max="${max}">+</button>
        </div>
      </div>${pips}
    </div>`;
  }).join("");
  return panel("Resources & Trackers", rows, "✦");
}

/* ---------------- metamagic ---------------- */
function metamagic(ch) {
  const META = {
    "Twinned Spell": "When you cast a spell that targets only one creature and can't target more, spend Sorcery Points equal to the slot level (min 1) to target a second creature.",
    "Transmuted Spell": "Spend 1 Sorcery Point to change a spell's Acid, Cold, Fire, Lightning, Poison, or Thunder damage to another of those types.",
    "Heightened Spell": "Spend 2 Sorcery Points so one target of a spell's saving throw has Disadvantage on saves against it.",
    "Subtle Spell": "Spend 1 Sorcery Point to cast a spell without Verbal or Somatic components (and ignoring material components without a cost)."
  };
  const list = (ch.metamagic || []).map(m => `<div class="feat-card"><div class="ft">${esc(m)}</div><div class="txt">${esc(META[m] || "")}</div></div>`).join("");
  return panel("Metamagic", list, "✧");
}

/* ---------------- conditions & concentration ---------------- */
function conditions(ch) {
  const CONDS = ["Blinded", "Charmed", "Deafened", "Frightened", "Grappled", "Incapacitated", "Invisible", "Paralyzed", "Poisoned", "Prone", "Restrained", "Stunned", "Unconscious"];
  const active = new Set(ch.conditions || []);
  const chips = CONDS.map(c => `<span class="cond ${active.has(c) ? "on" : ""}" data-action="condition" data-name="${c}">${c}</span>`).join("");
  const conc = ch.concentration || { active: false, spell: "" };
  return panel("Conditions & Concentration", `
    <div class="cond-grid">${chips}</div>
    <div class="conc-box ${conc.active ? "active" : ""}">
      <div style="display:flex;align-items:center;gap:8px">
        <button class="toggle ${conc.active ? "on" : ""}" data-action="conc-toggle"><span class="dot"></span>Concentrating</button>
        <input class="field-input" style="flex:1" placeholder="spell name…" data-path="concentration.spell" value="${esc(conc.spell)}">
      </div>
      <div class="tiny muted" style="margin-top:6px">War Caster: Advantage on CON saves to keep Concentration.</div>
    </div>`, "◇");
}

/* ---------------- gauntlet ---------------- */
function gauntlet(ch, d, illusionList) {
  const g = ch.gauntlet;
  const item = (ch.items || []).find(i => i.isGauntlet) || {};
  const cur = item.charges?.current ?? g.charges.current;
  const max = item.charges?.max ?? g.charges.max;
  const pips = Array.from({ length: max }, (_, i) =>
    `<span class="pip-slot ${i < cur ? "filled" : ""}" data-action="charge-pip" data-item="${item.id}" data-index="${i}"></span>`).join("");
  const cost = (lvl) => lvl === 0 ? (g.illusionCasting.cantripCost || 1) : lvl;
  const lib = illusionList.map(s => {
    const c = cost(s.level);
    const afford = cur >= c;
    return `<div class="ill ${afford ? "" : "cant-afford"}" data-spell="${esc(s.name)}">
      <div><div class="il-name">${esc(s.name)}</div><div class="il-meta">${s.level === 0 ? "Cantrip" : "Lvl " + s.level} · ${esc(s.school)}${s.concentration ? " · Conc" : ""}${s.source ? " · " + esc(s.source) : ""}</div></div>
      <button class="il-cost" data-action="gaunt-cast" data-spell="${esc(s.name)}" data-cost="${c}" ${afford ? "" : "disabled"}>${c}⚡</button>
    </div>`;
  }).join("");
  const dmgMod = d.mods.dex;
  return `<div class="panel gauntlet-panel"><h2>${esc(g.name)} <span class="flourish">🩸</span></h2><div class="panel-body">
    <div class="gaunt-head">
      <div style="flex:1;min-width:180px">
        <div class="tiny muted">${esc(g.wornOn)} · attunement</div>
        <ul class="item-effects">${(g.grants || []).map(x => `<li>${esc(x)}</li>`).join("")}</ul>
        <div class="charge-line">
          <button class="mini-spell" data-action="roll" data-label="Godsgrasp Strike (hit)" data-mod="${d.prof + dmgMod}" data-tip="uses DEX to attack (prof + DEX)">⚔ Attack ${sgn(d.prof + dmgMod)}</button>
          <button class="mini-spell" data-action="rollexpr" data-expr="${esc(g.weapon.damageDice)}+${dmgMod}" data-label="Godsgrasp damage">${esc(g.weapon.damageDice)}${sgn(dmgMod)} ${esc(g.weapon.damageType)}</button>
        </div>
      </div>
      <div style="min-width:150px">
        <div class="tiny muted">Charges (recharge ${esc(g.charges.recharge)})</div>
        <div class="gaunt-charges" style="margin-top:5px">${pips}</div>
        <div class="tiny" style="margin-top:5px">${cur} / ${max} · <span class="muted">cost = spell level</span></div>
      </div>
    </div>
    <div class="gaunt-lib">
      <input class="field-input gaunt-search" id="illSearch" placeholder="Search ${illusionList.length} illusion spells…">
      <div class="ill-list" id="illList">${lib}</div>
    </div>
  </div></div>`;
}

/* ---------------- prepared spells ---------------- */
function spells(ch, d, spellDB) {
  const byLevel = {};
  for (const p of ch.preparedSpells || []) { (byLevel[p.level] ||= []).push(p); }
  const blocks = Object.keys(byLevel).map(Number).sort((a, b) => a - b).map(lvl => {
    const items = byLevel[lvl].sort((a, b) => a.name.localeCompare(b.name)).map(p => {
      const s = spellDB[p.name.toLowerCase()] || {};
      const isAtk = (s.tags || []).some(t => t === "attack");
      const chips = [];
      if (s.concentration) chips.push('<span class="chip conc">C</span>');
      if (s.ritual) chips.push('<span class="chip rit">R</span>');
      return `<div class="spell" data-spell="${esc(p.name)}">
        <div><span class="sname">${esc(p.name)}</span> <span class="smeta">${esc(s.school || "")}${s.castingTime && s.castingTime !== "Action" ? " · " + esc(s.castingTime) : ""}${isAtk ? " · atk " + sgn(d.spellAttack) : ""}</span></div>
        <div class="stags">${chips.join("")}<button class="mini-spell cast-btn" data-action="cast" data-spell="${esc(p.name)}">⚡ Cast</button></div>
      </div>`;
    }).join("");
    return `<div class="spell-level-h">${lvl === 0 ? "Cantrips" : "Level " + lvl}</div>${items}`;
  }).join("");
  return panel(`Prepared Spells <span class="tiny muted" style="letter-spacing:0;text-transform:none">${(ch.preparedSpells || []).length} · hover for details</span>`, blocks, "✶");
}

/* ---------------- features ---------------- */
function features(ch) {
  const f = ch.features || {};
  const block = (title, arr) => arr && arr.length ? `<h3 class="sub">${title}</h3>` + arr.map(x =>
    `<div class="feat-card"><div class="ft">${esc(x.name)}${x.uses ? `<span class="use">${esc(x.uses)}</span>` : ""}</div><div class="txt">${esc(x.text)}</div></div>`).join("") : "";
  return panel("Features & Traits",
    block("Sorcerer", f.class) + block("Wild Magic", f.subclass) + block("Human", f.species) + block("Feats", f.feats), "❈");
}

/* ---------------- items ---------------- */
function items(ch, d) {
  const attunedCount = (ch.items || []).filter(i => i.attunement && i.attuned).length;
  const cardFor = (it) => {
    const inactive = it.attunement && !it.attuned && it.category !== "fused";
    const cls = it.category === "fused" ? "fused" : it.attuned ? "attuned" : "";
    const badge = it.category === "fused" ? '<span class="item-badge badge-fused">fused</span>'
      : it.attuned ? '<span class="item-badge badge-attuned">attuned</span>'
        : inactive ? '<span class="item-badge badge-inactive">unattuned</span>' : "";
    let charges = "";
    if (it.charges) {
      const pips = Array.from({ length: Math.min(it.charges.max, 12) }, (_, i) =>
        `<span class="pip-slot" data-action="charge-pip" data-item="${it.id}" data-index="${i}"></span>`).join("");
      const label = it.charges.label || "charges";
      charges = `<div class="charge-line"><span class="tiny muted">${label} ${it.charges.current}/${it.charges.max} <span data-tip="recharge ${esc(it.charges.recharge)}${it.charges.rechargeAmount ? " (" + it.charges.rechargeAmount + ")" : ""}">↻</span></span>
        <button class="stepbtn sm" data-action="charge" data-item="${it.id}" data-delta="-1">−</button>
        <button class="stepbtn sm" data-action="charge" data-item="${it.id}" data-delta="1">+</button></div>`;
      if (max12Pips(it)) charges = `<div class="charge-line"><span class="chg-pips gaunt-charges">${pips}</span></div>` + charges;
    }
    let spells = "";
    if (it.spells && it.spells.length) {
      spells = `<div class="charge-line"><span class="chg-spells">${it.spells.map(sp =>
        `<button class="mini-spell" data-action="item-cast" data-item="${it.id}" data-spell="${esc(sp.name)}" data-cost="${sp.cost}">${esc(sp.name)} ${sp.cost}⚡</button>`).join("")}</span></div>`;
    }
    return `<div class="item-card ${cls} ${inactive ? "inactive" : ""}" data-item-id="${it.id}">
      ${badge}
      <div class="it">${esc(it.name)}${it.quantity ? ` <span class="tag">×${it.quantity}</span>` : ""}</div>
      <div class="desc">${esc(it.description || "")}</div>
      ${it.effects && it.effects.length ? `<ul class="item-effects">${it.effects.map(e => `<li>${esc(e)}</li>`).join("")}</ul>` : ""}
      ${charges}${spells}
      ${it.attunement && it.category !== "fused" ? `<div class="charge-line"><button class="toggle ${it.attuned ? "on" : ""}" data-action="attune" data-item="${it.id}"><span class="dot"></span>${it.attuned ? "Attuned" : "Attune"}</button></div>` : ""}
      ${it.reviewNote ? `<div class="review-note">⚑ ${esc(it.reviewNote)}</div>` : ""}
    </div>`;
  };
  const order = { fused: 0, attuned: 1, owned: 2, other: 3, consumable: 4 };
  const sorted = (ch.items || []).slice().sort((a, b) => (order[a.category] ?? 9) - (order[b.category] ?? 9));
  return panel(`Items & Attunement <span class="tiny muted" style="letter-spacing:0;text-transform:none">${attunedCount}/3 attuned + 2 fused</span>`,
    sorted.map(cardFor).join(""), "⚱");
}
function max12Pips(it) { return it.charges && it.charges.max <= 12 && it.charges.label !== "cards"; }

/* ---------------- coins & equipment ---------------- */
function equipment(ch) {
  const c = ch.coins || {};
  const totalCp = Object.entries(c).reduce((s, [k, v]) => s + (COIN_CP[k] || 0) * (v || 0), 0);
  const gp = (totalCp / 100).toFixed(2);
  const coinInputs = ["pp", "gp", "ep", "sp", "cp"].map(k =>
    `<div class="coin"><div class="cn">${k.toUpperCase()}</div><input type="number" data-path="coins.${k}" value="${c[k] || 0}"></div>`).join("");
  const flavor = (ch.flavorInventory || []).map((x, i) => `<div class="flavor-item">• ${esc(x)} <span class="jdel" data-action="flavor-del" data-index="${i}" title="remove">✕</span></div>`).join("");
  return panel("Coins & Equipment", `
    <div class="coins">${coinInputs}</div>
    <div class="networth">Total wealth ≈ <b>${gp} gp</b></div>
    <h3 class="sub">Carried</h3>
    <div class="tiny muted" style="margin-bottom:6px">Carry capacity: ${ch.abilities.str * 15} lb (STR ×15)</div>
    <div class="flavor-list">${flavor || '<div class="muted tiny">Nothing carried.</div>'}</div>
    <div class="add-row"><input class="field-input" id="flavorAdd" placeholder="Add an item…"><button class="btn" data-action="flavor-add">+ Add</button></div>`, "⛃");
}

/* ---------------- journal ---------------- */
function journal(ch) {
  const entries = (ch.journal || []).map((e, i) =>
    `<div class="journal-entry"><span class="jdel" data-action="journal-del" data-index="${i}">✕</span>
      <div class="jdate">${esc(e.date || "")}</div>
      <textarea class="field-input" style="margin-top:6px;min-height:60px" data-path="journal.${i}.text">${esc(e.text || "")}</textarea></div>`).join("");
  return panel(`Session Journal`, `<button class="btn" data-action="journal-add" style="margin-bottom:10px">+ New entry</button>${entries || '<div class="muted tiny">No entries yet.</div>'}`, "✒");
}

/* ---------------- portrait / story ---------------- */
function story(ch, portraitSVG) {
  const art = portraitSVG ? `<div class="portrait-frame">${portraitSVG}</div>` : "";
  return panel("Kaelaxis", `
    ${art}
    <h3 class="sub">Languages</h3><input class="field-input" data-path="languages" value="${esc((ch.languages || []).join(", "))}">`, "☾");
}

function narrative(ch) {
  return `<div class="panel narrative-panel"><h2>Appearance, Backstory &amp; Lore <span class="flourish">☾</span></h2><div class="panel-body">
    <div class="narrative-grid">
      <div><h3 class="sub">Appearance</h3><textarea class="field-input" style="min-height:150px" data-path="appearance">${esc(ch.appearance)}</textarea></div>
      <div><h3 class="sub">Backstory</h3><textarea class="field-input" style="min-height:150px" data-path="backstory">${esc(ch.backstory)}</textarea></div>
    </div>
    <h3 class="sub">World Notes</h3><textarea class="field-input" style="min-height:150px" data-path="worldNotes">${esc(ch.worldNotes)}</textarea>
  </div></div>`;
}

/* ---------------- shell ---------------- */
function panel(title, bodyHTML, flourish = "") {
  return `<div class="panel"><h2>${title}${flourish ? `<span class="flourish">${flourish}</span>` : ""}</h2><div class="panel-body">${bodyHTML}</div></div>`;
}

export function renderApp(root, ctx) {
  const { character: ch, derived: d, spellDB, illusionList, portraitSVG, status } = ctx;
  root.innerHTML = `
    ${topbar(ch, d, status)}
    <div class="grid">
      <div class="col col-a">
        ${abilities(ch, d)}
        ${saves(ch, d)}
        ${skills(ch, d)}
        ${trackers(ch, d)}
        ${metamagic(ch)}
        ${conditions(ch)}
        ${equipment(ch)}
        ${journal(ch)}
      </div>
      <div class="col col-b">
        ${combat(ch, d)}
        ${spellcasting(ch, d)}
        ${gauntlet(ch, d, illusionList)}
        ${items(ch, d)}
      </div>
      <div class="col col-c">
        ${story(ch, portraitSVG)}
        ${spells(ch, d, spellDB)}
        ${features(ch)}
      </div>
    </div>
    ${narrative(ch)}`;
}
