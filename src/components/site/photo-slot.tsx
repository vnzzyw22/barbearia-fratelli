import { LionMark } from "./brand";

// Espaço reservado para foto real. Deliberadamente óbvio como placeholder
// (moldura interna + legenda "a enviar"): nunca foto de banco.
export function PhotoSlot({
  label,
  className,
  tone = "teal",
}: {
  label: string;
  className?: string;
  tone?: "teal" | "deep";
}) {
  return (
    <div
      role="img"
      aria-label={`Espaço reservado para foto: ${label}`}
      className={`relative overflow-hidden ${tone === "deep" ? "bg-teal-deep" : "bg-teal"} ${className ?? ""}`}
    >
      <LionMark className="absolute inset-[18%] bg-gold/[0.14]" />
      <span aria-hidden="true" className="absolute inset-2.5 border border-gold/35" />
      <p className="meta absolute bottom-5 left-5 text-ivory">
        <span className="block font-heading text-2xl leading-none">{label}</span>
        <span className="text-mist italic">foto a enviar</span>
      </p>
    </div>
  );
}
