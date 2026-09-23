// Validações puras compartilhadas entre o client (booking-form.tsx, pra
// habilitar/desabilitar avanço de step) e o server (agendar/actions.ts,
// fonte de verdade real) — extraídas em 2026-09-16 pra não duplicar a
// mesma regra em dois lugares.

const MAX_DAYS_AHEAD = 60;

export function isValidFutureDate(dateISO: string, now = new Date()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateISO)) return false;

  const min = new Date(now.toDateString());
  const max = new Date(min);
  max.setDate(max.getDate() + MAX_DAYS_AHEAD);

  const date = new Date(`${dateISO}T00:00:00`);
  return date >= min && date <= max;
}

export function isValidTime(time: string): boolean {
  return /^\d{2}:\d{2}$/.test(time);
}

export function isValidWhatsapp(whatsapp: string): boolean {
  return whatsapp.replace(/\D/g, "").length >= 10;
}

export function isValidName(name: string): boolean {
  return name.trim().length > 0;
}
