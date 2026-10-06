// Segundo telefone (fixo), além do WhatsApp em business_settings.whatsapp.
// Era o telefone da placa da Fratelli — removido no rebrand (2026-10-06):
// o Google Business da Blend só confirma um telefone, que já é o WhatsApp.
// Preencher aqui só se a Blend tiver um segundo número real confirmado.
export const EXTRA_PHONES: readonly { display: string; tel: string }[] = [];

/** "5544999161432" -> "(44) 99916-1432" */
export function formatBrPhone(raw: string) {
  const d = raw.replace(/\D/g, "").replace(/^55/, "");
  return d.length === 11 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}` : raw;
}

/** Link "abrir no Google Maps" a partir do endereço (sem iframe). */
export function mapsLink(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}
