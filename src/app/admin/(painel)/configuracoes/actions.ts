"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { DAY_ORDER } from "@/lib/business-hours";
import type { BusinessHours } from "@/lib/supabase/types";

const BUSINESS_SETTINGS_ID = "00000000-0000-0000-0000-000000000001";

interface UpdateBusinessSettingsInput {
  name: string;
  whatsapp: string;
  instagram: string;
  address: string;
  businessHours: BusinessHours;
}

type UpdateResult = { ok: true } | { ok: false; error: string };

function isValidBusinessHours(hours: BusinessHours) {
  return DAY_ORDER.every((day) => {
    const entry = hours[day];
    if (!entry) return false;
    if ("closed" in entry) return entry.closed === true;
    return (
      "open" in entry &&
      "close" in entry &&
      /^\d{2}:\d{2}$/.test(entry.open) &&
      /^\d{2}:\d{2}$/.test(entry.close) &&
      entry.open < entry.close
    );
  });
}

export async function updateBusinessSettings(
  input: UpdateBusinessSettingsInput,
): Promise<UpdateResult> {
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Informe o nome do negócio." };

  if (!isValidBusinessHours(input.businessHours)) {
    return {
      ok: false,
      error: "Verifique os horários: abertura precisa ser antes do fechamento.",
    };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("business_settings")
    .update({
      name,
      whatsapp: input.whatsapp.trim() || null,
      instagram: input.instagram.trim() || null,
      address: input.address.trim() || null,
      business_hours: input.businessHours,
    })
    .eq("id", BUSINESS_SETTINGS_ID);

  if (error) {
    console.error("Erro ao atualizar business_settings:", error.message);
    return { ok: false, error: "Não foi possível salvar as configurações." };
  }

  revalidatePath("/");
  revalidatePath("/agendar");
  revalidatePath("/admin/configuracoes");

  return { ok: true };
}
