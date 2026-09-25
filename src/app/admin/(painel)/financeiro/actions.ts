"use server";

import { revalidatePath } from "next/cache";
import { financeErrorMessage } from "@/lib/finance/errors";
import { createClient } from "@/lib/supabase/server";
import type { PaymentMethodCode } from "@/lib/supabase/finance-types";

// Todas as operações de dinheiro passam por funções do banco (atômicas, idempotentes, só do dono).
// Aqui só validamos formato, chamamos e traduzimos o erro. O saldo/receita NUNCA é calculado no cliente.

type Result<T = undefined> =
  | ({ ok: true } & (T extends undefined ? object : { data: T }))
  | { ok: false; error: string };

const METHODS: PaymentMethodCode[] = ["pix", "cash", "debit", "credit", "other"];
const isCents = (n: unknown): n is number => Number.isInteger(n) && (n as number) > 0;
const isMethod = (m: unknown): m is PaymentMethodCode => METHODS.includes(m as PaymentMethodCode);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function refresh() {
  revalidatePath("/admin/financeiro");
  revalidatePath("/admin/agenda");
  revalidatePath("/admin");
}

function fail(error: { message: string } | null | undefined, context: string) {
  console.error(`Erro financeiro (${context}):`, error?.message);
  return { ok: false as const, error: financeErrorMessage(error?.message) };
}

// ── Atendimento ─────────────────────────────────────────────────────────────

export interface CompleteInput {
  appointmentId: string;
  payments: { method: string; amountCents: number }[];
  allowPartial: boolean;
  idempotencyKey: string;
}

