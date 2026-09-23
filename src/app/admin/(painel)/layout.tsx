import { Emblem } from "@/components/site/brand";
import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/admin-nav";
import { createClient } from "@/lib/supabase/server";
import { logout } from "./actions";

export default async function PainelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // O middleware já bloqueia rotas /admin sem sessão; esta checagem aqui é
  // uma segunda camada de defesa direto no layout do painel.
  if (!user) {
    redirect("/admin/login");
  }

  return (
    <div className="flex min-h-full flex-1 flex-col bg-brand-ink md:flex-row">
      <aside className="flex shrink-0 flex-col border-b border-gold/20 bg-teal-ink md:w-56 md:border-b-0 md:border-r">
        <div className="px-4 py-4">
          <span className="flex items-center gap-2.5"><Emblem className="h-9 w-9" /><span className="flex flex-col leading-none"><span className="font-display text-lg font-bold tracking-[0.12em] text-ivory uppercase">Fratelli</span><span className="label mt-1 text-[0.58rem] text-gold">Painel</span></span></span>
        </div>
        <AdminNav />
        <form action={logout} className="border-t border-white/10 p-2">
          <button
            type="submit"
            className="w-full rounded-none px-3 py-2 text-left font-nav text-xs font-bold tracking-widest text-white/60 uppercase transition-colors duration-200 hover:bg-white/5 hover:text-brand-red"
          >
            Sair
          </button>
        </form>
      </aside>
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
