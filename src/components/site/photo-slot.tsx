import { RazorGlyph } from "./brand";

// Espaço reservado para foto real. Deliberadamente óbvio como placeholder
// (moldura interna + legenda "a enviar"): nunca foto de banco.
export function PhotoSlot({
  label,
  className,
  tone = "ink",
}: {
  label: string;
  className?: string;
  tone?: "ink" | "steel";
}) {
  return (
    <div
      role="img"
      aria-label={`Espaço reservado para foto: ${label}`}
      className={`relative overflow-hidden ${tone === "steel" ? "bg-steel" : "bg-ink"} ${className ?? ""}`}
    >
      <RazorGlyph crossed className="absolute inset-[22%] h-auto w-auto text-royal/15" />
      <span aria-hidden="true" className="absolute inset-2.5 border border-white/15" />
      <p className="meta absolute bottom-5 left-5 text-white">
        <span className="block font-heading text-2xl leading-none">{label}</span>
        <span className="text-fog italic">foto a enviar</span>
      </p>
    </div>
  );
}
