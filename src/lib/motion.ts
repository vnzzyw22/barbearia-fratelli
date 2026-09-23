// Curva de easing única do site (ver ANEXO seção 5) — suave na saída, sem
// bounce, sem linear. Mesma curva espelhada em CSS puro como
// `--ease-signature` (globals.css). Usar esta constante em todo `transition`
// do Framer Motion no site público em vez de valores soltos por componente
// — é isso que evita a sensação de "motion misturado por seção".
export const EASE = [0.22, 1, 0.36, 1] as const;

// Desaceleração confiante para entradas (playbook animate): sem bounce.
export const EASE_OUT = [0.16, 1, 0.3, 1] as const;
