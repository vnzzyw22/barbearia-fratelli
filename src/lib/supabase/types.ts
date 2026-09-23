// Tipos manuais espelhando supabase/migrations/20260828120000_schema_fase1.sql.
// Cobrem só as colunas usadas pelo site público por enquanto.

export type BusinessHours = Record<
  string,
  { open: string; close: string } | { closed: true }
>;

export interface BusinessSettings {
  id: string;
  name: string;
  whatsapp: string | null;
  instagram: string | null;
  address: string | null;
  business_hours: BusinessHours;
}

export interface Service {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_minutes: number;
  image_url: string | null;
}

// Visão completa da tabela — usada só no painel (admin também vê inativos).
export interface AdminService extends Service {
  active: boolean;
  display_order: number;
}

export interface Staff {
  id: string;
  name: string;
  role: string | null;
  photo_url: string | null;
  instagram: string | null;
}

export interface AdminStaff extends Staff {
  active: boolean;
  display_order: number;
}

export interface GalleryPhoto {
  id: string;
  url: string;
  category: string | null;
}

export interface AdminGalleryPhoto extends GalleryPhoto {
  published: boolean;
  display_order: number;
}

export type AppointmentStatus = "pending" | "confirmed" | "cancelled";

export interface AdminAppointment {
  id: string;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
  notes: string | null;
  client: { id: string; name: string; whatsapp: string | null } | null;
  service: { id: string; name: string; price: number } | null;
  staff: { id: string; name: string } | null;
}

export interface AdminBlockedSlot {
  id: string;
  starts_at: string;
  ends_at: string;
  reason: string | null;
  staff_id: string | null;
  staff: { id: string; name: string } | null;
}

export interface AdminClient {
  id: string;
  name: string;
  whatsapp: string | null;
  notes: string | null;
  created_at: string;
}

export type TransactionType = "income" | "expense";

export interface AdminTransaction {
  id: string;
  type: TransactionType;
  category: string | null;
  amount: number;
  description: string | null;
  occurred_at: string;
}
