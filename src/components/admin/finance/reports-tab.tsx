import { formatCents } from "@/lib/finance/money";
import { formatDayBR } from "@/lib/finance/period";
import {
  METHOD_LABEL,
  type ClientReportRow,
  type MethodReportRow,
  type ServiceReportRow,
  type StaffReportRow,
} from "@/lib/supabase/finance-types";
import { Block, Empty, tableClass, tableWrapClass, tdClass, tdNumClass, thClass, thNumClass } from "./ui";

// Cada relatório responde UMA pergunta do dono. Tabelas em vez de gráficos decorativos.

function HBar({ value, max }: { value: number; max: number }) {
  return (
    <div className="h-1.5 w-full bg-white/10" aria-hidden>
      <div className="h-full bg-brand-red/80" style={{ width: `${max > 0 ? Math.max(2, (value / max) * 100) : 0}%` }} />
    </div>
  );
}

export function ReportsTab({
  services,
  staff,
  methods,
  clients,
}: {
  services: ServiceReportRow[];
  staff: StaffReportRow[];
  methods: MethodReportRow[];
  clients: ClientReportRow[];
}) {
  const maxService = Math.max(0, ...services.map((s) => s.revenue_cents));
  const maxStaff = Math.max(0, ...staff.map((s) => s.revenue_cents));
  const returning = clients.filter((c) => c.is_returning).length;

  return (
    <div className="flex flex-col gap-8">
      <Block title="Serviços" question="Quais serviços mais vendem e quanto cada um rende?">
        {services.length === 0 ? (
          <Empty>Sem atendimentos concluídos neste período.</Empty>
        ) : (
          <div className={tableWrapClass}>
            <table className={tableClass}>
              <thead>
                <tr>
                  <th className={thClass}>Serviço</th>
                  <th className={thNumClass}>Qtde</th>
                  <th className={thNumClass}>Receita</th>
                  <th className={thNumClass}>Ticket médio</th>
                  <th className={`${thClass} w-40`} />
                </tr>
              </thead>
              <tbody>
                {services.map((s) => (
                  <tr key={s.service_name}>
                    <td className={tdClass}>{s.service_name}</td>
                    <td className={tdNumClass}>{s.quantity}</td>
                    <td className={tdNumClass}>{formatCents(s.revenue_cents)}</td>
                    <td className={tdNumClass}>{formatCents(s.avg_ticket_cents)}</td>
                    <td className={tdClass}><HBar value={s.revenue_cents} max={maxService} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Block>

      <Block title="Profissionais" question="Quanto cada barbeiro atendeu e faturou? (comissão só aparece se houver regra cadastrada)">
        {staff.length === 0 ? (
          <Empty>Sem atendimentos concluídos neste período.</Empty>
        ) : (
          <div className={tableWrapClass}>
            <table className={tableClass}>
              <thead>
                <tr>
                  <th className={thClass}>Profissional</th>
                  <th className={thNumClass}>Atendimentos</th>
                  <th className={thNumClass}>Receita</th>
                  <th className={thNumClass}>Comissão</th>
                  <th className={thNumClass}>Ticket médio</th>
                  <th className={`${thClass} w-40`} />
                </tr>
              </thead>
              <tbody>
                {staff.map((s) => (
                  <tr key={s.staff_id ?? "sem"}>
                    <td className={tdClass}>{s.staff_name ?? "Sem profissional"}</td>
                    <td className={tdNumClass}>{s.appointments}</td>
                    <td className={tdNumClass}>{formatCents(s.revenue_cents)}</td>
                    <td className={tdNumClass}>{s.commission_cents > 0 ? formatCents(s.commission_cents) : "—"}</td>
                    <td className={tdNumClass}>{formatCents(s.avg_ticket_cents)}</td>
                    <td className={tdClass}><HBar value={s.revenue_cents} max={maxStaff} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Block>

      <Block title="Formas de pagamento" question="Como os clientes pagam e quanto as taxas custaram?">
        {methods.length === 0 ? (
          <Empty>Sem pagamentos neste período.</Empty>
        ) : (
          <div className={tableWrapClass}>
            <table className={tableClass}>
              <thead>
                <tr>
                  <th className={thClass}>Forma</th>
                  <th className={thNumClass}>Pagamentos</th>
                  <th className={thNumClass}>Bruto</th>
                  <th className={thNumClass}>Taxas</th>
                  <th className={thNumClass}>Líquido</th>
                  <th className={thNumClass}>Estornado</th>
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
                    <td className={tdNumClass}>{m.refunded_cents > 0 ? formatCents(m.refunded_cents) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Block>

      <Block
        title="Clientes"
        question="Quem mais volta e quanto deixa na barbearia?"
        aside={clients.length > 0 ? <span className="text-sm text-white/60">{returning} de {clients.length} já voltaram</span> : undefined}
      >
        {clients.length === 0 ? (
          <Empty>Sem atendimentos concluídos neste período.</Empty>
        ) : (
          <div className={tableWrapClass}>
            <table className={tableClass}>
              <thead>
                <tr>
                  <th className={thClass}>Cliente</th>
                  <th className={thNumClass}>Visitas</th>
                  <th className={thNumClass}>Receita</th>
                  <th className={thNumClass}>Ticket médio</th>
                  <th className={thClass}>Última visita</th>
                  <th className={thClass}>Retorno</th>
                </tr>
              </thead>
              <tbody>
                {clients.slice(0, 30).map((c) => (
                  <tr key={c.client_id}>
                    <td className={tdClass}>{c.client_name}</td>
                    <td className={tdNumClass}>{c.visits}</td>
                    <td className={tdNumClass}>{formatCents(c.revenue_cents)}</td>
                    <td className={tdNumClass}>{formatCents(c.avg_ticket_cents)}</td>
                    <td className={tdClass}>{formatDayBR(c.last_visit)}</td>
                    <td className={tdClass}>{c.is_returning ? "Recorrente" : "Novo"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {clients.length > 30 && <p className="text-xs text-white/40">Mostrando os 30 maiores de {clients.length}.</p>}
      </Block>
    </div>
  );
}
