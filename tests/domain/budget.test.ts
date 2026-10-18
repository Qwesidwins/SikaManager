import { describe, it, expect } from 'vitest';
import { periodRange, budgetProgress, calculateBudgetSpent } from '@/domain/budget';
import type { Budget, Transaction } from '@/domain/types';

describe('Domain: Budget', () => {
  describe('periodRange', () => {
    it('handles week boundaries with weekStart = 1 (Monday)', () => {
      // Wednesday 2026-03-11
      const range = periodRange('2026-03-11T12:00:00.000Z', 'week', 1);
      // Monday should be 2026-03-09
      expect(range.start.getDay()).toBe(1);
      // Sunday should be 2026-03-15
      expect(range.end.getDay()).toBe(0);
    });

    it('handles week boundaries with weekStart = 0 (Sunday)', () => {
      // Wednesday 2026-03-11
      const range = periodRange('2026-03-11T12:00:00.000Z', 'week', 0);
      // Sunday should be 2026-03-08
      expect(range.start.getDay()).toBe(0);
      // Saturday should be 2026-03-14
      expect(range.end.getDay()).toBe(6);
    });

    it('handles month boundaries and leap day (e.g. 2028 leap year)', () => {
      const leapRange = periodRange('2028-02-15T10:00:00.000Z', 'month');
      expect(leapRange.start.getDate()).toBe(1);
      expect(leapRange.end.getDate()).toBe(29); // Leap day!
    });

    it('handles non-leap February month end', () => {
      const feb2026 = periodRange('2026-02-10T10:00:00.000Z', 'month');
      expect(feb2026.start.getDate()).toBe(1);
      expect(feb2026.end.getDate()).toBe(28);
    });

    it('handles 31-day month end (e.g. March, October)', () => {
      const oct = periodRange('2026-10-18T00:00:00.000Z', 'month');
      expect(oct.start.getDate()).toBe(1);
      expect(oct.end.getDate()).toBe(31);
    });
  });

  describe('budgetProgress', () => {
    const mockBudget: Budget = {
      id: 'b-1',
      categoryId: 'cat-food',
      period: 'month',
      limitMinor: 50000, // GH₵ 500.00
      startsOn: '2026-03-01',
      createdAt: '2026-03-01T00:00:00.000Z',
      updatedAt: '2026-03-01T00:00:00.000Z',
    };

    it('calculates progress within budget limits', () => {
      const res = budgetProgress(mockBudget, 36000); // 360.00 spent
      expect(res.spentMinor).toBe(36000);
      expect(res.remainingMinor).toBe(14000);
      expect(res.percentUsed).toBe(72);
      expect(res.rawPercentUsed).toBe(72);
      expect(res.overByMinor).toBe(0);
      expect(res.isOver).toBe(false);
    });

    it('caps percentUsed at 100 for displays and reports overByMinor when exceeded', () => {
      const res = budgetProgress(mockBudget, 65000); // 650.00 spent
      expect(res.spentMinor).toBe(65000);
      expect(res.remainingMinor).toBe(-15000);
      expect(res.percentUsed).toBe(100); // Capped for UI rings
      expect(res.rawPercentUsed).toBe(130);
      expect(res.overByMinor).toBe(15000);
      expect(res.isOver).toBe(true);
    });

    it('handles zero budget limit safely without NaN or division by zero', () => {
      const zeroBudget = { ...mockBudget, limitMinor: 0 };
      const zeroSpend = budgetProgress(zeroBudget, 0);
      expect(zeroSpend.percentUsed).toBe(0);
      expect(zeroSpend.remainingMinor).toBe(0);
      expect(zeroSpend.isOver).toBe(false);

      const someSpend = budgetProgress(zeroBudget, 1000);
      expect(someSpend.percentUsed).toBe(100);
      expect(someSpend.overByMinor).toBe(1000);
      expect(someSpend.isOver).toBe(true);
    });
  });

  describe('calculateBudgetSpent', () => {
    const budget: Budget = {
      id: 'b-food',
      categoryId: 'cat-food',
      period: 'month',
      limitMinor: 50000,
      startsOn: '2026-03-10', // Starts mid-month!
      createdAt: '2026-03-10T00:00:00.000Z',
      updatedAt: '2026-03-10T00:00:00.000Z',
    };

    it('excludes expenses before startsOn for mid-period budgets and soft-deleted rows', () => {
      const txns: Transaction[] = [
        {
          id: 'tx-before',
          type: 'expense',
          amountMinor: 2000,
          currency: 'GHS',
          accountId: 'acc-1',
          categoryId: 'cat-food',
          date: '2026-03-05T12:00:00.000Z', // Before startsOn (March 10)
          createdAt: '2026-03-05T12:00:00.000Z',
          updatedAt: '2026-03-05T12:00:00.000Z',
        },
        {
          id: 'tx-valid',
          type: 'expense',
          amountMinor: 5000,
          currency: 'GHS',
          accountId: 'acc-1',
          categoryId: 'cat-food',
          date: '2026-03-12T12:00:00.000Z', // After startsOn
          createdAt: '2026-03-12T12:00:00.000Z',
          updatedAt: '2026-03-12T12:00:00.000Z',
        },
        {
          id: 'tx-deleted',
          type: 'expense',
          amountMinor: 3000,
          currency: 'GHS',
          accountId: 'acc-1',
          categoryId: 'cat-food',
          date: '2026-03-15T12:00:00.000Z',
          createdAt: '2026-03-15T12:00:00.000Z',
          updatedAt: '2026-03-15T12:00:00.000Z',
          deletedAt: '2026-03-15T13:00:00.000Z', // Soft deleted
        },
        {
          id: 'tx-other-cat',
          type: 'expense',
          amountMinor: 4000,
          currency: 'GHS',
          accountId: 'acc-1',
          categoryId: 'cat-transport', // Different category
          date: '2026-03-15T12:00:00.000Z',
          createdAt: '2026-03-15T12:00:00.000Z',
          updatedAt: '2026-03-15T12:00:00.000Z',
        },
      ];

      const spent = calculateBudgetSpent(budget, txns, '2026-03-15T12:00:00.000Z');
      expect(spent).toBe(5000); // Only tx-valid counts
    });
  });
});
