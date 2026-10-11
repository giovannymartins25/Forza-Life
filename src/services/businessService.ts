import { getDatabase } from './db';
import { FinanceService } from './financeService';
import type {
  OwnedBusiness,
  BusinessRevenueCycle,
  BusinessExpenseRecord,
  BusinessDashboardStats,
  BusinessSector,
  BusinessOperationalStatus,
  BusinessRevenueFrequency,
  BusinessExpenseCategory,
  BusinessStaff,
} from '../types';

// ─── Labels ──────────────────────────────────────────────────────────────────

export const BUSINESS_SECTOR_LABELS: Record<BusinessSector, string> = {
  food_beverage:  'Alimentação e Bebidas',
  automotive:     'Automotivo (Oficina / Peças)',
  retail:         'Varejo e Comércio',
  services:       'Serviços Gerais',
  logistics:      'Transportes e Logística',
  technology:     'Tecnologia e TI',
  real_estate:    'Imobiliária / Construção',
  entertainment:  'Entretenimento e Lazer',
  health:         'Saúde e Bem-Estar',
  agriculture:    'Agronegócio',
  other:          'Outro Setor',
};

export const BUSINESS_STATUS_LABELS: Record<BusinessOperationalStatus, string> = {
  open:             'Em Operação',
  closed:           'Fechado Temporariamente',
  under_renovation: 'Em Reforma',
  bankrupt:         'Falido / Encerrado',
  for_sale:         'À Venda',
};

export const BUSINESS_REVENUE_FREQ_LABELS: Record<BusinessRevenueFrequency, string> = {
  daily:   'Diário (a cada 24h)',
  weekly:  'Semanal (a cada 7 dias)',
  monthly: 'Mensal (a cada 30 dias)',
};

export const BUSINESS_EXPENSE_LABELS: Record<BusinessExpenseCategory, string> = {
  equipment:  'Equipamentos',
  renovation: 'Reforma / Melhoria',
  marketing:  'Marketing e Publicidade',
  supplies:   'Insumos / Estoque',
  utilities:  'Contas (Luz, Água, Internet)',
  rent:       'Aluguel do Espaço',
  other:      'Outras Despesas',
};

// ─── Constantes ───────────────────────────────────────────────────────────────

const REVENUE_FREQ_DURATION_MS: Record<BusinessRevenueFrequency, number> = {
  daily:   24 * 60 * 60 * 1000,
  weekly:  7 * 24 * 60 * 60 * 1000,
  monthly: 30 * 24 * 60 * 60 * 1000,
};

const STAFF_COST_DIVISOR: Record<BusinessRevenueFrequency, number> = {
  daily:   30,
  weekly:  4,
  monthly: 1,
};

const SECTOR_MULTIPLIER: Record<BusinessSector, number> = {
  food_beverage:  2.5,
  automotive:     3.0,
  retail:         2.0,
  services:       2.5,
  logistics:      3.5,
  technology:     5.0,
  real_estate:    4.0,
  entertainment:  2.0,
  health:         3.0,
  agriculture:    2.5,
  other:          2.0,
};

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface CreateBusinessDTO {
  name: string;
  sector: BusinessSector;
  customSectorName?: string;
  description: string;
  address?: string;
  imageUrl?: string;
  investmentCost: number;
  acquisitionType: 'opened' | 'bought';
  operationalStatus: BusinessOperationalStatus;
  revenuePerCycle: number;
  revenueFrequency: BusinessRevenueFrequency;
  operatingCostPercent: number;
  notes?: string;
  deductFromBalance: boolean;
}

export interface AddBusinessStaffDTO {
  businessId: string;
  name: string;
  role: string;
  salary: number;
}

export interface AddBusinessExpenseDTO {
  businessId: string;
  category: BusinessExpenseCategory;
  description: string;
  amount: number;
  notes?: string;
  deductFromBalance: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

function computeMarketValue(business: OwnedBusiness): number {
  const annualCycles = business.revenueFrequency === 'daily' ? 365
    : business.revenueFrequency === 'weekly' ? 52 : 12;
  const opCostFraction = business.operatingCostPercent / 100;
  const staffCostPerCycle = (business.totalStaffSalaryCost || 0) / STAFF_COST_DIVISOR[business.revenueFrequency];
  const netPerCycle = business.revenuePerCycle * (1 - opCostFraction) - staffCostPerCycle;
  const annualNetRevenue = Math.max(0, netPerCycle * annualCycles);
  return Math.round(annualNetRevenue * SECTOR_MULTIPLIER[business.sector]);
}

function computeStaffTotalCost(staff: BusinessStaff[]): number {
  return staff.reduce((sum, s) => sum + s.salary, 0);
}

// ─── BusinessService ──────────────────────────────────────────────────────────

export class BusinessService {

