import Link from "next/link";
import { BrandLockup, Emblem } from "./brand";

// Layout das páginas legais (privacidade, cookies, termos): leitura confortável
// (coluna de ~70 caracteres), mesmo cabeçalho de marca do agendamento.
export function LegalLayout({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 flex-col bg-teal text-ivory">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-5 md:px-8">
        <Link href="/" className="flex items-center gap-3" aria-label="Fratelli Barber Club — voltar ao início">
          <Emblem className="h-11 w-11" />
          <BrandLockup />
        </Link>
        <Link href="/" className="flex min-h-11 items-center font-semibold text-mist underline decoration-gold/40 transition-colors hover:text-gold-soft">
          Voltar ao início
        </Link>
      </header>

      <main id="conteudo" className="mx-auto w-full max-w-3xl flex-1 px-5 pt-10 pb-24 md:px-8 md:pt-16">
        <h1 className="font-display text-[2.6rem] leading-[1] text-ivory sm:text-6xl">{title}</h1>
        <p className="meta mt-4 text-mist">Última atualização: {updated}</p>
        <div className="legal mt-10 flex flex-col gap-10">{children}</div>
      </main>
    </div>
  );
}

export function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-heading mb-3 text-3xl text-gold-soft">{title}</h2>
      <div className="flex max-w-[68ch] flex-col gap-3 leading-relaxed text-ivory/90 [&_a]:text-gold-soft [&_a]:underline [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-ivory">
        {children}
      </div>
    </section>
  );
}
