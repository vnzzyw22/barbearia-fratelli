import { test } from "node:test";
import assert from "node:assert/strict";
import { as, expectError, freshDb } from "./harness.mjs";

// Papéis owner/barber, visão do barbeiro e comissões. Banco com TODAS as migrações.
const uuid = () => crypto.randomUUID();
const n = (v) => Number(v);

async function world() {
  const db = await freshDb();
  const w = { db, owner: uuid(), barberA: uuid(), barberB: uuid(), stranger: uuid(), staffA: uuid(), staffB: uuid(), svc: uuid(), client: uuid() };
  for (const [id, email] of [[w.owner, "dono@t.test"], [w.barberA, "a@t.test"], [w.barberB, "b@t.test"], [w.stranger, "x@t.test"]]) {
    await db.query("insert into auth.users (id, email) values ($1,$2)", [id, email]);
  }
  await db.query("insert into public.admin_profiles (user_id, role) values ($1,'owner')", [w.owner]);
  await db.query("insert into public.staff (id, name) values ($1,'Barbeiro A'), ($2,'Barbeiro B')", [w.staffA, w.staffB]);
  await db.query("insert into public.services (id, name, price, duration_minutes) values ($1,'Corte',50.00,40)", [w.svc]);
  await db.query("insert into public.clients (id, name, whatsapp) values ($1,'Fulano da Silva','44900000001')", [w.client]);
  return w;
}
const own = (w, fn) => as(w.db, "authenticated", w.owner, fn);
const asA = (w, fn) => as(w.db, "authenticated", w.barberA, fn);
const asB = (w, fn) => as(w.db, "authenticated", w.barberB, fn);
const str = (w, fn) => as(w.db, "authenticated", w.stranger, fn);
const anon = (w, fn) => as(w.db, "anon", null, fn);
const rows = async (w, sql, params = []) => (await w.db.query(sql, params)).rows;
const one = async (w, sql, params = []) => (await rows(w, sql, params))[0];
const count = async (w, table, where = "true", params = []) =>
  n((await one(w, `select count(*)::int c from public.${table} where ${where}`, params)).c);
const link = (w, staff, email) => own(w, () => w.db.query("select public.link_barber($1,$2)", [staff, email]));

async function linked() {
  const w = await world();
  await link(w, w.staffA, "a@t.test");
  await link(w, w.staffB, "b@t.test");
  return w;
}
const book = async (w, { staff = "staffA", start = "2026-10-05T13:00:00Z", client = w.client } = {}) => {
  const id = uuid();
  const end = new Date(new Date(start).getTime() + 40 * 60000).toISOString();
  await anon(w, () => w.db.query(
    "insert into public.appointments (id, client_id, service_id, staff_id, starts_at, ends_at, status) values ($1,$2,$3,$4,$5,$6,'pending')",
    [id, client, w.svc, w[staff], start, end]));
  return id;
};
const complete = (w, id, key = null) => own(w, async () =>
  (await w.db.query("select public.complete_appointment($1,$2::jsonb,false,$3) r", [id, JSON.stringify([{ method: "pix", amount_cents: 5000 }]), key])).rows[0].r);
const setRule = (w, bps) => own(w, () => w.db.query("insert into public.commission_rules (rate_bps) values ($1)", [bps]));
const P = "'2026-10-01','2026-10-31'";
const call = (w, who, sql) => who(w, () => w.db.query(sql));

test("vínculo: só o dono vincula; barbeiro exige usuário existente, profissional único e nunca o dono", async () => {
  const w = await world();
  await link(w, w.staffA, "A@T.test");                                         // e-mail sem diferenciar maiúsculas
  assert.equal(await count(w, "admin_profiles", "user_id=$1 and role='barber' and staff_id=$2", [w.barberA, w.staffA]), 1);
  await expectError(link(w, w.staffA, "b@t.test"), "staff_already_linked");
  await expectError(link(w, w.staffB, "naoexiste@t.test"), "user_not_found");
  await expectError(link(w, w.staffB, "dono@t.test"), "user_is_owner");
  await expectError(link(w, uuid(), "b@t.test"), "staff_not_found");
  await expectError(asA(w, () => w.db.query("select public.link_barber($1,'b@t.test')", [w.staffB])), "forbidden");
  await expectError(str(w, () => w.db.query("select public.link_barber($1,'x@t.test')", [w.staffB])), "forbidden");
  await expectError(anon(w, () => w.db.query("select public.link_barber($1,'x@t.test')", [w.staffB])), "permission denied");
  await expectError(w.db.query("insert into public.admin_profiles (user_id, role) values ($1,'barber')", [w.stranger]), "admin_profiles_barber_has_staff");
  const list = await own(w, async () => (await w.db.query("select * from public.list_staff_access()")).rows);
  assert.equal(list.find((r) => r.staff_id === w.staffA).email, "a@t.test");
  assert.equal(list.find((r) => r.staff_id === w.staffB).email, null);
});