  static async getAllBusinesses(): Promise<OwnedBusiness[]> {
    const db = await getDatabase();
    return db.getAll('owned_businesses');
  }

  static async getBusinessById(id: string): Promise<OwnedBusiness | undefined> {
    const db = await getDatabase();
    return db.get('owned_businesses', id);
  }

  static async createBusiness(dto: CreateBusinessDTO): Promise<OwnedBusiness> {
    const db = await getDatabase();
    const now = new Date().toISOString();

    const business: OwnedBusiness = {
      id: generateId('biz'),
      name: dto.name,
      sector: dto.sector,
      customSectorName: dto.customSectorName,
      description: dto.description,
      address: dto.address,
      imageUrl: dto.imageUrl,
      investmentCost: dto.investmentCost,
      openedAt: now,
      acquisitionType: dto.acquisitionType,
      operationalStatus: dto.operationalStatus,
      revenuePerCycle: dto.revenuePerCycle,
      revenueFrequency: dto.revenueFrequency,
      operatingCostPercent: dto.operatingCostPercent,
      staff: [],
      totalStaffSalaryCost: 0,
      totalRevenue: 0,
      totalExpenses: dto.deductFromBalance ? dto.investmentCost : 0,
      revenuePaymentsCount: 0,
      lastRevenueAt: undefined,
      nextRevenueDue: now,
      estimatedMarketValue: 0,
      notes: dto.notes,
      isClosed: dto.operationalStatus === 'bankrupt',
      createdAt: now,
      updatedAt: now,
    };
    business.estimatedMarketValue = computeMarketValue(business);

    if (dto.deductFromBalance && dto.investmentCost > 0) {
      await FinanceService.executeTransaction({
        type: 'WITHDRAWAL',
        category: 'business_purchase',
        amount: dto.investmentCost,
        description: `Abertura/aquisição: ${dto.name}`,
        metadata: { businessId: business.id },
      });
    }

    await db.put('owned_businesses', business);
    return business;
  }

  static async updateBusiness(id: string, updates: Partial<OwnedBusiness>): Promise<OwnedBusiness> {
    const db = await getDatabase();
    const existing = await db.get('owned_businesses', id);
    if (!existing) throw new Error(`Negócio ${id} não encontrado.`);

    const updated: OwnedBusiness = {
      ...existing,
      ...updates,
      id,
      updatedAt: new Date().toISOString(),
    };
    updated.totalStaffSalaryCost = computeStaffTotalCost(updated.staff);
    updated.estimatedMarketValue = computeMarketValue(updated);
    await db.put('owned_businesses', updated);
    return updated;
  }

  static async closeBusiness(businessId: string, notes?: string): Promise<OwnedBusiness> {
    const db = await getDatabase();
    const business = await db.get('owned_businesses', businessId);
    if (!business) throw new Error(`Negócio ${businessId} não encontrado.`);
    const now = new Date().toISOString();
    const updated: OwnedBusiness = {
      ...business,
      operationalStatus: 'bankrupt',
      isClosed: true,
      closedAt: now,
      notes: notes ?? business.notes,
      updatedAt: now,
    };
    await db.put('owned_businesses', updated);
    return updated;
  }

  static async sellBusiness(
    businessId: string,
    salePrice: number
  ): Promise<{ business: OwnedBusiness; transactionId: string }> {
    const db = await getDatabase();
    const business = await db.get('owned_businesses', businessId);
    if (!business) throw new Error(`Negócio ${businessId} não encontrado.`);
    const now = new Date().toISOString();

    const txResult = await FinanceService.executeTransaction({
      type: 'DEPOSIT',
      category: 'business_income',
      amount: salePrice,
      description: `Venda do negócio: ${business.name}`,
      metadata: { businessId, salePrice },
    });

    const updated: OwnedBusiness = {
      ...business,
      operationalStatus: 'bankrupt',
      isClosed: true,
      closedAt: now,
      salePrice,
      soldAt: now,
      estimatedMarketValue: salePrice,
      updatedAt: now,
    };
    await db.put('owned_businesses', updated);
    return { business: updated, transactionId: txResult.transaction.id };
  }

  // ── Staff ───────────────────────────────────────────────────────────────────

