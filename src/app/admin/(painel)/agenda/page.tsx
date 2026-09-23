import { AgendaWeekView } from "@/components/admin/agenda-week-view";
import { pageSubtitleClass, pageTitleClass } from "@/components/admin/theme";
import { todayISO } from "@/lib/date";
import {
  getAllStaff,
  getAppointmentsForRange,
  getBlockedSlotsForRange,
} from "@/lib/supabase/admin-queries";
import { getActiveServices } from "@/lib/supabase/queries";

// Início da semana (domingo) que contém `dateISO` — mesmo padrão de
// aritmética de data em hora local já usado no projeto (ver `shiftDate`
// em agenda-view.tsx/finance-view.tsx antes do redesign).
function startOfWeekISO(dateISO: string) {
  const date = new Date(`${dateISO}T00:00:00`);
  date.setDate(date.getDate() - date.getDay());
  return date.toISOString().slice(0, 10);
}

function addDaysISO(dateISO: string, days: number) {
  const date = new Date(`${dateISO}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

export default async function AgendaPage(props: PageProps<"/admin/agenda">) {
  const searchParams = await props.searchParams;
  const dataParam = searchParams.data;
  const anchorISO =
    (Array.isArray(dataParam) ? dataParam[0] : dataParam) || todayISO();

  const weekStartISO = startOfWeekISO(anchorISO);
  const weekEndISO = addDaysISO(weekStartISO, 6);
  const isCurrentWeek = weekStartISO === startOfWeekISO(todayISO());

  const rangeStartISO = `${weekStartISO}T00:00:00-03:00`;
  const rangeEndISO = `${weekEndISO}T23:59:59-03:00`;

  const [appointments, blockedSlots, staff, services] = await Promise.all([
    getAppointmentsForRange(rangeStartISO, rangeEndISO),
    getBlockedSlotsForRange(rangeStartISO, rangeEndISO),
    getAllStaff(),
    getActiveServices(),
  ]);

  return (
    <div>
      <h1 className={pageTitleClass}>Agenda</h1>
      <p className={pageSubtitleClass}>
        Clique num horário pra ver os detalhes, confirmar, cancelar ou falar
        com o cliente no WhatsApp.
      </p>
      <AgendaWeekView
        weekStartISO={weekStartISO}
        isCurrentWeek={isCurrentWeek}
        appointments={appointments}
        blockedSlots={blockedSlots}
        staff={staff}
        services={services}
      />
    </div>
  );
}
