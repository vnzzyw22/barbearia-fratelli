"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { cancelManualIncome, createManualIncome, receiveIncome, refundManualIncome } from "@/app/admin/(painel)/financeiro/actions";
import { buttonPrimaryClass, buttonSecondaryClass, fieldClass, labelClass } from "@/components/admin/theme";
import { todayISO } from "@/lib/date";
import { formatCents, parseMoneyToCents } from "@/lib/finance/money";
import { METHOD_LABEL, type FinancialCategory, type PaymentMethod } from "@/lib/supabase/finance-types";

function Field({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`flex min-w-40 flex-1 flex-col gap-1.5 ${className}`}>
      <span className={labelClass}>{label}</span>
      {children}
    </label>
  );
}

export function IncomeForm({ categories, methods }: { categories: FinancialCategory[]; methods: PaymentMethod[] }) {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [competence, setCompetence] = useState(todayISO());
  const [dueOn, setDueOn] = useState("");
  const [notes, setNotes] = useState("");
  const [receivedNow, setReceivedNow] = useState(true);
  const [method, setMethod] = useState("pix");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  // Uma chave por "tentativa": duplo clique/reenvio devolve a MESMA receita. Só renova após sucesso.
  const key = useRef<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    const cents = parseMoneyToCents(amount);
    if (cents === null || cents <= 0) return setError("Informe um valor válido, ex.: 45,00.");
    if (!key.current) key.current = crypto.randomUUID();
    setBusy(true);
    setError(null);
    setDone(null);
    const result = await createManualIncome({
      description,
      categoryId,
      amountCents: cents,
      competenceDate: competence,
      dueOn: receivedNow ? null : dueOn || null,
      notes,
      receivedMethod: receivedNow ? method : null,
      idempotencyKey: key.current,
    });
    setBusy(false);
    if (result.ok) {
      key.current = null;
      setDone(receivedNow ? "Receita lançada e recebida." : "Receita lançada como a receber.");
      setDescription("");
      setAmount("");
      setDueOn("");
      setNotes("");
      router.refresh();
    } else {
      setError(result.error);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4 border border-white/10 bg-teal-deep p-4">
      <div className="flex flex-wrap gap-3">
        <Field label="Descrição" className="min-w-56 flex-[2]">
          <input required value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Ex.: Pomada modeladora" className={fieldClass} />
        </Field>
        <Field label="Categoria">
          <select required value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className={fieldClass}>
            <option value="">Selecione</option>
            {categories.filter((c) => c.active).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </Field>
        <Field label="Valor (R$)" className="max-w-40">
          <input required inputMode="decimal" placeholder="0,00" value={amount} onChange={(e) => setAmount(e.target.value)} className={`${fieldClass} text-right`} />
        </Field>
      </div>
      <div className="flex flex-wrap gap-3">
        <Field label="Data da venda">
          <input required type="date" value={competence} onChange={(e) => setCompetence(e.target.value)} className={fieldClass} />
        </Field>
        {!receivedNow && (
          <Field label="Vencimento (opcional)">
            <input type="date" value={dueOn} onChange={(e) => setDueOn(e.target.value)} className={fieldClass} />
          </Field>
        )}
        <Field label="Observação (opcional)" className="min-w-56 flex-[2]">
          <input value={notes} onChange={(e) => setNotes(e.target.value)} className={fieldClass} />
        </Field>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-white/70">
          <input type="checkbox" checked={receivedNow} onChange={(e) => setReceivedNow(e.target.checked)} />
          Já foi recebida
        </label>
        {receivedNow && (
          <select aria-label="Forma de recebimento" value={method} onChange={(e) => setMethod(e.target.value)} className={`${fieldClass} w-40`}>
            {methods.filter((m) => m.active).map((m) => (
              <option key={m.code} value={m.code}>{METHOD_LABEL[m.code] ?? m.name}</option>
            ))}
          </select>
        )}
        <button type="submit" disabled={busy} className={buttonPrimaryClass}>
          {busy ? "Salvando..." : receivedNow ? "Lançar e receber" : "Lançar como a receber"}
        </button>
      </div>
      {!receivedNow && (
        <p className="text-xs text-white/40">A receber conta como receita do período, mas só entra no caixa quando você marcar como recebida.</p>
      )}
      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
      {done && <p role="status" className="text-sm text-green-400">{done}</p>}
    </form>
  );
}

export function IncomeRowActions({
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

  async function receive() {
    if (busy) return;
    if (!window.confirm(`Receber “${description}” — ${formatCents(amountCents)} em ${METHOD_LABEL[method as keyof typeof METHOD_LABEL]}?\nO valor entra no caixa agora.`)) return;
    setBusy(true);
    setError(null);
    const r = await receiveIncome(id, method);
    setBusy(false);
    if (r.ok) router.refresh();
    else setError(r.error);
  }

  async function cancel() {
    if (busy) return;
    if (!window.confirm(`Cancelar “${description}”? Ela deixa de contar nas receitas.`)) return;
    setBusy(true);
    setError(null);
    const r = await cancelManualIncome(id);
    setBusy(false);
    if (r.ok) router.refresh();
    else setError(r.error);
  }

  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap items-center gap-2">
        <select aria-label="Forma de recebimento" value={method} onChange={(e) => setMethod(e.target.value)} className={`${fieldClass} w-32 py-1`}>
          {methods.filter((m) => m.active).map((m) => (
            <option key={m.code} value={m.code}>{METHOD_LABEL[m.code] ?? m.name}</option>
          ))}
        </select>
        <button type="button" disabled={busy} onClick={receive} className={`${buttonPrimaryClass} py-1`}>Receber</button>
        <button type="button" disabled={busy} onClick={cancel} className="font-nav text-xs font-bold tracking-widest text-white/40 uppercase hover:text-red-400">
          Cancelar
        </button>
      </div>
      {error && <p role="alert" className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

export function IncomeRefund({ id, description, amountCents, method }: { id: string; description: string; amountCents: number; method: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refund() {
    if (busy) return;
    if (!reason.trim()) return setError("Informe o motivo do estorno.");
    if (!window.confirm(`Estornar “${description}” — ${formatCents(amountCents)}?
O valor sai do caixa e a receita é cancelada.`)) return;
    setBusy(true);
    setError(null);
    const r = await refundManualIncome(id, reason);
    setBusy(false);
    if (r.ok) router.refresh();
    else setError(r.error);
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="font-nav text-xs font-bold tracking-widest text-white/40 uppercase hover:text-red-400">
        Estornar
      </button>
    );
  }
  return (
    <div className="flex min-w-48 flex-col gap-2">
      <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motivo do estorno" aria-label="Motivo do estorno" className={fieldClass} />
      {method === "cash" && <p className="text-xs text-amber-300">Dinheiro exige o caixa aberto.</p>}
      <div className="flex items-center gap-2">
        <button type="button" disabled={busy} onClick={refund} className={buttonSecondaryClass}>{busy ? "Estornando..." : "Confirmar estorno"}</button>
        <button type="button" disabled={busy} onClick={() => { setOpen(false); setError(null); }} className="font-nav text-xs font-bold tracking-widest text-white/40 uppercase hover:text-white">Voltar</button>
      </div>
      {error && <p role="alert" className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
