import { describe, it, expect } from 'vitest';
import { affordability, emergencyFundProgress } from '@/domain/affordability';
import type { AffordabilityState } from '@/domain/affordability';

describe('Domain: Affordability & Emergency Fund', () => {
  describe('emergencyFundProgress', () => {
    it('calculates progress and months covered correctly', () => {
      // Essentials = 1000/mo, Target = 3 months (3000), Current savings = 1700
      const res = emergencyFundProgress(170000, 100000, 3);
      expect(res.targetMinor).toBe(300000);
      expect(res.currentMinor).toBe(170000);
      expect(res.monthsCovered).toBe(1.7);
      expect(res.progress).toBeCloseTo(0.57, 1);
      expect(res.holdsTarget).toBe(false);
    });

    it('reports holdsTarget: true when savings meet or exceed target', () => {
      const res = emergencyFundProgress(350000, 100000, 3);
      expect(res.progress).toBe(1); // Capped for ring
      expect(res.rawProgress).toBe(3.5 / 3);
      expect(res.monthsCovered).toBe(3.5);
      expect(res.holdsTarget).toBe(true);
    });

    it('handles zero essential expenses safely', () => {
      const res = emergencyFundProgress(50000, 0, 3);
      expect(res.targetMinor).toBe(0);
      expect(res.progress).toBe(1);
      expect(res.holdsTarget).toBe(true);
    });
  });

  describe('affordability', () => {
    const baseState: AffordabilityState = {
      currentBalanceMinor: 200000, // 2000 total balance
      savingsBalanceMinor: 100000, // 1000 in savings
      essentialMonthlyMinor: 50000, // 500/mo (target 3 mos = 1500)
      avgDailySpendMinor: 5000, // 50/day
      safeToSpendInput: {
        incomeMode: 'fixed',
        currentBalanceMinor: 200000,
        committedBillsMinor: 0,
        savingsTargetMinor: 0,
        daysLeftInPeriod: 10,
        scheduledIncomeRemainingMinor: 0,
      },
      targetMonths: 3,
    };

    it('simulates the impact of a planned purchase on runway, safe-to-spend, and buffer', () => {
      const res = affordability(50000, baseState); // 500 purchase

      // Before: balance 2000, runway = 2000 / 50 = 40 days
      expect(res.before.runwayDays).toBe(40);
      expect(res.before.safeToSpendTodayMinor).toBe(20000); // 2000 / 10

      // After: balance 1500, runway = 1500 / 50 = 30 days
      expect(res.after.runwayDays).toBe(30);
      expect(res.after.safeToSpendTodayMinor).toBe(15000); // 1500 / 10
      expect(res.runwayDifferenceDays).toBe(-10);
      expect(res.safeToSpendDifferenceMinor).toBe(-5000);
    });

    it('calculates whether purchase cuts into emergency fund buffer', () => {
      // Liquid non-savings = 2000 - 1000 = 1000.
      // If purchase is 1200, it depletes 200 of savings (savings becomes 800).
      // Target is 1500, so emergency buffer does not hold.
      const res = affordability(120000, baseState);
      expect(res.after.emergencyProgress.currentMinor).toBe(80000);
      expect(res.emergencyFundHolds).toBe(false);
    });

    it('handles zero average daily spend resulting in null runway difference', () => {
      const zeroSpendState = { ...baseState, avgDailySpendMinor: 0 };
      const res = affordability(10000, zeroSpendState);
      expect(res.before.runwayDays).toBeNull();
      expect(res.after.runwayDays).toBeNull();
      expect(res.runwayDifferenceDays).toBeNull();
    });
  });
});
