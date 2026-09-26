import Link from "next/link";
import { badgeClass } from "@/components/admin/theme";
import { todayISO } from "@/lib/date";
import { formatCents } from "@/lib/finance/money";
import { formatDayBR, type Period } from "@/lib/finance/period";
import {
  METHOD_LABEL,
  type EntryFilters,
  type FinancialCategory,
  type FinancialEntry,
  type ManualReceivableRow,
  type PaymentMethod,
  type ReceivableRow,
} from "@/lib/supabase/finance-types";
import { EntryFilterBar } from "./entry-filters";
import { IncomeForm, IncomeRefund, IncomeRowActions } from "./income-forms";
import { Block, Empty, tableClass, tableWrapClass, tdClass, tdNumClass, thClass, thNumClass } from "./ui";

function StatusPill({ entry }: { entry: FinancialEntry }) {
  if (entry.status === "received") return <span className={badgeClass("green")}>Recebida</span>;
  if (entry.status === "cancelled") return <span className={badgeClass("neutral")}>Cancelada</span>;
  if (entry.status === "pending") {
    const overdue = entry.due_on !== null && entry.due_on < todayISO();
    return <span className={badgeClass(overdue ? "red" : "amber")}>{overdue ? "Vencida" : "A receber"}</span>;
  }
  return <span className={badgeClass("neutral")}>Atendimento</span>;
}

// Receita de atendimento nasce sozinha ao concluir na agenda (cada linha aponta para ela).
// Receita que NÃO vem da agenda (venda de produto, outras) é lançada aqui: "a receber" → "recebida".
export function IncomeTab({
  entries,
  receivables,
  manualReceivables,
  categories,
  methods,
  staff,
  period,
  filters,
}: {
  entries: FinancialEntry[];
  receivables: ReceivableRow[];
  manualReceivables: ManualReceivableRow[];
  categories: FinancialCategory[];
  methods: PaymentMethod[];
  staff: { id: string; name: string }[];
  period: Period;
  filters: EntryFilters;
}) {
  const total = entries.filter((e) => e.status !== "cancelled").reduce((s, e) => s + e.amount_cents, 0);
  const filtered = Boolean(filters.category || filters.status || filters.method || filters.staff);
  const nothingToReceive = receivables.length === 0 && manualReceivables.length === 0;

  return (
    <div className="flex flex-col gap-8">
      <Block title="Nova receita" question="Venda de produto ou outra entrada que não veio de um atendimento da agenda.">
        <IncomeForm categories={categories.filter((c) => c.kind === "income")} methods={methods} />
      </Block>

      <Block
        title="A receber"
        question="O que ainda vai entrar: atendimentos com saldo em aberto (receba na agenda) e receitas lançadas aqui."
      >
        {nothingToReceive && <Empty>Nada a receber. Tudo o que foi lançado já está quitado.</Empty>}

        {manualReceivables.length > 0 && (
          <div className={tableWrapClass}>
            <table className={tableClass}>
              <thead>
                <tr>
                  <th className={thClass}>Descrição</th>
                  <th className={thClass}>Categoria</th>
                  <th className={thClass}>Vence</th>
                  <th className={thNumClass}>Valor</th>
                  <th className={thClass} />
                </tr>
              </thead>
              <tbody>
                {manualReceivables.map((r) => (
                  <tr key={r.id}>
                    <td className={tdClass}>{r.description}</td>
                    <td className={tdClass}>{r.category_name}</td>
                    <td className={tdClass}>
                      {r.due_on ? formatDayBR(r.due_on) : "—"}
                      {r.overdue && <span className={`ml-2 ${badgeClass("red")}`}>Vencida</span>}
                    </td>
                    <td className={`${tdNumClass} font-bold text-amber-300`}>{formatCents(r.amount_cents)}</td>
                    <td className={tdClass}>
                      <IncomeRowActions id={r.id} description={r.description} amountCents={r.amount_cents} methods={methods} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {receivables.length > 0 && (
          <div className={tableWrapClass}>
            <table className={tableClass}>
              <thead>
                <tr>
                  <th className={thClass}>Atendimento</th>
                  <th className={thClass}>Cliente</th>
                  <th className={thNumClass}>Total</th>
                  <th className={thNumClass}>Recebido</th>
                  <th className={thNumClass}>Em aberto</th>
                  <th className={thClass} />
                </tr>
              </thead>
              <tbody>
                {receivables.map((r) => (
                  <tr key={r.appointment_id}>
                    <td className={tdClass}>{formatDayBR(r.service_date)}</td>
                    <td className={tdClass}>{r.client_name}</td>
                    <td className={tdNumClass}>{formatCents(r.total_cents)}</td>
                    <td className={tdNumClass}>{formatCents(r.paid_cents)}</td>
                    <td className={`${tdNumClass} font-bold text-amber-300`}>{formatCents(r.outstanding_cents)}</td>
                    <td className={tdClass}>
                      <Link href={`/admin/agenda?data=${r.service_date}`} className="font-nav text-xs font-bold tracking-widest text-brand-red uppercase hover:text-white">
                        Receber
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Block>

      <Block
        title="Receitas do período"
        question="De onde veio cada valor reconhecido (por data do atendimento ou da venda)."
        aside={<span className="text-sm text-white/60">Total: <strong className="text-white">{formatCents(total)}</strong></span>}
      >
        <EntryFilterBar tab="receitas" kind="income" period={period} filters={filters} categories={categories} methods={methods} staff={staff} />
        {entries.length === 0 ? (
          <Empty>
            {filtered
              ? "Nenhuma receita com esses filtros neste período."
              : "Nenhuma receita neste período. Elas aparecem sozinhas quando você conclui um atendimento na agenda."}
          </Empty>
        ) : (
          <div className={tableWrapClass}>
            <table className={tableClass}>
              <thead>
                <tr>
                  <th className={thClass}>Data</th>
                  <th className={thClass}>Descrição</th>
                  <th className={thClass}>Categoria</th>
                  <th className={thClass}>Cliente</th>
                  <th className={thClass}>Profissional</th>
                  <th className={thNumClass}>Valor</th>
                  <th className={thClass}>Situação</th>
                  <th className={thClass} />
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className={e.status === "cancelled" ? "opacity-40" : ""}>
                    <td className={tdClass}>{formatDayBR(e.competence_date)}</td>
                    <td className={tdClass}>
                      {e.description}
                      {e.notes && <span className="block text-xs text-white/40">{e.notes}</span>}
                    </td>
                    <td className={tdClass}>{e.category?.name ?? "—"}</td>
                    <td className={tdClass}>{e.client?.name ?? "—"}</td>
                    <td className={tdClass}>{e.staff?.name ?? "—"}</td>
                    <td className={tdNumClass}>{formatCents(e.amount_cents)}</td>
                    <td className={tdClass}>
                      <StatusPill entry={e} />
                      {e.status === "received" && e.payment_method && (
                        <span className="ml-2 text-xs text-white/40">{METHOD_LABEL[e.payment_method]}</span>
                      )}
                    </td>
                    <td className={tdClass}>
                      {!e.appointment_id && e.status === "received" && e.payment_method && (
                        <IncomeRefund id={e.id} description={e.description} amountCents={e.amount_cents} method={e.payment_method} />
                      )}
                      {e.appointment_id && (
                        <Link href={`/admin/agenda?data=${e.competence_date}`} className="font-nav text-xs font-bold tracking-widest text-white/50 uppercase hover:text-white">
                          Ver na agenda
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Block>
    </div>
  );
}
