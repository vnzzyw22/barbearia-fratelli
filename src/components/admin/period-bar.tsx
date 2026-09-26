import Link from "next/link";
import { buttonSecondaryClass, fieldClass, filterButtonClass, labelClass } from "@/components/admin/theme";
import { PERIOD_OPTIONS, type Period } from "@/lib/finance/period";

// Seletor de período para telas fora do Financeiro (comissões, área do barbeiro).
// `keep` carrega outros filtros da URL (ex.: profissional) ao trocar de período.
export function PeriodBar({
  basePath,
  period,
  keep = {},
  idPrefix = "per",
}: {
  basePath: string;
  period: Period;
  keep?: Record<string, string | undefined>;
  idPrefix?: string;
}) {
  const extra = Object.entries(keep)
    .filter(([, v]) => v)
    .map(([k, v]) => `&${k}=${encodeURIComponent(v as string)}`)
    .join("");

  return (
    <div className="flex flex-wrap items-end gap-2">
      {PERIOD_OPTIONS.filter((o) => o.key !== "custom").map((o) => (
        <Link key={o.key} href={`${basePath}?p=${o.key}${extra}`} className={filterButtonClass(period.key === o.key)}>
          {o.label}
        </Link>
      ))}
      <form method="get" action={basePath} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="p" value="custom" />
        {Object.entries(keep).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
        <div className="flex flex-col gap-1">
          <label className={labelClass} htmlFor={`${idPrefix}-de`}>De</label>
          <input id={`${idPrefix}-de`} type="date" name="de" defaultValue={period.from} required className={fieldClass} />
        </div>
        <div className="flex flex-col gap-1">
          <label className={labelClass} htmlFor={`${idPrefix}-ate`}>Até</label>
          <input id={`${idPrefix}-ate`} type="date" name="ate" defaultValue={period.to} required className={fieldClass} />
        </div>
        <button type="submit" className={`${buttonSecondaryClass} ${period.key === "custom" ? "border-brand-red text-white" : ""}`}>
          Personalizado
        </button>
      </form>
    </div>
  );
}
