// node scripts/qa-motion.mjs <baseUrl> <outDir> — quadros da entrada do hero, hover do botão,
// revelação das linhas de serviço, barra de progresso e caminho reduced-motion.
import { chromium } from "playwright-core";
import fs from "node:fs";
const [base, out] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const errors = [];
const mk = async (opts = {}) => {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, ...opts });
  const p = await ctx.newPage();
  p.on("console", (m) => ["error", "warning"].includes(m.type()) && errors.push(m.text()));
  p.on("pageerror", (e) => errors.push("pageerror " + e.message));
  return p;
};

// 1) entrada do hero, quadros em 4 instantes
let p = await mk();
await p.goto(base, { waitUntil: "load", timeout: 120000 });
await p.evaluate(() => location.reload());
const t0 = Date.now();
await p.waitForLoadState("domcontentloaded");
for (const ms of [350, 800, 1300, 2300]) {
  const wait = ms - (Date.now() - t0);
  if (wait > 0) await p.waitForTimeout(wait);
  await p.screenshot({ path: `${out}/hero-${ms}.png` });
}

// 2) hover do botão
await p.hover("main a.btn");
await p.waitForTimeout(700);
await p.screenshot({ path: `${out}/btn-hover.png`, clip: { x: 0, y: 300, width: 720, height: 260 } });

// 3) revelação das linhas de serviço + progresso
await p.evaluate(() => document.getElementById("servicos").scrollIntoView());
await p.waitForTimeout(350);
await p.screenshot({ path: `${out}/services-early.png` });
await p.waitForTimeout(1500);
await p.screenshot({ path: `${out}/services-done.png` });
const prog = await p.evaluate(() => {
  const el = document.querySelector("header > div[aria-hidden]");
  return el ? getComputedStyle(el).transform : "sem barra";
});
console.log("progress transform:", prog);

// 4) reduced motion: tudo visível, sem quebrar
const r = await mk({ reducedMotion: "reduce" });
await r.goto(base, { waitUntil: "load", timeout: 120000 });
await r.waitForTimeout(1500);
await r.screenshot({ path: `${out}/reduced-hero.png` });
await r.evaluate(() => document.getElementById("servicos").scrollIntoView());
await r.waitForTimeout(1200);
await r.screenshot({ path: `${out}/reduced-services.png` });
console.log(errors.length ? errors.join("\n") : "sem erros de console");
await browser.close();
