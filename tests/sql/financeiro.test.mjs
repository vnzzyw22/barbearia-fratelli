import { test } from "node:test";
import assert from "node:assert/strict";
import { applyMigration, as, expectError, freshDb } from "./harness.mjs";

const MIGRATION = "20260925120000_financeiro_fundacao.sql";
const uuid = () => crypto.randomUUID();
const n = (v) => Number(v);

// Banco no estado de PRODUÇÃO (6 migrações antigas + dados) e depois a migração nova.
async function world({ migrate = true } = {}) {
  const db = await freshDb({ until: "20260910120000_staff.sql" });
  const w = { db, owner: uuid(), other: uuid(), svc: {}, staff: {}, client: uuid(), client2: uuid() };
  await db.query("insert into auth.users (id, email) values ($1, 'dono@fratelli.test')", [w.owner]);
  w.svc.corte = uuid(); w.svc.barba = uuid(); w.svc.combo = uuid();
  await db.query(
    `insert into public.services (id, name, price, duration_minutes) values
       ($1,'Corte',50.00,40), ($2,'Barba',30.00,30), ($3,'Corte e Barba',80.00,70)`,
    [w.svc.corte, w.svc.barba, w.svc.combo],
  );
  w.staff.a = uuid(); w.staff.b = uuid();
  await db.query("insert into public.staff (id, name) values ($1,'Barbeiro A'), ($2,'Barbeiro B')", [w.staff.a, w.staff.b]);
  await db.query("insert into public.clients (id, name, whatsapp) values ($1,'Cliente 1','44900000001'), ($2,'Cliente 2','44900000002')", [w.client, w.client2]);
  // agendamento que já existia ANTES da migração (para provar o backfill)
  w.oldAppt = uuid();
  await db.query(
    `insert into public.appointments (id, client_id, service_id, staff_id, starts_at, ends_at, status)
     values ($1,$2,$3,$4,'2026-09-21T12:00:00Z','2026-09-21T12:40:00Z','confirmed')`,
    [w.oldAppt, w.client, w.svc.corte, w.staff.a],
  );
  if (migrate) {
    await applyMigration(db, MIGRATION);
    await db.query("insert into auth.users (id, email) values ($1, 'outro@fratelli.test')", [w.other]); // criado DEPOIS: não é owner
  }
  return w;
}

const own = (w, fn) => as(w.db, "authenticated", w.owner, fn);
const oth = (w, fn) => as(w.db, "authenticated", w.other, fn);
const anon = (w, fn) => as(w.db, "anon", null, fn);
const rows = async (w, sql, params = []) => (await w.db.query(sql, params)).rows;
const one = async (w, sql, params = []) => (await rows(w, sql, params))[0];

// agendamento feito como o site público faz (papel anon, INSERT direto, status pending)
async function book(w, { svc = "corte", staff = "a", start = "2026-10-05T13:00:00Z", minutes = 40, client = w.client } = {}) {
  const id = uuid();
  const end = new Date(new Date(start).getTime() + minutes * 60000).toISOString();
  await anon(w, () =>
    w.db.query(
      `insert into public.appointments (id, client_id, service_id, staff_id, starts_at, ends_at, status)
       values ($1,$2,$3,$4,$5,$6,'pending')`,
      [id, client, w.svc[svc], w.staff[staff], start, end],
    ),
  );
  return id;
}
const complete = (w, id, payments, { partial = false, key = null } = {}) =>
  own(w, async () => (await w.db.query("select public.complete_appointment($1,$2::jsonb,$3,$4) as r", [id, JSON.stringify(payments), partial, key])).rows[0].r);
const openCash = (w, cents = 0) => own(w, () => w.db.query("select public.open_cash_register($1)", [cents]));
const state = async (w, id) => one(w, "select * from public.v_appointment_balances where appointment_id=$1", [id]);
const count = async (w, table, where = "true", params = []) => n((await one(w, `select count(*)::int c from public.${table} where ${where}`, params)).c);

// ───────────────────────── 0. migração / upgrade ─────────────────────────
test("migração: bootstrap do owner e backfill do agendamento antigo", async () => {
  const w = await world();
  assert.equal(await count(w, "admin_profiles", "user_id=$1 and role='owner'", [w.owner]), 1, "quem já tinha login vira owner");
  assert.equal(await count(w, "admin_profiles", "user_id=$1", [w.other]), 0, "login criado depois NÃO é owner");
  const it = await one(w, "select * from public.appointment_items where appointment_id=$1", [w.oldAppt]);
  assert.equal(it.description, "Corte");
  assert.equal(n(it.unit_price_cents), 5000, "preço do agendamento antigo congelado em centavos");
  const cats = await one(w, "select count(*)::int c from public.financial_categories");
  assert.ok(n(cats.c) >= 17);
  const map = await rows(w, "select name, (select system_key from public.financial_categories where id=financial_category_id) k from public.services order by name");
  assert.equal(map.find((r) => r.name === "Corte e Barba").k, "income_combos");
  assert.equal(map.find((r) => r.name === "Corte").k, "income_cortes");
  assert.equal(map.find((r) => r.name === "Barba").k, "income_barbas");
});

