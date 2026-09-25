import type { ReactNode } from "react";
import { cardClass } from "@/components/admin/theme";

// Peças visuais comuns do Financeiro (server-safe). Mesmo vocabulário do painel:
// fundo teal escuro, bordas retas, rótulos em Zilla caixa-alta, valores em destaque.

export function Kpi({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "neutral" | "positive" | "negative" | "warning";
}) {
  const color = {
    neutral: "text-white",
    positive: "text-green-400",
    negative: "text-red-400",
    warning: "text-amber-300",
  }[tone];
  return (
    <div className={cardClass}>
      <p className="font-nav text-[11px] font-bold tracking-widest text-white/50 uppercase">{label}</p>
      <p className={`mt-1.5 text-2xl font-bold tabular-nums ${color}`}>{value}</p>
      {hint && <p className="mt-1 text-xs text-white/40">{hint}</p>}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="border border-dashed border-white/15 p-4 text-sm text-white/45">{children}</p>;
}

export function Block({
  title,
  question,
  children,
  aside,
}: {
  title: string;
  question?: string;
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="font-nav text-sm font-bold tracking-widest text-white uppercase">{title}</h2>
          {question && <p className="mt-0.5 text-sm text-white/45">{question}</p>}
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

export const tableWrapClass = "overflow-x-auto border border-white/10";
export const tableClass = "w-full min-w-[32rem] border-collapse text-left text-sm text-white/85";
export const thClass =
  "border-b border-white/10 bg-white/[0.03] px-3 py-2 font-nav text-[11px] font-bold tracking-widest text-white/50 uppercase whitespace-nowrap";
export const tdClass = "border-b border-white/5 px-3 py-2 align-top";
export const tdNumClass = `${tdClass} text-right tabular-nums whitespace-nowrap`;
export const thNumClass = `${thClass} text-right`;
