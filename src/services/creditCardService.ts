import { getDatabase } from './db';
import { FinanceService } from './financeService';
import type { CreditCard, CreditCardInvoice, CreditCardPayment, CreditCardPurchase, CreditLimitHistoryEntry } from '../types';

const cents = (value: number) => Math.round((value + Number.EPSILON) * 100);
const money = (value: number) => cents(value) / 100;
const makeId = (prefix: string) => `${prefix}_${crypto.randomUUID()}`;
const dateParts = (value: Date) => ({ year: value.getFullYear(), month: value.getMonth(), day: value.getDate() });
function atDay(year: number, month: number, day: number) {
  return new Date(year, month, Math.min(day, new Date(year, month + 1, 0).getDate()), 12);
}
function invoiceCycle(card: CreditCard, date: Date) {
  let { year, month, day } = dateParts(date);
  if (day > card.closingDay) month++;
  const close = atDay(year, month, card.closingDay);
  const dueMonth = close.getDate() >= card.dueDay ? month + 1 : month;
  const dueYear = year + Math.floor(dueMonth / 12);
  const dueMonthIndex = ((dueMonth % 12) + 12) % 12;
  const due = atDay(dueYear, dueMonthIndex, card.dueDay);
  const key = `${close.getFullYear()}-${String(close.getMonth() + 1).padStart(2, '0')}`;
  return { id: `invoice:${card.id}:${key}`, key, closingDate: close.toISOString(), dueDate: due.toISOString() };
}
function cardCommitment(cardId: string, purchases: CreditCardPurchase[], invoices: CreditCardInvoice[]) {
  const active = purchases.filter(p => p.cardId === cardId && p.status === 'active');
  const installmentCommitment = active.flatMap(p => p.installments).reduce((sum, i) => sum + Math.max(0, cents(i.amount) - cents(i.paidAmount ?? 0)), 0);
  const feeCommitment = invoices.filter(i => i.cardId === cardId).reduce((sum, invoice) => {
    const unpaidPurchases = active.filter(p => invoice.purchaseIds.includes(p.id)).flatMap(p => p.installments.filter(item => item.invoiceId === invoice.id)).reduce((amount, item) => amount + Math.max(0, cents(item.amount) - cents(item.paidAmount ?? 0)), 0);
    return sum + Math.max(0, cents(invoice.totalAmount) - cents(invoice.paidAmount) - unpaidPurchases);
  }, 0);
  return (installmentCommitment + feeCommitment) / 100;
}

export interface CreateCardInput {
  name: string; issuer: string; brand?: string; limit: number; interestRatePercent?: number;
  annualFee?: number; otherFee?: number; closingDay: number; dueDay: number;
  lateFeePercent?: number; dailyLateInterestPercent?: number;
  limitGrowth?: Partial<CreditCard['limitGrowth']>;
}
export interface PurchaseInput { cardId: string; description: string; category?: string; amount: number; installmentCount?: number; interestRatePercent?: number; purchasedAt?: string }

function validateCardInput(input: CreateCardInput) {
  if (!input.name.trim() || !input.issuer.trim()) throw new Error('Informe o nome do cartão e do emissor.');
  if (!Number.isFinite(input.limit) || input.limit <= 0) throw new Error('O limite precisa ser maior que zero.');
  for (const [label, value] of [['juros', input.interestRatePercent ?? 0], ['anuidade', input.annualFee ?? 0], ['tarifa', input.otherFee ?? 0], ['multa', input.lateFeePercent ?? 0], ['juros por atraso', input.dailyLateInterestPercent ?? 0]] as const) {
    if (!Number.isFinite(value) || value < 0 || (label === 'juros' && value > 1000)) throw new Error(`Valor de ${label} inválido.`);
  }
  if (!Number.isInteger(input.closingDay) || input.closingDay < 1 || input.closingDay > 28 || !Number.isInteger(input.dueDay) || input.dueDay < 1 || input.dueDay > 28) throw new Error('Fechamento e vencimento devem ser dias válidos entre 1 e 28.');
  const growth = input.limitGrowth;
  if (growth && (growth.increment !== undefined && growth.increment < 0 || growth.maxLimit !== undefined && growth.maxLimit < input.limit || growth.minOnTimePayments !== undefined && (!Number.isInteger(growth.minOnTimePayments) || growth.minOnTimePayments < 1) || (growth.minAccountAgeDays !== undefined && (!Number.isInteger(growth.minAccountAgeDays) || growth.minAccountAgeDays < 0)) || (growth.maxUtilizationPercent !== undefined && (growth.maxUtilizationPercent < 0 || growth.maxUtilizationPercent > 100)))) throw new Error('Configuração de evolução de limite inválida.');
}

