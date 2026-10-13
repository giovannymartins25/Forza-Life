import { getDatabase } from './db';
import { financeService } from './financeService';
import { CreditCardService } from './creditCardService';
import type {
  Bill,
  BillCategory,
  BillFrequency,
  BillStatus,
  BillPaymentRecord,
} from '../types';
import { ASSET_TAX_RATE, calculateAssetTaxCents } from './assetTax';

export interface CreateBillInput {
  name: string;
  id?: string;
  description?: string;
  category: BillCategory;
  amount: number; // Em reais (ex: 150.50)
  dueDate: string; // ISO string ou YYYY-MM-DD
  frequency?: BillFrequency;
  customFrequencyDays?: number;
  dailyInterestRate?: number; // Padrão: 0.10 (10%)
  relatedAssetId?: string;
  relatedAssetType?: 'vehicle' | 'property' | 'farm' | 'business' | 'housing_contract' | 'vehicle_rental';
}

export const BILL_CATEGORY_LABELS: Record<BillCategory, string> = {
  fuel: 'Combustível',
  maintenance: 'Manutenção',
  vehicle_tax: 'IPVA (Veículo)',
  housing_rent: 'Aluguel de Moradia',
  property_tax: 'IPTU (Imóvel)',
  property_expense: 'Contas de Imóvel',
  farm_expense: 'Custos da Fazenda',
  business_expense: 'Despesas Empresariais',
  interest_fine: 'Juros e Multas',
  other: 'Outras Despesas',
};

export const BILL_FREQUENCY_LABELS: Record<BillFrequency, string> = {
  once: 'Pagamento Único',
  weekly: 'Semanal',
  monthly: 'Mensal',
  custom: 'Personalizada',
};

/**
 * Calcula os dias de atraso completos entre a data de vencimento e a data de referência.
 * Retorna 0 se ainda não venceu ou se não completou 24h inteiras de atraso.
 */
export function calculateDaysOverdue(dueDateStr: string, referenceDate: Date = new Date()): number {
  const due = new Date(dueDateStr);
  const now = referenceDate;
  
  const diffMs = now.getTime() - due.getTime();
  if (diffMs <= 0) return 0;
  
  // Dias completos de 24h
  return Math.floor(diffMs / (24 * 60 * 60 * 1000));
}

/**
 * Calcula os juros compostos diários e o total atualizado em centavos:
 * valorAtualizado = valorOriginal * (1 + taxaDiaria) ^ diasDeAtraso
 */
export function calculateBillInterest(
  originalAmountCents: number,
  dailyInterestRate: number,
  daysOverdue: number
): { accruedInterestCents: number; totalAmountCents: number } {
  if (daysOverdue <= 0 || originalAmountCents <= 0) {
    return {
      accruedInterestCents: 0,
      totalAmountCents: originalAmountCents,
    };
  }

  const rate = Math.max(0, dailyInterestRate);
  const multiplier = Math.pow(1 + rate, daysOverdue);
  const totalAmountCents = Math.round(originalAmountCents * multiplier);
  const accruedInterestCents = Math.max(0, totalAmountCents - originalAmountCents);

  return {
    accruedInterestCents,
    totalAmountCents,
  };
}

/**
 * Retorna os valores calculados atuais de uma conta
 */
export function getBillComputedValues(bill: Bill, referenceDate: Date = new Date()) {
  const isPaid = bill.status === 'paid';
  const daysOverdue = isPaid ? 0 : calculateDaysOverdue(bill.dueDate, referenceDate);
  
  const { accruedInterestCents, totalAmountCents } = isPaid
    ? { accruedInterestCents: bill.accruedInterestCents || 0, totalAmountCents: bill.originalAmountCents + (bill.accruedInterestCents || 0) }
    : calculateBillInterest(bill.originalAmountCents, bill.dailyInterestRate ?? 0.10, daysOverdue);

  const status: BillStatus = isPaid
    ? 'paid'
    : daysOverdue >= 1
    ? 'overdue'
    : 'pending';

  return {
    daysOverdue,
    accruedInterestCents,
    totalAmountCents,
    originalAmount: bill.originalAmountCents / 100,
    accruedInterest: accruedInterestCents / 100,
    totalAmount: totalAmountCents / 100,
    status,
  };
}

/**
 * Calcula a próxima data de vencimento com base na frequência
 */
