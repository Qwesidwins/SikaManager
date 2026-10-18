import { describe, it, expect } from 'vitest';
import { averageDailySpend, runwayDays } from '@/domain/runway';
import type { Transaction } from '@/domain/types';

describe('Domain: Runway', () => {
  describe('averageDailySpend', () => {
    it('returns 0 when there are no transactions or zero spend, never NaN', () => {
      expect(averageDailySpend([], 30)).toBe(0);
      expect(averageDailySpend([], 0)).toBe(0);
    });

    it('calculates average daily expenses over the window, ignoring income and transfers', () => {
      const now = new Date('2026-03-31T12:00:00.000Z');
      const txns: Transaction[] = [
        {
          id: 't-1',
          type: 'expense',
          amountMinor: 30000, // 300.00
          currency: 'GHS',
          accountId: 'acc-1',
          date: '2026-03-25T10:00:00.000Z',
          createdAt: '2026-03-25T10:00:00.000Z',
          updatedAt: '2026-03-25T10:00:00.000Z',
        },
        {
          id: 't-2',
          type: 'expense',
          amountMinor: 60000, // 600.00
          currency: 'GHS',
          accountId: 'acc-1',
          date: '2026-03-10T10:00:00.000Z',
          createdAt: '2026-03-10T10:00:00.000Z',
          updatedAt: '2026-03-10T10:00:00.000Z',
        },
        {
          id: 't-income',
          type: 'income',
          amountMinor: 200000,
          currency: 'GHS',
          accountId: 'acc-1',
          date: '2026-03-20T10:00:00.000Z',
          createdAt: '2026-03-20T10:00:00.000Z',
          updatedAt: '2026-03-20T10:00:00.000Z',
        },
        {
          id: 't-transfer',
          type: 'transfer',
          amountMinor: 50000,
          currency: 'GHS',
          accountId: 'acc-1',
          date: '2026-03-15T10:00:00.000Z',
          createdAt: '2026-03-15T10:00:00.000Z',
          updatedAt: '2026-03-15T10:00:00.000Z',
        },
      ];

      // Total expenses = 30000 + 60000 = 90000 minor units.
      // Window = 30 days. Average = 90000 / 30 = 3000 minor units / day.
      expect(averageDailySpend(txns, 30, now)).toBe(3000);
    });

    it('excludes transactions outside the window and deleted transactions', () => {
      const now = new Date('2026-03-31T12:00:00.000Z');
      const txns: Transaction[] = [
        {
          id: 't-old',
          type: 'expense',
          amountMinor: 100000,
          currency: 'GHS',
          accountId: 'acc-1',
          date: '2026-01-01T10:00:00.000Z', // 3 months ago (outside 30d window)
          createdAt: '2026-01-01T10:00:00.000Z',
          updatedAt: '2026-01-01T10:00:00.000Z',
        },
        {
          id: 't-del',
          type: 'expense',
          amountMinor: 50000,
          currency: 'GHS',
          accountId: 'acc-1',
          date: '2026-03-20T10:00:00.000Z',
          createdAt: '2026-03-20T10:00:00.000Z',
          updatedAt: '2026-03-20T10:00:00.000Z',
          deletedAt: '2026-03-21T10:00:00.000Z',
        },
      ];

      expect(averageDailySpend(txns, 30, now)).toBe(0);
    });
  });

  describe('runwayDays', () => {
    it('returns null when avgDailySpend is 0, never Infinity', () => {
      expect(runwayDays(50000, 0)).toBeNull();
      expect(runwayDays(0, 0)).toBeNull();
    });

    it('calculates runway days correctly', () => {
      // 100,000 minor balance / 4,000 minor daily spend = 25 days
      expect(runwayDays(100000, 4000)).toBe(25);
    });

    it('clamps negative or zero balances to 0 days', () => {
      expect(runwayDays(0, 4000)).toBe(0);
      expect(runwayDays(-5000, 4000)).toBe(0);
    });
  });
});