// ───────────────────────── 1. agendamento e conflito ─────────────────────
test("1) agendamento novo cria o item com o preço CONGELADO", async () => {
  const w = await world();
  const id = await book(w);
  const it = await one(w, "select * from public.appointment_items where appointment_id=$1", [id]);
  assert.equal(n(it.unit_price_cents), 5000);
  assert.equal(it.description, "Corte");
  await w.db.query("update public.services set price = 60.00 where id=$1", [w.svc.corte]); // preço de tabela muda depois
  const it2 = await one(w, "select unit_price_cents from public.appointment_items where appointment_id=$1", [id]);
  assert.equal(n(it2.unit_price_cents), 5000, "não depende retroativamente do preço atual");
});

test("2) conflito de horário é barrado pelo banco (mesmo profissional) e liberado para outro", async () => {
  const w = await world();
  await book(w);
  await expectError(book(w, { start: "2026-10-05T13:20:00Z" }), "appointments_no_overlap|exclusion");
  await book(w, { staff: "b" }); // outro barbeiro no mesmo horário: ok
});

// ───────────────────────── 3-7. atendimento, pagamento, receita ──────────
test("3/4) atendimento concluído com Pix: pagamento, receita e movimento de caixa (líquido)", async () => {
  const w = await world();
  const id = await book(w);
  const r = await complete(w, id, [{ method: "pix", amount_cents: 5000 }], { key: "k1" });
  assert.equal(r.status, "completed");
  assert.equal(n(r.outstanding_cents), 0);
  const ap = await one(w, "select status, completed_at from public.appointments where id=$1", [id]);
  assert.equal(ap.status, "completed");
  assert.ok(ap.completed_at);
  const pay = await one(w, "select * from public.payments where appointment_id=$1", [id]);
  assert.equal(pay.method, "pix"); assert.equal(n(pay.amount_cents), 5000); assert.equal(n(pay.fee_cents), 0); assert.equal(n(pay.net_cents), 5000);
  const inc = await one(w, "select e.*, c.system_key from public.financial_entries e join public.financial_categories c on c.id=e.category_id where e.appointment_id=$1 and e.kind='income'", [id]);
  assert.equal(n(inc.amount_cents), 5000); assert.equal(inc.status, "recognized"); assert.equal(inc.system_key, "income_cortes");
  assert.equal(inc.competence_date.toISOString?.().slice(0, 10) ?? String(inc.competence_date).slice(0, 10), "2026-10-05");
  const mv = await one(w, "select * from public.cash_movements where payment_id=$1", [pay.id]);
  assert.equal(mv.direction, "in"); assert.equal(n(mv.amount_cents), 5000); assert.equal(mv.cash_register_id, null, "Pix não passa pela gaveta");
});

test("5) dinheiro exige caixa aberto — e a falha não deixa NADA pela metade (atomicidade)", async () => {
  const w = await world();
  const id = await book(w);
  await expectError(complete(w, id, [{ method: "cash", amount_cents: 5000 }]), "cash_register_required");
  assert.equal((await one(w, "select status from public.appointments where id=$1", [id])).status, "pending");
  assert.equal(await count(w, "payments"), 0);
  assert.equal(await count(w, "financial_entries"), 0, "sem receita órfã");
  await openCash(w, 20000);
  await complete(w, id, [{ method: "cash", amount_cents: 5000 }]);
  const mv = await one(w, "select * from public.cash_movements where method='cash'");
  assert.ok(mv.cash_register_id, "dinheiro fica ligado ao caixa aberto");
});

test("6) pagamento dividido (Pix + dinheiro) com atendimento de 2 itens", async () => {
  const w = await world();
  const id = await book(w);
  await own(w, () => w.db.query(
    "insert into public.appointment_items (appointment_id, service_id, staff_id, description, unit_price_cents, quantity) values ($1,$2,$3,'Barba',3000,1)",
    [id, w.svc.barba, w.staff.a]));
  await openCash(w, 0);
  await expectError(complete(w, id, [{ method: "pix", amount_cents: 5000 }]), "payment_mismatch");
  const r = await complete(w, id, [{ method: "pix", amount_cents: 5000 }, { method: "cash", amount_cents: 3000 }]);
  assert.equal(n(r.total_cents), 8000); assert.equal(n(r.paid_cents), 8000); assert.equal(n(r.outstanding_cents), 0);
  assert.equal(await count(w, "payments", "appointment_id=$1", [id]), 2);
  assert.equal(await count(w, "financial_entries", "appointment_id=$1 and kind='income'", [id]), 2, "1 receita por item");
  const cats = await rows(w, "select c.system_key k, e.amount_cents a from public.financial_entries e join public.financial_categories c on c.id=e.category_id where e.appointment_id=$1 order by 1", [id]);
  assert.deepEqual(cats.map((c) => [c.k, n(c.a)]), [["income_barbas", 3000], ["income_cortes", 5000]]);
});

