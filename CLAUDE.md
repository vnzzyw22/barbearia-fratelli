@AGENTS.md

# Blend Barber Club — guia do projeto

Site + agendamento + painel administrativo, hoje com a marca **Blend Barber
Club**. Criado em 2026-09-23 como rebranding completo de uma cópia do projeto
`barbearia-fialho` (mesmo template Lkas Locs → Tesouras Club → Fialho →
**Fratelli** → **Blend**, 2026-10-06). Cópia feita sem `.git`, `.vercel`,
`.env.local` e `midia-cliente`, de propósito: o site da Fialho segue em
produção com cliente real e este projeto **nunca deve apontar para o
Supabase/Vercel dela**.

## Rebrand Fratelli → Blend (2026-10-06)

Reconstrução visual completa pedida pelo cliente ("modern-retro barbershop",
azul royal + branco + preto), preservando 100% do sistema (agendamento, RLS,
admin, financeiro — nada disso mudou). Em andamento, por etapas; ver
**DESIGN.md** para a identidade nova e o status exato de cada seção
(reconstruída vs. ainda na identidade antiga/Fratelli). Sem logo-arquivo da
Blend (cliente não enviou) — identidade só tipográfica + grafismos originais
(`RazorGlyph`, `PoleBand`) até existir um arquivo real.

## Stack (inalterada)

Next.js 16 (App Router) + Tailwind v4 + Supabase + Framer Motion. Sem
multi-tenancy: cada cliente tem seu deploy/Supabase. Lógica de agendamento,
auth, RLS, admin e `scheduling.ts` **não foram alteradas** — o rebranding
tocou só camada visual e textos de marca.

## Identidade

Ver **DESIGN.md** (identidade Blend atual: azul royal `#1A3AE0` + branco +
ink `#0A0A0D`; Archivo + Big Shoulders). Os tokens antigos da Fratelli (teal
`#125660`/dourado `#D0A066`/ivory) continuam em `globals.css`, **inalterados**,
porque as seções públicas ainda não reconstruídas os usam — não remover sem
migrar quem usa primeiro.

Tokens legados do template (`brand-red/ink/cream/...`) foram **mantidos como
aliases**, só repontados de novo (Fratelli → Blend): é por isso que o painel
admin inteiro já está na identidade nova sem nenhuma lógica alterada. Tokens
novos da Blend: `royal`, `royal-deep`, `royal-soft`, `royal-ink`, `ink`,
`steel`, `white`, `paper`, `fog`.

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

- [ ] **Reconstrução visual Blend em andamento (2026-10-06):** feito — tokens/fontes
  globais, Navbar, Hero, todo o painel admin (login/dashboard/agenda/financeiro/
  cartões). Falta — Serviços, O Clube, Equipe, Galeria, FAQ, Footer, `/agendar`,
  `PhotoSlot` compartilhado (ainda usam `LionMark`/cores antigas). Não fazer deploy
  em produção até essas seções serem refeitas: hoje o site público mostraria Hero
  novo (Blend) seguido de seções com a logo/cor da Fratelli, inconsistente.
- [ ] **Logo da Blend:** cliente não enviou nenhum arquivo. Identidade hoje é só
  tipográfica (Archivo + Big Shoulders) + grafismos originais (`RazorGlyph`,
  `PoleBand`) — ver DESIGN.md. A pendência antiga de logo da Fratelli (abaixo) ficou
  obsoleta com o rebrand.
- [ ] **Logo em alta / vetorial da FRATELLI (obsoleto — projeto agora é Blend)**: o arquivo recebido era 529×527, com JPEG
  artefatos e o wordmark FRATELLI cortado nas bordas (F e I). Ampliado a
  1440px fica macio. Mantido aqui só como histórico; não pedir mais este arquivo.
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
- [x] **Supabase ligado (2026-09-25):** o Fratelli usa o projeto `pgoleccfvulckagvmgbr` (ex-Fialho, negócio encerrado; dados apagados e recarregados com o seed do Fratelli). Variáveis `NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY` na Vercel (Production/Development) e em `.env.local` (não versionado). Cadastro público de usuários DESLIGADO (as políticas tratam qualquer usuário autenticado como admin — nunca religar). Validado em produção: agendamento ponta a ponta, `EXCLUDE` barra conflito (23P01), RLS barra leitura anônima de clientes/agendamentos e `/admin` redireciona para o login.
- [ ] **Limpar dados de teste** (se ainda existirem): `delete from public.appointments where notes like 'TESTE AUTOMATICO%'; delete from public.clients where name like 'TESTE AUTOMATICO%';`
- [ ] Conexão Vercel–GitHub (deploy automático) não configurada; deploy manual com `vercel deploy --prod`.
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

## Sistema financeiro (2026-09-25)

