// Permite rodar o site público em modo de pré-visualização antes de existir
// um projeto Supabase (ver CLAUDE.md > Pendências — criação de conta/projeto
// é manual, fora do alcance do agente). Usado em queries.ts (getters
// públicos retornam vazio/null em vez de deixar o supabase-js lançar erro
// por URL/chave ausentes) e em proxy.ts (pula a checagem de sessão). O
// painel /admin continua exigindo Supabase de verdade — sem banco não tem
// login, leitura nem escrita real, então não faz sentido fingir que
// funciona.
export const isSupabaseConfigured = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);