test("7) a receita nasce UMA vez: reconcluir, retry e duplo clique não duplicam", async () => {
  const w = await world();
  const id = await book(w);
  const first = await complete(w, id, [{ method: "pix", amount_cents: 5000 }], { key: "abc" });
  const retry = await complete(w, id, [{ method: "pix", amount_cents: 5000 }], { key: "abc" }); // mesma operação repetida
  assert.equal(retry.idempotent, true);
  assert.equal(n(first.paid_cents), n(retry.paid_cents));
  await expectError(complete(w, id, [{ method: "pix", amount_cents: 5000 }], { key: "outra" }), "already_completed");
  assert.equal(await count(w, "financial_entries", "kind='income'"), 1);
  assert.equal(await count(w, "payments"), 1);
  assert.equal(await count(w, "cash_movements"), 1);
});

test("overpayment, pagamento parcial vira conta a receber e é quitado sem duplicar", async () => {
  const w = await world();
  const id = await book(w);
  await expectError(complete(w, id, [{ method: "pix", amount_cents: 5100 }]), "overpayment");
  await complete(w, id, [{ method: "pix", amount_cents: 2000 }], { partial: true });
  assert.equal(n((await state(w, id)).outstanding_cents), 3000);
  const ar = await own(w, () => w.db.query("select * from public.v_accounts_receivable"));
  assert.equal(ar.rows.length, 1); assert.equal(n(ar.rows[0].outstanding_cents), 3000);
  await expectError(own(w, () => w.db.query("select public.record_payment($1,'pix',3100,'r1')", [id])), "overpayment");
  await own(w, () => w.db.query("select public.record_payment($1,'pix',3000,'r2')", [id]));
  await own(w, () => w.db.query("select public.record_payment($1,'pix',3000,'r2')", [id])).catch(() => {}); // mesma chave: idempotente
  assert.equal(await count(w, "payments", "appointment_id=$1", [id]), 2);
  assert.equal(n((await state(w, id)).outstanding_cents), 0);
  assert.equal((await own(w, () => w.db.query("select * from public.v_accounts_receivable"))).rows.length, 0);
});

test("18) tentativa de duplicar pagamento: mesma chave não cria segundo pagamento", async () => {
  const w = await world();
  const id = await book(w);
  await complete(w, id, [{ method: "pix", amount_cents: 1000 }], { partial: true });
  for (let i = 0; i < 3; i++) await own(w, () => w.db.query("select public.record_payment($1,'pix',500,'dup')", [id]));
  assert.equal(await count(w, "payments", "appointment_id=$1", [id]), 2, "1 do atendimento + 1 recebimento (3 repetições = 1)");
  assert.equal(n((await state(w, id)).paid_cents), 1500);
});

// ───────────────────────── 8-9. despesas ─────────────────────────────────
const cat = async (w, name, kind = "expense") => (await one(w, "select id from public.financial_categories where kind=$1 and name=$2", [kind, name])).id;
const newExpense = async (w, { desc = "Aluguel", cents = 200000, category = "Aluguel", due = "2026-10-30" } = {}) => {
  const id = uuid(); const c = await cat(w, category);
  await own(w, () => w.db.query(
    "insert into public.financial_entries (id, kind, category_id, description, amount_cents, competence_date, due_on, status) values ($1,'expense',$2,$3,$4,'2026-10-01',$5,'pending')",
    [id, c, desc, cents, due]));
  return id;
};

test("9) despesa pendente é conta a pagar e NÃO reduz o caixa; 8) paga reduz uma única vez", async () => {
  const w = await world();
  const id = await newExpense(w);
  const ap = await own(w, () => w.db.query("select * from public.v_accounts_payable"));
  assert.equal(ap.rows.length, 1); assert.equal(n(ap.rows[0].amount_cents), 200000);
  const cf = await own(w, async () => (await w.db.query("select public.cash_flow('2026-01-01','2026-12-31') r")).rows[0].r);
  assert.equal(n(cf.out_cents), 0, "obrigação futura não sai do caixa");
  await own(w, () => w.db.query("select public.pay_expense($1,'pix')", [id]));
  const e = await one(w, "select status, paid_at, payment_method from public.financial_entries where id=$1", [id]);
  assert.equal(e.status, "paid"); assert.ok(e.paid_at); assert.equal(e.payment_method, "pix");
  assert.equal(await count(w, "cash_movements", "entry_id=$1 and direction='out'", [id]), 1);
  await expectError(own(w, () => w.db.query("select public.pay_expense($1,'pix')", [id])), "already_paid");
  assert.equal(await count(w, "cash_movements", "entry_id=$1", [id]), 1, "pagar duas vezes não sai duas vezes");
  const sum = await own(w, async () => (await w.db.query("select public.finance_summary('2026-01-01','2026-12-31') r")).rows[0].r);
  assert.equal(n(sum.expenses_cents), 200000); assert.equal(n(sum.payable_cents), 0);
});