Fluxo: agendamento → atendimento → **Concluir atendimento** (agenda) → pagamento → receita → caixa → relatórios.
Tudo em **centavos inteiros**; a fonte da verdade é o banco (migrações `20260925120000` fundação, `…130000` cascade dos itens,
`…140000` correção de acentos). Só o **dono** (`admin_profiles.role='owner'`, função `is_owner()`) acessa; anônimo não lê nada
financeiro; funções (`complete_appointment`, `record_payment`, `refund_payment`, `open/close_cash_register`, `add_cash_movement`,
`pay_expense`, `generate_recurring_expenses`, `finance_summary`, `cash_flow`, `report_by_*`) são atômicas e idempotentes.
Histórico (pagamentos, receitas, movimentos, auditoria) é imutável por gatilho: erro se corrige com estorno/ajuste.
Painel: `/admin/financeiro?aba=geral|receitas|despesas|caixa|relatorios|ajustes&p=hoje|7d|mes|anterior|custom`;
concluir/receber/estornar na **Agenda** (`appointment-finance-panel.tsx`). Comissão: só a estrutura no banco (sem UI, sem % inventado).
Testes: `npm run test:sql` (26 testes em PGlite, sem tocar o Supabase). Rollback: `supabase/rollback/…_DOWN.sql` (recusa se houver dados).
Limpeza de dados de teste: `supabase/manutencao/limpar-dados-de-teste.sql`.
- **Lição:** NUNCA entregar SQL com acento via `clip` (Windows converte UTF-8 → lixo e vai para o banco). Usar
  `Get-Content -Raw -Encoding UTF8 arq | Set-Clipboard` ou SQL só ASCII (`chr()`), e terminar o SQL com um SELECT que mostre o resultado.
- Pagamento/movimento de caixa são datados pelo momento real (não pela data do atendimento); receita pela data do atendimento.
- Pendências: UI de comissões (Fase 6), perfil `barber`, trocar a senha do admin de teste (123456), recuperar logo/fotos.

## Financeiro, etapa 2 (2026-09-26) — receita manual e resultado de caixa

Migração `20260926120000_receita_manual_e_resultado_de_caixa.sql` (rollback em `supabase/rollback/…_DOWN.sql`, recusa se houver
receita manual). **Só vale depois de aplicada no Supabase** (SQL Editor, sem acento via `clip`); o painel novo chama funções que ela cria.
- Receita manual (venda de produto/outras): `create_manual_income` (nasce `pending`, ou já `received` se vier a forma) e `receive_income`
  (gera pagamento + caixa via `fin_insert_payment`, 1 vez: `already_received` + chave `income:<id>`). Duplo clique = mesma `idempotency_key`.
  Estorno (`refund_payment`) de receita manual a **cancela**; estorno de atendimento continua não cancelando a receita.
- Resultado: **de caixa** (`received_cents − paid_cents`) é o principal; **por competência** (`result_cents`) fica ao lado, sempre rotulado.
- Filtros (categoria, situação, forma, profissional) rodam no banco em `list_financial_entries`; `report_by_category` para receitas/despesas.
- Migração aplicada no Supabase em 2026-09-26. Estorno de receita manual: botão "Estornar" na aba Receitas (`refundManualIncome`).
- Pendente: tabelas do financeiro no celular rolam para o lado (ideal: cartões); UI de comissões; perfil `barber`.
- `supabase/manutencao/limpar-dados-de-teste.sql` agora cobre receita manual (requer a migração da etapa 2).

## Papéis, barbeiro e comissões (2026-09-27)

Migração `20260927120000_papeis_barbeiro_e_comissoes.sql` (rollback `…_DOWN.sql`: recusa se houver login de barbeiro, porque
desfazer devolve as policies "qualquer autenticado = admin"). **Ordem de deploy: migração no Supabase primeiro, código depois.**
- **Papéis** vêm de `admin_profiles.role` (`owner` = admin do painel; `barber` exige `staff_id`, um login por profissional).
  Login = Supabase Auth (sem senha fixa no código). Cadastro público segue DESLIGADO.
- **RLS:** as policies antigas (clientes, agendamentos, serviços, equipe, bloqueios, galeria, configurações, transações, storage)
  eram "qualquer autenticado" e passaram a `is_owner()`. A migração tem uma trava: se sobrar policy antiga, desfaz tudo.
  Policies de leitura pública (`services`, `staff`, `gallery`) e de agendamento também valem para `authenticated`, para o site
  não quebrar com um barbeiro logado.
- **Barbeiro** não tem SELECT em tabela alguma do painel: só as funções `barber_me/agenda/summary/commissions`, que descobrem o
  profissional por `auth.uid()` (não recebem id de barbeiro). Do cliente ele vê só o primeiro nome. Rotas: `/barbeiro`, `/barbeiro/comissoes`, `/barbeiro/conta`.
  O layout de `/admin` redireciona barbeiro para `/barbeiro`; sem perfil → tela "Sem acesso".
- **Vínculo:** dono cria o usuário no Supabase (Authentication › Users) e vincula pelo e-mail em Equipe › Acesso ao painel (`link_barber`).
- **Comissão:** já nascia em `complete_appointment` (1 por item, `unique appointment_item_id`, percentual congelado, despesa `pending`).
  Sem regra cadastrada = sem comissão (nenhum % inventado). `pending` = calculada/a pagar; `paid` quando a despesa é paga (`pay_expense`).
  Não há estado "aprovada" (não foi necessário). Estorno de pagamento NÃO cancela a comissão (igual à receita de atendimento).
  Regras (`commission_rules`) em /admin/comissoes; só percentual por ora (valor fixo = coluna futura, sem mudar o resto).
- **Troca de senha:** `/admin/conta` e `/barbeiro/conta` (confirma a senha atual; mínimo 10, sem previsíveis).
- Pendente: criar service role no servidor para o dono criar logins de barbeiro sem ir ao Supabase (decisão de segurança).
