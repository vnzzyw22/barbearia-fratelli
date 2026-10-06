// A identidade anterior (Fratelli: Emblem/BrandLockup/LionMark/Rings/
// DiamondRule) foi removida daqui no rebrand de 2026-10-06 — nada no site
// usa mais essas peças. Histórico em git caso precise recuperar algo.

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

/**
 * Selo Blend: reconstrução do logo real da fachada (foto enviada pelo
 * cliente, 2026-10-06) — fundo azul royal, "BARBER CLUB" arqueado no topo,
 * poste de barbeiro ladeado por duas navalhas abertas espelhadas no centro,
 * "BLEND" na base com o último "D" espelhado (o mesmo detalhe da placa real).
 * Reconstruído à mão (sem o arquivo vetorial original) a partir da foto da
 * fachada — se o cliente mandar o arquivo de verdade, trocar por ele aqui.
 */
export function BlendBadge({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 200 200" className={className}>
      <rect width="200" height="200" fill="var(--royal)" />

      <path id="blend-badge-arc" d="M 22 88 A 78 78 0 0 1 178 88" fill="none" />
      <text fontFamily="var(--font-heading), sans-serif" fontWeight={700} fontSize="21" letterSpacing="3" fill="var(--white)">
        <textPath href="#blend-badge-arc" startOffset="50%" textAnchor="middle">
          BARBER CLUB
        </textPath>
      </text>

      {/* poste: boné arredondado, corpo com uma faixa diagonal, base alargada */}
      <path d="M89 62 Q100 52 111 62 L111 67 L89 67 Z" fill="var(--white)" />
      <rect x="90" y="66" width="20" height="36" rx="1.5" fill="var(--white)" />
      <path d="M90 102 L110 66" stroke="var(--royal)" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M82 102 Q82 112 92 114 L108 114 Q118 112 118 102 Z" fill="var(--white)" />

      {/* navalhas abertas, espelhadas */}
      <path
        d="M88 96 C78 86 65 72 57 58 C55 55 58 52 61 54 C72 64 82 80 92 94 C94 97 91 99 88 96 Z"
        fill="var(--white)"
      />
      <line x1="80" y1="88" x2="68" y2="106" stroke="var(--white)" strokeWidth="3.4" strokeLinecap="round" />
      <g transform="translate(200 0) scale(-1 1)">
        <path
          d="M88 96 C78 86 65 72 57 58 C55 55 58 52 61 54 C72 64 82 80 92 94 C94 97 91 99 88 96 Z"
          fill="var(--white)"
        />
        <line x1="80" y1="88" x2="68" y2="106" stroke="var(--white)" strokeWidth="3.4" strokeLinecap="round" />
      </g>

      <line x1="30" y1="123" x2="170" y2="123" stroke="var(--white)" strokeWidth="2.4" />

      <text x="40" y="170" fontFamily="var(--font-display), sans-serif" fontWeight={900} fontSize="46" fill="var(--white)">
        BLEN
      </text>
      <g transform="translate(292 0) scale(-1 1)">
        <text x="146" y="170" fontFamily="var(--font-display), sans-serif" fontWeight={900} fontSize="46" fill="var(--white)">
          D
        </text>
      </g>

      <line x1="30" y1="184" x2="170" y2="184" stroke="var(--white)" strokeWidth="2.4" />
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
