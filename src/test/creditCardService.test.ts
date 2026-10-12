import { beforeEach, describe, expect, it } from 'vitest';
import { BackupService } from '../services/backupService';
import { CreditCardService } from '../services/creditCardService';
import { FinanceService } from '../services/financeService';
import { getDatabase, resetDBConnection } from '../services/db';

const input = { name: 'Horizon Platinum', issuer: 'Banco Horizon', brand: 'Visa', limit: 1000, interestRatePercent: 0, annualFee: 0, otherFee: 0, closingDay: 1, dueDay: 28, limitGrowth: { enabled: true, increment: 100, maxLimit: 1500, minOnTimePayments: 1 } };

describe('CreditCardService', () => {
  beforeEach(async () => { resetDBConnection(); await BackupService.resetCareer(); });

  it('creates, edits, blocks, unlocks and safely closes a card', async () => {
    const card = await CreditCardService.createCard(input);
    const edited = await CreditCardService.updateCard(card.id, { name: 'Horizon Black', limit: 1200, limitGrowth: { enabled: true, increment: 100, maxLimit: 1500, minOnTimePayments: 1 } });
    expect(edited.name).toBe('Horizon Black'); expect(edited.limit).toBe(1200);
    expect((await CreditCardService.setStatus(card.id, 'blocked')).status).toBe('blocked');
    expect((await CreditCardService.setStatus(card.id, 'active')).status).toBe('active');
    expect((await CreditCardService.setStatus(card.id, 'closed')).status).toBe('closed');
    await expect(CreditCardService.createCard({ ...input, limit: -1 })).rejects.toThrow(/limite/i);
  });

  it('registers à vista/parcelada with cent precision and configured interest without debiting bank', async () => {
    await FinanceService.addMoney(2000, 'Saldo para testes');
    const card = await CreditCardService.createCard({ ...input, interestRatePercent: 10 });
    const before = (await FinanceService.getCareerState()).currentBalance;
    const purchase = await CreditCardService.registerPurchase({ cardId: card.id, description: 'Notebook', category: 'Eletrônicos', amount: 500, installmentCount: 2, purchasedAt: new Date().toISOString() });
    expect(purchase.totalAmount).toBe(550); expect(purchase.installments.map(item => item.amount)).toEqual([275, 275]);
    expect(purchase.installments.reduce((sum, item) => sum + item.amount, 0)).toBe(purchase.totalAmount);
    expect(await CreditCardService.getCommitted(card.id)).toBe(550);
    expect((await FinanceService.getCareerState()).currentBalance).toBe(before);
    await expect(CreditCardService.registerPurchase({ cardId: card.id, description: 'Acima do limite', amount: 500, installmentCount: 1 })).rejects.toThrow(/limite/i);
  });

  it('pays fully or partially from bank once and grows limit once after an on-time invoice payoff', async () => {
    await FinanceService.addMoney(1000, 'Saldo de teste');
    const card = await CreditCardService.createCard(input);
    const purchase = await CreditCardService.registerPurchase({ cardId: card.id, description: 'Peças', category: 'Auto', amount: 250, installmentCount: 1, purchasedAt: new Date().toISOString() });
    const invoiceId = purchase.installments[0].invoiceId;
    await CreditCardService.payInvoice(invoiceId, 100, 'partial-operation');
    await CreditCardService.payInvoice(invoiceId, 100, 'partial-operation');
    expect((await FinanceService.getCareerState()).currentBalance).toBe(900);
    const invoice = (await CreditCardService.getInvoices()).find(item => item.id === invoiceId)!;
    expect(invoice.paidAmount).toBe(100); expect(invoice.status).toBe('partially_paid');
    await CreditCardService.payInvoice(invoiceId, 150, 'finish-operation');
    expect((await FinanceService.getCareerState()).currentBalance).toBe(750);
    expect((await CreditCardService.getCards())[0].limit).toBe(1100);
    expect((await CreditCardService.getLimitHistory()).filter(item => item.invoiceId === invoiceId)).toHaveLength(1);
    expect((await FinanceService.getAllTransactions()).filter(item => item.category === 'credit_card_payment')).toHaveLength(2);
    await expect(CreditCardService.payInvoice(invoiceId, 1, 'overpay-operation')).rejects.toThrow(/fatura/i);
  });

  it('rejects payments without bank funds and prevents card close while commitments remain', async () => {
    const card = await CreditCardService.createCard(input);
    const purchase = await CreditCardService.registerPurchase({ cardId: card.id, description: 'Capa', amount: 30, purchasedAt: new Date().toISOString() });
    await expect(CreditCardService.setStatus(card.id, 'closed')).rejects.toThrow(/Quite/i);
    await expect(CreditCardService.payInvoice(purchase.installments[0].invoiceId, 30)).rejects.toThrow(/insuficiente/i);
    await CreditCardService.setStatus(card.id, 'blocked');
    await expect(CreditCardService.registerPurchase({ cardId: card.id, description: 'Bloqueado', amount: 10 })).rejects.toThrow(/ativo/i);
  });

  it('cancels an unpaid purchase to release the limit and refunds already paid installments idempotently', async () => {
    await FinanceService.addMoney(500, 'Saldo de teste');
    const card = await CreditCardService.createCard(input);
    const purchase = await CreditCardService.registerPurchase({ cardId: card.id, description: 'Compra cancelável', amount: 100, installmentCount: 1, purchasedAt: new Date().toISOString() });
    await CreditCardService.cancelPurchase(purchase.id);
    expect(await CreditCardService.getCommitted(card.id)).toBe(0);
    const paid = await CreditCardService.registerPurchase({ cardId: card.id, description: 'Compra estornada', amount: 75, installmentCount: 1, purchasedAt: new Date().toISOString() });
    const invoiceId = paid.installments[0].invoiceId;
    await CreditCardService.payInvoice(invoiceId, 75, 'pay-before-refund');
    await CreditCardService.cancelPurchase(paid.id);
    await CreditCardService.cancelPurchase(paid.id).catch(() => undefined);
    expect((await FinanceService.getCareerState()).currentBalance).toBe(500);
    expect((await FinanceService.getAllTransactions()).filter(item => item.category === 'credit_card_refund')).toHaveLength(1);
  });

  it('creates configured fee cycles idempotently and keeps the debit for invoice payment', async () => {
    const card = await CreditCardService.createCard({ ...input, otherFee: 12, annualFee: 48 });
    const before = (await FinanceService.getCareerState()).currentBalance;
    const nextCycle = new Date(Date.now() + 45 * 24 * 60 * 60 * 1000);
    await CreditCardService.processConfiguredFees(nextCycle); await CreditCardService.processConfiguredFees(nextCycle);
    const cardInvoices = (await CreditCardService.getInvoices()).filter(invoice => invoice.cardId === card.id);
    expect(cardInvoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0)).toBeGreaterThanOrEqual(12);
    expect((await FinanceService.getCareerState()).currentBalance).toBe(before);
    expect(cardInvoices.flatMap(invoice => invoice.feeKeys).filter(key => key.startsWith('other:')).length).toBe(cardInvoices.length);
  });

  it('processes late penalty and daily interest once for each persisted overdue date', async () => {
    const card = await CreditCardService.createCard({ ...input, closingDay: 28, dueDay: 1, annualFee: 0, otherFee: 0, lateFeePercent: 10, dailyLateInterestPercent: 1 });
    const db = await getDatabase(); await db.put('credit_cards', { ...card, createdAt: '2026-01-01T12:00:00.000Z' });
    const purchase = await CreditCardService.registerPurchase({ cardId: card.id, description: 'Atraso', amount: 100, purchasedAt: '2026-01-05T12:00:00.000Z' });
    const reference = new Date('2026-02-03T15:00:00.000Z');
    await CreditCardService.processConfiguredFees(reference);
    const first = (await db.get('credit_card_invoices', purchase.installments[0].invoiceId))!;
    const firstTotal = first.totalAmount; const firstFeeKeys = first.feeKeys.length;
    await CreditCardService.processConfiguredFees(reference);
    const repeated = (await db.get('credit_card_invoices', first.id))!;
    expect(repeated.totalAmount).toBe(firstTotal);
    expect(repeated.feeKeys).toHaveLength(firstFeeKeys);
    expect(repeated.totalAmount).toBeGreaterThan(100);
  });

  it('persists card state across DB reload and round-trips new fields in backup v8', async () => {
    const card = await CreditCardService.createCard(input);
    const purchase = await CreditCardService.registerPurchase({ cardId: card.id, description: 'Compra persistente', amount: 80, installmentCount: 2 });
    const backup = await BackupService.exportBackup();
    expect(backup.schemaVersion).toBe(8); expect(backup.data.creditCards).toHaveLength(1); expect(backup.data.creditCardPurchases?.[0].id).toBe(purchase.id);
    resetDBConnection();
    expect((await CreditCardService.getCards())[0].id).toBe(card.id);
    const oldV8 = { ...backup, data: { ...backup.data, creditCards: undefined, creditCardPurchases: undefined, creditCardInvoices: undefined, creditCardPayments: undefined, creditLimitHistory: undefined } };
    const valid = BackupService.validateBackup(oldV8); expect(valid.isValid).toBe(true);
    await BackupService.restoreBackup(valid.data!);
    expect((await CreditCardService.getCards())).toEqual([]);
    expect((await BackupService.exportBackup()).data.creditCardInvoices).toEqual([]);
  });

  it('keeps a unique payment and financial transaction in the persisted stores', async () => {
    await FinanceService.addMoney(300, 'Saldo teste'); const card = await CreditCardService.createCard(input);
    const purchase = await CreditCardService.registerPurchase({ cardId: card.id, description: 'Café', amount: 12.5 });
    const key = purchase.installments[0].invoiceId; await CreditCardService.payInvoice(key, 12.5, 'stable-payment-id'); await CreditCardService.payInvoice(key, 12.5, 'stable-payment-id');
    const db = await getDatabase(); expect(await db.count('credit_card_payments')).toBe(1); expect(await db.get('transactions', 'stable-payment-id')).toBeDefined();
  });
});
