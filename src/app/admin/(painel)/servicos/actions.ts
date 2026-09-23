"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

interface ServiceInput {
  name: string;
  description: string;
  price: number;
  durationMinutes: number;
  displayOrder: number;
  active: boolean;
}

type ActionResult = { ok: true } | { ok: false; error: string };

function validate(input: ServiceInput): string | null {
  if (!input.name.trim()) return "Informe o nome do serviço.";
  if (!(input.price >= 0)) return "Preço inválido.";
  if (!(input.durationMinutes > 0)) return "Duração inválida.";
  return null;
}

function revalidateAll() {
  revalidatePath("/");
  revalidatePath("/agendar");
  revalidatePath("/admin/servicos");
}

export async function createService(input: ServiceInput): Promise<ActionResult> {
  const validationError = validate(input);
  if (validationError) return { ok: false, error: validationError };

  const supabase = await createClient();
  const { error } = await supabase.from("services").insert({
    name: input.name.trim(),
    description: input.description.trim() || null,
    price: input.price,
    duration_minutes: input.durationMinutes,
    display_order: input.displayOrder,
    active: input.active,
  });

  if (error) {
    console.error("Erro ao criar service:", error.message);
    return { ok: false, error: "Não foi possível criar o serviço." };
  }

  revalidateAll();
  return { ok: true };
}

export async function updateService(
  id: string,
  input: ServiceInput,
): Promise<ActionResult> {
  const validationError = validate(input);
  if (validationError) return { ok: false, error: validationError };

  const supabase = await createClient();
  const { error } = await supabase
    .from("services")
    .update({
      name: input.name.trim(),
      description: input.description.trim() || null,
      price: input.price,
      duration_minutes: input.durationMinutes,
      display_order: input.displayOrder,
      active: input.active,
    })
    .eq("id", id);

  if (error) {
    console.error("Erro ao atualizar service:", error.message);
    return { ok: false, error: "Não foi possível salvar o serviço." };
  }

  revalidateAll();
  return { ok: true };
}

export async function deleteService(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("services").delete().eq("id", id);

  if (error) {
    if (error.code === "23503") {
      return {
        ok: false,
        error:
          "Esse serviço já tem agendamentos no histórico e não pode ser excluído — desative-o em vez disso.",
      };
    }
    console.error("Erro ao excluir service:", error.message);
    return { ok: false, error: "Não foi possível excluir o serviço." };
  }

  revalidateAll();
  return { ok: true };
}