test("despesa: lançamento 'pago' direto é bloqueado; categoria de outro tipo é rejeitada; despesa recorrente é idempotente", async () => {
  const w = await world();
  const c = await cat(w, "Aluguel");
  await expectError(own(w, () => w.db.query(
    "insert into public.financial_entries (kind, category_id, description, amount_cents, competence_date, status, paid_at) values ('expense',$1,'x',100,'2026-10-01','paid',now())", [c])),
    "row-level security|paid_entry_requires_finance_function");
  const incCat = await cat(w, "Cortes", "income");
  await expectError(own(w, () => w.db.query(
    "insert into public.financial_entries (kind, category_id, description, amount_cents, competence_date, status) values ('expense',$1,'x',100,'2026-10-01','pending')",
    [incCat])), "category_kind_mismatch");
  const rid = uuid();
  const netCat = await cat(w, "Internet");
  await own(w, () => w.db.query("insert into public.recurring_expenses (id, description, category_id, amount_cents, day_of_month, starts_on) values ($1,'Internet',$2,12000,28,'2026-01-01')", [rid, netCat]));
  const g1 = await own(w, async () => n((await w.db.query("select public.generate_recurring_expenses('2026-10-15') r")).rows[0].r));
  const g2 = await own(w, async () => n((await w.db.query("select public.generate_recurring_expenses('2026-10-20') r")).rows[0].r));
  assert.equal(g1, 1); assert.equal(g2, 0, "gerar de novo não duplica");
  const e = await one(w, "select * from public.financial_entries where recurring_expense_id=$1", [rid]);
  assert.equal(String(e.due_on.toISOString?.().slice(0, 10) ?? e.due_on).slice(0, 10), "2026-10-28");
  assert.equal(e.status, "pending");
});

// ───────────────────────── 10-14. caixa ──────────────────────────────────
test("12) abertura de caixa: só um aberto por vez", async () => {
  const w = await world();
  await openCash(w, 20000);
  await expectError(openCash(w, 0), "cash_register_already_open");
  assert.equal(await count(w, "cash_registers", "status='open'"), 1);
});

test("10/11) entrada e saída manual de caixa exigem descrição e caixa aberto", async () => {
  const w = await world();
  await expectError(own(w, () => w.db.query("select public.add_cash_movement('in',5000,'Suprimento')")), "cash_register_required");
  await openCash(w, 0);
  await own(w, () => w.db.query("select public.add_cash_movement('in',10000,'Suprimento')"));
  await own(w, () => w.db.query("select public.add_cash_movement('out',2000,'Sangria')"));
  await expectError(own(w, () => w.db.query("select public.add_cash_movement('out',100,'  ')")), "cash_movements_manual_needs_description");
  await expectError(own(w, () => w.db.query("select public.add_cash_movement('out',0,'x')")), "invalid_amount");
  assert.equal(await count(w, "cash_movements", "source='manual'"), 2);
});

test("13/14) fechamento de caixa: esperado × contado × diferença (só dinheiro físico)", async () => {
  const w = await world();
  await openCash(w, 20000);
  const a1 = await book(w);
  await complete(w, a1, [{ method: "cash", amount_cents: 5000 }]);                    // +50,00 dinheiro
  const a2 = await book(w, { start: "2026-10-05T15:00:00Z" });
  await complete(w, a2, [{ method: "pix", amount_cents: 5000 }]);                     // Pix: não entra na gaveta
  const ex = await newExpense(w, { desc: "Café", cents: 1000, category: "Outros" });
  await own(w, () => w.db.query("select public.pay_expense($1,'cash')", [ex]));       // -10,00 dinheiro
  const r = await own(w, async () => (await w.db.query("select public.close_cash_register(23500,'conferido') r")).rows[0].r);
  assert.equal(n(r.opening_cents), 20000); assert.equal(n(r.cash_in_cents), 5000); assert.equal(n(r.cash_out_cents), 1000);
  assert.equal(n(r.expected_cents), 24000);
  assert.equal(n(r.counted_cents), 23500);
  assert.equal(n(r.difference_cents), -500, "faltaram R$ 5,00");
  const reg = await one(w, "select * from public.cash_registers order by opened_at desc limit 1");
  assert.equal(reg.status, "closed"); assert.equal(n(reg.difference_cents), -500);
  await expectError(own(w, () => w.db.query("select public.close_cash_register(0)")), "no_open_cash_register");
  const a3 = await book(w, { start: "2026-10-06T13:00:00Z" });
  await expectError(complete(w, a3, [{ method: "cash", amount_cents: 5000 }]), "cash_register_required"); // caixa fechado não recebe dinheiro
});

