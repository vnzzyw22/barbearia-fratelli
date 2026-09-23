// Tokens de estilo compartilhados do painel admin (2026-09-03), redesign
// pedido pelo cliente pra seguir a mesma identidade escura/premium já
// aplicada em /agendar. Classes centralizadas aqui em vez de repetidas em
// cada uma das 7 seções do painel — mesmo padrão de string de classe
// compartilhada já usado em booking-form.tsx (`fieldClass`/`labelClass`),
// só que num módulo próprio porque aqui são várias telas, não um formulário
// só.

export const cardClass = "rounded-none border border-white/10 bg-teal-deep p-4";

export const fieldClass =
  "rounded-none border border-transparent bg-white/[0.06] px-3 py-2 text-sm text-white [color-scheme:dark] transition-colors duration-200 outline-none focus:border-brand-red placeholder:text-white/30";

export const labelClass =
  "font-nav text-xs font-bold tracking-widest text-white/70 uppercase";

export const pageTitleClass =
  "font-nav text-2xl font-bold tracking-[1px] text-white uppercase";

export const pageSubtitleClass = "mt-2 text-sm text-white/50";

export const sectionTitleClass =
  "font-nav text-sm font-bold tracking-widest text-white uppercase";

export const buttonPrimaryClass =
  "rounded-none bg-brand-red px-5 py-2 font-nav text-xs font-bold tracking-widest text-brand-black uppercase transition hover:opacity-90 disabled:opacity-50";

export const buttonSecondaryClass =
  "rounded-none border border-white/15 px-5 py-2 font-nav text-xs font-bold tracking-widest text-white/70 uppercase transition-colors duration-200 hover:border-brand-red hover:text-white disabled:opacity-50";

export const linkDangerClass =
  "font-nav text-xs font-bold tracking-widest text-white/40 uppercase transition-colors duration-200 hover:text-red-400";

export const linkPrimaryClass =
  "font-nav text-xs font-bold tracking-widest text-brand-red uppercase transition-colors duration-200 hover:text-white";

// Botões de filtro (navegação de data, "Hoje", etc.) — mesmo padrão visual
// dos blocos de horário do agendamento público: cinza escuro em repouso,
// vermelho sólido quando ativo/selecionado.
export function filterButtonClass(active: boolean) {
  return `rounded-none border px-4 py-2 font-nav text-xs font-bold tracking-widest uppercase transition-colors duration-200 ${
    active
      ? "border-brand-red bg-brand-red text-brand-black"
      : "border-transparent bg-white/[0.06] text-white/70 hover:border-brand-red hover:text-white"
  }`;
}

const BADGE_TONES = {
  amber: "bg-amber-500/15 text-amber-300",
  green: "bg-green-500/15 text-green-400",
  red: "bg-red-500/15 text-red-400",
  neutral: "bg-white/10 text-white/50",
} as const;

export function badgeClass(tone: keyof typeof BADGE_TONES) {
  return `rounded-none px-2 py-0.5 text-xs font-medium ${BADGE_TONES[tone]}`;
}
