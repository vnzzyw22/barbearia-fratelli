import { createClient } from "./server";

// Comissões e visão do barbeiro. Tudo passa por funções do banco: o dono usa list_commissions/commission_report;
// o barbeiro usa barber_*, que descobrem QUEM é pelo login (não existe parâmetro de barbeiro para adulterar).

export interface CommissionReportRow {
  staff_id: string;
  staff_name: string;
  appointments: number;
  revenue_cents: number;
  commission_cents: number;
  pending_cents: number;
  paid_cents: number;
}

export interface CommissionRow {
  commission_id: string;
  competence_date: string;
  staff_id: string;
  staff_name: string | null;
  description: string;
  client_name: string | null;
  base_cents: number;
  rate_bps: number;
  amount_cents: number;
  status: "pending" | "paid";
  entry_id: string | null;
}

export interface CommissionRule {
  id: string;
  staff_id: string | null;
  service_id: string | null;
  rate_bps: number;
  active: boolean;
  staff: { name: string } | null;
  service: { name: string } | null;
}

export interface StaffAccessRow {
  staff_id: string;
  staff_name: string;
  user_id: string | null;
  email: string | null;
}

export interface BarberSummary {
  appointments: number;
  revenue_cents: number;
  commission_cents: number;
  pending_cents: number;
  paid_cents: number;
}

export interface BarberAgendaRow {
  appointment_id: string;
  starts_at: string;
  ends_at: string;
  status: string;
  service_name: string | null;
  client_first_name: string | null;
}

export interface BarberCommissionRow {
  competence_date: string;
  description: string;
  client_first_name: string | null;
  base_cents: number;
  rate_bps: number;
  amount_cents: number;
  status: "pending" | "paid";
}

async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(fn, args);
  if (error) {
    console.error(`Erro em ${fn}:`, error.message);
    return null;
  }
  return data as T;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getCommissionReport(from: string, to: string) {
  return (await rpc<CommissionReportRow[]>("commission_report", { p_from: from, p_to: to })) ?? [];
}

export async function getCommissions(from: string, to: string, staff?: string) {
  return (
    (await rpc<CommissionRow[]>("list_commissions", {
      p_from: from,
      p_to: to,
      p_staff: staff && UUID.test(staff) ? staff : null,
    })) ?? []
  );
}

export async function getCommissionRules(): Promise<CommissionRule[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("commission_rules")
    .select("id, staff_id, service_id, rate_bps, active, staff:staff(name), service:services(name)")
    .eq("active", true)
    .order("created_at", { ascending: true });
  if (error) {
    console.error("Erro ao buscar regras de comissão:", error.message);
    return [];
  }
  return data as unknown as CommissionRule[];
}

export async function getStaffAccess() {
  return (await rpc<StaffAccessRow[]>("list_staff_access")) ?? [];
}

export const getBarberSummary = (from: string, to: string) =>
  rpc<BarberSummary>("barber_summary", { p_from: from, p_to: to });

export async function getBarberAgenda(from: string, to: string) {
  return (await rpc<BarberAgendaRow[]>("barber_agenda", { p_from: from, p_to: to })) ?? [];
}

export async function getBarberCommissions(from: string, to: string) {
  return (await rpc<BarberCommissionRow[]>("barber_commissions", { p_from: from, p_to: to })) ?? [];
}

export const getBarberMe = () => rpc<{ staff_id: string; name: string }>("barber_me");