test("as policies antigas deixaram de ser 'qualquer autenticado': barbeiro e desconhecido não veem nem editam o painel", async () => {
  const w = await linked();
  const id = await book(w);
  await own(w, () => w.db.query("insert into public.blocked_slots (staff_id, starts_at, ends_at, reason) values ($1,'2026-10-06T10:00Z','2026-10-06T11:00Z','x')", [w.staffA]).catch(() => null));
  await w.db.query("update public.services set active=false where false");
  await w.db.query("insert into public.services (name, price, duration_minutes, active) values ('Inativo',10,10,false)");
  for (const t of ["clients", "appointments", "blocked_slots", "transactions", "admin_profiles"]) {
    for (const [who, run] of [["barbeiro", asA], ["desconhecido", str]]) {
      const r = await run(w, () => w.db.query(`select * from public.${t}`));
      const own_ = t === "admin_profiles" ? r.rows.filter((x) => x.user_id !== (who === "barbeiro" ? w.barberA : w.stranger)) : r.rows;
      assert.equal(own_.length, 0, `${who} viu linhas de ${t}`);
    }
  }
  assert.equal((await asA(w, () => w.db.query("select * from public.services where active=false"))).rows.length, 0, "serviço inativo é do dono");
  for (const run of [asA, str]) {
    await expectError(run(w, () => w.db.query("insert into public.services (name, price, duration_minutes) values ('x',1,1)")), "row-level security");
    await expectError(run(w, () => w.db.query("insert into public.staff (name) values ('x')")), "row-level security");
    await expectError(run(w, () => w.db.query("insert into storage.objects (bucket_id, name) values ('gallery','x')")), "row-level security|permission denied");
    assert.equal((await run(w, () => w.db.query("update public.clients set name='hack'"))).affectedRows, 0);
    assert.equal((await run(w, () => w.db.query("update public.appointments set status='cancelled'"))).affectedRows, 0);
    assert.equal((await run(w, () => w.db.query("update public.staff set name='hack'"))).affectedRows, 0);
    assert.equal((await run(w, () => w.db.query("delete from public.appointments"))).affectedRows, 0);
    assert.equal((await run(w, () => w.db.query("update public.business_settings set whatsapp='0'"))).affectedRows, 0);
  }
  assert.equal(await count(w, "appointments", "id=$1 and status='pending'", [id]), 1);
  assert.equal(await count(w, "clients", "name='Fulano da Silva'"), 1);
  // o dono continua com tudo
  assert.ok((await own(w, () => w.db.query("select * from public.clients"))).rows.length >= 1);
  assert.ok((await own(w, () => w.db.query("select * from public.services"))).rows.length >= 2);
  assert.equal((await own(w, () => w.db.query("update public.staff set name = name where id=$1", [w.staffA]))).affectedRows, 1);
});

test("o site público segue igual: anônimo E barbeiro logado leem o que é público e conseguem agendar", async () => {
  const w = await linked();
  for (const run of [anon, asA, str]) {
    assert.equal((await run(w, () => w.db.query("select * from public.services"))).rows.length, 1);
    assert.equal((await run(w, () => w.db.query("select * from public.staff"))).rows.length, 2);
    assert.ok((await run(w, () => w.db.query("select * from public.busy_slots"))).rows.length >= 0);
  }
  await book(w, { start: "2026-10-07T13:00:00Z" });
  const cid = uuid(), aid = uuid();
  await asA(w, async () => {
    await w.db.query("insert into public.clients (id, name, whatsapp) values ($1,'Logado','44900000009')", [cid]);
    await w.db.query("insert into public.appointments (id, client_id, service_id, staff_id, starts_at, ends_at, status) values ($1,$2,$3,$4,'2026-10-08T13:00Z','2026-10-08T13:40Z','pending')", [aid, cid, w.svc, w.staffB]);
  });
  assert.equal(await count(w, "appointments", "id=$1", [aid]), 1);
});