export class CreditCardService {
  static async getCards(): Promise<CreditCard[]> { return (await getDatabase()).getAll('credit_cards'); }
  static async getPurchases(): Promise<CreditCardPurchase[]> { return (await getDatabase()).getAll('credit_card_purchases'); }
  static async getInvoices(): Promise<CreditCardInvoice[]> { await this.processConfiguredFees(); return (await getDatabase()).getAll('credit_card_invoices'); }
  static async getPayments(): Promise<CreditCardPayment[]> { return (await getDatabase()).getAll('credit_card_payments'); }
  static async getLimitHistory(): Promise<CreditLimitHistoryEntry[]> { return (await getDatabase()).getAll('credit_limit_history'); }

  /** Creates configured recurring fees once per invoice cycle; it never debits the bank balance. */
  static async processConfiguredFees(referenceDate = new Date()): Promise<number> {
    const db = await getDatabase(); const tx = db.transaction(['credit_cards', 'credit_card_invoices'], 'readwrite');
    const cards = await tx.objectStore('credit_cards').getAll(); const store = tx.objectStore('credit_card_invoices'); let created = 0;
    for (const card of cards.filter(item => item.status !== 'closed')) {
      const first = new Date(card.createdAt); if (!Number.isFinite(first.getTime())) continue;
      const current = new Date(referenceDate); const cursor = new Date(first.getFullYear(), first.getMonth(), 1, 12); if (first.getDate() > card.closingDay) cursor.setMonth(cursor.getMonth() + 1);
      const end = new Date(current.getFullYear(), current.getMonth(), 1, 12);
      for (; cursor <= end; cursor.setMonth(cursor.getMonth() + 1)) {
        const cycleDate = atDay(cursor.getFullYear(), cursor.getMonth(), card.closingDay); const cycle = invoiceCycle(card, cycleDate);
        let invoice = await store.get(cycle.id);
        const anniversary = new Date(cursor.getFullYear(), first.getMonth(), Math.min(first.getDate(), new Date(cursor.getFullYear(), first.getMonth() + 1, 0).getDate()), 12);
        const anniversaryCycle = invoiceCycle(card, anniversary);
        const annualDue = card.annualFee > 0 && anniversary >= first && referenceDate >= anniversary && cycle.key === anniversaryCycle.key;
        if (!invoice && card.otherFee <= 0 && !annualDue) continue;
        let changed = false;
        if (!invoice) { invoice = { id: cycle.id, cardId: card.id, cycleKey: cycle.key, closingDate: cycle.closingDate, dueDate: cycle.dueDate, purchaseIds: [], totalAmount: 0, paidAmount: 0, status: referenceDate > new Date(cycle.closingDate) ? 'closed' : 'open', feeKeys: [] }; changed = true; }
        const monthlyKey = `other:${cycle.key}`;
        if (card.otherFee > 0 && !invoice.feeKeys.includes(monthlyKey)) { invoice.totalAmount = (cents(invoice.totalAmount) + cents(card.otherFee)) / 100; invoice.feeKeys.push(monthlyKey); created++; changed = true; }
        const anniversaryKey = `annual:${cycle.key}`;
        if (annualDue && !invoice.feeKeys.includes(anniversaryKey)) {
          invoice.totalAmount = (cents(invoice.totalAmount) + cents(card.annualFee)) / 100; invoice.feeKeys.push(anniversaryKey); created++; changed = true;
        }
        const dueDate = new Date(invoice.dueDate); dueDate.setHours(12, 0, 0, 0); dueDate.setDate(dueDate.getDate() + 1);
        for (const lateDay = new Date(dueDate); lateDay <= referenceDate; lateDay.setDate(lateDay.getDate() + 1)) {
          const outstanding = cents(invoice.totalAmount) - cents(invoice.paidAmount);
          if (outstanding <= 0) break;
          const dateKey = `${lateDay.getFullYear()}-${String(lateDay.getMonth() + 1).padStart(2, '0')}-${String(lateDay.getDate()).padStart(2, '0')}`;
          const penaltyKey = `late-penalty:${cycle.key}`; const interestKey = `late-interest:${dateKey}`;
          if (lateDay.getTime() === dueDate.getTime() && card.lateFeePercent > 0 && !invoice.feeKeys.includes(penaltyKey)) {
            invoice.totalAmount = (cents(invoice.totalAmount) + Math.round(outstanding * card.lateFeePercent / 100)) / 100; invoice.feeKeys.push(penaltyKey); created++; changed = true;
          }
          const balanceAfterPenalty = cents(invoice.totalAmount) - cents(invoice.paidAmount);
          if (card.dailyLateInterestPercent > 0 && !invoice.feeKeys.includes(interestKey)) {
            invoice.totalAmount = (cents(invoice.totalAmount) + Math.round(balanceAfterPenalty * card.dailyLateInterestPercent / 100)) / 100; invoice.feeKeys.push(interestKey); created++; changed = true;
          }
        }
        const nextStatus: CreditCardInvoice['status'] = invoice.totalAmount > 0 && invoice.paidAmount >= invoice.totalAmount ? 'paid' : invoice.paidAmount > 0 ? 'partially_paid' : referenceDate > new Date(invoice.dueDate) ? 'overdue' : referenceDate > new Date(invoice.closingDate) ? 'closed' : 'open';
        if (invoice.status !== nextStatus) { invoice.status = nextStatus; changed = true; }
        if (changed) await store.put(invoice);
      }
    }
    await tx.done; return created;
  }

