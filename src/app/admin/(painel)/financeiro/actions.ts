"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { TransactionType } from "@/lib/supabase/types";

type ActionResult = { ok: true } | { ok: false; error: string };

interface CreateTransactionInput {
  type: TransactionType;
  category: string;
  amount: number;
  description: string;
  occurredAtISO: string;
}

export async function createTransaction(
  input: CreateTransactionInput,
): Promise<ActionResult> {
  if (!(input.amount > 0)) return { ok: false, error: "Informe um valor válido." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.occurredAtISO)) {
    return { ok: false, error: "Data inválida." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("transactions").insert({
    type: input.type,
    category: input.category.trim() || null,
    amount: input.amount,
    description: input.description.trim() || null,
    occurred_at: input.occurredAtISO,
  });

  if (error) {
    console.error("Erro ao criar transaction:", error.message);
    return { ok: false, error: "Não foi possível salvar o lançamento." };
  }

  revalidatePath("/admin/financeiro");
  revalidatePath("/admin");
  return { ok: true };
}

export async function deleteTransaction(id: string): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("transactions").delete().eq("id", id);

  if (error) {
    console.error("Erro ao excluir transaction:", error.message);
    return { ok: false, error: "Não foi possível excluir o lançamento." };
  }

  revalidatePath("/admin/financeiro");
  revalidatePath("/admin");
  return { ok: true };
}
