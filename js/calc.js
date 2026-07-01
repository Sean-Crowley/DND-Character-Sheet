// calc.js — the rules engine. Pure module (no DOM), unit-testable in Node.
// Everything derived (mods, saves, skills, DC, attack, AC, HP, slots) is computed
// from base data + named modifiers + conditional toggles, so the sheet auto-updates.

import {
  ABILITIES, SKILLS, FULL_CASTER_SLOTS, HIT_DIE_AVG,
  abilityMod, proficiencyBonus
} from "./rules.js";

/** Modifiers whose condition is "always" or whose named toggle is currently on. */
export function activeModifiers(ch) {
  const toggles = ch.toggles || {};
  return (ch.modifiers || []).filter(m => {
    if (!m.condition || m.condition === "always") return true;
    const t = toggles[m.condition];
    return !!(t && t.on);
  });
}

/** Sum of active modifier values that hit a given target key. */
export function sumModifiers(ch, target) {
  return activeModifiers(ch)
    .filter(m => (m.targets || []).includes(target))
    .reduce((s, m) => s + (Number(m.value) || 0), 0);
}

/** For tooltips: full breakdown of what feeds a target (active + inactive). */
export function modifierBreakdown(ch, targets) {
  const list = Array.isArray(targets) ? targets : [targets];
  const active = new Set(activeModifiers(ch));
  return (ch.modifiers || [])
    .filter(m => (m.targets || []).some(t => list.includes(t)))
    .map(m => ({ name: m.name, value: m.value, note: m.note, active: active.has(m) }));
}

export function resolveMax(spec, { level, prof }) {
  if (spec === "level") return level;
  if (spec === "proficiency") return prof;
  return Number(spec) || 0;
}

export function computeMaxHP(ch) {
  if (ch.hp && ch.hp.maxOverride != null) return ch.hp.maxOverride;
  const level = ch.identity.level;
  const die = ch.hitDie || 6;
  const conMod = abilityMod(ch.abilities.con);
  const avg = HIT_DIE_AVG[die] ?? (Math.floor(die / 2) + 1);
  const first = die + conMod;                 // max HP at level 1
  const rest = (level - 1) * (avg + conMod);  // average thereafter
  const flat = (ch.hp && ch.hp.flatBonus) || 0;
  return first + rest + flat;
}

export function isCasterProficientSave(ch, ability) {
  return (ch.proficiencies?.saves || []).includes(ability);
}

export function computeSaves(ch, prof) {
  const out = {};
  for (const ab of ABILITIES) {
    const base = abilityMod(ch.abilities[ab]);
    const p = isCasterProficientSave(ch, ab) ? prof : 0;
    const mod = sumModifiers(ch, `save.${ab}`) + sumModifiers(ch, "saves");
    out[ab] = { total: base + p + mod, proficient: p > 0, base, prof: p, mod };
  }
  return out;
}

export function computeSkills(ch, prof) {
  const skills = ch.proficiencies?.skills || [];
  const expertise = ch.proficiencies?.expertise || [];
  const out = {};
  for (const [skill, ability] of Object.entries(SKILLS)) {
    const base = abilityMod(ch.abilities[ability]);
    let p = 0, kind = "none";
    if (expertise.includes(skill)) { p = prof * 2; kind = "expertise"; }
    else if (skills.includes(skill)) { p = prof; kind = "proficient"; }
    const mod = sumModifiers(ch, `skill.${skill}`);
    out[skill] = { total: base + p + mod, ability, kind, base, prof: p, mod };
  }
  return out;
}

export function computeAC(ch, mods) {
  const dexMod = mods.dex;
  const ac = ch.ac || { unarmoredBase: 10, mageArmorBase: 13, shieldSpellBonus: 5, flatModifiers: [] };
  const mageArmorOn = ch.toggles?.mageArmor?.on;
  const shieldOn = ch.toggles?.shieldSpell?.on;
  const armorBase = (mageArmorOn ? ac.mageArmorBase : ac.unarmoredBase) + dexMod;
  const flat = (ac.flatModifiers || []).reduce((s, m) => s + (Number(m.value) || 0), 0);
  const named = sumModifiers(ch, "ac");
  const shield = shieldOn ? (ac.shieldSpellBonus || 5) : 0;
  return {
    total: armorBase + flat + named + shield,
    armorBase, shield, flat: flat + named,
    mageArmorOn: !!mageArmorOn, shieldOn: !!shieldOn
  };
}

/** The single entry point: returns every derived value the UI needs. */
export function computeDerived(ch) {
  const level = ch.identity.level;
  const prof = proficiencyBonus(level);

  const mods = {};
  for (const ab of ABILITIES) mods[ab] = abilityMod(ch.abilities[ab]);

  const saves = computeSaves(ch, prof);
  const skills = computeSkills(ch, prof);

  const initiative = mods.dex
    + ((ch.feats || []).includes("Alert") ? prof : 0)
    + sumModifiers(ch, "initiative");

  const passivePerception = 10 + skills.perception.total;

  const spellAbility = ch.spellcastingAbility || "cha";
  const spellMod = mods[spellAbility];
  const spellSaveDC = 8 + prof + spellMod + sumModifiers(ch, "spellSaveDC");
  const spellAttack = prof + spellMod + sumModifiers(ch, "spellAttack");

  const ac = computeAC(ch, mods);
  const maxHP = computeMaxHP(ch);

  const slotTable = FULL_CASTER_SLOTS[level] || FULL_CASTER_SLOTS[20];
  const spellSlots = {};
  for (let lvl = 1; lvl <= 9; lvl++) {
    const max = slotTable[lvl - 1] || 0;
    const expended = ch.spellSlots?.[lvl]?.expended || 0;
    spellSlots[lvl] = { max, expended, remaining: Math.max(0, max - expended) };
  }

  // resource maxima (resolve "level"/"proficiency" specs)
  const resources = {};
  for (const [key, r] of Object.entries(ch.resources || {})) {
    resources[key] = {
      ...r,
      maxResolved: r.max != null ? resolveMax(r.max, { level, prof }) : r.current
    };
  }

  const carryCapacity = ch.abilities.str * 15; // lbs

  return {
    prof, mods, saves, skills, initiative, passivePerception,
    spellAbility, spellMod, spellSaveDC, spellAttack,
    ac, maxHP, spellSlots, resources, carryCapacity, level
  };
}