  static async getCommitted(cardId: string) {
    const [purchases, invoices] = await Promise.all([this.getPurchases(), this.getInvoices()]);
    return money(cardCommitment(cardId, purchases, invoices));
  }
  static async getAvailableLimit(card: CreditCard) { return money(Math.max(0, cents(card.limit) - cents(await this.getCommitted(card.id))) / 100); }

  static async createCard(input: CreateCardInput): Promise<CreditCard> {
    validateCardInput(input);
    const card: CreditCard = { id: makeId('card'), name: input.name.trim(), issuer: input.issuer.trim(), brand: input.brand?.trim() || 'Horizon', limit: money(input.limit), interestRatePercent: input.interestRatePercent ?? 0, annualFee: money(input.annualFee ?? 0), otherFee: money(input.otherFee ?? 0), lateFeePercent: input.lateFeePercent ?? 0, dailyLateInterestPercent: input.dailyLateInterestPercent ?? 0, closingDay: input.closingDay, dueDay: input.dueDay, status: 'active', createdAt: new Date().toISOString(), limitGrowth: { enabled: false, increment: 100, maxLimit: money(input.limit), minOnTimePayments: 3, minAccountAgeDays: 0, maxUtilizationPercent: 100, requireNoLatePayments: true, ...input.limitGrowth } };
    await (await getDatabase()).add('credit_cards', card);
    return card;
  }
  static async updateCard(id: string, updates: Partial<CreateCardInput>): Promise<CreditCard> {
    const db = await getDatabase(); const tx = db.transaction(['credit_cards', 'credit_card_purchases', 'credit_card_invoices', 'credit_limit_history'], 'readwrite');
    const store = tx.objectStore('credit_cards'); const current = await store.get(id); if (!current) throw new Error('Cartão não encontrado.');
    const next: CreditCard = { ...current, ...updates, limitGrowth: { ...current.limitGrowth, ...updates.limitGrowth }, name: updates.name?.trim() ?? current.name, issuer: updates.issuer?.trim() ?? current.issuer };
    validateCardInput({ ...next, limitGrowth: next.limitGrowth });
    const [existingPurchases, existingInvoices] = await Promise.all([tx.objectStore('credit_card_purchases').getAll(), tx.objectStore('credit_card_invoices').getAll()]);
    if (cents(next.limit) < cents(cardCommitment(id, existingPurchases, existingInvoices))) throw new Error('O novo limite não pode ficar abaixo das compras e tarifas comprometidas.');
    if (cents(next.limit) !== cents(current.limit)) {
      const history: CreditLimitHistoryEntry = { id: makeId('limit'), cardId: id, reason: 'Ajuste manual', previousLimit: current.limit, newLimit: money(next.limit), changedAt: new Date().toISOString() };
      await tx.objectStore('credit_limit_history').add(history);
    }
    await store.put(next); await tx.done; return next;
  }
  static async setStatus(id: string, status: CreditCard['status']) {
    const db = await getDatabase(); const tx = db.transaction(['credit_cards', 'credit_card_purchases', 'credit_card_invoices'], 'readwrite');
    const card = await tx.objectStore('credit_cards').get(id); if (!card) throw new Error('Cartão não encontrado.');
    if (status === 'closed') {
      const outstanding = (await tx.objectStore('credit_card_purchases').getAll()).filter(p => p.cardId === id && p.status === 'active').some(p => p.installments.some(i => !i.paid));
      const openInvoice = (await tx.objectStore('credit_card_invoices').getAll()).some(invoice => invoice.cardId === id && cents(invoice.totalAmount) > cents(invoice.paidAmount));
      if (outstanding || openInvoice) throw new Error('Quite as compras e faturas pendentes antes de encerrar o cartão.');
    }
    card.status = status; await tx.objectStore('credit_cards').put(card); await tx.done; return card;
  }

