/** Shared fixed in-game rate for automatically generated IPVA and IPTU obligations. */
export const ASSET_TAX_RATE = 0.10;

/** Returns the tax on an asset's current value, rounded to currency cents. */
export function calculateAssetTaxAmount(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.round(value * ASSET_TAX_RATE * 100) / 100;
}

export function calculateAssetTaxCents(value: number): number {
  return Math.round(calculateAssetTaxAmount(value) * 100);
}
