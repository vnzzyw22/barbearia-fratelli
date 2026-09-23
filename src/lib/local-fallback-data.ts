import type { BusinessSettings, GalleryPhoto, Service, Staff } from "./supabase/types";

// Espelha supabase/seed.sql — usado só quando não há Supabase configurado
// (ver src/lib/supabase/config.ts), pra pré-visualizar o site público antes
// do projeto Supabase da Fratelli existir.
//
// ATENÇÃO: serviços/preços são EXEMPLOS genéricos e o horário de funcionamento
// é o da base do projeto — nenhum foi confirmado pela Fratelli. Endereço,
// Instagram, WhatsApp (final 1432) e cidade foram confirmados/lidos da placa.
// Equipe e galeria são placeholders explícitos. Manter em sincronia manual
// com supabase/seed.sql.
export const FALLBACK_BUSINESS: BusinessSettings = {
  id: "00000000-0000-0000-0000-000000000001",
  name: "Fratelli Barber Club",
  whatsapp: "5544999161432",
  instagram: "fratellibarberclub",
  address: "Av. das Grevíleas, 148 — Maringá, PR",
  business_hours: {
    mon: { open: "09:00", close: "19:30" },
    tue: { open: "09:00", close: "19:30" },
    wed: { open: "09:00", close: "19:30" },
    thu: { open: "09:00", close: "19:30" },
    fri: { open: "09:00", close: "19:30" },
    sat: { open: "08:00", close: "14:00" },
    sun: { closed: true },
  },
};

// SERVIÇOS E PREÇOS DE EXEMPLO (genéricos, autorizados pelo cliente enquanto a
// tabela real não chega) — substituir pelos valores da Fratelli.
export const FALLBACK_SERVICES: Service[] = [
  { id: "fallback-1", name: "Corte", description: null, price: 50, duration_minutes: 40, image_url: null },
  { id: "fallback-2", name: "Barba", description: null, price: 40, duration_minutes: 30, image_url: null },
  { id: "fallback-3", name: "Corte e Barba", description: null, price: 85, duration_minutes: 70, image_url: null },
  { id: "fallback-4", name: "Sobrancelha", description: null, price: 20, duration_minutes: 15, image_url: null },
  { id: "fallback-5", name: "Pezinho e acabamento", description: null, price: 15, duration_minutes: 15, image_url: null },
  { id: "fallback-6", name: "Hidratação capilar", description: null, price: 45, duration_minutes: 30, image_url: null },
  { id: "fallback-7", name: "Selagem", description: null, price: 120, duration_minutes: 90, image_url: null },
  { id: "fallback-8", name: "Coloração", description: "A partir de", price: 60, duration_minutes: 45, image_url: null },
];

// PLACEHOLDER — substituir pelos barbeiros reais da Fratelli.
export const FALLBACK_STAFF: Staff[] = [
  { id: "fallback-staff-1", name: "Barbeiro 01", role: "Barbeiro", photo_url: null, instagram: null },
  { id: "fallback-staff-2", name: "Barbeiro 02", role: "Barbeiro", photo_url: null, instagram: null },
  { id: "fallback-staff-3", name: "Barbeiro 03", role: "Barbeiro", photo_url: null, instagram: null },
];

// Sem fotos reais da Fratelli ainda — a galeria fica vazia (a seção de
// galeria foi removida da Home enquanto não houver material).
export const FALLBACK_GALLERY: GalleryPhoto[] = [];