export function getNextDueDate(dueDateStr: string, frequency: BillFrequency, customDays?: number): string {
  const current = new Date(dueDateStr);
  const next = new Date(current);

  switch (frequency) {
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      break;
    case 'custom':
      next.setDate(next.getDate() + (customDays && customDays > 0 ? customDays : 30));
      break;
    case 'once':
    default:
      return dueDateStr;
  }

  return next.toISOString();
}

class BillService {
  /**
   * Cria uma nova conta a pagar
   */
  async createBill(input: CreateBillInput): Promise<Bill> {
    if (!input.name || input.name.trim() === '') {
      throw new Error('O nome da conta é obrigatório.');
    }
    if (input.amount == null || input.amount <= 0) {
      throw new Error('O valor da conta deve ser maior que zero.');
    }
    if (!input.dueDate) {
      throw new Error('A data de vencimento é obrigatória.');
    }

    const dueDateObj = new Date(input.dueDate);
    if (isNaN(dueDateObj.getTime())) {
      throw new Error('Data de vencimento inválida.');
    }

    const originalAmountCents = Math.round(input.amount * 100);
    const dailyInterestRate = input.dailyInterestRate != null ? input.dailyInterestRate : 0.10;
    const frequency = input.frequency || 'once';

    const now = new Date();
    const daysOverdue = calculateDaysOverdue(dueDateObj.toISOString(), now);
    const { accruedInterestCents } = calculateBillInterest(originalAmountCents, dailyInterestRate, daysOverdue);

    const db = await getDatabase();
    if (input.id) {
      const prior = await db.get('bills', input.id);
      if (prior) return prior;
    }
    const bill: Bill = {
      id: input.id || crypto.randomUUID(),
      name: input.name.trim(),
      description: input.description?.trim() || undefined,
      category: input.category,
      originalAmountCents,
      accruedInterestCents,
      createdAt: now.toISOString(),
      dueDate: dueDateObj.toISOString(),
      frequency,
      customFrequencyDays: input.customFrequencyDays,
      status: daysOverdue >= 1 ? 'overdue' : 'pending',
      relatedAssetId: input.relatedAssetId,
      relatedAssetType: input.relatedAssetType,
      payments: [],
      dailyInterestRate,
      lastInterestCalculatedAt: now.toISOString(),
    };

    await db.put('bills', bill);
    return bill;
  }

  /**
   * Obtém todas as contas salvas
   */
  async getAllBills(): Promise<Bill[]> {
    const db = await getDatabase();
    return db.getAll('bills');
  }

  /**
   * Obtém uma conta por ID
   */
  async getBillById(id: string): Promise<Bill | undefined> {
    const db = await getDatabase();
    return db.get('bills', id);
  }

  /**
   * Exclui uma conta
   */
  async deleteBill(id: string): Promise<void> {
    const db = await getDatabase();
    await db.delete('bills', id);
  }

  /**
   * Atualiza uma conta
   */
  async updateBill(id: string, updates: Partial<Bill>): Promise<Bill> {
    const db = await getDatabase();
    const bill = await db.get('bills', id);
    if (!bill) throw new Error('Conta não encontrada.');

    const updated = { ...bill, ...updates };
    await db.put('bills', updated);
    return updated;
  }

  /**
   * Paga uma conta pendente ou vencida
   */
  async payBill(id: string): Promise<{ bill: Bill; transactionId: string }> {
    const db = await getDatabase();
    const bill = await db.get('bills', id);
    if (!bill) {
      throw new Error('Conta não encontrada.');
    }

    if (bill.status === 'paid') {
      throw new Error('Esta conta já foi paga.');
    }

    const now = new Date();
    const computed = getBillComputedValues(bill, now);
    const amountToPay = computed.totalAmount;

    // Verificar saldo
    const career = await db.get('career', 'current_career');
    const currentBalance = career ? career.currentBalance : 0;

    if (currentBalance < amountToPay) {
      throw new Error(
        `Saldo insuficiente para pagar esta conta. Saldo: R$ ${currentBalance.toFixed(2)}, Necessário: R$ ${amountToPay.toFixed(2)}.`
      );
    }

    // Registrar saída financeira no serviço financeiro oficial
    const tx = await financeService.registerWithdrawal({
      amount: amountToPay,
      category: bill.category === 'housing_rent' ? 'housing_rent' : 'bill_payment',
      description: `Pagamento de conta: ${bill.name}`,
      metadata: {
        billId: bill.id,
        billCategory: bill.category,
        originalAmount: computed.originalAmount,
        interestPaid: computed.accruedInterest,
        paidAt: now.toISOString(),
      },
      idempotencyKey: `tx_billpay_${bill.id}`,
    });

    const paymentRecord: BillPaymentRecord = {
      id: crypto.randomUUID(),
      paidAt: now.toISOString(),
      amountPaid: amountToPay,
      originalAmount: computed.originalAmount,
      interestPaid: computed.accruedInterest,
    };

    const updatedBill: Bill = {
      ...bill,
      status: 'paid',
      accruedInterestCents: computed.accruedInterestCents,
      payments: [...(bill.payments || []), paymentRecord],
      lastInterestCalculatedAt: now.toISOString(),
    };

    await db.put('bills', updatedBill);
    return { bill: updatedBill, transactionId: tx.id };
  }

