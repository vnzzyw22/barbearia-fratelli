// node scripts/qa-perf.mjs <url> — LCP, CLS, tarefas longas, peso e fluidez do scroll.
import { chromium } from "playwright-core";
const url = process.argv[2] ?? "http://localhost:3000/";
const browser = await chromium.launch({ channel: "chrome", headless: true });

async function run(label, viewport, cpu) {
  const ctx = await browser.newContext({ viewport, deviceScaleFactor: cpu > 1 ? 2 : 1 });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  if (cpu > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: cpu });
  await page.addInitScript(() => {
    window.__m = { lcp: 0, cls: 0, long: [] };
    new PerformanceObserver((l) => l.getEntries().forEach((e) => (window.__m.lcp = e.startTime))).observe({ type: "largest-contentful-paint", buffered: true });
    new PerformanceObserver((l) => l.getEntries().forEach((e) => { if (!e.hadRecentInput) window.__m.cls += e.value; })).observe({ type: "layout-shift", buffered: true });
    new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__m.long.push(Math.round(e.duration)))).observe({ type: "longtask", buffered: true });
  });
  const errors = [];
  page.on("console", (m) => ["error", "warning"].includes(m.type()) && errors.push(m.text().slice(0, 140)));
  page.on("pageerror", (e) => errors.push("pageerror " + e.message));
  await page.goto(url, { waitUntil: "load", timeout: 120000 });
  await page.waitForTimeout(2500);

  // fluidez: rola a página inteira e mede o tempo entre quadros
  const scroll = await page.evaluate(async () => {
    const H = document.documentElement.scrollHeight - innerHeight;
    const frames = [];
    let last = performance.now();
    let y = 0;
    await new Promise((res) => {
      function step(t) {
        frames.push(t - last);
        last = t;
        y += 22;
        window.scrollTo(0, y);
        if (y < H) requestAnimationFrame(step);
        else res();
      }
      requestAnimationFrame(step);
    });
    frames.shift();
    const sorted = [...frames].sort((a, b) => a - b);
    return {
      frames: frames.length,
      avgMs: +(frames.reduce((a, b) => a + b, 0) / frames.length).toFixed(1),
      p95Ms: +sorted[Math.floor(sorted.length * 0.95)].toFixed(1),
      slowFrames: frames.filter((f) => f > 50).length,
      worstMs: +Math.max(...frames).toFixed(1),
    };
  });
  const m = await page.evaluate(() => {
    const res = performance.getEntriesByType("resource");
    const total = res.reduce((a, r) => a + (r.transferSize || 0), 0);
    const big = res.filter((r) => r.transferSize > 60000).map((r) => `${r.name.split("/").slice(-1)[0].slice(0, 40)} ${Math.round(r.transferSize / 1024)}KB`);
    return { ...window.__m, kb: Math.round(total / 1024), big };
  });
  console.log(`\n[${label}] LCP ${Math.round(m.lcp)}ms | CLS ${m.cls.toFixed(3)} | longtasks ${m.long.length} (${m.long.join(",")}) | transfer ${m.kb}KB`);
  console.log(`  maiores: ${m.big.join(" · ")}`);
  console.log(`  scroll: média ${scroll.avgMs}ms/quadro, p95 ${scroll.p95Ms}ms, quadros >50ms: ${scroll.slowFrames}/${scroll.frames}, pior ${scroll.worstMs}ms`);
  console.log("  console:", errors.length ? errors.join(" | ") : "limpo");
  await ctx.close();
}

await run("desktop", { width: 1440, height: 900 }, 1);
await run("mobile 4x CPU", { width: 390, height: 844 }, 4);
await browser.close();
