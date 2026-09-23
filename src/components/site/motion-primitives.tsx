"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { EASE_OUT } from "@/lib/motion";

// Primitivas de movimento do site. Regras: só transform/opacity/clip-path.
// IMPORTANTE (hidratação): o `initial` é SEMPRE o mesmo — o servidor não conhece a
// preferência de reduced-motion, então ramificar o `initial` por ela gera mismatch.
// Para quem pede menos movimento, só a DURAÇÃO cai a ~0 (o conteúdo aparece direto).

const once = { once: true, amount: 0.3 } as const;

function useDur(normal: number) {
  const reduce = useReducedMotion();
  return reduce ? 0.001 : normal;
}

/** Hairline da marca que se desenha da esquerda para a direita. */
export function RuleDraw({ delay = 0, className = "bg-teal/25" }: { delay?: number; className?: string }) {
  const duration = useDur(0.9);
  return (
    <motion.span
      aria-hidden="true"
      className={`absolute inset-x-0 top-0 block h-px origin-left ${className}`}
      initial={{ scaleX: 0 }}
      whileInView={{ scaleX: 1 }}
      viewport={once}
      transition={{ duration, delay, ease: EASE_OUT }}
    />
  );
}

/** Item de lista: a linha do topo se desenha e o conteúdo aparece logo depois (atraso total limitado). */
export function RowReveal({
  index,
  children,
  className,
  ruleClassName,
}: {
  index: number;
  children: ReactNode;
  className?: string;
  ruleClassName?: string;
}) {
  const duration = useDur(0.6);
  const delay = Math.min(index, 6) * 0.06;
  return (
    <li className={`relative ${className ?? ""}`}>
      <RuleDraw delay={delay} className={ruleClassName} />
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={once}
        transition={{ duration, delay: delay + 0.15, ease: EASE_OUT }}
      >
        {children}
      </motion.div>
    </li>
  );
}

/** Abre o retrato como uma íris (formato do medalhão). */
export function IrisReveal({
  index,
  children,
  className,
  style,
}: {
  index: number;
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  const duration = useDur(0.9);
  return (
    <motion.div
      className={className}
      style={style}
      initial={{ opacity: 0, clipPath: "circle(0% at 50% 50%)" }}
      whileInView={{ opacity: 1, clipPath: "circle(75% at 50% 50%)" }}
      viewport={once}
      transition={{ duration, delay: Math.min(index, 4) * 0.1, ease: EASE_OUT }}
    >
      {children}
    </motion.div>
  );
}
