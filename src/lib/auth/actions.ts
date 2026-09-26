"use server";

import { getAccess } from "@/lib/auth/access";
import { passwordProblem } from "@/lib/auth/password";
import { createClient } from "@/lib/supabase/server";

export type PasswordState = { error: string | null; done: boolean };

// Troca a senha do PRÓPRIO usuário logado (dono ou barbeiro). Confirma a senha atual antes:
// uma sessão esquecida aberta não basta para trocar a senha.
export async function changePassword(_prev: PasswordState, formData: FormData): Promise<PasswordState> {
  const access = await getAccess();
  if (!access?.email) return { error: "Sessão expirada. Entre novamente.", done: false };

  const current = formData.get("current");
  const next = formData.get("next");
  const confirm = formData.get("confirm");
  if (typeof current !== "string" || typeof next !== "string" || typeof confirm !== "string" || !current || !next) {
    return { error: "Preencha todos os campos.", done: false };
  }
  if (next !== confirm) return { error: "A confirmação não é igual à nova senha.", done: false };
  const problem = passwordProblem(next, current, access.email);
  if (problem) return { error: problem, done: false };

  const supabase = await createClient();
  const { error: authError } = await supabase.auth.signInWithPassword({ email: access.email, password: current });
  if (authError) return { error: "A senha atual está incorreta.", done: false };

  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) {
    console.error("Erro ao trocar a senha:", error.message);
    return { error: "Não foi possível trocar a senha. Tente outra.", done: false };
  }
  return { error: null, done: true };
}
