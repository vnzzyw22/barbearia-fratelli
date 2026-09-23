import type { Metadata, Viewport } from "next";
import { Anton, Bodoni_Moda, Hanken_Grotesk, Stint_Ultra_Condensed, Zilla_Slab } from "next/font/google";
import "./globals.css";
import { CookieNotice } from "@/components/site/cookie-notice";
import { MotionProvider } from "@/components/site/motion-provider";
import { RouteTransition } from "@/components/site/route-transition";

// Título principal: Anton — a mais próxima (entre as gratuitas) do lettering
// condensado e pesado de "FRATELLI" da logo. Peso único, sempre caixa-alta.
// `latin-ext` obrigatório: sem ele o Ç pode sumir em PT-BR.
const anton = Anton({
  variable: "--font-display",
  subsets: ["latin", "latin-ext"],
  weight: "400",
  display: "swap",
});

// Título secundário, navegação e botões: Stint Ultra Condensed — a mais próxima
// do "BARBER CLUB" da logo (condensada, serifas retas). Peso único.
const stint = Stint_Ultra_Condensed({
  variable: "--font-heading",
  subsets: ["latin", "latin-ext"],
  weight: "400",
  display: "swap",
});

// Navegação e botões: Zilla Slab (slab de traço firme, legível em corpo pequeno).
const zilla = Zilla_Slab({
  variable: "--font-label",
  subsets: ["latin", "latin-ext"],
  weight: ["500", "600", "700"],
  display: "swap",
});

// Logotipo de texto (nav/rodapé/agendamento): Bodoni Moda 700, só o suficiente
// para escrever "Fratelli" — formato que o cliente preferiu.
const bodoni = Bodoni_Moda({
  variable: "--font-brand",
  subsets: ["latin"],
  weight: "700",
  display: "swap",
});

// Corpo/UI: Hanken Grotesk — sans limpa e contemporânea, sem o ar de SaaS.
const hanken = Hanken_Grotesk({
  variable: "--font-body",
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const viewport: Viewport = { themeColor: "#125660", colorScheme: "dark" };

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: { default: "Fratelli Barber Club", template: "%s — Fratelli Barber Club" },
  description:
    "Fratelli Barber Club — barbearia com agendamento online. Escolha o serviço, o barbeiro e o horário.",
  openGraph: {
    title: "Fratelli Barber Club",
    description: "Barbearia com agendamento online.",
    images: [{ url: "/brand/lockup-original.png", width: 528, height: 526 }],
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${anton.variable} ${stint.variable} ${zilla.variable} ${bodoni.variable} ${hanken.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <a
          href="#conteudo"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:bg-gold focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-teal-ink"
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
