// QA do fluxo de agendamento: node scripts/qa-booking.mjs <baseUrl> <prefixo> [w] [h]
import { chromium } from "playwright-core";
const [base, prefix, w = "1440", h = "900"] = process.argv.slice(2);
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await (await browser.newContext({ viewport: { width: +w, height: +h } })).newPage();
const errors = [];
page.on("console", (m) => ["error", "warning"].includes(m.type()) && errors.push(m.text()));
await page.goto(`${base}/agendar`, { waitUntil: "load", timeout: 120000 });
await page.waitForTimeout(1200);
await page.screenshot({ path: `${prefix}-1.png`, fullPage: true });

await page.click("#servico");
await page.waitForTimeout(300);
await page.screenshot({ path: `${prefix}-1b-open.png` });
await page.click('[role="option"]:nth-child(3)');
await page.click("#profissional");
await page.click('[role="option"]:nth-child(2)');
await page.waitForTimeout(300);
await page.click('button[type="submit"]');
await page.waitForTimeout(700);
// próxima segunda-feira
const d = new Date();
d.setDate(d.getDate() + ((8 - d.getDay()) % 7 || 7));
const iso = d.toISOString().slice(0, 10);
await page.fill("#data", iso);
await page.waitForTimeout(1500);
await page.screenshot({ path: `${prefix}-2.png`, fullPage: true });
await page.click('button[aria-pressed]:nth-of-type(3)');
await page.click('button[type="submit"]');
await page.waitForTimeout(700);
await page.fill("#nome", "Teste QA");
await page.fill("#whatsapp", "(44) 99999-0000");
await page.screenshot({ path: `${prefix}-3.png`, fullPage: true });
await page.click('button[type="submit"]');
await page.waitForTimeout(1200);
await page.screenshot({ path: `${prefix}-4-erro-preview.png`, fullPage: true });
console.log(errors.length ? errors.join("\n") : "sem erros de console");
await browser.close();
