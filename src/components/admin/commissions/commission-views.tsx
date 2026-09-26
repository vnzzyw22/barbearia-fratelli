import Link from "next/link";
import { badgeClass } from "@/components/admin/theme";
import { formatBps, formatCents } from "@/lib/finance/money";
import { formatDayBR } from "@/lib/finance/period";
import type { PaymentMethod } from "@/lib/supabase/finance-types";
import type { CommissionReportRow, CommissionRow } from "@/lib/supabase/commission-queries";
import { ExpenseRowActions } from "@/components/admin/finance/expense-forms";
import { Empty, tableClass, tableWrapClass, tdClass, tdNumClass, thClass, thNumClass } from "@/components/admin/finance/ui";

export function StatusBadge({ status }: { status: "pending" | "paid" }) {
  return status === "paid" ? <span className={badgeClass("green")}>Paga</span> : <span className={badgeClass("amber")}>A pagar</span>;
}

function Stat({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex flex-col">
      <dt className="font-nav text-[10px] font-bold tracking-widest text-white/45 uppercase">{label}</dt>
      <dd className={`tabular-nums ${strong ? "text-lg font-bold text-white" : "text-sm text-white/85"}`}>{value}</dd>
    </div>
  );
}

// Quanto cada barbeiro atendeu, faturou e tem de comissão. Tabela no desktop, um cartão por barbeiro no celular.
export function CommissionReport({ rows, periodQuery }: { rows: CommissionReportRow[]; periodQuery: string }) {
  if (rows.length === 0) return <Empty>Nenhum profissional cadastrado.</Empty>;
  const total = rows.reduce(
    (t, r) => ({
      appointments: t.appointments + r.appointments,
      revenue: t.revenue + r.revenue_cents,
      commission: t.commission + r.commission_cents,
      pending: t.pending + r.pending_cents,
      paid: t.paid + r.paid_cents,
    }),
    { appointments: 0, revenue: 0, commission: 0, pending: 0, paid: 0 },
  );
  const rate = (r: CommissionReportRow) => (r.revenue_cents > 0 && r.commission_cents > 0 ? formatBps(Math.round((r.commission_cents / r.revenue_cents) * 10000)) : "—");

  return (
    <>
      <div className={`${tableWrapClass} hidden md:block`}>
        <table className={tableClass}>
          <thead>
            <tr>
              <th className={thClass}>Barbeiro</th>
              <th className={thNumClass}>Atendimentos</th>
              <th className={thNumClass}>Faturamento gerado</th>
              <th className={thNumClass}>Percentual médio</th>
              <th className={thNumClass}>Comissão</th>
              <th className={thNumClass}>A pagar</th>
              <th className={thNumClass}>Paga</th>
              <th className={thClass} />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.staff_id}>
                <td className={tdClass}>{r.staff_name}</td>
                <td className={tdNumClass}>{r.appointments}</td>
                <td className={tdNumClass}>{formatCents(r.revenue_cents)}</td>
                <td className={tdNumClass}>{rate(r)}</td>
                <td className={`${tdNumClass} font-bold text-white`}>{formatCents(r.commission_cents)}</td>
                <td className={`${tdNumClass} ${r.pending_cents > 0 ? "text-amber-300" : ""}`}>{formatCents(r.pending_cents)}</td>
                <td className={tdNumClass}>{formatCents(r.paid_cents)}</td>
                <td className={tdClass}>
                  <Link href={`/admin/comissoes?${periodQuery}&pf=${r.staff_id}#detalhe`} className="font-nav text-xs font-bold tracking-widest text-brand-red uppercase hover:text-white">
                    Detalhar
                  </Link>
                </td>
              </tr>
            ))}
            <tr>
              <td className={`${tdClass} font-bold text-white`}>Total</td>
              <td className={`${tdNumClass} font-bold`}>{total.appointments}</td>
              <td className={`${tdNumClass} font-bold`}>{formatCents(total.revenue)}</td>
              <td className={tdNumClass} />
              <td className={`${tdNumClass} font-bold text-white`}>{formatCents(total.commission)}</td>
              <td className={`${tdNumClass} font-bold`}>{formatCents(total.pending)}</td>
              <td className={`${tdNumClass} font-bold`}>{formatCents(total.paid)}</td>
              <td className={tdClass} />
            </tr>
          </tbody>
        </table>
      </div>

      <ul className="flex flex-col gap-3 md:hidden">
        {rows.map((r) => (
          <li key={r.staff_id} className="border border-white/10 bg-teal-deep p-4">
            <div className="flex items-baseline justify-between gap-3">
              <p className="font-nav text-sm font-bold tracking-widest text-white uppercase">{r.staff_name}</p>
              <Link href={`/admin/comissoes?${periodQuery}&pf=${r.staff_id}#detalhe`} className="font-nav text-xs font-bold tracking-widest text-brand-red uppercase">
                Detalhar
              </Link>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
              <Stat label="Atendimentos" value={String(r.appointments)} />
              <Stat label="Faturamento gerado" value={formatCents(r.revenue_cents)} />
              <Stat label="Comissão" value={formatCents(r.commission_cents)} strong />
              <Stat label="Percentual médio" value={rate(r)} />
              <Stat label="A pagar" value={formatCents(r.pending_cents)} />
              <Stat label="Paga" value={formatCents(r.paid_cents)} />
            </dl>
          </li>
        ))}
        <li className="border border-white/10 p-4">
          <p className="font-nav text-xs font-bold tracking-widest text-white/60 uppercase">Total do período</p>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
            <Stat label="Faturamento gerado" value={formatCents(total.revenue)} />
            <Stat label="Comissão" value={formatCents(total.commission)} strong />
            <Stat label="A pagar" value={formatCents(total.pending)} />
            <Stat label="Paga" value={formatCents(total.paid)} />
          </dl>
        </li>
      </ul>
    </>
  );
}