// ───────────────────────── 15. comissão ──────────────────────────────────
test("15) comissão: só existe se o dono configurou; receita − comissão = resultado", async () => {
  const w = await world();
  const sem = await book(w);
  await complete(w, sem, [{ method: "pix", amount_cents: 5000 }]);
  assert.equal(await count(w, "commissions"), 0, "sem regra, nenhuma comissão é inventada");

  await own(w, () => w.db.query("insert into public.commission_rules (staff_id, rate_bps) values ($1, 4000)", [w.staff.a]));
  const id = await book(w, { start: "2026-10-05T15:00:00Z" });
  await complete(w, id, [{ method: "pix", amount_cents: 5000 }]);
  const cm = await one(w, "select * from public.commissions");
  assert.equal(n(cm.base_cents), 5000); assert.equal(n(cm.rate_bps), 4000); assert.equal(n(cm.amount_cents), 2000);
  const ce = await one(w, "select e.*, c.system_key from public.financial_entries e join public.financial_categories c on c.id=e.category_id where e.commission_id=$1", [cm.id]);
  assert.equal(ce.system_key, "expense_commissions"); assert.equal(ce.status, "pending"); assert.equal(n(ce.amount_cents), 2000);
  const sum = await own(w, async () => (await w.db.query("select public.finance_summary('2026-01-01','2026-12-31') r")).rows[0].r);
  assert.equal(n(sum.revenue_cents), 10000); assert.equal(n(sum.expenses_cents), 2000); assert.equal(n(sum.result_cents), 8000);
  await own(w, () => w.db.query("select public.pay_expense($1,'pix')", [ce.id]));
  assert.equal((await one(w, "select status from public.commissions where id=$1", [cm.id])).status, "paid");
});

// ───────────────────────── 16. cancelamento / falta ──────────────────────
test("16) cancelamento libera o horário; concluído não cancela; falta não conclui", async () => {
  const w = await world();
  const a = await book(w);
  await own(w, () => w.db.query("update public.appointments set status='cancelled', cancel_reason='cliente avisou' where id=$1", [a]));
  const c = await one(w, "select cancelled_at, cancel_reason from public.appointments where id=$1", [a]);
  assert.ok(c.cancelled_at); assert.equal(c.cancel_reason, "cliente avisou");
  await book(w); // mesmo horário agora livre
  const b = await book(w, { start: "2026-10-05T15:00:00Z" });
  await complete(w, b, [{ method: "pix", amount_cents: 5000 }]);
  await expectError(own(w, () => w.db.query("update public.appointments set status='cancelled' where id=$1", [b])), "completed_appointment_is_immutable");
  const ns = await book(w, { start: "2026-10-05T17:00:00Z" });
  await own(w, () => w.db.query("update public.appointments set status='no_show' where id=$1", [ns]));
  await expectError(complete(w, ns, [{ method: "pix", amount_cents: 5000 }]), "invalid_status");
});

test("atendimento só conclui pela função; concluído é imutável; ninguém apaga histórico", async () => {
  const w = await world();
  const id = await book(w);
  await expectError(own(w, () => w.db.query("update public.appointments set status='completed' where id=$1", [id])), "complete_appointment_required");
  await complete(w, id, [{ method: "pix", amount_cents: 5000 }]);
  await expectError(own(w, () => w.db.query("update public.appointments set starts_at = starts_at + interval '1 hour', ends_at = ends_at + interval '1 hour' where id=$1", [id])), "completed_appointment_is_immutable");
  await expectError(w.db.query("delete from public.payments"), "financial_history_is_immutable");
  await expectError(w.db.query("delete from public.financial_entries"), "financial_history_is_immutable");
  await expectError(w.db.query("delete from public.cash_movements"), "financial_history_is_immutable");
  await expectError(w.db.query("update public.payments set amount_cents = 1"), "financial_history_is_immutable");
  await expectError(w.db.query("update public.cash_movements set amount_cents = 1"), "financial_history_is_immutable");
  await expectError(w.db.query("delete from public.audit_logs"), "financial_history_is_immutable");
  await expectError(w.db.query("update public.audit_logs set entity = 'x'"), "financial_history_is_immutable");
});

