import { getDatabase, INITIAL_CAREER_STATE } from './db';
import type {
  CareerState,
  FinancialStats,
  PeriodFilter,
  Transaction,
  TransactionCategory,
  TransactionType,
  TypeFilter,
} from '../types';
import { validateTransactionInput } from '../utils/validators';
import { isWithinPeriod } from '../utils/date';

export interface ExecuteTransactionParams {
  type: TransactionType;
  category: TransactionCategory;
  amount: number;
  description: string;
  metadata?: Record<string, unknown>;
  customTimestamp?: string;
}

export const TRANSACTION_CATEGORY_LABELS: Record<TransactionCategory, string> = {
  // Receitas
  salary: 'Salários e Empregos',
  salary_income: 'Salário CLT',
  rideshare_income: 'Motorista de Aplicativo',
  farm_sale: 'Agricultura e Colheitas',
  property_rent: 'Aluguéis de Imóveis',
  property_sale: 'Venda de Imóveis',
  business_income: 'Renda de Empresas',
  business_revenue: 'Faturamento de Negócios',
  vehicle_sale: 'Venda de Veículos',
  manual_deposit: 'Depósito Manual',
  other_income: 'Outras Receitas',
  // Despesas
  manual_withdrawal: 'Saque / Retirada',
  fuel: 'Combustível',
  maintenance: 'Manutenção de Veículos',
  vehicle_tax: 'IPVA (Veículo)',
  property_tax: 'IPTU (Imóvel)',
  property_expense: 'Contas de Imóvel',
  property_purchase: 'Compra de Imóvel',
  property_maintenance: 'Manutenção de Imóveis',
  farm_expense: 'Custos da Fazenda',
  business_expense: 'Despesas Empresariais',
  business_purchase: 'Abertura/Compra de Negócio',
  business_payroll: 'Folha de Pagamento (Negócio)',
  interest_fine: 'Juros e Multas',
  bill_payment: 'Pagamento de Contas',
  vehicle_purchase: 'Compra de Veículo',
  other: 'Outras Despesas',
};

export interface CategorySummaryItem {
  category: TransactionCategory;
  label: string;
  type: TransactionType;
  totalAmount: number;
  transactionCount: number;
  percentage: number;
}

export interface CategoryBreakdownResult {
  incomes: CategorySummaryItem[];
  expenses: CategorySummaryItem[];
  totalIncomePeriod: number;
  totalExpensePeriod: number;
}

export class FinanceService {
  static sequenceCounter = 0;

