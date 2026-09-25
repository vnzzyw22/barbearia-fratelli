// Traduz as exceções do banco (mensagens fixas, ver a migração financeira) para o painel.
const MESSAGES: Record<string, string> = {
  forbidden: "Sem permissão: só o dono acessa o financeiro.",
  cash_register_required: "Abra o caixa antes de receber ou pagar em dinheiro.",
  cash_register_already_open: "Já existe um caixa aberto.",
  no_open_cash_register: "Não há caixa aberto.",
  overpayment: "O valor informado é maior que o saldo em aberto.",
  payment_mismatch: "A soma dos pagamentos precisa ser igual ao total do atendimento.",
  already_completed: "Este atendimento já foi concluído.",
  already_paid: "Esta despesa já foi paga.",
  appointment_has_payments: "Este atendimento já tem pagamento. Estorne o pagamento antes de cancelar.",
  completed_appointment_is_immutable: "Atendimento concluído não pode ser alterado.",
  completed_appointment_items_are_immutable: "Os itens de um atendimento concluído não podem ser alterados.",
  complete_appointment_required: "Para concluir, use “Concluir atendimento”.",
  invalid_status: "O status atual do atendimento não permite esta operação.",
  invalid_amount: "Valor inválido.",
  invalid_payment_method: "Forma de pagamento inválida ou desativada.",
  reason_required: "Informe o motivo.",
  no_items: "O atendimento não tem itens com valor.",
  entry_cancelled: "Este lançamento está cancelado.",
  cancelled_entry_is_immutable: "Lançamento cancelado não pode ser alterado.",
  paid_entry_is_immutable: "Despesa paga não pode ser alterada.",
  income_amount_is_immutable: "O valor de uma receita não pode ser alterado.",
  category_kind_mismatch: "A categoria não é do tipo certo (receita/despesa).",
  cash_movements_manual_needs_description: "Informe a descrição do movimento.",
  appointment_not_completed: "O atendimento ainda não foi concluído.",
  financial_history_is_immutable: "Histórico financeiro não pode ser apagado nem alterado.",
};

export function financeErrorMessage(raw: string | undefined | null) {
  const text = raw ?? "";
  for (const [code, msg] of Object.entries(MESSAGES)) {
    if (text.includes(code)) return msg;
  }
  if (text.includes("23505") || text.includes("duplicate key")) {
    return "Operação já registrada (evitamos duplicar).";
  }
  return "Não foi possível concluir a operação. Tente de novo.";
}
