import { test } from "node:test";
import assert from "node:assert/strict";
import { as, expectError, freshDb } from "./harness.mjs";

// Etapa 2 do financeiro: receita manual, resultado de caixa, relatório por categoria.
// Banco com TODAS as migrações (fundação + esta), para provar também que o fluxo do atendimento segue intacto.

const uuid = () => crypto.randomUUID();
const n = (v) => Number(v);

async function world() {
  const db = await freshDb();
  const w = { db, owner: uuid(), other: uuid(), client: uuid(), staff: uuid(), svc: uuid() };
  await db.query("insert into auth.users (id, email) values ($1,'dono@fratelli.test'), ($2,'outro@fratelli.test')", [w.owner, w.other]);
  await db.query("insert into public.admin_profiles (user_id, role) values ($1,'owner')", [w.owner]); // só o dono é owner
  await db.query("insert into public.staff (id, name) values ($1,'Barbeiro A')", [w.staff]);
  await db.query("insert into public.services (id, name, price, duration_minutes) values ($1,'Corte',50.00,40)", [w.svc]);
  await db.query("insert into public.clients (id, name, whatsapp) values ($1,'Cliente 1','44900000001')", [w.client]);
  return w;
}

const own = (w, fn) => as(w.db, "authenticated", w.owner, fn);
const oth = (w, fn) => as(w.db, "authenticated", w.other, fn);
const anon = (w, fn) => as(w.db, "anon", null, fn);
const rows = async (w, sql, params = []) => (await w.db.query(sql, params)).rows;
const one = async (w, sql, params = []) => (await rows(w, sql, params))[0];
const count = async (w, table, where = "true", params = []) =>
  n((await one(w, `select count(*)::int c from public.${table} where ${where}`, params)).c);
const cat = async (w, name, kind = "income") =>
  (await one(w, "select id from public.financial_categories where kind=$1 and name=$2", [kind, name])).id;

const newIncome = (w, { desc = "Pomada", cents = 4500, category = "Produtos", method = null, key = null, due = null } = {}) =>
  own(w, async () => {
    const c = await cat(w, category);
    const r = await w.db.query(
      "select public.create_manual_income($1,$2,$3,'2026-10-05',$4,null,$5,$6) r", [c, desc, cents, due, method, key]);
    return r.rows[0].r;
  });
const receive = (w, id, method) => own(w, () => w.db.query("select public.receive_income($1,$2)", [id, method]));
// pagamentos são datados por "agora"; competência das receitas de teste é out/2026 — janela larga cobre os dois
const summary = (w, from = "2000-01-01", to = "2100-12-31") =>
  own(w, async () => (await w.db.query("select public.finance_summary($1,$2) r", [from, to])).rows[0].r);

test("receita manual nasce A RECEBER: entra em contas a receber e NÃO mexe no caixa", async () => {
  const w = await world();
  const { entry_id } = await newIncome(w, { due: "2026-10-20" });
  const e = await one(w, "select status, paid_at from public.financial_entries where id=$1", [entry_id]);
  assert.equal(e.status, "pending"); assert.equal(e.paid_at, null);
  assert.equal(await count(w, "cash_movements"), 0);
  assert.equal(await count(w, "payments"), 0);
  const s = await summary(w);
  assert.equal(n(s.receivable_cents), 4500);
  assert.equal(n(s.revenue_cents), 4500, "receita por competência já reconhece");
  assert.equal(n(s.received_cents), 0, "mas ainda não foi recebida");
  assert.equal(n(s.cash_result_cents), 0);
});

test("receber: gera pagamento + caixa uma única vez; repetir NÃO duplica", async () => {
  const w = await world();
  const { entry_id } = await newIncome(w);
  await receive(w, entry_id, "pix");
  const e = await one(w, "select status, paid_at, payment_method from public.financial_entries where id=$1", [entry_id]);
  assert.equal(e.status, "received"); assert.ok(e.paid_at); assert.equal(e.payment_method, "pix");
  assert.equal(await count(w, "payments", "income_entry_id=$1", [entry_id]), 1);
  assert.equal(await count(w, "cash_movements", "source='payment'"), 1);
  await expectError(receive(w, entry_id, "pix"), "already_received");
  assert.equal(await count(w, "payments", "income_entry_id=$1", [entry_id]), 1);
  assert.equal(await count(w, "cash_movements", "source='payment'"), 1, "recebimento repetido não entra duas vezes");
  const s = await summary(w);
  assert.equal(n(s.received_cents), 4500); assert.equal(n(s.receivable_cents), 0);
  assert.equal(n(s.cash_result_cents), 4500); assert.equal(n(s.result_cents), 4500);
});

