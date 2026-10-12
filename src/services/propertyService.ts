import { getDatabase } from './db';
import { FinanceService } from './financeService';
import { billService, calculateDaysOverdue, calculateBillInterest } from './billService';
import type {
  Property,
  PropertyType,
  PropertyStatus,
  PropertyExpenseCategory,
  RentalContract,
  RentalPayment,
  PropertyExpense,
  PropertyDashboardStats,
  Bill,
  JobPaymentFrequency,
  HousingRentalContract,
} from '../types';
import { advanceRentalDueDate } from '../utils/recurrence';

export interface CreatePropertyDTO {
  name: string;
  type: PropertyType;
  customTypeName?: string;
  address?: string;
  description: string;
  imageUrl?: string;
  referenceValue: number;
  purchasePrice?: number;
  condition?: number; // 1 a 5
  acquisitionType: 'bought' | 'registered';
  marketAdjustmentPercent?: number;
  notes?: string;
}

export interface CreateRentalContractDTO {
  propertyId: string;
  tenantName: string;
  rentAmount: number;
  paymentFrequency: JobPaymentFrequency; // 'daily' | 'weekly' | 'monthly'
  startDate: string; // ISO
  endDate?: string;  // ISO
  deposit?: number;  // Caução
  notes?: string;
}

export interface CreateHousingRentalContractDTO {
  propertyName: string;
  address?: string;
  rentAmount: number;
  paymentFrequency: JobPaymentFrequency;
  startDate: string;
  nextPaymentDue?: string;
  notes?: string;
}

export interface CreatePropertyExpenseDTO {
  propertyId: string;
  category: PropertyExpenseCategory;
  description: string;
  amount: number;
  date?: string;
  notes?: string;
  improvedCondition?: boolean;
  newCondition?: number;
}

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  house: 'Casa Residencial',
  apartment: 'Apartamento',
  land: 'Terreno / Lote',
  farm: 'Chácara / Propriedade Rural',
  commercial: 'Imóvel Comercial',
  other: 'Outro Tipo',
};

export const PROPERTY_STATUS_LABELS: Record<PropertyStatus, string> = {
  owned: 'Próprio',
  available_for_rent: 'Disponível para Aluguel',
  rented_out: 'Alugado',
  maintenance: 'Em Manutenção',
  sold: 'Vendido',
};

export const PROPERTY_CONDITION_LABELS: Record<number, string> = {
  1: '1/5 - Péssimo',
  2: '2/5 - Regular',
  3: '3/5 - Bom',
  4: '4/5 - Muito Bom',
  5: '5/5 - Impecável',
};

export const PROPERTY_EXPENSE_CATEGORY_LABELS: Record<PropertyExpenseCategory, string> = {
  repair: 'Reparos Gerais',
  paint: 'Pintura',
  cleaning: 'Limpeza e Conservação',
  renovation: 'Reforma',
  electrical: 'Manutenção Elétrica',
  plumbing: 'Manutenção Hidráulica',
  other: 'Outras Despesas',
};

/**
 * Retorna o multiplicador de mercado baseado no estado de conservação (1 a 5).
 * Base estável: 3 = 100%, 1 = 70%, 5 = 115%.
 */
export function getConditionMultiplier(condition: number): number {
  switch (condition) {
    case 5:
      return 1.15;
    case 4:
      return 1.05;
    case 3:
      return 1.00;
    case 2:
      return 0.85;
    case 1:
      return 0.70;
    default:
      return 1.00;
  }
}

/**
 * Calcula o valor de mercado estimado de forma transparente, não cumulativa e a partir de base estável.
 */
export function calculateEstimatedMarketValue(params: {
  referenceValue: number;
  condition?: number;
  marketAdjustmentPercent?: number;
  manualEstimatedValue?: number;
}): {
  value: number;
  explanation: string;
  conditionMultiplier: number;
  marketPercent: number;
  isManual: boolean;
} {
  const base = Math.max(0, params.referenceValue || 0);

  if (params.manualEstimatedValue != null && params.manualEstimatedValue > 0) {
    return {
      value: Math.round(params.manualEstimatedValue * 100) / 100,
      explanation: 'Definido manualmente pelo usuário.',
      conditionMultiplier: 1,
      marketPercent: 0,
      isManual: true,
    };
  }

  const cond = Math.min(5, Math.max(1, params.condition ?? 3));
  const condMult = getConditionMultiplier(cond);
  const adjPercent = params.marketAdjustmentPercent ?? 0;
  const adjMult = 1 + adjPercent / 100;

  const rawValue = base * condMult * adjMult;
  const finalValue = Math.max(0, Math.round(rawValue * 100) / 100);

  const condText = `Conservação (${cond}/5: ${(condMult * 100).toFixed(0)}%)`;
  const adjText = adjPercent !== 0 ? ` Ajuste de mercado: ${adjPercent > 0 ? '+' : ''}${adjPercent}%` : '';
  const explanation = `Base: R$ ${base.toFixed(2)} × ${condText}${adjText} = R$ ${finalValue.toFixed(2)}`;

  return {
    value: finalValue,
    explanation,
    conditionMultiplier: condMult,
    marketPercent: adjPercent,
    isManual: false,
  };
}

