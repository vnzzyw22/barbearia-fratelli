import Link from "next/link";
import { currentMonthISO, todayISO } from "@/lib/date";
import { formatPrice } from "@/lib/format";
import {
  getAppointmentsForRange,
  getTransactionsForRange,
} from "@/lib/supabase/admin-queries";
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
  cancelled: "Cancelado",
};

const STATUS_TONE: Record<AppointmentStatus, "amber" | "green" | "neutral"> = {
  pending: "amber",
  confirmed: "green",
  cancelled: "neutral",
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

  const [todayAppointments, upcomingAppointments, transactions] =
    await Promise.all([
      getAppointmentsForRange(todayStartISO, todayEndISO),
      getAppointmentsForRange(todayEndISO, upcomingEndISO),
      getTransactionsForRange(monthStart, monthEnd),
    ]);

  const activeTodayAppointments = todayAppointments.filter(
    (a) => a.status !== "cancelled",
  );
  const activeUpcomingAppointments = upcomingAppointments.filter(
    (a) => a.status !== "cancelled",
  );

  const income = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);
  const expense = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className={pageTitleClass}>Dashboard</h1>
        <p className={pageSubtitleClass}>Resumo do negócio.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className={cardClass}>
          <p className="text-xs text-white/50">Entradas do mês</p>
          <p className="mt-1 text-lg font-bold text-green-400">
            {formatPrice(income)}
          </p>
        </div>
        <div className={cardClass}>
          <p className="text-xs text-white/50">Saídas do mês</p>
          <p className="mt-1 text-lg font-bold text-red-400">
            {formatPrice(expense)}
          </p>
        </div>
        <div className={cardClass}>
          <p className="text-xs text-white/50">Saldo do mês</p>
          <p className="mt-1 text-lg font-bold text-white">
            {formatPrice(income - expense)}
          </p>
        </div>
      </div>

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
