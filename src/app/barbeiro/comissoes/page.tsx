import { StatusBadge } from "@/components/admin/commissions/commission-views";
import { Empty } from "@/components/admin/finance/ui";
import { PeriodBar } from "@/components/admin/period-bar";
import { pageSubtitleClass, pageTitleClass } from "@/components/admin/theme";
import { formatBps, formatCents } from "@/lib/finance/money";
import { formatDayBR, resolvePeriod } from "@/lib/finance/period";
import { getBarberCommissions, getBarberSummary } from "@/lib/supabase/commission-queries";

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function BarbeiroComissoesPage(props: PageProps<"/barbeiro/comissoes">) {
  const sp = await props.searchParams;
  const period = resolvePeriod({ p: first(sp.p), de: first(sp.de), ate: first(sp.ate) });
  const [summary, rows] = await Promise.all([
    getBarberSummary(period.from, period.to),
    getBarberCommissions(period.from, period.to),
  ]);

  return (
    <div>
      <h1 className={pageTitleClass}>Minhas comissões</h1>
      <p className={pageSubtitleClass}>
        {period.label}: {period.from === period.to ? formatDayBR(period.from) : `${formatDayBR(period.from)} a ${formatDayBR(period.to)}`}.
        Só aparecem atendimentos concluídos.
      </p>

      <div className="mt-6">
        <PeriodBar basePath="/barbeiro/comissoes" period={period} idPrefix="bar" />
      </div>

      {!summary ? (
        <div className="mt-6">
          <Empty>Não foi possível carregar agora. Recarregue a página.</Empty>
        </div>
      ) : (
        <section aria-label="Resumo" className="mt-6 grid grid-cols-2 gap-3">
          <div className="border border-white/10 bg-teal-deep p-4">
            <p className="text-xs text-white/50">Atendimentos</p>
            <p className="text-xl font-bold tabular-nums text-white">{summary.appointments}</p>
          </div>
          <div className="border border-white/10 bg-teal-deep p-4">
            <p className="text-xs text-white/50">Faturamento gerado</p>
            <p className="text-xl font-bold tabular-nums text-white">{formatCents(summary.revenue_cents)}</p>
          </div>
          <div className="col-span-2 border border-white/10 bg-teal-deep p-4">
            <p className="text-xs text-white/50">Comissão do período</p>
            <p className="text-2xl font-bold tabular-nums text-white">{formatCents(summary.commission_cents)}</p>
            <p className="mt-1 text-xs text-white/50">
              A receber {formatCents(summary.pending_cents)} · Já paga {formatCents(summary.paid_cents)}
            </p>
          </div>
        </section>
      )}

      <div className="mt-8">
        <h2 className="font-nav text-sm font-bold tracking-widest text-white uppercase">Atendimentos</h2>
        <div className="mt-3">
          {rows.length === 0 ? (
            <Empty>Nenhuma comissão neste período.</Empty>
          ) : (
            <ul className="flex flex-col gap-2">
              {rows.map((r, i) => (
                <li key={`${r.competence_date}-${i}`} className="border border-white/10 bg-teal-deep px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">{r.description}</p>
                      <p className="text-xs text-white/50">{formatDayBR(r.competence_date)} · {r.client_first_name ?? "Cliente"}</p>
                    </div>
                    <StatusBadge status={r.status} />
                  </div>
                  <p className="mt-2 text-sm tabular-nums text-white/70">
                    {formatCents(r.base_cents)} × {formatBps(r.rate_bps)} ={" "}
                    <strong className="text-base text-white">{formatCents(r.amount_cents)}</strong>
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
