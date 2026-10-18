import { describe, it, expect } from 'vitest';
import {
  safeToSpendToday,
  computeVariableBaselineIncome,
  type SafeToSpendInput,
} from '@/domain/safeToSpend';

describe('Domain: Safe-to-Spend', () => {
  describe('computeVariableBaselineIncome', () => {
    it('picks the lowest of the last three completed months', () => {
      // Month -1: 5000, Month -2: 4200, Month -3: 6100, Month -4: 3000
      const res = computeVariableBaselineIncome([500000, 420000, 610000, 300000]);
      expect(res.hasHistory).toBe(true);
      expect(res.baselineMinor).toBe(420000); // Min of first 3
    });

    it('falls back to lowest non-zero month when history has zeros', () => {
      const res = computeVariableBaselineIncome([0, 0, 450000]);
      expect(res.hasHistory).toBe(true);
      expect(res.baselineMinor).toBe(450000);

      // When last 3 months are zero, but older history has a non-zero amount
      const olderHistory = computeVariableBaselineIncome([0, 0, 0, 350000, 600000]);
      expect(olderHistory.hasHistory).toBe(true);
      expect(olderHistory.baselineMinor).toBe(350000);
    });

    it('returns 0 and hasHistory: false when no past income exists', () => {
      const res = computeVariableBaselineIncome([]);
      expect(res.hasHistory).toBe(false);
      expect(res.baselineMinor).toBe(0);

      const allZeros = computeVariableBaselineIncome([0, 0, 0]);
      expect(allZeros.hasHistory).toBe(false);
      expect(allZeros.baselineMinor).toBe(0);
    });
  });

  describe('safeToSpendToday in Fixed Mode', () => {
    it('computes daily safe-to-spend correctly with scheduled income', () => {
      const input: SafeToSpendInput = {
        incomeMode: 'fixed',
        currentBalanceMinor: 100000, // 1000
        committedBillsMinor: 20000, // 200
        savingsTargetMinor: 10000, // 100
        daysLeftInPeriod: 10,
        scheduledIncomeRemainingMinor: 50000, // 500
      };

      // Total safe = 50000 (income) + 100000 (bal) - 20000 (bills) - 10000 (savings) = 120000
      // Daily = 120000 / 10 = 12000
      const res = safeToSpendToday(input);
      expect(res.safeToSpendTotalPeriodMinor).toBe(120000);
      expect(res.safeToSpendTodayMinor).toBe(12000);
      expect(res.isNegative).toBe(false);
    });
  });

  describe('safeToSpendToday in Variable Mode', () => {
    it('calculates expected remaining income from variable baseline minus received', () => {
      const input: SafeToSpendInput = {
        incomeMode: 'variable',
        currentBalanceMinor: 80000, // 800
        committedBillsMinor: 30000, // 300
        savingsTargetMinor: 20000, // 200
        daysLeftInPeriod: 12,
        incomeReceivedThisPeriodMinor: 150000, // 1500 already received
        pastCompletedMonthsIncomeMinor: [200000, 250000, 220000], // baseline = 200000
      };

      // Expected remaining income = max(0, 200000 - 150000) = 50000
      // Total safe = 50000 + 80000 - 30000 - 20000 = 80000
      // Daily safe = 80000 / 12 = 6667 (rounded)
      const res = safeToSpendToday(input);
      expect(res.expectedIncomeRemainingMinor).toBe(50000);
      expect(res.baselineIncomeMinor).toBe(200000);
      expect(res.safeToSpendTotalPeriodMinor).toBe(80000);
      expect(res.safeToSpendTodayMinor).toBe(6667);
      expect(res.isNegative).toBe(false);
    });

    it('handles zero income history cleanly', () => {
      const input: SafeToSpendInput = {
        incomeMode: 'variable',
        currentBalanceMinor: 40000,
        committedBillsMinor: 10000,
        savingsTargetMinor: 0,
        daysLeftInPeriod: 5,
        incomeReceivedThisPeriodMinor: 0,
        pastCompletedMonthsIncomeMinor: [],
      };

      const res = safeToSpendToday(input);
      expect(res.hasIncomeHistory).toBe(false);
      expect(res.expectedIncomeRemainingMinor).toBe(0);
      expect(res.safeToSpendTodayMinor).toBe(6000); // 30000 / 5
    });

    it('returns negative safe-to-spend when committed bills exceed funds and flags isNegative', () => {
      const input: SafeToSpendInput = {
        incomeMode: 'variable',
        currentBalanceMinor: 10000, // 100
        committedBillsMinor: 50000, // 500
        savingsTargetMinor: 20000, // 200
        daysLeftInPeriod: 10,
        incomeReceivedThisPeriodMinor: 0,
        pastCompletedMonthsIncomeMinor: [],
      };

      // Total safe = 0 + 10000 - 50000 - 20000 = -60000
      // Daily = -6000
      const res = safeToSpendToday(input);
      expect(res.safeToSpendTotalPeriodMinor).toBe(-60000);
      expect(res.safeToSpendTodayMinor).toBe(-6000);
      expect(res.isNegative).toBe(true);
    });

    it('ensures minimum daysLeft is at least 1, avoiding division by zero', () => {
      const input: SafeToSpendInput = {
        incomeMode: 'fixed',
        currentBalanceMinor: 10000,
        committedBillsMinor: 0,
        savingsTargetMinor: 0,
        daysLeftInPeriod: 0, // Last day / midnight
      };

      const res = safeToSpendToday(input);
      expect(res.daysLeftInPeriod).toBe(1);
      expect(res.safeToSpendTodayMinor).toBe(10000);
    });
  });
});
