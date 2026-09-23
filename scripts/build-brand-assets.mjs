// Gera os derivados da logo oficial da Fratelli Barber Club a partir do
// arquivo entregue pelo cliente (529x527, PNG com fundo teal chapado
// #125660). Nada é redesenhado: só recortes + ampliação (lanczos) + chave
// de cor pro emblema. Uso: node scripts/build-brand-assets.mjs <logo.png>
import sharp from "sharp";
import { mkdirSync } from "node:fs";

const SRC = process.argv[2] ?? ".scratch/logo-src.png";
const OUT = "public/brand";
mkdirSync(OUT, { recursive: true });

const BG = [18, 86, 95]; // #125660 — teal exato da logo
const GOLD = [208, 160, 102]; // #D0A066 — dourado exato da logo
const SCALE = 4;

// A última coluna e linha do arquivo original são artefato de captura
// (coluna quase preta) — descartadas.
const baseBuf = await sharp(SRC).removeAlpha().extract({ left: 0, top: 0, width: 528, height: 526 }).png().toBuffer();
const { data, info } = await sharp(baseBuf).raw().toBuffer({ resolveWithObject: true });
const W = info.width;
const H = info.height;
const px = (x, y) => {
  const i = (y * W + x) * 3;
  return [data[i], data[i + 1], data[i + 2]];
};
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

// faixas de linhas com conteúdo, abaixo do emblema
const bands = [];
let start = -1;
for (let y = 262; y < H; y++) {
  let has = false;
  for (let x = 0; x < W; x++) if (dist(px(x, y), BG) > 70) { has = true; break; }
  if (has && start < 0) start = y;
  if (!has && start >= 0) { bands.push([start, y - 1]); start = -1; }
}
if (start >= 0) bands.push([start, H - 1]);
console.log("bandas abaixo do emblema:", bands);

// Reforço de borda: o arquivo do cliente tem artefato JPEG. Pra pixels perto
// do eixo teal->branco, aplica curva sigmoide na projeção (bordas mais firmes
// após a ampliação); pixels dourados/sombras ficam intactos.
const WHITE = [252, 255, 252];
function crispen(rgb, w, h) {
  const ax = [WHITE[0] - BG[0], WHITE[1] - BG[1], WHITE[2] - BG[2]];
  const len2 = ax[0] * ax[0] + ax[1] * ax[1] + ax[2] * ax[2];
  for (let i = 0; i < w * h * 3; i += 3) {
    const d = [rgb[i] - BG[0], rgb[i + 1] - BG[1], rgb[i + 2] - BG[2]];
    const t = (d[0] * ax[0] + d[1] * ax[1] + d[2] * ax[2]) / len2;
    const proj = [ax[0] * t, ax[1] * t, ax[2] * t];
    const off = Math.hypot(d[0] - proj[0], d[1] - proj[1], d[2] - proj[2]);
    if (off > 22 || t <= 0.02 || t >= 0.98) continue;
    const t2 = Math.max(0, Math.min(1, (t - 0.5) * 2.4 + 0.5));
    rgb[i] = BG[0] + ax[0] * t2; rgb[i + 1] = BG[1] + ax[1] * t2; rgb[i + 2] = BG[2] + ax[2] * t2;
  }
}

async function up(region, name) {
  const r = await sharp(baseBuf)
    .extract(region)
    .resize(region.width * SCALE, region.height * SCALE, { kernel: "lanczos3" })
    .raw()
    .toBuffer({ resolveWithObject: true });
  crispen(r.data, r.info.width, r.info.height);
  await sharp(r.data, { raw: { width: r.info.width, height: r.info.height, channels: 3 } })
    .webp({ lossless: true })
    .toFile(`${OUT}/${name}.webp`);
  console.log(name, region);
}

await sharp(baseBuf).toFile(`${OUT}/lockup-original.png`);

// Emblema (leão + anel) com fundo teal removido -> ouro puro com alpha.
// alpha = projeção do pixel no eixo teal->ouro; cor de saída = ouro exato.
const ex = { left: 136, top: 6, width: 254, height: 254 };
const { data: ed } = await sharp(baseBuf).extract(ex).raw().toBuffer({ resolveWithObject: true });
const up4 = await sharp(ed, { raw: { width: ex.width, height: ex.height, channels: 3 } })
  .resize(ex.width * SCALE, ex.height * SCALE, { kernel: "lanczos3" })
  .raw()
  .toBuffer({ resolveWithObject: true });
const ax = [GOLD[0] - BG[0], GOLD[1] - BG[1], GOLD[2] - BG[2]];
const axLen2 = ax[0] * ax[0] + ax[1] * ax[1] + ax[2] * ax[2];
const out = Buffer.alloc(up4.info.width * up4.info.height * 4);
for (let i = 0, o = 0; i < up4.data.length; i += 3, o += 4) {
  const d = [up4.data[i] - BG[0], up4.data[i + 1] - BG[1], up4.data[i + 2] - BG[2]];
  let a = (d[0] * ax[0] + d[1] * ax[1] + d[2] * ax[2]) / axLen2;
  // curva de contraste na borda pra recuperar nitidez após a ampliação
  a = Math.max(0, Math.min(1, (a - 0.5) * 1.6 + 0.5));
  out[o] = GOLD[0]; out[o + 1] = GOLD[1]; out[o + 2] = GOLD[2];
  out[o + 3] = Math.round(a * 255);
}
// 512px: atende a placa do hero até em tela retina (a fonte tem só 254px); ~30KB em vez de ~120KB
await sharp(out, { raw: { width: up4.info.width, height: up4.info.height, channels: 4 } })
  .resize(512, 512, { kernel: "lanczos3" })
  .webp({ quality: 92, alphaQuality: 100 })
  .toFile(`${OUT}/emblem.webp`);
console.log("emblem", up4.info.width, up4.info.height);
