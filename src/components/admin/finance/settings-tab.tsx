"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  createCategory,
  setCategoryActive,
  updatePaymentMethod,
} from "@/app/admin/(painel)/financeiro/actions";
import { buttonPrimaryClass, buttonSecondaryClass, fieldClass, labelClass } from "@/components/admin/theme";
import { bpsToInput, parsePercentToBps } from "@/lib/finance/money";
import { METHOD_LABEL, type FinancialCategory, type PaymentMethod } from "@/lib/supabase/finance-types";
import { Block } from "./ui";

function MethodRow({ method }: { method: PaymentMethod }) {
  const router = useRouter();
  const [fee, setFee] = useState(bpsToInput(method.fee_bps));
  const [days, setDays] = useState(String(method.settlement_days));
  const [active, setActive] = useState(method.active);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function save() {
    const bps = parsePercentToBps(fee);
    if (bps === null) return setMsg({ ok: false, text: "Taxa inválida (0 a 100%)." });
    setBusy(true);
    setMsg(null);
    const r = await updatePaymentMethod(method.code, { feeBps: bps, settlementDays: Number(days) || 0, active });
    setBusy(false);
    if (r.ok) {
      setMsg({ ok: true, text: "Salvo." });
      router.refresh();
    } else setMsg({ ok: false, text: r.error });
  }

  return (
    <div className="flex flex-wrap items-end gap-3 border-b border-white/10 px-3 py-3 last:border-b-0">
      <span className="min-w-28 flex-1 text-sm text-white">{METHOD_LABEL[method.code] ?? method.name}</span>
      <div className="flex flex-col gap-1.5">
        <label className={labelClass}>Taxa (%)</label>
        <input inputMode="decimal" value={fee} onChange={(e) => setFee(e.target.value)} className={`${fieldClass} w-24 text-right`} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className={labelClass}>Recebe em (dias)</label>
        <input inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value)} className={`${fieldClass} w-24 text-right`} />
      </div>
      <label className="flex items-center gap-2 pb-2 text-sm text-white/70">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Ativa
      </label>
      <button type="button" disabled={busy} onClick={save} className={buttonSecondaryClass}>Salvar</button>
      {msg && <span role="status" className={`text-xs ${msg.ok ? "text-green-400" : "text-red-400"}`}>{msg.text}</span>}
    </div>
  );
}

function CategoryList({ kind, items }: { kind: "income" | "expense"; items: FinancialCategory[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [fixed, setFixed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const r = await createCategory(kind, name, fixed);
    setBusy(false);
    if (r.ok) {
      setName("");
      router.refresh();
    } else setError(r.error);
  }

  async function toggle(c: FinancialCategory) {
    setBusy(true);
    const r = await setCategoryActive(c.id, !c.active);
    setBusy(false);
    if (r.ok) router.refresh();
    else setError(r.error);
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-wrap gap-2">
        {items.map((c) => (
          <li key={c.id} className={`flex items-center gap-2 border px-3 py-1.5 text-sm ${c.active ? "border-white/15 text-white/85" : "border-white/5 text-white/30 line-through"}`}>
            {c.name}{c.is_fixed && <span className="text-xs text-white/40">fixa</span>}
            <button type="button" disabled={busy} onClick={() => toggle(c)} className="font-nav text-[10px] font-bold tracking-widest text-white/40 uppercase hover:text-brand-red">
              {c.active ? "Ocultar" : "Mostrar"}
            </button>
          </li>
        ))}
      </ul>
      <form onSubmit={add} className="flex flex-wrap items-center gap-2">
        <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Nova categoria" aria-label="Nome da nova categoria" className={`${fieldClass} min-w-48`} />
        {kind === "expense" && (
          <label className="flex items-center gap-2 text-sm text-white/70">
            <input type="checkbox" checked={fixed} onChange={(e) => setFixed(e.target.checked)} /> Despesa fixa
          </label>
        )}
        <button type="submit" disabled={busy} className={buttonPrimaryClass}>Adicionar</button>
        {error && <span role="alert" className="text-sm text-red-400">{error}</span>}
      </form>
    </div>
  );
}

export function SettingsTab({
  categories,
  methods,
}: {
  categories: FinancialCategory[];
  methods: PaymentMethod[];
}) {
  return (
    <div className="flex flex-col gap-8">
      <Block
        title="Formas de pagamento e taxas"
        question="Taxas começam em 0% — nenhuma é presumida. Informe a taxa real da sua maquininha para ver o líquido correto."
      >
        <div className="border border-white/10 bg-teal-deep">
          {methods.map((m) => <MethodRow key={m.code} method={m} />)}
        </div>
      </Block>
      <Block title="Categorias de receita" question="Cada serviço concluído entra numa destas categorias.">
        <CategoryList kind="income" items={categories.filter((c) => c.kind === "income")} />
      </Block>
      <Block title="Categorias de despesa" question="Ocultar não apaga: lançamentos antigos continuam com a categoria.">
        <CategoryList kind="expense" items={categories.filter((c) => c.kind === "expense")} />
      </Block>
    </div>
  );
}
