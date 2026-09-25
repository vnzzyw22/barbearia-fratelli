"use server";

import { revalidatePath } from "next/cache";
import { createAppointment } from "@/app/agendar/actions";
import { financeErrorMessage } from "@/lib/finance/errors";
import { createClient } from "@/lib/supabase/server";
import type { AppointmentStatus } from "@/lib/supabase/types";

type ActionResult = { ok: true } | { ok: false; error: string };

function revalidateAgenda() {
  revalidatePath("/admin/agenda");
  revalidatePath("/agendar");
}

interface CreateManualAppointmentInput {
  serviceId: string;
  staffId: string;
  dateISO: string;
  time: string;
  name: string;
  whatsapp: string;
  notes?: string;
}

// Agendamento lançado pela própria barbearia (walk-in, telefone, ou pra
// popular a agenda com exemplos) — reaproveita literalmente a mesma
// validação/criação do fluxo público (`createAppointment`, mesmas regras
// de conflito de horário, mesmo formato de dado), só que já nasce
// "confirmed" em vez de "pending" (ver nota no tipo `CreateAppointmentInput`
// em agendar/actions.ts).
export async function createManualAppointment(
  input: CreateManualAppointmentInput,
): Promise<ActionResult> {
  const result = await createAppointment({ ...input, status: "confirmed" });

  if (!result.ok) return result;

  revalidateAgenda();
  return { ok: true };
}

// Estados manuais do atendimento. "Concluído" NÃO passa por aqui: só a função do banco
// complete_appointment (que cria pagamento, receita e caixa juntos) pode concluir.
const MANUAL_STATUSES: AppointmentStatus[] = [
  "pending",
  "confirmed",
  "in_progress",
  "cancelled",
  "no_show",
];

export async function updateAppointmentStatus(
  id: string,
  status: AppointmentStatus,
  reason?: string,
): Promise<ActionResult> {
  if (!MANUAL_STATUSES.includes(status)) {
    return { ok: false, error: "Para concluir, use “Concluir atendimento”." };
  }

  const supabase = await createClient();
  const patch: { status: AppointmentStatus; cancel_reason?: string | null } = { status };
  if (status === "cancelled" || status === "no_show") patch.cancel_reason = reason?.trim() || null;

  const { error } = await supabase.from("appointments").update(patch).eq("id", id);

  if (error) {
    console.error("Erro ao atualizar status do appointment:", error.message);
    return { ok: false, error: financeErrorMessage(error.message) };
  }

  revalidateAgenda();
  revalidatePath("/admin");
  revalidatePath("/admin/financeiro");
  return { ok: true };
}

interface CreateBlockedSlotInput {
  startsAtISO: string;
  endsAtISO: string;
  reason: string;
  staffId: string | null;
}

export async function createBlockedSlot(
  input: CreateBlockedSlotInput,
): Promise<ActionResult> {
  if (new Date(input.endsAtISO) <= new Date(input.startsAtISO)) {
    return { ok: false, error: "O horário final precisa ser depois do inicial." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("blocked_slots").insert({
    starts_at: input.startsAtISO,
    ends_at: input.endsAtISO,
    reason: input.reason.trim() || null,
    staff_id: input.staffId,
  });

  if (error) {
    if (error.code === "23P01") {
      return {
        ok: false,
        error: "Esse horário conflita com um agendamento ou bloqueio existente.",
      };
    }
    console.error("Erro ao criar blocked_slot:", error.message);
    return { ok: false, error: "Não foi possível criar o bloqueio." };
  }

  revalidateAgenda();
  return { ok: true };
}

export async function deleteBlockedSlot(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("blocked_slots").delete().eq("id", id);

  if (error) {
    console.error("Erro ao excluir blocked_slot:", error.message);
    return { ok: false, error: "Não foi possível remover o bloqueio." };
  }

  revalidateAgenda();
  return { ok: true };
}
