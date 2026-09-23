"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "staff";
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

type ActionResult = { ok: true } | { ok: false; error: string };

function revalidateAll() {
  revalidatePath("/");
  revalidatePath("/agendar");
  revalidatePath("/admin/equipe");
}

function storagePathFromPublicUrl(url: string): string | null {
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const index = url.indexOf(marker);
  return index === -1 ? null : url.slice(index + marker.length);
}

async function uploadPhoto(
  supabase: Awaited<ReturnType<typeof createClient>>,
  file: File,
): Promise<{ url: string } | { error: string }> {
  if (!file.type.startsWith("image/")) {
    return { error: "O arquivo precisa ser uma imagem." };
  }
  if (file.size > MAX_SIZE_BYTES) {
    return { error: "Imagem muito grande (máx. 5MB)." };
  }

  const ext = file.name.split(".").pop() || "jpg";
  const path = `${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type });

  if (error) {
    console.error("Erro ao subir foto de profissional:", error.message);
    return { error: "Não foi possível enviar a foto." };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(path);

  return { url: publicUrl };
}

function readFields(formData: FormData) {
  return {
    name: String(formData.get("name") ?? "").trim(),
    role: String(formData.get("role") ?? "").trim(),
    instagram: String(formData.get("instagram") ?? "").trim(),
    displayOrder: Number(formData.get("displayOrder")) || 0,
    active: formData.get("active") === "true",
  };
}

export async function createStaff(formData: FormData): Promise<ActionResult> {
  const fields = readFields(formData);
  if (!fields.name) return { ok: false, error: "Informe o nome do profissional." };

  const supabase = await createClient();

  let photoUrl: string | null = null;
  const file = formData.get("file");
  if (file instanceof File && file.size > 0) {
    const uploaded = await uploadPhoto(supabase, file);
    if ("error" in uploaded) return { ok: false, error: uploaded.error };
    photoUrl = uploaded.url;
  }

  const { error } = await supabase.from("staff").insert({
    name: fields.name,
    role: fields.role || null,
    instagram: fields.instagram || null,
    photo_url: photoUrl,
    display_order: fields.displayOrder,
    active: fields.active,
  });

  if (error) {
    console.error("Erro ao criar staff:", error.message);
    return { ok: false, error: "Não foi possível criar o profissional." };
  }

  revalidateAll();
  return { ok: true };
}

export async function updateStaff(
  id: string,
  formData: FormData,
): Promise<ActionResult> {
  const fields = readFields(formData);
  if (!fields.name) return { ok: false, error: "Informe o nome do profissional." };

  const supabase = await createClient();

  const update: Record<string, unknown> = {
    name: fields.name,
    role: fields.role || null,
    instagram: fields.instagram || null,
    display_order: fields.displayOrder,
    active: fields.active,
  };

  const file = formData.get("file");
  if (file instanceof File && file.size > 0) {
    const uploaded = await uploadPhoto(supabase, file);
    if ("error" in uploaded) return { ok: false, error: uploaded.error };
    update.photo_url = uploaded.url;
  }

  const { error } = await supabase.from("staff").update(update).eq("id", id);

  if (error) {
    console.error("Erro ao atualizar staff:", error.message);
    return { ok: false, error: "Não foi possível salvar o profissional." };
  }

  revalidateAll();
  return { ok: true };
}

export async function deleteStaff(
  id: string,
  photoUrl: string | null,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("staff").delete().eq("id", id);

  if (error) {
    if (error.code === "23503") {
      return {
        ok: false,
        error:
          "Esse profissional já tem agendamentos no histórico e não pode ser excluído — desative-o em vez disso.",
      };
    }
    console.error("Erro ao excluir staff:", error.message);
    return { ok: false, error: "Não foi possível excluir o profissional." };
  }

  const storagePath = photoUrl ? storagePathFromPublicUrl(photoUrl) : null;
  if (storagePath) {
    await supabase.storage.from(BUCKET).remove([storagePath]);
  }

  revalidateAll();
  return { ok: true };
}
