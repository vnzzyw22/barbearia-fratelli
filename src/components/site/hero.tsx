// Hero Blend: composição editorial assimétrica — wordmark monumental + grade de
// linhas finas + navalhas como grafismo + placeholder de foto explícito (sem
// arquivo real ainda). Ver BLEND_DESIGN.md. Momento de movimento principal do
// site; o resto é mais contido.
"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { EASE, EASE_OUT } from "@/lib/motion";
import { PoleBand } from "./pole-band";
import { RazorGlyph } from "./brand";

const HEADLINE = ["Escolha o barbeiro.", "Reserve o horário."];

function MaskLine({ children, delay, className }: { children: string; delay: number; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <span className="block overflow-hidden pb-[0.1em]">
      <motion.span
        className={`block ${className ?? ""}`}
        initial={{ y: "105%" }}
        animate={{ y: 0 }}
        transition={{ duration: reduce ? 0.001 : 0.85, delay: reduce ? 0 : delay, ease: EASE }}
      >
        {children}
      </motion.span>
    </span>
  );
}

/* Placeholder de foto explícito — sem imagem real, sem recorte de banco de imagens. */
function PhotoFrame() {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className="relative aspect-[4/5] w-full overflow-hidden bg-steel"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0.001 : 0.8, delay: reduce ? 0 : 0.5, ease: EASE_OUT }}
    >
      <RazorGlyph crossed className="absolute inset-[26%] h-auto w-auto text-royal/20" />
      <span aria-hidden="true" className="absolute inset-3 border border-white/15" />
      <div className="absolute inset-x-3 bottom-3 flex items-baseline justify-between border-t border-white/15 pt-3">
        <p className="meta text-fog">
          <span className="font-heading block text-lg leading-none text-white">Na cadeira</span>
          <span className="italic">foto real a enviar</span>
        </p>
        <span className="font-heading text-xs text-royal-soft">N.01</span>
      </div>
    </motion.div>
  );
}

export function Hero() {
  const reduce = useReducedMotion();
  return (
    <section id="topo" className="relative isolate overflow-hidden bg-ink pt-16 text-white md:pt-[72px]">
      <div aria-hidden="true" className="grain absolute inset-0 -z-10" />

      {/* wordmark monumental de fundo — profundidade, não decoração aleatória */}
      <motion.span
        aria-hidden="true"
        className="font-display pointer-events-none absolute top-[6%] -left-[2%] -z-10 text-[26vw] leading-none text-white/[0.035] select-none md:text-[18vw]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: reduce ? 0.001 : 1.4, ease: EASE_OUT }}
      >
        BLEND
      </motion.span>

      <div className="relative mx-auto grid max-w-[1440px] grid-cols-12 gap-x-5 gap-y-12 px-5 pt-14 pb-16 md:min-h-[calc(100svh-72px)] md:items-center md:gap-x-8 md:px-12 md:py-16">
        <div className="relative col-span-12 md:col-span-7">
          <p className="label text-royal-soft">Barbearia &amp; agendamento online</p>

          <h1 className="font-display mt-5 text-[2.5rem] leading-[0.98] sm:text-6xl lg:text-[4.8rem]">
            <span className="sr-only">Blend Barber Club. </span>
            <MaskLine delay={0.2}>{HEADLINE[0]}</MaskLine>
            <MaskLine delay={0.32} className="text-royal-soft">
              {HEADLINE[1]}
            </MaskLine>
          </h1>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reduce ? 0.001 : 0.7, delay: reduce ? 0 : 0.78, ease: EASE_OUT }}
            className="mt-7 flex flex-col gap-7 md:mt-9"
          >
            <p className="max-w-md border-l border-white/15 pl-4 text-[1.02rem] leading-relaxed text-fog">
              Serviço, profissional, dia e hora escolhidos direto no site, com a agenda real de cada
              barbeiro.
            </p>
            <div className="flex flex-col items-stretch gap-5 sm:flex-row sm:items-center sm:gap-8">
              <Link href="/agendar" className="btn inline-flex min-h-12 items-center justify-center gap-3 px-8 py-4">
                Agendar horário
              </Link>
              <a href="#servicos" className="group relative inline-block self-center py-3 font-semibold text-white">
                Ver serviços e valores
                <span className="absolute inset-x-0 bottom-2 h-px bg-royal transition-transform duration-500 ease-[var(--ease-signature)] group-hover:origin-right group-hover:scale-x-0" />
              </a>
            </div>
          </motion.div>
        </div>

        <div className="col-span-12 md:col-span-4 md:col-start-9">
          <PhotoFrame />
        </div>
      </div>
      <PoleBand />
    </section>
  );
}
