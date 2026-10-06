# Blend Barber Club

Site + agendamento + painel administrativo (Next.js 16, Tailwind v4, Supabase, Framer Motion).

```bash
npm install
npm run dev      # http://localhost:3000 — modo pré-visualização sem Supabase
npm run build
```

Sem variáveis do Supabase o site público e o `/agendar` funcionam com dados
locais (`src/lib/local-fallback-data.ts`), sem gravar agendamentos. Para
produção: criar projeto Supabase próprio, aplicar `supabase/migrations/*` e
`supabase/seed.sql`, copiar `.env.local.example` para `.env.local`.

- Identidade e tokens: [DESIGN.md](DESIGN.md)
- Decisões, lições e pendências: [CLAUDE.md](CLAUDE.md)
- `scripts/build-brand-assets.mjs` e `scripts/vectorize-wordmark.mjs` eram da identidade
  anterior (Fratelli, derivava `emblem.webp`/`wordmark.svg` de um PNG do cliente) —
  obsoletos: a Blend usa o selo `BlendBadge` (SVG direto em `src/components/site/brand.tsx`),
  sem depender de um arquivo de logo.
- QA visual (Chrome do sistema): `npm i --no-save playwright-core` e
  `node scripts/shot.mjs <url> <out.png> [w] [h] [fullPage] [scrollY] [dpr]`
