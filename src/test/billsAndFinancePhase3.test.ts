import { describe, it, expect, beforeEach } from 'vitest';
import { FinanceService } from '../services/financeService';
import { BackupService, CURRENT_BACKUP_SCHEMA_VERSION } from '../services/backupService';
import {
  billService,
  calculateDaysOverdue,
  calculateBillInterest,
} from '../services/billService';
import { resetDBConnection } from '../services/db';

describe('Horizon Life — Testes de Ajustes Financeiros e Contas a Pagar (Fase 3)', () => {
  beforeEach(async () => {
    resetDBConnection();
    await BackupService.resetCareer();
  });

  describe('1. Janela móvel de 60 minutos (Receitas e Despesas por Hora)', () => {
    it('calcula receitas e despesas na última hora e zera quando fora da janela', async () => {
      const now = Date.now();
      const thirtyMinutesAgo = new Date(now - 30 * 60 * 1000).toISOString();
      const twoHoursAgo = new Date(now - 120 * 60 * 1000).toISOString();

      // Transações dentro da janela (últimos 30 min)
      await FinanceService.executeTransaction({
        type: 'DEPOSIT',
        category: 'salary',
        amount: 500,
        description: 'Salário recente',
        customTimestamp: thirtyMinutesAgo,
      });

      await FinanceService.executeTransaction({
        type: 'WITHDRAWAL',
        category: 'fuel',
        amount: 80,
        description: 'Abastecimento recente',
        customTimestamp: thirtyMinutesAgo,
      });

      // Transações fora da janela (2 horas atrás)
      await FinanceService.executeTransaction({
        type: 'DEPOSIT',
        category: 'business_income',
        amount: 1000,
        description: 'Receita antiga',
        customTimestamp: twoHoursAgo,
      });

      await FinanceService.executeTransaction({
        type: 'WITHDRAWAL',
        category: 'maintenance',
        amount: 200,
        description: 'Manutenção antiga',
        customTimestamp: twoHoursAgo,
      });

      const stats = await FinanceService.getFinancialStats('all', now);

      // Hourly stats (últimos 60 min)
      expect(stats.hourlyIncome).toBe(500);
      expect(stats.hourlyExpense).toBe(80);

      // Totais acumulados gerais
      expect(stats.totalIncome).toBe(1500);
      expect(stats.totalExpense).toBe(280);
      expect(stats.currentBalance).toBe(1220);
    });

    it('retorna R$ 0,00 por hora quando não houver transações nos últimos 60 minutos', async () => {
      const now = Date.now();
      const threeHoursAgo = new Date(now - 180 * 60 * 1000).toISOString();

      await FinanceService.executeTransaction({
        type: 'DEPOSIT',
        category: 'salary',
        amount: 300,
        description: 'Entrada velha',
        customTimestamp: threeHoursAgo,
      });

      const stats = await FinanceService.getFinancialStats('all', now);
      expect(stats.hourlyIncome).toBe(0);
      expect(stats.hourlyExpense).toBe(0);
      expect(stats.totalIncome).toBe(300);
    });
  });

  describe('2. Totais Acumulados e Total Retirado', () => {
    it('distingue saques manuais de outras despesas no indicador totalWithdrawn', async () => {
      await FinanceService.addMoney(2000, 'Saldo inicial');
      // Saque manual
      await FinanceService.withdrawMoney(300, 'Retirada para despesas pessoais');
      // Despesa de combustível (não deve somar em totalWithdrawn)
      await FinanceService.executeTransaction({
        type: 'WITHDRAWAL',
        category: 'fuel',
        amount: 150,
        description: 'Gasolina aditivada',
      });

      const stats = await FinanceService.getFinancialStats();
      expect(stats.totalWithdrawn).toBe(300); // Apenas o saque manual
      expect(stats.totalExpense).toBe(450);   // Total de todas as saídas
      expect(stats.currentBalance).toBe(1550);
    });
  });

  describe('3. Agrupamento por Categoria e Período', () => {
    it('agrupa corretamente entradas e saídas por categoria com percentuais', async () => {
      await FinanceService.addMoney(1000, 'Depósito');
      await FinanceService.executeTransaction({
        type: 'DEPOSIT',
        category: 'rideshare_income',
        amount: 400,
        description: 'Corridas de app',
      });
      await FinanceService.executeTransaction({
        type: 'DEPOSIT',
        category: 'salary',
        amount: 600,
        description: 'Salário de piloto de testes',
      });
      await FinanceService.executeTransaction({
        type: 'WITHDRAWAL',
        category: 'fuel',
        amount: 200,
        description: 'Combustível',
      });
      await FinanceService.executeTransaction({
        type: 'WITHDRAWAL',
        category: 'maintenance',
        amount: 300,
        description: 'Troca de pastilhas',
      });

      const breakdown = await FinanceService.getCategoryBreakdown('all');
      expect(breakdown.totalIncomePeriod).toBe(2000);
      expect(breakdown.totalExpensePeriod).toBe(500);

      const fuelItem = breakdown.expenses.find((e) => e.category === 'fuel');
      expect(fuelItem).toBeDefined();
      expect(fuelItem?.totalAmount).toBe(200);
      expect(fuelItem?.percentage).toBe(40); // 200 / 500 = 40%

      const maintenanceItem = breakdown.expenses.find((e) => e.category === 'maintenance');
      expect(maintenanceItem?.totalAmount).toBe(300);
      expect(maintenanceItem?.percentage).toBe(60); // 300 / 500 = 60%
    });
  });

  describe('4. Regras de Juros por Atraso (10% ao dia composto)', () => {
    it('não cobra juros antes do vencimento ou no mesmo dia do vencimento', () => {
      const dueDate = '2026-10-15T23:59:59.000Z';
      const beforeDue = new Date('2026-10-15T12:00:00.000Z');
      
      const daysOverdue = calculateDaysOverdue(dueDate, beforeDue);
      expect(daysOverdue).toBe(0);

      const interest = calculateBillInterest(100000, 0.10, daysOverdue);
      expect(interest.accruedInterestCents).toBe(0);
      expect(interest.totalAmountCents).toBe(100000); // R$ 1.000,00
    });

    it('calcula juros de 1 dia completo: R$ 1.000,00 vira R$ 1.100,00', () => {
      const dueDate = '2026-10-15T00:00:00.000Z';
      // Exatamente 1 dia completo depois (24h)
      const oneDayAfter = new Date('2026-10-16T00:00:01.000Z');

      const daysOverdue = calculateDaysOverdue(dueDate, oneDayAfter);
      expect(daysOverdue).toBe(1);

      // 100.000 centavos = R$ 1.000,00
      const interest = calculateBillInterest(100000, 0.10, daysOverdue);
      expect(interest.accruedInterestCents).toBe(10000); // R$ 100,00 de juros
      expect(interest.totalAmountCents).toBe(110000);     // R$ 1.100,00 total
    });

    it('calcula juros de 2 dias completos: R$ 1.000,00 vira R$ 1.210,00 (juros compostos)', () => {
      const dueDate = '2026-10-15T00:00:00.000Z';
      // 2 dias completos depois (48h)
      const twoDaysAfter = new Date('2026-10-17T00:00:01.000Z');

      const daysOverdue = calculateDaysOverdue(dueDate, twoDaysAfter);
      expect(daysOverdue).toBe(2);

      const interest = calculateBillInterest(100000, 0.10, daysOverdue);
      expect(interest.accruedInterestCents).toBe(21000); // R$ 210,00 de juros
      expect(interest.totalAmountCents).toBe(121000);     // R$ 1.210,00 total
    });
  });

  describe('5. Criação, Pagamento e Bloqueio por Falta de Saldo', () => {
    it('cria conta a pagar com sucesso', async () => {
      const bill = await billService.createBill({
        name: 'IPVA Nissan Silvia S15',
        category: 'vehicle_tax',
        amount: 450,
        dueDate: '2026-10-20T23:59:59.000Z',
        frequency: 'weekly',
      });

      expect(bill.id).toBeDefined();
      expect(bill.name).toBe('IPVA Nissan Silvia S15');
      expect(bill.originalAmountCents).toBe(45000);
      expect(bill.accruedInterestCents).toBe(0);
      expect(bill.status).toBe('pending');

      const all = await billService.getAllBills();
      expect(all.length).toBe(1);
    });

    it('bloqueia pagamento se não houver saldo suficiente e não altera a conta nem o saldo', async () => {
      const bill = await billService.createBill({
        name: 'Seguro da Oficina',
        category: 'property_expense',
        amount: 800,
        dueDate: '2026-10-20T23:59:59.000Z',
      });

      // Saldo atual da carreira é 0
      await expect(billService.payBill(bill.id)).rejects.toThrow(/Saldo insuficiente/);

      // Confirma que a conta continua pendente e o saldo permanece 0
      const fetched = await billService.getBillById(bill.id);
      expect(fetched?.status).toBe('pending');
      expect(fetched?.payments.length).toBe(0);

      const career = await FinanceService.getCareerState();
      expect(career.currentBalance).toBe(0);
    });

    it('realiza pagamento com sucesso quando houver saldo, debitando e atualizando status', async () => {
      await FinanceService.addMoney(1000, 'Saldo para contas');

      const bill = await billService.createBill({
        name: 'Conta de Luz do Box',
        category: 'property_expense',
        amount: 250,
        dueDate: '2026-10-20T23:59:59.000Z',
      });

      const { bill: paidBill, transactionId } = await billService.payBill(bill.id);

      expect(paidBill.status).toBe('paid');
      expect(paidBill.payments.length).toBe(1);
      expect(paidBill.payments[0].amountPaid).toBe(250);
      expect(transactionId).toBeDefined();

      // Saldo da carreira deve ter caído de 1000 para 750
      const career = await FinanceService.getCareerState();
      expect(career.currentBalance).toBe(750);
      expect(career.totalSpent).toBe(250);

      // Prevenção de duplicação: tentar pagar a mesma conta novamente deve falhar
      await expect(billService.payBill(bill.id)).rejects.toThrow(/já foi paga/);
    });
  });

  describe('6. Idempotência e Contas Recorrentes ao Abrir o Site', () => {
    it('processAllBills atualiza juros sem duplicá-los a cada chamada', async () => {
      const dueDate = new Date('2026-10-10T00:00:00.000Z').toISOString();
      const bill = await billService.createBill({
        name: 'Conta Atrasada',
        category: 'other',
        amount: 1000,
        dueDate,
      });

      // Simula data 2 dias depois do vencimento
      const testNow = new Date('2026-10-12T00:00:01.000Z');

      // Primeira execução
      const processed1 = await billService.processAllBills(testNow);
      const b1 = processed1.find((b) => b.id === bill.id);
      expect(b1?.status).toBe('overdue');
      expect(b1?.accruedInterestCents).toBe(21000); // R$ 210,00

      // Segunda execução no mesmo instante (idempotência)
      const processed2 = await billService.processAllBills(testNow);
      const b2 = processed2.find((b) => b.id === bill.id);
      expect(b2?.accruedInterestCents).toBe(21000); // Não dobrou!
      expect(processed2.length).toBe(1);            // Não duplicou conta!
    });

    it('gera a próxima ocorrência para conta semanal recorrente que já venceu sem duplicar', async () => {
      const dueDate = new Date('2026-10-01T00:00:00.000Z').toISOString();
      await billService.createBill({
        name: 'IPVA Semanal',
        category: 'vehicle_tax',
        amount: 100,
        dueDate,
        frequency: 'weekly',
      });

      // Simula agora como 2026-10-05 (após o vencimento de 2026-10-01)
      const nowSim = new Date('2026-10-05T00:00:00.000Z');

      const pass1 = await billService.processAllBills(nowSim);
      // Deve ter gerado a próxima conta para 7 dias após (2026-10-08)
      expect(pass1.length).toBe(2);

      // Rodar novamente no mesmo dia NÃO deve gerar uma terceira ocorrência
      const pass2 = await billService.processAllBills(nowSim);
      expect(pass2.length).toBe(2);
    });
  });

  describe('7. Backup e Restauração com Contas a Pagar (Schema v3)', () => {
    it('exporta e restaura contas a pagar mantendo dados e compatibilidade', async () => {
      await FinanceService.addMoney(500, 'Saldo prévio');
      const bill = await billService.createBill({
        name: 'Seguro Automotivo',
        category: 'vehicle_tax',
        amount: 300,
        dueDate: '2026-10-25T00:00:00.000Z',
      });
      expect(bill.id).toBeDefined();

      const backup = await BackupService.exportBackup();
      expect(backup.schemaVersion).toBe(CURRENT_BACKUP_SCHEMA_VERSION);
      expect(backup.data.bills?.length).toBe(1);
      expect(backup.data.bills?.[0].name).toBe('Seguro Automotivo');

      // Limpar banco
      await BackupService.resetCareer();
      expect((await billService.getAllBills()).length).toBe(0);

      // Restaurar
      await BackupService.restoreBackup(backup);
      const restoredBills = await billService.getAllBills();
      expect(restoredBills.length).toBe(1);
      expect(restoredBills[0].name).toBe('Seguro Automotivo');
      expect(restoredBills[0].originalAmountCents).toBe(30000);

      const career = await FinanceService.getCareerState();
      expect(career.currentBalance).toBe(500);
    });

    it('restaura backup v2 antigo sem quebrar e inicializa contas como array vazio', async () => {
      const v2Backup = {
        appName: 'Horizon Life' as const,
        schemaVersion: 2,
        exportedAt: new Date().toISOString(),
        data: {
          career: {
            id: 'current_career',
            pilotName: 'Piloto Antigo',
            currentBalance: 1200,
            totalEarned: 1200,
            totalSpent: 0,
            lodging: {
              name: 'Oficina da Mei',
              description: 'Acomodação inicial',
              isTemporary: true,
              rentCost: 0,
            },
            vehiclesCount: 0,
            propertiesCount: 0,
            businessesCount: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          transactions: [],
        },
      };

      const validation = BackupService.validateBackup(v2Backup);
      expect(validation.isValid).toBe(true);
      expect(validation.data?.data.bills).toEqual([]);

      await BackupService.restoreBackup(validation.data!);
      const bills = await billService.getAllBills();
      expect(bills.length).toBe(0);

      const career = await FinanceService.getCareerState();
      expect(career.pilotName).toBe('Piloto Antigo');
      expect(career.currentBalance).toBe(1200);
    });
  });
});
