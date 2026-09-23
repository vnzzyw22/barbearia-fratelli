import type { Metadata } from "next";
import Link from "next/link";
import { LegalLayout, LegalSection } from "@/components/site/legal-layout";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description: "Como a Fratelli Barber Club trata os dados pessoais de quem usa o site e o agendamento online.",
};

// MODELO BÁSICO baseado na LGPD (Lei 13.709/2018) e no que o site realmente faz.
// Recomenda-se revisão jurídica antes do lançamento e incluir a razão social e o
// CNPJ da Fratelli (ainda não informados) na seção 1.
export default function PoliticaDePrivacidadePage() {
  return (
    <LegalLayout title="Política de Privacidade" updated="23 de setembro de 2026">
      <LegalSection title="1. Quem somos">
        <p>
          A <strong>Fratelli Barber Club</strong> (“Fratelli”, “nós”) é uma barbearia localizada na Av. das
          Grevíleas, 148 — Maringá, PR. Somos a responsável (controladora) pelos dados pessoais tratados neste site,
          nos termos da Lei Geral de Proteção de Dados (LGPD).
        </p>
      </LegalSection>

      <LegalSection title="2. Quais dados coletamos">
        <p>Coletamos apenas o necessário para o agendamento e o atendimento:</p>
        <ul>
          <li>
            <strong>Ao agendar:</strong> nome, número de WhatsApp, observação (opcional) e os dados do horário
            escolhido (serviço, profissional, dia e hora).
          </li>
          <li>
            <strong>Dados técnicos automáticos:</strong> endereço IP, tipo de navegador e data/hora de acesso,
            registrados pela hospedagem para segurança e funcionamento do site.
          </li>
        </ul>
        <p>Não pedimos CPF, endereço residencial, dados de pagamento nem dados sensíveis.</p>
      </LegalSection>

      <LegalSection title="3. Para que usamos">
        <ul>
          <li>Registrar, organizar e confirmar o seu horário.</li>
          <li>Entrar em contato pelo WhatsApp informado para confirmar, remarcar ou avisar sobre o atendimento.</li>
          <li>Gerir a agenda da barbearia e o histórico de atendimentos.</li>
          <li>Manter a segurança e o bom funcionamento do site.</li>
        </ul>
        <p>
          A base legal é a execução do serviço que você solicita (agendamento) e o nosso legítimo interesse em
          operar a agenda com segurança. Não usamos seus dados para publicidade de terceiros nem os vendemos.
        </p>
      </LegalSection>

      <LegalSection title="4. Com quem compartilhamos">
        <p>Só com quem é necessário para o site funcionar, sempre sob contrato de tratamento de dados:</p>
        <ul>
          <li>
            <strong>Vercel</strong> (hospedagem do site) e <strong>Supabase</strong> (banco de dados onde os
            agendamentos ficam guardados).
          </li>
          <li>Os profissionais e a equipe da Fratelli que atendem e administram a agenda.</li>
        </ul>
        <p>
          Se você clicar em links externos (WhatsApp, Instagram, Google Maps), esses serviços passam a tratar seus
          dados conforme as políticas próprias deles.
        </p>
      </LegalSection>

      <LegalSection title="5. Por quanto tempo guardamos">
        <p>
          Guardamos os dados enquanto houver relação de atendimento com você e pelo tempo necessário para cumprir
          obrigações legais ou resolver eventuais questões. Depois disso, eles são apagados ou anonimizados.
        </p>
      </LegalSection>

      <LegalSection title="6. Seus direitos">
        <p>Você pode, a qualquer momento, pedir:</p>
        <ul>
          <li>confirmação de que tratamos seus dados e acesso a eles;</li>
          <li>correção de dados incompletos ou desatualizados;</li>
          <li>anonimização, bloqueio ou eliminação de dados desnecessários;</li>
          <li>portabilidade e informações sobre compartilhamento;</li>
          <li>revogação de consentimento, quando for o caso.</li>
        </ul>
        <p>
          Para exercer esses direitos, fale com a gente pelo WhatsApp{" "}
          <a href="https://wa.me/5544999161432">(44) 99916-1432</a> ou presencialmente na barbearia. Você também pode
          reclamar à Autoridade Nacional de Proteção de Dados (ANPD).
        </p>
      </LegalSection>

      <LegalSection title="7. Segurança">
        <p>
          Usamos conexão segura (HTTPS) e acesso restrito ao painel de administração. Nenhum sistema é 100% imune a
          falhas, mas adotamos medidas técnicas razoáveis para proteger os dados.
        </p>
      </LegalSection>

      <LegalSection title="8. Cookies">
        <p>
          O site público não usa cookies de publicidade nem de análise. Detalhes na{" "}
          <Link href="/politica-de-cookies">Política de Cookies</Link>.
        </p>
      </LegalSection>

      <LegalSection title="9. Menores de idade">
        <p>
          O agendamento é destinado a maiores de 18 anos ou a menores acompanhados e representados por um
          responsável, que deve fornecer os dados.
        </p>
      </LegalSection>

      <LegalSection title="10. Mudanças nesta política">
        <p>
          Podemos atualizar esta política. A data da última atualização fica no topo da página. Em caso de mudança
          relevante, avisaremos pelos nossos canais.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
