/**
 * Utilitários de data e hora para Horizon Life
 */

export function formatDateTime(dateInput: string | number | Date): string {
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return 'Data inválida';

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
}

export function formatDateShort(dateInput: string | number | Date): string {
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

import type { PeriodFilter } from '../types';

export function isWithinPeriod(
  timestamp: number,
  period: PeriodFilter,
  referenceTime: number = Date.now()
): boolean {
  if (period === 'all') return true;

  const txDate = new Date(timestamp);
  const refDate = new Date(referenceTime);

  if (period === '1h') {
    const oneHourAgo = referenceTime - 60 * 60 * 1000;
    return timestamp >= oneHourAgo && timestamp <= referenceTime;
  }

  if (period === 'today') {
    return (
      txDate.getDate() === refDate.getDate() &&
      txDate.getMonth() === refDate.getMonth() &&
      txDate.getFullYear() === refDate.getFullYear()
    );
  }

  if (period === '7days') {
    const sevenDaysAgo = referenceTime - 7 * 24 * 60 * 60 * 1000;
    return timestamp >= sevenDaysAgo && timestamp <= referenceTime;
  }

  if (period === '30days') {
    const thirtyDaysAgo = referenceTime - 30 * 24 * 60 * 60 * 1000;
    return timestamp >= thirtyDaysAgo && timestamp <= referenceTime;
  }

  return true;
}
