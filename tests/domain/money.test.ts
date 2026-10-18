import { describe, it, expect } from 'vitest';
import {
  parseAmountInput,
  formatMinor,
  minorToDecimal,
  decimalToMinor,
  MAX_AMOUNT_MINOR,
} from '@/domain/money';

describe('Domain: Money', () => {
  describe('parseAmountInput', () => {
    it('parses whole integer inputs', () => {
      expect(parseAmountInput('15')).toEqual({ ok: true, minor: 1500 });
      expect(parseAmountInput('0')).toEqual({ ok: true, minor: 0 });
      expect(parseAmountInput('100')).toEqual({ ok: true, minor: 10000 });
    });

    it('parses decimal inputs with dot separator', () => {
      expect(parseAmountInput('12.50')).toEqual({ ok: true, minor: 1250 });
      expect(parseAmountInput('12.5')).toEqual({ ok: true, minor: 1250 });
      expect(parseAmountInput('0.05')).toEqual({ ok: true, minor: 5 });
      expect(parseAmountInput('.50')).toEqual({ ok: true, minor: 50 });
    });

    it('parses comma as decimal separator', () => {
      expect(parseAmountInput('12,50')).toEqual({ ok: true, minor: 1250 });
      expect(parseAmountInput('12,5')).toEqual({ ok: true, minor: 1250 });
      expect(parseAmountInput('0,05')).toEqual({ ok: true, minor: 5 });
    });

    it('parses thousands separators properly', () => {
      expect(parseAmountInput('1,200')).toEqual({ ok: true, minor: 120000 });
      expect(parseAmountInput('1,200.50')).toEqual({ ok: true, minor: 120050 });
      expect(parseAmountInput('1,234,567.89')).toEqual({ ok: true, minor: 123456789 });
      // European dot thousands comma decimal
      expect(parseAmountInput('1.234,56')).toEqual({ ok: true, minor: 123456 });
    });

    it('rejects invalid formatting with misplaces dots or commas', () => {
      expect(parseAmountInput('1,23,45.67').ok).toBe(false);
      expect(parseAmountInput('1.2.3.4,56').ok).toBe(false);
      expect(parseAmountInput('1,20,00').ok).toBe(false);
      expect(parseAmountInput('..50').ok).toBe(false);
      expect(parseAmountInput('12.34.56').ok).toBe(false);
    });

    it('rejects fractional inputs with > 2 decimal places (e.g. 0.005)', () => {
      const res = parseAmountInput('0.005');
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error).toMatch(/2 decimal places/);
      }

      expect(parseAmountInput('12.345').ok).toBe(false);
      expect(parseAmountInput('12,3456').ok).toBe(false);
    });

    it('rejects negative numbers', () => {
      const res = parseAmountInput('-15.00');
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error).toMatch(/negative/i);
      }
    });

    it('rejects empty or whitespace inputs', () => {
      expect(parseAmountInput('').ok).toBe(false);
      expect(parseAmountInput('   ').ok).toBe(false);
    });

    it('rejects letters and garbage inputs', () => {
      expect(parseAmountInput('abc').ok).toBe(false);
      expect(parseAmountInput('12abc').ok).toBe(false);
      expect(parseAmountInput('$12.50').ok).toBe(false);
    });

    it('rejects amounts exceeding MAX_AMOUNT_MINOR (999,999,999)', () => {
      const maxOk = parseAmountInput('9999999.99');
      expect(maxOk).toEqual({ ok: true, minor: MAX_AMOUNT_MINOR });

      const exceeded = parseAmountInput('10000000.00');
      expect(exceeded.ok).toBe(false);
    });
  });

  describe('formatMinor', () => {
    it('formats GHS amounts correctly with GH₵ symbol', () => {
      expect(formatMinor(1500, 'GHS', 'en-GH')).toBe('GH₵ 15.00');
      expect(formatMinor(0, 'GHS', 'en-GH')).toBe('GH₵ 0.00');
      expect(formatMinor(7420, 'GHS', 'en-GH')).toBe('GH₵ 74.20');
      expect(formatMinor(120050, 'GHS', 'en-GH')).toBe('GH₵ 1,200.50');
    });

    it('supports compact formatting for large figures', () => {
      expect(formatMinor(1390000, 'GHS', 'en-GH', { compact: true })).toBe('GH₵ 13.9k');
      expect(formatMinor(10000000, 'GHS', 'en-GH', { compact: true })).toBe('GH₵ 100k');
    });

    it('supports hideCurrency option', () => {
      expect(formatMinor(1500, 'GHS', 'en-GH', { hideCurrency: true })).toBe('15.00');
    });

    it('formats negative minor amounts correctly', () => {
      expect(formatMinor(-1500, 'GHS', 'en-GH')).toBe('GH₵ -15.00');
      expect(formatMinor(-1500, 'USD', 'en-US')).toBe('USD -15.00');
    });
  });

  describe('minorToDecimal and decimalToMinor', () => {
    it('converts minor units back and forth without float drift', () => {
      expect(minorToDecimal(1550)).toBe(15.5);
      expect(decimalToMinor(15.5)).toBe(1550);
      expect(decimalToMinor(0.01)).toBe(1);
      expect(minorToDecimal(1)).toBe(0.01);
    });

    it('handles non-finite values safely by returning 0', () => {
      expect(minorToDecimal(NaN)).toBe(0);
      expect(minorToDecimal(Infinity)).toBe(0);
      expect(decimalToMinor(NaN)).toBe(0);
      expect(decimalToMinor(Infinity)).toBe(0);
    });
  });
});
