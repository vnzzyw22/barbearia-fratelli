"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createCommissionRule, deactivateCommissionRule } from "@/app/admin/(painel)/comissoes/actions";
import { buttonPrimaryClass, buttonSecondaryClass, fieldClass, labelClass } from "@/components/admin/theme";
import { formatBps, parsePercentToBps } from "@/lib/finance/money";
import type { CommissionRule } from "@/lib/supabase/commission-queries";

interface Option {
  id: string;
  name: string;
}

// Percentual por profissional e/ou serviço. A regra mais específica vence (profissional+serviço, depois
// profissional, depois serviço, depois geral). Vale para atendimentos concluídos daqui em diante.
export function RulesManager({ rules, staff, services }: { rules: CommissionRule[]; staff: Option[]; services: Option[] }) {
  const router = useRouter();
  const [staffId, setStaffId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [percent, setPercent] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    const bps = parsePercentToBps(percent);
    if (bps === null || bps <= 0) return setError("Informe um percentual válido, ex.: 40 ou 12,5.");
    setBusy(true);
    setError(null);
    const r = await createCommissionRule({ staffId: staffId || null, serviceId: serviceId || null, rateBps: bps });
    setBusy(false);
    if (r.ok) {
      setPercent("");
      router.refresh();
    } else setError(r.error);
  }

  async function remove(id: string) {
    if (busy) return;
    if (!window.confirm("Desativar esta regra? Atendimentos já concluídos mantêm o percentual que tinham.")) return;
    setBusy(true);
    setError(null);
    const r = await deactivateCommissionRule(id);
    setBusy(false);
    if (r.ok) router.refresh();
    else setError(r.error);
  }

  const scope = (r: CommissionRule) =>
    [r.staff?.name ?? "Todos os barbeiros", r.service?.name ?? "todos os serviços"].join(" · ");

  return (
    <div className="flex flex-col gap-3">
      {rules.length === 0 ? (
        <p className="border border-dashed border-white/15 p-4 text-sm text-white/45">
          Nenhuma regra cadastrada, então nenhuma comissão está sendo calculada. O percentual é decisão sua: cadastre abaixo.
        </p>
      ) : (
        <ul className="flex flex-col divide-y divide-white/10 border border-white/10">
          {rules.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm text-white/85">
              <span className="min-w-40 flex-1">{scope(r)}</span>
              <span className="font-bold tabular-nums text-white">{formatBps(r.rate_bps)}</span>
              <button type="button" disabled={busy} onClick={() => remove(r.id)} className={buttonSecondaryClass}>
                Desativar
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={add} className="flex flex-wrap items-end gap-3 border border-white/10 bg-teal-deep p-4">
        <label className="flex min-w-40 flex-1 flex-col gap-1.5">
          <span className={labelClass}>Barbeiro</span>
          <select value={staffId} onChange={(e) => setStaffId(e.target.value)} className={fieldClass}>
            <option value="">Todos</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </label>
        <label className="flex min-w-40 flex-1 flex-col gap-1.5">
          <span className={labelClass}>Serviço</span>
          <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} className={fieldClass}>
            <option value="">Todos</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </label>
        <label className="flex w-32 flex-col gap-1.5">
          <span className={labelClass}>Percentual (%)</span>
          <input required inputMode="decimal" placeholder="40" value={percent} onChange={(e) => setPercent(e.target.value)} className={`${fieldClass} text-right`} />
        </label>
        <button type="submit" disabled={busy} className={buttonPrimaryClass}>Cadastrar regra</button>
        {error && <p role="alert" className="w-full text-sm text-red-400">{error}</p>}
      </form>
    </div>
  );
}
