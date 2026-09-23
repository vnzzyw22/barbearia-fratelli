"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type ActionResult = { ok: true } | { ok: false; error: string };

interface ClientInput {
  name: string;
  whatsapp: string;
  notes: string;
}

export async function updateClient(
  id: string,
  input: ClientInput,
): Promise<ActionResult> {
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Informe o nome do cliente." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("clients")
    .update({
      name,
      whatsapp: input.whatsapp.trim() || null,
      notes: input.notes.trim() || null,
    })
    .eq("id", id);

  if (error) {
    console.error("Erro ao atualizar client:", error.message);
    return { ok: false, error: "Não foi possível salvar o cliente." };
  }

  revalidatePath("/admin/clientes");
  return { ok: true };
}

export async function deleteClient(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("clients").delete().eq("id", id);

  if (error) {
    if (error.code === "23503") {
      return {
        ok: false,
        error: "Esse cliente tem agendamentos no histórico e não pode ser excluído.",
      };
    }
    console.error("Erro ao excluir client:", error.message);
    return { ok: false, error: "Não foi possível excluir o cliente." };
  }

  revalidatePath("/admin/clientes");
  return { ok: true };
}