  static async registerPurchase(input: PurchaseInput): Promise<CreditCardPurchase> {
    const count = input.installmentCount ?? 1; const rateInput = input.interestRatePercent;
    if (!input.description.trim() || !Number.isFinite(input.amount) || input.amount <= 0 || !Number.isInteger(count) || count < 1 || count > 60 || (rateInput !== undefined && (!Number.isFinite(rateInput) || rateInput < 0 || rateInput > 1000))) throw new Error('Confira descrição, valor, parcelas e juros da compra.');
    const db = await getDatabase(); const tx = db.transaction(['credit_cards', 'credit_card_purchases', 'credit_card_invoices'], 'readwrite');
    const cardStore = tx.objectStore('credit_cards'); const card = await cardStore.get(input.cardId);
    if (!card || card.status !== 'active') throw new Error('O cartão precisa estar ativo para autorizar uma compra.');
    const purchasesStore = tx.objectStore('credit_card_purchases'); const [existing, existingInvoices] = await Promise.all([purchasesStore.getAll(), tx.objectStore('credit_card_invoices').getAll()]);
    const committed = cents(cardCommitment(card.id, existing, existingInvoices));
    const rate = rateInput ?? card.interestRatePercent;
    const principal = cents(input.amount); const total = cents(input.amount * (1 + rate / 100));
    if (total <= 0 || committed + total > cents(card.limit)) throw new Error('Limite disponível insuficiente para o valor total comprometido.');
    const start = new Date(input.purchasedAt ?? new Date().toISOString()); if (!Number.isFinite(start.getTime())) throw new Error('Data da compra inválida.');
    const base = Math.floor(total / count); const remainder = total - base * count; const installments: CreditCardPurchase['installments'] = []; const invoicesStore = tx.objectStore('credit_card_invoices');
    for (let n = 0; n < count; n++) {
      const d = new Date(start); const dayOfPurchase = d.getDate(); d.setDate(1); d.setMonth(d.getMonth() + n); d.setDate(Math.min(dayOfPurchase, new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate())); const cycle = invoiceCycle(card, d); const amount = base + (n === count - 1 ? remainder : 0);
      let invoice = await invoicesStore.get(cycle.id);
      if (!invoice) invoice = { id: cycle.id, cardId: card.id, cycleKey: cycle.key, closingDate: cycle.closingDate, dueDate: cycle.dueDate, purchaseIds: [], totalAmount: 0, paidAmount: 0, status: new Date() > new Date(cycle.closingDate) ? 'closed' : 'open', feeKeys: [] };
      invoice.purchaseIds = [...new Set([...invoice.purchaseIds, `purchase:${card.id}`])];
      invoice.totalAmount = (cents(invoice.totalAmount) + amount) / 100;
      await invoicesStore.put(invoice);
      installments.push({ id: makeId('installment'), number: n + 1, amount: amount / 100, invoiceId: cycle.id, paid: false, paidAmount: 0 });
    }
    const purchase: CreditCardPurchase = { id: makeId('purchase'), cardId: card.id, description: input.description.trim(), category: input.category?.trim() || 'outros', purchasedAt: start.toISOString(), principalAmount: principal / 100, interestAmount: (total - principal) / 100, totalAmount: total / 100, installmentCount: count, installments, status: 'active' };
    for (const installment of installments) { const invoice = await invoicesStore.get(installment.invoiceId); invoice!.purchaseIds = invoice!.purchaseIds.filter(id => id !== `purchase:${card.id}`); invoice!.purchaseIds.push(purchase.id); await invoicesStore.put(invoice!); }
    await purchasesStore.add(purchase); await tx.done; return purchase;
  }

