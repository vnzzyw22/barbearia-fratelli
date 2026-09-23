// Vetoriza o wordmark oficial (FRATELLI + BARBER CLUB) a partir do PNG do cliente,
// separando as camadas de cor (branco, dourado, tan, sombra) e traçando cada uma
// com potrace. Resultado: SVG nítido em qualquer tamanho, com as MESMAS letras da logo.
// Uso: npm i --no-save potrace && node scripts/vectorize-wordmark.mjs <logo.png>
import sharp from "sharp";
import potrace from "potrace";
import fs from "node:fs";

const SRC = process.argv[2] ?? ".scratch/logo-src.png";
const SCALE = 6;
const BG = [18, 86, 95];

const trace = (buf, opts) =>
  new Promise((res, rej) => potrace.trace(buf, opts, (e, svg) => (e ? rej(e) : res(svg))));

async function vectorize(region, outName, layersSpec, colors) {
  const crop = await sharp(SRC).removeAlpha().extract({ left: 0, top: 0, width: 528, height: 526 }).png().toBuffer();
  const up = await sharp(crop)
    .extract(region)
    .resize(region.width * SCALE, region.height * SCALE, { kernel: "lanczos3" })
    .blur(3.4)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: W, height: H } = up.info;
  const d = up.data;

  // classificação por pixel
  const cls = new Uint8Array(W * H); // 0 bg, 1 branco, 2 dourado, 3 tan, 4 sombra
  const sum = [null, [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]];
  for (let p = 0; p < W * H; p++) {
    const r = d[p * 3], g = d[p * 3 + 1], b = d[p * 3 + 2];
    const lum = 0.3 * r + 0.59 * g + 0.11 * b;
    // branco: ponto médio entre o teal (min ~18) e o branco (min ~252) = ~135, para
    // não afinar os traços; dourado/tan: hue quente (r-b alto), inclusive mesclado ao teal.
    let c = 0;
    if (Math.min(r, g, b) > 135 && r - b < 45) c = 1;
    else if (r - b > -30 && r > 70) c = 2;
    cls[p] = c;
    if (c) { const s = sum[c]; s[0] += r; s[1] += g; s[2] += b; s[3]++; }
  }
  const colorOf = (c) => {
    const s = sum[c];
    if (!s || !s[3]) return "#000";
    const h = (v) => Math.round(v / s[3]).toString(16).padStart(2, "0");
    return `#${h(s[0])}${h(s[1])}${h(s[2])}`;
  };

  const paths = [];
  for (const [c, name] of layersSpec) {
    const gray = Buffer.alloc(W * H, 255);
    let n = 0;
    for (let p = 0; p < W * H; p++) if (cls[p] === c) { gray[p] = 0; n++; }
    if (!n) continue;
    const png = await sharp(gray, { raw: { width: W, height: H, channels: 1 } }).png().toBuffer();
    const svg = await trace(png, { turdSize: 140, alphaMax: 1.2, optCurve: true, optTolerance: 1.1, blackOnWhite: true });
    const dAttr = [...svg.matchAll(/ d="([^"]+)"/g)].map((m) => m[1]).join(" ");
    paths.push(`<path fill="${colors[c] ?? colorOf(c)}" fill-rule="evenodd" d="${dAttr}"/>`);
    console.log(outName, name, colorOf(c), `${n} px`);
  }
  const out = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${paths.join("")}</svg>`;
  fs.writeFileSync(`public/brand/${outName}.svg`, out);
  console.log(`public/brand/${outName}.svg`, Math.round(out.length / 1024) + " KB");
}

// camadas de baixo para cima (a ordem de pintura importa)
await vectorize({ left: 0, top: 282, width: 526, height: 172 }, "wordmark", [[2, "tan-dourado"], [1, "branco"]], { 1: "#fbfefb", 2: "#a88a5a" });
await vectorize({ left: 0, top: 456, width: 526, height: 58 }, "lockup-sub", [[2, "tan-dourado"], [1, "branco"]], { 1: "#fbfefb", 2: "#c3914f" });
