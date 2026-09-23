const TIMEZONE = "America/Sao_Paulo";

export function todayISO() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIMEZONE }).format(
    new Date(),
  );
}

export function currentMonthISO() {
  return todayISO().slice(0, 7);
}

export function shiftMonth(monthISO: string, delta: number) {
  const [year, month] = monthISO.split("-").map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}
