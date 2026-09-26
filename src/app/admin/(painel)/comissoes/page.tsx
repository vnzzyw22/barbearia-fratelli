import { CommissionDetail, CommissionReport } from "@/components/admin/commissions/commission-views";
import { RulesManager } from "@/components/admin/commissions/rules-manager";
import { Block, Empty } from "@/components/admin/finance/ui";
import { PeriodBar } from "@/components/admin/period-bar";
import { pageSubtitleClass, pageTitleClass } from "@/components/admin/theme";
import { formatDayBR, resolvePeriod } from "@/lib/finance/period";
import { getAllServices, getAllStaff } from "@/lib/supabase/admin-queries";
import { getCommissionReport, getCommissionRules, getCommissions } from "@/lib/supabase/commission-queries";
import { getPaymentMethods, isOwner } from "@/lib/supabase/finance-queries";

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ComissoesPage(props: PageProps<"/admin/comissoes">) {
  const sp = await props.searchParams;

  if (!(await isOwner())) {
    return (
      <div>
        <h1 className={pageTitleClass}>Comissões</h1>
        <div className="mt-6">
          <Empty>Acesso restrito ao dono da barbearia.</Empty>
        </div>
      </div>
    );
  }

  const period = resolvePeriod({ p: first(sp.p), de: first(sp.de), ate: first(sp.ate) });
  const pfParam = first(sp.pf);
  const staffFilter = pfParam && UUID.test(pfParam) ? pfParam : undefined;
  const periodQuery = `p=${period.key}${period.key === "custom" ? `&de=${period.from}&ate=${period.to}` : ""}`;

  const [report, detail, rules, staff, services, methods] = await Promise.all([
    getCommissionReport(period.from, period.to),
    getCommissions(period.from, period.to, staffFilter),
    getCommissionRules(),
    getAllStaff(),
    getAllServices(),
    getPaymentMethods(),
  ]);
  const filteredName = staffFilter ? report.find((r) => r.staff_id === staffFilter)?.staff_name : undefined;

  return (
    <div>
      <h1 className={pageTitleClass}>Comissões</h1>
      <p className={pageSubtitleClass}>
        A comissão nasce quando o atendimento é concluído e vira despesa a pagar; ao pagar, passa a paga.
        Período: <strong className="text-white/80">{period.label}</strong> ({period.from === period.to ? formatDayBR(period.from) : `${formatDayBR(period.from)} a ${formatDayBR(period.to)}`}).
      </p>

      <div className="mt-6">
        <PeriodBar basePath="/admin/comissoes" period={period} keep={{ pf: staffFilter }} idPrefix="com" />
      </div>

      <div className="mt-8 flex flex-col gap-8">
        <Block title="Por barbeiro" question="Quanto cada um atendeu, faturou e tem de comissão neste período.">
          <CommissionReport rows={report} periodQuery={periodQuery} />
        </Block>

        <div id="detalhe" className="scroll-mt-6">
          <Block
            title={filteredName ? `Comissões de ${filteredName}` : "Comissões do período"}
            question="Cada atendimento com comissão. Pague as pendentes aqui."
            aside={
              staffFilter ? (
                <a href={`/admin/comissoes?${periodQuery}`} className="font-nav text-xs font-bold tracking-widest text-white/50 uppercase hover:text-white">
                  Ver todos
                </a>
              ) : undefined
            }
          >
            <CommissionDetail rows={detail} methods={methods} />
          </Block>
        </div>

        <Block
          title="Regras de percentual"
          question="Vale para atendimentos concluídos daqui em diante. Cada comissão guarda o percentual do momento."
        >
          <RulesManager
            rules={rules}
            staff={staff.map((s) => ({ id: s.id, name: s.name }))}
            services={services.map((s) => ({ id: s.id, name: s.name }))}
          />
        </Block>
      </div>
    </div>
  );
}
