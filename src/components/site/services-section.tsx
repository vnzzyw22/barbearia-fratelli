import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@/lib/format";
import { Medallion } from "./brand";
import { RowReveal } from "./motion-primitives";
import type { Service } from "@/lib/supabase/types";

interface ServicesSectionProps {
  services: Service[];
}

// Duração compacta dentro do medalhão: "45′" / "1h15". É informação real do
// serviço (não numeração decorativa). O texto completo vai só pro leitor de tela.
function compactDuration(minutes: number) {
  if (minutes < 60) return `${minutes}′`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}`;
}

function spokenDuration(minutes: number) {
  if (minutes < 60) return `${minutes} minutos`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} hora${h > 1 ? "s" : ""}` : `${h} hora${h > 1 ? "s" : ""} e ${m} minutos`;
}

// Serviços como cardápio de casa: medalhão (duração), nome, pontilhado,
// preço. A linha inteira leva ao agendamento com o serviço pré-selecionado.
// No hover/foco a linha enche de royal por baixo.
export function ServicesSection({ services }: ServicesSectionProps) {
  return (
    <section id="servicos" className="on-paper relative overflow-hidden bg-paper text-ink">
      <div className="relative mx-auto grid max-w-[1440px] gap-12 px-5 py-16 md:px-12 lg:grid-cols-12 lg:gap-16 lg:py-28">
        <div className="lg:sticky lg:top-28 lg:col-span-4 lg:self-start">
          <h2 className="font-display text-[3.2rem] leading-[0.95] text-royal-ink sm:text-7xl">
            Serviços
          </h2>
          <p className="mt-5 max-w-xs leading-relaxed text-ink/60">
            O medalhão mostra a duração. Toque em um serviço para reservar.
          </p>
          {/* Fotos reais enviadas pelo cliente (2026-10-06) — trabalho de barba e de cabelo. */}
          <div className="mt-8 grid max-w-sm grid-cols-2 gap-3">
            <div className="relative aspect-[4/5] overflow-hidden">
              <Image src="/gallery/corte-02.jpg" alt="Barba feita na Blend" fill sizes="200px" className="object-cover" />
            </div>
            <div className="relative aspect-[4/5] overflow-hidden">
              <Image src="/gallery/corte-01.jpg" alt="Corte feito na Blend" fill sizes="200px" className="object-cover" />
            </div>
          </div>
        </div>

        <div className="lg:col-span-8">
          {services.length === 0 ? (
            <p className="text-ink/60">Serviços em breve.</p>
          ) : (
            <ul className="border-b border-royal-ink/20">
              {services.map((service, i) => (
                <RowReveal key={service.id} index={i}>
                  <Link
                    href={`/agendar?servico=${service.id}`}
                    className="group relative grid min-h-[5rem] grid-cols-[3.25rem_1fr] items-center gap-x-4 py-5 md:grid-cols-[4rem_1fr_7.5rem] md:gap-x-6 md:py-6"
                    style={{ ["--medallion-gap" as string]: "var(--paper)" }}
                  >
                    <span
                      aria-hidden="true"
                      className="absolute inset-y-0 -inset-x-3 origin-bottom scale-y-0 bg-royal transition-transform duration-500 ease-[var(--ease-signature)] group-hover:scale-y-100 group-focus-visible:scale-y-100 md:-inset-x-5"
                    />
                    <Medallion
                      aria-hidden="true"
                      className="relative h-10 w-10 text-royal-ink transition-colors duration-300 group-hover:text-white group-hover:[--medallion-gap:var(--royal)] group-focus-visible:text-white"
                    >
                      {compactDuration(service.duration_minutes)}
                    </Medallion>

                    <div className="relative">
                      <div className="flex items-baseline gap-3">
                        <h3 className="font-heading text-[1.8rem] leading-none text-ink transition-colors duration-300 group-hover:text-white md:text-[2.3rem]">
                          {service.name}
                          <span className="sr-only">, {spokenDuration(service.duration_minutes)}</span>
                        </h3>
                        <span
                          aria-hidden="true"
                          className="min-w-4 flex-1 -translate-y-1 border-b border-dotted border-royal-ink/30 transition-colors duration-300 group-hover:border-white/50"
                        />
                        <span className="font-heading text-[1.8rem] leading-none whitespace-nowrap text-royal-ink tabular-nums transition-colors duration-300 group-hover:text-white md:text-[2.3rem]">
                          {formatPrice(service.price)}
                        </span>
                      </div>
                      {service.description && (
                        <p className="meta mt-1 text-ink/55 transition-colors duration-300 group-hover:text-white/75">
                          {service.description}
                        </p>
                      )}
                    </div>

                    <span className="label relative hidden items-center justify-end gap-2 text-white opacity-0 transition-[transform,opacity] duration-300 group-hover:translate-x-0 group-hover:opacity-100 group-focus-visible:opacity-100 md:flex md:translate-x-2">
                      Reservar
                      <i aria-hidden="true" className="h-1.5 w-1.5 rotate-45 bg-white" />
                    </span>
                  </Link>
                </RowReveal>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
