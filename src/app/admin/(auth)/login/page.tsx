import type { Metadata } from "next";
import { BlendMark } from "@/components/site/brand";
import { LoginForm } from "./login-form";

export const metadata: Metadata = {
  title: "Login — Blend Barber Club Admin",
};

export default function LoginPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 bg-brand-ink px-6">
      <BlendMark size="lg" />
      <h1 className="font-heading text-sm text-fog uppercase">Painel administrativo</h1>
      <LoginForm />
    </main>
  );
}
