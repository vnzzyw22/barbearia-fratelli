import { todayISO } from "@/lib/date";

export type PeriodKey = "hoje" | "7d" | "mes" | "anterior" | "custom";

export interface Period {
  key: PeriodKey;
  from: string; // YYYY-MM-DD (fuso America/Sao_Paulo)
  to: string;
  label: string;
}

export const PERIOD_OPTIONS: { key: PeriodKey; label: string }[] = [
  { key: "hoje", label: "Hoje" },
  { key: "7d", label: "7 dias" },
  { key: "mes", label: "Este mês" },
  { key: "anterior", label: "Mês anterior" },
  { key: "custom", label: "Personalizado" },
];

const ISO = /^\d{4}-\d{2}-\d{2}$/;

function addDays(dateISO: string, days: number) {
  const d = new Date(`${dateISO}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function monthBounds(year: number, month: number) {
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const m = String(month).padStart(2, "0");
  return { from: `${year}-${m}-01`, to: `${year}-${m}-${String(last).padStart(2, "0")}` };
}

export function resolvePeriod(params: {
  p?: string;
  de?: string;
  ate?: string;
}): Period {
  const today = todayISO();
  const [y, m] = today.split("-").map(Number);
  const key = (PERIOD_OPTIONS.some((o) => o.key === params.p) ? params.p : "mes") as PeriodKey;

  if (key === "hoje") return { key, from: today, to: today, label: "Hoje" };
  if (key === "7d") return { key, from: addDays(today, -6), to: today, label: "Últimos 7 dias" };
  if (key === "anterior") {
    const py = m === 1 ? y - 1 : y;
    const pm = m === 1 ? 12 : m - 1;
    return { key, ...monthBounds(py, pm), label: "Mês anterior" };
  }
  if (key === "custom" && params.de && params.ate && ISO.test(params.de) && ISO.test(params.ate)) {
    const [from, to] = params.de <= params.ate ? [params.de, params.ate] : [params.ate, params.de];
    return { key, from, to, label: "Período personalizado" };
  }
  return { key: "mes", ...monthBounds(y, m), label: "Este mês" };
}

export function formatDayBR(dateISO: string) {
  const [y, m, d] = dateISO.split("-");
  return `${d}/${m}/${y}`;
}
