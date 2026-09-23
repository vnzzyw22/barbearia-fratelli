import type { Metadata } from "next";
import Link from "next/link";
import { LegalLayout, LegalSection } from "@/components/site/legal-layout";

export const metadata: Metadata = {
  title: "Termos de Uso",
  description: "Condições de uso do site e do agendamento online da Fratelli Barber Club.",
};

// MODELO BÁSICO — recomenda-se revisão jurídica. Reflete as regras reais do sistema:
// sem pagamento antecipado, pedido pendente até confirmação, cancelamento só pela casa.
export default function TermosDeUsoPage() {
  return (
    <LegalLayout title="Termos de Uso" updated="23 de setembro de 2026">
      <LegalSection title="1. Aceitação">
        <p>
          Ao usar o site da Fratelli Barber Club e o agendamento online, você concorda com estes termos e com a{" "}
          <Link href="/politica-de-privacidade">Política de Privacidade</Link>.
        </p>
      </LegalSection>

      <LegalSection title="2. Como funciona o agendamento">
        <ul>
          <li>Você escolhe serviço, profissional, dia e horário entre os horários disponíveis.</li>
          <li>
            O pedido fica <strong>pendente</strong> até a confirmação da barbearia, enviada pelo WhatsApp informado.
            Só vale como reservado depois da confirmação.
          </li>
          <li>Não há pagamento antecipado pelo site; o pagamento é feito no local.</li>
          <li>
            O cancelamento não é feito pelo site. Avise a barbearia com antecedência pelo WhatsApp para liberarmos o
            horário para outra pessoa.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Suas responsabilidades">
        <p>
          Informe dados verdadeiros (principalmente um WhatsApp válido) e chegue no horário combinado. Atrasos
          grandes podem exigir remarcação para não prejudicar os próximos atendimentos.
        </p>
      </LegalSection>

      <LegalSection title="4. Preços e serviços">
        <p>
          Os serviços, valores e durações exibidos no site podem ser alterados sem aviso prévio. O valor final é o
          informado no atendimento.
        </p>
      </LegalSection>

      <LegalSection title="5. Conteúdo do site">
        <p>
          A marca, a logo, os textos e as imagens pertencem à Fratelli Barber Club ou são usados com autorização.
          Não é permitido copiar ou reutilizar sem permissão.
        </p>
      </LegalSection>

      <LegalSection title="6. Disponibilidade">
        <p>
          Fazemos o possível para manter o site no ar, mas ele pode ficar indisponível por manutenção ou por fatores
          fora do nosso controle. Nesses casos, fale com a gente pelo WhatsApp.
        </p>
      </LegalSection>

      <LegalSection title="7. Lei aplicável">
        <p>
          Estes termos seguem a legislação brasileira, inclusive o Código de Defesa do Consumidor. Dúvidas ou
          reclamações: WhatsApp <a href="https://wa.me/5544999161432">(44) 99916-1432</a>.
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
