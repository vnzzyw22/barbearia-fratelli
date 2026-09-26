import { createClient } from "./server";
import type {
  CashFlow,
  CashMovement,
  CashRegister,
  CategoryReportRow,
  ClientReportRow,
  EntryFilters,
  FinanceSummary,
  FinancialCategory,
  FinancialEntry,
  ManualReceivableRow,
  MethodReportRow,
  PayableRow,
  PaymentMethod,
  PaymentRow,
  ReceivableRow,
  RecurringExpense,
  ServiceReportRow,
  StaffReportRow,
} from "./finance-types";

// Leituras do financeiro. A RLS libera SÓ o dono; para qualquer outro usuário tudo volta vazio.
// Erros são registrados e viram valor vazio/nulo (as telas mostram estado vazio ou de erro).

async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(fn, args);
  if (error) {
    console.error(`Erro em ${fn}:`, error.message);
    return null;
  }
  return data as T;
}

export async function isOwner(): Promise<boolean> {
  return (await rpc<boolean>("is_owner")) === true;
}

export const getFinanceSummary = (from: string, to: string) =>
  rpc<FinanceSummary>("finance_summary", { p_from: from, p_to: to });

export const getCashFlow = (from: string, to: string) =>
  rpc<CashFlow>("cash_flow", { p_from: from, p_to: to });

export const generateRecurringExpenses = (monthDateISO: string) =>
  rpc<number>("generate_recurring_expenses", { p_month: monthDateISO });

export async function getServiceReport(from: string, to: string) {
  return (await rpc<ServiceReportRow[]>("report_by_service", { p_from: from, p_to: to })) ?? [];
}
export async function getStaffReport(from: string, to: string) {
  return (await rpc<StaffReportRow[]>("report_by_staff", { p_from: from, p_to: to })) ?? [];
}
export async function getMethodReport(from: string, to: string) {
  return (await rpc<MethodReportRow[]>("report_by_method", { p_from: from, p_to: to })) ?? [];
}
export async function getClientReport(from: string, to: string) {
  return (await rpc<ClientReportRow[]>("report_by_client", { p_from: from, p_to: to })) ?? [];
}

export async function getCategoryReport(from: string, to: string, kind: "income" | "expense") {
  return (await rpc<CategoryReportRow[]>("report_by_category", { p_from: from, p_to: to, p_kind: kind })) ?? [];
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Filtros são aplicados no BANCO (nada de buscar tudo e filtrar em JS). Valores fora do formato são ignorados.
export async function getEntries(
  kind: "income" | "expense",
  from: string,
  to: string,
  filters: EntryFilters = {},
): Promise<FinancialEntry[]> {
  return (
    (await rpc<FinancialEntry[]>("list_financial_entries", {
      p_kind: kind,
      p_from: from,
      p_to: to,
      p_category: filters.category && UUID.test(filters.category) ? filters.category : null,
      p_status: filters.status ?? null,
      p_method: filters.method ?? null,
      p_staff: filters.staff && UUID.test(filters.staff) ? filters.staff : null,
    })) ?? []
  );
}

export async function getManualReceivables(): Promise<ManualReceivableRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("v_accounts_receivable_manual")
    .select("id, description, amount_cents, due_on, competence_date, category_name, overdue")
    .order("due_on", { ascending: true, nullsFirst: false });
  if (error) {
    console.error("Erro ao buscar receitas a receber:", error.message);
    return [];
  }
  return data as ManualReceivableRow[];
}

export async function getPayables(): Promise<PayableRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("v_accounts_payable")
    .select("id, description, amount_cents, due_on, competence_date, category_name, overdue")
    .order("due_on", { ascending: true, nullsFirst: false });
  if (error) {
    console.error("Erro ao buscar contas a pagar:", error.message);
    return [];
  }
  return data as PayableRow[];
}

export async function getReceivables(): Promise<ReceivableRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("v_accounts_receivable")
    .select("appointment_id, client_name, service_date, total_cents, paid_cents, outstanding_cents")
    .order("service_date", { ascending: true });
  if (error) {
    console.error("Erro ao buscar contas a receber:", error.message);
    return [];
  }
  return data as ReceivableRow[];
}

const REGISTER_SELECT =
  "id, status, opened_at, opening_balance_cents, closed_at, expected_cash_cents, counted_cash_cents, difference_cents, notes";

export async function getOpenCashRegister(): Promise<CashRegister | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("cash_registers")
    .select(REGISTER_SELECT)
    .eq("status", "open")
    .maybeSingle();
  return (data as CashRegister | null) ?? null;
}

export async function getRecentCashRegisters(limit = 10): Promise<CashRegister[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cash_registers")
    .select(REGISTER_SELECT)
    .order("opened_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("Erro ao buscar caixas:", error.message);
    return [];
  }
  return data as CashRegister[];
}

export async function getCashMovements(fromISO: string, toISO: string): Promise<CashMovement[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cash_movements")
    .select("id, cash_register_id, direction, amount_cents, method, occurred_at, source, description, payment:payments(client:clients(name))")
    .gte("occurred_at", fromISO)
    .lte("occurred_at", toISO)
    .order("occurred_at", { ascending: false });
  if (error) {
    console.error("Erro ao buscar movimentos de caixa:", error.message);
    return [];
  }
  return data as unknown as CashMovement[];
}

export async function getPayments(fromISO: string, toISO: string): Promise<PaymentRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payments")
    .select("id, appointment_id, kind, reversal_of, method, amount_cents, fee_cents, net_cents, paid_at, reason, client:clients(name)")
    .gte("paid_at", fromISO)
    .lte("paid_at", toISO)
    .order("paid_at", { ascending: false });
  if (error) {
    console.error("Erro ao buscar pagamentos:", error.message);
    return [];
  }
  return data as unknown as PaymentRow[];
}

export async function getCategories(): Promise<FinancialCategory[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("financial_categories")
    .select("id, kind, name, is_fixed, system_key, active")
    .order("kind")
    .order("display_order");
  if (error) {
    console.error("Erro ao buscar categorias:", error.message);
    return [];
  }
  return data as FinancialCategory[];
}

export async function getPaymentMethods(): Promise<PaymentMethod[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payment_methods")
    .select("code, name, fee_bps, settlement_days, active")
    .order("display_order");
  if (error) {
    console.error("Erro ao buscar formas de pagamento:", error.message);
    return [];
  }
  return data as PaymentMethod[];
}

export async function getRecurringExpenses(): Promise<RecurringExpense[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("recurring_expenses")
    .select("id, description, category_id, amount_cents, day_of_month, starts_on, ends_on, active, category:financial_categories(name)")
    .order("description");
  if (error) {
    console.error("Erro ao buscar despesas recorrentes:", error.message);
    return [];
  }
  return data as unknown as RecurringExpense[];
}

export async function getRegisterMovements(registerId: string): Promise<CashMovement[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cash_movements")
    .select("id, cash_register_id, direction, amount_cents, method, occurred_at, source, description")
    .eq("cash_register_id", registerId)
    .order("occurred_at", { ascending: false });
  if (error) {
    console.error("Erro ao buscar movimentos do caixa aberto:", error.message);
    return [];
  }
  return data as CashMovement[];
}

export async function getStaffOptions(): Promise<{ id: string; name: string }[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("staff").select("id, name").order("name");
  if (error) {
    console.error("Erro ao buscar profissionais:", error.message);
    return [];
  }
  return data as { id: string; name: string }[];
}
