import type { Metadata } from "next";
import Link from "next/link";
import { BookingForm } from "@/components/booking/booking-form";
import { BlendMark, RazorGlyph } from "@/components/site/brand";
import { getActiveServices, getActiveStaff } from "@/lib/supabase/queries";

export const metadata: Metadata = { title: "Reservar horário" };

export default async function AgendarPage(props: PageProps<"/agendar">) {
  const searchParams = await props.searchParams;
  const [services, staff] = await Promise.all([getActiveServices(), getActiveStaff()]);

  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const preselectedServiceId = first(searchParams.servico);
  const preselectedStaffId = first(searchParams.profissional);

  return (
    <div className="relative isolate flex flex-1 flex-col overflow-hidden bg-ink text-white">
      <RazorGlyph crossed className="absolute -bottom-24 -left-40 -z-10 h-[520px] w-[520px] text-royal/[0.07]" />

      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 py-5 md:px-8">
        <Link href="/" className="flex items-center gap-3" aria-label="Blend Barber Club — voltar ao início">
          <BlendMark />
        </Link>
        <Link href="/" className="flex min-h-11 items-center font-semibold text-fog underline decoration-royal/40 transition-colors hover:text-royal-soft">
          Voltar ao início
        </Link>
      </header>

      <main id="conteudo" className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-5 pt-8 pb-16 md:px-8 md:pt-14">
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <h1 className="font-display text-[2.8rem] leading-[0.98] sm:text-6xl">
              Reserve seu horário
            </h1>
            <div aria-hidden="true" className="mt-8 h-px max-w-[14rem] bg-royal/50" />
            {/* Reasseguração logo na primeira tela: o pedido fica PENDENTE até a confirmação. */}
            <p className="mt-8 max-w-sm leading-relaxed text-fog">
              Escolha o serviço, o barbeiro, o dia e o horário. Seu pedido fica pendente até a
              confirmação da barbearia, enviada pelo WhatsApp informado no agendamento.
            </p>
          </div>

          <div className="lg:col-span-7">
            <div className="border border-white/15 bg-steel/60 p-6 md:p-9">
              <BookingForm
                services={services}
                staff={staff}
                preselectedServiceId={preselectedServiceId}
                preselectedStaffId={preselectedStaffId}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
