// QA visual: node scripts/shot.mjs <url> <out.png> [width] [height] [fullPage:0|1] [scrollY]
// Usa o Chrome do sistema (playwright-core, instalar com --no-save).
import { chromium } from "playwright-core";
const [url, out, w = "1440", h = "900", full = "0", scrollY = "0", dpr = "1"] = process.argv.slice(2);
const browser = await chromium.launch({ channel: "chrome", headless: true });
const ctx = await browser.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: +dpr });
const page = await ctx.newPage();
const errors = [];
page.on("console", (m) => { if (["error", "warning"].includes(m.type())) errors.push(m.type() + ": " + m.text()); });
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
await page.goto(url, { waitUntil: "load", timeout: 120000 });
if (+scrollY) { await page.evaluate((y) => window.scrollTo(0, y), +scrollY); }
await page.waitForTimeout(1600);
if (full === "1") {
  // força reveals: rola a página inteira
  const H = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < H; y += 500) { await page.evaluate((v) => window.scrollTo(0, v), y); await page.waitForTimeout(150); }
  await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(500);
}
await page.screenshot({ path: out, fullPage: full === "1" });
console.log(errors.length ? errors.join("\n") : "sem erros de console");
await browser.close();