  static async addStaff(dto: AddBusinessStaffDTO): Promise<OwnedBusiness> {
    const db = await getDatabase();
    const business = await db.get('owned_businesses', dto.businessId);
    if (!business) throw new Error(`Negócio ${dto.businessId} não encontrado.`);
    const staffMember: BusinessStaff = {
      id: generateId('staff'),
      name: dto.name,
      role: dto.role,
      salary: dto.salary,
      hiredAt: new Date().toISOString(),
    };
    const updatedStaff = [...business.staff, staffMember];
    const updatedBusiness: OwnedBusiness = {
      ...business,
      staff: updatedStaff,
      totalStaffSalaryCost: computeStaffTotalCost(updatedStaff),
      updatedAt: new Date().toISOString(),
    };
    updatedBusiness.estimatedMarketValue = computeMarketValue(updatedBusiness);
    await db.put('owned_businesses', updatedBusiness);
    return updatedBusiness;
  }

  static async removeStaff(businessId: string, staffId: string): Promise<OwnedBusiness> {
    const db = await getDatabase();
    const business = await db.get('owned_businesses', businessId);
    if (!business) throw new Error(`Negócio ${businessId} não encontrado.`);
    const updatedStaff = business.staff.filter((s) => s.id !== staffId);
    const updatedBusiness: OwnedBusiness = {
      ...business,
      staff: updatedStaff,
      totalStaffSalaryCost: computeStaffTotalCost(updatedStaff),
      updatedAt: new Date().toISOString(),
    };
    updatedBusiness.estimatedMarketValue = computeMarketValue(updatedBusiness);
    await db.put('owned_businesses', updatedBusiness);
    return updatedBusiness;
  }

  // ── Despesas ─────────────────────────────────────────────────────────────────

  static async addExpense(dto: AddBusinessExpenseDTO): Promise<{
    expense: BusinessExpenseRecord;
    updatedBusiness: OwnedBusiness;
    transactionId?: string;
  }> {
    const db = await getDatabase();
    const business = await db.get('owned_businesses', dto.businessId);
    if (!business) throw new Error(`Negócio ${dto.businessId} não encontrado.`);
    const now = new Date().toISOString();
    let transactionId: string | undefined;

    if (dto.deductFromBalance && dto.amount > 0) {
      const txResult = await FinanceService.executeTransaction({
        type: 'WITHDRAWAL',
        category: 'business_expense',
        amount: dto.amount,
        description: `Despesa em ${business.name}: ${dto.description}`,
        metadata: { businessId: dto.businessId, category: dto.category },
      });
      transactionId = txResult.transaction.id;
    }

    const expense: BusinessExpenseRecord = {
      id: generateId('bexp'),
      businessId: dto.businessId,
      businessName: business.name,
      category: dto.category,
      description: dto.description,
      amount: dto.amount,
      date: now,
      paidAt: now,
      transactionId,
      notes: dto.notes,
      createdAt: now,
    };

    await db.put('business_expenses', expense);

    const updatedBusiness: OwnedBusiness = {
      ...business,
      totalExpenses: business.totalExpenses + dto.amount,
      updatedAt: now,
    };
    updatedBusiness.estimatedMarketValue = computeMarketValue(updatedBusiness);
    await db.put('owned_businesses', updatedBusiness);

    return { expense, updatedBusiness, transactionId };
  }

  static async getExpensesByBusiness(businessId: string): Promise<BusinessExpenseRecord[]> {
    const db = await getDatabase();
    return db.getAllFromIndex('business_expenses', 'by-businessId', businessId);
  }

  // ── Receitas ─────────────────────────────────────────────────────────────────

  static async getRevenueCyclesByBusiness(businessId: string): Promise<BusinessRevenueCycle[]> {
    const db = await getDatabase();
    return db.getAllFromIndex('business_revenue_cycles', 'by-businessId', businessId);
  }

