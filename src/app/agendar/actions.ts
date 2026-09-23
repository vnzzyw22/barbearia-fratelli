"use server";

import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import {
  getActiveServiceById,
  getActiveStaffById,
  getBusinessSettings,
  getBusySlots,
} from "@/lib/supabase/queries";
import {
  computeAvailableSlots,
  timeToStartsAtISO,
  weekdayKeyFor,
} from "@/lib/scheduling";
import { buildBookingMessage, getWhatsappLink } from "@/lib/whatsapp";
import {
  isValidFutureDate,
  isValidName,
  isValidTime,
  isValidWhatsapp,
} from "@/lib/booking-validation";

export async function getAvailableSlots(
  serviceId: string,
  staffId: string,
  dateISO: string,
): Promise<{ slots: string[] } | { error: string }> {
  if (!isValidFutureDate(dateISO)) {
    return { error: "Escolha uma data válida (hoje até 60 dias à frente)." };
  }

  const [service, staffMember, business] = await Promise.all([
    getActiveServiceById(serviceId),
    getActiveStaffById(staffId),
    getBusinessSettings(),
  ]);

  if (!service) return { error: "Serviço não encontrado." };
  if (!staffMember) return { error: "Profissional não encontrado." };
  if (!business) return { error: "Não foi possível carregar os horários." };

  const dayHours = business.business_hours[weekdayKeyFor(dateISO)];
  const openTime = dayHours && "open" in dayHours ? dayHours.open : null;
  const closeTime = dayHours && "close" in dayHours ? dayHours.close : null;

  const dayStartISO = `${dateISO}T00:00:00-03:00`;
  const dayEndISO = `${dateISO}T23:59:59-03:00`;
  const busyRanges = await getBusySlots(staffId, dayStartISO, dayEndISO);

  const slots = computeAvailableSlots({
    dateISO,
    openTime,
    closeTime,
    durationMinutes: service.duration_minutes,
    busyRanges,
    nowEpochMs: Date.now(),
  });

  return { slots };
}

interface CreateAppointmentInput {
  serviceId: string;
  staffId: string;
  dateISO: string;
  time: string;
  name: string;
  whatsapp: string;
  notes?: string;
  // Omitido (fluxo público) = "pending", aguardando confirmação da loja.
  // Usado com "confirmed" pelo painel admin (ver
  // admin/agenda/actions.ts#createManualAppointment), já que quem está
  // criando ali é a própria barbearia — não faz sentido esperar ela
  // "confirmar" um agendamento que ela mesma lançou.
  status?: "pending" | "confirmed";
}

type CreateAppointmentResult =
  | { ok: true; whatsappLink: string | null }
  | { ok: false; error: string };

export async function createAppointment(
  input: CreateAppointmentInput,
): Promise<CreateAppointmentResult> {
  // Modo de pré-visualização sem Supabase (ver src/lib/supabase/config.ts):
  // os dados de leitura (serviços/equipe/horário) já funcionam com o
  // fallback real, mas gravar um agendamento de verdade exige banco — erro
  // claro em vez de deixar `createClient()` lançar exceção sem contexto.
  if (!isSupabaseConfigured) {
    return {
      ok: false,
      error:
        "Agendamento ainda não disponível: o projeto Supabase da Fratelli ainda não foi configurado.",
    };
  }

  const name = input.name.trim();
  const whatsapp = input.whatsapp.trim();
  const notes = input.notes?.trim() || undefined;

  if (!isValidName(name)) return { ok: false, error: "Informe seu nome." };
  if (!isValidWhatsapp(whatsapp)) {
    return { ok: false, error: "Informe um WhatsApp válido com DDD." };
  }
  if (!isValidFutureDate(input.dateISO)) {
    return { ok: false, error: "Data inválida." };
  }
  if (!isValidTime(input.time)) {
    return { ok: false, error: "Horário inválido." };
  }

  const [service, staffMember] = await Promise.all([
    getActiveServiceById(input.serviceId),
    getActiveStaffById(input.staffId),
  ]);
  if (!service) return { ok: false, error: "Serviço não encontrado." };
  if (!staffMember) return { ok: false, error: "Profissional não encontrado." };

  const startsAt = timeToStartsAtISO(input.dateISO, input.time);
  const endsAt = new Date(
    new Date(startsAt).getTime() + service.duration_minutes * 60_000,
  ).toISOString();

  if (new Date(startsAt).getTime() < Date.now()) {
    return { ok: false, error: "Esse horário já passou, escolha outro." };
  }

  const supabase = await createClient();

  // Sem .select() no insert: clients não tem policy de SELECT pra anon (só
  // admin lê), e o Postgres aplica RLS de leitura também sobre o RETURNING
  // de um INSERT — pedir o retorno faria o insert falhar. Por isso o id é
  // gerado aqui e usado direto, sem precisar ler a linha de volta.
  const clientId = crypto.randomUUID();
  const { error: clientError } = await supabase
    .from("clients")
    .insert({ id: clientId, name, whatsapp });

  if (clientError) {
    console.error("Erro ao criar client:", clientError.message);
    return { ok: false, error: "Não foi possível enviar o agendamento." };
  }

  const { error: appointmentError } = await supabase
    .from("appointments")
    .insert({
      client_id: clientId,
      service_id: service.id,
      staff_id: staffMember.id,
      starts_at: startsAt,
      ends_at: endsAt,
      status: input.status ?? "pending",
      notes: notes ?? null,
    });

  if (appointmentError) {
    if (appointmentError.code === "23P01") {
      return {
        ok: false,
        error: "Esse horário acabou de ser reservado por outra pessoa. Escolha outro.",
      };
    }
    console.error("Erro ao criar appointment:", appointmentError.message);
    return { ok: false, error: "Não foi possível enviar o agendamento." };
  }

  const business = await getBusinessSettings();
  const dateLabel = new Date(`${input.dateISO}T00:00:00-03:00`).toLocaleDateString(
    "pt-BR",
    { timeZone: "America/Sao_Paulo" },
  );

  const whatsappLink = getWhatsappLink(
    business?.whatsapp ?? null,
    buildBookingMessage({
      clientName: name,
      serviceName: service.name,
      staffName: staffMember.name,
      dateLabel,
      timeLabel: input.time,
      notes,
    }),
  );

  return { ok: true, whatsappLink };
}
