"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { EASE } from "@/lib/motion";

// Revelação de título por linha (máscara): cada linha sobe de dentro de uma
// janela com overflow escondido, como tipografia de cartaz. A observação de
// viewport fica no próprio título (não nas linhas): um filho deslocado pra
// fora de um pai com overflow hidden nunca é considerado visível.
const titleVariants = { hidden: {}, show: { transition: { staggerChildren: 0.09 } } };
const lineVariants = {
  hidden: { y: "108%" },
  show: { y: 0, transition: { duration: 0.85, ease: EASE } },
};

export function TitleReveal({
  lines,
  className,
  lineClassName,
  as = "h2",
}: {
  lines: ReactNode[];
  className?: string;
  lineClassName?: string[];
  as?: "h1" | "h2" | "h3";
}) {
  const Tag = motion[as];
  return (
    <Tag
      className={className}
      variants={titleVariants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.3 }}
    >
      {lines.map((line, i) => (
        <span key={i} className="-mb-[0.14em] block overflow-hidden pb-[0.14em]">
          <motion.span className={`block ${lineClassName?.[i] ?? ""}`} variants={lineVariants}>
            {line}
          </motion.span>
        </span>
      ))}
    </Tag>
  );
}
