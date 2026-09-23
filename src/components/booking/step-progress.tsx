interface StepProgressProps {
  steps: string[];
  currentStep: number;
}

const ROMAN = ["I", "II", "III", "IV", "V"];

// Passos como trilho de três trechos com numeral romano (linguagem de
// clube, não wizard genérico). `role="progressbar"` cobre leitor de tela.
export function StepProgress({ steps, currentStep }: StepProgressProps) {
  return (
    <div
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={steps.length}
      aria-valuenow={currentStep + 1}
      aria-valuetext={`Passo ${currentStep + 1} de ${steps.length}: ${steps[currentStep]}`}
      className="mb-8 flex items-start gap-3"
    >
      {steps.map((label, i) => (
        <div key={label} className="flex flex-1 flex-col gap-2.5">
          <span aria-hidden="true" className="relative h-px w-full bg-gold/25">
            <span
              className={`absolute inset-y-[-1px] left-0 h-[3px] bg-gold transition-[width] duration-500 ease-[var(--ease-signature)] ${
                i <= currentStep ? "w-full" : "w-0"
              }`}
            />
          </span>
          <span
            className={`meta flex items-center gap-2 font-semibold transition-colors ${
              i === currentStep ? "text-ivory" : i < currentStep ? "text-gold-soft" : "text-mist/60"
            }`}
          >
            <span aria-hidden="true" className="font-heading">{ROMAN[i]}</span>
            <span className="hidden sm:inline">{label}</span>
          </span>
        </div>
      ))}
    </div>
  );
}
