import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

// Quem está logado e com qual papel. O papel vem do BANCO (admin_profiles, lido pela policy "self_read"),
// nunca de um cookie/campo enviado pelo navegador. As telas usam isto só para escolher o que mostrar:
// quem realmente barra o acesso são as policies e as funções do Supabase.
export type Role = "owner" | "barber";

export interface Access {
  userId: string;
  email: string | null;
  role: Role | null; // null = autenticado, mas sem perfil (sem acesso a nada)
  staffId: string | null;
}

export const getAccess = cache(async (): Promise<Access | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("admin_profiles")
    .select("role, staff_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) console.error("Erro ao ler o perfil de acesso:", error.message);

  const role = data?.role === "owner" || data?.role === "barber" ? data.role : null;
  return { userId: user.id, email: user.email ?? null, role, staffId: data?.staff_id ?? null };
});
