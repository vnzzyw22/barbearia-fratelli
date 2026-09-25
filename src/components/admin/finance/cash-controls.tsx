"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  addCashMovement,
  closeCashRegister,
  openCashRegister,
} from "@/app/admin/(painel)/financeiro/actions";
import { buttonPrimaryClass, buttonSecondaryClass, fieldClass, labelClass } from "@/components/admin/theme";
import { formatCents, parseMoneyToCents } from "@/lib/finance/money";

export function OpenCashForm() {
  const router = useRouter();
  const [amount, setAmount] = useState("0,00");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const cents = parseMoneyToCents(amount);
    if (cents === null) return setError("Informe o saldo inicial, ex.: 100,00 (ou 0,00).");
    setBusy(true);
    setError(null);
    const r = await openCashRegister(cents);
    setBusy(false);
    if (r.ok) router.refresh();
    else setError(r.error);
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-3 border border-white/10 bg-teal-deep p-4">
      <label className="flex flex-col gap-1.5">
<span className={labelClass}>Dinheiro na gaveta (troco inicial)</span>
        <input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} className={`${fieldClass} w-40 text-right`} />
      </label>
      <button type="submit" disabled={busy} className={buttonPrimaryClass}>{busy ? "Abrindo..." : "Abrir caixa"}</button>
      {error && <p role="alert" className="w-full text-sm text-red-400">{error}</p>}
    </form>
  );
}

export function CloseCashForm({ expectedCents }: { expectedCents: number }) {
  const router = useRouter();
  const [counted, setCounted] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const countedCents = parseMoneyToCents(counted);
  const preview = countedCents === null ? null : countedCents - expectedCents;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (countedCents === null) return setError("Informe quanto dinheiro há na gaveta.");
    if (!window.confirm(`Fechar o caixa com ${formatCents(countedCents)} contados?\nEsperado: ${formatCents(expectedCents)}.`)) return;
    setBusy(true);
    setError(null);
    const r = await closeCashRegister(countedCents, notes);
    setBusy(false);
    if (r.ok) {
      // o formulário some quando o caixa fecha; o resultado vai para um aviso na própria página
      router.replace(`/admin/financeiro?aba=caixa&p=hoje&fechado=${r.data.differenceCents}`);
    } else setError(r.error);
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-3 border border-white/10 bg-teal-deep p-4">
      <label className="flex flex-col gap-1.5">
<span className={labelClass}>Dinheiro contado na gaveta</span>
        <input inputMode="decimal" placeholder="0,00" value={counted} onChange={(e) => setCounted(e.target.value)} className={`${fieldClass} w-40 text-right`} />
      </label>
      <label className="flex min-w-48 flex-1 flex-col gap-1.5">
<span className={labelClass}>Observação (opcional)</span>
        <input value={notes} onChange={(e) => setNotes(e.target.value)} className={fieldClass} />
      </label>
      <button type="submit" disabled={busy || countedCents === null} className={buttonPrimaryClass}>{busy ? "Fechando..." : "Fechar caixa"}</button>
      {preview !== null && (
        <p className={`w-full text-sm ${preview === 0 ? "text-green-400" : "text-amber-300"}`}>
          {preview === 0 ? "Confere com o esperado." : preview > 0 ? `Vai sobrar ${formatCents(preview)}.` : `Vai faltar ${formatCents(-preview)}.`}
        </p>
      )}
      {error && <p role="alert" className="w-full text-sm text-red-400">{error}</p>}
    </form>
  );
}

export function CashMovementForm() {
  const router = useRouter();
  const [direction, setDirection] = useState<"in" | "out">("in");
  const [kind, setKind] = useState<"manual" | "adjustment">("manual");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const cents = parseMoneyToCents(amount);
    if (cents === null || cents <= 0) return setError("Informe um valor válido.");
    setBusy(true);
    setError(null);
    const r = await addCashMovement({ direction, amountCents: cents, description, kind });
    setBusy(false);
    if (r.ok) {
      setAmount("");
      setDescription("");
      router.refresh();
    } else setError(r.error);
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-end gap-3 border border-white/10 bg-teal-deep p-4">
      <label className="flex flex-col gap-1.5">
<span className={labelClass}>Tipo</span>
        <select value={`${kind}:${direction}`} onChange={(e) => {
          const [k, d] = e.target.value.split(":");
          setKind(k as "manual" | "adjustment");
          setDirection(d as "in" | "out");
        }} className={fieldClass}>
          <option value="manual:in">Entrada (suprimento)</option>
          <option value="manual:out">Saída (sangria / retirada)</option>
          <option value="adjustment:in">Ajuste: sobra</option>
          <option value="adjustment:out">Ajuste: falta</option>
        </select>
      </label>
      <label className="flex flex-col gap-1.5">
<span className={labelClass}>Valor (R$)</span>
        <input inputMode="decimal" placeholder="0,00" value={amount} onChange={(e) => setAmount(e.target.value)} className={`${fieldClass} w-32 text-right`} />
      </label>
      <label className="flex min-w-48 flex-[2] flex-col gap-1.5">
<span className={labelClass}>Descrição (obrigatória)</span>
        <input required value={description} onChange={(e) => setDescription(e.target.value)} className={fieldClass} />
      </label>
      <button type="submit" disabled={busy} className={buttonSecondaryClass}>Registrar</button>
      {error && <p role="alert" className="w-full text-sm text-red-400">{error}</p>}
    </form>
  );
}
