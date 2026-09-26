"use server";

import { revalidatePath } from "next/cache";
import { financeErrorMessage } from "@/lib/finance/errors";
import { createClient } from "@/lib/supabase/server";

type Result = { ok: true } | { ok: false; error: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function refresh() {
  revalidatePath("/admin/comissoes");
  revalidatePath("/admin/equipe");
  revalidatePath("/admin/financeiro");
}

function fail(error: { message: string; code?: string } | null | undefined, context: string): Result {
  console.error(`Erro de comissões (${context}):`, error?.message);
  return { ok: false, error: financeErrorMessage(error?.message) };
}

// A regra vale para atendimentos concluídos DEPOIS de criada: cada comissão congela o percentual do
// momento da conclusão. Nenhum percentual é inventado: só existe o que o dono cadastrar aqui.
export async function createCommissionRule(input: {
  staffId: string | null;
  serviceId: string | null;
  rateBps: number;
}): Promise<Result> {
  if (!Number.isInteger(input.rateBps) || input.rateBps <= 0 || input.rateBps > 10000) {
    return { ok: false, error: "Informe um percentual entre 0,01% e 100%." };
  }
  if ((input.staffId && !UUID.test(input.staffId)) || (input.serviceId && !UUID.test(input.serviceId))) {
    return { ok: false, error: "Profissional ou serviço inválido." };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("commission_rules")
    .insert({ staff_id: input.staffId, service_id: input.serviceId, rate_bps: input.rateBps });
  if (error) {
    if (error.code === "23505") return { ok: false, error: "Já existe uma regra ativa para essa combinação. Desative a anterior." };
    return fail(error, "create_rule");
  }
  refresh();
  return { ok: true };
}

export async function deactivateCommissionRule(id: string): Promise<Result> {
  if (!UUID.test(id)) return { ok: false, error: "Regra inválida." };
  const supabase = await createClient();
  const { error } = await supabase.from("commission_rules").update({ active: false }).eq("id", id);
  if (error) return fail(error, "deactivate_rule");
  refresh();
  return { ok: true };
}

// Login do barbeiro: o dono cria o usuário em Authentication > Users do Supabase e vincula aqui pelo e-mail.
export async function linkBarber(staffId: string, email: string): Promise<Result> {
  if (!UUID.test(staffId)) return { ok: false, error: "Profissional inválido." };
  const mail = email.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) return { ok: false, error: "Informe um e-mail válido." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("link_barber", { p_staff_id: staffId, p_email: mail });
  if (error) {
    const m = error.message;
    if (m.includes("user_not_found")) return { ok: false, error: "Não há usuário com esse e-mail. Crie o usuário no Supabase (Authentication) primeiro." };
    if (m.includes("user_is_owner")) return { ok: false, error: "Esse e-mail é do administrador." };
    if (m.includes("staff_already_linked")) return { ok: false, error: "Esse profissional já tem um login vinculado. Desvincule antes." };
    return fail(error, "link_barber");
  }
  refresh();
  return { ok: true };
}

export async function unlinkBarber(staffId: string): Promise<Result> {
  if (!UUID.test(staffId)) return { ok: false, error: "Profissional inválido." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("unlink_barber", { p_staff_id: staffId });
  if (error) return fail(error, "unlink_barber");
  refresh();
  return { ok: true };
}