export async function completeAppointment(input: CompleteInput): Promise<Result> {
  if (!input.idempotencyKey || input.idempotencyKey.length < 8) {
    return { ok: false, error: "Requisição inválida. Recarregue a página." };
  }
  if (!input.payments.every((p) => isMethod(p.method) && isCents(p.amountCents))) {
    return { ok: false, error: "Confira as formas de pagamento e os valores." };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("complete_appointment", {
    p_appointment_id: input.appointmentId,
    p_payments: input.payments.map((p) => ({ method: p.method, amount_cents: p.amountCents })),
    p_allow_partial: input.allowPartial,
    p_idempotency_key: input.idempotencyKey,
  });
  if (error) return fail(error, "complete_appointment");
  refresh();
  return { ok: true };
}

export async function addServiceItem(appointmentId: string, serviceId: string): Promise<Result> {
  const supabase = await createClient();
  const [{ data: service }, { data: appt }] = await Promise.all([
    supabase.from("services").select("id, name, price").eq("id", serviceId).maybeSingle(),
    supabase.from("appointments").select("staff_id").eq("id", appointmentId).maybeSingle(),
  ]);
  if (!service || !appt) return { ok: false, error: "Serviço ou atendimento não encontrado." };
  const { error } = await supabase.from("appointment_items").insert({
    appointment_id: appointmentId,
    service_id: service.id,
    staff_id: appt.staff_id,
    description: service.name,
    unit_price_cents: Math.round(Number(service.price) * 100),
    quantity: 1,
  });
  if (error) return fail(error, "add_item");
  refresh();
  return { ok: true };
}

export async function addCustomItem(
  appointmentId: string,
  description: string,
  priceCents: number,
): Promise<Result> {
  if (!description.trim()) return { ok: false, error: "Informe a descrição do item." };
  if (!isCents(priceCents)) return { ok: false, error: "Informe um valor válido." };
  const supabase = await createClient();
  const { data: appt } = await supabase
    .from("appointments")
    .select("staff_id")
    .eq("id", appointmentId)
    .maybeSingle();
  const { error } = await supabase.from("appointment_items").insert({
    appointment_id: appointmentId,
    staff_id: appt?.staff_id ?? null,
    description: description.trim(),
    unit_price_cents: priceCents,
    quantity: 1,
  });
  if (error) return fail(error, "add_custom_item");
  refresh();
  return { ok: true };
}

// Mudança de valor de item (antes de concluir). O banco registra quem/quando/antes/depois na auditoria.
export async function updateItemPrice(itemId: string, priceCents: number): Promise<Result> {
  if (!Number.isInteger(priceCents) || priceCents < 0) {
    return { ok: false, error: "Informe um valor válido." };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("appointment_items")
    .update({ unit_price_cents: priceCents })
    .eq("id", itemId);
  if (error) return fail(error, "update_item");
  refresh();
  return { ok: true };
}

export async function removeItem(itemId: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from("appointment_items").delete().eq("id", itemId);
  if (error) return fail(error, "remove_item");
  refresh();
  return { ok: true };
}

// ── Pagamentos ──────────────────────────────────────────────────────────────

export async function recordPayment(input: {
  appointmentId: string;
  method: string;
  amountCents: number;
  idempotencyKey: string;
}): Promise<Result> {
  if (!isMethod(input.method) || !isCents(input.amountCents) || input.idempotencyKey.length < 8) {
    return { ok: false, error: "Confira a forma de pagamento e o valor." };
  }
  const supabase = await createClient();
  const { error } = await supabase.rpc("record_payment", {
    p_appointment_id: input.appointmentId,
    p_method: input.method,
    p_amount_cents: input.amountCents,
    p_idempotency_key: input.idempotencyKey,
  });
  if (error) return fail(error, "record_payment");
  refresh();
  return { ok: true };
}

export async function refundPayment(paymentId: string, reason: string): Promise<Result> {
  if (!reason.trim()) return { ok: false, error: "Informe o motivo do estorno." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("refund_payment", { p_payment_id: paymentId, p_reason: reason.trim() });
  if (error) return fail(error, "refund_payment");
  refresh();
  return { ok: true };
}

// ── Caixa ───────────────────────────────────────────────────────────────────

export async function openCashRegister(openingCents: number): Promise<Result> {
  if (!Number.isInteger(openingCents) || openingCents < 0) return { ok: false, error: "Saldo inicial inválido." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("open_cash_register", { p_opening_balance_cents: openingCents });
  if (error) return fail(error, "open_cash");
  refresh();
  return { ok: true };
}

export async function closeCashRegister(countedCents: number, notes: string): Promise<Result<{ differenceCents: number; expectedCents: number }>> {
  if (!Number.isInteger(countedCents) || countedCents < 0) return { ok: false, error: "Valor contado inválido." };
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("close_cash_register", {
    p_counted_cents: countedCents,
    p_notes: notes.trim() || null,
  });
  if (error) return fail(error, "close_cash");
  refresh();
  return {
    ok: true,
    data: {
      differenceCents: Number(data?.difference_cents ?? 0),
      expectedCents: Number(data?.expected_cents ?? 0),
    },
  };
}

export async function addCashMovement(input: {
  direction: "in" | "out";
  amountCents: number;
  description: string;
  kind: "manual" | "adjustment";
}): Promise<Result> {
  if (!isCents(input.amountCents)) return { ok: false, error: "Informe um valor válido." };
  if (!input.description.trim()) return { ok: false, error: "Informe a descrição." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("add_cash_movement", {
    p_direction: input.direction,
    p_amount_cents: input.amountCents,
    p_description: input.description.trim(),
    p_method: "cash",
    p_source: input.kind,
  });
  if (error) return fail(error, "cash_movement");
  refresh();
  return { ok: true };
}

// ── Despesas ────────────────────────────────────────────────────────────────

export interface ExpenseInput {
  description: string;
  categoryId: string;
  amountCents: number;
  competenceDate: string;
  dueOn: string | null;
  notes: string;
  paidMethod: string | null; // se informado, já registra o pagamento
}

export async function createExpense(input: ExpenseInput): Promise<Result> {
  if (!input.description.trim()) return { ok: false, error: "Informe a descrição." };
  if (!input.categoryId) return { ok: false, error: "Escolha a categoria." };
  if (!isCents(input.amountCents)) return { ok: false, error: "Informe um valor válido." };
  if (!ISO_DATE.test(input.competenceDate) || (input.dueOn && !ISO_DATE.test(input.dueOn))) {
    return { ok: false, error: "Data inválida." };
  }
  if (input.paidMethod && !isMethod(input.paidMethod)) return { ok: false, error: "Forma de pagamento inválida." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("financial_entries")
    .insert({
      kind: "expense",
      category_id: input.categoryId,
      description: input.description.trim(),
      amount_cents: input.amountCents,
      competence_date: input.competenceDate,
      due_on: input.dueOn || null,
      status: "pending",
      notes: input.notes.trim() || null,
    })
    .select("id")
    .single();
  if (error || !data) return fail(error, "create_expense");

  if (input.paidMethod) {
    const { error: payError } = await supabase.rpc("pay_expense", { p_entry_id: data.id, p_method: input.paidMethod });
    if (payError) {
      refresh();
      return {
        ok: false,
        error: `Despesa lançada como pendente, mas o pagamento falhou: ${financeErrorMessage(payError.message)}`,
      };
    }
  }
  refresh();
  return { ok: true };
}

export async function payExpense(entryId: string, method: string): Promise<Result> {
  if (!isMethod(method)) return { ok: false, error: "Escolha a forma de pagamento." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("pay_expense", { p_entry_id: entryId, p_method: method });
  if (error) return fail(error, "pay_expense");
  refresh();
  return { ok: true };
}

export async function cancelExpense(entryId: string): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("financial_entries")
    .update({ status: "cancelled" })
    .eq("id", entryId)
    .eq("status", "pending");
  if (error) return fail(error, "cancel_expense");
  refresh();
  return { ok: true };
}

export async function createRecurringExpense(input: {
  description: string;
  categoryId: string;
  amountCents: number;
  dayOfMonth: number;
}): Promise<Result> {
  if (!input.description.trim() || !input.categoryId) return { ok: false, error: "Preencha descrição e categoria." };
  if (!isCents(input.amountCents)) return { ok: false, error: "Informe um valor válido." };
  if (!Number.isInteger(input.dayOfMonth) || input.dayOfMonth < 1 || input.dayOfMonth > 28) {
    return { ok: false, error: "O dia do vencimento deve ser de 1 a 28." };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("recurring_expenses").insert({
    description: input.description.trim(),
    category_id: input.categoryId,
    amount_cents: input.amountCents,
    day_of_month: input.dayOfMonth,
  });
  if (error) return fail(error, "create_recurring");
  // gera já o mês corrente (idempotente)
  await supabase.rpc("generate_recurring_expenses");
  refresh();
  return { ok: true };
}

export async function setRecurringActive(id: string, active: boolean): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from("recurring_expenses").update({ active }).eq("id", id);
  if (error) return fail(error, "recurring_active");
  refresh();
  return { ok: true };
}

// ── Cadastros (categorias e formas de pagamento) ────────────────────────────

export async function createCategory(kind: "income" | "expense", name: string, isFixed: boolean): Promise<Result> {
  if (!name.trim()) return { ok: false, error: "Informe o nome da categoria." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("financial_categories")
    .insert({ kind, name: name.trim(), is_fixed: kind === "expense" && isFixed, display_order: 100 });
  if (error) {
    if (error.code === "23505") return { ok: false, error: "Já existe uma categoria com esse nome." };
    return fail(error, "create_category");
  }
  refresh();
  return { ok: true };
}

export async function setCategoryActive(id: string, active: boolean): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.from("financial_categories").update({ active }).eq("id", id);
  if (error) return fail(error, "category_active");
  refresh();
  return { ok: true };
}

export async function updatePaymentMethod(
  code: string,
  input: { feeBps: number; settlementDays: number; active: boolean },
): Promise<Result> {
  if (!isMethod(code)) return { ok: false, error: "Forma de pagamento inválida." };
  if (!Number.isInteger(input.feeBps) || input.feeBps < 0 || input.feeBps > 10000) {
    return { ok: false, error: "Taxa inválida (0% a 100%)." };
  }
  if (!Number.isInteger(input.settlementDays) || input.settlementDays < 0) {
    return { ok: false, error: "Prazo de recebimento inválido." };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("payment_methods")
    .update({ fee_bps: input.feeBps, settlement_days: input.settlementDays, active: input.active })
    .eq("code", code);
  if (error) return fail(error, "payment_method");
  refresh();
  return { ok: true };
}