  static async payInvoice(invoiceId: string, amount: number, operationId = makeId('cardpay')): Promise<CreditCardPayment> {
    if (!Number.isFinite(amount) || amount <= 0) throw new Error('Informe um valor de pagamento válido.');
    const db = await getDatabase();
    const existingPayment = await db.get('credit_card_payments', operationId);
    if (existingPayment) return existingPayment;
    const invoiceSnapshot = await db.get('credit_card_invoices', invoiceId);
    if (!invoiceSnapshot) throw new Error('Fatura não encontrada.');
    const amountCents = cents(amount);
    if (amountCents > cents(invoiceSnapshot.totalAmount) - cents(invoiceSnapshot.paidAmount)) throw new Error('Pagamento supera o saldo da fatura.');

    await FinanceService.executeTransaction({
      type: 'WITHDRAWAL', category: 'credit_card_payment', amount: amountCents / 100,
      description: `Pagamento fatura — ${invoiceSnapshot.cycleKey}`,
      metadata: { cardId: invoiceSnapshot.cardId, invoiceId, idempotencyKey: operationId },
      idempotencyKey: operationId,
      additionalStoreNames: ['credit_cards', 'credit_card_purchases', 'credit_card_invoices', 'credit_card_payments', 'credit_limit_history'],
      atomicSideEffect: async (tx, financial) => {
        const invoiceStore = tx.objectStore('credit_card_invoices'); const invoice = await invoiceStore.get(invoiceId);
        if (!invoice) throw new Error('Fatura não encontrada.');
        if (amountCents > cents(invoice.totalAmount) - cents(invoice.paidAmount)) throw new Error('A fatura foi alterada antes da confirmação do pagamento.');
        const paymentStore = tx.objectStore('credit_card_payments');
        if (await paymentStore.get(operationId)) throw new Error('Este pagamento já foi processado.');
        const previousInvoices = await invoiceStore.getAll();
        const purchaseStore = tx.objectStore('credit_card_purchases'); const previousPurchases = await purchaseStore.getAll();
        const previousPayments = await paymentStore.getAll();
        const at = financial.timestamp;
        const payment: CreditCardPayment = { id: operationId, invoiceId, cardId: invoice.cardId, amount: amountCents / 100, paidAt: at, transactionId: financial.id };
        invoice.paidAmount = (cents(invoice.paidAmount) + amountCents) / 100;
        invoice.status = invoice.paidAmount >= invoice.totalAmount ? 'paid' : 'partially_paid';
        await paymentStore.add(payment);

        let remainingPayment = amountCents;
        for (const purchase of previousPurchases.filter(p => p.cardId === invoice.cardId && p.status === 'active')) {
          for (const installment of purchase.installments) {
            if (installment.invoiceId === invoice.id && !installment.paid && remainingPayment > 0) {
              const amountDue = Math.max(0, cents(installment.amount) - cents(installment.paidAmount ?? 0));
              const applied = Math.min(amountDue, remainingPayment);
              installment.paidAmount = (cents(installment.paidAmount ?? 0) + applied) / 100;
              installment.paid = cents(installment.paidAmount) >= cents(installment.amount);
              remainingPayment -= applied;
            }
          }
          await purchaseStore.put(purchase);
        }
        const cards = tx.objectStore('credit_cards'); const card = await cards.get(invoice.cardId);
        if (invoice.status === 'paid' && card?.limitGrowth.enabled && new Date(at) <= new Date(invoice.dueDate)) {
          const historyStore = tx.objectStore('credit_limit_history'); const history = await historyStore.getAll();
          const eligibleCount = previousInvoices.filter(item => item.cardId === card.id && item.id !== invoice.id && item.status === 'paid' && previousPayments.some(p => p.invoiceId === item.id) && previousPayments.filter(p => p.invoiceId === item.id).every(p => new Date(p.paidAt) <= new Date(item.dueDate))).length + 1;
          const ageDays = (new Date(at).getTime() - new Date(card.createdAt).getTime()) / 86_400_000;
          const utilizationPercent = card.limit > 0 ? cardCommitment(card.id, previousPurchases, previousInvoices) / card.limit * 100 : 100;
          const hadLatePayment = previousPayments.some(p => { const pastInvoice = previousInvoices.find(item => item.id === p.invoiceId); return pastInvoice?.cardId === card.id && new Date(p.paidAt) > new Date(pastInvoice.dueDate); });
          const hasOverdueBill = previousInvoices.some(item => item.cardId === card.id && new Date(at) > new Date(item.dueDate) && item.paidAmount < item.totalAmount);
          const criteriaPass = ageDays >= (card.limitGrowth.minAccountAgeDays ?? 0) && utilizationPercent <= (card.limitGrowth.maxUtilizationPercent ?? 100) && (!(card.limitGrowth.requireNoLatePayments ?? true) || (!hadLatePayment && !hasOverdueBill));
          if (criteriaPass && eligibleCount % card.limitGrowth.minOnTimePayments === 0 && !history.some(h => h.invoiceId === invoice.id)) {
            const nextLimit = Math.min(cents(card.limitGrowth.maxLimit), cents(card.limit) + cents(card.limitGrowth.increment)) / 100;
            if (nextLimit > card.limit) {
              const entry: CreditLimitHistoryEntry = { id: `limit-growth:${invoice.id}`, cardId: card.id, reason: 'Pagamento pontual de fatura', previousLimit: card.limit, newLimit: nextLimit, changedAt: at, invoiceId: invoice.id };
              card.limit = nextLimit; await cards.put(card); await historyStore.add(entry);
            }
          }
        }
        await invoiceStore.put(invoice);
      },
    });
    const payment = await db.get('credit_card_payments', operationId);
    if (!payment) throw new Error('O lançamento financeiro foi concluído sem confirmar o pagamento da fatura.');
    return payment;
  }

