"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

const KEY = "fratelli-cookie-notice";

// Aviso informativo (não é um pedido de consentimento: o site só usa cookies
// estritamente necessários — ver /politica-de-cookies). Guarda a escolha em
// localStorage; renderiza só depois de montar (sem mismatch de hidratação); não
// aparece no painel /admin. No mobile fica acima da barra fixa de reserva.
export function CookieNotice() {
  const pathname = usePathname();
  const [show, setShow] = useState(false);

  useEffect(() => {
    let seen = false;
    try {
      seen = localStorage.getItem(KEY) === "1";
    } catch {
      /* localStorage indisponível: mostra o aviso */
    }
    if (seen) return undefined;
    const t = setTimeout(() => setShow(true), 1200);
    return () => clearTimeout(t);
  }, []);

  if (!show || pathname.startsWith("/admin")) return null;

  function dismiss() {
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* ignora */
    }
    setShow(false);
  }

  return (
    <div
      role="region"
      aria-label="Aviso de cookies"
      className="fixed right-3 bottom-[5.25rem] left-3 z-[60] border border-gold/50 bg-teal-ink p-4 text-ivory shadow-[0_8px_30px_-8px_rgba(0,0,0,0.6)] md:right-auto md:bottom-5 md:left-5 md:max-w-sm"
    >
      <p className="text-[0.92rem] leading-relaxed text-ivory/90">
        Este site usa apenas cookies essenciais ao funcionamento. Não usamos cookies de publicidade nem de análise.{" "}
        <Link href="/politica-de-cookies" className="font-semibold text-gold-soft underline">
          Saiba mais
        </Link>
      </p>
      <button type="button" onClick={dismiss} className="btn mt-3 min-h-11 w-full px-5 py-3 sm:w-auto">
        Entendi
      </button>
    </div>
  );
}
