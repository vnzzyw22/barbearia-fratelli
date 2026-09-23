import Link from "next/link";
import { EXTRA_PHONES } from "@/lib/brand-contacts";
import { getWhatsappLink } from "@/lib/whatsapp";
import { BrandLockup, DiamondRule, Emblem } from "./brand";
import type { BusinessSettings, Service } from "@/lib/supabase/types";

interface FooterProps {
  business: BusinessSettings | null;
  services: Service[];
}

const NAV_LINKS = [
  { href: "/#servicos", label: "Serviços" },
  { href: "/#clube", label: "O Clube" },
  { href: "/#equipe", label: "Equipe" },
  { href: "/#galeria", label: "Galeria" },
  { href: "/#local", label: "Local e horários" },
  { href: "/#duvidas", label: "Dúvidas" },
  { href: "/agendar", label: "Agendamento" },
];

const colTitle = "mb-4 font-heading text-2xl text-ivory";
const linkClass = "inline-block py-2 text-mist transition-colors hover:text-gold-soft";

export function Footer({ business, services }: FooterProps) {
  const whatsappLink = business
    ? getWhatsappLink(business.whatsapp, "Olá! Vim pelo site da Fratelli Barber Club.")
    : null;
  const instagram = business?.instagram?.replace(/^@/, "") ?? null;
  const footerServices = services.slice(0, 5);

  return (
    <footer className="bg-teal-ink px-5 pt-16 pb-24 md:pb-8 text-ivory md:px-12 md:pt-24">
      <div className="mx-auto max-w-[1440px]">
        <DiamondRule className="mb-12 md:mb-16" />

        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
          <div className="flex items-center gap-5 md:col-span-2 lg:col-span-1">
            <Emblem className="h-24 w-24 shrink-0" alt="" />
            <BrandLockup size="lg" />
          </div>

          <div>
            <h3 className={colTitle}>Navegação</h3>
            <ul className="flex flex-col">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <a href={link.href} className={linkClass}>
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {footerServices.length > 0 && (
            <div>
              <h3 className={colTitle}>Serviços</h3>
              <ul className="flex flex-col">
                {footerServices.map((service) => (
                  <li key={service.id}>
                    <Link href={`/agendar?servico=${service.id}`} className={linkClass}>
                      {service.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <h3 className={colTitle}>Contato</h3>
            <ul className="flex flex-col gap-3 text-mist">
              {business?.address && <li>{business.address}</li>}
              {EXTRA_PHONES.map((phone) => (
                <li key={phone.tel}>
                  <a href={`tel:${phone.tel}`} className={`${linkClass} tabular-nums`}>
                    {phone.display}
                  </a>
                </li>
              ))}
              {whatsappLink && (
                <li>
                  <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className={linkClass}>
                    WhatsApp
                  </a>
                </li>
              )}
              {instagram && (
                <li>
                  <a href={`https://instagram.com/${instagram}`} target="_blank" rel="noopener noreferrer" className={linkClass}>
                    Instagram
                  </a>
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-gold/20 pt-7 md:mt-20 md:flex-row md:items-center md:justify-between">
          <p className="meta text-mist">
            © {new Date().getFullYear()} Fratelli Barber Club
          </p>
          <div className="meta flex flex-wrap gap-x-7 text-mist">
            <Link href="/politica-de-privacidade" className="inline-block py-2.5 transition-colors hover:text-gold-soft">
              Privacidade
            </Link>
            <Link href="/politica-de-cookies" className="inline-block py-2.5 transition-colors hover:text-gold-soft">
              Cookies
            </Link>
            <Link href="/termos-de-uso" className="inline-block py-2.5 transition-colors hover:text-gold-soft">
              Termos de uso
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
