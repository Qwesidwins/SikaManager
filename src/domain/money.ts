export const MAX_AMOUNT_MINOR = 999_999_999; // 9,999,999.99

export type ParseAmountResult =
  | { ok: true; minor: number }
  | { ok: false; error: string };

/**
 * Parses a user input string into minor units (e.g. pesewas).
 * Accepts formats: "12.50", "12,50", "1,200", "12", "1,200.50".
 * Max minor units: 999,999,999.
 * Strictly disallows more than 2 decimal places (e.g. "0.005").
 * Strictly disallows negative values or non-numbers.
 */
export function parseAmountInput(input: string): ParseAmountResult {
  if (!input || typeof input !== 'string') {
    return { ok: false, error: 'Amount is required' };
  }

  let trimmed = input.trim();
  if (trimmed === '') {
    return { ok: false, error: 'Amount cannot be empty' };
  }

  if (trimmed.includes('-')) {
    return { ok: false, error: 'Amount cannot be negative' };
  }

  // Support leading dot or comma, e.g. ".50" -> "0.50", ",50" -> "0,50"
  if (trimmed.startsWith('.') || trimmed.startsWith(',')) {
    trimmed = '0' + trimmed;
  }

  let normalized = trimmed;

  // Case 1: Both comma and dot present
  if (normalized.includes(',') && normalized.includes('.')) {
    // Determine which comes last
    const lastComma = normalized.lastIndexOf(',');
    const lastDot = normalized.lastIndexOf('.');

    if (lastDot > lastComma) {
      // Form: 1,234.56
      // Comma is thousands, dot is decimal
      if (!/^\d{1,3}(,\d{3})+(\.\d+)?$/.test(normalized)) {
        return { ok: false, error: 'Invalid amount format' };
      }
      normalized = normalized.replace(/,/g, '');
    } else {
      // Form: 1.234,56
      // Dot is thousands, comma is decimal
      if (!/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(normalized)) {
        return { ok: false, error: 'Invalid amount format' };
      }
      normalized = normalized.replace(/\./g, '').replace(',', '.');
    }
  } else if (normalized.includes(',')) {
    // Only comma present
    // Could be 1,200 (thousands) or 12,50 (decimal)
    if (/^\d{1,3}(,\d{3})+$/.test(normalized)) {
      // Thousands separator e.g. 1,200 or 1,200,000
      normalized = normalized.replace(/,/g, '');
    } else if (/^\d+,\d+$/.test(normalized)) {
      // Decimal comma e.g. 12,50
      normalized = normalized.replace(',', '.');
    } else {
      return { ok: false, error: 'Invalid amount format' };
    }
  } else if (normalized.includes('.')) {
    // Only dot present: In GHS / English financial, dot is decimal!
    if (!/^\d+\.\d+$/.test(normalized)) {
      return { ok: false, error: 'Invalid amount format' };
    }
    // Already has dot
  } else {
    // Integer only
    if (!/^\d+$/.test(normalized)) {
      return { ok: false, error: 'Invalid amount format' };
    }
  }

  // Check decimal places
  const parts = normalized.split('.');
  const wholeStr = parts[0] ?? '0';
  const decimalStr = parts[1] ?? '';

  if (decimalStr.length > 2) {
    return { ok: false, error: 'Cannot have more than 2 decimal places' };
  }

  const whole = parseInt(wholeStr, 10);
  if (isNaN(whole)) {
    return { ok: false, error: 'Invalid amount number' };
  }

  const paddedDecimal = decimalStr.padEnd(2, '0');
  const decimal = parseInt(paddedDecimal || '0', 10);

  const minor = whole * 100 + decimal;

  if (minor > MAX_AMOUNT_MINOR) {
    return { ok: false, error: `Amount cannot exceed ${MAX_AMOUNT_MINOR / 100}` };
  }

  return { ok: true, minor };
}

/**
 * Converts minor units (integer) to decimal (number).
 */
export function minorToDecimal(minor: number): number {
  if (!Number.isFinite(minor)) return 0;
  return Math.round(minor) / 100;
}

/**
 * Converts decimal amount to minor units (integer).
 */
export function decimalToMinor(decimal: number): number {
  if (!Number.isFinite(decimal)) return 0;
  return Math.round(decimal * 100);
}

/**
 * Formats minor units into localized currency string.
 */
export function formatMinor(
  minor: number,
  currency = 'GHS',
  locale = 'en-GH',
  options?: { hideCurrency?: boolean; compact?: boolean }
): string {
  const decimal = minorToDecimal(minor);
  
  if (options?.compact && Math.abs(minor) >= 100_000) {
    // e.g. 13.9k
    const thousands = (decimal / 1000).toFixed(1).replace(/\.0$/, '');
    return options.hideCurrency ? `${thousands}k` : `${currency === 'GHS' ? 'GH₵' : currency} ${thousands}k`;
  }

  const formattedNumber = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(decimal);

  if (options?.hideCurrency) {
    return formattedNumber;
  }

  const prefix = currency === 'GHS' ? 'GH₵ ' : `${currency} `;
  return `${prefix}${formattedNumber}`;
}
