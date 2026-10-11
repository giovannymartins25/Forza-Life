import { describe, it, expect, beforeEach } from 'vitest';
import { FinanceService } from '../services/financeService';
import { BackupService, CURRENT_BACKUP_SCHEMA_VERSION } from '../services/backupService';
import { BusinessService } from '../services/businessService';
import { resetDBConnection, getDatabase } from '../services/db';

describe('Horizon Life — Módulo de Negócios e Empresas Próprias', () => {
  beforeEach(async () => {
    resetDBConnection();
    await BackupService.resetCareer();
  });

  describe('1. Criação e Gestão Cadastral de Empresas', () => {
    it('permite criar empresa sem débito bancário', async () => {
      const biz = await BusinessService.createBusiness({
        name: 'Oficina Turbo Motors',
        sector: 'automotive',
        description: 'Preparação e mecânica esportiva',
        address: 'Rua das Bielas, 100',
        investmentCost: 35000,
        acquisitionType: 'opened',
        operationalStatus: 'open',
        revenuePerCycle: 4000,
        revenueFrequency: 'monthly',
        operatingCostPercent: 20,
        deductFromBalance: false,
      });

      expect(biz.id).toBeDefined();
      expect(biz.name).toBe('Oficina Turbo Motors');
      expect(biz.sector).toBe('automotive');
      expect(biz.investmentCost).toBe(35000);
      expect(biz.operationalStatus).toBe('open');
      expect(biz.isClosed).toBe(false);
      expect(biz.staff).toEqual([]);
      expect(biz.estimatedMarketValue).toBeGreaterThan(0);
    });

    it('permite criar empresa com débito bancário se houver saldo', async () => {
      await FinanceService.addMoney(50000, 'Aporte inicial');
      const biz = await BusinessService.createBusiness({
        name: 'Padaria Forno Quente',
        sector: 'food_beverage',
        description: 'Pães artesanais e café',
        investmentCost: 20000,
        acquisitionType: 'opened',
        operationalStatus: 'open',
        revenuePerCycle: 3000,
        revenueFrequency: 'monthly',
        operatingCostPercent: 25,
        deductFromBalance: true,
      });

      expect(biz.id).toBeDefined();
      const career = await FinanceService.getCareerState();
      expect(career.currentBalance).toBe(30000);
    });

    it('rejeita criação com débito se saldo for insuficiente', async () => {
      await expect(
        BusinessService.createBusiness({
          name: 'Mega Concessionária',
          sector: 'automotive',
          description: 'Venda de superesportivos',
          investmentCost: 1000000,
          acquisitionType: 'bought',
          operationalStatus: 'open',
          revenuePerCycle: 50000,
          revenueFrequency: 'monthly',
          operatingCostPercent: 15,
          deductFromBalance: true,
        })
      ).rejects.toThrow(/Saldo insuficiente/i);
    });

    it('permite atualizar dados da empresa', async () => {
      const biz = await BusinessService.createBusiness({
        name: 'Boutique Alpha',
        sector: 'retail',
        description: 'Roupas esportivas',
        investmentCost: 15000,
        acquisitionType: 'opened',
        operationalStatus: 'open',
        revenuePerCycle: 2000,
        revenueFrequency: 'weekly',
        operatingCostPercent: 30,
        deductFromBalance: false,
      });

      const updated = await BusinessService.updateBusiness(biz.id, {
        name: 'Boutique Alpha Sports',
        operatingCostPercent: 25,
      });

      expect(updated.name).toBe('Boutique Alpha Sports');
      expect(updated.operatingCostPercent).toBe(25);
    });
  });

  describe('2. Gestão de Equipe (Staff)', () => {
    it('permite contratar colaboradores e atualiza a soma salarial', async () => {
      const biz = await BusinessService.createBusiness({
        name: 'Tech Horizon Solutions',
        sector: 'technology',
        description: 'Desenvolvimento de software e IoT',
        investmentCost: 50000,
        acquisitionType: 'opened',
        operationalStatus: 'open',
        revenuePerCycle: 15000,
        revenueFrequency: 'monthly',
        operatingCostPercent: 10,
        deductFromBalance: false,
      });

      const withStaff1 = await BusinessService.addStaff({
        businessId: biz.id,
        name: 'Lucas Dev',
        role: 'Tech Lead',
        salary: 6000,
      });

      expect(withStaff1.staff.length).toBe(1);
      expect(withStaff1.totalStaffSalaryCost).toBe(6000);

      const withStaff2 = await BusinessService.addStaff({
        businessId: biz.id,
        name: 'Mariana UI',
        role: 'Designer',
        salary: 4000,
      });

      expect(withStaff2.staff.length).toBe(2);
      expect(withStaff2.totalStaffSalaryCost).toBe(10000);

      // Demite o primeiro
      const staff1Id = withStaff2.staff[0].id;
      const afterDismiss = await BusinessService.removeStaff(biz.id, staff1Id);
      expect(afterDismiss.staff.length).toBe(1);
      expect(afterDismiss.totalStaffSalaryCost).toBe(4000);
    });
  });

  describe('3. Despesas e Custos do Negócio', () => {
    it('lança despesa e debita do saldo bancário quando solicitado', async () => {
      await FinanceService.addMoney(10000, 'Capital de giro');
      const biz = await BusinessService.createBusiness({
        name: 'Logística Rápida',
        sector: 'logistics',
        description: 'Entregas urbanas',
        investmentCost: 20000,
        acquisitionType: 'opened',
        operationalStatus: 'open',
        revenuePerCycle: 5000,
        revenueFrequency: 'monthly',
        operatingCostPercent: 20,
        deductFromBalance: false,
      });

      const { expense, updatedBusiness } = await BusinessService.addExpense({
        businessId: biz.id,
        category: 'equipment',
        description: 'Compra de 2 baús térmicos',
        amount: 1500,
        deductFromBalance: true,
      });

      expect(expense.id).toBeDefined();
      expect(updatedBusiness.totalExpenses).toBe(1500);

      const career = await FinanceService.getCareerState();
      expect(career.currentBalance).toBe(8500);
    });
  });

  describe('4. Ciclos de Faturamento e Dividendos', () => {
    it('processa faturamento vencido deduzindo custos operacionais e salariais', async () => {
      const db = await getDatabase();
      const pastDate = new Date(Date.now() - 32 * 24 * 60 * 60 * 1000).toISOString();

      const biz = await BusinessService.createBusiness({
        name: 'Bar do Horizon',
        sector: 'food_beverage',
        description: 'Bebidas e petiscos',
        investmentCost: 25000,
        acquisitionType: 'opened',
        operationalStatus: 'open',
        revenuePerCycle: 10000,
        revenueFrequency: 'monthly',
        operatingCostPercent: 30, // 3.000 de custos operacionais
        deductFromBalance: false,
      });

      // Adiciona um atendente com salário de 2000
      await BusinessService.addStaff({
        businessId: biz.id,
        name: 'Roberto',
        role: 'Bartender',
        salary: 2000,
      });

      // Simula que a data do último faturamento / nextDue ficou para trás
      const b = await BusinessService.getBusinessById(biz.id);
      if (b) {
        b.openedAt = pastDate;
        b.nextRevenueDue = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
        await db.put('owned_businesses', b);
      }

      const res = await BusinessService.processRevenuePayments();
      expect(res.processedCount).toBeGreaterThanOrEqual(1);

      // Esperado: 10.000 bruto - 3.000 opCost - 2.000 salários = 5.000 líquido
      expect(res.totalNetRevenue).toBe(5000);

      const career = await FinanceService.getCareerState();
      expect(career.currentBalance).toBe(5000);
    });
  });

  describe('5. Venda e Encerramento de Negócio', () => {
    it('vende empresa e credita o valor na conta bancária', async () => {
      const biz = await BusinessService.createBusiness({
        name: 'Auto Elétrica Central',
        sector: 'automotive',
        description: 'Serviços elétricos',
        investmentCost: 20000,
        acquisitionType: 'opened',
        operationalStatus: 'open',
        revenuePerCycle: 2000,
        revenueFrequency: 'monthly',
        operatingCostPercent: 10,
        deductFromBalance: false,
      });

      const { business: soldBiz, transactionId } = await BusinessService.sellBusiness(biz.id, 45000);
      expect(soldBiz.isClosed).toBe(true);
      expect(soldBiz.operationalStatus).toBe('bankrupt');
      expect(transactionId).toBeDefined();

      const career = await FinanceService.getCareerState();
      expect(career.currentBalance).toBe(45000);
    });
  });

  describe('6. Dashboard e Backup v7', () => {
    it('calcula métricas do painel e preserva negócios no backup', async () => {
      await BusinessService.createBusiness({
        name: 'Fazenda Orgânica',
        sector: 'agriculture',
        description: 'Hortaliças frescas',
        investmentCost: 40000,
        acquisitionType: 'opened',
        operationalStatus: 'open',
        revenuePerCycle: 6000,
        revenueFrequency: 'monthly',
        operatingCostPercent: 20,
        deductFromBalance: false,
      });

      const dashStats = await BusinessService.getBusinessStats();
      expect(dashStats.totalBusinessesCount).toBe(1);
      expect(dashStats.activeBusinessesCount).toBe(1);
      expect(dashStats.totalInvestment).toBe(40000);

      // Exportação de backup
      const backup = await BackupService.exportBackup();
      expect(backup.schemaVersion).toBe(CURRENT_BACKUP_SCHEMA_VERSION);
      expect(backup.data.ownedBusinesses).toBeDefined();
      expect(backup.data.ownedBusinesses!.length).toBe(1);
      expect(backup.data.ownedBusinesses![0].name).toBe('Fazenda Orgânica');
    });
  });
});
