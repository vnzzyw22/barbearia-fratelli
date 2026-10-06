// Faixa "poste de barbeiro" (barber pole) nas cores da marca Blend — o
// elemento mais reconhecível de uma barbearia, usado aqui como grafismo de
// transição entre seções, não como ícone literal de poste 3D.
export function PoleBand({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`h-3 w-full ${className ?? ""}`}
      style={{
        backgroundImage:
          "repeating-linear-gradient(-45deg, var(--white) 0 9px, var(--ink) 9px 18px, var(--royal) 18px 27px, var(--ink) 27px 36px)",
      }}
    />
  );
}
