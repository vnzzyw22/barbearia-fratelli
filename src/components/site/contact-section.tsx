import Image from "next/image";
import Link from "next/link";
import { formatBusinessHours } from "@/lib/business-hours";
import { EXTRA_PHONES, formatBrPhone, mapsLink } from "@/lib/brand-contacts";
import { getWhatsappLink } from "@/lib/whatsapp";
import type { BusinessSettings } from "@/lib/supabase/types";

interface LocalSectionProps {
  business: BusinessSettings | null;
}

// "Local": a fachada REAL (foto enviada pelo cliente, sem filtro) ao lado
// de endereço, telefones, Instagram e horários. Sem mapa embutido: a placa
// informa só a rua; o link do mapa usa o endereço com cidade.
// quando desejado; por ora, link "Ver no mapa" (sem iframe, mais leve).
export function ContactSection({ business }: LocalSectionProps) {
  const whatsappLink = business
    ? getWhatsappLink(business.whatsapp, "Olá! Vim pelo site da Fratelli Barber Club e tenho uma dúvida.")
    : null;
  const instagram = business?.instagram?.replace(/^@/, "") ?? null;
  const hours = business ? formatBusinessHours(business.business_hours) : [];

  return (
    <section id="local" className="on-paper bg-ivory text-charcoal">
      <div className="mx-auto grid max-w-[1440px] gap-10 px-5 py-16 md:px-12 lg:grid-cols-12 lg:gap-16 lg:py-28">
        <figure className="lg:col-span-7">
          <div className="relative aspect-[4/3] w-full overflow-hidden bg-teal-deep">
            <Image
              src="/brand/foto-faxada.jpg"
              alt="Fachada da Fratelli Barber Club à noite: placa azul e dourada com o leão, portas de vidro abertas e barbeiros atendendo lá dentro"
              fill
              sizes="(min-width: 1024px) 58vw, 100vw"
              className="object-cover object-[50%_35%]"
            />
          </div>
          <figcaption className="meta mt-3 text-clay">Fachada da Fratelli Barber Club.</figcaption>
        </figure>

        <div className="lg:col-span-5">
          <h2 className="font-display text-[3rem] leading-[0.95] text-teal sm:text-6xl">
            Onde estamos
          </h2>

          <address className="mt-8 flex flex-col gap-4 not-italic">
            {business?.address && (
              <p className="font-heading text-3xl leading-tight text-charcoal">
                {business.address}{" "}
                <a
                  href={mapsLink(business.address)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-1 inline-block py-2 font-sans text-base font-semibold text-teal underline decoration-gold-deep/50 hover:decoration-gold-deep"
                >
                  Ver no mapa
                </a>
              </p>
            )}
            <ul className="flex flex-col">
              {whatsappLink && business?.whatsapp && (
                <li>
                  <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="inline-block py-2.5 font-semibold text-teal tabular-nums underline decoration-gold-deep/50 hover:decoration-gold-deep">
                    WhatsApp {formatBrPhone(business.whatsapp)}
                  </a>
                </li>
              )}
              {EXTRA_PHONES.map((phone) => (
                <li key={phone.tel}>
                  <a href={`tel:${phone.tel}`} className="inline-block py-2.5 font-semibold text-teal tabular-nums underline decoration-gold-deep/50 hover:decoration-gold-deep">
                    Telefone {phone.display}
                  </a>
                </li>
              ))}
              {instagram && (
                <li>
                  <a href={`https://instagram.com/${instagram}`} target="_blank" rel="noopener noreferrer" className="inline-block py-2.5 font-semibold text-teal underline decoration-gold-deep/50 hover:decoration-gold-deep">
                    @{instagram}
                  </a>
                </li>
              )}
            </ul>
          </address>

          {hours.length > 0 && (
            <dl className="mt-10 border-t border-teal/25">
              {hours.map(({ label, value }) => {
                const closed = value === "Fechado";
                return (
                  <div key={label} className="flex items-baseline gap-3 border-b border-teal/15 py-3">
                    <dt className={closed ? "text-clay" : "font-semibold text-charcoal"}>{label}</dt>
                    <span aria-hidden="true" className="flex-1 -translate-y-1 border-b border-dotted border-teal/35" />
                    <dd className={`font-heading text-2xl tabular-nums ${closed ? "text-clay" : "text-teal"}`}>
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
            Reservar horário
            <span aria-hidden="true" className="h-1.5 w-1.5 rotate-45 bg-gold" />
          </Link>
        </div>
      </div>
    </section>
  );
}