  /**
   * Obtém o estado atual da carreira, inicializando se for a primeira execução.
   */
  static async getCareerState(): Promise<CareerState> {
    const db = await getDatabase();
    let career = await db.get('career', 'current_career');
    if (!career) {
      career = {
        ...INITIAL_CAREER_STATE,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await db.put('career', career);
    }
    return career;
  }

  /**
   * Atualiza informações básicas de carreira (ex: nome do piloto)
   */
  static async updateCareerProfile(updates: Partial<Pick<CareerState, 'pilotName'>>): Promise<CareerState> {
    const db = await getDatabase();
    const current = await this.getCareerState();
    const updated: CareerState = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    await db.put('career', updated);
    return updated;
  }

  /**
   * Executa uma movimentação financeira com garantia de consistência transacional e auditoria.
   */
  static async executeTransaction(params: ExecuteTransactionParams): Promise<{
    transaction: Transaction;
    career: CareerState;
  }> {
    const { type, category, amount, description, metadata, customTimestamp } = params;

    const roundedAmount = Math.round(amount * 100) / 100;

    // Pré-validação com o validador central
    const baseValidation = validateTransactionInput(
      roundedAmount,
      description,
      type,
      Number.MAX_SAFE_INTEGER
    );
    if (!baseValidation.isValid) {
      throw new Error(baseValidation.error);
    }

    const db = await getDatabase();

    // Inicia uma transação atômica de leitura e escrita envolvendo ambas as tabelas
    const tx = db.transaction(['career', 'transactions'], 'readwrite');
    // Previne Unhandled Rejection caso a transação seja abortada
    tx.done.catch(() => {});

    const careerStore = tx.objectStore('career');
    const transactionStore = tx.objectStore('transactions');

    let currentCareer = await careerStore.get('current_career');
    if (!currentCareer) {
      currentCareer = { ...INITIAL_CAREER_STATE };
    }

    let newBalance: number;
    let newTotalEarned = currentCareer.totalEarned;
    let newTotalSpent = currentCareer.totalSpent;

    if (type === 'DEPOSIT') {
      newBalance = Math.round((currentCareer.currentBalance + roundedAmount) * 100) / 100;
      newTotalEarned = Math.round((newTotalEarned + roundedAmount) * 100) / 100;
    } else {
      // WITHDRAWAL
      if (roundedAmount > currentCareer.currentBalance) {
        try {
          tx.abort();
        } catch {
          // no-op
        }
        throw new Error(
          `Saldo insuficiente. Valor solicitado excede o saldo disponível de R$ ${currentCareer.currentBalance.toFixed(2)}.`
        );
      }
      newBalance = Math.round((currentCareer.currentBalance - roundedAmount) * 100) / 100;
      newTotalSpent = Math.round((newTotalSpent + roundedAmount) * 100) / 100;
    }

    const nowIso = customTimestamp || new Date().toISOString();
    const epochMs = new Date(nowIso).getTime();
    FinanceService.sequenceCounter++;
    const seqStr = String(FinanceService.sequenceCounter).padStart(6, '0');
    const txId = `tx_${epochMs}_${seqStr}_${Math.random().toString(36).substring(2, 6)}`;

    const newTransaction: Transaction = {
      id: txId,
      type,
      category,
      amount: roundedAmount,
      description: description.trim(),
      balanceAfter: newBalance,
      timestamp: nowIso,
      createdAt: epochMs,
      metadata: metadata || {},
    };

    const updatedCareer: CareerState = {
      ...currentCareer,
      currentBalance: newBalance,
      totalEarned: newTotalEarned,
      totalSpent: newTotalSpent,
      updatedAt: nowIso,
    };

    await Promise.all([
      careerStore.put(updatedCareer),
      transactionStore.add(newTransaction),
      tx.done,
    ]);

    return {
      transaction: newTransaction,
      career: updatedCareer,
    };
  }

  /**
   * Adiciona dinheiro manualmente (depósito)
   */
  static async addMoney(amount: number, description: string): Promise<{
    transaction: Transaction;
    career: CareerState;
  }> {
    return this.executeTransaction({
      type: 'DEPOSIT',
      category: 'manual_deposit',
      amount,
      description,
    });
  }

  /**
   * Retira dinheiro manualmente (saque)
   */
  static async withdrawMoney(amount: number, description: string): Promise<{
    transaction: Transaction;
    career: CareerState;
  }> {
    return this.executeTransaction({
      type: 'WITHDRAWAL',
      category: 'manual_withdrawal',
      amount,
      description,
    });
  }

  /**
   * Lista todas as transações, ordenadas da mais recente para a mais antiga.
   */
  static async getAllTransactions(): Promise<Transaction[]> {
    const db = await getDatabase();
    const all = await db.getAll('transactions');
    return all.sort((a, b) => b.createdAt - a.createdAt || b.id.localeCompare(a.id));
  }

  /**
   * Obtém histórico filtrado por tipo e período de tempo.
   */
  static async getFilteredTransactions(
    typeFilter: TypeFilter = 'all',
    periodFilter: PeriodFilter = 'all'
  ): Promise<Transaction[]> {
    const all = await this.getAllTransactions();

    return all.filter((tx) => {
      if (typeFilter !== 'all' && tx.type !== typeFilter) {
        return false;
      }
      return isWithinPeriod(tx.createdAt, periodFilter);
    });
  }

  /**
   * Registra depósito com categoria configurável
   */
  static async registerDeposit(params: {
    amount: number;
    category?: TransactionCategory;
    description: string;
    metadata?: Record<string, unknown>;
  }): Promise<Transaction> {
    const res = await this.executeTransaction({
      type: 'DEPOSIT',
      category: params.category || 'manual_deposit',
      amount: params.amount,
      description: params.description,
      metadata: params.metadata,
    });
    return res.transaction;
  }

  /**
   * Registra retirada/despesa com categoria configurável
   */
  static async registerWithdrawal(params: {
    amount: number;
    category?: TransactionCategory;
    description: string;
    metadata?: Record<string, unknown>;
  }): Promise<Transaction> {
    const res = await this.executeTransaction({
      type: 'WITHDRAWAL',
      category: params.category || 'manual_withdrawal',
      amount: params.amount,
      description: params.description,
      metadata: params.metadata,
    });
    return res.transaction;
  }

  /**
   * Calcula estatísticas financeiras gerais e do período selecionado.
   */
  static async getFinancialStats(period: PeriodFilter = 'all', referenceTime: number = Date.now()): Promise<FinancialStats> {
    const [career, allTransactions] = await Promise.all([
      this.getCareerState(),
      this.getAllTransactions(),
    ]);

    let periodIncome = 0;
    let periodExpense = 0;
    let totalWithdrawn = 0;
    let hourlyIncome = 0;
    let hourlyExpense = 0;

    const oneHourAgo = referenceTime - 60 * 60 * 1000;

    for (const tx of allTransactions) {
      // Total retirado (saques manuais acumulados de todo o histórico)
      if (tx.type === 'WITHDRAWAL' && tx.category === 'manual_withdrawal') {
        totalWithdrawn += tx.amount;
      }

      // Janela móvel dos últimos 60 minutos
      if (tx.createdAt >= oneHourAgo && tx.createdAt <= referenceTime) {
        if (tx.type === 'DEPOSIT') {
          hourlyIncome += tx.amount;
        } else if (tx.type === 'WITHDRAWAL') {
          hourlyExpense += tx.amount;
        }
      }

      // Período selecionado
      if (isWithinPeriod(tx.createdAt, period, referenceTime)) {
        if (tx.type === 'DEPOSIT') {
          periodIncome += tx.amount;
        } else if (tx.type === 'WITHDRAWAL') {
          periodExpense += tx.amount;
        }
      }
    }

    // Calcula o valor total da frota de veículos ativos na garagem
    const db = await getDatabase();
    let garageValue = 0;
    try {
      const allVehicles = await db.getAll('vehicles');
      const activeVehicles = allVehicles.filter((v) => !v.isSold);
      garageValue = activeVehicles.reduce((acc, v) => acc + (v.marketValue || 0), 0);
    } catch {
      garageValue = 0;
    }

    // Calcula o valor total de contas a pagar pendentes (incluindo juros)
    let pendingBillsTotal = 0;
    try {
      const allBills = await db.getAll('bills');
      for (const bill of allBills) {
        if (bill.status !== 'paid') {
          const dueTime = new Date(bill.dueDate).getTime();
          let interestCents = 0;
          if (referenceTime > dueTime) {
            const daysOverdue = Math.floor((referenceTime - dueTime) / (24 * 60 * 60 * 1000));
            if (daysOverdue >= 1) {
              const rate = bill.dailyInterestRate ?? 0.10;
              const totalCents = Math.round(bill.originalAmountCents * Math.pow(1 + rate, daysOverdue));
              interestCents = Math.max(0, totalCents - bill.originalAmountCents);
            }
          }
          pendingBillsTotal += (bill.originalAmountCents + interestCents) / 100;
        }
      }
    } catch {
      pendingBillsTotal = 0;
    }

    // Patrimônio líquido = Saldo disponível + Valor de mercado dos veículos
    const netWorth = Math.round((career.currentBalance + garageValue) * 100) / 100;

    return {
      currentBalance: career.currentBalance,
      periodIncome: Math.round(periodIncome * 100) / 100,
      periodExpense: Math.round(periodExpense * 100) / 100,
      totalIncome: career.totalEarned,
      totalExpense: career.totalSpent,
      totalWithdrawn: Math.round(totalWithdrawn * 100) / 100,
      hourlyIncome: Math.round(hourlyIncome * 100) / 100,
      hourlyExpense: Math.round(hourlyExpense * 100) / 100,
      pendingBillsTotal: Math.round(pendingBillsTotal * 100) / 100,
      netWorth,
      garageValue: Math.round(garageValue * 100) / 100,
      transactionCount: allTransactions.length,
    };
  }

  /**
   * Agrupa receitas e despesas por categoria no período selecionado
   */
  static async getCategoryBreakdown(
    period: PeriodFilter = 'all',
    referenceTime: number = Date.now()
  ): Promise<CategoryBreakdownResult> {
    const all = await this.getAllTransactions();
    const filtered = all.filter((tx) => isWithinPeriod(tx.createdAt, period, referenceTime));

    const incomeMap = new Map<TransactionCategory, { amount: number; count: number }>();
    const expenseMap = new Map<TransactionCategory, { amount: number; count: number }>();

    let totalIncomePeriod = 0;
    let totalExpensePeriod = 0;

    for (const tx of filtered) {
      if (tx.type === 'DEPOSIT') {
        totalIncomePeriod += tx.amount;
        const cur = incomeMap.get(tx.category) || { amount: 0, count: 0 };
        incomeMap.set(tx.category, {
          amount: cur.amount + tx.amount,
          count: cur.count + 1,
        });
      } else {
        totalExpensePeriod += tx.amount;
        const cur = expenseMap.get(tx.category) || { amount: 0, count: 0 };
        expenseMap.set(tx.category, {
          amount: cur.amount + tx.amount,
          count: cur.count + 1,
        });
      }
    }

    const formatCategoryList = (
      map: Map<TransactionCategory, { amount: number; count: number }>,
      type: TransactionType,
      total: number
    ): CategorySummaryItem[] => {
      const result: CategorySummaryItem[] = [];
      map.forEach((value, cat) => {
        result.push({
          category: cat,
          label: TRANSACTION_CATEGORY_LABELS[cat] || cat,
          type,
          totalAmount: Math.round(value.amount * 100) / 100,
          transactionCount: value.count,
          percentage: total > 0 ? Math.round((value.amount / total) * 1000) / 10 : 0,
        });
      });
      return result.sort((a, b) => b.totalAmount - a.totalAmount);
    };

    return {
      incomes: formatCategoryList(incomeMap, 'DEPOSIT', totalIncomePeriod),
      expenses: formatCategoryList(expenseMap, 'WITHDRAWAL', totalExpensePeriod),
      totalIncomePeriod: Math.round(totalIncomePeriod * 100) / 100,
      totalExpensePeriod: Math.round(totalExpensePeriod * 100) / 100,
    };
  }
}

export const financeService = FinanceService;
