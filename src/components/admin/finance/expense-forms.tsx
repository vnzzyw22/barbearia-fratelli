"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  cancelExpense,
  createExpense,
  createRecurringExpense,
  payExpense,
  setRecurringActive,
} from "@/app/admin/(painel)/financeiro/actions";
import {
  buttonPrimaryClass,
  buttonSecondaryClass,
  fieldClass,
  labelClass,
} from "@/components/admin/theme";
import { formatCents, parseMoneyToCents } from "@/lib/finance/money";
import { todayISO } from "@/lib/date";
import {
  METHOD_LABEL,
  type FinancialCategory,
  type PaymentMethod,
  type RecurringExpense,
} from "@/lib/supabase/finance-types";

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex min-w-40 flex-1 flex-col gap-1.5 ${className}`}>
      <label className={labelClass}>{label}</label>
      {children}
    </div>
  );
}

export function ExpenseForm({
  categories,
  methods,
}: {
  categories: FinancialCategory[];
  methods: PaymentMethod[];
}) {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [competence, setCompetence] = useState(todayISO());
  const [dueOn, setDueOn] = useState("");
  const [notes, setNotes] = useState("");
  const [paidNow, setPaidNow] = useState(false);
  const [method, setMethod] = useState("pix");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const cents = parseMoneyToCents(amount);
    if (cents === null || cents <= 0) return setError("Informe um valor válido, ex.: 250,00.");
    setBusy(true);
    setError(null);
    const result = await createExpense({
      description,
      categoryId,
      amountCents: cents,
      competenceDate: competence,
      dueOn: dueOn || null,
      notes,
      paidMethod: paidNow ? method : null,
    });
    setBusy(false);
    if (result.ok) {
      setDescription("");
      setAmount("");
      setDueOn("");
      setNotes("");
      setPaidNow(false);
      router.refresh();
    } else {
      setError(result.error);
      if (result.error.startsWith("Despesa lançada")) router.refresh();
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 border border-white/10 bg-teal-deep p-4">
      <div className="flex flex-wrap gap-3">
        <Field label="Descrição" className="min-w-56 flex-[2]">
          <input required value={description} onChange={(e) => setDescription(e.target.value)} className={fieldClass} />
        </Field>
        <Field label="Categoria">
          <select required value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={fieldClass}>
            <option value="">Selecione</option>
            {categories.filter((c) => c.active).map((c) => (
              <option key={c.id} value={c.id}>{c.name}{c.is_fixed ? " (fixa)" : ""}</option>
            ))}
          </select>
        </Field>
        <Field label="Valor (R$)" className="max-w-40">
          <input required inputMode="decimal" placeholder="0,00" value={amount} onChange={(e) => setAmount(e.target.value)} className={`${fieldClass} text-right`} />
        </Field>
      </div>
      <div className="flex flex-wrap gap-3">
        <Field label="Data do gasto">
          <input required type="date" value={competence} onChange={(e) => setCompetence(e.target.value)} className={fieldClass} />
        </Field>
        <Field label="Vencimento (opcional)">
          <input type="date" value={dueOn} onChange={(e) => setDueOn(e.target.value)} className={fieldClass} />
        </Field>
        <Field label="Observação (opcional)" className="min-w-56 flex-[2]">
          <input value={notes} onChange={(e) => setNotes(e.target.value)} className={fieldClass} />
        </Field>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-white/70">
          <input type="checkbox" checked={paidNow} onChange={(e) => setPaidNow(e.target.checked)} />
          Já foi paga
        </label>
        {paidNow && (
          <select aria-label="Forma de pagamento" value={method} onChange={(e) => setMethod(e.target.value)} className={`${fieldClass} w-40`}>
            {methods.filter((m) => m.active).map((m) => (
              <option key={m.code} value={m.code}>{METHOD_LABEL[m.code] ?? m.name}</option>
            ))}
          </select>
        )}
        <button type="submit" disabled={busy} className={buttonPrimaryClass}>
          {busy ? "Salvando..." : paidNow ? "Lançar e pagar" : "Lançar como pendente"}
        </button>
      </div>
      {!paidNow && (
        <p className="text-xs text-white/40">
          Pendente vira “conta a pagar” e só reduz o caixa quando for paga.
        </p>
      )}
      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
    </form>
  );
}

export function ExpenseRowActions({
  id,
  description,
  amountCents,
  methods,
}: {
  id: string;
  description: string;
  amountCents: number;
  methods: PaymentMethod[];
}) {
  const router = useRouter();
  const [method, setMethod] = useState("pix");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pay() {
    if (!window.confirm(`Pagar “${description}” — ${formatCents(amountCents)} em ${METHOD_LABEL[method as keyof typeof METHOD_LABEL]}?\nO valor sai do caixa agora.`)) return;
    setBusy(true);
    setError(null);
    const r = await payExpense(id, method);
    setBusy(false);
    if (r.ok) router.refresh();
    else setError(r.error);
  }

  async function cancel() {
    if (!window.confirm(`Cancelar “${description}”? Ela deixa de contar nas despesas.`)) return;
    setBusy(true);
    setError(null);
    const r = await cancelExpense(id);
    setBusy(false);
    if (r.ok) router.refresh();
    else setError(r.error);
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <select aria-label="Forma de pagamento" value={method} onChange={(e) => setMethod(e.target.value)} className={`${fieldClass} w-32 py-1`}>
          {methods.filter((m) => m.active).map((m) => (
            <option key={m.code} value={m.code}>{METHOD_LABEL[m.code] ?? m.name}</option>
          ))}
        </select>
        <button type="button" disabled={busy} onClick={pay} className={`${buttonPrimaryClass} py-1`}>Pagar</button>
        <button type="button" disabled={busy} onClick={cancel} className="font-nav text-xs font-bold tracking-widest text-white/40 uppercase hover:text-red-400">
          Cancelar
        </button>
      </div>
      {error && <p role="alert" className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

export function RecurringManager({
  items,
  categories,
}: {
  items: RecurringExpense[];
  categories: FinancialCategory[];
}) {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [day, setDay] = useState("5");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const cents = parseMoneyToCents(amount);
    if (cents === null || cents <= 0) return setError("Informe um valor válido.");
    setBusy(true);
    setError(null);
    const r = await createRecurringExpense({ description, categoryId, amountCents: cents, dayOfMonth: Number(day) });
    setBusy(false);
    if (r.ok) {
      setDescription("");
      setAmount("");
      router.refresh();
    } else setError(r.error);
  }

  async function toggle(id: string, active: boolean) {
    setBusy(true);
    const r = await setRecurringActive(id, active);
    setBusy(false);
    if (r.ok) router.refresh();
    else setError(r.error);
  }

  return (
    <div className="flex flex-col gap-3">
      {items.length === 0 ? (
        <p className="border border-dashed border-white/15 p-4 text-sm text-white/45">
          Nenhuma despesa fixa cadastrada. Cadastre aluguel, internet etc. uma vez e elas são lançadas sozinhas todo mês.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-white/10 border border-white/10">
          {items.map((r) => (
            <li key={r.id} className={`flex flex-wrap items-center gap-3 px-3 py-2 text-sm ${r.active ? "text-white/85" : "text-white/35"}`}>
              <span className="min-w-40 flex-1">{r.description}</span>
              <span className="text-white/50">{r.category?.name}</span>
              <span className="tabular-nums">{formatCents(r.amount_cents)}</span>
              <span className="text-white/50">dia {r.day_of_month}</span>
              <button type="button" disabled={busy} onClick={() => toggle(r.id, !r.active)} className={buttonSecondaryClass}>
                {r.active ? "Pausar" : "Reativar"}
              </button>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={add} className="flex flex-wrap items-end gap-3 border border-white/10 bg-teal-deep p-4">
        <Field label="Descrição" className="min-w-48 flex-[2]">
          <input required value={description} onChange={(e) => setDescription(e.target.value)} className={fieldClass} />
        </Field>
        <Field label="Categoria">
          <select required value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={fieldClass}>
            <option value="">Selecione</option>
            {categories.filter((c) => c.active).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Valor (R$)" className="max-w-36">
          <input required inputMode="decimal" placeholder="0,00" value={amount} onChange={(e) => setAmount(e.target.value)} className={`${fieldClass} text-right`} />
        </Field>
        <Field label="Vence no dia" className="max-w-28">
          <input required type="number" min={1} max={28} value={day} onChange={(e) => setDay(e.target.value)} className={fieldClass} />
        </Field>
        <button type="submit" disabled={busy} className={buttonPrimaryClass}>Cadastrar despesa fixa</button>
        {error && <p role="alert" className="w-full text-sm text-red-400">{error}</p>}
      </form>
    </div>
  );
}
