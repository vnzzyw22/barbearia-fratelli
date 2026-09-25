import { CashTab } from "@/components/admin/finance/cash-tab";
import { ExpensesTab } from "@/components/admin/finance/expenses-tab";
import { FINANCE_TABS, FinanceNav, type FinanceTabKey } from "@/components/admin/finance/finance-nav";
import { IncomeTab } from "@/components/admin/finance/income-tab";
import { OverviewTab, periodCaption } from "@/components/admin/finance/overview-tab";
import { ReportsTab } from "@/components/admin/finance/reports-tab";
import { SettingsTab } from "@/components/admin/finance/settings-tab";
import { Empty } from "@/components/admin/finance/ui";
import { pageSubtitleClass, pageTitleClass } from "@/components/admin/theme";
import { todayISO } from "@/lib/date";
import { resolvePeriod } from "@/lib/finance/period";
import {
  generateRecurringExpenses,
  getCashFlow,
  getCashMovements,
  getCategories,
  getClientReport,
  getEntries,
  getFinanceSummary,
  getMethodReport,
  getOpenCashRegister,
  getPaymentMethods,
  getReceivables,
  getRecentCashRegisters,
  getRecurringExpenses,
  getRegisterMovements,
  getServiceReport,
  getStaffReport,
  isOwner,
} from "@/lib/supabase/finance-queries";

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function FinanceiroPage(props: PageProps<"/admin/financeiro">) {
  const sp = await props.searchParams;

  if (!(await isOwner())) {
    return (
      <div>
        <h1 className={pageTitleClass}>Financeiro</h1>
        <div className="mt-6">
          <Empty>Acesso restrito ao dono da barbearia.</Empty>
        </div>
      </div>
    );
  }

  const tabParam = first(sp.aba);
  const tab: FinanceTabKey = FINANCE_TABS.some((t) => t.key === tabParam) ? (tabParam as FinanceTabKey) : "geral";
  const period = resolvePeriod({ p: first(sp.p), de: first(sp.de), ate: first(sp.ate) });
  const fromISO = `${period.from}T00:00:00-03:00`;
  const toISO = `${period.to}T23:59:59.999-03:00`;

  // Despesas fixas do mês corrente: geradas ao abrir o financeiro (idempotente — 1 por modelo por mês).
  if (tab === "geral" || tab === "despesas") {
    await generateRecurringExpenses(todayISO());
  }

  let content: React.ReactNode;

  if (tab === "geral") {
    const [summary, cashFlow, methods] = await Promise.all([
      getFinanceSummary(period.from, period.to),
      getCashFlow(period.from, period.to),
      getMethodReport(period.from, period.to),
    ]);
    content = <OverviewTab summary={summary} cashFlow={cashFlow} methods={methods} />;
  } else if (tab === "receitas") {
    const [entries, receivables] = await Promise.all([
      getEntries("income", period.from, period.to),
      getReceivables(),
    ]);
    content = <IncomeTab entries={entries} receivables={receivables} />;
  } else if (tab === "despesas") {
    const [entries, categories, methods, recurring] = await Promise.all([
      getEntries("expense", period.from, period.to),
      getCategories(),
      getPaymentMethods(),
      getRecurringExpenses(),
    ]);
    content = <ExpensesTab entries={entries} categories={categories} methods={methods} recurring={recurring} />;
  } else if (tab === "caixa") {
    const [open, registers, movements] = await Promise.all([
      getOpenCashRegister(),
      getRecentCashRegisters(),
      getCashMovements(fromISO, toISO),
    ]);
    const registerMovements = open ? await getRegisterMovements(open.id) : [];
    const closedParam = first(sp.fechado);
    const closedDiff = closedParam !== undefined && /^-?\d+$/.test(closedParam) ? Number(closedParam) : null;
    content = (
      <CashTab
        open={open}
        registers={registers}
        movements={movements}
        registerMovements={registerMovements}
        closedDiff={closedDiff}
      />
    );
  } else if (tab === "relatorios") {
    const [services, staff, methods, clients] = await Promise.all([
      getServiceReport(period.from, period.to),
      getStaffReport(period.from, period.to),
      getMethodReport(period.from, period.to),
      getClientReport(period.from, period.to),
    ]);
    content = <ReportsTab services={services} staff={staff} methods={methods} clients={clients} />;
  } else {
    const [categories, methods] = await Promise.all([getCategories(), getPaymentMethods()]);
    content = <SettingsTab categories={categories} methods={methods} />;
  }

  const usesPeriod = FINANCE_TABS.find((t) => t.key === tab)?.usesPeriod;

  return (
    <div>
      <h1 className={pageTitleClass}>Financeiro</h1>
      <p className={pageSubtitleClass}>
        Receita não é lucro: aqui você vê o que foi faturado, o que sobrou e o que realmente entrou no caixa.
        {usesPeriod && <> Período: <strong className="text-white/80">{period.label}</strong> ({periodCaption(period.from, period.to)}).</>}
      </p>
      <FinanceNav tab={tab} period={period} />
      <div className="mt-6">{content}</div>
    </div>
  );
}
