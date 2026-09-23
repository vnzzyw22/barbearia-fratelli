import type { BusinessHours } from "@/lib/supabase/types";

export const DAY_ORDER = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

export const DAY_LABELS: Record<(typeof DAY_ORDER)[number], string> = {
  mon: "Segunda",
  tue: "Terça",
  wed: "Quarta",
  thu: "Quinta",
  fri: "Sexta",
  sat: "Sábado",
  sun: "Domingo",
};

export function formatBusinessHours(hours: BusinessHours) {
  return DAY_ORDER.filter((day) => hours[day]).map((day) => {
    const entry = hours[day];
    const label = DAY_LABELS[day];

    if ("closed" in entry && entry.closed) {
      return { label, value: "Fechado" };
    }

    if ("open" in entry) {
      return { label, value: `${entry.open} – ${entry.close}` };
    }

    return { label, value: "—" };
  });
}