  static async cancelPurchase(purchaseId: string) {
    const db = await getDatabase(); const existing = await db.get('credit_card_purchases', purchaseId);
    if (!existing) throw new Error('Compra não encontrada.');
    if (existing.status !== 'active') return existing;
    const refundCents = existing.installments.reduce((sum, installment) => sum + cents(installment.paidAmount ?? (installment.paid ? installment.amount : 0)), 0);
    const applyCancellation = async (store: { get(id: string): Promise<CreditCardPurchase | undefined>; put(value: CreditCardPurchase): Promise<unknown> }, invoiceStore: { get(id: string): Promise<CreditCardInvoice | undefined>; put(value: CreditCardInvoice): Promise<unknown> }, purchase: CreditCardPurchase) => {
      for (const installment of purchase.installments) {
        const invoice = await invoiceStore.get(installment.invoiceId); if (!invoice) continue;
        const paid = cents(installment.paidAmount ?? (installment.paid ? installment.amount : 0));
        const unpaid = Math.max(0, cents(installment.amount) - paid);
        if (unpaid > 0) invoice.totalAmount = Math.max(0, cents(invoice.totalAmount) - unpaid) / 100;
        invoice.purchaseIds = invoice.purchaseIds.filter(id => id !== purchaseId);
        if (invoice.paidAmount >= invoice.totalAmount) invoice.status = 'paid';
        await invoiceStore.put(invoice);
      }
      purchase.status = refundCents > 0 ? 'refunded' : 'cancelled'; purchase.cancelledAt = new Date().toISOString();
      await store.put(purchase);
    };

    if (refundCents > 0) {
      const operationId = `card-refund:${purchaseId}`;
      await FinanceService.executeTransaction({
        type: 'DEPOSIT', category: 'credit_card_refund', amount: refundCents / 100,
        description: `Estorno — ${existing.description}`, metadata: { purchaseId }, idempotencyKey: operationId,
        additionalStoreNames: ['credit_card_purchases', 'credit_card_invoices'],
        atomicSideEffect: async tx => {
          const store = tx.objectStore('credit_card_purchases'); const purchase = await store.get(purchaseId);
          if (!purchase || purchase.status !== 'active') throw new Error('A compra mudou antes da confirmação do estorno.');
          const currentRefund = purchase.installments.reduce((sum, installment) => sum + cents(installment.paidAmount ?? (installment.paid ? installment.amount : 0)), 0);
          if (currentRefund !== refundCents) throw new Error('Os pagamentos da compra mudaram; atualize e tente o estorno novamente.');
          await applyCancellation(store, tx.objectStore('credit_card_invoices'), purchase);
        },
      });
      const cancelled = await db.get('credit_card_purchases', purchaseId);
      if (!cancelled || cancelled.status === 'active') throw new Error('O estorno financeiro foi concluído sem encerrar a compra.');
      return cancelled;
    }

    const tx = db.transaction(['credit_card_purchases', 'credit_card_invoices'], 'readwrite');
    const store = tx.objectStore('credit_card_purchases'); const purchase = await store.get(purchaseId);
    if (!purchase) throw new Error('Compra não encontrada.');
    if (purchase.status !== 'active') { await tx.done; return purchase; }
    await applyCancellation(store, tx.objectStore('credit_card_invoices'), purchase);
    await tx.done; return purchase;
  }
}
