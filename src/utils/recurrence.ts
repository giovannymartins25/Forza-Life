import type { JobPaymentFrequency } from '../types';

/** Advances one persisted recurrence period; monthly dates clamp to the month's last day. */
export function advanceRentalDueDate(value: string | Date, frequency: JobPaymentFrequency, monthlyAnchorDay?: number): Date {
  const current = new Date(value);
  if (!Number.isFinite(current.getTime())) throw new Error('Data de vencimento inválida.');
  if (frequency === 'daily') return new Date(current.getTime() + 24 * 60 * 60 * 1000);
  if (frequency === 'weekly') return new Date(current.getTime() + 7 * 24 * 60 * 60 * 1000);
  const originalDay = monthlyAnchorDay ?? current.getUTCDate();
  const next = new Date(current);
  next.setUTCDate(1);
  next.setUTCMonth(next.getUTCMonth() + 1);
  const lastDay = new Date(Date.UTC(next.getUTCFullYear(), next.getUTCMonth() + 1, 0)).getUTCDate();
  next.setUTCDate(Math.min(originalDay, lastDay));
  return next;
}
