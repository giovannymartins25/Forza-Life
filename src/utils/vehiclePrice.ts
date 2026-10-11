import type { Vehicle } from '../types';

/**
 * Calcula o preço sugerido de venda de um veículo com depreciação por:
 * - km rodados (máx 40% do valor base)
 * - desgaste médio dos componentes (máx 35% extra)
 */
export function calculateDepreciatedPrice(vehicle: Vehicle): {
  suggestedPrice: number;
  depreciationTotal: number;
  kmDepreciation: number;
  wearDepreciation: number;
  avgWear: number;
} {
  const base = vehicle.marketValue;

  // Depreciação por km: 0,01% por km rodado, máximo 40%
  const kmDepreciationPct = Math.min(0.40, vehicle.mileageKm * 0.0001);
  const kmDepreciation = base * kmDepreciationPct;

  // Depreciação por desgaste: média dos componentes × 35%
  const wearValues = Object.values(vehicle.wear);
  const avgWear =
    wearValues.length > 0
      ? wearValues.reduce((a, b) => a + b, 0) / wearValues.length
      : 0;
  const wearDepreciationPct = (avgWear / 100) * 0.35;
  const wearDepreciation = base * wearDepreciationPct;

  const depreciationTotal = kmDepreciation + wearDepreciation;
  // Garante mínimo de 10% do valor original
  const suggestedPrice = Math.max(base * 0.1, base - depreciationTotal);

  return {
    suggestedPrice: Math.round(suggestedPrice * 100) / 100,
    depreciationTotal: Math.round(depreciationTotal * 100) / 100,
    kmDepreciation: Math.round(kmDepreciation * 100) / 100,
    wearDepreciation: Math.round(wearDepreciation * 100) / 100,
    avgWear: Math.round(avgWear),
  };
}
