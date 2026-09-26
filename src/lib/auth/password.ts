// Regras da senha do painel (ele mexe em dinheiro). Não dependem só da regra do Supabase.
const COMMON = ["123456", "12345678", "123456789", "1234567890", "senha", "password", "qwerty", "fratelli", "barbearia", "111111"];

export const PASSWORD_MIN = 10;

export function passwordProblem(next: string, current: string, email: string | null): string | null {
  if (next.length < PASSWORD_MIN) return `A nova senha precisa ter pelo menos ${PASSWORD_MIN} caracteres.`;
  if (next === current) return "A nova senha precisa ser diferente da atual.";
  if (/^\d+$/.test(next)) return "Use letras junto com números; só números é fácil de adivinhar.";
  if (/^(.)\1+$/.test(next)) return "Evite repetir o mesmo caractere.";
  const lower = next.toLowerCase();
  if (COMMON.some((c) => lower.includes(c))) return "Essa senha é previsível. Escolha outra.";
  const local = email?.split("@")[0]?.toLowerCase();
  if (local && local.length >= 4 && lower.includes(local)) return "Não use o seu e-mail na senha.";
  return null;
}
