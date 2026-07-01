// interact.mjs — drives the live app to verify the interactive layer (toggles, pips, edits).
import { chromium } from "playwright-core";
const URL = "http://localhost:8770/index.html";

const browser = await chromium.launch({ channel: "msedge", headless: true });
const page = await (await browser.newContext({ viewport: { width: 1500, height: 1200 } })).newPage();
const errors = [];
page.on("pageerror", e => errors.push("PAGEERROR: " + e.message));
page.on("console", m => { if (m.type() === "error") errors.push("CONSOLE: " + m.text()); });

let pass = 0, fail = 0;
const check = (label, got, want) => { const ok = String(got) === String(want); console.log(`${ok ? "✓" : "✗"} ${label}: ${got}${ok ? "" : ` (expected ${want})`}`); ok ? pass++ : fail++; };
const bigstat = (lbl) => page.evaluate((l) => { const e = [...document.querySelectorAll(".bigstat")].find(x => x.querySelector(".l")?.textContent.trim() === l); return e ? e.querySelector(".v").textContent.trim() : null; }, lbl);
const corestat = (lbl) => page.evaluate((l) => { const e = [...document.querySelectorAll(".corestat")].find(x => x.querySelector(".lbl")?.textContent.trim() === l); return e ? e.querySelector(".val").textContent.trim() : null; }, lbl);

try {
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForSelector(".char-name");

  // 1. Innate Sorcery toggle recomputes Save DC 19 -> 20
  check("Save DC before Innate", await bigstat("Save DC"), 19);
  await page.click('.toggle[data-toggle="innateSorcery"]'); await page.waitForTimeout(80);
  check("Save DC after Innate", await bigstat("Save DC"), 20);
  await page.click('.toggle[data-toggle="innateSorcery"]'); await page.waitForTimeout(80); // back off

  // 2. Shield toggle recomputes AC 15 -> 20 (both the bigstat and the top chip)
  check("AC before Shield", await bigstat("Armor Class"), 15);
  await page.click('.toggle[data-toggle="shieldSpell"]'); await page.waitForTimeout(80);
  check("AC after Shield (bigstat)", await bigstat("Armor Class"), 20);
  check("AC after Shield (top chip)", await corestat("Armor"), 20);
  await page.click('.toggle[data-toggle="shieldSpell"]'); await page.waitForTimeout(80);

  // 3. Spell-slot pip: click index 3 of level 1 (4 slots) -> remaining 0/4
  await page.click('.pip-slot[data-level="1"][data-index="3"]'); await page.waitForTimeout(80);
  const l1 = await page.evaluate(() => document.querySelector('.slot-row .slot-count')?.textContent.trim());
  check("L1 slots after expending all", l1, "0/4");
  // click index 3 again -> should set remaining to 3/4 (expended = 3)
  await page.click('.pip-slot[data-level="1"][data-index="3"]'); await page.waitForTimeout(80);
  check("L1 slots after un-expend one", await page.evaluate(() => document.querySelector('.slot-row .slot-count')?.textContent.trim()), "1/4");

  // 4. HP edit persists and focus is preserved across the re-render
  await page.fill('.hp-input', '90'); await page.keyboard.press('Tab'); await page.waitForTimeout(120);
  check("HP input reflects edit", await page.inputValue('.hp-input'), "90");
  // HP + button clamps at max (114): set to 114 then press + should stay 114
  await page.fill('.hp-input', '114'); await page.keyboard.press('Tab'); await page.waitForTimeout(80);
  await page.click('.stepbtn[data-path="hp.current"][data-delta="1"]'); await page.waitForTimeout(80);
  check("HP clamps at max", await page.inputValue('.hp-input'), "114");

  // 5. Gauntlet cast spends charges by spell level (click a level-1 illusion = 1 charge; 9 -> 8)
  const chargeBtn = page.locator('.ill .il-cost').first();
  await chargeBtn.click(); await page.waitForTimeout(80);
  const gaunt = await page.evaluate(() => localStorage.getItem("kaelaxis-character-v1"));
  const g = JSON.parse(gaunt).items.find(i => i.isGauntlet);
  check("Gauntlet charges after 1-cost cast", g.charges.current, 8);

  // 6. edits persisted to localStorage
  check("persisted to localStorage", !!gaunt, true);

  check("no JS errors during interaction", errors.length, 0);
  if (errors.length) console.log("  " + errors.join("\n  "));
} catch (e) {
  console.error("INTERACT ERROR:", e.message); fail++;
} finally {
  await browser.close();
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