/**
 * Retorna o próximo sábado (23:59:59.999) a partir de uma data de referência.
 * Isso garante que o dia de sábado inteiro fique disponível para pagamento.
 */
export function getNextSaturdayDueDate(referenceDate: Date = new Date()): Date {
  const d = new Date(referenceDate);
  const day = d.getDay(); // 0 = Domingo, ..., 6 = Sábado
  const daysUntilSaturday = (6 - day + 7) % 7;
  
  d.setDate(d.getDate() + daysUntilSaturday);
  d.setHours(23, 59, 59, 999);
  return d;
}

export class PropertyService {
  static async getHousingRentalContracts(): Promise<HousingRentalContract[]> {
    const db = await getDatabase();
    return (await db.getAll('housing_rental_contracts')).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  static async createHousingRentalContract(dto: CreateHousingRentalContractDTO): Promise<HousingRentalContract> {
    if (!dto.propertyName.trim()) throw new Error('Informe o nome ou identificação da moradia.');
    if (!Number.isFinite(dto.rentAmount) || dto.rentAmount <= 0) throw new Error('O aluguel deve ser maior que zero.');
    const start = new Date(dto.startDate);
    if (!Number.isFinite(start.getTime())) throw new Error('Data inicial inválida.');
    const due = dto.nextPaymentDue ? new Date(dto.nextPaymentDue) : advanceRentalDueDate(start, dto.paymentFrequency);
    if (!Number.isFinite(due.getTime()) || due < start) throw new Error('O próximo vencimento deve ser na data inicial ou depois dela.');
    const now = new Date().toISOString();
    const contract: HousingRentalContract = {
      id: `home_rent_${crypto.randomUUID()}`,
      propertyName: dto.propertyName.trim(), address: dto.address?.trim() || undefined,
      rentAmount: Math.round(dto.rentAmount * 100) / 100,
      paymentFrequency: dto.paymentFrequency, startDate: start.toISOString(), nextPaymentDue: due.toISOString(),
      monthlyAnchorDay: dto.paymentFrequency === 'monthly' ? (dto.nextPaymentDue ? due.getUTCDate() : start.getUTCDate()) : undefined,
      status: 'active', periodsGenerated: 0, notes: dto.notes?.trim() || undefined,
      createdAt: now, updatedAt: now,
    };
    const db = await getDatabase();
    await db.add('housing_rental_contracts', contract);
    await this.processHousingRentalBills(new Date());
    return contract;
  }

  static async terminateHousingRentalContract(contractId: string, referenceDate: Date = new Date()): Promise<HousingRentalContract> {
    const db = await getDatabase();
    const contract = await db.get('housing_rental_contracts', contractId);
    if (!contract) throw new Error('Contrato de moradia não encontrado.');
    if (contract.status === 'terminated') return contract;
    const now = referenceDate.toISOString();
    const updated = { ...contract, status: 'terminated' as const, terminatedAt: now, updatedAt: now };
    await db.put('housing_rental_contracts', updated);
    const bills = await db.getAll('bills');
    const terminationTime = new Date(now).getTime();
    for (const bill of bills) {
      if (bill.relatedAssetType === 'housing_contract' && bill.relatedAssetId === contractId && bill.status !== 'paid' && new Date(bill.dueDate).getTime() > terminationTime) {
        await db.delete('bills', bill.id);
      }
    }
    return updated;
  }

  /** Gera obrigações vencidas com IDs determinísticos por contrato e período. */
  static async processHousingRentalBills(referenceDate: Date = new Date()): Promise<number> {
    const db = await getDatabase();
    const contracts = await db.getAll('housing_rental_contracts');
    let created = 0;
    for (const stored of contracts) {
      if (stored.status !== 'active') continue;
      const contract = { ...stored };
      let due = new Date(contract.nextPaymentDue);
      while (Number.isFinite(due.getTime())) {
        const periodIndex = contract.periodsGenerated + 1;
        const billId = `housingrent_${contract.id}_${periodIndex}`;
        const existing = await db.get('bills', billId);
        const isDue = due.getTime() <= referenceDate.getTime();
        const priorPeriodDue = contract.lastBillDueDate ? new Date(contract.lastBillDueDate).getTime() : Number.POSITIVE_INFINITY;
        const mayGenerate = contract.periodsGenerated === 0 || isDue || priorPeriodDue <= referenceDate.getTime();
        if (!existing && !mayGenerate) break;
        if (!existing) {
          await billService.createBill({
            id: billId,
            name: `Aluguel de moradia - ${contract.propertyName}`,
            description: `Período ${periodIndex} • Contrato ${contract.id}${contract.address ? ` • ${contract.address}` : ''}`,
            category: 'housing_rent', amount: contract.rentAmount, dueDate: due.toISOString(), frequency: 'once',
            relatedAssetId: contract.id, relatedAssetType: 'housing_contract',
            dailyInterestRate: 0.10,
          });
          created++;
        }
        contract.periodsGenerated = periodIndex;
        contract.lastBillId = billId;
        contract.lastBillDueDate = due.toISOString();
        const nextDue = advanceRentalDueDate(due, contract.paymentFrequency, contract.monthlyAnchorDay);
        if (nextDue.getTime() <= due.getTime()) throw new Error('A periodicidade não avançou o vencimento.');
        due = nextDue;
        contract.nextPaymentDue = due.toISOString();
        if (!isDue) break;
      }
      if (contract.periodsGenerated !== stored.periodsGenerated) {
        contract.updatedAt = referenceDate.toISOString();
        await db.put('housing_rental_contracts', contract);
      }
    }
    return created;
  }
  /**
   * Lista todos os imóveis cadastrados
   */
  static async getProperties(includeSold: boolean = true): Promise<Property[]> {
    const db = await getDatabase();
    const all = await db.getAll('properties');
    if (includeSold) {
      return all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return all
      .filter((p) => !p.isSold && p.status !== 'sold')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  /**
   * Obtém um imóvel por ID
   */
  static async getPropertyById(id: string): Promise<Property | undefined> {
    const db = await getDatabase();
    return db.get('properties', id);
  }

  /**
   * Cadastra ou compra um imóvel
   */
  static async createProperty(dto: CreatePropertyDTO): Promise<Property> {
    if (!dto.name || dto.name.trim().length < 2) {
      throw new Error('O nome ou identificação do imóvel é obrigatório (mínimo 2 caracteres).');
    }
    if (dto.referenceValue == null || dto.referenceValue <= 0) {
      throw new Error('O valor de referência original deve ser maior que zero.');
    }

    const isPurchase = dto.acquisitionType === 'bought';
    const purchasePrice = isPurchase ? (dto.purchasePrice ?? dto.referenceValue) : 0;

    if (isPurchase && purchasePrice <= 0) {
      throw new Error('Para compra de imóvel, o preço de compra deve ser maior que zero.');
    }

    const db = await getDatabase();
    const now = new Date().toISOString();
    const propertyId = `prop_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const condition = Math.min(5, Math.max(1, dto.condition ?? 3));

    const marketCalc = calculateEstimatedMarketValue({
      referenceValue: dto.referenceValue,
      condition,
      marketAdjustmentPercent: dto.marketAdjustmentPercent ?? 0,
    });

    // Se for compra com débito bancário, executa a transação atômica
    if (isPurchase) {
      await FinanceService.executeTransaction({
        type: 'WITHDRAWAL',
        category: 'property_purchase',
        amount: purchasePrice,
        description: `Compra de Imóvel: ${dto.name.trim()} (${PROPERTY_TYPE_LABELS[dto.type] || dto.type})`,
        metadata: {
          propertyId,
          referenceValue: dto.referenceValue,
          purchasePrice,
          acquisitionType: 'bought',
        },
      });
    }

    const newProperty: Property = {
      id: propertyId,
      name: dto.name.trim(),
      type: dto.type,
      customTypeName: dto.customTypeName?.trim(),
      address: dto.address?.trim(),
      description: dto.description?.trim() || '',
      imageUrl: dto.imageUrl?.trim(),
      referenceValue: Math.round(dto.referenceValue * 100) / 100,
      purchasePrice: Math.round(purchasePrice * 100) / 100,
      purchasedAt: now,
      acquisitionType: dto.acquisitionType,
      condition,
      estimatedMarketValue: marketCalc.value,
      marketAdjustmentPercent: dto.marketAdjustmentPercent ?? 0,
      status: 'owned',
      isSold: false,
      notes: dto.notes?.trim(),
      createdAt: now,
      updatedAt: now,
    };

    await db.put('properties', newProperty);

    // Atualiza contagem na carreira
    try {
      const career = await db.get('career', 'current_career');
      if (career) {
        career.propertiesCount = (career.propertiesCount || 0) + 1;
        career.updatedAt = now;
        await db.put('career', career);
      }
    } catch {
      // no-op
    }

    // Gera automaticamente a primeira conta de IPTU semanal vinculada a este imóvel
    try {
      await this.ensureIPTUBills();
    } catch {
      // no-op
    }

    return newProperty;
  }

  /**
   * Atualiza dados de um imóvel
   */
  static async updateProperty(id: string, updates: Partial<Property>): Promise<Property> {
    const db = await getDatabase();
    const current = await db.get('properties', id);
    if (!current) throw new Error('Imóvel não encontrado.');

    // NUNCA permite alterar o valor de referência original (é a base imutável histórica)
    const safeUpdates = { ...updates };
    delete safeUpdates.referenceValue;
    delete safeUpdates.id;

    // Recalcula valor de mercado se houver alteração de condição ou ajuste
    let estimatedMarketValue = current.estimatedMarketValue;
    if (
      safeUpdates.condition !== undefined ||
      safeUpdates.marketAdjustmentPercent !== undefined ||
      safeUpdates.manualEstimatedValue !== undefined
    ) {
      const calc = calculateEstimatedMarketValue({
        referenceValue: current.referenceValue,
        condition: safeUpdates.condition ?? current.condition,
        marketAdjustmentPercent: safeUpdates.marketAdjustmentPercent ?? current.marketAdjustmentPercent,
        manualEstimatedValue: safeUpdates.manualEstimatedValue ?? current.manualEstimatedValue,
      });
      estimatedMarketValue = calc.value;
    }

    const updated: Property = {
      ...current,
      ...safeUpdates,
      estimatedMarketValue,
      updatedAt: new Date().toISOString(),
    };

    await db.put('properties', updated);
    return updated;
  }

  /**
   * Vende um imóvel
   */
  static async sellProperty(
    propertyId: string,
    salePrice: number
  ): Promise<{ property: Property; transactionId: string }> {
    if (salePrice == null || salePrice <= 0) {
      throw new Error('O valor de venda deve ser maior que zero.');
    }

    const db = await getDatabase();
    const property = await db.get('properties', propertyId);
    if (!property) throw new Error('Imóvel não encontrado.');

    if (property.isSold || property.status === 'sold') {
      throw new Error('Este imóvel já foi vendido anteriormente.');
    }

    const now = new Date().toISOString();

    // Encerra consistentemente contratos de aluguel ativos vinculados a este imóvel
    const allContracts = await db.getAll('rental_contracts');
    const activeContracts = allContracts.filter(
      (c) => c.propertyId === propertyId && c.status === 'active'
    );

    for (const contract of activeContracts) {
      contract.status = 'terminated';
      contract.terminatedAt = now;
      contract.notes = contract.notes
        ? `${contract.notes} (Encerrado devido à venda do imóvel em ${now.slice(0, 10)})`
        : `Encerrado devido à venda do imóvel em ${now.slice(0, 10)}`;
      contract.updatedAt = now;
      await db.put('rental_contracts', contract);
    }

    // Credita o valor da venda no banco pelo serviço financeiro oficial
    const tx = await FinanceService.executeTransaction({
      type: 'DEPOSIT',
      category: 'property_sale',
      amount: salePrice,
      description: `Venda de Imóvel: ${property.name}`,
      metadata: {
        propertyId: property.id,
        salePrice,
        referenceValue: property.referenceValue,
        purchasePrice: property.purchasePrice,
      },
    });

    const updatedProperty: Property = {
      ...property,
      status: 'sold',
      isSold: true,
      soldAt: now,
      salePrice: Math.round(salePrice * 100) / 100,
      updatedAt: now,
    };

    await db.put('properties', updatedProperty);

    // Atualiza contagem na carreira
    try {
      const career = await db.get('career', 'current_career');
      if (career) {
        career.propertiesCount = Math.max(0, (career.propertiesCount || 1) - 1);
        career.updatedAt = now;
        await db.put('career', career);
      }
    } catch {
      // no-op
    }

    return { property: updatedProperty, transactionId: tx.transaction.id };
  }

  /**
   * Cria um contrato de aluguel para uma propriedade
   */
  static async createRentalContract(dto: CreateRentalContractDTO): Promise<RentalContract> {
    if (!dto.tenantName || dto.tenantName.trim().length < 2) {
      throw new Error('O nome do inquilino é obrigatório (mínimo 2 caracteres).');
    }
    if (dto.rentAmount == null || dto.rentAmount <= 0) {
      throw new Error('O valor do aluguel deve ser maior que zero.');
    }
    if (!dto.startDate) {
      throw new Error('A data de início do contrato é obrigatória.');
    }

    const db = await getDatabase();
    const property = await db.get('properties', dto.propertyId);
    if (!property) throw new Error('Imóvel não encontrado.');

    if (property.isSold || property.status === 'sold') {
      throw new Error('Não é possível alugar um imóvel que já foi vendido.');
    }

    if (property.status === 'maintenance') {
      throw new Error('Não é possível alugar um imóvel em manutenção.');
    }

    // Verificar se já existe contrato ativo para esta propriedade
    const allContracts = await db.getAll('rental_contracts');
    const existingActive = allContracts.some(
      (c) => c.propertyId === dto.propertyId && c.status === 'active'
    );
    if (existingActive) {
      throw new Error('Este imóvel já possui um contrato de aluguel ativo.');
    }

    const startObj = new Date(dto.startDate);
    if (isNaN(startObj.getTime())) {
      throw new Error('Data de início do contrato inválida.');
    }

    // Próximo vencimento inicial: startDate + ciclo
    const nextDueObj = new Date(startObj);
    if (dto.paymentFrequency === 'daily') {
      nextDueObj.setDate(nextDueObj.getDate() + 1);
    } else if (dto.paymentFrequency === 'weekly') {
      nextDueObj.setDate(nextDueObj.getDate() + 7);
    } else {
      // monthly
      nextDueObj.setMonth(nextDueObj.getMonth() + 1);
    }

    const now = new Date().toISOString();
    const contractId = `rent_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const deposit = Math.max(0, dto.deposit || 0);

    const contract: RentalContract = {
      id: contractId,
      propertyId: property.id,
      propertyName: property.name,
      tenantName: dto.tenantName.trim(),
      rentAmount: Math.round(dto.rentAmount * 100) / 100,
      paymentFrequency: dto.paymentFrequency,
      startDate: startObj.toISOString(),
      endDate: dto.endDate ? new Date(dto.endDate).toISOString() : undefined,
      status: 'active',
      deposit,
      depositStatus: 'held',
      nextPaymentDue: nextDueObj.toISOString(),
      totalEarned: 0,
      paymentsCount: 0,
      notes: dto.notes?.trim(),
      createdAt: now,
      updatedAt: now,
    };

    await db.put('rental_contracts', contract);

    // Atualiza status do imóvel para 'rented_out'
    property.status = 'rented_out';
    property.updatedAt = now;
    await db.put('properties', property);

    return contract;
  }

  /**
   * Encerra um contrato de aluguel
   */
  static async terminateRentalContract(
    contractId: string,
    notes?: string
  ): Promise<RentalContract> {
    const db = await getDatabase();
    const contract = await db.get('rental_contracts', contractId);
    if (!contract) throw new Error('Contrato de aluguel não encontrado.');

    if (contract.status === 'terminated') {
      throw new Error('Este contrato já está encerrado.');
    }

    const now = new Date().toISOString();
    const updatedContract: RentalContract = {
      ...contract,
      status: 'terminated',
      terminatedAt: now,
      notes: notes ? (contract.notes ? `${contract.notes} | ${notes}` : notes) : contract.notes,
      updatedAt: now,
    };

    await db.put('rental_contracts', updatedContract);

    // Se o imóvel ainda não foi vendido, altera seu status para disponível para aluguel
    const property = await db.get('properties', contract.propertyId);
    if (property && !property.isSold && property.status !== 'sold') {
      property.status = 'available_for_rent';
      property.updatedAt = now;
      await db.put('properties', property);
    }

    return updatedContract;
  }

  /**
   * Processa recebimentos de aluguel de forma recorrente e idempotente baseada em timestamps
   */
  static async processRentalPayments(referenceDate: Date = new Date()): Promise<{
    processedCount: number;
    totalAmount: number;
    payments: RentalPayment[];
  }> {
    const db = await getDatabase();
    const allContracts = await db.getAll('rental_contracts');
    const existingPayments = await db.getAll('rental_payments');
    const properties = await db.getAll('properties');
    const propertyMap = new Map(properties.map((p) => [p.id, p]));

    const processedPayments: RentalPayment[] = [];
    let totalCredited = 0;

    for (const contract of allContracts) {
      if (contract.status !== 'active') continue;

      const prop = propertyMap.get(contract.propertyId);
      // Se o imóvel foi vendido, não gera mais aluguéis
      if (prop && (prop.isSold || prop.status === 'sold')) {
        contract.status = 'terminated';
        contract.terminatedAt = referenceDate.toISOString();
        await db.put('rental_contracts', contract);
        continue;
      }

      let nextDue = new Date(contract.nextPaymentDue);
      let cycleGuard = 0;

      while (referenceDate.getTime() >= nextDue.getTime() && cycleGuard < 100) {
        cycleGuard++;

        // Se houver data de término estipulada e já ultrapassou o fim, encerra o contrato
        if (contract.endDate && nextDue.getTime() > new Date(contract.endDate).getTime()) {
          contract.status = 'terminated';
          contract.terminatedAt = contract.endDate;
          contract.updatedAt = referenceDate.toISOString();
          break;
        }

        const periodIndex = (contract.paymentsCount || 0) + 1;
        const periodStart = contract.lastPaidAt || contract.startDate;
        const periodEnd = nextDue.toISOString();

        // Idempotência: verificar se já existe pagamento para este contractId e periodIndex
        const alreadyPaid = existingPayments.some(
          (p) => p.contractId === contract.id && p.periodIndex === periodIndex
        );

        if (!alreadyPaid) {
          // Credita no banco através do FinanceService oficial
          const txRes = await FinanceService.executeTransaction({
            type: 'DEPOSIT',
            category: 'property_rent',
            amount: contract.rentAmount,
            description: `Renda de Aluguel: ${contract.propertyName} (Inquilino: ${contract.tenantName})`,
            metadata: {
              contractId: contract.id,
              propertyId: contract.propertyId,
              periodIndex,
              periodStart,
              periodEnd,
              paidAt: referenceDate.toISOString(),
            },
            idempotencyKey: `tx_rent_${contract.id}_${periodIndex}`,
          });

          const paymentRecord: RentalPayment = {
            id: `rpay_${contract.id}_${periodIndex}`,
            contractId: contract.id,
            propertyId: contract.propertyId,
            propertyName: contract.propertyName,
            periodIndex,
            amount: contract.rentAmount,
            periodStart,
            periodEnd,
            paidAt: referenceDate.toISOString(),
            transactionId: txRes.transaction.id,
          };

          await db.put('rental_payments', paymentRecord);
          existingPayments.push(paymentRecord);
          processedPayments.push(paymentRecord);
          totalCredited += contract.rentAmount;

          contract.totalEarned = Math.round(((contract.totalEarned || 0) + contract.rentAmount) * 100) / 100;
          contract.paymentsCount = periodIndex;
          contract.lastPaidAt = periodEnd;
        }

        // Avança nextDue para o próximo período
        if (contract.paymentFrequency === 'daily') {
          nextDue.setDate(nextDue.getDate() + 1);
        } else if (contract.paymentFrequency === 'weekly') {
          nextDue.setDate(nextDue.getDate() + 7);
        } else {
          // monthly
          nextDue.setMonth(nextDue.getMonth() + 1);
        }

        contract.nextPaymentDue = nextDue.toISOString();
        contract.updatedAt = referenceDate.toISOString();
      }

      await db.put('rental_contracts', contract);
    }

    return {
      processedCount: processedPayments.length,
      totalAmount: Math.round(totalCredited * 100) / 100,
      payments: processedPayments,
    };
  }

  /**
   * Registra uma despesa ou manutenção em um imóvel com débito bancário
   */
  static async addPropertyExpense(dto: CreatePropertyExpenseDTO): Promise<{
    expense: PropertyExpense;
    transactionId?: string;
    updatedProperty: Property;
  }> {
    if (!dto.description || dto.description.trim().length < 3) {
      throw new Error('A descrição da despesa é obrigatória (mínimo 3 caracteres).');
    }
    if (dto.amount == null || dto.amount < 0) {
      throw new Error('O valor da despesa não pode ser negativo.');
    }

    const db = await getDatabase();
    const property = await db.get('properties', dto.propertyId);
    if (!property) throw new Error('Imóvel não encontrado.');

    const now = new Date().toISOString();
    let transactionId: string | undefined;

    // Se houver valor financeiro, debita no banco pelo serviço financeiro
    if (dto.amount > 0) {
      const txRes = await FinanceService.executeTransaction({
        type: 'WITHDRAWAL',
        category: 'property_maintenance',
        amount: dto.amount,
        description: `Manutenção de Imóvel (${PROPERTY_EXPENSE_CATEGORY_LABELS[dto.category] || dto.category}): ${property.name} - ${dto.description.trim()}`,
        metadata: {
          propertyId: property.id,
          category: dto.category,
        },
      });
      transactionId = txRes.transaction.id;
    }

    // Atualiza estado de conservação se solicitado e confirmado
    let updatedProperty = property;
    if (dto.improvedCondition && dto.newCondition) {
      const targetCondition = Math.min(5, Math.max(1, dto.newCondition));
      const calc = calculateEstimatedMarketValue({
        referenceValue: property.referenceValue,
        condition: targetCondition,
        marketAdjustmentPercent: property.marketAdjustmentPercent,
      });

      updatedProperty = {
        ...property,
        condition: targetCondition,
        estimatedMarketValue: calc.value,
        updatedAt: now,
      };
      await db.put('properties', updatedProperty);
    }

    const expenseRecord: PropertyExpense = {
      id: `pexp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      propertyId: property.id,
      propertyName: property.name,
      category: dto.category,
      description: dto.description.trim(),
      amount: Math.round(dto.amount * 100) / 100,
      date: dto.date || now,
      paidAt: now,
      transactionId,
      improvedCondition: dto.improvedCondition,
      newCondition: dto.newCondition,
      notes: dto.notes?.trim(),
      createdAt: now,
    };

    await db.put('property_expenses', expenseRecord);

    return {
      expense: expenseRecord,
      transactionId,
      updatedProperty,
    };
  }

  /**
   * Garante a criação de contas semanais de IPTU no sistema de contas oficial (billService)
   * Regras:
   * - 10% do valor de referência original
   * - Recorrência semanal
   * - Vencimento no sábado (todo o sábado disponível para pagamento)
   * - 10% de juros compostos diários após vencimento
   * - Idempotente (não cria contas duplicadas para o mesmo período/imóvel)
   */
  static async ensureIPTUBills(referenceDate: Date = new Date()): Promise<Bill[]> {
    const db = await getDatabase();
    const properties = await db.getAll('properties');
    const allBills = await db.getAll('bills');

    const createdBills: Bill[] = [];
    const activeProperties = properties.filter((p) => !p.isSold && p.status !== 'sold');

    for (const prop of activeProperties) {
      const career = await FinanceService.getCareerState();
      // Atualizar apenas o valor das novas obrigações; contas já criadas preservam o histórico.
      if (career.settings?.billSettings?.iptuRatePercent === 25) {
        career.settings.billSettings.iptuRatePercent = 10;
        await db.put('career', career);
      }
      const iptuRate = career.settings?.billSettings?.iptuRatePercent ?? 10;
      const currentValue = prop.manualEstimatedValue ?? prop.estimatedMarketValue ?? prop.referenceValue;
      const iptuAmount = Math.round(currentValue * (iptuRate / 100) * 100) / 100;
      if (iptuAmount <= 0) continue;

      const saturdayDue = getNextSaturdayDueDate(referenceDate);
      const saturdayIso = saturdayDue.toISOString();

      // Verifica se já existe conta de IPTU para este imóvel com este mesmo vencimento de sábado
      const alreadyHasBillForPeriod = allBills.some(
        (b) =>
          b.relatedAssetId === prop.id &&
          b.category === 'property_tax' &&
          new Date(b.dueDate).toDateString() === saturdayDue.toDateString()
      );

      if (!alreadyHasBillForPeriod) {
        const newBill = await billService.createBill({
          name: `IPTU - ${prop.name}`,
          description: `IPTU semanal referente ao imóvel ${prop.name} (${iptuRate}% do valor atual: R$ ${currentValue.toFixed(2)})`,
          category: 'property_tax',
          amount: iptuAmount,
          dueDate: saturdayIso,
          frequency: 'weekly',
          dailyInterestRate: 0.10,
          relatedAssetId: prop.id,
          relatedAssetType: 'property',
        });

        allBills.push(newBill);
        createdBills.push(newBill);
      }
    }

    return createdBills;
  }

  /**
   * Obtém o resumo financeiro individual de uma propriedade
   */
  static async getPropertyFinancialSummary(propertyId: string): Promise<{
    totalRent: number;
    totalMaintenance: number;
    totalIPTUPaid: number;
    otherExpenses: number;
    netProfit: number;
  }> {
    const db = await getDatabase();
    const payments = await db.getAll('rental_payments');
    const expenses = await db.getAll('property_expenses');
    const bills = await db.getAll('bills');

    // Aluguéis recebidos
    const totalRent = payments
      .filter((p) => p.propertyId === propertyId)
      .reduce((acc, p) => acc + p.amount, 0);

    // Despesas de manutenção
    const totalMaintenance = expenses
      .filter((e) => e.propertyId === propertyId)
      .reduce((acc, e) => acc + e.amount, 0);

    // IPTU pago através de contas vinculadas
    let totalIPTUPaid = 0;
    const propertyBills = bills.filter(
      (b) => b.relatedAssetId === propertyId && b.category === 'property_tax'
    );
    for (const bill of propertyBills) {
      if (bill.status === 'paid' && bill.payments) {
        for (const p of bill.payments) {
          totalIPTUPaid += p.amountPaid;
        }
      }
    }

    const netProfit = Math.round((totalRent - totalMaintenance - totalIPTUPaid) * 100) / 100;

    return {
      totalRent: Math.round(totalRent * 100) / 100,
      totalMaintenance: Math.round(totalMaintenance * 100) / 100,
      totalIPTUPaid: Math.round(totalIPTUPaid * 100) / 100,
      otherExpenses: 0,
      netProfit,
    };
  }

  /**
   * Calcula as estatísticas completas para o Dashboard do Módulo de Imóveis
   */
  static async getDashboardStats(): Promise<PropertyDashboardStats> {
    const db = await getDatabase();
    const allProperties = await db.getAll('properties');
    const allBills = await db.getAll('bills');
    const allRentalPayments = await db.getAll('rental_payments');
    const allExpenses = await db.getAll('property_expenses');

    const owned = allProperties.filter((p) => !p.isSold && p.status !== 'sold');
    const totalReferenceValue = owned.reduce((acc, p) => acc + (p.referenceValue || 0), 0);
    const totalEstimatedMarketValue = owned.reduce(
      (acc, p) => acc + (p.estimatedMarketValue || p.referenceValue || 0),
      0
    );

    const rented = owned.filter((p) => p.status === 'rented_out');
    const available = owned.filter((p) => p.status === 'available_for_rent');
    const maintenance = owned.filter((p) => p.status === 'maintenance');
    const sold = allProperties.filter((p) => p.isSold || p.status === 'sold');

    const totalRentalIncome = allRentalPayments.reduce((acc, p) => acc + (p.amount || 0), 0);
    const totalExpenses = allExpenses.reduce((acc, e) => acc + (e.amount || 0), 0);

    // IPTU pendente e vencido
    let pendingIPTUBillsCount = 0;
    let pendingIPTUAmount = 0;
    let overdueIPTUBillsCount = 0;
    let overdueIPTUAmount = 0;

    const now = new Date();
    const iptuBills = allBills.filter((b) => b.category === 'property_tax');

    for (const bill of iptuBills) {
      if (bill.status !== 'paid') {
        const daysOverdue = calculateDaysOverdue(bill.dueDate, now);
        const { totalAmountCents } = calculateBillInterest(
          bill.originalAmountCents,
          bill.dailyInterestRate ?? 0.10,
          daysOverdue
        );
        const currentAmount = totalAmountCents / 100;

        if (daysOverdue >= 1) {
          overdueIPTUBillsCount++;
          overdueIPTUAmount += currentAmount;
        } else {
          pendingIPTUBillsCount++;
          pendingIPTUAmount += currentAmount;
        }
      }
    }

    return {
      totalPropertiesCount: allProperties.length,
      ownedPropertiesCount: owned.length,
      totalReferenceValue: Math.round(totalReferenceValue * 100) / 100,
      totalEstimatedMarketValue: Math.round(totalEstimatedMarketValue * 100) / 100,
      totalRentalIncome: Math.round(totalRentalIncome * 100) / 100,
      totalExpenses: Math.round(totalExpenses * 100) / 100,
      pendingIPTUBillsCount,
      pendingIPTUAmount: Math.round(pendingIPTUAmount * 100) / 100,
      overdueIPTUBillsCount,
      overdueIPTUAmount: Math.round(overdueIPTUAmount * 100) / 100,
      rentedPropertiesCount: rented.length,
      availablePropertiesCount: available.length,
      maintenancePropertiesCount: maintenance.length,
      soldPropertiesCount: sold.length,
    };
  }
}