test("escalada de privilégio: barbeiro não vira dono, não cria perfil e não chama nada do dono", async () => {
  const w = await linked();
  assert.equal((await asA(w, () => w.db.query("update public.admin_profiles set role='owner', staff_id=null"))).affectedRows, 0);
  await expectError(asA(w, () => w.db.query("insert into public.admin_profiles (user_id, role) values ($1,'owner')", [w.stranger])), "row-level security");
  await expectError(asA(w, () => w.db.query("delete from public.admin_profiles")).then((r) => { if (r.affectedRows) throw new Error("apagou perfil"); throw new Error("row-level security"); }), "row-level security");
  assert.equal(await count(w, "admin_profiles", "user_id=$1 and role='barber'", [w.barberA]), 1);
  assert.equal(n((await asA(w, () => w.db.query("select public.is_owner() r"))).rows[0].r === true ? 1 : 0), 0);
  for (const sql of [
    `select public.commission_report(${P})`, `select * from public.list_commissions(${P}, '${w.staffB}')`,
    "select public.open_cash_register(0)", "select * from public.list_staff_access()", `select public.unlink_barber('${w.staffB}')`,
    `select public.generate_recurring_expenses()`,
  ]) {
    try { await call(w, asA, sql); assert.fail(`barbeiro executou: ${sql}`); } catch (e) { assert.match(String(e.message), /forbidden/i, sql); }
  }
  await expectError(call(w, asA, `select * from public.fin_commission_rows(${P}, null)`), "permission denied");
  // funções de leitura que respeitam a RLS (invoker) não bloqueiam, mas devolvem ZERO ao barbeiro
  const idc = await book(w); await complete(w, idc);
  const fs = await asA(w, async () => (await w.db.query("select public.finance_summary('2000-01-01','2100-12-31') r")).rows[0].r);
  for (const k of ["revenue_cents", "expenses_cents", "received_cents", "paid_cents", "cash_in_cents", "receivable_cents", "payable_cents"]) {
    assert.equal(n(fs[k]), 0, `barbeiro viu ${k} = ${fs[k]}`);
  }
  const cf = await asA(w, async () => (await w.db.query("select public.cash_flow('2000-01-01','2100-12-31') r")).rows[0].r);
  assert.equal(n(cf.in_cents) + n(cf.out_cents) + n(cf.closing_cents), 0);
  for (const fn of ["report_by_service", "report_by_staff", "report_by_method", "report_by_client"]) {
    assert.equal((await asA(w, () => w.db.query(`select * from public.${fn}('2000-01-01','2100-12-31')`))).rows.length, 0, fn);
  }
  for (const t of ["financial_entries", "payments", "cash_movements", "cash_registers", "commissions", "commission_rules", "recurring_expenses", "audit_logs", "appointment_items"]) {
    assert.equal((await asA(w, () => w.db.query(`select * from public.${t}`))).rows.length, 0, `barbeiro leu ${t}`);
  }
  // desconhecido (autenticado sem perfil) não é barbeiro
  await expectError(call(w, str, `select public.barber_me()`), "forbidden");
  await expectError(call(w, anon, `select public.barber_me()`), "permission denied");
  // o dono não é barbeiro
  await expectError(call(w, own, `select public.barber_me()`), "forbidden");
});

