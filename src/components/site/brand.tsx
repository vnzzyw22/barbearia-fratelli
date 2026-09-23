import Image from "next/image";

// Peças da linguagem visual Fratelli derivadas da logo oficial.
// O emblema (leão + anel) é o asset oficial recortado; os arcos repetem a
// moldura circular da logo como sistema.

export function Emblem({
  className,
  priority,
  alt = "",
}: {
  className?: string;
  priority?: boolean;
  alt?: string;
}) {
  return (
    <Image
      src="/brand/emblem.webp"
      alt={alt}
      width={512}
      height={512}
      priority={priority}
      unoptimized
      className={className}
    />
  );
}

/** Logotipo de texto ao lado do emblema: "FRATELLI" (Bodoni) + "Barber Club" (slab dourado). */
export function BrandLockup({ size = "sm" }: { size?: "sm" | "lg" }) {
  return (
    <span className="flex flex-col leading-none">
      <span
        translate="no"
        className={`font-brand tracking-[0.14em] text-ivory uppercase ${size === "lg" ? "text-[1.6rem]" : "text-[1.15rem]"}`}
      >
        Fratelli
      </span>
      <span className={`label mt-1 text-gold-soft ${size === "lg" ? "text-[0.7rem]" : "text-[0.6rem]"}`}>
        Barber Club
      </span>
    </span>
  );
}

/** Leão como marca d'água: o alfa do emblema vira máscara; a cor vem do bg-* do className. */
export function LionMark({ className }: { className?: string }) {
  return <div aria-hidden="true" className={`lion-mask pointer-events-none ${className ?? ""}`} />;
}

/** Arcos concêntricos — a moldura circular da logo repetida. */
export function Rings({
  className,
  count = 5,
  dashedIndex = 2,
}: {
  className?: string;
  count?: number;
  dashedIndex?: number;
}) {
  return (
    <svg
      aria-hidden="true"
      viewBox="-500 -500 1000 1000"
      className={`pointer-events-none ${className ?? ""}`}
      fill="none"
      stroke="currentColor"
    >
      {Array.from({ length: count }, (_, i) => (
        <circle
          key={i}
          r={190 + i * 70}
          strokeWidth={i === 0 ? 1.4 : 1}
          strokeDasharray={i === dashedIndex ? "2 9" : undefined}
          opacity={1 - i * 0.16}
        />
      ))}
    </svg>
  );
}

/** Divisor da marca: linha — losango — linha. */
export function DiamondRule({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`rule-diamond ${className ?? ""}`}>
      <i />
    </div>
  );
}

/** Medalhão de anel duplo (deriva da moldura da logo). */
export function Medallion({
  children,
  className,
  ...rest
}: {
  children: React.ReactNode;
  className?: string;
} & React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={`medallion font-heading text-[1.15rem] tabular-nums ${className ?? ""}`}
      {...rest}
    >
      {children}
    </span>
  );
}