test("mesma chave de idempotência (duplo clique) cria UMA receita; já pode nascer recebida", async () => {
  const w = await world();
  const a = await newIncome(w, { key: "chave-duplo-clique", method: "pix" });
  const b = await newIncome(w, { key: "chave-duplo-clique", method: "pix" });
  assert.equal(a.entry_id, b.entry_id); assert.equal(b.idempotent, true);
  assert.equal(await count(w, "financial_entries", "kind='income'"), 1);
  assert.equal(await count(w, "payments"), 1);
  assert.equal((await one(w, "select status from public.financial_entries where id=$1", [a.entry_id])).status, "received");
});

test("dinheiro exige caixa aberto e a falha não deixa nada pela metade", async () => {
  const w = await world();
  await expectError(newIncome(w, { method: "cash" }), "cash_register_required");
  assert.equal(await count(w, "financial_entries", "kind='income'"), 0, "a receita não fica órfã");
  const { entry_id } = await newIncome(w);
  await expectError(receive(w, entry_id, "cash"), "cash_register_required");
  assert.equal((await one(w, "select status from public.financial_entries where id=$1", [entry_id])).status, "pending");
  assert.equal(await count(w, "payments"), 0);
  await own(w, () => w.db.query("select public.open_cash_register(0)"));
  await receive(w, entry_id, "cash");
  assert.equal(await count(w, "cash_movements", "method='cash' and direction='in'"), 1);
});

test("validação: descrição, valor, categoria de despesa e forma inválida são rejeitados", async () => {
  const w = await world();
  const inc = await cat(w, "Produtos");
  const exp = await cat(w, "Aluguel", "expense");
  const call = (cid, desc, cents, method = null) => own(w, () =>
    w.db.query("select public.create_manual_income($1,$2,$3,'2026-10-05',null,null,$4,null)", [cid, desc, cents, method]));
  await expectError(call(inc, "  ", 100), "description_required");
  await expectError(call(inc, "x", 0), "invalid_amount");
  await expectError(call(inc, "x", -5), "invalid_amount");
  await expectError(call(exp, "x", 100), "invalid_category");
  await expectError(call(inc, "x", 100, "bitcoin"), "invalid_payment_method");
  assert.equal(await count(w, "financial_entries", "kind='income'"), 0);
});

test("segurança: escrita direta é barrada; anônimo e não-dono não usam as funções", async () => {
  const w = await world();
  const c = await cat(w, "Produtos");
  await expectError(own(w, () => w.db.query(
    "insert into public.financial_entries (kind, category_id, description, amount_cents, competence_date, status) values ('income',$1,'x',100,'2026-10-01','pending')", [c])),
    "row-level security|manual_income_requires_finance_function");
  const { entry_id } = await newIncome(w);
  await expectError(own(w, () => w.db.query("update public.financial_entries set status='received', paid_at=now(), payment_method='pix' where id=$1", [entry_id])),
    "row-level security|received_entry_requires_finance_function");
  await expectError(oth(w, () => w.db.query("select public.create_manual_income($1,'x',100,'2026-10-05',null,null,null,null)", [c])), "forbidden");
  await expectError(oth(w, () => w.db.query("select public.receive_income($1,'pix')", [entry_id])), "forbidden");
  await expectError(anon(w, () => w.db.query("select public.create_manual_income($1,'x',100,'2026-10-05',null,null,null,null)", [c])), "permission denied");
  assert.equal((await oth(w, () => w.db.query("select * from public.financial_entries"))).rows.length, 0, "não-dono não lê nada");
  assert.equal((await anon(w, () => w.db.query("select * from public.financial_entries").catch(() => ({ rows: [] })))).rows.length, 0);
});

