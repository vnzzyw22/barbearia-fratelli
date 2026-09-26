"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { linkBarber, unlinkBarber } from "@/app/admin/(painel)/comissoes/actions";
import { buttonPrimaryClass, buttonSecondaryClass, fieldClass } from "@/components/admin/theme";
import type { StaffAccessRow } from "@/lib/supabase/commission-queries";

// Cada barbeiro pode ter UM login. O barbeiro só enxerga a própria agenda e as próprias comissões.
export function StaffAccess({ rows }: { rows: StaffAccessRow[] }) {
  const router = useRouter();
  const [emails, setEmails] = useState<Record<string, string>>({});
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function link(id: string) {
    setBusyId(id);
    setErrors((e) => ({ ...e, [id]: "" }));
    const r = await linkBarber(id, emails[id] ?? "");
    setBusyId(null);
    if (r.ok) {
      setEmails((e) => ({ ...e, [id]: "" }));
      router.refresh();
    } else setErrors((e) => ({ ...e, [id]: r.error }));
  }

  async function unlink(id: string, name: string) {
    if (!window.confirm(`Remover o acesso de ${name}? Ele deixa de conseguir entrar no painel.`)) return;
    setBusyId(id);
    setErrors((e) => ({ ...e, [id]: "" }));
    const r = await unlinkBarber(id);
    setBusyId(null);
    if (r.ok) router.refresh();
    else setErrors((e) => ({ ...e, [id]: r.error }));
  }

  if (rows.length === 0) return null;

  return (
    <section className="mt-10 flex flex-col gap-3">
      <div>
        <h2 className="font-nav text-sm font-bold tracking-widest text-white uppercase">Acesso ao painel</h2>
        <p className="mt-0.5 text-sm text-white/45">
          Para dar acesso a um barbeiro: crie o usuário dele em Supabase › Authentication › Users (com e-mail e senha) e informe o e-mail aqui.
          Ele vê só a própria agenda e as próprias comissões.
        </p>
      </div>
      <ul className="flex flex-col divide-y divide-white/10 border border-white/10">
        {rows.map((r) => (
          <li key={r.staff_id} className="flex flex-col gap-2 px-3 py-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="min-w-32 font-medium text-white">{r.staff_name}</span>
              {r.email ? (
                <>
                  <span className="min-w-0 flex-1 truncate text-sm text-white/60">{r.email}</span>
                  <button type="button" disabled={busyId === r.staff_id} onClick={() => unlink(r.staff_id, r.staff_name)} className={buttonSecondaryClass}>
                    Remover acesso
                  </button>
                </>
              ) : (
                <>
                  <input
                    type="email"
                    aria-label={`E-mail do login de ${r.staff_name}`}
                    placeholder="e-mail do barbeiro"
                    value={emails[r.staff_id] ?? ""}
                    onChange={(e) => setEmails((m) => ({ ...m, [r.staff_id]: e.target.value }))}
                    className={`${fieldClass} min-w-48 flex-1`}
                  />
                  <button type="button" disabled={busyId === r.staff_id || !(emails[r.staff_id] ?? "").trim()} onClick={() => link(r.staff_id)} className={buttonPrimaryClass}>
                    Vincular
                  </button>
                </>
              )}
            </div>
            {errors[r.staff_id] && <p role="alert" className="text-sm text-red-400">{errors[r.staff_id]}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}