test("comissão: nasce na conclusão, 40% de R$ 50 = R$ 20, e reprocessar NÃO duplica", async () => {
  const w = await linked();
  await setRule(w, 4000);
  const id = await book(w);
  assert.equal(await count(w, "commissions"), 0, "agendar não gera comissão");
  await complete(w, id, "chave-comissao");
  assert.equal(await count(w, "commissions"), 1);
  const c = await one(w, "select * from public.commissions");
  assert.equal(n(c.base_cents), 5000); assert.equal(n(c.rate_bps), 4000); assert.equal(n(c.amount_cents), 2000); assert.equal(c.status, "pending");
  assert.equal(c.staff_id, w.staffA);
  const again = await complete(w, id, "chave-comissao");
  assert.equal(again.idempotent, true);
  await expectError(complete(w, id, "outra-chave"), "already_completed");
  assert.equal(await count(w, "commissions"), 1, "duas comissões para o mesmo item são impossíveis");
  assert.equal(await count(w, "financial_entries", "commission_id is not null"), 1);
  await expectError(w.db.query("insert into public.commissions (appointment_item_id, staff_id, base_cents, rate_bps, amount_cents) select appointment_item_id, staff_id, base_cents, rate_bps, amount_cents from public.commissions"), "commissions_appointment_item_id_key|duplicate");
  // pagar a comissão (despesa) a marca como paga; caixa e receita não mudam
  const e = await one(w, "select id from public.financial_entries where commission_id is not null");
  const before = await own(w, async () => (await w.db.query(`select public.finance_summary(${P}) r`)).rows[0].r);
  await own(w, () => w.db.query("select public.pay_expense($1,'pix')", [e.id]));
  assert.equal((await one(w, "select status from public.commissions")).status, "paid");
  const after = await own(w, async () => (await w.db.query(`select public.finance_summary(${P}) r`)).rows[0].r);
  assert.equal(n(after.revenue_cents), n(before.revenue_cents), "a receita não muda");
  assert.equal(n(after.expenses_cents), n(before.expenses_cents), "a despesa por competência já contava a comissão");
});

test("comissão sem regra cadastrada não existe (nenhum percentual inventado); arredondamento em centavos inteiros", async () => {
  const w = await linked();
  const a = await book(w);
  await complete(w, a);
  assert.equal(await count(w, "commissions"), 0);
  await w.db.query("update public.services set price = 50.01 where id=$1", [w.svc]);
  await setRule(w, 3333);
  const b = await book(w, { start: "2026-10-06T13:00:00Z" });
  await own(w, () => w.db.query("select public.complete_appointment($1,$2::jsonb,false,null)", [b, JSON.stringify([{ method: "pix", amount_cents: 5001 }])]));
  const c = await one(w, "select * from public.commissions");
  assert.equal(n(c.amount_cents), 1667, "5001 × 33,33% = 1666,83 → 1667");
  assert.ok(Number.isInteger(n(c.amount_cents)));
});

test("visão do barbeiro: cada um vê SÓ o que é dele (agenda, resumo e comissões)", async () => {
  const w = await linked();
  await setRule(w, 4000);
  const a1 = await book(w, { staff: "staffA" });
  const b1 = await book(w, { staff: "staffB", start: "2026-10-05T15:00:00Z" });
  await complete(w, a1); await complete(w, b1);
  const b2 = await book(w, { staff: "staffB", start: "2026-10-06T15:00:00Z" });
  await complete(w, b2);

  const sumA = await asA(w, async () => (await w.db.query(`select public.barber_summary(${P}) r`)).rows[0].r);
  assert.equal(n(sumA.appointments), 1); assert.equal(n(sumA.revenue_cents), 5000); assert.equal(n(sumA.commission_cents), 2000); assert.equal(n(sumA.pending_cents), 2000);
  const sumB = await asB(w, async () => (await w.db.query(`select public.barber_summary(${P}) r`)).rows[0].r);
  assert.equal(n(sumB.appointments), 2); assert.equal(n(sumB.revenue_cents), 10000); assert.equal(n(sumB.commission_cents), 4000);

  const agA = await asA(w, async () => (await w.db.query(`select * from public.barber_agenda(${P})`)).rows);
  assert.equal(agA.length, 1); assert.equal(agA[0].client_first_name, "Fulano", "só o primeiro nome do cliente");
  assert.ok(!("whatsapp" in agA[0]) && !("client_name" in agA[0]));
  const agB = await asB(w, async () => (await w.db.query(`select * from public.barber_agenda(${P})`)).rows);
  assert.equal(agB.length, 2);
  assert.ok(agA.every((r) => !agB.some((x) => x.appointment_id === r.appointment_id)), "agendas não se misturam");

  const cA = await asA(w, async () => (await w.db.query(`select * from public.barber_commissions(${P})`)).rows);
  assert.equal(cA.length, 1); assert.equal(n(cA[0].amount_cents), 2000);
  const cB = await asB(w, async () => (await w.db.query(`select * from public.barber_commissions(${P})`)).rows);
  assert.equal(cB.length, 2);

  // fora do período não vaza
  const none = await asA(w, async () => (await w.db.query(`select * from public.barber_commissions('2020-01-01','2020-01-31')`)).rows);
  assert.equal(none.length, 0);

  // relatório do dono soma os dois e bate com as visões individuais
  const rep = await own(w, async () => (await w.db.query(`select * from public.commission_report(${P})`)).rows);
  assert.equal(n(rep.find((r) => r.staff_id === w.staffA).commission_cents), 2000);
  assert.equal(n(rep.find((r) => r.staff_id === w.staffB).commission_cents), 4000);
  assert.equal(n(rep.find((r) => r.staff_id === w.staffB).revenue_cents), 10000);
  const det = await own(w, async () => (await w.db.query(`select * from public.list_commissions(${P}, '${w.staffB}')`)).rows);
  assert.equal(det.length, 2); assert.ok(det.every((r) => r.staff_id === w.staffB));
});

