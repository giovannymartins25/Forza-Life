import type { TransactionType } from '../types';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export function validateTransactionInput(
  amount: number,
  description: string,
  type: TransactionType,
  currentBalance: number
): ValidationResult {
  if (typeof amount !== 'number' || isNaN(amount)) {
    return { isValid: false, error: 'O valor informado é inválido.' };
  }

  if (amount <= 0) {
    return { isValid: false, error: 'O valor da movimentação deve ser estritamente maior que R$ 0,00.' };
  }

  // Verificar precisão excessiva de centavos (ex: 10.005)
  const cents = Math.round(amount * 100);
  if (Math.abs(amount - cents / 100) > 0.0001) {
    return { isValid: false, error: 'O valor não pode ter frações menores que centavos.' };
  }

  const trimmedDesc = description.trim();
  if (!trimmedDesc) {
    return { isValid: false, error: 'Informe uma justificativa ou descrição para a operação.' };
  }

  if (trimmedDesc.length < 3) {
    return { isValid: false, error: 'A descrição deve conter pelo menos 3 caracteres.' };
  }

  if (type === 'WITHDRAWAL') {
    if (amount > currentBalance) {
      return {
        isValid: false,
        error: `Saldo insuficiente. Valor solicitado excede o saldo disponível de R$ ${currentBalance.toFixed(2)}.`,
      };
    }
  }

  return { isValid: true };
}
