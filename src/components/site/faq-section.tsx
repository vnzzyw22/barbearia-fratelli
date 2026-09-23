import { FaqAccordion } from "./faq-accordion";

export function FaqSection() {
  return (
    <section id="duvidas" className="bg-teal-deep text-ivory">
      <div className="mx-auto grid max-w-[1440px] gap-10 px-5 py-16 md:px-12 lg:grid-cols-12 lg:gap-16 lg:py-28">
        <h2 className="font-display text-[3rem] leading-[0.95] sm:text-7xl lg:col-span-4">
          Antes de reservar
        </h2>
        <div className="lg:col-span-8">
          <FaqAccordion />
        </div>
      </div>
    </section>
  );
}
