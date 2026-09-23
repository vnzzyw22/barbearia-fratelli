@AGENTS.md

# Fratelli Barber Club — guia do projeto

Site + agendamento + painel administrativo da **Fratelli Barber Club**.
Criado em 2026-09-23 como **rebranding completo** de uma cópia do projeto
`barbearia-fialho` (mesmo template Lkas Locs → Tesouras Club → Fialho).
Cópia feita sem `.git`, `.vercel`, `.env.local` e `midia-cliente`, de
propósito: o site da Fialho segue em produção com cliente real e este
projeto **nunca deve apontar para o Supabase/Vercel dela**.

## Stack (inalterada)

Next.js 16 (App Router) + Tailwind v4 + Supabase + Framer Motion. Sem
multi-tenancy: cada cliente tem seu deploy/Supabase. Lógica de agendamento,
auth, RLS, admin e `scheduling.ts` **não foram alteradas** — o rebranding
tocou só camada visual e textos de marca.

## Identidade

Ver **DESIGN.md** (tokens, tipografia, assinaturas visuais). Resumo: teal
`#125660` + dourado `#D0A066` (acento) + marfim; Bodoni Moda / Zilla Slab /
Hanken Grotesk. Logo derivada por `scripts/build-brand-assets.mjs`
(fonte: logo PNG entregue pelo cliente; rodar de novo se chegar arquivo melhor:
`node scripts/build-brand-assets.mjs <logo.png>`).

Tokens legados do template (`brand-red/ink/cream/...`) foram **mantidos como
aliases** (só os valores mudaram) porque o admin e o agendamento usam esses
nomes. Tokens novos (`teal`, `gold`, `ivory`, `paper`...) no site público.

## Modo de pré-visualização

Sem `NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY`, o site lê `src/lib/local-fallback-data.ts`
(manter em sincronia manual com `supabase/seed.sql`). `/admin` e gravação de
agendamento exigem um Supabase próprio da Fratelli (**ainda não criado**).

## Lições técnicas herdadas (valem aqui)

- `proxy.ts` (não `middleware.ts`); qualquer pasta nova de asset estático em
  `public/` entra na exclusão do `matcher` (já inclui `brand/`).
- Insert público sem `.select()` (RLS); `id` gerado no servidor.
- `<Image fill>` exige ancestral `relative`.
- Fuso fixo `America/Sao_Paulo`.
- `latin-ext` nos subsets do `next/font` (Ç).
- **Novo:** revelação por máscara (`overflow-hidden` + filho deslocado) nunca
  dispara `whileInView` no filho — o observer fica no título (ver
  `TitleReveal` em `reveal.tsx`).

## Pendências (bloqueadas no cliente)

- [ ] **Logo em alta / vetorial (cliente ainda não tem — aguardando)**: o arquivo recebido é 529×527, com JPEG
  artefatos e o wordmark FRATELLI cortado nas bordas (F e I). Ampliado a
  1440px fica macio. Pedir SVG/PDF ou PNG ≥ 2000px **com o wordmark inteiro**.
- [x] **Confirmados pelo cliente (2026-09-23):** WhatsApp = (44) 99916-1432 (`business_settings.whatsapp`),
  cidade = Maringá-PR. Endereço ("Av. das Grevíleas, 148 — Maringá, PR"), Instagram (@fratellibarberclub) e o
  outro telefone (44) 99916-7632 foram lidos da placa (`public/brand/foto-faxada.jpg`). Mapa = link
  "Ver no mapa" (`mapsLink` em `src/lib/brand-contacts.ts`), sem iframe.
- [ ] **Serviços e preços são EXEMPLOS genéricos** (autorizados pelo cliente): Corte 50, Barba 40, Corte e
  Barba 85, Sobrancelha 20, Pezinho 15, Hidratação 45, Selagem 120, Coloração a partir de 60. Substituir pela
  tabela real (`supabase/seed.sql`, `local-fallback-data.ts` ou painel). **Horário de funcionamento** ainda
  é o herdado da base — confirmar.
- [ ] Barbeiros reais + fotos (hoje "Barbeiro 01–03" com slot "foto a enviar").
- [ ] **Fotos a enviar (placeholders explícitos, componente `PhotoSlot`):** barba e cabelo (seção
  Serviços), mosaico da Galeria (5 slots; preenchidos automaticamente pelo `/admin/galeria`),
  retratos dos barbeiros. A fachada real já está em uso (seção Local).
- [ ] Copy provisória a aprovar: seção O Clube (`club-section.tsx`), FAQ
  (`faq-accordion.tsx`), headline do Hero. Nada de história/ano inventado.
- [ ] Projeto Supabase + Vercel + repositório próprios da Fratelli; usuário admin.
- [ ] Tela de Políticas/Termos: texto genérico herdado, revisar.

## Regras de negócio (herdadas)

Sem pagamento antecipado; cliente não cancela pelo sistema; WhatsApp só como
canal pós-agendamento; status Pendente/Confirmado/Cancelado; agenda por
profissional.

## Wordmark vetorizado (2026-09-23)

`public/brand/wordmark.svg` e `lockup-sub.svg` são o wordmark OFICIAL traçado (potrace) a partir do PNG do
cliente por `scripts/vectorize-wordmark.mjs` (`npm i --no-save potrace playwright-core`; atenção: cada
`--no-save` remove os outros pacotes não salvos). Mesmas letras da logo, nítidas em qualquer tamanho; o corte
do F e do I é do arquivo original. Quando chegar a logo completa/vetorial, rodar de novo ou usar o SVG dela.
O hero definitivo (`hero.tsx`) é a placa da logo emoldurada; as propostas A/C e o hero antigo foram apagados.

## Páginas legais e cookies (2026-09-23)

`/politica-de-privacidade`, `/politica-de-cookies` e `/termos-de-uso` (modelo básico LGPD, layout `legal-layout.tsx`)
descrevem o que o código realmente faz: o site público não grava cookies em anônimos; o painel usa a sessão do Supabase
Auth; `CookieNotice` (localStorage `fratelli-cookie-notice`) é só informativo. **Revisar com advogado** e incluir razão
social/CNPJ (não informados) na seção 1 da privacidade. Se entrar analytics/pixel, virar pedido de consentimento.

## Performance (medido em build de produção, 2026-09-23)

Desktop: LCP ~1,0s, CLS 0. Mobile com CPU 4x mais lenta: LCP ~2,2s, sem quadros lentos no scroll. `scripts/qa-perf.mjs`
mede LCP/CLS/long tasks/scroll. Emblema em 512px (55KB); wordmark em SVG. No Windows, parar o `next start` antes de
sobrescrever arquivos de `public/` (o processo trava o arquivo).

## Regras de design deste projeto (impeccable/frontend-design, 2026-09-23)

- Sem eyebrow, sem numeração fora de sequência real (só passos do agendamento), sem "·"/"→".
- Caixa-alta rastreada (`.label`) só em botões/nav; metadado em `.meta`; rótulo de campo `.field-label`.
- Itálico dourado no título só na seção O Clube. Motion: hero + revelação do Clube; resto estático.
- Texto pequeno sobre teal usa `gold-soft`; sobre marfim, `gold-deep`/`clay` (AA verificado).
