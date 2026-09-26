import { formatCents } from "@/lib/finance/money";
import { formatDayBR } from "@/lib/finance/period";
import {
  METHOD_LABEL,
  type CashFlow,
  type FinanceSummary,
  type MethodReportRow,
} from "@/lib/supabase/finance-types";
import { Block, Empty, Kpi, tableClass, tableWrapClass, tdClass, tdNumClass, thClass, thNumClass } from "./ui";

// Barras por dia do CAIXA (quando o dinheiro entrou e saiu) — não é o resultado.
function DailyBars({ daily }: { daily: CashFlow["daily"] }) {
  const max = Math.max(1, ...daily.map((d) => Math.max(d.in_cents ?? 0, d.out_cents ?? 0)));
  return (
    <div className="flex items-end gap-2 overflow-x-auto border border-white/10 p-4" role="img"
      aria-label="Entradas e saídas de caixa por dia">
      {daily.map((d) => (
        <div key={d.date} className="flex min-w-10 flex-1 flex-col items-center gap-1.5">
          <div className="flex h-32 items-end gap-1">
            <div
              title={`Entrou ${formatCents(d.in_cents ?? 0)}`}
              className="w-3 bg-green-500/70"
              style={{ height: `${Math.max(2, ((d.in_cents ?? 0) / max) * 100)}%` }}
            />
            <div
              title={`Saiu ${formatCents(d.out_cents ?? 0)}`}
              className="w-3 bg-red-400/70"
              style={{ height: `${Math.max(2, ((d.out_cents ?? 0) / max) * 100)}%` }}
            />
          </div>
          <span className="text-[10px] text-white/45">{d.date.slice(8, 10)}/{d.date.slice(5, 7)}</span>
        </div>
      ))}
    </div>
  );
}

export function OverviewTab({
  summary,
  cashFlow,
  methods,
}: {
  summary: FinanceSummary | null;
  cashFlow: CashFlow | null;
  methods: MethodReportRow[];
}) {
  if (!summary || !cashFlow) {
    return <Empty>Não foi possível carregar o resumo agora. Recarregue a página; se persistir, avise o suporte.</Empty>;
  }
  const cashTone = summary.cash_result_cents < 0 ? "negative" : "positive";
  const accrualTone = summary.result_cents < 0 ? "negative" : "positive";

  return (
    <div className="flex flex-col gap-8">
      <Block
        title="Resultado do período"
        question="Quanto realmente entrou e saiu: recebido menos pago no período."
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Kpi label="Recebido" value={formatCents(summary.received_cents)} tone="positive" hint="Pagamentos recebidos, já com estornos descontados" />
          <Kpi label="Pago" value={formatCents(summary.paid_cents)} tone="negative" hint="Despesas efetivamente pagas (inclui taxas e comissões)" />
          <Kpi label="Resultado de caixa" value={formatCents(summary.cash_result_cents)} tone={cashTone} hint="Recebido − pago" />
        </div>
      </Block>

      <Block
        title="Competência"
        question="O que foi feito e gasto no período, mesmo que ainda não tenha sido recebido ou pago. Receita não é lucro."
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Kpi label="Receita" value={formatCents(summary.revenue_cents)} hint="Serviços e vendas do período" />
          <Kpi label="Despesas" value={formatCents(summary.expenses_cents)} hint="Lançadas no período, inclui pendentes" />
          <Kpi label="Resultado por competência" value={formatCents(summary.result_cents)} tone={accrualTone} hint="Receita − despesas lançadas" />
        </div>
      </Block>

      <Block
        title="Caixa"
        question="Quanto dinheiro realmente entrou e saiu (já descontadas as taxas de cartão)."
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Kpi label="Entrou" value={formatCents(summary.cash_in_cents)} />
          <Kpi label="Saiu" value={formatCents(summary.cash_out_cents)} />
          <Kpi label="Saldo acumulado" value={formatCents(cashFlow.closing_cents)} hint={`Início do período: ${formatCents(cashFlow.opening_cents)}`} />
        </div>
        {cashFlow.daily.length > 0 ? (
          <DailyBars daily={cashFlow.daily} />
        ) : (
          <Empty>Nenhuma movimentação de caixa neste período.</Empty>
        )}
      </Block>

      <Block title="Pendências" question="O que ainda vai entrar e o que ainda precisa ser pago.">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Kpi label="A receber" value={formatCents(summary.receivable_cents)} tone={summary.receivable_cents > 0 ? "warning" : "neutral"} hint={summary.receivable_overdue_cents > 0 ? `${formatCents(summary.receivable_overdue_cents)} vencido` : "Atendimentos em aberto e receitas lançadas"} />
          <Kpi label="A pagar" value={formatCents(summary.payable_cents)} tone={summary.payable_cents > 0 ? "warning" : "neutral"} hint={summary.overdue_payable_cents > 0 ? `${formatCents(summary.overdue_payable_cents)} vencido` : "Nada vencido"} />
          <Kpi
            label="Atendimentos"
            value={String(summary.appointments_completed)}
            hint={`${summary.appointments_no_show} falta(s) · ${summary.appointments_cancelled} cancelado(s)`}
          />
        </div>
      </Block>

      <Block title="Por forma de pagamento" question="Como os clientes pagaram e quanto ficou depois das taxas.">
        {methods.length === 0 ? (
          <Empty>Nenhum pagamento neste período.</Empty>
        ) : (
          <div className={tableWrapClass}>
            <table className={tableClass}>
              <thead>
                <tr>
                  <th className={thClass}>Forma</th>
                  <th className={thNumClass}>Pagamentos</th>
                  <th className={thNumClass}>Bruto</th>
                  <th className={thNumClass}>Taxa</th>
                  <th className={thNumClass}>Líquido</th>
                </tr>
              </thead>
              <tbody>
                {methods.map((m) => (
                  <tr key={m.method}>
                    <td className={tdClass}>{METHOD_LABEL[m.method]}</td>
                    <td className={tdNumClass}>{m.payments}</td>
                    <td className={tdNumClass}>{formatCents(m.gross_cents)}</td>
                    <td className={tdNumClass}>{formatCents(m.fee_cents)}</td>
                    <td className={tdNumClass}>{formatCents(m.net_cents)}</td>
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

export function periodCaption(from: string, to: string) {
  return from === to ? formatDayBR(from) : `${formatDayBR(from)} a ${formatDayBR(to)}`;
}