test("pendente pode ser cancelada; recebida é definitiva (só o estorno desfaz)", async () => {
  const w = await world();
  const a = await newIncome(w, { desc: "Cancelar" });
  await own(w, () => w.db.query("update public.financial_entries set status='cancelled' where id=$1", [a.entry_id]));
  assert.equal((await one(w, "select status from public.financial_entries where id=$1", [a.entry_id])).status, "cancelled");
  await expectError(receive(w, a.entry_id, "pix"), "entry_cancelled");
  const b = await newIncome(w, { desc: "Recebida", method: "pix" });
  const blocked = await own(w, () => w.db.query("update public.financial_entries set status='cancelled' where id=$1", [b.entry_id]));
  assert.equal(blocked.affectedRows, 0, "a RLS não deixa nem enxergar a linha recebida para editar");
  assert.equal((await one(w, "select status from public.financial_entries where id=$1", [b.entry_id])).status, "received");
  await expectError(w.db.query("delete from public.financial_entries where id=$1", [b.entry_id]), "financial_history_is_immutable");
});

test("estorno de receita manual recebida: devolve o caixa e cancela a receita; só uma vez", async () => {
  const w = await world();
  const { entry_id } = await newIncome(w, { method: "pix" });
  const p = await one(w, "select id from public.payments where income_entry_id=$1", [entry_id]);
  await own(w, () => w.db.query("select public.refund_payment($1,'cliente devolveu')", [p.id]));
  assert.equal((await one(w, "select status from public.financial_entries where id=$1", [entry_id])).status, "cancelled");
  assert.equal(await count(w, "cash_movements", "source='refund' and direction='out'"), 1);
  await expectError(own(w, () => w.db.query("select public.refund_payment($1,'de novo')", [p.id])), "payments_one_refund_per_payment|duplicate");
  const s = await summary(w);
  assert.equal(n(s.received_cents), 0, "recebido − estorno = 0");
  assert.equal(n(s.revenue_cents), 0);
});

test("resultado de CAIXA = recebido − pago; competência segue à parte; despesa pendente só entra na competência", async () => {
  const w = await world();
  await newIncome(w, { cents: 10000, method: "pix" });                       // recebida
  await newIncome(w, { cents: 3000 });                                        // a receber
  const ex = await cat(w, "Internet", "expense");
  const paid = await own(w, async () => {
    await w.db.query("insert into public.financial_entries (kind, category_id, description, amount_cents, competence_date, status) values ('expense',$1,'Internet paga',2000,'2026-10-02','pending')", [ex]);
    await w.db.query("insert into public.financial_entries (kind, category_id, description, amount_cents, competence_date, status) values ('expense',$1,'Internet a pagar',1500,'2026-10-03','pending')", [ex]);
    return (await w.db.query("select id from public.financial_entries where description='Internet paga'")).rows[0].id;
  });
  await own(w, () => w.db.query("select public.pay_expense($1,'pix')", [paid]));
  const s = await summary(w);
  assert.equal(n(s.received_cents), 10000);
  assert.equal(n(s.paid_cents), 2000);
  assert.equal(n(s.cash_result_cents), 8000, "recebido 100,00 − pago 20,00");
  assert.equal(n(s.revenue_cents), 13000); assert.equal(n(s.expenses_cents), 3500);
  assert.equal(n(s.result_cents), 9500, "competência: 130,00 − 35,00");
  assert.equal(n(s.receivable_cents), 3000); assert.equal(n(s.payable_cents), 1500);
  const outside = await summary(w, "2020-01-01", "2020-01-31");
  assert.equal(n(outside.cash_result_cents), 0, "período sem movimento não herda valores");
});

test("relatório por categoria e listagem com filtros no banco", async () => {
  const w = await world();
  await newIncome(w, { desc: "A", cents: 1000, category: "Produtos", method: "pix" });
  await newIncome(w, { desc: "B", cents: 2500, category: "Produtos" });
  await newIncome(w, { desc: "C", cents: 700, category: "Outros", method: "debit" });
  const rep = await own(w, async () => (await w.db.query("select * from public.report_by_category('2026-10-01','2026-10-31','income')")).rows);
  assert.deepEqual(rep.map((r) => [r.category_name, n(r.total_cents), n(r.entries)]), [["Produtos", 3500, 2], ["Outros", 700, 1]]);
  const list = (args) => own(w, async () =>
    (await w.db.query("select public.list_financial_entries('income','2026-10-01','2026-10-31',$1,$2,$3,null) r", args)).rows[0].r);
  const all = await list([null, null, null]);
  assert.equal(all.length, 3);
  const pix = await list([null, null, "pix"]);
  assert.deepEqual(pix.map((e) => e.description), ["A"], "filtra por forma de pagamento");
  const pend = await list([null, "pending", null]);
  assert.deepEqual(pend.map((e) => e.description), ["B"], "filtra por situação");
  const outros = await list([await cat(w, "Outros"), null, null]);
  assert.deepEqual(outros.map((e) => e.description), ["C"], "filtra por categoria");
  assert.equal(all[0].category.name.length > 0, true);
  assert.equal((await list([null, null, "credit"])).length, 0);
});

