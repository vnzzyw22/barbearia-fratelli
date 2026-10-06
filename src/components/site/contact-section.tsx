import Link from "next/link";
import { formatBusinessHours } from "@/lib/business-hours";
import { EXTRA_PHONES, formatBrPhone, mapsLink } from "@/lib/brand-contacts";
import { getWhatsappLink } from "@/lib/whatsapp";
import { RazorGlyph } from "./brand";
import type { BusinessSettings } from "@/lib/supabase/types";

interface LocalSectionProps {
  business: BusinessSettings | null;
}

// "Local": endereço, telefones, Instagram e horários reais, vindos do banco.
// A foto da fachada era da Fratelli (placa azul/dourada com o leão) — não pode
// ser reaproveitada como se fosse a fachada da Blend, então aqui é placeholder
// explícito até chegar uma foto real da fachada da Blend. Sem mapa embutido:
// link "Ver no mapa" (sem iframe, mais leve).
export function ContactSection({ business }: LocalSectionProps) {
  const whatsappLink = business
    ? getWhatsappLink(business.whatsapp, "Olá! Vim pelo site da Blend Barber Club e tenho uma dúvida.")
    : null;
  const instagram = business?.instagram?.replace(/^@/, "") ?? null;
  const hours = business ? formatBusinessHours(business.business_hours) : [];

  return (
    <section id="local" className="on-paper bg-paper text-ink">
      <div className="mx-auto grid max-w-[1440px] gap-10 px-5 py-16 md:px-12 lg:grid-cols-12 lg:gap-16 lg:py-28">
        <figure className="lg:col-span-7">
          <div
            role="img"
            aria-label="Espaço reservado para foto: fachada da Blend"
            className="relative aspect-[4/3] w-full overflow-hidden bg-ink"
          >
            <RazorGlyph crossed className="absolute inset-[30%] h-auto w-auto text-royal/20" />
            <span aria-hidden="true" className="absolute inset-3 border border-white/15" />
            <p className="meta absolute bottom-5 left-5 text-white">
              <span className="block font-heading text-2xl leading-none">A fachada</span>
              <span className="text-fog italic">foto real a enviar</span>
            </p>
          </div>
          <figcaption className="meta mt-3 text-ink/55">Fachada da Blend Barber Club.</figcaption>
        </figure>

        <div className="lg:col-span-5">
          <h2 className="font-display text-[3rem] leading-[0.95] text-royal-ink sm:text-6xl">
            Onde estamos
          </h2>

          <address className="mt-8 flex flex-col gap-4 not-italic">
            {business?.address && (
              <p className="font-heading text-3xl leading-tight text-ink">
                {business.address}{" "}
                <a
                  href={mapsLink(business.address)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-1 inline-block py-2 font-sans text-base font-semibold text-royal-ink underline decoration-royal/40 hover:decoration-royal"
                >
                  Ver no mapa
                </a>
              </p>
            )}
            <ul className="flex flex-col">
              {whatsappLink && business?.whatsapp && (
                <li>
                  <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="inline-block py-2.5 font-semibold text-royal-ink tabular-nums underline decoration-royal/40 hover:decoration-royal">
                    WhatsApp {formatBrPhone(business.whatsapp)}
                  </a>
                </li>
              )}
              {EXTRA_PHONES.map((phone) => (
                <li key={phone.tel}>
                  <a href={`tel:${phone.tel}`} className="inline-block py-2.5 font-semibold text-royal-ink tabular-nums underline decoration-royal/40 hover:decoration-royal">
                    Telefone {phone.display}
                  </a>
                </li>
              ))}
              {instagram && (
                <li>
                  <a href={`https://instagram.com/${instagram}`} target="_blank" rel="noopener noreferrer" className="inline-block py-2.5 font-semibold text-royal-ink underline decoration-royal/40 hover:decoration-royal">
                    @{instagram}
                  </a>
                </li>
              )}
            </ul>
          </address>

          {hours.length > 0 && (
            <dl className="mt-10 border-t border-royal-ink/20">
              {hours.map(({ label, value }) => {
                const closed = value === "Fechado";
                return (
                  <div key={label} className="flex items-baseline gap-3 border-b border-royal-ink/10 py-3">
                    <dt className={closed ? "text-ink/55" : "font-semibold text-ink"}>{label}</dt>
                    <span aria-hidden="true" className="flex-1 -translate-y-1 border-b border-dotted border-royal-ink/25" />
                    <dd className={`font-heading text-2xl tabular-nums ${closed ? "text-ink/55" : "text-royal-ink"}`}>
                      {value}
                    </dd>
                  </div>
                );
              })}
            </dl>
          )}

          <Link
            href="/agendar"
            className="btn btn-teal mt-10 inline-flex min-h-12 items-center gap-3 px-8 py-4"
          >
            Agendar horário
            <span aria-hidden="true" className="h-1.5 w-1.5 rotate-45 bg-current" />
          </Link>
        </div>
      </div>
    </section>
  );
}