// ───────────────────────── 17. segurança ─────────────────────────────────
test("17) anônimo NÃO acessa nada financeiro; usuário logado que não é owner também não", async () => {
  const w = await world();
  const id = await book(w);
  await openCash(w, 1000);
  await complete(w, id, [{ method: "cash", amount_cents: 5000 }]);
  await newExpense(w);
  const tables = ["payments", "financial_entries", "cash_movements", "cash_registers", "commissions", "audit_logs", "appointment_items", "financial_categories", "payment_methods", "recurring_expenses", "commission_rules", "admin_profiles"];
  for (const t of tables) {
    for (const [who, run] of [["anon", anon], ["não-owner", oth]]) {
      const r = await run(w, () => w.db.query(`select * from public.${t}`));
      assert.equal(r.rows.length, 0, `${who} viu linhas de ${t}`);
    }
  }
  await expectError(anon(w, () => w.db.query("select public.complete_appointment($1,'[]',true,null)", [id])), "permission denied");
  await expectError(anon(w, () => w.db.query("select public.finance_summary('2026-10-01','2026-10-31')")), "permission denied");
  await expectError(anon(w, () => w.db.query("select public.is_owner()")), "permission denied");
  await expectError(oth(w, () => w.db.query("select public.finance_summary('2026-10-01','2026-10-31')")).then(() => oth(w, () => w.db.query("select public.open_cash_register(0)"))), "forbidden");
  for (const fn of ["select public.open_cash_register(0)", "select public.add_cash_movement('in',100,'x')", "select public.generate_recurring_expenses()"]) {
    await expectError(oth(w, () => w.db.query(fn)), "forbidden");
  }
  await expectError(oth(w, () => w.db.query("select public.complete_appointment($1,'[]',true,null)", [id])), "forbidden");
  const anyCat = await cat(w, "Aluguel");
  await expectError(anon(w, () => w.db.query("insert into public.financial_entries (kind, category_id, description, amount_cents, competence_date, status) values ('expense',$1,'x',1,now(),'pending')", [anyCat])), "permission denied|row-level security|category_kind_mismatch");
  await expectError(oth(w, () => w.db.query("insert into public.appointment_items (appointment_id, description, unit_price_cents) values ($1,'x',1)", [id])), "row-level security|immutable");
  // o site público continua funcionando para anon: agenda + lê a view de ocupados
  await book(w, { start: "2026-10-07T13:00:00Z" });
  const busy = await anon(w, () => w.db.query("select * from public.busy_slots"));
  assert.ok(busy.rows.length >= 2);
});

// ───────────────────────── 19. auditoria ─────────────────────────────────
test("19) alteração de valor gera auditoria (quem, quando, antes, depois)", async () => {
  const w = await world();
  const id = await book(w);
  const item = await one(w, "select id from public.appointment_items where appointment_id=$1", [id]);
  await own(w, () => w.db.query("update public.appointment_items set unit_price_cents = 4500 where id=$1", [item.id]));
  const log = await one(w, "select * from public.audit_logs where entity='appointment_items' and action='UPDATE' and entity_id=$1", [item.id]);
  assert.equal(n(log.old_data.unit_price_cents), 5000); assert.equal(n(log.new_data.unit_price_cents), 4500);
  assert.equal(log.actor, w.owner); assert.equal(log.actor_email, "dono@fratelli.test"); assert.ok(log.at);
  await complete(w, id, [{ method: "pix", amount_cents: 4500 }]);
  await expectError(own(w, () => w.db.query("update public.appointment_items set unit_price_cents = 1 where id=$1", [item.id])), "completed_appointment_items_are_immutable");
  const inc = await one(w, "select id from public.financial_entries where kind='income'");
  await expectError(w.db.query("update public.financial_entries set amount_cents = 1 where id=$1", [inc.id]), "income_amount_is_immutable");
  const ex = await newExpense(w, { cents: 1000 });
  await own(w, () => w.db.query("update public.financial_entries set amount_cents = 1200 where id=$1", [ex])); // pendente: editável, e auditado
  assert.equal(await count(w, "audit_logs", "entity='financial_entries' and entity_id=$1 and action='UPDATE'", [ex]), 1);
  await own(w, () => w.db.query("select public.pay_expense($1,'pix')", [ex]));
  await expectError(w.db.query("update public.financial_entries set amount_cents = 1 where id=$1", [ex]), "paid_entry_is_immutable");
  assert.ok((await count(w, "audit_logs", "entity='payments'")) >= 1, "pagamentos também são auditados");
});

// ───────────────────────── estorno, taxa, fuso, relatórios ───────────────
test("estorno: registra saída, exige motivo e só uma vez por pagamento", async () => {
  const w = await world();
  const id = await book(w);
  await complete(w, id, [{ method: "pix", amount_cents: 5000 }]);
  const p = await one(w, "select id from public.payments where kind='payment'");
  await expectError(own(w, () => w.db.query("select public.refund_payment($1,'')", [p.id])), "reason_required");
  await own(w, () => w.db.query("select public.refund_payment($1,'cobrado em duplicidade')", [p.id]));
  await expectError(own(w, () => w.db.query("select public.refund_payment($1,'de novo')", [p.id])), "unique|duplicate|payments_one_refund");
  assert.equal(n((await state(w, id)).outstanding_cents), 5000, "voltou a dever");
  const out = await one(w, "select amount_cents, direction from public.cash_movements where source='refund'");
  assert.equal(out.direction, "out"); assert.equal(n(out.amount_cents), 5000);
  await expectError(own(w, () => w.db.query("update public.appointments set status='cancelled' where id=$1", [id])), "completed_appointment_is_immutable");
});

