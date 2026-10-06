import type { Metadata, Viewport } from "next";
import { Archivo, Big_Shoulders } from "next/font/google";
import "./globals.css";
import { CookieNotice } from "@/components/site/cookie-notice";
import { MotionProvider } from "@/components/site/motion-provider";
import { RouteTransition } from "@/components/site/route-transition";

// Identidade Blend: só DUAS famílias (ver BLEND_DESIGN.md) — decisão
// deliberada de "menos famílias, mais peso/escala" em vez de empilhar fontes.
// `latin-ext` sempre incluído: sem ele o Ç pode sumir em PT-BR.

// Corpo + título principal (peso 900 via .font-display): geométrica, sem o
// ar de "SaaS" de Inter/Manrope — usada tanto no texto corrido quanto, em
// preto, no wordmark "BLEND".
const archivo = Archivo({
  variable: "--font-body",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700", "900"],
  display: "swap",
});

// Título secundário/nav/labels/numerais: condensada de inspiração
// collegiate/signage americano (não script de barbearia vintage).
const bigShoulders = Big_Shoulders({
  variable: "--font-heading",
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

export const viewport: Viewport = { themeColor: "#1A3AE0", colorScheme: "dark" };

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: "Blend Barber Club", template: "%s — Blend Barber Club" },
  description:
    "Blend Barber Club — barbearia com agendamento online. Escolha o serviço, o barbeiro e o horário.",
  openGraph: {
    title: "Blend Barber Club",
    description: "Barbearia com agendamento online.",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${archivo.variable} ${bigShoulders.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:bg-royal focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
        >
          Pular para o conteúdo
        </a>
        <MotionProvider>
          <RouteTransition />
          {children}
          <CookieNotice />
        </MotionProvider>
      </body>
    </html>
  );
}
