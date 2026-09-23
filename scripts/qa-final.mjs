// QA final: node scripts/qa-final.mjs <baseUrl> <outDir>
// Captura desktop/tablet/mobile, hover, foco de teclado, reduced-motion e
// verifica overflow horizontal + alvos de toque < 44px + erros de console.
import { chromium } from "playwright-core";
import fs from "node:fs";
const [base, out] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const errors = [];

async function run(name, vp, { reduced = false, full = true } = {}) {
  const ctx = await browser.newContext({ viewport: vp, reducedMotion: reduced ? "reduce" : "no-preference" });
  const page = await ctx.newPage();
  page.on("console", (m) => ["error", "warning"].includes(m.type()) && errors.push(`[${name}] ${m.text()}`));
  page.on("pageerror", (e) => errors.push(`[${name}] pageerror ${e.message}`));
  await page.goto(base, { waitUntil: "load", timeout: 120000 });
  await page.waitForTimeout(1800);
  await page.screenshot({ path: `${out}/${name}-hero.png` });
  const H = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < H; y += 300) {
    await page.evaluate((v) => window.scrollTo(0, v), y);
    await page.waitForTimeout(260);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(500);
  if (full) await page.screenshot({ path: `${out}/${name}-full.png`, fullPage: true });
  const metrics = await page.evaluate(() => ({
    scrollW: document.documentElement.scrollWidth,
    innerW: window.innerWidth,
    small: [...document.querySelectorAll("a,button")]
      .filter((e) => e.offsetParent !== null)
      .map((e) => ({ t: (e.textContent || e.getAttribute("aria-label") || "").trim().slice(0, 24), w: Math.round(e.getBoundingClientRect().width), h: Math.round(e.getBoundingClientRect().height) }))
      .filter((e) => e.h < 40 && e.w < 44)
      .slice(0, 8),
  }));
  console.log(name, JSON.stringify(metrics));
  return { ctx, page };
}

await run("desktop", { width: 1440, height: 900 });
await run("tablet", { width: 820, height: 1100 });
const m = await run("mobile", { width: 390, height: 844 });
await m.ctx.close();
const r = await run("reduced", { width: 1440, height: 900 }, { reduced: true, full: false });
await r.ctx.close();

// hover em linha de serviço + foco de teclado (desktop)
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto(base, { waitUntil: "load", timeout: 120000 });
await page.evaluate(() => document.querySelector("#servicos").scrollIntoView());
await page.waitForTimeout(1500);
await page.hover("#servicos ol li:nth-child(3) a");
await page.waitForTimeout(800);
await page.screenshot({ path: `${out}/hover-servico.png` });
await page.keyboard.press("Tab");
await page.keyboard.press("Tab");
await page.keyboard.press("Tab");
await page.waitForTimeout(400);
await page.screenshot({ path: `${out}/focus-tab.png` });
// menu mobile aberto
const mctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
const mp = await mctx.newPage();
await mp.goto(base, { waitUntil: "load", timeout: 120000 });
await mp.waitForTimeout(1200);
await mp.click('button[aria-controls="menu-mobile"]');
await mp.waitForTimeout(900);
await mp.screenshot({ path: `${out}/mobile-menu.png` });
console.log(errors.length ? errors.join("\n") : "sem erros de console");
await browser.close();
