// engine.test.mjs — asserts the rules engine against Kaelaxis's known-correct numbers.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { computeDerived } from "../js/calc.js";

const __dir = dirname(fileURLToPath(import.meta.url));
const ch = JSON.parse(readFileSync(join(__dir, "..", "data", "character.json"), "utf8"));

let pass = 0, fail = 0;
function eq(label, got, want) {
  const good = JSON.stringify(got) === JSON.stringify(want);
  console.log(`${good ? "✓" : "✗"} ${label}: ${JSON.stringify(got)}${good ? "" : ` (expected ${JSON.stringify(want)})`}`);
  good ? pass++ : fail++;
}
const clone = () => JSON.parse(JSON.stringify(ch));

// --- baseline (Innate Sorcery OFF, Mage Armor ON, Shield OFF) ---
const d = computeDerived(ch);

eq("proficiency bonus", d.prof, 5);
eq("STR mod", d.mods.str, -1);
eq("DEX mod", d.mods.dex, 2);
eq("CON mod", d.mods.con, 4);
eq("INT mod", d.mods.int, -1);
eq("WIS mod", d.mods.wis, 0);
eq("CHA mod", d.mods.cha, 5);

eq("max HP", d.maxHP, 114);

eq("CON save (proficient)", d.saves.con.total, 9);
eq("CHA save (proficient)", d.saves.cha.total, 10);
eq("STR save (not prof)", d.saves.str.total, -1);
eq("DEX save (not prof)", d.saves.dex.total, 2);

eq("Acrobatics (prof, DEX)", d.skills.acrobatics.total, 7);
eq("Animal Handling (prof, WIS)", d.skills.animalHandling.total, 5);
eq("Deception (prof, CHA)", d.skills.deception.total, 10);
eq("Persuasion (prof, CHA)", d.skills.persuasion.total, 10);
eq("Insight (prof, WIS)", d.skills.insight.total, 5);
eq("Arcana (not prof, INT)", d.skills.arcana.total, -1);
eq("Athletics (not prof, STR)", d.skills.athletics.total, -1);
eq("Stealth (not prof, DEX)", d.skills.stealth.total, 2);

eq("initiative (DEX + Alert prof)", d.initiative, 7);
eq("passive perception", d.passivePerception, 10);

eq("spell mod", d.spellMod, 5);
eq("spell save DC (Innate OFF)", d.spellSaveDC, 19);
eq("spell attack (+Cursed Gem)", d.spellAttack, 11);

eq("AC (Mage Armor on, Shield off)", d.ac.total, 15);

eq("spell slots L1..L9", [1,2,3,4,5,6,7,8,9].map(l => d.spellSlots[l].max), [4,3,3,3,2,1,1,0,0]);
eq("sorcery points max", d.resources.sorceryPoints.maxResolved, 14);
eq("luck points max (= prof)", d.resources.luckPoints.maxResolved, 5);
eq("carry capacity (STR*15)", d.carryCapacity, 120);

// --- Innate Sorcery ON ---
const inn = clone(); inn.toggles.innateSorcery.on = true;
const di = computeDerived(inn);
eq("spell save DC (Innate ON)", di.spellSaveDC, 20);
eq("spell attack unchanged by Innate (advantage, not +1)", di.spellAttack, 11);

// --- Shield spell ON ---
const sh = clone(); sh.toggles.shieldSpell.on = true;
eq("AC (Shield spell up)", computeDerived(sh).ac.total, 20);

// --- Mage Armor OFF ---
const noma = clone(); noma.toggles.mageArmor.on = false;
eq("AC (unarmored, no Mage Armor)", computeDerived(noma).ac.total, 12);

// --- expend a slot ---
const ex = clone(); ex.spellSlots["3"].expended = 2;
eq("L3 slots remaining after expending 2", computeDerived(ex).spellSlots[3].remaining, 1);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
