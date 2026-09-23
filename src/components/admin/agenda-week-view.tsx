"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getAvailableSlots } from "@/app/agendar/actions";
import {
  createBlockedSlot,
  createManualAppointment,
  deleteBlockedSlot,
  updateAppointmentStatus,
} from "@/app/admin/(painel)/agenda/actions";
import {
  buttonPrimaryClass,
  buttonSecondaryClass,
  cardClass,
  fieldClass,
  filterButtonClass,
  labelClass,
  sectionTitleClass,
} from "@/components/admin/theme";
import { formatPrice } from "@/lib/format";
import { getWhatsappLink } from "@/lib/whatsapp";
import { timeToStartsAtISO } from "@/lib/scheduling";
import type {
  AdminAppointment,
  AdminBlockedSlot,
  AdminStaff,
  AppointmentStatus,
  Service,
} from "@/lib/supabase/types";

interface AgendaWeekViewProps {
  weekStartISO: string;
  isCurrentWeek: boolean;
  appointments: AdminAppointment[];
  blockedSlots: AdminBlockedSlot[];
  staff: AdminStaff[];
  services: Service[];
}

type Selection =
  | { kind: "appointment"; data: AdminAppointment }
  | { kind: "block"; data: AdminBlockedSlot }
  | null;

const WEEKDAY_LABELS = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"];

const STATUS_LABEL: Record<AppointmentStatus, string> = {
  pending: "Pendente",
  confirmed: "Confirmado",
  cancelled: "Cancelado",
};

const STATUS_DOT: Record<AppointmentStatus, string> = {
  pending: "bg-amber-400",
  confirmed: "bg-green-400",
  cancelled: "bg-white/30",
};

function dateKeySP(iso: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
  }).format(new Date(iso));
}

function timeLabel(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(iso));
}

