"use client";

import { useId, useState } from "react";
import { motion } from "framer-motion";

interface FaqEntry {
  question: string;
  answer: string;
}

// Respostas baseadas nas regras reais do sistema de agendamento (sem
// cobrança antecipada, cancelamento só pela casa, confirmação pendente).
// TODO(conteúdo): revisar com a Fratelli antes do lançamento.
const FAQS: FaqEntry[] = [
  {
    question: "Preciso agendar ou atendem sem hora marcada?",
    answer:
      "O agendamento pelo site garante seu horário e evita espera. Encaixes sem hora marcada dependem da disponibilidade do dia.",
  },
  {
    question: "Quanto tempo dura Corte e Barba?",
    answer:
      "Cerca de 1h10, conforme a duração cadastrada no serviço. Ela aparece na lista de serviços e no agendamento.",
  },
  {
    question: "Posso escolher o barbeiro?",
    answer:
      "Sim. A escolha do profissional é uma etapa do agendamento, antes de escolher dia e horário.",
  },
  {
    question: "Como cancelo um horário?",
    answer:
      "O cancelamento não é feito pelo site. Avise a barbearia com antecedência para liberarmos o horário para outra pessoa.",
  },
  {
    question: "O agendamento é confirmado na hora?",
    answer:
      "O pedido fica pendente até a confirmação da barbearia, enviada pelo WhatsApp informado no agendamento.",
  },
  {
    question: "Preciso pagar antes?",
    answer: "Não. Não há cobrança antecipada pelo site; o pagamento é feito no local.",
  },
];

function PlusMinus({ open }: { open: boolean }) {
  return (
    <span
      aria-hidden="true"
      className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gold/50 transition-colors group-hover:bg-gold/15"
    >
      <span className="absolute h-px w-3.5 bg-gold" />
      <span
        className={`absolute h-3.5 w-px bg-gold transition-transform duration-300 ${open ? "scale-y-0 rotate-90" : ""}`}
      />
    </span>
  );
}

function FaqItem({
  entry,
  isOpen,
  onToggle,
}: {
  entry: FaqEntry;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const panelId = useId();

  return (
    <div className="border-b border-gold/25">
      <h3>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={isOpen}
          aria-controls={panelId}
          className="group flex min-h-16 w-full items-center gap-5 py-5 text-left"
        >
          <span className="flex-1 font-heading text-2xl leading-snug text-ivory transition-colors group-hover:text-gold-soft md:text-3xl">
            {entry.question}
          </span>
          <PlusMinus open={isOpen} />
        </button>
      </h3>
      <motion.div
        id={panelId}
        role="region"
        initial={false}
        animate={{ height: isOpen ? "auto" : 0, opacity: isOpen ? 1 : 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="overflow-hidden"
        aria-hidden={!isOpen}
        inert={!isOpen}
      >
        <p className="max-w-xl pb-6 leading-relaxed text-mist md:pr-14">{entry.answer}</p>
      </motion.div>
    </div>
  );
}

export function FaqAccordion() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="border-t border-gold/25">
      {FAQS.map((entry, i) => (
        <FaqItem
          key={entry.question}
          entry={entry}
          isOpen={openIndex === i}
          onToggle={() => setOpenIndex((c) => (c === i ? null : i))}
        />
      ))}
    </div>
  );
}