// Uma linha por atendimento com comissão. Pendente: pagar aqui mesmo (mesma ação da aba Despesas).
export function CommissionDetail({ rows, methods }: { rows: CommissionRow[]; methods: PaymentMethod[] }) {
  if (rows.length === 0) return <Empty>Nenhuma comissão neste período. Ela nasce quando um atendimento é concluído e existe uma regra de percentual.</Empty>;
  return (
    <>
      <div className={`${tableWrapClass} hidden md:block`}>
        <table className={tableClass}>
          <thead>
            <tr>
              <th className={thClass}>Data</th>
              <th className={thClass}>Barbeiro</th>
              <th className={thClass}>Serviço</th>
              <th className={thClass}>Cliente</th>
              <th className={thNumClass}>Valor</th>
              <th className={thNumClass}>%</th>
              <th className={thNumClass}>Comissão</th>
              <th className={thClass}>Situação</th>
              <th className={thClass} />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.commission_id}>
                <td className={tdClass}>{formatDayBR(r.competence_date)}</td>
                <td className={tdClass}>{r.staff_name ?? "—"}</td>
                <td className={tdClass}>{r.description}</td>
                <td className={tdClass}>{r.client_name ?? "—"}</td>
                <td className={tdNumClass}>{formatCents(r.base_cents)}</td>
                <td className={tdNumClass}>{formatBps(r.rate_bps)}</td>
                <td className={`${tdNumClass} font-bold text-white`}>{formatCents(r.amount_cents)}</td>
                <td className={tdClass}><StatusBadge status={r.status} /></td>
                <td className={tdClass}>
                  {r.status === "pending" && r.entry_id && (
                    <ExpenseRowActions id={r.entry_id} description={`Comissão — ${r.description}`} amountCents={r.amount_cents} methods={methods} />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="flex flex-col gap-3 md:hidden">
        {rows.map((r) => (
          <li key={r.commission_id} className="border border-white/10 bg-teal-deep p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-white">{r.description}</p>
                <p className="mt-0.5 text-xs text-white/50">
                  {formatDayBR(r.competence_date)} · {r.staff_name ?? "—"} · {r.client_name ?? "—"}
                </p>
              </div>
              <StatusBadge status={r.status} />
            </div>
            <dl className="mt-3 grid grid-cols-3 gap-3">
              <Stat label="Valor" value={formatCents(r.base_cents)} />
              <Stat label="Percentual" value={formatBps(r.rate_bps)} />
              <Stat label="Comissão" value={formatCents(r.amount_cents)} strong />
            </dl>
            {r.status === "pending" && r.entry_id && (
              <div className="mt-3 border-t border-white/10 pt-3">
                <ExpenseRowActions id={r.entry_id} description={`Comissão — ${r.description}`} amountCents={r.amount_cents} methods={methods} />
              </div>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
