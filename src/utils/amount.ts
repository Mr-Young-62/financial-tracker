/**
 * Lenient amount normalization shared by the receipt scanner (client) and the
 * receipt scan API (server). Extracted once here so both sides parse
 * ID/EN grouping/decimal notation identically.
 */
export function parseAmount(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    let normalized = value.trim().replace(/[^\d,.-]/g, '');
    if (!normalized) return undefined;
    if (normalized.includes(',') && normalized.includes('.')) {
      if (normalized.lastIndexOf(',') > normalized.lastIndexOf('.')) {
        normalized = normalized.replace(/\./g, '').replace(',', '.');
      } else {
        normalized = normalized.replace(/,/g, '');
      }
    } else if (normalized.includes(',')) {
      const parts = normalized.split(',');
      normalized = parts.length === 2 ? `${parts[0].replace(/\./g, '')}.${parts[1]}` : normalized.replace(/,/g, '');
    } else {
      const parts = normalized.split('.');
      if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) {
        normalized = normalized.replace(/\./g, '');
      }
    }
    const numeric = Number(normalized);
    return Number.isFinite(numeric) ? numeric : undefined;
  }
  return undefined;
}
