// capture.mjs — deterministic screenshots via Playwright driving system Edge.
import { chromium } from "playwright-core";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dir = dirname(fileURLToPath(import.meta.url));
const SHOTS = join(__dir, "..", "screenshots");
const URL = "http://localhost:8770/index.html";

const browser = await chromium.launch({ channel: "msedge", headless: true });
const ctx = await browser.newContext({ viewport: { width: 1500, height: 1200 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();

const errors = [];
page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));
page.on("console", (m) => { if (m.type() === "error") errors.push("CONSOLE ERROR: " + m.text()); });

async function ready() {
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForSelector(".char-name", { timeout: 8000 });
  await page.waitForSelector(".ill", { timeout: 8000 }); // gauntlet illusion list rendered
}

const shot = async (name, opts = {}) => { await page.screenshot({ path: join(SHOTS, name), ...opts }); console.log("  📸 " + name); };
const elShot = async (name, selector) => {
  const el = page.locator(selector).first();
  if (await el.count()) { await el.screenshot({ path: join(SHOTS, name) }); console.log("  📸 " + name + "  (" + selector + ")"); }
  else console.log("  ⚠ missing " + selector);
};

try {
  await ready();

  // full page
  await shot("10-full.png", { fullPage: true });

  // legible per-panel element shots
  await elShot("20-col-left.png", ".grid > .col:nth-child(1)");
  await elShot("21-combat.png", ".panel:has(h2:text-is('Combat'))");
  await elShot("22-spellcasting.png", ".panel:has(h2:text-is('Spellcasting'))");
  await elShot("23-gauntlet.png", ".gauntlet-panel");
  await elShot("24-items.png", ".panel:has(h2:text('Items'))");
  await elShot("25-story.png", ".panel:has(h2:text-is('Kaelaxis'))");

  // tooltip state — hover a spell, then verify the tooltip actually shows
  await page.hover(".spell[data-spell='Chromatic Orb']").catch(() => {});
  await page.waitForTimeout(300);
  const tt = await page.evaluate(() => { const t = document.getElementById("tooltip"); return { cls: t.className, len: t.innerHTML.length, left: t.style.left, top: t.style.top }; });
  console.log("  tooltip diag:", JSON.stringify(tt));
  await shot("30-tooltip.png");

  // roller — click a skill to roll, panel opens
  await page.click(".statrow:has-text('Persuasion')").catch(() => {});
  await page.waitForTimeout(250);
  await shot("31-roller.png", { clip: { x: 1090, y: 400, width: 410, height: 700 } });

  // wild magic surge overlay
  await page.click("#surgeBtn").catch(() => {});
  await page.waitForTimeout(300);
  await shot("32-surge.png");
  await page.keyboard.press("Escape"); await page.waitForTimeout(100);

  // cast overlay (Fireball)
  await page.click('[data-action="cast"][data-spell="Fireball"]').catch(() => {});
  await page.waitForTimeout(300);
  await shot("40-cast.png", { clip: { x: 360, y: 70, width: 720, height: 640 } });
  await page.keyboard.press("Escape"); await page.waitForTimeout(80);

  // prismatic spray per-target flow
  await page.click('[data-action="cast"][data-spell="Prismatic Spray"]').catch(() => {});
  await page.waitForTimeout(150);
  await page.fill('#prismN', '3').catch(() => {});
  await page.click('[data-cast="prism-go"]').catch(() => {});
  await page.waitForTimeout(200);
  await shot("41-prismatic.png", { clip: { x: 360, y: 40, width: 720, height: 700 } });
  await page.keyboard.press("Escape"); await page.waitForTimeout(80);

  // updated panels + new bottom narrative
  await elShot("42-trackers.png", ".panel:has(h2:text-is('Resources & Trackers'))");
  await elShot("43-spellcasting.png", ".panel:has(h2:text-is('Spellcasting'))");
  await elShot("44-narrative.png", ".narrative-panel");
  await elShot("45-equipment.png", ".panel:has(h2:text('Coins'))");

  // mobile
  await page.setViewportSize({ width: 430, height: 900 });
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector(".char-name");
  await shot("33-mobile.png", { fullPage: true });

  console.log(errors.length ? "\nJS ERRORS:\n  " + errors.join("\n  ") : "\nNo JS console/page errors 🎉");
  console.log("done");
} catch (e) {
  console.error("CAPTURE ERROR:", e.message);
  process.exitCode = 1;
} finally {
  await browser.close();
}
