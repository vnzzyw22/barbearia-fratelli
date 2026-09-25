// Tipos manuais das tabelas/funções financeiras (migração 20260925120000). Valores em CENTAVOS.

export type PaymentMethodCode = "pix" | "cash" | "debit" | "credit" | "other";

export interface PaymentMethod {
  code: PaymentMethodCode;
  name: string;
  fee_bps: number;
  settlement_days: number;
  active: boolean;
}

export interface FinancialCategory {
  id: string;
  kind: "income" | "expense";
  name: string;
  is_fixed: boolean;
  system_key: string | null;
  active: boolean;
}

export interface FinanceSummary {
  revenue_cents: number;
  expenses_cents: number;
  result_cents: number;
  cash_in_cents: number;
  cash_out_cents: number;
  receivable_cents: number;
  payable_cents: number;
  overdue_payable_cents: number;
  appointments_completed: number;
  appointments_no_show: number;
  appointments_cancelled: number;
}

export interface CashFlow {
  opening_cents: number;
  in_cents: number;
  out_cents: number;
  closing_cents: number;
  daily: { date: string; in_cents: number | null; out_cents: number | null }[];
}

export interface FinancialEntry {
  id: string;
  kind: "income" | "expense";
  description: string;
  amount_cents: number;
  competence_date: string;
  due_on: string | null;
  status: "recognized" | "pending" | "paid" | "cancelled";
  paid_at: string | null;
  payment_method: PaymentMethodCode | null;
  appointment_id: string | null;
  commission_id: string | null;
  recurring_expense_id: string | null;
  notes: string | null;
  category: { name: string } | null;
  client: { name: string } | null;
  staff: { name: string } | null;
}

export interface PayableRow {
  id: string;
  description: string;
  amount_cents: number;
  due_on: string | null;
  competence_date: string;
  category_name: string;
  overdue: boolean;
}

export interface ReceivableRow {
  appointment_id: string;
  client_name: string;
  service_date: string;
  total_cents: number;
  paid_cents: number;
  outstanding_cents: number;
}

export interface CashRegister {
  id: string;
  status: "open" | "closed";
  opened_at: string;
  opening_balance_cents: number;
  closed_at: string | null;
  expected_cash_cents: number | null;
  counted_cash_cents: number | null;
  difference_cents: number | null;
  notes: string | null;
}

export interface CashMovement {
  id: string;
  cash_register_id: string | null;
  direction: "in" | "out";
  amount_cents: number;
  method: PaymentMethodCode;
  occurred_at: string;
  source: "payment" | "refund" | "expense" | "manual" | "adjustment";
  description: string | null;
}

export interface PaymentRow {
  id: string;
  appointment_id: string | null;
  kind: "payment" | "refund";
  reversal_of: string | null;
  method: PaymentMethodCode;
  amount_cents: number;
  fee_cents: number;
  net_cents: number;
  paid_at: string;
  reason: string | null;
  client: { name: string } | null;
}

export interface RecurringExpense {
  id: string;
  description: string;
  category_id: string;
  amount_cents: number;
  day_of_month: number;
  starts_on: string;
  ends_on: string | null;
  active: boolean;
  category: { name: string } | null;
}

export interface ServiceReportRow {
  service_name: string;
  quantity: number;
  revenue_cents: number;
  avg_ticket_cents: number;
}
export interface StaffReportRow {
  staff_id: string | null;
  staff_name: string | null;
  appointments: number;
  revenue_cents: number;
  commission_cents: number;
  avg_ticket_cents: number;
}
export interface MethodReportRow {
  method: PaymentMethodCode;
  payments: number;
  gross_cents: number;
  fee_cents: number;
  net_cents: number;
  refunded_cents: number;
}
export interface ClientReportRow {
  client_id: string;
  client_name: string;
  visits: number;
  revenue_cents: number;
  avg_ticket_cents: number;
  last_visit: string;
  is_returning: boolean;
}

export interface AppointmentItemRow {
  id: string;
  description: string;
  unit_price_cents: number;
  quantity: number;
  total_cents: number;
  service_id: string | null;
  staff_id: string | null;
}

export interface AppointmentPaymentRow {
  id: string;
  kind: "payment" | "refund";
  reversal_of: string | null;
  method: PaymentMethodCode;
  amount_cents: number;
  paid_at: string;
}

export const METHOD_LABEL: Record<PaymentMethodCode, string> = {
  pix: "Pix",
  cash: "Dinheiro",
  debit: "Débito",
  credit: "Crédito",
  other: "Outro",
};
