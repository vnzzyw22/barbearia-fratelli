"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  addCustomItem,
  addServiceItem,
  completeAppointment,
  recordPayment,
  refundPayment,
  removeItem,
  updateItemPrice,
} from "@/app/admin/(painel)/financeiro/actions";
import {
  buttonPrimaryClass,
  buttonSecondaryClass,
  fieldClass,
  labelClass,
  sectionTitleClass,
} from "@/components/admin/theme";
import { centsToInput, formatCents, parseMoneyToCents } from "@/lib/finance/money";
import { METHOD_LABEL, type PaymentMethod } from "@/lib/supabase/finance-types";
import type { AdminAppointment, Service } from "@/lib/supabase/types";

interface Props {
  appointment: AdminAppointment;
  services: Service[];
  methods: PaymentMethod[];
  cashOpen: boolean;
  onChanged: () => void;
}

interface Line {
  id: number;
  method: string;
  amount: string;
}

const CLOSED_STATES = ["cancelled", "no_show"];

function newKey() {
  return crypto.randomUUID();
}

function paymentSummary(appointment: AdminAppointment) {
  const paid = appointment.payments
    .filter((p) => p.kind === "payment")
    .reduce((sum, p) => sum + p.amount_cents, 0);
  const refunded = appointment.payments
    .filter((p) => p.kind === "refund")
    .reduce((sum, p) => sum + p.amount_cents, 0);
  return { paid: paid - refunded };
}

export function AppointmentFinancePanel({ appointment, services, methods, cashOpen, onChanged }: Props) {
  const isCompleted = appointment.status === "completed";
  if (CLOSED_STATES.includes(appointment.status)) return null;
  return isCompleted ? (
    <CompletedSummary appointment={appointment} methods={methods} cashOpen={cashOpen} onChanged={onChanged} />
  ) : (
    <CompleteForm appointment={appointment} services={services} methods={methods} cashOpen={cashOpen} onChanged={onChanged} />
  );
}

// ── Antes de concluir: itens + pagamento ────────────────────────────────────

