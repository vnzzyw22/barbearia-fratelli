import { FinanceView } from "@/components/admin/finance-view";
import { pageSubtitleClass, pageTitleClass } from "@/components/admin/theme";
import { currentMonthISO, shiftMonth } from "@/lib/date";
import { getTransactionsForRange } from "@/lib/supabase/admin-queries";

const TREND_MONTHS = 6;

function lastDayOfMonth(monthISO: string) {
  const [year, month] = monthISO.split("-").map(Number);
  return new Date(year, month, 0).getDate();
}

export default async function FinanceiroPage(
  props: PageProps<"/admin/financeiro">,
) {
  const searchParams = await props.searchParams;
  const mesParam = searchParams.mes;
  const monthISO =
    (Array.isArray(mesParam) ? mesParam[0] : mesParam) || currentMonthISO();

  // Busca os últimos TREND_MONTHS meses de uma vez (inclui o mês atual) --
  // dá pra montar tanto o extrato do mês selecionado quanto o gráfico de
  // tendência com uma query só.
  const firstTrendMonth = shiftMonth(monthISO, -(TREND_MONTHS - 1));
  const fromDateISO = `${firstTrendMonth}-01`;
  const toDateISO = `${monthISO}-${String(lastDayOfMonth(monthISO)).padStart(2, "0")}`;

  const rangeTransactions = await getTransactionsForRange(
    fromDateISO,
    toDateISO,
  );

  const transactions = rangeTransactions.filter(
    (t) => t.occurred_at.slice(0, 7) === monthISO,
  );

  const monthlyTotals = Array.from({ length: TREND_MONTHS }, (_, i) => {
    const month = shiftMonth(monthISO, -(TREND_MONTHS - 1) + i);
    const monthTx = rangeTransactions.filter(
      (t) => t.occurred_at.slice(0, 7) === month,
    );
    return {
      month,
      income: monthTx
        .filter((t) => t.type === "income")
        .reduce((sum, t) => sum + t.amount, 0),
      expense: monthTx
        .filter((t) => t.type === "expense")
        .reduce((sum, t) => sum + t.amount, 0),
    };
  });

  return (
    <div>
      <h1 className={pageTitleClass}>Financeiro</h1>
      <p className={pageSubtitleClass}>
        Entradas e saídas simples — não é um sistema contábil.
      </p>
      <FinanceView
        monthISO={monthISO}
        transactions={transactions}
        monthlyTotals={monthlyTotals}
      />
    </div>
  );
}
