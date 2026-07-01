# Kaelaxis — Wild Magic Sorcerer Character Sheet

A local, offline, self-calculating D&D **2024** character sheet for **Kaelaxis**, a level-14
Human Wild Magic Sorcerer. Dark "Arcane Void" theme, live-editable, with a rules engine, an
integrated dice roller + Wild Magic surge, hover details for every spell **and** item, and the
**Godsgrasp** gauntlet's own illusion library.

No build step, no framework — just HTML, CSS, and vanilla ES-module JavaScript.

---

## ▶ Run it

**Easiest:** double-click **`launch.bat`**. It starts a tiny local web server and opens the
sheet in your browser. Close that window when you're done.

> It needs a local server (not `file://`) because the app loads its data via `fetch`. `launch.bat`
> uses Python if present, otherwise Node. Both are already on this machine.

Manual alternative:
```
cd kaelaxis-sheet
py -m http.server 8770      # then open http://localhost:8770
```

Best in **Edge or Chrome** (for the "Connect file" auto-save feature below).

---

## 💾 How saving works

- **Every edit auto-saves to your browser** (localStorage) — refresh-safe.
- **`🔗 Connect file`** (Edge/Chrome): bind the app directly to `data/character.json` on disk.
  After that, edits write straight into that file — the single source of truth you commit to
  GitHub, and the same file Claude edits when you ask for changes.
- **`💾 Save to file`** / **`📂 Load JSON`**: manual export/import of `character.json` (works in
  any browser).
- **`↺ Reset`**: discard local edits and reload the shipped `data/character.json`.

**The source of truth is `data/character.json`.** To have changes made for you, edit that file
(or ask Claude to), then Reset / reload the app — or use "Connect file" so your live edits and
the file stay in sync automatically.

---

## 🧮 What it calculates (D&D 2024)

Ability mods · proficiency bonus (by level) · all saves · all skills · initiative (with **Alert**)
· passive perception · **HP** (by class/level/CON) · AC (Mage Armor / Shield toggles) · spell save
DC · spell attack · spell slots · sorcery points · carry capacity.

**Named modifiers** make magic-item bonuses transparent. Example: your Spell Save DC of 20 is
shown as `18 base + Cursed Gem (+1) + Innate Sorcery (+1)`. Edit them in `data/character.json`
under `modifiers`.

**Conditional toggles** (top bar): **Innate Sorcery** (+1 DC, and spell attacks roll with
Advantage), **Mage Armor** (AC 13+DEX), **Shield spell** (+5 AC). Numbers update live as you toggle.

---

## 🎲 Using the sheet

- **Roll anything:** click a skill, save, ability, or the Spell Attack / Godsgrasp attack. The
  roller (🎲, bottom-right) applies the right modifier and shows Advantage/Disadvantage. Deception
  auto-rolls with Advantage (gauntlet); spell attacks roll with Advantage while Innate Sorcery is on.
- **Wild Magic Surge:** the ✦ button rolls d100 **twice** (Controlled Chaos) and shows both results.
- **Trackers:** click the +/− steppers or the pips for HP, spell slots, sorcery points, item charges,
  death saves, etc.
- **Hover** any spell or item for full details.
- **Godsgrasp:** search the illusion library and click a spell's ⚡ cost to spend charges (= spell level).
- **Add-ons:** conditions & concentration tracker, session journal, coins & wealth total, portrait.

---

## ✍️ Editing the data

Everything lives in `data/character.json` (readable JSON). Common edits:

- **Add a spell:** add `{ "name": "...", "level": N }` to `preparedSpells`, and if it's not already
  in `data/spells.json` / `illusions.json` / `extra-spells.json`, add its details there (same shape)
  so the hover works.
- **Add/adjust a magic item:** edit the `items` array (name, category, attunement, charges, spells,
  effects, description). Descriptions show on hover.
- **Item/stat bonuses:** add a named entry to `modifiers` with `targets` (e.g. `spellSaveDC`,
  `spellAttack`, `ac`, `skill.stealth`, `save.dex`, `initiative`) and a `condition`
  (`always` or a toggle key).

## 🌐 Put it on GitHub

This folder is the whole app (the big PHB PDF lives outside it, so it won't be uploaded).
```
git init && git add . && git commit -m "Kaelaxis character sheet"
git branch -M main && git remote add origin <your-repo-url> && git push -u origin main
```
It also works as a **GitHub Pages** static site (Settings → Pages → deploy from `main`), where it
runs from localStorage with export/import.

---

## 🛠 Developer notes (optional)

- **Engine tests:** `node test/engine.test.mjs` — asserts every derived number.
- **Screenshots:** `node test/capture.mjs` (uses Playwright + your installed Edge; server must be running).
- `node_modules/` and `screenshots/` are git-ignored; the shipped app has **no runtime dependencies**.

See **`REVIEW-IN-MORNING.md`** for the short list of things to confirm/correct.
