import type { Metadata } from "next";
import Link from "next/link";
import { LegalLayout, LegalSection } from "@/components/site/legal-layout";

export const metadata: Metadata = {
  title: "Política de Cookies",
  description: "Quais cookies e armazenamento local o site da Fratelli Barber Club usa.",
};

// Descreve o que o código realmente faz: o site público não define cookies para
// visitantes anônimos; o painel (/admin) usa cookie de sessão do Supabase Auth; o
// aviso de cookies guarda a escolha no localStorage. Revisar se analytics/pixels
// forem adicionados no futuro (aí será necessário pedir consentimento).
export default function PoliticaDeCookiesPage() {
  return (
    <LegalLayout title="Política de Cookies" updated="23 de setembro de 2026">
      <LegalSection title="O que são cookies">
        <p>
          Cookies são pequenos arquivos que um site grava no seu navegador para lembrar informações, como um login.
          Existem também recursos parecidos, como o armazenamento local (localStorage).
        </p>
      </LegalSection>

      <LegalSection title="O que usamos">
        <ul>
          <li>
            <strong>Cookies estritamente necessários:</strong> usados só no painel de administração da barbearia, para
            manter a equipe autenticada (sessão de login). Sem eles o painel não funciona. Visitantes do site não
            recebem esses cookies.
          </li>
          <li>
            <strong>Armazenamento local (preferência):</strong> guardamos no seu navegador apenas a informação de que
            você leu o aviso de cookies, para não mostrá-lo de novo.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="O que não usamos">
        <ul>
          <li>Cookies de publicidade ou de rastreamento entre sites.</li>
          <li>Ferramentas de análise de comportamento (como Google Analytics) ou pixels de redes sociais.</li>
        </ul>
        <p>Se isso mudar no futuro, pediremos o seu consentimento antes e atualizaremos esta página.</p>
      </LegalSection>

      <LegalSection title="Como controlar">
        <p>
          Você pode apagar cookies e dados do site nas configurações do seu navegador a qualquer momento. Como o site
          público não depende de cookies, ele continua funcionando normalmente.
        </p>
      </LegalSection>

      <LegalSection title="Dúvidas">
        <p>
          Veja também a <Link href="/politica-de-privacidade">Política de Privacidade</Link> ou fale com a gente pelo
          WhatsApp <a href="https://wa.me/5544999161432">(44) 99916-1432</a>.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
