"use client";

import { MotionConfig } from "framer-motion";
import type { ReactNode } from "react";

// `reducedMotion="user"`: com prefers-reduced-motion ativo o Framer Motion
// desliga animações de transform/layout em todo o site (o CSS global só
// cobre animações/transições CSS, não as do Framer).
export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
