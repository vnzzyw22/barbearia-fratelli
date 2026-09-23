---
name: Fratelli Barber Club
description: Barber club italiano com herança editorial — teal profundo + dourado envelhecido + marfim, tipografia didone. Sem o clichê preto+dourado.
colors:
  teal (primário, da logo): "#125660"
  teal-deep: "#0d434b"
  teal-ink (rodapé/admin): "#082a30"
  gold (acento, da logo): "#d0a066"
  gold-deep (texto sobre marfim, AA): "#8a6428"
  ivory: "#f3ecdd"
  paper: "#e8dfca"
  charcoal (texto sobre marfim): "#182022"
  mist (texto secundário sobre teal): "#a9c2c3"
  clay (texto secundário sobre marfim): "#55686a"
typography:
  display: "Anton 400 — título principal, caixa-alta (a mais próxima, entre as gratuitas, do lettering FRATELLI da logo)"
  heading: "Stint Ultra Condensed 400 — títulos secundários, nav e botões, caixa-alta (a mais próxima do BARBER CLUB da logo)"
  body: "Hanken Grotesk 400–700 — corpo e metadados"
---

# Fratelli Barber Club — direção de arte

Identidade oficial = a logo entregue pelo cliente (leão em anel dourado +
wordmark FRATELLI em branco + "BARBER CLUB", sobre teal `#125660`). Cores
**amostradas dos pixels da logo** (teal 18,86,95; dourado 208,160,102).

## Conceito

*Italian barber club × herança × editorial contemporâneo.* Tradicional sem
parecer antigo; premium sem ostentação. **O teal é a base; o dourado é
acento** (linhas, números, estados, um botão) — nunca "preto e dourado".
Ritmo por blocos de cor: teal → marfim → teal profundo → marfim médio →
teal → teal profundo → quase-preto.

## Tipografia (teste de 2026-09-23: fontes gratuitas comparadas lado a lado com a logo)

A logo usa lettering próprio/modificado — a fonte exata não é identificável pela imagem. Aproximação
gratuita: **Anton** (FRATELLI) e **Stint Ultra Condensed** (BARBER CLUB). Substituiu Bodoni Moda + Zilla
Slab, cujo visual didone lia como "estético de IA". 3 famílias no total.

- **Anton** — hero, títulos de seção, a palavra "Fratelli" ao lado do emblema, "CLUB" monumental.
  Sempre caixa-alta (`.font-display`). Peso único.
- **Stint Ultra Condensed** — nomes de serviço, preços, horários, perguntas do FAQ, pilares, nomes da
  equipe, botões e nav (`.font-heading` e `.label`). Caixa-alta, tracking 0.035–0.12em. Peso único;
  usar em corpo ≥ 1.4rem (é muito estreita).
- **Hanken Grotesk** — corpo, metadados (`.meta`), rótulos de campo (`.field-label`).
- Sem itálico/negrito: as duas display têm só um peso (`font-synthesis: none`). O destaque do título do
  Clube é **cor** (dourado), não itálico. `latin-ext` sempre incluído (Ç, acentos).
- Se o cliente achar o nome da fonte real (ou o arquivo original da logo), trocar `--font-display` /
  `--font-heading` em `layout.tsx`.

## Assinaturas visuais (o que faz reconhecer a Fratelli sem a logo)

1. **Anel** — a moldura circular da logo vira sistema: arcos concêntricos
   (`Rings`), medalhão de anel duplo nos números e retratos (`.medallion`).
2. **Leão em marca d'água** — o alfa do emblema oficial como máscara CSS
   (`.lion-mask` / `LionMark`), dourado sobre teal ou teal sobre marfim.
3. **Divisor linha–losango–linha** (`.rule-diamond`), copiado da moldura de
   "BARBER CLUB".
4. **Labels em slab caixa-alta** + numerais romanos (I, II, III) nos passos.
5. **Botões retos** (sem pill, sem `rounded-xl`), dourado sólido, losango
   como marcador no lugar de seta.
6. **CLUB monumental** tom sobre tom na seção O Clube.

## Layout

- Container 1440px, gutter 20px (mobile) / 48px (desktop), grid 12 colunas.
- Hero: wordmark oficial em **sangria total** (as letras F e I já vêm
  cortadas no arquivo do cliente; a 100vw o corte coincide com a borda da
  tela). Emblema no campo superior, com parallax leve e arcos.
- Serviços: **tabela editorial** (medalhão · nome · pontilhado · preço),
  linha inteira é o link; hover "enche" de teal por baixo. Sem cards.
- Mobile é composição própria: emblema + headline + CTA + wordmark cabem na
  primeira tela; menu em tela cheia com numeração.

## Motion

Curva única `--ease-signature` (`EASE`). Títulos por **máscara de linha**;
hero com wipe do wordmark e parallax de 70px no emblema; hover de linha
enchendo. `prefers-reduced-motion` zera transições/animações e o parallax.
Sem scroll-jacking, sem 3D.

## Imagem

Nenhuma foto de banco. Sem foto real, o slot é placeholder explícito
("Foto em breve" sobre o leão em marca d'água). Fotos reais entram sem filtro.

## Regras de derivação da logo (`scripts/build-brand-assets.mjs`)

Só recorte + ampliação 4× (lanczos) + reforço de borda; o emblema tem o
teal removido por chave de cor (ouro puro com alfa). **Nada é redesenhado.**
Arquivo-fonte veio 529×527 com artefato de captura na última coluna
(descartada). Precisa de versão vetorial/alta para nitidez máxima.
