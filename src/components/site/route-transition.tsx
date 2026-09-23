"use client";

import { AnimatePresence, motion } from "framer-motion";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { EASE } from "@/lib/motion";

// Assinatura de transição entre rotas (ver ANEXO seção 5): a linha diagonal
// em cobre (mesmo elemento visual de `.signature-divider`, globals.css)
// varre a tela inteira na troca de página — entra por um canto, cobre por
// uma fração de segundo, sai revelando a página nova por trás. ~420ms, sem
// tela branca no meio. Overlay simples sobre o conteúdo (em vez de animar
// entrada/saída de cada rota com AnimatePresence envolvendo `children`)
// porque o App Router já troca o conteúdo no servidor antes do overlay
// terminar de cobrir — não precisa duplicar a árvore da página só pra isso.
export function RouteTransition() {
  const pathname = usePathname();
  const [lastPathname, setLastPathname] = useState(pathname);
  const [active, setActive] = useState(false);

  // Ajusta estado durante a própria renderização em vez de num efeito
  // (padrão recomendado do React pra "resetar estado quando uma prop
  // muda", ver react.dev/learn/you-might-not-need-an-effect) — dispara um
  // re-render imediato, sem pintar um frame intermediário.
  if (pathname !== lastPathname) {
    setLastPathname(pathname);
    setActive(true);
  }

  // O efeito só assina o timer que desliga a varredura — não decide mais
  // se ela liga (isso já aconteceu acima, durante a renderização).
  useEffect(() => {
    if (!active) return;
    const timeout = setTimeout(() => setActive(false), 420);
    return () => clearTimeout(timeout);
  }, [active]);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none fixed inset-0 z-[200] origin-left border-r-2 border-gold bg-teal-deep"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: [0, 1, 1, 0] }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.42, times: [0, 0.4, 0.65, 1], ease: EASE }}
          style={{ transform: "skewX(-8deg)" }}
        />
      )}
    </AnimatePresence>
  );
}
