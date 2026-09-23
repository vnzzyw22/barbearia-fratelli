// Cálculo puro de horários disponíveis. Brasil usa fuso fixo (America/Sao_Paulo,
// UTC-3, sem horário de verão desde 2019) — por isso um offset fixo já é
// suficiente, sem precisar de lib de timezone.

const TIMEZONE_OFFSET = "-03:00";
const TIMEZONE = "America/Sao_Paulo";

export interface BusyRange {
  startsAt: string;
  endsAt: string;
}

interface ComputeAvailableSlotsParams {
  dateISO: string; // "2026-09-05"
  openTime: string | null; // "09:00", ou null se fechado no dia
  closeTime: string | null; // "19:00"
  durationMinutes: number;
  busyRanges: BusyRange[];
  stepMinutes?: number;
  nowEpochMs?: number; // horários antes de agora são descartados quando dateISO é hoje
}

function toEpochMs(dateISO: string, time: string) {
  return new Date(`${dateISO}T${time}:00${TIMEZONE_OFFSET}`).getTime();
}

function epochToTimeLabel(epochMs: number) {
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: TIMEZONE,
  }).format(new Date(epochMs));
}

export function computeAvailableSlots({
  dateISO,
  openTime,
  closeTime,
  durationMinutes,
  busyRanges,
  stepMinutes = 30,
  nowEpochMs,
}: ComputeAvailableSlotsParams): string[] {
  if (!openTime || !closeTime) return [];

  const dayStart = toEpochMs(dateISO, openTime);
  const dayEnd = toEpochMs(dateISO, closeTime);
  const durationMs = durationMinutes * 60_000;
  const stepMs = stepMinutes * 60_000;

  const busy = busyRanges.map((range) => ({
    start: new Date(range.startsAt).getTime(),
    end: new Date(range.endsAt).getTime(),
  }));

  const slots: string[] = [];
  for (
    let start = dayStart;
    start + durationMs <= dayEnd;
    start += stepMs
  ) {
    if (nowEpochMs && start < nowEpochMs) continue;

    const end = start + durationMs;
    const overlaps = busy.some((b) => start < b.end && end > b.start);
    if (!overlaps) slots.push(epochToTimeLabel(start));
  }

  return slots;
}

export function timeToStartsAtISO(dateISO: string, time: string) {
  return new Date(`${dateISO}T${time}:00${TIMEZONE_OFFSET}`).toISOString();
}

const WEEKDAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

export function weekdayKeyFor(dateISO: string) {
  // new Date("YYYY-MM-DD") é interpretado como UTC meia-noite; como o fuso é
  // sempre -03:00, isso ainda cai no dia certo da semana no Brasil.
  const weekday = new Date(`${dateISO}T00:00:00Z`).getUTCDay();
  return WEEKDAY_KEYS[weekday];
}
