/**
 * Utilitários de formatação e manipulação de moeda (BRL)
 */

export function formatBRL(value: number): string {
  if (isNaN(value) || !isFinite(value)) {
    return 'R$ 0,00';
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function parseBRLInput(input: string): number {
  if (!input) return 0;
  // Remove R$, espaços, e converte formato pt-BR (1.234,56) para float (1234.56)
  const cleaned = input
    .replace(/[R$\s]/g, '')
    .replace(/\./g, '')
    .replace(',', '.');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : Math.round(parsed * 100) / 100;
}