  /** Converts a tax obligation into card installments atomically; the bank balance is untouched. */
  async payBillWithCreditCard(id: string, cardId: string, installmentCount: number, operationId: string) {
    const db = await getDatabase(); const bill = await db.get('bills', id);
    if (!bill) throw new Error('Conta não encontrada.');
    if (bill.category !== 'vehicle_tax' && bill.category !== 'property_tax') throw new Error('Parcelamento no cartão está disponível apenas para IPVA e IPTU.');
    if (!Number.isInteger(installmentCount) || installmentCount < 1 || installmentCount > 12 || !operationId) throw new Error('Selecione de 1 a 12 parcelas.');
    const purchaseKey = `tax-bill:${bill.id}:${operationId}`;
    const previousPurchase = await db.get('credit_card_purchases', `purchase:${purchaseKey}`);
    if (previousPurchase && bill.status === 'paid') return { bill, purchase: previousPurchase };
    if (bill.status === 'paid') throw new Error('Esta conta já foi paga.');
    const now = new Date(); const computed = getBillComputedValues(bill, now);
    const paymentId = `credit-card-tax:${purchaseKey}`;
    const updatedBill: Bill = { ...bill, status: 'paid', accruedInterestCents: computed.accruedInterestCents, payments: [...(bill.payments || []), { id: paymentId, paidAt: now.toISOString(), amountPaid: computed.totalAmount, originalAmount: computed.originalAmount, interestPaid: computed.accruedInterest, paymentMethod: 'credit_card' as const, creditCardPurchaseId: `purchase:${purchaseKey}` }], lastInterestCalculatedAt: now.toISOString() };
    const purchase = await CreditCardService.registerPurchase({
      cardId, description: `${bill.category === 'vehicle_tax' ? 'IPVA' : 'IPTU'} parcelado — ${bill.name}`,
      category: bill.category === 'vehicle_tax' ? 'IPVA' : 'IPTU', amount: computed.totalAmount,
      installmentCount, purchasedAt: now.toISOString(), idempotencyKey: purchaseKey,
      consecutiveDailyInvoices: true, atomicStoreNames: ['bills'],
      atomicSideEffect: async ({ get, put }) => {
        const current = await get('bills', id) as Bill | undefined;
        if (!current || current.status === 'paid') throw new Error('A obrigação foi alterada antes da confirmação. Atualize a tela.');
        if (current.originalAmountCents !== bill.originalAmountCents || current.dueDate !== bill.dueDate || current.accruedInterestCents !== bill.accruedInterestCents) throw new Error('Os juros ou o vencimento da obrigação mudaram durante a confirmação. Revise o valor antes de tentar novamente.');
        await put('bills', updatedBill);
      },
    });
    return { bill: updatedBill, purchase };
  }

