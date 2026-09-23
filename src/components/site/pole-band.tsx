// Faixa "poste de barbeiro" nas cores da marca (marfim, teal e dourado).
// Referência ao poste que aparece na fachada real (foto-faxada.jpg): um
// elemento de barbearia de verdade, não decoração genérica.
export function PoleBand({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`h-3 w-full ${className ?? ""}`}
      style={{
        backgroundImage:
          "repeating-linear-gradient(-45deg, var(--ivory) 0 9px, var(--teal-deep) 9px 18px, var(--gold) 18px 27px, var(--teal-deep) 27px 36px)",
      }}
    />
  );
}
