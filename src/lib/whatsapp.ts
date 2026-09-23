// Gera link wa.me com mensagem pré-preenchida. Sem integração de API — só o
// link de deep-link do WhatsApp (ver regras de negócio no CLAUDE.md).

export function getWhatsappLink(whatsapp: string | null, message: string) {
  if (!whatsapp) return null;

  const digits = whatsapp.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

interface BookingMessageParams {
  clientName: string;
  serviceName: string;
  staffName: string;
  dateLabel: string;
  timeLabel: string;
  notes?: string;
}

export function buildBookingMessage({
  clientName,
  serviceName,
  staffName,
  dateLabel,
  timeLabel,
  notes,
}: BookingMessageParams) {
  // Canal de confirmação, não de agendamento (ver ANEXO seção 6) — esta
  // mensagem só é oferecida DEPOIS que `createAppointment` já gravou o
  // agendamento como "pending" no banco (ver booking-form.tsx). Tom de voz
  // ainda placeholder — ajustar quando a Fratelli definir o tom real.
  const lines = [
    "✂️ *Fratelli Barber Club | Solicitação de Agendamento*",
    "",
    `Olá! Meu nome é ${clientName} e acabei de solicitar um agendamento pelo site. Seguem os detalhes:`,
    "",
    `💈 *Serviço:* ${serviceName}`,
    `✂️ *Profissional:* ${staffName}`,
    `📅 *Data:* ${dateLabel}`,
    `⏰ *Horário:* ${timeLabel}h`,
  ];

  if (notes) lines.push(`💬 *Observação:* ${notes}`);

  lines.push("", "Aguardo a confirmação, obrigado(a)!");

  return lines.join("\n");
}
