import Link from "next/link";
import { filterButtonClass, fieldClass, buttonSecondaryClass, labelClass } from "@/components/admin/theme";
import { PERIOD_OPTIONS, type Period } from "@/lib/finance/period";

export const FINANCE_TABS = [
  { key: "geral", label: "Visão geral", usesPeriod: true },
  { key: "receitas", label: "Receitas", usesPeriod: true },
  { key: "despesas", label: "Despesas", usesPeriod: true },
  { key: "caixa", label: "Caixa", usesPeriod: true },
  { key: "relatorios", label: "Relatórios", usesPeriod: true },
  { key: "ajustes", label: "Ajustes", usesPeriod: false },
] as const;

export type FinanceTabKey = (typeof FINANCE_TABS)[number]["key"];

export function FinanceNav({ tab, period }: { tab: FinanceTabKey; period: Period }) {
  const usesPeriod = FINANCE_TABS.find((t) => t.key === tab)?.usesPeriod ?? false;

  return (
    <div className="mt-6 flex flex-col gap-4">
      <nav aria-label="Seções do financeiro" className="flex flex-wrap gap-2 border-b border-white/10 pb-3">
        {FINANCE_TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin/financeiro?aba=${t.key}${t.usesPeriod ? `&p=${period.key}${period.key === "custom" ? `&de=${period.from}&ate=${period.to}` : ""}` : ""}`}
            aria-current={t.key === tab ? "page" : undefined}
            className={filterButtonClass(t.key === tab)}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {usesPeriod && (
        <div className="flex flex-wrap items-end gap-2">
          {PERIOD_OPTIONS.filter((o) => o.key !== "custom").map((o) => (
            <Link key={o.key} href={`/admin/financeiro?aba=${tab}&p=${o.key}`} className={filterButtonClass(period.key === o.key)}>
              {o.label}
            </Link>
          ))}
          <form method="get" action="/admin/financeiro" className="flex flex-wrap items-end gap-2">
            <input type="hidden" name="aba" value={tab} />
            <input type="hidden" name="p" value="custom" />
            <div className="flex flex-col gap-1">
              <label className={labelClass} htmlFor="fin-de">De</label>
              <input id="fin-de" type="date" name="de" defaultValue={period.from} required className={fieldClass} />
            </div>
            <div className="flex flex-col gap-1">
              <label className={labelClass} htmlFor="fin-ate">Até</label>
              <input id="fin-ate" type="date" name="ate" defaultValue={period.to} required className={fieldClass} />
            </div>
            <button type="submit" className={`${buttonSecondaryClass} ${period.key === "custom" ? "border-brand-red text-white" : ""}`}>
              Personalizado
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