test("o fluxo do atendimento segue intacto (assinatura nova do pagamento interno) e idempotente", async () => {
  const w = await world();
  const id = uuid();
  await anon(w, () => w.db.query(
    "insert into public.appointments (id, client_id, service_id, staff_id, starts_at, ends_at, status) values ($1,$2,$3,$4,'2026-10-06T13:00:00Z','2026-10-06T13:40:00Z','pending')",
    [id, w.client, w.svc, w.staff]));
  const pay = JSON.stringify([{ method: "pix", amount_cents: 5000 }]);
  const run = () => own(w, async () => (await w.db.query("select public.complete_appointment($1,$2::jsonb,false,'chave-atendimento') r", [id, pay])).rows[0].r);
  await run();
  const again = await run();
  assert.equal(again.idempotent, true);
  assert.equal(await count(w, "financial_entries", "kind='income' and appointment_id=$1", [id]), 1);
  assert.equal(await count(w, "payments", "appointment_id=$1", [id]), 1);
  const s = await summary(w);
  assert.equal(n(s.received_cents), 5000); assert.equal(n(s.cash_result_cents), 5000);
  const rid = (await one(w, "select id from public.payments where appointment_id=$1", [id])).id;
  await own(w, () => w.db.query("select public.refund_payment($1,'teste')", [rid]));
  assert.equal((await one(w, "select status from public.financial_entries where appointment_id=$1 and kind='income'", [id])).status, "recognized",
    "estorno de atendimento continua sem cancelar a receita (comportamento da fundação)");
});

test("relatório de profissionais ignora receita manual (não vira 'sem profissional')", async () => {
  const w = await world();
  await newIncome(w, { cents: 9000, method: "pix" });
  const rep = await own(w, async () => (await w.db.query("select * from public.report_by_staff('2000-01-01','2100-12-31')")).rows);
  assert.equal(rep.length, 0);
});

test("rollback da etapa 2: recusa com receita manual e, sem ela, restaura a fundação", async () => {
  const { readFileSync } = await import("node:fs");
  const down = readFileSync(new URL("../../supabase/rollback/20260926120000_receita_manual_DOWN.sql", import.meta.url), "utf8");
  const w = await world();
  await newIncome(w, { method: "pix" });
  await expectError(w.db.exec(down), "rollback_recusado");
  const clean = await world();
  await clean.db.exec(down);
  const fn = await one(clean, "select count(*)::int c from pg_proc where proname in ('receive_income','create_manual_income','list_financial_entries','report_by_category')");
  assert.equal(n(fn.c), 0);
  const s = await own(clean, async () => (await clean.db.query("select public.finance_summary('2026-01-01','2026-12-31') r")).rows[0].r);
  assert.equal(n(s.revenue_cents), 0);
});

test("limpeza de teste remove receita manual de teste (e o pagamento dela) e preserva a real", async () => {
  const { readFileSync } = await import("node:fs");
  const w = await world();
  const t = await newIncome(w, { desc: "TESTE AUTOMATICO pomada", method: "pix" });
  const refunded = await newIncome(w, { desc: "TESTE AUTOMATICO estornada", method: "pix" });
  const pid = (await one(w, "select id from public.payments where income_entry_id=$1", [refunded.entry_id])).id;
  await own(w, () => w.db.query("select public.refund_payment($1,'teste')", [pid]));
  const real = await newIncome(w, { desc: "Venda real de pomada", method: "pix" });
  await w.db.exec(readFileSync(new URL("../../supabase/manutencao/limpar-dados-de-teste.sql", import.meta.url), "utf8"));
  assert.equal(await count(w, "financial_entries", "description like 'TESTE AUTOMATICO%'"), 0);
  assert.equal(await count(w, "payments", "income_entry_id=$1", [t.entry_id]), 0);
  assert.equal(await count(w, "financial_entries", "id=$1 and status='received'", [real.entry_id]), 1, "a receita real segue intacta");
  assert.equal(await count(w, "payments", "income_entry_id=$1", [real.entry_id]), 1);
  assert.equal(await count(w, "payments"), 1, "só o pagamento real sobra (nem estorno de teste)");
  assert.equal(await count(w, "cash_movements"), 1);
});
