import { createClient } from "./server";
import type {
  AdminAppointment,
  AdminBlockedSlot,
  AdminClient,
  AdminGalleryPhoto,
  AdminService,
  AdminStaff,
  AdminTransaction,
} from "./types";

// Leituras administrativas: exigem sessão autenticada (RLS via policies
// "_admin_all"). Usar só dentro de src/app/admin/**.

export async function getAllServices(): Promise<AdminService[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("services")
    .select(
      "id, name, description, price, duration_minutes, image_url, active, display_order",
    )
    .order("display_order", { ascending: true });

  if (error) {
    console.error("Erro ao buscar services (admin):", error.message);
    return [];
  }

  return data;
}

export async function getAppointmentsForRange(
  fromISO: string,
  toISO: string,
): Promise<AdminAppointment[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("appointments")
    .select(
      "id, starts_at, ends_at, status, notes, client:clients(id, name, whatsapp), service:services(id, name, price), staff:staff(id, name)",
    )
    .lt("starts_at", toISO)
    .gt("ends_at", fromISO)
    .order("starts_at", { ascending: true });

  if (error) {
    console.error("Erro ao buscar appointments (admin):", error.message);
    return [];
  }

  return data as unknown as AdminAppointment[];
}

export async function getBlockedSlotsForRange(
  fromISO: string,
  toISO: string,
): Promise<AdminBlockedSlot[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("blocked_slots")
    .select("id, starts_at, ends_at, reason, staff_id, staff:staff(id, name)")
    .lt("starts_at", toISO)
    .gt("ends_at", fromISO)
    .order("starts_at", { ascending: true });

  if (error) {
    console.error("Erro ao buscar blocked_slots (admin):", error.message);
    return [];
  }

  return data as unknown as AdminBlockedSlot[];
}

export async function getAllClients(): Promise<AdminClient[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clients")
    .select("id, name, whatsapp, notes, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Erro ao buscar clients (admin):", error.message);
    return [];
  }

  return data;
}

export async function getAllGalleryPhotos(): Promise<AdminGalleryPhoto[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("gallery_photos")
    .select("id, url, category, published, display_order")
    .order("display_order", { ascending: true });

  if (error) {
    console.error("Erro ao buscar gallery_photos (admin):", error.message);
    return [];
  }

  return data;
}

export async function getAllStaff(): Promise<AdminStaff[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("staff")
    .select("id, name, role, photo_url, instagram, active, display_order")
    .order("display_order", { ascending: true });

  if (error) {
    console.error("Erro ao buscar staff (admin):", error.message);
    return [];
  }

  return data;
}

export async function getTransactionsForRange(
  fromDateISO: string,
  toDateISO: string,
): Promise<AdminTransaction[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("transactions")
    .select("id, type, category, amount, description, occurred_at")
    .gte("occurred_at", fromDateISO)
    .lte("occurred_at", toDateISO)
    .order("occurred_at", { ascending: false });

  if (error) {
    console.error("Erro ao buscar transactions (admin):", error.message);
    return [];
  }

  return data;
}
