import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { btree_gist } from "@electric-sql/pglite/contrib/btree_gist";

const ROOT = join(import.meta.dirname, "..", "..");

/**
 * Banco novo em memória com o shim do Supabase + TODAS as migrações, na ordem.
 * `until`: aplica só as migrações cujo nome <= until (para testar upgrade de um
 * banco que já tinha dados no estado antigo).
 */
export async function freshDb({ until } = {}) {
  const db = new PGlite({ extensions: { btree_gist } });
  await db.exec(readFileSync(join(ROOT, "supabase/local/shim.sql"), "utf8"));
  const dir = join(ROOT, "supabase/migrations");
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    if (until && f > until) break;
    await db.exec(readFileSync(join(dir, f), "utf8"));
  }
  return db;
}

/** Aplica um arquivo de migração específico (para simular "rodar a migração nova no banco antigo"). */
export async function applyMigration(db, file) {
  await db.exec(readFileSync(join(ROOT, "supabase/migrations", file), "utf8"));
}

/** Executa `fn` como um papel do Supabase (anon/authenticated) com o usuário do JWT. */
export async function as(db, role, userId, fn) {
  await db.exec(`set role ${role}`);
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [userId ?? ""]);
  try {
    return await fn();
  } finally {
    await db.exec("reset role");
    await db.query("select set_config('request.jwt.claim.sub', '', false)");
  }
}

/** Espera um erro do Postgres e devolve a mensagem (falha o teste se não houver erro). */
export async function expectError(promise, pattern) {
  try {
    await promise;
  } catch (e) {
    const msg = String(e.message ?? e);
    if (pattern && !new RegExp(pattern, "i").test(msg)) throw new Error(`erro inesperado: "${msg}" (esperado /${pattern}/)`);
    return msg;
  }
  throw new Error(`esperava erro${pattern ? ` /${pattern}/` : ""}, mas a operação passou`);
}
