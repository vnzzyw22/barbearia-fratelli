import Image from "next/image";
import { PhotoSlot } from "./photo-slot";
import type { GalleryPhoto } from "@/lib/supabase/types";

interface GallerySectionProps {
  photos: GalleryPhoto[];
}

// Mosaico assimétrico (1 vertical grande + 4). Com fotos reais cadastradas
// (painel /admin/galeria) preenche os slots na ordem; o que faltar continua
// placeholder explícito.
const SLOTS = [
  { label: "Cabelo", cls: "col-span-6 row-span-2 aspect-[4/5] md:col-span-5 md:aspect-auto" },
  { label: "Barba", cls: "col-span-3 aspect-square md:col-span-4" },
  { label: "Acabamento", cls: "col-span-3 aspect-square md:col-span-3" },
  { label: "O ambiente", cls: "col-span-3 aspect-square md:col-span-3" },
  { label: "A equipe", cls: "col-span-3 aspect-square md:col-span-4" },
];

export function GallerySection({ photos }: GallerySectionProps) {
  return (
    <section id="galeria" className="bg-teal text-ivory">
      <div className="mx-auto max-w-[1440px] px-5 py-16 md:px-12 lg:py-28">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <h2 className="font-display text-[3rem] leading-[0.95] sm:text-7xl">
            Galeria
          </h2>
          {photos.length === 0 && (
            <p className="max-w-xs leading-relaxed text-mist">
              Os trabalhos da casa entram aqui assim que as fotos forem enviadas.
            </p>
          )}
        </div>

        <div className="mt-12 grid grid-cols-6 gap-3 md:mt-16 md:min-h-[520px] md:grid-cols-12 md:grid-rows-2 md:gap-4">
          {SLOTS.map((slot, i) => {
            const photo = photos[i];
            return photo ? (
              <div key={photo.id} className={`relative overflow-hidden ${slot.cls}`}>
                <Image
                  src={photo.url}
                  alt={photo.category ?? "Trabalho da Fratelli Barber Club"}
                  fill
                  sizes="(min-width: 768px) 40vw, 50vw"
                  className="object-cover"
                />
              </div>
            ) : (
              <PhotoSlot key={slot.label} label={slot.label} tone="deep" className={slot.cls} />
            );
          })}
        </div>
      </div>
    </section>
  );
}
