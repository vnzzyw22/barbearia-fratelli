import Image from "next/image";

// `Emblem`/`BrandLockup`/`LionMark`/`Rings`/`DiamondRule` abaixo são da
// identidade ANTERIOR (Fratelli) — ficam só até as seções que ainda os usam
// (serviços, equipe, clube, galeria, footer) serem reconstruídas na
// identidade Blend. `BlendMark`/`RazorGlyph`, mais abaixo, são os novos.

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

/**
 * Wordmark Blend: tipográfico, sem arquivo de logo (o cliente ainda não
 * entregou um — ver BLEND_DESIGN.md). "BLEND" em Archivo 900 + "BARBER CLUB"
 * em Big Shoulders tracked, como no briefing. `tone="dark"` é para usar sobre
 * fundo claro (--paper/--white); o padrão é claro sobre fundo escuro.
 */
export function BlendMark({
  size = "sm",
  tone = "light",
  className,
}: {
  size?: "sm" | "lg";
  tone?: "light" | "dark";
  className?: string;
}) {
  const fg = tone === "light" ? "text-white" : "text-ink";
  const accent = tone === "light" ? "text-royal-soft" : "text-royal-ink";
  return (
    <span className={`flex flex-col leading-none ${className ?? ""}`}>
      <span
        translate="no"
        className={`font-display ${fg} ${size === "lg" ? "text-[2rem] sm:text-[2.6rem]" : "text-[1.3rem]"}`}
      >
        Blend
      </span>
      <span className={`label mt-0.5 ${accent} ${size === "lg" ? "text-[0.8rem]" : "text-[0.55rem]"}`}>
        Barber Club
      </span>
    </span>
  );
}

/**
 * Uma navalha reta (lâmina + cabo articulado), grafismo original e simples —
 * legível tanto minúscula (ao lado de um label) quanto grande (marca d'água).
 * `crossed`: desenha uma segunda cópia espelhada, para o uso como par cruzado.
 */
export function RazorGlyph({ className, crossed = false }: { className?: string; crossed?: boolean }) {
  const blade = (
    <path d="M6 37 L34 9 Q37 6 40 9 T40 15 L14 41 Q10 45 6 41 Q4 39 6 37 Z" />
  );
  return (
    <svg aria-hidden="true" viewBox="0 0 48 48" fill="currentColor" className={className}>
      {blade}
      {crossed && <g transform="matrix(-1 0 0 1 48 0)">{blade}</g>}
    </svg>
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