test("taxa de cartão: bruto × taxa × líquido separados; caixa recebe o líquido; taxa vira custo", async () => {
  const w = await world();
  await own(w, () => w.db.query("update public.payment_methods set fee_bps = 300 where code='credit'"));
  const id = await book(w, { svc: "combo", minutes: 70 });
  await own(w, () => w.db.query("update public.appointment_items set unit_price_cents = 10000 where appointment_id=$1", [id]));
  await complete(w, id, [{ method: "credit", amount_cents: 10000 }]);
  const p = await one(w, "select * from public.payments");
  assert.equal(n(p.amount_cents), 10000); assert.equal(n(p.fee_cents), 300); assert.equal(n(p.net_cents), 9700);
  assert.equal(n((await one(w, "select amount_cents from public.cash_movements where direction='in'")).amount_cents), 9700);
  const fee = await one(w, "select e.amount_cents, e.status, c.system_key from public.financial_entries e join public.financial_categories c on c.id=e.category_id where e.kind='expense'");
  assert.equal(n(fee.amount_cents), 300); assert.equal(fee.system_key, "expense_fees"); assert.equal(fee.status, "paid");
  const sum = await own(w, async () => (await w.db.query("select public.finance_summary('2026-01-01','2026-12-31') r")).rows[0].r);
  assert.equal(n(sum.revenue_cents), 10000); assert.equal(n(sum.expenses_cents), 300); assert.equal(n(sum.result_cents), 9700);
  assert.equal(n(sum.cash_in_cents), 9700, "receita ≠ líquido ≠ caixa: cada um no seu campo");
});

test("fuso: atendimento às 23:30 de São Paulo cai no dia certo (competência local, não UTC)", async () => {
  const w = await world();
  const id = await book(w, { start: "2026-10-06T02:30:00Z" }); // 05/10 23:30 em SP
  await complete(w, id, [{ method: "pix", amount_cents: 5000 }]);
  const e = await one(w, "select competence_date::text d from public.financial_entries where kind='income'");
  assert.equal(e.d, "2026-10-05");
});

test("relatórios: serviços, barbeiros, formas de pagamento, clientes e fluxo de caixa", async () => {
  const w = await world();
  await openCash(w, 10000);
  const a = await book(w);                                                    // Corte — Barbeiro A — Cliente 1 — Pix
  await complete(w, a, [{ method: "pix", amount_cents: 5000 }]);
  const b = await book(w, { svc: "barba", staff: "b", start: "2026-10-05T15:00:00Z", minutes: 30, client: w.client2 }); // Barba — B — Cliente 2 — dinheiro
  await complete(w, b, [{ method: "cash", amount_cents: 3000 }]);
  const c = await book(w, { start: "2026-10-06T13:00:00Z" });                 // Corte de novo — Cliente 1
  await complete(w, c, [{ method: "pix", amount_cents: 5000 }]);
  const R = (fn) => own(w, async () => (await w.db.query(`select * from public.${fn}('2026-01-01','2026-12-31')`)).rows);

  const svc = await R("report_by_service");
  assert.deepEqual(svc.map((r) => [r.service_name, n(r.quantity), n(r.revenue_cents), n(r.avg_ticket_cents)]), [["Corte", 2, 10000, 5000], ["Barba", 1, 3000, 3000]]);
  const stf = await R("report_by_staff");
  assert.deepEqual(stf.map((r) => [r.staff_name, n(r.appointments), n(r.revenue_cents), n(r.avg_ticket_cents)]), [["Barbeiro A", 2, 10000, 5000], ["Barbeiro B", 1, 3000, 3000]]);
  const mth = await R("report_by_method");
  assert.deepEqual(mth.map((r) => [r.method, n(r.payments), n(r.gross_cents)]), [["pix", 2, 10000], ["cash", 1, 3000]]);
  const cli = await R("report_by_client");
  const c1 = cli.find((r) => r.client_name === "Cliente 1");
  assert.equal(n(c1.visits), 2); assert.equal(n(c1.revenue_cents), 10000); assert.equal(c1.is_returning, true);
  assert.equal(cli.find((r) => r.client_name === "Cliente 2").is_returning, false);

  const cf = await own(w, async () => (await w.db.query("select public.cash_flow('2026-01-01','2026-12-31') r")).rows[0].r);
  assert.equal(n(cf.opening_cents), 0); assert.equal(n(cf.in_cents), 13000); assert.equal(n(cf.out_cents), 0);
  assert.equal(n(cf.closing_cents), 13000, "saldo final = inicial + entradas − saídas");
  const sum = await own(w, async () => (await w.db.query("select public.finance_summary('2026-01-01','2026-12-31') r")).rows[0].r);
  assert.equal(n(sum.appointments_completed), 3); assert.equal(n(sum.revenue_cents), 13000);
});

