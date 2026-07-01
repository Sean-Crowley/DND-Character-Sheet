# ☀️ Morning report — Kaelaxis sheet

Built overnight, end to end, and self-verified. Here's what to know.

## ▶ How to open it
Double-click **`launch.bat`** → it opens in your browser. That's it.
(Best in Edge/Chrome so you can use **🔗 Connect file** to auto-save into `data/character.json`.)

## ✅ Verified for you
- **Rules engine:** 33/33 automated assertions pass — HP **114**, Prof **+5**, Spell Save DC **19 → 20**
  (Innate Sorcery), Spell Attack **+11**, AC **15 / 20** (Shield) / **12** (no Mage Armor), Initiative
  **+7** (Alert), spell slots `4/3/3/3/2/1/1/0/0`, sorcery points **14**, all saves/skills.
- **Rendered UI checked via headless-browser screenshots** (I actually viewed them): every panel shows
  the correct numbers, no runtime/console errors, spell + item hover tooltips work, dice roller works,
  Wild Magic surge works, mobile reflows to one column.
- **Content:** 24 prepared spells, 27-spell illusion library for the gauntlet, item text for all items,
  and the **exact 2024 Wild Magic Surge table** — all validated (no missing fields, no gaps).

## 🛡️ Reviewed & hardened (4 adversarial reviewer agents)
After the build I ran code, D&D-rules, visual, and UX reviewers over the whole thing and fixed their findings:
- **Security:** escaped all roll labels / attributes so a spell or item name can't inject HTML (XSS).
- **Robustness:** editing a number field no longer loses focus; imported/older `character.json` files are
  normalized so nothing crashes; HP & hit-dice can't go negative or exceed max; charge math is NaN-proof;
  the gauntlet now respects attunement like other items.
- **Rules:** fixed Command's class list (2024: Bard/Cleric/Paladin), and replaced the surge table with the
  verbatim 2024 PHB table.
- **Look & feel:** brighter body text for readability, balanced the three columns (no more empty left void),
  a glowing/vignetted portrait frame, aligned spell-slot rows, and an inline "AC = Mage Armor 13 + DEX +2"
  breakdown.
- **Table use:** bigger tap targets for HP/slots/charges, mobile now shows Combat **first**, and the Shield
  toggle pulses (it's a 1-round reaction — easy to spot if left on).

## 🔎 Please confirm / correct these (I defaulted sensibly and flagged them)
Each is easy to fix in `data/character.json`:

1. **Skill proficiencies** — I set **Arcana, Deception, Insight, Persuasion**. Verify against your real
   sheet (the old PDF's checkboxes were unreadable). Edit `proficiencies.skills`.
2. **Languages** — transcribed literally as *Common, Sumptous, Extravaganza, Gobbly gook, Costco*. If
   those were jokes/placeholders, fix the `languages` field.
3. **Godsgrasp strike damage type** — set to **force** as a placeholder. Set the real type in
   `gauntlet.weapon.damageType` (and the matching item).
4. **Cursed Gem "spell level +1 sorcery points"** — the old sheet noted this; I left it OFF (unconfirmed).
   If it's real, tell me and I'll wire it as a mechanic.
5. **Helmet from the Lay** — magical, effect **TBD**. Fill in its power (and attunement) once you decide.
6. **World notes** — the original PDF text was OCR-garbled; I cleaned it lightly. Fix names/lore as needed.
7. **Wild Magic Surge table** — ✅ upgraded to the **exact 2024 PHB table**, extracted verbatim from your
   PHB PDF (all 25 rows, full d100 coverage). No action needed unless your table is homebrewed.

## 🎨 Portrait
`assets/portrait.svg` is a hand-built stylized placeholder (an admiral in the void). For a real portrait,
`assets/portrait-prompt.txt` has a ready-to-paste AI-image prompt — generate one and drop it in as
`assets/portrait.png`, then point the story panel at it (ask me and I'll switch it over).

## ➕ Growing it
- Add spells: `preparedSpells` + details in `data/spells.json` (or `extra-spells.json`).
- Add items: the `items` array. Bonuses: the `modifiers` array (transparent, named).
- The illusion library (currently 27) can be expanded anytime — just ask.

## 🧾 What each toggle does (top bar)
- **Innate Sorcery** — +1 Save DC and spell attacks roll with Advantage (2/long rest).
- **Mage Armor** — AC becomes 13 + DEX (on by default).
- **Shield spell** — +5 AC (flip on when you react with it).
