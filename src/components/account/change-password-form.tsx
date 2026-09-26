"use client";

import { useActionState } from "react";
import { changePassword, type PasswordState } from "@/lib/auth/actions";
import { PASSWORD_MIN } from "@/lib/auth/password";
import { buttonPrimaryClass, fieldClass, labelClass } from "@/components/admin/theme";

const initial: PasswordState = { error: null, done: false };

export function ChangePasswordForm({ email }: { email: string | null }) {
  const [state, action, pending] = useActionState(changePassword, initial);

  return (
    <form action={action} className="flex max-w-md flex-col gap-4 border border-white/10 bg-teal-deep p-4">
      {email && (
        <p className="text-sm text-white/50">
          Conta: <strong className="text-white/80">{email}</strong>
        </p>
      )}
      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>Senha atual</span>
        <input name="current" type="password" autoComplete="current-password" required className={fieldClass} />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>Nova senha</span>
        <input name="next" type="password" autoComplete="new-password" required minLength={PASSWORD_MIN} className={fieldClass} />
        <span className="text-xs text-white/40">Pelo menos {PASSWORD_MIN} caracteres, com letras e números. Nada previsível.</span>
      </label>
      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>Repita a nova senha</span>
        <input name="confirm" type="password" autoComplete="new-password" required className={fieldClass} />
      </label>
      {state.error && <p role="alert" className="text-sm text-red-400">{state.error}</p>}
      {state.done && <p role="status" className="text-sm text-green-400">Senha trocada. Use a nova no próximo login.</p>}
      <div>
        <button type="submit" disabled={pending} className={buttonPrimaryClass}>
          {pending ? "Trocando..." : "Trocar senha"}
        </button>
      </div>
    </form>
  );
}
