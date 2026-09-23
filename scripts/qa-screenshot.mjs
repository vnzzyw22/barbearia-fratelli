// Fallback de QA visual pra quando o MCP de navegador da sessão cai
// (aconteceu >1x nesta sessão, CONNECT_TIMEOUT) — usa o Chrome já
// instalado no sistema via `channel: "chrome"`, sem baixar navegador
// extra. Não é dependência do projeto: rodar `npm install --no-save
// playwright-core` antes de usar.
import { chromium } from "playwright-core";

const url = process.argv[2];
const out = process.argv[3];
const selectorToScroll = process.argv[4] || null;
const width = Number(process.argv[5] || 1440);
const height = Number(process.argv[6] || 900);

const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
});
const page = await browser.newPage({ viewport: { width, height } });
await page.goto(url, { waitUntil: "networkidle" });
if (selectorToScroll) {
  await page.locator(selectorToScroll).scrollIntoViewIfNeeded();
}
await page.waitForTimeout(1200);
await page.screenshot({ path: out });
await browser.close();
console.log("saved:", out);
