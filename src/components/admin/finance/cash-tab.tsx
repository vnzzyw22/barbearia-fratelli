import { formatCents } from "@/lib/finance/money";
import {
  METHOD_LABEL,
  type CashMovement,
  type CashRegister,
} from "@/lib/supabase/finance-types";
import { CashMovementForm, CloseCashForm, OpenCashForm } from "./cash-controls";
import { Block, Empty, Kpi, tableClass, tableWrapClass, tdClass, tdNumClass, thClass, thNumClass } from "./ui";

const SOURCE_LABEL: Record<CashMovement["source"], string> = {
  payment: "Recebimento",
  refund: "Estorno",
  expense: "Despesa paga",
  manual: "Manual",
  adjustment: "Ajuste",
};

function dateTimeBR(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(iso));
}

export function CashTab({
  open,
  registers,
  movements,
  registerMovements,
  closedDiff,
}: {
  open: CashRegister | null;
  registers: CashRegister[];
  movements: CashMovement[];
  registerMovements: CashMovement[]; // movimentos do caixa aberto (para o esperado)
  closedDiff: number | null; // diferença do fechamento que acabou de acontecer
}) {
  const cashIn = registerMovements.filter((m) => m.method === "cash" && m.direction === "in").reduce((s, m) => s + m.amount_cents, 0);
  const cashOut = registerMovements.filter((m) => m.method === "cash" && m.direction === "out").reduce((s, m) => s + m.amount_cents, 0);
  const expected = open ? open.opening_balance_cents + cashIn - cashOut : 0;
  const closed = registers.filter((r) => r.status === "closed");

  return (
    <div className="flex flex-col gap-8">
      {closedDiff !== null && (
        <p
          role="status"
          className={`border p-4 text-sm ${closedDiff === 0 ? "border-green-500/40 text-green-400" : "border-amber-400/40 text-amber-300"}`}
        >
          Caixa fechado. {closedDiff === 0 ? "Sem diferença." : closedDiff > 0 ? `Sobrou ${formatCents(closedDiff)}.` : `Faltou ${formatCents(-closedDiff)}.`}
        </p>
      )}
      {open ? (
        <Block
          title="Caixa aberto"
          question={`Aberto em ${dateTimeBR(open.opened_at)}. O esperado considera só o dinheiro em espécie (Pix e cartão não passam pela gaveta).`}
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Kpi label="Troco inicial" value={formatCents(open.opening_balance_cents)} />
            <Kpi label="Entradas em dinheiro" value={formatCents(cashIn)} tone="positive" />
            <Kpi label="Saídas em dinheiro" value={formatCents(cashOut)} tone="negative" />
            <Kpi label="Esperado na gaveta" value={formatCents(expected)} />
          </div>
          <CashMovementForm />
          <CloseCashForm expectedCents={expected} />
        </Block>
      ) : (
        <Block
          title="Caixa fechado"
          question="Abra o caixa para receber ou pagar em dinheiro. Pix e cartão não exigem caixa aberto."
        >
          <OpenCashForm />
        </Block>
      )}

      <Block title="Movimentos do período" question="Toda entrada e saída de dinheiro. Nada é apagado: erros se corrigem com ajuste ou estorno.">
        {movements.length === 0 ? (
          <Empty>Nenhuma movimentação neste período.</Empty>
        ) : (
          <div className={tableWrapClass}>
            <table className={tableClass}>
              <thead>
                <tr>
                  <th className={thClass}>Quando</th>
                  <th className={thClass}>Origem</th>
                  <th className={thClass}>Forma</th>
                  <th className={thClass}>Descrição</th>
                  <th className={thNumClass}>Valor</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => (
                  <tr key={m.id}>
                    <td className={`${tdClass} whitespace-nowrap`}>{dateTimeBR(m.occurred_at)}</td>
                    <td className={tdClass}>{SOURCE_LABEL[m.source]}</td>
                    <td className={tdClass}>{METHOD_LABEL[m.method]}</td>
                    <td className={tdClass}>{m.payment?.client?.name ? `${m.payment.client.name}${m.source === "refund" ? " — " + (m.description ?? "") : ""}` : (m.description ?? "—")}</td>
                    <td className={`${tdNumClass} ${m.direction === "in" ? "text-green-400" : "text-red-400"}`}>
                      {m.direction === "in" ? "+" : "−"}{formatCents(m.amount_cents)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Block>

      <Block title="Caixas fechados" question="Esperado × contado × diferença de cada fechamento.">
        {closed.length === 0 ? (
          <Empty>Nenhum caixa foi fechado ainda.</Empty>
        ) : (
          <div className={tableWrapClass}>
            <table className={tableClass}>
              <thead>
                <tr>
                  <th className={thClass}>Aberto</th>
                  <th className={thClass}>Fechado</th>
                  <th className={thNumClass}>Esperado</th>
                  <th className={thNumClass}>Contado</th>
                  <th className={thNumClass}>Diferença</th>
                  <th className={thClass}>Obs.</th>
                </tr>
              </thead>
              <tbody>
                {closed.map((r) => (
                  <tr key={r.id}>
                    <td className={`${tdClass} whitespace-nowrap`}>{dateTimeBR(r.opened_at)}</td>
                    <td className={`${tdClass} whitespace-nowrap`}>{r.closed_at ? dateTimeBR(r.closed_at) : "—"}</td>
                    <td className={tdNumClass}>{formatCents(r.expected_cash_cents ?? 0)}</td>
                    <td className={tdNumClass}>{formatCents(r.counted_cash_cents ?? 0)}</td>
                    <td className={`${tdNumClass} ${(r.difference_cents ?? 0) === 0 ? "text-green-400" : "text-amber-300"}`}>
                      {formatCents(r.difference_cents ?? 0)}
                    </td>
                    <td className={tdClass}>{r.notes ?? ""}</td>
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