function CompleteForm({ appointment, services, methods, cashOpen, onChanged }: Props) {
  const total = appointment.items.reduce((sum, i) => sum + i.total_cents, 0);
  const activeMethods = methods.filter((m) => m.active);

  const [lines, setLines] = useState<Line[]>([{ id: 1, method: "pix", amount: centsToInput(total) }]);
  const touched = useRef(false);
  const nextId = useRef(2);
  const key = useRef(newKey());
  const [allowPartial, setAllowPartial] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [priceEdits, setPriceEdits] = useState<Record<string, string>>({});
  const [addServiceId, setAddServiceId] = useState("");
  const [customDesc, setCustomDesc] = useState("");
  const [customPrice, setCustomPrice] = useState("");

  // Enquanto a dona não mexeu nos pagamentos, a linha única acompanha o total dos itens.
  useEffect(() => {
    if (!touched.current) {
      setLines([{ id: 1, method: "pix", amount: centsToInput(total) }]);
    }
  }, [total]);

  const parsed = lines.map((l) => ({ ...l, cents: parseMoneyToCents(l.amount) }));
  const invalidLine = parsed.some((l) => l.cents === null || l.cents <= 0);
  const sum = parsed.reduce((s, l) => s + (l.cents ?? 0), 0);
  const remaining = total - sum;
  const usesCash = lines.some((l) => l.method === "cash");
  const feeEstimate = parsed.reduce((s, l) => {
    const m = methods.find((x) => x.code === l.method);
    return s + Math.round(((l.cents ?? 0) * (m?.fee_bps ?? 0)) / 10000);
  }, 0);

  const canSubmit =
    !busy &&
    total > 0 &&
    !invalidLine &&
    sum <= total &&
    (remaining === 0 || allowPartial) &&
    !(usesCash && !cashOpen);

  function editLine(id: number, patch: Partial<Line>) {
    touched.current = true;
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  async function runItemAction(fn: () => Promise<{ ok: boolean } & { error?: string }>) {
    setBusy(true);
    setError(null);
    const result = await fn();
    setBusy(false);
    if (result.ok) onChanged();
    else setError(result.error ?? "Não foi possível salvar.");
  }

  async function submit() {
    if (!canSubmit) return;
    const label = allowPartial && remaining > 0
      ? `Concluir com ${formatCents(remaining)} em aberto (conta a receber)?`
      : `Concluir e registrar ${formatCents(sum)} recebidos?`;
    if (!window.confirm(`${label}\nDepois de concluído, o atendimento não pode ser alterado.`)) return;

    setBusy(true);
    setError(null);
    const result = await completeAppointment({
      appointmentId: appointment.id,
      payments: parsed.map((l) => ({ method: l.method, amountCents: l.cents as number })),
      allowPartial,
      idempotencyKey: key.current,
    });
    setBusy(false);
    if (result.ok) {
      key.current = newKey();
      onChanged();
    } else {
      setError(result.error);
    }
  }

  return (
    <div className="flex flex-col gap-5 border-t border-white/10 pt-4">
      <div className="flex flex-col gap-2">
        <p className={sectionTitleClass}>Itens do atendimento</p>
        {appointment.items.length === 0 && (
          <p className="text-sm text-white/40">Sem itens (atendimento anterior ao financeiro).</p>
        )}
        {appointment.items.map((item) => {
          const edit = priceEdits[item.id];
          return (
            <div key={item.id} className="flex flex-wrap items-center gap-2 text-sm text-white/80">
              <span className="min-w-32 flex-1">{item.description}{item.quantity > 1 && ` ×${item.quantity}`}</span>
              <input
                aria-label={`Valor de ${item.description}`}
                inputMode="decimal"
                value={edit ?? centsToInput(item.unit_price_cents)}
                onChange={(e) => setPriceEdits((p) => ({ ...p, [item.id]: e.target.value }))}
                className={`${fieldClass} w-28 text-right`}
              />
              {edit !== undefined && edit !== centsToInput(item.unit_price_cents) && (
                <button
                  type="button"
                  disabled={busy}
                  className={buttonSecondaryClass}
                  onClick={() => {
                    const cents = parseMoneyToCents(edit);
                    if (cents === null) return setError("Valor do item inválido.");
                    void runItemAction(async () => {
                      const r = await updateItemPrice(item.id, cents);
                      if (r.ok) {
                        setPriceEdits((prev) => {
                          const next = { ...prev };
                          delete next[item.id];
                          return next;
                        });
                      }
                      return r;
                    });
                  }}
                >
                  Salvar valor
                </button>
              )}
              {appointment.items.length > 1 && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => runItemAction(() => removeItem(item.id))}
                  className="font-nav text-xs font-bold tracking-widest text-white/40 uppercase hover:text-red-400"
                >
                  Remover
                </button>
              )}
            </div>
          );
        })}

        <div className="mt-1 flex flex-wrap items-end gap-2">
          <div className="flex min-w-48 flex-1 flex-col gap-1.5">
            <label className={labelClass}>Adicionar serviço</label>
            <select value={addServiceId} onChange={(e) => setAddServiceId(e.target.value)} className={fieldClass}>
              <option value="">Selecione</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>{s.name} — {formatCents(Math.round(s.price * 100))}</option>
              ))}
            </select>
          </div>
          <button
            type="button"
            disabled={busy || !addServiceId}
            className={buttonSecondaryClass}
            onClick={() => runItemAction(async () => {
              const r = await addServiceItem(appointment.id, addServiceId);
              if (r.ok) setAddServiceId("");
              return r;
            })}
          >
            Adicionar
          </button>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex min-w-48 flex-1 flex-col gap-1.5">
            <label className={labelClass}>Item avulso (ex.: produto)</label>
            <input value={customDesc} onChange={(e) => setCustomDesc(e.target.value)} className={fieldClass} placeholder="Descrição" />
          </div>
          <input
            aria-label="Valor do item avulso"
            inputMode="decimal"
            value={customPrice}
            onChange={(e) => setCustomPrice(e.target.value)}
            className={`${fieldClass} w-28 text-right`}
            placeholder="0,00"
          />
          <button
            type="button"
            disabled={busy || !customDesc.trim() || !customPrice}
            className={buttonSecondaryClass}
            onClick={() => {
              const cents = parseMoneyToCents(customPrice);
              if (cents === null || cents <= 0) return setError("Valor do item avulso inválido.");
              void runItemAction(async () => {
                const r = await addCustomItem(appointment.id, customDesc, cents);
                if (r.ok) {
                  setCustomDesc("");
                  setCustomPrice("");
                }
                return r;
              });
            }}
          >
            Adicionar
          </button>
        </div>
        <p className="mt-1 flex items-baseline justify-between border-t border-white/10 pt-2 text-sm text-white">
          <span className="font-nav text-xs font-bold tracking-widest uppercase text-white/60">Total</span>
          <span className="text-lg font-bold">{formatCents(total)}</span>
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <p className={sectionTitleClass}>Recebimento</p>
        {parsed.map((l, index) => (
          <div key={l.id} className="flex flex-wrap items-center gap-2">
            <select
              aria-label="Forma de pagamento"
              value={l.method}
              onChange={(e) => editLine(l.id, { method: e.target.value })}
              className={`${fieldClass} w-40`}
            >
              {activeMethods.map((m) => (
                <option key={m.code} value={m.code}>{METHOD_LABEL[m.code] ?? m.name}</option>
              ))}
            </select>
            <input
              aria-label="Valor recebido"
              inputMode="decimal"
              value={lines[index].amount}
              onChange={(e) => editLine(l.id, { amount: e.target.value })}
              className={`${fieldClass} w-32 text-right`}
            />
            {lines.length > 1 && (
              <button
                type="button"
                onClick={() => {
                  touched.current = true;
                  setLines((prev) => prev.filter((x) => x.id !== l.id));
                }}
                className="font-nav text-xs font-bold tracking-widest text-white/40 uppercase hover:text-red-400"
              >
                Remover
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          className="self-start font-nav text-xs font-bold tracking-widest text-brand-red uppercase hover:text-white"
          onClick={() => {
            touched.current = true;
            const rest = Math.max(remaining, 0);
            setLines((prev) => [...prev, { id: nextId.current++, method: "cash", amount: centsToInput(rest) }]);
          }}
        >
          + Dividir em outra forma
        </button>

        <p className={`text-sm ${remaining === 0 ? "text-green-400" : remaining < 0 ? "text-red-400" : "text-amber-300"}`}>
          {remaining === 0
            ? "Valor conferido: pagamento igual ao total."
            : remaining > 0
              ? `Falta receber ${formatCents(remaining)}.`
              : `Passou ${formatCents(-remaining)} do total — não é permitido receber a mais.`}
        </p>
        {feeEstimate > 0 && (
          <p className="text-xs text-white/50">
            Taxa estimada das formas escolhidas: {formatCents(feeEstimate)} (líquido {formatCents(sum - feeEstimate)}).
          </p>
        )}
        {remaining > 0 && (
          <label className="flex items-center gap-2 text-sm text-white/70">
            <input type="checkbox" checked={allowPartial} onChange={(e) => setAllowPartial(e.target.checked)} />
            Deixar {formatCents(remaining)} em aberto (vira conta a receber)
          </label>
        )}
        {usesCash && !cashOpen && (
          <p className="text-sm text-amber-300">
            Para receber em dinheiro, abra o caixa em{" "}
            <Link href="/admin/financeiro?aba=caixa" className="underline">Financeiro › Caixa</Link>.
          </p>
        )}
      </div>

      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
      <div>
        <button type="button" disabled={!canSubmit} onClick={submit} className={buttonPrimaryClass}>
          {busy ? "Processando..." : "Concluir atendimento"}
        </button>
      </div>
    </div>
  );
}

// ── Depois de concluir: resumo, saldo, estorno ──────────────────────────────

function CompletedSummary({ appointment, methods, cashOpen, onChanged }: Omit<Props, "services">) {
  const total = appointment.items.reduce((sum, i) => sum + i.total_cents, 0);
  const { paid } = paymentSummary(appointment);
  const outstanding = total - paid;
  const activeMethods = methods.filter((m) => m.active);

  const key = useRef(newKey());
  const [method, setMethod] = useState("pix");
  const [amount, setAmount] = useState(centsToInput(Math.max(outstanding, 0)));
  const [refundId, setRefundId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refunded = new Set(appointment.payments.filter((p) => p.kind === "refund").map((p) => p.reversal_of));

  async function receive() {
    const cents = parseMoneyToCents(amount);
    if (cents === null || cents <= 0) return setError("Informe um valor válido.");
    if (!window.confirm(`Registrar recebimento de ${formatCents(cents)} em ${METHOD_LABEL[method as keyof typeof METHOD_LABEL]}?`)) return;
    setBusy(true);
    setError(null);
    const r = await recordPayment({ appointmentId: appointment.id, method, amountCents: cents, idempotencyKey: key.current });
    setBusy(false);
    if (r.ok) {
      key.current = newKey();
      onChanged();
    } else setError(r.error);
  }

  async function refund(paymentId: string) {
    if (!reason.trim()) return setError("Informe o motivo do estorno.");
    if (!window.confirm("Estornar este pagamento? O valor sai do caixa e o atendimento volta a ter saldo em aberto.")) return;
    setBusy(true);
    setError(null);
    const r = await refundPayment(paymentId, reason);
    setBusy(false);
    if (r.ok) {
      setRefundId(null);
      setReason("");
      onChanged();
    } else setError(r.error);
  }

  return (
    <div className="flex flex-col gap-4 border-t border-white/10 pt-4">
      <p className={sectionTitleClass}>Atendimento concluído</p>
      <ul className="flex flex-col gap-1 text-sm text-white/80">
        {appointment.items.map((i) => (
          <li key={i.id} className="flex justify-between gap-4">
            <span>{i.description}{i.quantity > 1 && ` ×${i.quantity}`}</span>
            <span>{formatCents(i.total_cents)}</span>
          </li>
        ))}
        <li className="mt-1 flex justify-between gap-4 border-t border-white/10 pt-1 font-bold text-white">
          <span>Total</span>
          <span>{formatCents(total)}</span>
        </li>
      </ul>

      <div className="flex flex-col gap-1.5">
        <p className={labelClass}>Pagamentos</p>
        {appointment.payments.length === 0 && <p className="text-sm text-white/40">Nenhum pagamento registrado.</p>}
        {appointment.payments.map((p) => (
          <div key={p.id} className="flex flex-wrap items-center gap-3 text-sm text-white/80">
            <span className={p.kind === "refund" ? "text-red-400" : ""}>
              {p.kind === "refund" ? "Estorno " : ""}{METHOD_LABEL[p.method]}
            </span>
            <span>{p.kind === "refund" ? "−" : ""}{formatCents(p.amount_cents)}</span>
            {p.kind === "payment" && !refunded.has(p.id) && (
              <button
                type="button"
                onClick={() => { setRefundId(refundId === p.id ? null : p.id); setError(null); }}
                className="font-nav text-xs font-bold tracking-widest text-white/40 uppercase hover:text-red-400"
              >
                Estornar
              </button>
            )}
            {refundId === p.id && (
              <span className="flex w-full flex-wrap items-center gap-2">
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Motivo do estorno"
                  className={`${fieldClass} min-w-48 flex-1`}
                />
                {p.method === "cash" && !cashOpen && (
                  <span className="text-xs text-amber-300">Abra o caixa para estornar dinheiro.</span>
                )}
                <button type="button" disabled={busy} onClick={() => refund(p.id)} className={buttonSecondaryClass}>
                  Confirmar estorno
                </button>
              </span>
            )}
          </div>
        ))}
      </div>

      {outstanding > 0 ? (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-amber-300">Em aberto (a receber): {formatCents(outstanding)}</p>
          <div className="flex flex-wrap items-center gap-2">
            <select value={method} onChange={(e) => setMethod(e.target.value)} className={`${fieldClass} w-40`} aria-label="Forma de pagamento">
              {activeMethods.map((m) => (
                <option key={m.code} value={m.code}>{METHOD_LABEL[m.code] ?? m.name}</option>
              ))}
            </select>
            <input
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              aria-label="Valor recebido"
              className={`${fieldClass} w-32 text-right`}
            />
            <button type="button" disabled={busy || (method === "cash" && !cashOpen)} onClick={receive} className={buttonPrimaryClass}>
              Registrar recebimento
            </button>
          </div>
          {method === "cash" && !cashOpen && (
            <p className="text-sm text-amber-300">
              Abra o caixa em <Link href="/admin/financeiro?aba=caixa" className="underline">Financeiro › Caixa</Link>.
            </p>
          )}
        </div>
      ) : (
        <p className="text-sm text-green-400">Quitado.</p>
      )}
      {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
    </div>
  );
}
