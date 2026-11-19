/**
 * Formats raw user input into Indonesian thousand-separated digits (e.g. '50000' -> '50.000').
 * Strips non-digit characters and leading zeros; returns '' when empty or all zeros.
 */
export function formatThousandInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').replace(/^0+/, '');
  if (!digits) return '';
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Parses a thousand-separated string back into a pure number (e.g. '50.000' -> 50000, '' -> 0).
 */
export function parseThousandInput(formatted: string): number {
  const digits = formatted.replace(/\D/g, '');
  if (!digits) return 0;
  const parsed = Number(digits);
  return Number.isFinite(parsed) ? parsed : 0;
}
