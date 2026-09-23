"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const BUCKET = "gallery";
const MAX_SIZE_BYTES = 5 * 1024 * 1024;

type ActionResult = { ok: true } | { ok: false; error: string };

function revalidateAll() {
  revalidatePath("/");
  revalidatePath("/admin/galeria");
}

export async function uploadGalleryPhoto(
  formData: FormData,
): Promise<ActionResult> {
  const file = formData.get("file");
  const category = String(formData.get("category") ?? "");

  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Selecione uma imagem." };
  }
  if (!file.type.startsWith("image/")) {
    return { ok: false, error: "O arquivo precisa ser uma imagem." };
  }
  if (file.size > MAX_SIZE_BYTES) {
    return { ok: false, error: "Imagem muito grande (máx. 5MB)." };
  }

  const supabase = await createClient();
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${crypto.randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType: file.type });

  if (uploadError) {
    console.error("Erro ao subir foto:", uploadError.message);
    return { ok: false, error: "Não foi possível enviar a imagem." };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(path);

  const { error: insertError } = await supabase.from("gallery_photos").insert({
    url: publicUrl,
    category: category.trim() || null,
    published: true,
    display_order: 0,
  });

  if (insertError) {
    console.error("Erro ao registrar foto:", insertError.message);
    await supabase.storage.from(BUCKET).remove([path]);
    return { ok: false, error: "Não foi possível salvar a foto." };
  }

  revalidateAll();
  return { ok: true };
}

interface UpdatePhotoInput {
  category: string;
  published: boolean;
  displayOrder: number;
}

export async function updateGalleryPhoto(
  id: string,
  input: UpdatePhotoInput,
): Promise<ActionResult> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("gallery_photos")
    .update({
      category: input.category.trim() || null,
      published: input.published,
      display_order: input.displayOrder,
    })
    .eq("id", id);

  if (error) {
    console.error("Erro ao atualizar foto:", error.message);
    return { ok: false, error: "Não foi possível salvar a foto." };
  }

  revalidateAll();
  return { ok: true };
}

// Extrai o path do bucket a partir da URL pública. Fotos que não vieram do
// Storage (ex.: as fotos de portfólio em public/imagens, referenciadas
// diretamente na migration de seed) não têm esse padrão — nesse caso só o
// registro do banco é removido.
function storagePathFromPublicUrl(url: string): string | null {
  const marker = `/storage/v1/object/public/${BUCKET}/`;
  const index = url.indexOf(marker);
  return index === -1 ? null : url.slice(index + marker.length);
}

export async function deleteGalleryPhoto(id: string, url: string): Promise<ActionResult> {
  const supabase = await createClient();

  const { error } = await supabase.from("gallery_photos").delete().eq("id", id);

  if (error) {
    console.error("Erro ao excluir foto:", error.message);
    return { ok: false, error: "Não foi possível excluir a foto." };
  }

  const storagePath = storagePathFromPublicUrl(url);
  if (storagePath) {
    await supabase.storage.from(BUCKET).remove([storagePath]);
  }

  revalidateAll();
  return { ok: true };
}
