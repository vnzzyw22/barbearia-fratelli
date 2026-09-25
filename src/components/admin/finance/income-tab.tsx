import Link from "next/link";
import { formatCents } from "@/lib/finance/money";
import { formatDayBR } from "@/lib/finance/period";
import type { FinancialEntry, ReceivableRow } from "@/lib/supabase/finance-types";
import { Block, Empty, tableClass, tableWrapClass, tdClass, tdNumClass, thClass, thNumClass } from "./ui";

// Receitas nascem SÓ de atendimentos concluídos (nada de digitar de novo): cada linha aponta para a agenda.
export function IncomeTab({
  entries,
  receivables,
}: {
  entries: FinancialEntry[];
  receivables: ReceivableRow[];
}) {
  const active = entries.filter((e) => e.status !== "cancelled");
  const total = active.reduce((s, e) => s + e.amount_cents, 0);

  return (
    <div className="flex flex-col gap-8">
      <Block
        title="A receber"
        question="Atendimentos concluídos que ainda têm saldo em aberto. Registre o recebimento na agenda."
      >
        {receivables.length === 0 ? (
          <Empty>Nada a receber. Todos os atendimentos concluídos estão quitados.</Empty>
        ) : (
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
        question="De onde veio cada valor reconhecido (por data do atendimento)."
        aside={<span className="text-sm text-white/60">Total: <strong className="text-white">{formatCents(total)}</strong></span>}
      >
        {active.length === 0 ? (
          <Empty>Nenhuma receita neste período. Elas aparecem sozinhas quando você conclui um atendimento na agenda.</Empty>
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
                  <th className={thClass} />
                </tr>
              </thead>
              <tbody>
                {active.map((e) => (
                  <tr key={e.id}>
                    <td className={tdClass}>{formatDayBR(e.competence_date)}</td>
                    <td className={tdClass}>{e.description}</td>
                    <td className={tdClass}>{e.category?.name ?? "—"}</td>
                    <td className={tdClass}>{e.client?.name ?? "—"}</td>
                    <td className={tdClass}>{e.staff?.name ?? "—"}</td>
                    <td className={tdNumClass}>{formatCents(e.amount_cents)}</td>
                    <td className={tdClass}>
                      <Link href={`/admin/agenda?data=${e.competence_date}`} className="font-nav text-xs font-bold tracking-widest text-white/50 uppercase hover:text-white">
                        Ver na agenda
                      </Link>
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
