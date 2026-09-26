import Link from "next/link";
import { badgeClass, pageSubtitleClass, pageTitleClass } from "@/components/admin/theme";
import { Empty } from "@/components/admin/finance/ui";
import { todayISO } from "@/lib/date";
import { formatCents } from "@/lib/finance/money";
import { formatDayBR, resolvePeriod } from "@/lib/finance/period";
import { getBarberAgenda, getBarberSummary, type BarberAgendaRow } from "@/lib/supabase/commission-queries";

const TZ = "America/Sao_Paulo";

const STATUS: Record<string, { label: string; tone: "amber" | "green" | "red" | "neutral" }> = {
  pending: { label: "Pendente", tone: "amber" },
  confirmed: { label: "Confirmado", tone: "green" },
  in_progress: { label: "Em atendimento", tone: "amber" },
  completed: { label: "Concluído", tone: "neutral" },
  cancelled: { label: "Cancelado", tone: "red" },
  no_show: { label: "Faltou", tone: "red" },
};

const localDate = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(iso));
const localTime = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

function addDays(dateISO: string, days: number) {
  const d = new Date(`${dateISO}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export default async function BarbeiroAgendaPage() {
  const today = todayISO();
  const month = resolvePeriod({ p: "mes" });
  const [agenda, summary] = await Promise.all([
    getBarberAgenda(today, addDays(today, 13)),
    getBarberSummary(month.from, month.to),
  ]);

  const byDay = new Map<string, BarberAgendaRow[]>();
  for (const a of agenda) {
    const day = localDate(a.starts_at);
    byDay.set(day, [...(byDay.get(day) ?? []), a]);
  }

  return (
    <div>
      <h1 className={pageTitleClass}>Minha agenda</h1>
      <p className={pageSubtitleClass}>Seus atendimentos dos próximos 14 dias.</p>

      {summary && (
        <section aria-label="Resumo do mês" className="mt-6 border border-white/10 bg-teal-deep p-4">
          <p className="font-nav text-[11px] font-bold tracking-widest text-white/50 uppercase">Este mês</p>
          <dl className="mt-3 grid grid-cols-3 gap-3">
            <div>
              <dt className="text-xs text-white/50">Atendimentos</dt>
              <dd className="text-lg font-bold tabular-nums text-white">{summary.appointments}</dd>
            </div>
            <div>
              <dt className="text-xs text-white/50">Faturamento gerado</dt>
              <dd className="text-lg font-bold tabular-nums text-white">{formatCents(summary.revenue_cents)}</dd>
            </div>
            <div>
              <dt className="text-xs text-white/50">Minha comissão</dt>
              <dd className="text-lg font-bold tabular-nums text-white">{formatCents(summary.commission_cents)}</dd>
            </div>
          </dl>
          <Link href="/barbeiro/comissoes" className="mt-3 inline-block font-nav text-xs font-bold tracking-widest text-brand-red uppercase hover:text-white">
            Ver comissões
          </Link>
        </section>
      )}

      <div className="mt-8 flex flex-col gap-6">
        {agenda.length === 0 ? (
          <Empty>Nenhum atendimento marcado para os próximos 14 dias.</Empty>
        ) : (
          [...byDay.entries()].map(([day, items]) => (
            <section key={day} aria-label={formatDayBR(day)}>
              <h2 className="font-nav text-sm font-bold tracking-widest text-white uppercase">
                {day === today ? "Hoje" : formatDayBR(day)}
                <span className="ml-2 text-xs font-normal text-white/40 normal-case">
                  {new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, weekday: "long" }).format(new Date(`${day}T12:00:00Z`))}
                </span>
              </h2>
              <ul className="mt-2 flex flex-col gap-2">
                {items.map((a) => {
                  const st = STATUS[a.status] ?? { label: a.status, tone: "neutral" as const };
                  return (
                    <li key={a.appointment_id} className="flex items-center gap-4 border border-white/10 bg-teal-deep px-4 py-3">
                      <span className="w-14 shrink-0 text-lg font-bold tabular-nums text-white">{localTime(a.starts_at)}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-white">{a.service_name ?? "Serviço"}</span>
                        <span className="block truncate text-xs text-white/50">{a.client_first_name ?? "Cliente"}</span>
                      </span>
                      <span className={badgeClass(st.tone)}>{st.label}</span>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        )}
      </div>
    </div>
  );
}
