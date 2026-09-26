import { redirect } from "next/navigation";
import Link from "next/link";
import { logout } from "@/app/admin/(painel)/actions";
import { NoAccess } from "@/components/account/no-access";
import { Emblem } from "@/components/site/brand";
import { getAccess } from "@/lib/auth/access";
import { getBarberMe } from "@/lib/supabase/commission-queries";

export const metadata = { title: "Minha área", robots: { index: false, follow: false } };

const LINKS = [
  { href: "/barbeiro", label: "Agenda" },
  { href: "/barbeiro/comissoes", label: "Comissões" },
  { href: "/barbeiro/conta", label: "Conta" },
];

// Área do barbeiro. Rota separada do painel do dono: nada do painel administrativo é montado aqui.
// O que aparece vem de funções do banco que descobrem o barbeiro pelo login.
export default async function BarbeiroLayout({ children }: { children: React.ReactNode }) {
  const access = await getAccess();
  if (!access) redirect("/admin/login");
  if (access.role === "owner") redirect("/admin");
  if (access.role !== "barber") return <NoAccess />;

  const me = await getBarberMe();

  return (
    <div className="flex min-h-screen flex-col bg-brand-ink">
      <header className="border-b border-gold/20 bg-teal-ink">
        <div className="mx-auto flex w-full max-w-3xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
          <span className="flex items-center gap-2.5">
            <Emblem className="h-8 w-8" />
            <span className="flex flex-col leading-none">
              <span className="font-display text-base font-bold tracking-[0.12em] text-ivory uppercase">Fratelli</span>
              <span className="label mt-1 text-[0.58rem] text-gold">{me?.name ?? "Minha área"}</span>
            </span>
          </span>
          <form action={logout}>
            <button type="submit" className="px-2 py-2 font-nav text-xs font-bold tracking-widest text-white/60 uppercase hover:text-brand-red">
              Sair
            </button>
          </form>
        </div>
        <nav aria-label="Minha área" className="mx-auto flex w-full max-w-3xl gap-1 px-2 pb-2">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="rounded-none px-3 py-2 font-nav text-xs font-bold tracking-widest text-white/70 uppercase hover:bg-white/5 hover:text-white">
              {l.label}
            </Link>
          ))}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 p-4 md:p-6">{children}</main>
    </div>
  );
}