function addDaysISO(dateISO: string, days: number) {
  const date = new Date(`${dateISO}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function dayNumberLabel(dateISO: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(`${dateISO}T00:00:00`));
}

const activeStaff = (staff: AdminStaff[]) => staff.filter((s) => s.active);

export function AgendaWeekView({
  weekStartISO,
  isCurrentWeek,
  appointments,
  blockedSlots,
  staff,
  services,
}: AgendaWeekViewProps) {
  const router = useRouter();
  const [selection, setSelection] = useState<Selection>(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [staffFilter, setStaffFilter] = useState<string | null>(null);

  const [blockDate, setBlockDate] = useState<string | null>(null);
  const [blockStart, setBlockStart] = useState("12:00");
  const [blockEnd, setBlockEnd] = useState("13:00");
  const [blockReason, setBlockReason] = useState("");
  const [blockStaffId, setBlockStaffId] = useState<string>("");
  const [blockSubmitting, setBlockSubmitting] = useState(false);
  const [blockError, setBlockError] = useState<string | null>(null);

  // Novo agendamento lançado direto pela barbearia (walk-in, telefone, ou
  // pra popular a agenda com exemplos) — mesmo fluxo/validação do
  // agendamento público (ver createManualAppointment), só que já nasce
  // confirmado e pode ser preenchido pela própria dona sem o cliente
  // precisar acessar o site.
  const [apptDate, setApptDate] = useState<string | null>(null);
  const [apptServiceId, setApptServiceId] = useState("");
  const [apptStaffId, setApptStaffId] = useState("");
  const [apptTime, setApptTime] = useState<string | null>(null);
  const [apptName, setApptName] = useState("");
  const [apptWhatsapp, setApptWhatsapp] = useState("");
  const [apptNotes, setApptNotes] = useState("");
  const [apptSlots, setApptSlots] = useState<string[] | null>(null);
  const [apptSlotsLoading, setApptSlotsLoading] = useState(false);
  const [apptSlotsError, setApptSlotsError] = useState<string | null>(null);
  const [apptSubmitting, setApptSubmitting] = useState(false);
  const [apptError, setApptError] = useState<string | null>(null);

  useEffect(() => {
    if (!apptDate || !apptServiceId || !apptStaffId) {
      setApptSlots(null);
      return undefined;
    }

    let cancelled = false;
    setApptTime(null);
    setApptSlotsLoading(true);
    setApptSlotsError(null);

    getAvailableSlots(apptServiceId, apptStaffId, apptDate).then((result) => {
      if (cancelled) return;
      setApptSlotsLoading(false);
      if ("error" in result) setApptSlotsError(result.error);
      else setApptSlots(result.slots);
    });

    return () => {
      cancelled = true;
    };
  }, [apptDate, apptServiceId, apptStaffId]);

  const filteredAppointments = staffFilter
    ? appointments.filter((a) => a.staff?.id === staffFilter)
    : appointments;
  // Bloqueios da loja inteira (staff_id null) valem pra qualquer filtro —
  // só bloqueios de um profissional específico somem quando o filtro é de
  // outro profissional (mesma regra usada no cálculo de disponibilidade,
  // ver src/lib/supabase/queries.ts#getBusySlots).
  const filteredBlocks = staffFilter
    ? blockedSlots.filter((b) => !b.staff_id || b.staff_id === staffFilter)
    : blockedSlots;

  const days = Array.from({ length: 7 }, (_, i) => {
    const dateISO = addDaysISO(weekStartISO, i);
    return {
      dateISO,
      isToday: dateISO === dateKeySP(new Date().toISOString()),
      appointments: filteredAppointments
        .filter((a) => dateKeySP(a.starts_at) === dateISO)
        .sort((a, b) => a.starts_at.localeCompare(b.starts_at)),
      blocks: filteredBlocks
        .filter((b) => dateKeySP(b.starts_at) === dateISO)
        .sort((a, b) => a.starts_at.localeCompare(b.starts_at)),
    };
  });

  function goToWeek(anchorISO: string) {
    setSelection(null);
    router.push(`/admin/agenda?data=${anchorISO}`);
  }

  function openBlockForm(dateISO: string) {
    setSelection(null);
    setApptDate(null);
    setBlockDate(dateISO);
    setBlockStaffId(staffFilter ?? "");
    setBlockError(null);
  }

  function openAppointmentForm(dateISO: string) {
    setSelection(null);
    setBlockDate(null);
    setApptDate(dateISO);
    setApptServiceId("");
    setApptStaffId(staffFilter ?? "");
    setApptTime(null);
    setApptName("");
    setApptWhatsapp("");
    setApptNotes("");
    setApptError(null);
  }

  function closeAppointmentForm() {
    setApptDate(null);
  }

  async function handleStatusChange(id: string, status: AppointmentStatus) {
    setStatusUpdating(true);
    setActionError(null);
    const result = await updateAppointmentStatus(id, status);
    setStatusUpdating(false);
    if (result.ok) {
      setSelection(null);
      router.refresh();
    } else {
      setActionError(result.error);
    }
  }

  async function handleCreateBlock(e: React.FormEvent) {
    e.preventDefault();
    if (!blockDate) return;

    setBlockSubmitting(true);
    setBlockError(null);

    const result = await createBlockedSlot({
      startsAtISO: timeToStartsAtISO(blockDate, blockStart),
      endsAtISO: timeToStartsAtISO(blockDate, blockEnd),
      reason: blockReason,
      staffId: blockStaffId || null,
    });

    setBlockSubmitting(false);

    if (result.ok) {
      setBlockDate(null);
      setBlockReason("");
      setBlockStaffId("");
      router.refresh();
    } else {
      setBlockError(result.error);
    }
  }

  async function handleCreateAppointment(e: React.FormEvent) {
    e.preventDefault();
    if (!apptDate || !apptServiceId || !apptStaffId || !apptTime) return;

    setApptSubmitting(true);
    setApptError(null);

    const result = await createManualAppointment({
      serviceId: apptServiceId,
      staffId: apptStaffId,
      dateISO: apptDate,
      time: apptTime,
      name: apptName,
      whatsapp: apptWhatsapp,
      notes: apptNotes,
    });

    setApptSubmitting(false);

    if (result.ok) {
      setApptDate(null);
      router.refresh();
    } else {
      setApptError(result.error);
    }
  }

  async function handleDeleteBlock(id: string) {
    const result = await deleteBlockedSlot(id);
    if (result.ok) {
      setSelection(null);
      router.refresh();
    } else {
      setActionError(result.error);
    }
  }

  return (
    <div className="mt-6 flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => goToWeek(addDaysISO(weekStartISO, -7))}
          className={filterButtonClass(false)}
        >
          ← Semana anterior
        </button>
        <button
          type="button"
          onClick={() => goToWeek(new Date().toISOString().slice(0, 10))}
          className={filterButtonClass(isCurrentWeek)}
        >
          Hoje
        </button>
        <button
          type="button"
          onClick={() => goToWeek(addDaysISO(weekStartISO, 7))}
          className={filterButtonClass(false)}
        >
          Próxima semana →
        </button>
      </div>

      {staff.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setStaffFilter(null)}
            className={filterButtonClass(staffFilter === null)}
          >
            Todos
          </button>
          {staff.map((person) => (
            <button
              key={person.id}
              type="button"
              onClick={() => setStaffFilter(person.id)}
              className={filterButtonClass(staffFilter === person.id)}
            >
              {person.name}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-7 lg:gap-2">
        {days.map((day) => (
          <div
            key={day.dateISO}
            className={`flex flex-col gap-2 rounded-lg border p-3 ${
              day.isToday
                ? "border-brand-red bg-brand-red/[0.06]"
                : "border-white/10 bg-teal-deep"
            }`}
          >
            <div className="flex items-baseline justify-between">
              <span className="font-nav text-[11px] font-bold tracking-widest text-white/50 uppercase">
                {WEEKDAY_LABELS[new Date(`${day.dateISO}T00:00:00`).getDay()]}
              </span>
              <span
                className={`font-nav text-xs font-bold ${day.isToday ? "text-brand-red" : "text-white/70"}`}
              >
                {dayNumberLabel(day.dateISO)}
              </span>
            </div>

            <div className="flex flex-col gap-1.5">
              {day.appointments.map((appointment) => {
                const isSelected =
                  selection?.kind === "appointment" &&
                  selection.data.id === appointment.id;

                return (
                  <button
                    key={appointment.id}
                    type="button"
                    onClick={() =>
                      setSelection({ kind: "appointment", data: appointment })
                    }
                    className={`flex items-center gap-1.5 rounded-md px-2 py-1.5 text-left text-xs transition-colors duration-150 ${
                      isSelected
                        ? "bg-brand-red text-brand-black"
                        : "bg-white/[0.06] text-white/85 hover:bg-brand-red hover:text-brand-black"
                    } ${appointment.status === "cancelled" ? "opacity-40 line-through" : ""}`}
                  >
                    <span
                      className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATUS_DOT[appointment.status]}`}
                    />
                    <span className="truncate">
                      {timeLabel(appointment.starts_at)}{" "}
                      {appointment.service?.name ?? "Serviço removido"}
                      {appointment.staff && ` · ${appointment.staff.name}`}
                    </span>
                  </button>
                );
              })}

              {day.blocks.map((block) => {
                const isSelected =
                  selection?.kind === "block" && selection.data.id === block.id;

                return (
                  <button
                    key={block.id}
                    type="button"
                    onClick={() => setSelection({ kind: "block", data: block })}
                    className={`rounded-md border border-dashed px-2 py-1.5 text-left text-xs transition-colors duration-150 ${
                      isSelected
                        ? "border-white/40 bg-white/10 text-white"
                        : "border-white/15 text-white/40 hover:border-white/30 hover:text-white/70"
                    }`}
                  >
                    {timeLabel(block.starts_at)} Bloqueado
                    {block.staff ? ` (${block.staff.name})` : " (loja)"}
                  </button>
                );
              })}
            </div>

            <div className="mt-auto flex flex-col items-start gap-1">
              <button
                type="button"
                onClick={() => openAppointmentForm(day.dateISO)}
                className="font-nav text-[11px] font-bold tracking-widest text-brand-red uppercase transition-colors duration-150 hover:text-white"
              >
                + Agendar
              </button>
              <button
                type="button"
                onClick={() => openBlockForm(day.dateISO)}
                className="font-nav text-[11px] font-bold tracking-widest text-white/30 uppercase transition-colors duration-150 hover:text-brand-red"
              >
                + Bloquear
              </button>
            </div>
          </div>
        ))}
      </div>

      {actionError && <p className="text-sm text-red-400">{actionError}</p>}

      {selection?.kind === "appointment" && (
        <div className={`flex flex-col gap-3 ${cardClass}`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-nav text-sm font-bold tracking-wide text-white uppercase">
                {selection.data.client?.name ?? "Cliente removido"}
              </p>
              <p className="mt-1 text-sm text-white/60">
                {selection.data.service?.name ?? "Serviço removido"}
                {selection.data.service && (
                  <> — {formatPrice(selection.data.service.price)}</>
                )}
                {selection.data.staff && <> · {selection.data.staff.name}</>}
              </p>
              <p className="mt-1 text-sm text-white/60">
                {timeLabel(selection.data.starts_at)}–
                {timeLabel(selection.data.ends_at)}
              </p>
              {selection.data.notes && (
                <p className="mt-1 text-sm text-white/40">
                  {selection.data.notes}
                </p>
              )}
            </div>
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/60">
              {STATUS_LABEL[selection.data.status]}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            {selection.data.client?.whatsapp && (
              <a
                href={
                  getWhatsappLink(
                    selection.data.client.whatsapp,
                    `Olá, ${selection.data.client.name}! Sobre seu horário de ${timeLabel(selection.data.starts_at)} na Fratelli Barber Club.`,
                  ) ?? undefined
                }
                target="_blank"
                rel="noopener noreferrer"
                className={buttonSecondaryClass}
              >
                WhatsApp
              </a>
            )}
            {selection.data.status === "pending" && (
              <button
                type="button"
                disabled={statusUpdating}
                onClick={() => handleStatusChange(selection.data.id, "confirmed")}
                className={buttonPrimaryClass}
              >
                Confirmar
              </button>
            )}
            {selection.data.status !== "cancelled" && (
              <button
                type="button"
                disabled={statusUpdating}
                onClick={() => handleStatusChange(selection.data.id, "cancelled")}
                className={buttonSecondaryClass}
              >
                Cancelar
              </button>
            )}
            <button
              type="button"
              onClick={() => setSelection(null)}
              className="font-nav text-xs font-bold tracking-widest text-white/40 uppercase hover:text-white"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {selection?.kind === "block" && (
        <div className={`flex flex-col gap-3 ${cardClass}`}>
          <p className="font-nav text-sm font-bold tracking-wide text-white uppercase">
            Bloqueio {timeLabel(selection.data.starts_at)}–
            {timeLabel(selection.data.ends_at)}
          </p>
          <p className="text-sm text-white/60">
            {selection.data.staff ? selection.data.staff.name : "Loja inteira"}
          </p>
          {selection.data.reason && (
            <p className="text-sm text-white/60">{selection.data.reason}</p>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleDeleteBlock(selection.data.id)}
              className={buttonSecondaryClass}
            >
              Remover bloqueio
            </button>
            <button
              type="button"
              onClick={() => setSelection(null)}
              className="font-nav text-xs font-bold tracking-widest text-white/40 uppercase hover:text-white"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {apptDate && (
        <form
          onSubmit={handleCreateAppointment}
          className={`flex flex-col gap-4 ${cardClass}`}
        >
          <p className={sectionTitleClass}>
            Novo agendamento — {dayNumberLabel(apptDate)}
          </p>

          <div className="flex flex-wrap gap-3">
            <div className="flex min-w-48 flex-1 flex-col gap-1.5">
              <label className={labelClass}>Serviço</label>
              <select
                value={apptServiceId}
                onChange={(e) => setApptServiceId(e.target.value)}
                className={fieldClass}
              >
                <option value="">Selecione</option>
                {services.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.name} — {formatPrice(service.price)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex min-w-48 flex-1 flex-col gap-1.5">
              <label className={labelClass}>Profissional</label>
              <select
                value={apptStaffId}
                onChange={(e) => setApptStaffId(e.target.value)}
                className={fieldClass}
              >
                <option value="">Selecione</option>
                {activeStaff(staff).map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex min-w-40 flex-col gap-1.5">
              <label className={labelClass}>Data</label>
              <input
                type="date"
                value={apptDate}
                onChange={(e) => setApptDate(e.target.value)}
                className={fieldClass}
              />
            </div>
          </div>

          {apptServiceId && apptStaffId && (
            <div className="flex flex-col gap-1.5">
              <label className={labelClass}>Horário</label>
              {apptSlotsLoading && (
                <p className="text-sm text-white/50">Carregando horários...</p>
              )}
              {apptSlotsError && (
                <p className="text-sm text-red-400">{apptSlotsError}</p>
              )}
              {apptSlots && apptSlots.length === 0 && (
                <p className="text-sm text-white/50">
                  Nenhum horário disponível nessa data.
                </p>
              )}
              {apptSlots && apptSlots.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {apptSlots.map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setApptTime(slot)}
                      className={filterButtonClass(apptTime === slot)}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            <div className="flex min-w-48 flex-1 flex-col gap-1.5">
              <label className={labelClass}>Nome do cliente</label>
              <input
                type="text"
                value={apptName}
                onChange={(e) => setApptName(e.target.value)}
                className={fieldClass}
              />
            </div>
            <div className="flex min-w-48 flex-1 flex-col gap-1.5">
              <label className={labelClass}>WhatsApp (com DDD)</label>
              <input
                type="tel"
                placeholder="(44) 90000-0000"
                value={apptWhatsapp}
                onChange={(e) => setApptWhatsapp(e.target.value)}
                className={`${fieldClass} placeholder:text-white/30`}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Observação (opcional)</label>
            <input
              type="text"
              value={apptNotes}
              onChange={(e) => setApptNotes(e.target.value)}
              className={fieldClass}
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={apptSubmitting || !apptTime}
              className={buttonPrimaryClass}
            >
              {apptSubmitting ? "Salvando..." : "Salvar agendamento"}
            </button>
            <button
              type="button"
              onClick={closeAppointmentForm}
              className="font-nav text-xs font-bold tracking-widest text-white/40 uppercase hover:text-white"
            >
              Cancelar
            </button>
            {apptError && <p className="w-full text-sm text-red-400">{apptError}</p>}
          </div>
        </form>
      )}

      {blockDate && (
        <form
          onSubmit={handleCreateBlock}
          className={`flex flex-wrap items-end gap-3 ${cardClass}`}
        >
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Data</label>
            <input
              type="date"
              value={blockDate}
              onChange={(e) => setBlockDate(e.target.value)}
              className={fieldClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Profissional</label>
            <select
              value={blockStaffId}
              onChange={(e) => setBlockStaffId(e.target.value)}
              className={fieldClass}
            >
              <option value="">Loja inteira</option>
              {staff.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Início</label>
            <input
              type="time"
              value={blockStart}
              onChange={(e) => setBlockStart(e.target.value)}
              className={fieldClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className={labelClass}>Fim</label>
            <input
              type="time"
              value={blockEnd}
              onChange={(e) => setBlockEnd(e.target.value)}
              className={fieldClass}
            />
          </div>
          <div className="flex min-w-40 flex-1 flex-col gap-1.5">
            <label className={labelClass}>Motivo (opcional)</label>
            <input
              type="text"
              value={blockReason}
              onChange={(e) => setBlockReason(e.target.value)}
              className={fieldClass}
            />
          </div>
          <button
            type="submit"
            disabled={blockSubmitting}
            className={buttonPrimaryClass}
          >
            {blockSubmitting ? "Salvando..." : "Salvar"}
          </button>
          <button
            type="button"
            onClick={() => setBlockDate(null)}
            className="font-nav text-xs font-bold tracking-widest text-white/40 uppercase hover:text-white"
          >
            Cancelar
          </button>
          {blockError && (
            <p className="w-full text-sm text-red-400">{blockError}</p>
          )}
        </form>
      )}
    </div>
  );
}
