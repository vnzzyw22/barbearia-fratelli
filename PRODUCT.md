# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primário: clientes que visitam o site para conhecer serviços e agendar com o
barbeiro de preferência. Secundário: a equipe da Fratelli Barber Club usando
o painel `/admin` (agenda, equipe, clientes, serviços, galeria, financeiro).

## Product Purpose

Site institucional + agendamento online + painel para a Fratelli Barber Club.
O cliente escolhe serviço, profissional, dia e horário livre; o pedido fica
pendente até a confirmação da casa (WhatsApp entra depois). Sucesso =
agendamentos reais sem conflito de horário.

## Positioning

Barber club italiano com herança editorial (teal + dourado envelhecido +
marfim). Rebranding de um template já usado em outros deployments; identidade
própria documentada em DESIGN.md.

## Brand Commitments

Nome: Fratelli Barber Club. Logo oficial: leão em anel dourado + wordmark
FRATELLI + "BARBER CLUB" (teal `#125660`, dourado `#D0A066`). Nenhum dado de
história, endereço, contato ou equipe foi inventado — o que falta é
placeholder explícito (ver CLAUDE.md > Pendências).

## Product Principles

- Dados da marca nunca hardcoded quando existem em `business_settings` /
  `services` / `staff`.
- Sem inventar conteúdo de cliente (história, nomes, preços, fotos).
- Funcionalidade preservada: o redesign não altera regras de agendamento.

## Accessibility & Inclusion

`prefers-reduced-motion` respeitado globalmente e no parallax do Hero; foco
visível dourado/teal; alvos de toque ≥ 44px; contraste do texto sobre marfim
usa `gold-deep`/`clay` (AA).
