"use client";

import Link from "next/link";
import { AnimatePresence, motion, useScroll, useSpring } from "framer-motion";
import { useEffect, useState } from "react";
import { EASE } from "@/lib/motion";
import { BlendMark } from "./brand";

const links = [
  { href: "/#servicos", label: "Serviços" },
  { href: "/#clube", label: "O Clube" },
  { href: "/#equipe", label: "Equipe" },
  { href: "/#galeria", label: "Galeria" },
  { href: "/#local", label: "Local" },
];

export function Navbar() {
  const [open, setOpen] = useState(false);
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 140, damping: 28, mass: 0.4 });

  // Trava o scroll do fundo com o menu aberto e fecha com Esc.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-ink">
      {/* progresso de leitura: orienta em página longa (estado, não decoração) */}
      <motion.div aria-hidden="true" style={{ scaleX: progress }} className="absolute inset-x-0 -bottom-px h-[2px] origin-left bg-royal" />
      <nav
        aria-label="Principal"
        className="mx-auto flex h-16 max-w-[1440px] items-center justify-between px-5 md:h-[72px] md:px-12"
      >
        <Link href="/" className="flex items-center gap-3" onClick={() => setOpen(false)}>
          <BlendMark />
        </Link>

        <ul className="hidden items-center gap-9 md:flex">
          {links.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="label group relative py-2 text-white/80 transition-colors hover:text-royal-soft"
              >
                {link.label}
                <span className="absolute inset-x-0 -bottom-0.5 h-px origin-left scale-x-0 bg-royal transition-transform duration-300 ease-[var(--ease-signature)] group-hover:scale-x-100" />
              </a>
            </li>
          ))}
        </ul>

        <Link href="/agendar" className="btn hidden px-6 py-3 md:inline-block">
          Agendar horário
        </Link>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="relative flex h-11 w-11 items-center justify-center border border-white/25 md:hidden"
          aria-label={open ? "Fechar menu" : "Abrir menu"}
          aria-expanded={open}
          aria-controls="menu-mobile"
        >
          <span className="relative block h-3 w-5">
            <span
              className={`absolute inset-x-0 h-px bg-white transition-[top,transform] duration-300 ${open ? "top-1.5 rotate-45" : "top-0"}`}
            />
            <span
              className={`absolute inset-x-0 top-1.5 h-px bg-white transition-opacity duration-200 ${open ? "opacity-0" : ""}`}
            />
            <span
              className={`absolute inset-x-0 h-px bg-white transition-[top,transform] duration-300 ${open ? "top-1.5 -rotate-45" : "top-3"}`}
            />
          </span>
        </button>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            id="menu-mobile"
            initial={{ clipPath: "inset(0 0 100% 0)" }}
            animate={{ clipPath: "inset(0 0 0% 0)" }}
            exit={{ clipPath: "inset(0 0 100% 0)" }}
            transition={{ duration: 0.5, ease: EASE }}
            className="fixed inset-x-0 top-16 bottom-0 overflow-hidden overscroll-contain bg-ink md:hidden"
          >
            <span
              aria-hidden="true"
              className="font-display absolute -right-10 -bottom-10 text-[11rem] leading-none text-white/[0.04] select-none"
            >
              B
            </span>
            <div className="relative flex h-full flex-col px-6 pt-8 pb-10">
              <ul className="flex flex-col">
                {links.map((link, i) => (
                  <li key={link.href} className="flex items-baseline gap-4 border-b border-white/10 py-1">
                    <span className="font-heading text-sm text-royal-soft tabular-nums">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <a href={link.href} onClick={() => setOpen(false)} className="flex min-h-14 flex-1 items-center">
                      <span className="font-display text-4xl text-white">{link.label}</span>
                    </a>
                  </li>
                ))}
              </ul>
              <Link href="/agendar" onClick={() => setOpen(false)} className="btn mt-auto px-6 py-4 text-center">
                Agendar horário
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