  static async processRevenuePayments(): Promise<{
    processedCount: number;
    totalNetRevenue: number;
  }> {
    const db = await getDatabase();
    const allBusinesses = await db.getAll('owned_businesses');
    const now = Date.now();
    let processedCount = 0;
    let totalNetRevenue = 0;

    for (const business of allBusinesses) {
      if (business.isClosed || business.operationalStatus === 'bankrupt') continue;
      if (business.operationalStatus === 'closed' || business.operationalStatus === 'under_renovation') continue;

      const cycleDurationMs = REVENUE_FREQ_DURATION_MS[business.revenueFrequency];
      const nextDue = new Date(business.nextRevenueDue).getTime();
      if (now < nextDue) continue;

      let periodStart = business.lastRevenueAt
        ? new Date(business.lastRevenueAt).getTime()
        : new Date(business.openedAt).getTime();

      const opCostFraction = business.operatingCostPercent / 100;
      const staffCostPerCycle = (business.totalStaffSalaryCost || 0) / STAFF_COST_DIVISOR[business.revenueFrequency];

      let cyclesProcessed = 0;
      let cycleNetTotal = 0;
      const MAX_CYCLES = 12;

      while (cyclesProcessed < MAX_CYCLES) {
        const cycleEnd = periodStart + cycleDurationMs;
        if (cycleEnd > now) break;

        const grossRevenue = business.revenuePerCycle;
        const operatingCost = Math.round(grossRevenue * opCostFraction * 100) / 100;
        const staffCost = Math.round(staffCostPerCycle * 100) / 100;
        const netRevenue = Math.max(0, grossRevenue - operatingCost - staffCost);

        const paidAt = new Date(cycleEnd).toISOString();
        const periodIndex = business.revenuePaymentsCount + cyclesProcessed + 1;

        const existingCycles = await db.getAllFromIndex('business_revenue_cycles', 'by-businessId', business.id);
        const alreadyProcessed = existingCycles.some((c) => c.periodIndex === periodIndex);

        if (!alreadyProcessed && netRevenue > 0) {
          const txResult = await FinanceService.executeTransaction({
            type: 'DEPOSIT',
            category: 'business_revenue',
            amount: netRevenue,
            description: `Faturamento de ${business.name} (ciclo #${periodIndex})`,
            metadata: { businessId: business.id, periodIndex, grossRevenue, operatingCost, staffCost },
            customTimestamp: paidAt,
          });

          const cycle: BusinessRevenueCycle = {
            id: generateId('brev'),
            businessId: business.id,
            businessName: business.name,
            periodIndex,
            grossRevenue,
            operatingCost,
            staffCost,
            netRevenue,
            periodStart: new Date(periodStart).toISOString(),
            periodEnd: new Date(cycleEnd).toISOString(),
            paidAt,
            transactionId: txResult.transaction.id,
          };

          await db.put('business_revenue_cycles', cycle);
          processedCount++;
          cycleNetTotal += netRevenue;
        }

        periodStart = cycleEnd;
        cyclesProcessed++;
      }

      if (cyclesProcessed > 0) {
        totalNetRevenue += cycleNetTotal;
        const newLastAt = new Date(periodStart).toISOString();
        const updatedBusiness: OwnedBusiness = {
          ...business,
          lastRevenueAt: newLastAt,
          nextRevenueDue: new Date(periodStart + cycleDurationMs).toISOString(),
          totalRevenue: business.totalRevenue + cycleNetTotal,
          revenuePaymentsCount: business.revenuePaymentsCount + cyclesProcessed,
          updatedAt: new Date().toISOString(),
        };
        updatedBusiness.estimatedMarketValue = computeMarketValue(updatedBusiness);
        await db.put('owned_businesses', updatedBusiness);
      }
    }

    return { processedCount, totalNetRevenue };
  }

  // ── Dashboard ────────────────────────────────────────────────────────────────

  static async getBusinessStats(): Promise<BusinessDashboardStats> {
    const db = await getDatabase();
    const all = await db.getAll('owned_businesses');

    const active = all.filter((b) => !b.isClosed && b.operationalStatus !== 'bankrupt');
    const closed = all.filter((b) => b.isClosed || b.operationalStatus === 'bankrupt');

    const totalInvestment = all.reduce((s, b) => s + b.investmentCost, 0);
    const totalEstimatedValue = active.reduce((s, b) => s + b.estimatedMarketValue, 0);
    const totalRevenue = all.reduce((s, b) => s + b.totalRevenue, 0);
    const totalExpenses = all.reduce((s, b) => s + b.totalExpenses, 0);
    const totalStaff = active.reduce((s, b) => s + b.staff.length, 0);

    const totalMonthlyRevenue = active.reduce((s, b) => {
      const opCost = b.revenuePerCycle * (b.operatingCostPercent / 100);
      const staffCostPerCycle = b.totalStaffSalaryCost / STAFF_COST_DIVISOR[b.revenueFrequency];
      const netPerCycle = Math.max(0, b.revenuePerCycle - opCost - staffCostPerCycle);
      const cyclesPerMonth = b.revenueFrequency === 'daily' ? 30 : b.revenueFrequency === 'weekly' ? 4 : 1;
      return s + netPerCycle * cyclesPerMonth;
    }, 0);

    return {
      totalBusinessesCount: all.length,
      activeBusinessesCount: active.length,
      closedBusinessesCount: closed.length,
      totalInvestment,
      totalEstimatedValue,
      totalRevenue,
      totalExpenses,
      netProfit: totalRevenue - totalExpenses,
      averageMonthlyRevenue: totalMonthlyRevenue,
      totalStaff,
    };
  }
}