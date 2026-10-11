import { describe, it, expect } from 'vitest';
import { validateTransactionInput } from '../utils/validators';

describe('Validators Unit Tests', () => {
  it('rejeita valores nulos, NaN ou <= 0', () => {
    expect(validateTransactionInput(0, 'Teste', 'DEPOSIT', 100).isValid).toBe(false);
    expect(validateTransactionInput(-10, 'Teste', 'DEPOSIT', 100).isValid).toBe(false);
    expect(validateTransactionInput(NaN, 'Teste', 'DEPOSIT', 100).isValid).toBe(false);
  });

  it('rejeita descrição vazia ou com menos de 3 caracteres', () => {
    expect(validateTransactionInput(50, '', 'DEPOSIT', 100).isValid).toBe(false);
    expect(validateTransactionInput(50, '  ', 'DEPOSIT', 100).isValid).toBe(false);
    expect(validateTransactionInput(50, 'ab', 'DEPOSIT', 100).isValid).toBe(false);
    expect(validateTransactionInput(50, 'abc', 'DEPOSIT', 100).isValid).toBe(true);
  });

  it('impede retirada quando o valor excede o saldo atual', () => {
    const res = validateTransactionInput(150, 'Compra', 'WITHDRAWAL', 100);
    expect(res.isValid).toBe(false);
    expect(res.error).toMatch(/Saldo insuficiente/i);
  });

  it('permite retirada quando o valor é menor ou igual ao saldo atual', () => {
    expect(validateTransactionInput(100, 'Saque total', 'WITHDRAWAL', 100).isValid).toBe(true);
    expect(validateTransactionInput(50, 'Saque parcial', 'WITHDRAWAL', 100).isValid).toBe(true);
  });
});
