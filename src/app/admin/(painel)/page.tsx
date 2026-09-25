import Link from "next/link";
import { currentMonthISO, todayISO } from "@/lib/date";
import { formatCents } from "@/lib/finance/money";
import { getAppointmentsForRange } from "@/lib/supabase/admin-queries";
import { getFinanceSummary } from "@/lib/supabase/finance-queries";
import {
  badgeClass,
  cardClass,
  linkPrimaryClass,
  pageSubtitleClass,
  pageTitleClass,
  sectionTitleClass,
} from "@/components/admin/theme";
import type { AdminAppointment, AppointmentStatus } from "@/lib/supabase/types";

const STATUS_LABEL: Record<AppointmentStatus, string> = {
  pending: "Pendente",
  confirmed: "Confirmado",
  in_progress: "Em atendimento",
  completed: "Concluído",
  cancelled: "Cancelado",
  no_show: "Não compareceu",
};

const STATUS_TONE: Record<AppointmentStatus, "amber" | "green" | "red" | "neutral"> = {
  pending: "amber",
  confirmed: "green",
  in_progress: "amber",
  completed: "green",
  cancelled: "neutral",
  no_show: "red",
};

function timeLabel(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(iso));
}

function dateLabel(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(iso));
}

function lastDayOfMonth(monthISO: string) {
  const [year, month] = monthISO.split("-").map(Number);
  return new Date(year, month, 0).getDate();
}

function AppointmentRow({ appointment }: { appointment: AdminAppointment }) {
  return (
    <div
      className={`flex flex-wrap items-center gap-3 text-sm text-white/80 ${cardClass}`}
    >
      <span className="font-medium text-white">
        {dateLabel(appointment.starts_at)} {timeLabel(appointment.starts_at)}
      </span>
      <span>{appointment.client?.name ?? "Cliente removido"}</span>
      <span className="text-white/50">
        {appointment.service?.name ?? "Serviço removido"}
        {appointment.staff && ` · ${appointment.staff.name}`}
      </span>
      <span className={`ml-auto ${badgeClass(STATUS_TONE[appointment.status])}`}>
        {STATUS_LABEL[appointment.status]}
      </span>
    </div>
  );
}

export default async function DashboardPage() {
  const todayDate = todayISO();
  const monthISO = currentMonthISO();

  const todayStartISO = `${todayDate}T00:00:00-03:00`;
  const todayEndISO = `${todayDate}T23:59:59-03:00`;

  const upcomingEnd = new Date();
  upcomingEnd.setDate(upcomingEnd.getDate() + 7);
  const upcomingEndISO = `${upcomingEnd.toISOString().slice(0, 10)}T23:59:59-03:00`;

  const monthStart = `${monthISO}-01`;
  const monthEnd = `${monthISO}-${String(lastDayOfMonth(monthISO)).padStart(2, "0")}`;

  const [todayAppointments, upcomingAppointments, monthSummary, todaySummary] =
    await Promise.all([
      getAppointmentsForRange(todayStartISO, todayEndISO),
      getAppointmentsForRange(todayEndISO, upcomingEndISO),
      getFinanceSummary(monthStart, monthEnd),
      getFinanceSummary(todayDate, todayDate),
    ]);

  const isOpen = (a: AdminAppointment) => a.status !== "cancelled" && a.status !== "no_show";
  const activeTodayAppointments = todayAppointments.filter(isOpen);
  const activeUpcomingAppointments = upcomingAppointments.filter(isOpen);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className={pageTitleClass}>Dashboard</h1>
        <p className={pageSubtitleClass}>Resumo do negócio.</p>
      </div>

      {monthSummary && todaySummary && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className={cardClass}>
              <p className="text-xs text-white/50">Receita hoje</p>
              <p className="mt-1 text-lg font-bold text-green-400">{formatCents(todaySummary.revenue_cents)}</p>
              <p className="mt-1 text-xs text-white/40">{todaySummary.appointments_completed} atendimento(s) concluído(s)</p>
            </div>
            <div className={cardClass}>
              <p className="text-xs text-white/50">Receita do mês</p>
              <p className="mt-1 text-lg font-bold text-green-400">{formatCents(monthSummary.revenue_cents)}</p>
            </div>
            <div className={cardClass}>
              <p className="text-xs text-white/50">Despesas do mês</p>
              <p className="mt-1 text-lg font-bold text-red-400">{formatCents(monthSummary.expenses_cents)}</p>
            </div>
            <div className={cardClass}>
              <p className="text-xs text-white/50">Resultado do mês</p>
              <p className={`mt-1 text-lg font-bold ${monthSummary.result_cents < 0 ? "text-red-400" : "text-white"}`}>
                {formatCents(monthSummary.result_cents)}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-white/60">
            <span>A receber: <strong className="text-white/85">{formatCents(monthSummary.receivable_cents)}</strong></span>
            <span>A pagar: <strong className="text-white/85">{formatCents(monthSummary.payable_cents)}</strong></span>
            <Link href="/admin/financeiro" className={linkPrimaryClass}>Abrir financeiro</Link>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className={sectionTitleClass}>Hoje</h2>
          <Link href="/admin/agenda" className={linkPrimaryClass}>
            Ver agenda
          </Link>
        </div>

        {activeTodayAppointments.length === 0 ? (
          <p className="text-sm text-white/40">Nenhum atendimento hoje.</p>
        ) : (
          activeTodayAppointments.map((a) => (
            <AppointmentRow key={a.id} appointment={a} />
          ))
        )}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className={sectionTitleClass}>Próximos 7 dias</h2>

        {activeUpcomingAppointments.length === 0 ? (
          <p className="text-sm text-white/40">Nenhum atendimento agendado.</p>
        ) : (
          activeUpcomingAppointments.map((a) => (
            <AppointmentRow key={a.id} appointment={a} />
          ))
        )}
      </div>
    </div>
  );
}
