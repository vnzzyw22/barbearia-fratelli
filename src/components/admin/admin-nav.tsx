"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/agenda", label: "Agenda" },
  { href: "/admin/equipe", label: "Equipe" },
  { href: "/admin/clientes", label: "Clientes" },
  { href: "/admin/servicos", label: "Serviços" },
  { href: "/admin/galeria", label: "Galeria" },
  { href: "/admin/financeiro", label: "Financeiro" },
  { href: "/admin/configuracoes", label: "Configurações" },
];

// Extraído do layout (2026-09-03) só pra poder marcar o item ativo via
// `usePathname` — o layout em si é Server Component (lê a sessão do
// Supabase), então essa marcação de estado só pode viver num client
// component à parte.
export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:overflow-visible">
      {NAV_ITEMS.map((item) => {
        const active =
          item.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`whitespace-nowrap rounded-none px-3 py-2 font-nav text-xs font-bold tracking-widest uppercase transition-colors duration-200 ${
              active
                ? "bg-brand-red text-brand-black"
                : "text-white/60 hover:bg-white/5 hover:text-white"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