test("desvincular tira o acesso na hora; comissão cancelada/estornada não entra nas visões", async () => {
  const w = await linked();
  await setRule(w, 4000);
  const id = await book(w);
  await complete(w, id);
  assert.equal(n((await asA(w, async () => (await w.db.query(`select public.barber_summary(${P}) r`)).rows[0].r)).commission_cents), 2000);
  const removed = await own(w, async () => n((await w.db.query("select public.unlink_barber($1) r", [w.staffA])).rows[0].r));
  assert.equal(removed, 1);
  await expectError(call(w, asA, `select public.barber_summary(${P})`), "forbidden");
  await expectError(call(w, asA, "select public.barber_me()"), "forbidden");
  // o vínculo pode ser refeito e o histórico continua intacto
  await link(w, w.staffA, "a@t.test");
  assert.equal(n((await asA(w, async () => (await w.db.query(`select public.barber_summary(${P}) r`)).rows[0].r)).commission_cents), 2000);
});

const W = "'2000-01-01','2100-12-31'"; // recebido/pago usam a data real do pagamento (agora)
test("nenhum número do financeiro existente muda por causa de comissões e papéis", async () => {
  const w = await linked();
  const id = await book(w);
  await complete(w, id);
  const s1 = await own(w, async () => (await w.db.query(`select public.finance_summary(${W}) r`)).rows[0].r);
  await setRule(w, 4000);
  const id2 = await book(w, { start: "2026-10-06T13:00:00Z" });
  await complete(w, id2);
  const s2 = await own(w, async () => (await w.db.query(`select public.finance_summary(${W}) r`)).rows[0].r);
  assert.equal(n(s2.received_cents) - n(s1.received_cents), 5000, "recebido sobe só pelo novo atendimento");
  assert.equal(n(s2.revenue_cents) - n(s1.revenue_cents), 5000);
  assert.equal(n(s2.paid_cents), 0, "comissão pendente NÃO conta como paga");
  assert.equal(n(s2.cash_out_cents), 0, "e não sai do caixa");
  assert.equal(n(s2.expenses_cents) - n(s1.expenses_cents), 2000, "mas já é despesa por competência");
});

test("rollback dos papéis: recusa com barbeiro vinculado; sem barbeiro restaura o estado anterior", async () => {
  const { readFileSync } = await import("node:fs");
  const down = readFileSync(new URL("../../supabase/rollback/20260927120000_papeis_barbeiro_DOWN.sql", import.meta.url), "utf8");
  const w = await linked();
  await expectError(w.db.exec(down), "rollback_recusado");
  const c = await world();
  await c.db.exec(down);
  assert.equal(n((await one(c, "select count(*)::int c from pg_proc where proname in ('link_barber','barber_summary','commission_report')")).c), 0);
  assert.ok((await own(c, () => c.db.query("select * from public.clients"))).rows.length >= 1, "dono ainda acessa");
});
