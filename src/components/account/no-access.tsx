import { logout } from "@/app/admin/(painel)/actions";

// Login válido, mas sem perfil (nem dono, nem barbeiro): não há nada a mostrar. O banco também nega tudo.
export function NoAccess() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-brand-ink p-6 text-center">
      <h1 className="font-nav text-xl font-bold tracking-[1px] text-white uppercase">Sem acesso</h1>
      <p className="max-w-sm text-sm text-white/60">
        Esta conta não tem permissão para usar o painel. Peça ao administrador para liberar o acesso.
      </p>
      <form action={logout}>
        <button
          type="submit"
          className="rounded-none border border-white/15 px-5 py-2 font-nav text-xs font-bold tracking-widest text-white/70 uppercase hover:border-brand-red hover:text-white"
        >
          Sair
        </button>
      </form>
    </main>
  );
}
