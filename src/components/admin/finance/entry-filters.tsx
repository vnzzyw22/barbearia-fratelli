import Link from "next/link";
import { buttonPrimaryClass, fieldClass, labelClass } from "@/components/admin/theme";
import type { Period } from "@/lib/finance/period";
import { METHOD_LABEL, type EntryFilters, type FinancialCategory, type PaymentMethod } from "@/lib/supabase/finance-types";

const STATUS_OPTIONS = {
  income: [
    { value: "recognized", label: "De atendimento" },
    { value: "pending", label: "A receber" },
    { value: "received", label: "Recebida" },
    { value: "cancelled", label: "Cancelada" },
  ],
  expense: [
    { value: "pending", label: "Pendente" },
    { value: "paid", label: "Paga" },
    { value: "cancelled", label: "Cancelada" },
  ],
} as const;

// Filtros via GET (URL compartilhável, funciona sem JS). Só os que respondem a uma pergunta real:
// categoria, situação, forma de pagamento e — nas receitas — profissional.
export function EntryFilterBar({
  tab,
  kind,
  period,
  filters,
  categories,
  methods,
  staff,
}: {
  tab: "receitas" | "despesas";
  kind: "income" | "expense";
  period: Period;
  filters: EntryFilters;
  categories: FinancialCategory[];
  methods: PaymentMethod[];
  staff?: { id: string; name: string }[];
}) {
  const active = Boolean(filters.category || filters.status || filters.method || filters.staff);
  const clearHref = `/admin/financeiro?aba=${tab}&p=${period.key}${period.key === "custom" ? `&de=${period.from}&ate=${period.to}` : ""}`;

  return (
    <form method="get" action="/admin/financeiro" className="flex flex-wrap items-end gap-3 border border-white/10 p-3">
      <input type="hidden" name="aba" value={tab} />
      <input type="hidden" name="p" value={period.key} />
      {period.key === "custom" && (
        <>
          <input type="hidden" name="de" value={period.from} />
          <input type="hidden" name="ate" value={period.to} />
        </>
      )}
      <label className="flex min-w-36 flex-1 flex-col gap-1">
        <span className={labelClass}>Categoria</span>
        <select name="cat" defaultValue={filters.category ?? ""} className={fieldClass}>
          <option value="">Todas</option>
          {categories.filter((c) => c.kind === kind).map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </label>
      <label className="flex min-w-36 flex-1 flex-col gap-1">
        <span className={labelClass}>Situação</span>
        <select name="st" defaultValue={filters.status ?? ""} className={fieldClass}>
          <option value="">Todas</option>
          {STATUS_OPTIONS[kind].map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </label>
      <label className="flex min-w-36 flex-1 flex-col gap-1">
        <span className={labelClass}>Forma de pagamento</span>
        <select name="mt" defaultValue={filters.method ?? ""} className={fieldClass}>
          <option value="">Todas</option>
          {methods.map((m) => (
            <option key={m.code} value={m.code}>{METHOD_LABEL[m.code] ?? m.name}</option>
          ))}
        </select>
      </label>
      {staff && (
        <label className="flex min-w-36 flex-1 flex-col gap-1">
          <span className={labelClass}>Profissional</span>
          <select name="pf" defaultValue={filters.staff ?? ""} className={fieldClass}>
            <option value="">Todos</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </label>
      )}
      <div className="flex items-center gap-3">
        <button type="submit" className={buttonPrimaryClass}>Filtrar</button>
        {active && (
          <Link href={clearHref} className="font-nav text-xs font-bold tracking-widest text-white/50 uppercase hover:text-white">
            Limpar
          </Link>
        )}
      </div>
    </form>
  );
}
