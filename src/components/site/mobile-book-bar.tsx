"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

// Ação primária na zona do polegar (mobile): aparece depois que o CTA do
// hero sai da tela e some quando o rodapé entra (não cobre links do rodapé).
export function MobileBookBar() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const hero = document.getElementById("topo");
    const footer = document.querySelector("footer");
    let heroGone = false;
    let footerIn = false;
    const update = () => setVisible(heroGone && !footerIn);

    const heroObs = new IntersectionObserver(
      ([e]) => {
        heroGone = !e.isIntersecting;
        update();
      },
      { threshold: 0.35 },
    );
    const footerObs = new IntersectionObserver(
      ([e]) => {
        footerIn = e.isIntersecting;
        update();
      },
      { threshold: 0.05 },
    );
    if (hero) heroObs.observe(hero);
    if (footer) footerObs.observe(footer);
    return () => {
      heroObs.disconnect();
      footerObs.disconnect();
    };
  }, []);

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-gold/40 bg-teal-ink px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] transition-transform duration-300 ease-[var(--ease-signature)] md:hidden ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
      inert={!visible}
    >
      <Link
        href="/agendar"
        className="btn flex min-h-12 items-center justify-center gap-3 px-6 py-3.5"
      >
        Reservar horário
        <span aria-hidden="true" className="h-1.5 w-1.5 rotate-45 bg-current" />
      </Link>
    </div>
  );
}
