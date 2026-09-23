// Hero: placa da logo emoldurada + chamada para o agendamento. Momento de movimento
// principal do site (a placa "se monta"); o resto do site é quase estático.
"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { EASE, EASE_OUT } from "@/lib/motion";
import { PoleBand } from "./pole-band";

function HeroCopy({ className }: { className?: string }) {
  return (
    <div className={className}>
      <h1 className="font-display text-[2.4rem] leading-[1.02] tracking-[0.005em] text-ivory sm:text-6xl lg:text-[4.6rem]">
        <span className="sr-only">Fratelli Barber Club. </span>
        {["Escolha o barbeiro.", "Reserve o horário."].map((line, i) => (
          <span key={line} className="block overflow-hidden pb-[0.1em]">
            <motion.span
              className="block"
              initial={{ y: "105%" }}
              animate={{ y: 0 }}
              transition={{ duration: 0.9, delay: 0.25 + i * 0.11, ease: EASE }}
            >
              {line}
            </motion.span>
          </span>
        ))}
      </h1>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.85, ease: EASE_OUT }}
        className="mt-6 flex flex-col gap-6 md:mt-7"
      >
        <p className="max-w-md text-[1.02rem] leading-relaxed text-mist">
          Serviço, profissional, dia e hora escolhidos direto no site, com a agenda de cada
          barbeiro.
        </p>
        <div className="flex flex-col items-stretch gap-5 sm:flex-row sm:items-center sm:gap-8">
          <Link
            href="/agendar"
            className="btn group inline-flex min-h-12 items-center justify-center gap-3 px-8 py-4"
          >
            Reservar horário
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 rotate-45 bg-current transition-transform duration-300 group-hover:scale-150"
            />
          </Link>
          <a href="#servicos" className="group relative inline-block self-center py-3 font-semibold text-ivory">
            Ver serviços e valores
            <span className="absolute inset-x-0 bottom-2 h-px bg-gold transition-transform duration-500 ease-[var(--ease-signature)] group-hover:origin-right group-hover:scale-x-0" />
          </a>
        </div>
      </motion.div>
    </div>
  );
}

/* Placa da logo (mesma composição da fachada) */
// A logo oficial (emblema + wordmark + BARBER CLUB) montada com os mesmos
// recortes/proporções do arquivo do cliente, dentro de uma moldura dourada —
// como a placa da fachada. O corte do F e do I do arquivo original vira o corte
// da moldura. Tamanho contido: é onde a logo tem nitidez.
function LogoPlaque({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  // Momento focal do site: a placa "se monta" — moldura, leão, FRATELLI (revelado da
  // esquerda p/ a direita, como leitura), BARBER CLUB. `initial` fixo (hidratação);
  // reduced-motion só zera a duração.
  const wipe = (delay: number, duration = 0.9) => ({
    initial: { clipPath: "inset(0 100% 0 0)" },
    animate: { clipPath: "inset(0 0% 0 0)" },
    transition: { duration: reduce ? 0.001 : duration, delay: reduce ? 0 : delay, ease: EASE_OUT },
  });
  return (
    <div className={`relative aspect-square w-full bg-teal-ink/40 ${className ?? ""}`}>
      <motion.div aria-hidden="true" className="absolute inset-0" {...wipe(0.05, 0.8)}>
        <div className="absolute inset-0 border border-gold/70" />
        <div className="absolute inset-2 border border-gold/25" />
      </motion.div>
      <div className="absolute inset-[1px] overflow-hidden">
        <motion.div
          className="absolute top-[1.1%] left-[25.8%] w-[48.3%]"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: reduce ? 0.001 : 0.7, delay: reduce ? 0 : 0.2, ease: EASE_OUT }}
        >
          <Image
            src="/brand/emblem.webp"
            alt="Fratelli Barber Club: leão dentro de um anel dourado"
            width={512}
            height={512}
            priority
            unoptimized
            className="block w-full"
          />
        </motion.div>
        <motion.div className="absolute top-[53.6%] left-0 w-full" {...wipe(0.42, 0.8)}>
          <Image src="/brand/wordmark.svg" alt="" width={3156} height={1032} priority unoptimized className="block w-full" />
        </motion.div>
        <motion.div className="absolute top-[86.7%] left-0 w-full" {...wipe(0.8, 0.55)}>
          <Image src="/brand/lockup-sub.svg" alt="" width={3156} height={348} unoptimized className="block w-full" />
        </motion.div>
      </div>
    </div>
  );
}

export function Hero() {
  return (
    <section id="topo" className="relative isolate overflow-hidden bg-teal pt-16 text-ivory md:pt-[72px]">
      <div aria-hidden="true" className="grain absolute inset-0 -z-10" />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10"
        style={{ background: "radial-gradient(ellipse 80% 70% at 75% 40%, transparent 0%, rgba(8,42,48,0.55) 100%)" }}
      />

      <div className="relative mx-auto grid max-w-[1440px] grid-cols-12 items-center gap-y-10 px-5 pt-10 pb-16 md:min-h-[calc(100svh-72px-0.75rem)] md:px-12 md:py-16">
        <div className="col-span-12 row-start-1 mx-auto w-full max-w-[340px] sm:max-w-[400px] md:col-span-5 md:col-start-8 md:max-w-[500px] md:justify-self-center">
          <LogoPlaque />
        </div>
        <HeroCopy className="relative z-10 col-span-12 row-start-2 md:col-span-7 md:col-start-1 md:row-start-1" />
      </div>
      <PoleBand />
    </section>
  );
}