test("apagar agendamento não concluído leva os itens; concluído/pago continua protegido", async () => {
  const w = await world();
  await applyMigration(w.db, "20260925130000_items_cascade.sql");
  const a = await book(w);
  await w.db.query("delete from public.appointments where id=$1", [a]);
  assert.equal(await count(w, "appointment_items", "appointment_id=$1", [a]), 0);
  const b = await book(w, { start: "2026-10-05T15:00:00Z" });
  await complete(w, b, [{ method: "pix", amount_cents: 5000 }]);
  await expectError(w.db.query("delete from public.appointments where id=$1", [b]), "immutable|foreign key|violates");
  assert.equal(await count(w, "appointments", "id=$1", [b]), 1);
});

test("correção de acentos: conserta nomes corrompidos e o texto da comissão, e é idempotente", async () => {
  const w = await world();
  // simula o estrago do `clip` (UTF-8 lido como CP437)
  await w.db.query("update public.financial_categories set name = 'mojibake_' || display_order where kind='expense' and display_order in (3,5,9)");
  await w.db.query("update public.financial_categories set name = 'mojibake2' where system_key = 'expense_commissions'");
  await w.db.query("update public.payment_methods set name = 'mojibake_' || code where code in ('debit','credit')");
  await applyMigration(w.db, "20260925130000_items_cascade.sql");
  await applyMigration(w.db, "20260925140000_fix_acentos.sql");
  await applyMigration(w.db, "20260925140000_fix_acentos.sql"); // idempotente
  const names = (await rows(w, "select name from public.financial_categories where kind='expense' order by display_order")).map((r) => r.name);
  assert.deepEqual(names.slice(0, 13), ["Aluguel", "Energia", "Água", "Internet", "Salários", "Impostos", "Produtos", "Equipamentos", "Manutenção", "Marketing", "Comissões", "Taxas", "Outros"]);
  const methods = (await rows(w, "select name from public.payment_methods order by display_order")).map((r) => r.name);
  assert.deepEqual(methods, ["Pix", "Dinheiro", "Débito", "Crédito", "Outro"]);
  // a função continua funcionando e gera o texto certo
  await own(w, () => w.db.query("insert into public.commission_rules (staff_id, rate_bps) values ($1, 1000)", [w.staff.a]));
  const id = await book(w);
  await complete(w, id, [{ method: "pix", amount_cents: 5000 }]);
  const e = await one(w, "select description from public.financial_entries where commission_id is not null");
  assert.equal(e.description, "Comissão — Corte");
});

test("limpeza de teste: remove só o rastro dos testes e preserva dados reais", async () => {
  const { readFileSync } = await import("node:fs");
  const w = await world();
  // dado "real" que NÃO pode ser tocado: um atendimento concluído de cliente real
  const real = await book(w, { start: "2026-10-01T13:00:00Z", client: w.client });
  await complete(w, real, [{ method: "pix", amount_cents: 5000 }]);
  // rastro de teste completo
  await w.db.query("update public.clients set name = 'TESTE AUTOMATICO x' where id = $1", [w.client2]);
  await openCash(w, 5000);
  const t1 = await book(w, { start: "2026-10-05T13:00:00Z", client: w.client2 });
  await w.db.query("update public.appointments set notes = 'TESTE AUTOMATICO n' where id = $1", [t1]);
  await complete(w, t1, [{ method: "cash", amount_cents: 5000 }]);
  const p = await one(w, "select id from public.payments where appointment_id = $1", [t1]);
  await own(w, () => w.db.query("select public.refund_payment($1,'teste')", [p.id]));
  await own(w, () => w.db.query("select public.add_cash_movement('in',1000,'TESTE suprimento')"));
  const ex = await newExpense(w, { desc: "TESTE AUTOMATICO aluguel", cents: 1000 });
  await own(w, () => w.db.query("select public.pay_expense($1,'cash')", [ex]));
  await own(w, () => w.db.query("select public.close_cash_register(0)"));

  await w.db.exec(readFileSync(new URL("../../supabase/manutencao/limpar-dados-de-teste.sql", import.meta.url), "utf8"));

  assert.equal(await count(w, "appointments", "notes like 'TESTE AUTOMATICO%'"), 0);
  assert.equal(await count(w, "clients", "name like 'TESTE AUTOMATICO%'"), 0);
  assert.equal(await count(w, "financial_entries", "description like 'TESTE AUTOMATICO%'"), 0);
  assert.equal(await count(w, "cash_registers"), 0);
  assert.equal(await count(w, "cash_movements", "source in ('manual','refund','expense')"), 0);
  assert.equal(await count(w, "payments", "appointment_id = $1", [t1]), 0);
  // o real continua intacto: 1 atendimento concluído, 1 pagamento, 1 receita, 1 movimento
  assert.equal(await count(w, "appointments", "id = $1 and status = 'completed'", [real]), 1);
  assert.equal(await count(w, "payments"), 1);
  assert.equal(await count(w, "financial_entries", "kind = 'income'"), 1);
  assert.equal(await count(w, "cash_movements"), 1);
  // e os gatilhos voltam a proteger o histórico depois da limpeza
  await expectError(w.db.query("delete from public.payments"), "financial_history_is_immutable");
});
