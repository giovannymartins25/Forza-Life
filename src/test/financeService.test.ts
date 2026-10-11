import { describe, it, expect, beforeEach } from 'vitest';
import { FinanceService } from '../services/financeService';
import { BackupService } from '../services/backupService';
import { resetDBConnection } from '../services/db';

describe('FinanceService & Career Foundation Tests', () => {
  beforeEach(async () => {
    resetDBConnection();
    await BackupService.resetCareer();
  });

  it('1. Saldo inicial deve ser estritamente R$ 0,00 e moradia inicial na Oficina da Mei', async () => {
    const career = await FinanceService.getCareerState();

    expect(career.currentBalance).toBe(0);
    expect(career.totalEarned).toBe(0);
    expect(career.totalSpent).toBe(0);
    expect(career.vehiclesCount).toBe(0);
    expect(career.propertiesCount).toBe(0);
    expect(career.businessesCount).toBe(0);
    expect(career.lodging.name).toBe('Oficina da Mei');
    expect(career.lodging.isTemporary).toBe(true);

    const stats = await FinanceService.getFinancialStats();
    expect(stats.currentBalance).toBe(0);
    expect(stats.netWorth).toBe(0);
    expect(stats.transactionCount).toBe(0);
  });

  it('2. Deve adicionar dinheiro corretamente e atualizar saldo e histórico', async () => {
    const depositAmount = 1500.50;
    const result = await FinanceService.addMoney(depositAmount, 'Serviço de mecânica e diagnóstico');

    expect(result.career.currentBalance).toBe(1500.50);
    expect(result.career.totalEarned).toBe(1500.50);
    expect(result.transaction.amount).toBe(1500.50);
    expect(result.transaction.balanceAfter).toBe(1500.50);
    expect(result.transaction.type).toBe('DEPOSIT');

    const history = await FinanceService.getAllTransactions();
    expect(history.length).toBe(1);
    expect(history[0].description).toBe('Serviço de mecânica e diagnóstico');
    expect(history[0].balanceAfter).toBe(1500.50);
  });

  it('3. Deve retirar dinheiro corretamente quando houver saldo suficiente', async () => {
    // Primeiro deposita R$ 1000
    await FinanceService.addMoney(1000, 'Depósito de teste');

    // Depois saca R$ 350
    const withdrawResult = await FinanceService.withdrawMoney(350, 'Compra de ferramentas');

    expect(withdrawResult.career.currentBalance).toBe(650);
    expect(withdrawResult.career.totalSpent).toBe(350);
    expect(withdrawResult.transaction.amount).toBe(350);
    expect(withdrawResult.transaction.balanceAfter).toBe(650);
    expect(withdrawResult.transaction.type).toBe('WITHDRAWAL');

    const history = await FinanceService.getAllTransactions();
    expect(history.length).toBe(2);
    // Ordenado do mais recente para o mais antigo
    expect(history[0].type).toBe('WITHDRAWAL');
    expect(history[1].type).toBe('DEPOSIT');
  });

  it('4. Bloqueio estrito de retirada superior ao saldo disponível', async () => {
    await FinanceService.addMoney(100, 'Depósito de R$ 100');

    // Tentar retirar R$ 100.01 ou R$ 500
    await expect(
      FinanceService.withdrawMoney(500, 'Tentativa de saque sem saldo')
    ).rejects.toThrow(/Saldo insuficiente/i);

    // O saldo deve permanecer R$ 100,00
    const career = await FinanceService.getCareerState();
    expect(career.currentBalance).toBe(100);

    // Apenas 1 transação (o depósito inicial) deve existir
    const history = await FinanceService.getAllTransactions();
    expect(history.length).toBe(1);
    expect(history[0].type).toBe('DEPOSIT');
  });

  it('5. Validação de entradas inválidas: valores <= 0 ou descrições vazias', async () => {
    // Valor 0
    await expect(FinanceService.addMoney(0, 'Valor zero')).rejects.toThrow(
      /maior que R\$ 0,00/i
    );

    // Valor negativo
    await expect(FinanceService.addMoney(-50, 'Valor negativo')).rejects.toThrow(
      /maior que R\$ 0,00/i
    );

    // Descrição vazia ou curta
    await expect(FinanceService.addMoney(100, '   ')).rejects.toThrow(
      /justificativa ou descrição/i
    );
    await expect(FinanceService.addMoney(100, 'ab')).rejects.toThrow(
      /pelo menos 3 caracteres/i
    );
  });

  it('6. Filtragem de histórico por tipo e período', async () => {
    await FinanceService.addMoney(200, 'Entrada 1');
    await FinanceService.addMoney(300, 'Entrada 2');
    await FinanceService.withdrawMoney(100, 'Saída 1');

    const all = await FinanceService.getFilteredTransactions('all', 'all');
    expect(all.length).toBe(3);

    const deposits = await FinanceService.getFilteredTransactions('DEPOSIT', 'all');
    expect(deposits.length).toBe(2);

    const withdrawals = await FinanceService.getFilteredTransactions('WITHDRAWAL', 'all');
    expect(withdrawals.length).toBe(1);
    expect(withdrawals[0].amount).toBe(100);
  });
});
