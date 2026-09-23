// Segundo telefone lido da placa da fachada (public/brand/foto-faxada.jpg).
// O número com final 1432 é o WhatsApp (confirmado pelo cliente) e mora em
// business_settings.whatsapp; este aqui é só telefone.
export const EXTRA_PHONES = [{ display: "(44) 99916-7632", tel: "+5544999167632" }] as const;

/** "5544999161432" -> "(44) 99916-1432" */
export function formatBrPhone(raw: string) {
  const d = raw.replace(/\D/g, "").replace(/^55/, "");
  return d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : raw;
}

/** Link "abrir no Google Maps" a partir do endereço (sem iframe). */
export function mapsLink(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}
