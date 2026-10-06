---
name: Blend Barber Club
description: Modern-retro barbershop — azul royal protagonista, branco e preto/cinza como base. Americana, urbana, editorial, premium; sem o clichê preto+dourado nem cara de SaaS.
colors:
  royal (protagonista): "#1A3AE0"
  royal-deep (seções de contraste): "#10238F"
  royal-soft (texto pequeno sobre ink/royal, AA): "#AEBCFF"
  royal-ink (texto/ícone sobre branco, AA): "#142C9E"
  ink (base escura): "#0A0A0D"
  steel (superfície escura secundária): "#15161D"
  white: "#FFFFFF"
  paper (respiro claro, nunca branco papel puro): "#EFEEE8"
  fog (texto secundário sobre ink/royal): "#9AA3C9"
typography:
  display: "Archivo 900 — título principal, wordmark BLEND, caixa-alta. Mesma família do corpo, peso diferente: decisão de 'menos famílias, mais peso', não pilha de fontes."
  heading: "Big Shoulders 700/800 — BARBER CLUB, nav, labels, numerais, botões. Condensada de inspiração collegiate/signage americano, sem caricatura de barbearia vintage."
  body: "Archivo 400–700 — corpo e metadados."
---

# Blend Barber Club — direção de arte

Reconstrução completa da camada visual sobre o sistema que já existia (agendamento,
Supabase, admin, financeiro — ver CLAUDE.md). Sem logo/arquivo de marca entregue pelo
cliente: a identidade é 100% tipográfica + grafismos originais (sem depender de um
arquivo que não existe). Se chegar um logo real depois, ele entra como peça nova; o
sistema tipográfico continua valendo.

## Conceito

*Modern-retro barbershop*: barbearia americana clássica × cultura urbana × design
editorial × minimalismo geométrico. Pensar numa fachada de ACM azul royal brilhante,
cadeiras Chesterfield pretas, iluminação forte — e traduzir isso para o digital por
composição (grids assimétricos, linhas, tipografia grande), não por colar fotos de
barbearia num fundo escuro.

**O azul royal é o protagonista** — aparece em CTAs, estados, acentos, a segunda linha
do título, a marca d'água do wordmark — mas o site não pode virar "preto com azul": a
composição alterna ink (preto quase puro) → paper (claro) → royal como bloco cheio em
pontos específicos (ainda a construir nas seções abaixo do Hero).

## Tipografia

Duas famílias só, de propósito (ver `layout.tsx`):

- **Archivo** (`--font-body`, variável `.font-display` em peso 900) — geométrica,
  grotesca, sem o ar de SaaS de Inter/Manrope. Usada tanto no texto corrido (400–700)
  quanto, em preto (900), no wordmark "BLEND" e títulos de seção.
- **Big Shoulders** (`--font-heading`/`--font-label`) — condensada de inspiração
  collegiate/signage americano (não script de barbearia). Nav, botões, labels,
  numerais, "BARBER CLUB" no lockup.

## Grafismos da marca (sistema, não decoração aleatória)

1. **Barber pole** (`pole-band.tsx`) — faixa diagonal branco/preto/royal, já existia
   (herdada da Fratelli, só recolorida): usada como divisor de seção.
2. **Navalha** (`RazorGlyph` em `brand.tsx`) — grafismo original (path próprio, não
   ícone de banco), reto e legível tanto pequena quanto grande; `crossed` desenha o
   par cruzado. Usada como marca d'água dentro de placeholders de foto por ora.
3. **Linhas finas** — hairline `border-white/10`/`border-white/15` separando blocos,
   como no Hero (citação com borda à esquerda). Ainda não sistematizado como grid
   completo nas seções abaixo.
4. **Wordmark monumental de fundo** — "BLEND" gigante em `white/[0.035]` atrás do
   Hero: profundidade editorial, não efeito gratuito.

## Tokens e como eles se espalham pelo projeto

`globals.css` mantém os tokens antigos da Fratelli (`--teal`/`--gold`/`--ivory`/
`--mist`/`--clay`) **inalterados**, porque seções públicas ainda não reconstruídas os
usam. Os tokens novos (`--royal`/`--ink`/`--steel`/`--white`/`--paper`/`--fog`) são a
paleta Blend. A ponte: os aliases legados do template (`--color-brand-red`,
`--color-brand-black`, `--color-brand-ink`, `--color-brand-cream`,
`--color-brand-oxblood`, `--color-brand-smoke`, `--color-brand-paper`) — que o painel
admin inteiro usa — foram repontados para a paleta Blend. Isso re-pintou o admin
completo (login, dashboard, agenda, financeiro, clientes, serviços, galeria,
configurações) sem tocar em nenhuma lógica.

## Status (ver CLAUDE.md para a lista completa)

**Reconstruído:** tokens + 2 fontes (globais, afetam tudo); Navbar; Hero; login admin;
sidebar do admin; `.btn`/`.label`/cartões do admin (`cardClass`) — logo todo o painel
administrativo herdou a paleta nova automaticamente.

**Ainda na identidade antiga (Fratelli: teal/dourado, leão, Anton/Stint/Bodoni só onde
hardcoded em cor — a fonte já trocou):** seções Serviços, O Clube, Equipe, Galeria,
FAQ, Footer, fluxo público de `/agendar`, `CookieNotice` (já corrigido), `PhotoSlot`
compartilhado (`LionMark`).

## Anti-genérico aplicado aqui

Sem hero centralizada; título grande tem motivo (é o nome da marca + a ação real).
Sem três cards; sem glassmorphism/gradiente genérico; sem ícone decorativo ilegível
(o grafismo da navalha foi redesenhado depois de ficar ilegível pequeno — ver lição
nos commits). CTA único e claro ("Agendar horário"), sem "Nossos serviços"/"Por que
escolher" ainda escritos (pendente nas próximas seções).
