"use client";

import { useActionState } from "react";
import {
  buttonPrimaryClass,
  cardClass,
  fieldClass,
  labelClass,
} from "@/components/admin/theme";
import { login, type LoginState } from "./actions";

const initialState: LoginState = { error: null };

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <form
      action={formAction}
      className={`flex w-full max-w-sm flex-col gap-4 ${cardClass}`}
    >
      <div className="flex flex-col gap-1.5">
        <label htmlFor="email" className={labelClass}>
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className={fieldClass}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="password" className={labelClass}>
          Senha
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={fieldClass}
        />
      </div>
      {state.error ? (
        <p role="alert" className="text-sm text-red-400">
          {state.error}
        </p>
      ) : null}
      <button type="submit" disabled={pending} className={buttonPrimaryClass}>
        {pending ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
