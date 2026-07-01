// rules.js — static D&D 2024 rules data. Pure module (no DOM), safe to import in Node.

export const ABILITIES = ["str", "dex", "con", "int", "wis", "cha"];

export const ABILITY_NAMES = {
  str: "Strength", dex: "Dexterity", con: "Constitution",
  int: "Intelligence", wis: "Wisdom", cha: "Charisma"
};

// skill -> governing ability
export const SKILLS = {
  acrobatics: "dex", animalHandling: "wis", arcana: "int", athletics: "str",
  deception: "cha", history: "int", insight: "wis", intimidation: "cha",
  investigation: "int", medicine: "wis", nature: "int", perception: "wis",
  performance: "cha", persuasion: "cha", religion: "int",
  sleightOfHand: "dex", stealth: "dex", survival: "wis"
};

export const SKILL_NAMES = {
  acrobatics: "Acrobatics", animalHandling: "Animal Handling", arcana: "Arcana",
  athletics: "Athletics", deception: "Deception", history: "History",
  insight: "Insight", intimidation: "Intimidation", investigation: "Investigation",
  medicine: "Medicine", nature: "Nature", perception: "Perception",
  performance: "Performance", persuasion: "Persuasion", religion: "Religion",
  sleightOfHand: "Sleight of Hand", stealth: "Stealth", survival: "Survival"
};

// Full-caster spell-slot table (Bard/Cleric/Druid/Sorcerer/Wizard), 2024.
// index = character level (1..20); value = [L1..L9] slot counts.
export const FULL_CASTER_SLOTS = {
  1:  [2,0,0,0,0,0,0,0,0],
  2:  [3,0,0,0,0,0,0,0,0],
  3:  [4,2,0,0,0,0,0,0,0],
  4:  [4,3,0,0,0,0,0,0,0],
  5:  [4,3,2,0,0,0,0,0,0],
  6:  [4,3,3,0,0,0,0,0,0],
  7:  [4,3,3,1,0,0,0,0,0],
  8:  [4,3,3,2,0,0,0,0,0],
  9:  [4,3,3,3,1,0,0,0,0],
  10: [4,3,3,3,2,0,0,0,0],
  11: [4,3,3,3,2,1,0,0,0],
  12: [4,3,3,3,2,1,0,0,0],
  13: [4,3,3,3,2,1,1,0,0],
  14: [4,3,3,3,2,1,1,0,0],
  15: [4,3,3,3,2,1,1,1,0],
  16: [4,3,3,3,2,1,1,1,0],
  17: [4,3,3,3,2,1,1,1,1],
  18: [4,3,3,3,3,1,1,1,1],
  19: [4,3,3,3,3,2,1,1,1],
  20: [4,3,3,3,3,2,2,1,1]
};

// Prepared-spells count for the Sorcerer (2024), by level.
export const SORCERER_PREPARED = {
  1:2, 2:4, 3:6, 4:7, 5:9, 6:10, 7:11, 8:12, 9:14, 10:15,
  11:16, 12:16, 13:17, 14:17, 15:18, 16:18, 17:19, 18:20, 19:21, 20:22
};

export const CONDITIONS_2024 = [
  "Blinded", "Charmed", "Deafened", "Exhaustion", "Frightened", "Grappled",
  "Incapacitated", "Invisible", "Paralyzed", "Petrified", "Poisoned",
  "Prone", "Restrained", "Stunned", "Unconscious"
];

// Average HP gained per level for a given hit-die (rounded up: (die/2)+1).
export const HIT_DIE_AVG = { 6: 4, 8: 5, 10: 6, 12: 7 };

export function abilityMod(score) {
  return Math.floor((Number(score) - 10) / 2);
}

export function proficiencyBonus(level) {
  return 2 + Math.floor((Number(level) - 1) / 4);
}

// Coin values in copper, for net-worth totals.
export const COIN_CP = { cp: 1, sp: 10, ep: 50, gp: 100, pp: 1000 };
