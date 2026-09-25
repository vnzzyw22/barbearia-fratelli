import { formatCents } from "@/lib/finance/money";
import { formatDayBR } from "@/lib/finance/period";
import {
  METHOD_LABEL,
  type FinancialCategory,
  type FinancialEntry,
  type PaymentMethod,
  type RecurringExpense,
} from "@/lib/supabase/finance-types";
import { badgeClass } from "@/components/admin/theme";
import { todayISO } from "@/lib/date";
import { ExpenseForm, ExpenseRowActions, RecurringManager } from "./expense-forms";
import { Block, Empty, tableClass, tableWrapClass, tdClass, tdNumClass, thClass, thNumClass } from "./ui";

function StatusPill({ entry }: { entry: FinancialEntry }) {
  if (entry.status === "paid") return <span className={badgeClass("green")}>Paga</span>;
  if (entry.status === "cancelled") return <span className={badgeClass("neutral")}>Cancelada</span>;
  const overdue = entry.due_on !== null && entry.due_on < todayISO();
  return <span className={badgeClass(overdue ? "red" : "amber")}>{overdue ? "Vencida" : "Pendente"}</span>;
}

export function ExpensesTab({
  entries,
  categories,
  methods,
  recurring,
}: {
  entries: FinancialEntry[];
  categories: FinancialCategory[];
  methods: PaymentMethod[];
  recurring: RecurringExpense[];
}) {
  const expenseCategories = categories.filter((c) => c.kind === "expense");
  const counted = entries.filter((e) => e.status !== "cancelled");
  const total = counted.reduce((s, e) => s + e.amount_cents, 0);
  const pending = counted.filter((e) => e.status === "pending").reduce((s, e) => s + e.amount_cents, 0);

  return (
    <div className="flex flex-col gap-8">
      <Block title="Nova despesa" question="Lance o que a barbearia gastou ou vai pagar.">
        <ExpenseForm categories={expenseCategories} methods={methods} />
      </Block>

      <Block
        title="Despesas do período"
        question="Cada gasto por data, com o que já foi pago e o que ainda é conta a pagar."
        aside={
          <span className="text-sm text-white/60">
            Total <strong className="text-white">{formatCents(total)}</strong>
            {pending > 0 && <> · a pagar <strong className="text-amber-300">{formatCents(pending)}</strong></>}
          </span>
        }
      >
        {entries.length === 0 ? (
          <Empty>Nenhuma despesa neste período.</Empty>
        ) : (
          <div className={tableWrapClass}>
            <table className={tableClass}>
              <thead>
                <tr>
                  <th className={thClass}>Data</th>
                  <th className={thClass}>Descrição</th>
                  <th className={thClass}>Categoria</th>
                  <th className={thClass}>Vence</th>
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
                      {e.recurring_expense_id && <span className="ml-2 text-xs text-white/40">fixa</span>}
                      {e.commission_id && <span className="ml-2 text-xs text-white/40">comissão</span>}
                      {e.notes && <span className="block text-xs text-white/40">{e.notes}</span>}
                    </td>
                    <td className={tdClass}>{e.category?.name ?? "—"}</td>
                    <td className={tdClass}>{e.due_on ? formatDayBR(e.due_on) : "—"}</td>
                    <td className={tdNumClass}>{formatCents(e.amount_cents)}</td>
                    <td className={tdClass}>
                      <StatusPill entry={e} />
                      {e.status === "paid" && e.payment_method && (
                        <span className="ml-2 text-xs text-white/40">{METHOD_LABEL[e.payment_method]}</span>
                      )}
                    </td>
                    <td className={tdClass}>
                      {e.status === "pending" && (
                        <ExpenseRowActions id={e.id} description={e.description} amountCents={e.amount_cents} methods={methods} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Block>

      <Block
        title="Despesas fixas (recorrentes)"
        question="Cadastradas uma vez, lançadas automaticamente como pendentes quando o mês começa."
      >
        <RecurringManager items={recurring} categories={expenseCategories} />
      </Block>
    </div>
  );
}
