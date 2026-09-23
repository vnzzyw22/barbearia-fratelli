import type { Metadata } from "next";
import { Emblem } from "@/components/site/brand";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Login — Fratelli Barber Club Admin",
};

export default function LoginPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-brand-ink px-6">
      <Emblem className="h-20 w-20" />
      <h1 className="font-display text-2xl font-semibold text-ivory">
        Fratelli <span className="text-gold italic">Barber Club</span> — Painel
      </h1>
      <LoginForm />
    </main>
  );
}
