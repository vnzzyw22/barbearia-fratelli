import { LionMark, Rings } from "./brand";
import { RuleDraw } from "./motion-primitives";
import { TitleReveal } from "./reveal";

// "O Clube": a palavra CLUB carrega o conceito. Nenhum fato de história,
// ano ou número foi inventado — os pilares descrevem o que o agendamento
// realmente faz. "Fratelli = irmãos" é tradução literal do italiano.
// COPY PROVISÓRIA: validar tom com a Fratelli. É a ÚNICA seção com título
// em itálico dourado (uma decisão de destaque, não uma fórmula).
const PILLARS = [
  {
    title: "Hora marcada",
    text: "Serviço, barbeiro, dia e horário escolhidos por você, no próprio site.",
  },
  {
    title: "Uma agenda por barbeiro",
    text: "Cada profissional tem a sua. Você só vê os horários realmente livres.",
  },
  {
    title: "Confirmação da casa",
    text: "O pedido fica pendente até a barbearia confirmar. O WhatsApp entra depois, para agilizar.",
  },
];

export function ClubSection() {
  return (
    <section id="clube" className="relative isolate overflow-hidden bg-teal-deep text-ivory">
      {/* CLUB monumental, tom sobre tom */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-[0.22em] left-1/2 -z-10 -translate-x-1/2 font-display text-[40vw] leading-none tracking-[-0.01em] text-teal select-none md:text-[24vw]"
      >
        CLUB
      </span>
      <LionMark className="absolute -top-16 -right-28 -z-10 h-[520px] w-[520px] bg-gold/[0.09] md:-right-10 md:h-[760px] md:w-[760px]" />
      <Rings className="absolute top-1/2 -right-[18%] -z-10 h-[900px] w-[900px] -translate-y-1/2 text-gold/15" />

      <div className="relative mx-auto max-w-[1440px] px-5 pt-20 pb-44 md:px-12 md:pt-32 md:pb-80">
        <TitleReveal
          className="max-w-4xl font-display text-[2.9rem] leading-[1.12] sm:text-7xl lg:text-[5.5rem]"
          lines={["Aqui, barbearia", "é um clube."]}
          lineClassName={["", "text-gold-soft"]}
        />

        <p className="mt-8 max-w-lg text-lg leading-relaxed text-mist">
          <span className="font-heading text-3xl text-gold-soft">Fratelli</span> é “irmãos” em
          italiano. Ritual, cuidado e uma cadeira reservada para você.
        </p>

        <ul className="mt-16 grid gap-10 md:mt-24 md:grid-cols-3 md:gap-8">
          {PILLARS.map((pillar, i) => (
            <li key={pillar.title} className="relative pt-5">
              <RuleDraw delay={i * 0.12} className="bg-gold/50" />
              <h3 className="font-heading text-3xl text-ivory">{pillar.title}</h3>
              <p className="mt-3 max-w-xs leading-relaxed text-mist">{pillar.text}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