  /**
   * Processa todas as contas de forma idempotente:
   * 1. Atualiza status e juros acumulados para contas não pagas
   * 2. Gera a próxima ocorrência para contas recorrentes que já venceram, se ainda não gerada
   */
  async processAllBills(referenceDate: Date = new Date()): Promise<Bill[]> {
    const db = await getDatabase();
    const allBills = await db.getAll('bills');
    const updatedBills: Bill[] = [];
    const newBillsToInsert: Bill[] = [];

    for (const bill of allBills) {
      if (bill.status === 'paid') {
        updatedBills.push(bill);
        continue;
      }

      // Calcular juros e status atualizados
      const computed = getBillComputedValues(bill, referenceDate);
      let hasChanges = false;
      let currentBill = bill;

      if (
        bill.status !== computed.status ||
        bill.accruedInterestCents !== computed.accruedInterestCents
      ) {
        currentBill = {
          ...bill,
          status: computed.status,
          accruedInterestCents: computed.accruedInterestCents,
          lastInterestCalculatedAt: referenceDate.toISOString(),
        };
        hasChanges = true;
      }

      if (hasChanges) {
        await db.put('bills', currentBill);
      }
      updatedBills.push(currentBill);

      // Tratamento de recorrência:
      // Se a conta é recorrente e a data de vencimento já passou/chegou,
      // devemos verificar se a próxima ocorrência já foi gerada.
      if (currentBill.frequency !== 'once') {
        const rootId = currentBill.parentBillId || currentBill.id;
        const nextDueDateStr = getNextDueDate(
          currentBill.dueDate,
          currentBill.frequency,
          currentBill.customFrequencyDays
        );

        const nextDueDate = new Date(nextDueDateStr);
        // Gera apenas se a data de vencimento da nova conta já for <= referenceDate (ou se a conta atual já venceu)
        const currentDueDate = new Date(currentBill.dueDate);
        const shouldGenerateNext = referenceDate.getTime() >= currentDueDate.getTime();

        if (shouldGenerateNext) {
          // Se for conta atrelada a imóvel, verificar se o imóvel ainda existe e não foi vendido
          if (currentBill.relatedAssetType === 'property' && currentBill.relatedAssetId) {
            try {
              const prop = await db.get('properties', currentBill.relatedAssetId);
              if (!prop || prop.isSold || prop.status === 'sold') {
                continue; // Imóvel vendido ou inexistente: não gera novas cobranças
              }
            } catch {
              // no-op
            }
          }
          if (currentBill.relatedAssetType === 'vehicle' && currentBill.relatedAssetId) {
            const vehicle = await db.get('vehicles', currentBill.relatedAssetId);
            if (!vehicle || vehicle.isSold) continue;
          }

          // Verificar se já existe uma conta filha/irmã com essa mesma data de vencimento
          const alreadyExists = allBills.some(
            b =>
              (b.id === rootId || b.parentBillId === rootId) &&
              new Date(b.dueDate).getTime() === nextDueDate.getTime()
          );

          if (!alreadyExists) {
            const nextDaysOverdue = calculateDaysOverdue(nextDueDateStr, referenceDate);
            let nextOriginalAmountCents = currentBill.originalAmountCents;
            let nextDescription = currentBill.description;
            if (currentBill.category === 'vehicle_tax' && currentBill.relatedAssetType === 'vehicle' && currentBill.relatedAssetId) {
              const vehicle = await db.get('vehicles', currentBill.relatedAssetId);
              if (vehicle) {
                nextOriginalAmountCents = calculateAssetTaxCents(vehicle.marketValue);
                nextDescription = `IPVA semanal: ${ASSET_TAX_RATE * 100}% do valor atual do veículo (R$ ${vehicle.marketValue.toFixed(2)}).`;
              }
            } else if (currentBill.category === 'property_tax' && currentBill.relatedAssetType === 'property' && currentBill.relatedAssetId) {
              const property = await db.get('properties', currentBill.relatedAssetId);
              if (property) {
                const currentValue = property.manualEstimatedValue ?? property.estimatedMarketValue ?? property.referenceValue;
                nextOriginalAmountCents = calculateAssetTaxCents(currentValue);
                nextDescription = `IPTU semanal referente ao imóvel ${property.name} (${ASSET_TAX_RATE * 100}% do valor atual: R$ ${currentValue.toFixed(2)})`;
              }
            }
            const nextInterest = calculateBillInterest(
              nextOriginalAmountCents,
              currentBill.dailyInterestRate,
              nextDaysOverdue
            );

            const nextBill: Bill = {
              id: crypto.randomUUID(),
              name: currentBill.name,
              description: nextDescription,
              category: currentBill.category,
              originalAmountCents: nextOriginalAmountCents,
              accruedInterestCents: nextInterest.accruedInterestCents,
              createdAt: referenceDate.toISOString(),
              dueDate: nextDueDateStr,
              frequency: currentBill.frequency,
              customFrequencyDays: currentBill.customFrequencyDays,
              status: nextDaysOverdue >= 1 ? 'overdue' : 'pending',
              relatedAssetId: currentBill.relatedAssetId,
              relatedAssetType: currentBill.relatedAssetType,
              payments: [],
              parentBillId: rootId,
              dailyInterestRate: currentBill.dailyInterestRate,
              lastInterestCalculatedAt: referenceDate.toISOString(),
            };

            newBillsToInsert.push(nextBill);
          }
        }
      }
    }

    // Persistir novas contas geradas por recorrência
    for (const newBill of newBillsToInsert) {
      await db.put('bills', newBill);
      updatedBills.push(newBill);
    }

    return updatedBills;
  }
}

export const billService = new BillService();
