import Image from "next/image";
import Link from "next/link";
import { RazorGlyph } from "./brand";
import { IrisReveal } from "./motion-primitives";
import type { Staff } from "@/lib/supabase/types";

interface TeamSectionProps {
  staff: Staff[];
}

// Retratos em moldura circular. Sem foto real, o slot mostra a navalha em
// marca d'água + "foto a enviar" — placeholder explícito, nunca foto de
// banco. Fotos reais entram sem filtro.
export function TeamSection({ staff }: TeamSectionProps) {
  if (staff.length === 0) return null;

  return (
    <section id="equipe" className="on-paper bg-paper text-ink">
      <div className="mx-auto max-w-[1440px] px-5 py-16 md:px-12 lg:py-28">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <h2 className="font-display text-[3rem] leading-[0.95] text-royal-ink sm:text-7xl">
            Escolha quem atende
          </h2>
          <p className="max-w-xs leading-relaxed text-ink/60">
            Cada barbeiro tem a própria agenda. Reserve direto com quem você prefere.
          </p>
        </div>

        <ul className="mt-14 flex flex-wrap gap-x-10 gap-y-14 md:mt-20 md:gap-x-16">
          {staff.map((person, i) => (
            <li
              key={person.id}
              className={`w-[calc(50%-1.25rem)] sm:w-[220px] md:w-[240px] ${i % 2 === 1 ? "md:mt-14" : ""}`}
            >
              <IrisReveal
                index={i}
                className="relative mx-auto aspect-square w-full"
                style={{ ["--medallion-gap" as string]: "var(--paper)" }}
              >
                <div className="medallion absolute inset-0 overflow-hidden text-royal-ink">
                  {person.photo_url ? (
                    <Image src={person.photo_url} alt={person.name} fill sizes="240px" className="object-cover" />
                  ) : (
                    <div
                      role="img"
                      aria-label={`Espaço reservado para foto de ${person.name}`}
                      className="relative h-full w-full bg-ink"
                    >
                      <RazorGlyph crossed className="absolute inset-[16%] h-auto w-auto text-royal/25" />
                      <span className="meta absolute inset-x-0 bottom-[10%] text-center text-[0.72rem] text-fog italic">
                        foto a enviar
                      </span>
                    </div>
                  )}
                </div>
              </IrisReveal>

              <div className="mt-7">
                <h3 className="font-heading text-[2.1rem] leading-none text-ink">
                  {person.name}
                </h3>
                {person.role && <p className="meta mt-1 text-ink/60">{person.role}</p>}
                <Link
                  href={`/agendar?profissional=${person.id}`}
                  aria-label={`Reservar com ${person.name}`}
                  className="group relative mt-4 inline-block py-2 font-semibold text-royal-ink"
                >
                  Reservar com {person.name.split(" ")[0]}
                  <span className="absolute inset-x-0 bottom-0.5 h-px bg-royal-ink transition-transform duration-500 ease-[var(--ease-signature)] group-hover:origin-right group-hover:scale-x-0" />
                </Link>
                {person.instagram && (
                  <a
                    href={`https://instagram.com/${person.instagram.replace(/^@/, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="meta ml-5 text-ink/60 transition-colors hover:text-royal-ink"
                  >
                    Instagram
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
