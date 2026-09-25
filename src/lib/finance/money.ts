// Dinheiro SEMPRE em centavos inteiros (nunca float). Só aqui se converte de/para texto.

export function formatCents(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

// "50" | "50,5" | "1.234,56" | "1234.56" | "R$ 50,00" → centavos; null se inválido.
export function parseMoneyToCents(input: string): number | null {
  let s = input.replace(/R\$|\s/g, "");
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const [int, dec = ""] = s.split(".");
  const cents = Number(int) * 100 + Number(dec.padEnd(2, "0"));
  return Number.isSafeInteger(cents) ? cents : null;
}

// Para preencher um <input> de valor a partir de centavos ("50,00").
export function centsToInput(cents: number) {
  return (cents / 100).toFixed(2).replace(".", ",");
}

export function formatBps(bps: number) {
  return `${(bps / 100).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}%`;
}

// "3,5" | "3.5" | "3" → pontos-base (350); null se inválido ou fora de 0–100%.
export function parsePercentToBps(input: string): number | null {
  const s = input.replace(/%|\s/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const bps = Math.round(Number(s) * 100);
  return bps >= 0 && bps <= 10000 ? bps : null;
}

export function bpsToInput(bps: number) {
  return (bps / 100).toString().replace(".", ",");
}
