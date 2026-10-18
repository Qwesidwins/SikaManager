import type { IncomeMode } from './types';

export interface SafeToSpendInput {
  incomeMode: IncomeMode;
  currentBalanceMinor: number;
  committedBillsMinor: number;
  savingsTargetMinor: number;
  daysLeftInPeriod: number; // minimum 1
  // Fixed mode input
  scheduledIncomeRemainingMinor?: number;
  // Variable mode inputs
  incomeReceivedThisPeriodMinor?: number;
  pastCompletedMonthsIncomeMinor?: number[]; // [m-1, m-2, m-3, ...]
}

export interface SafeToSpendResult {
  safeToSpendTodayMinor: number; // Can be negative
  safeToSpendTotalPeriodMinor: number;
  expectedIncomeRemainingMinor: number;
  baselineIncomeMinor: number;
  hasIncomeHistory: boolean;
  daysLeftInPeriod: number;
  isNegative: boolean;
}

/**
 * Computes baseline income for variable income earners:
 * - Lowest of the last 3 completed months
 * - Fallback: lowest non-zero month across available history
 * - If no history: 0
 */
export function computeVariableBaselineIncome(pastMonthsIncomeMinor: number[]): {
  baselineMinor: number;
  hasHistory: boolean;
} {
  if (!pastMonthsIncomeMinor || pastMonthsIncomeMinor.length === 0) {
    return { baselineMinor: 0, hasHistory: false };
  }

  // Take up to the last 3 completed months
  const last3 = pastMonthsIncomeMinor.slice(0, 3);
  if (last3.length > 0 && last3.some((amt) => amt > 0)) {
    // If we have positive months in the last 3, take min
    const positiveLast3 = last3.filter((amt) => amt > 0);
    const minVal = Math.min(...positiveLast3);
    return { baselineMinor: minVal, hasHistory: true };
  }

  // Fallback: lowest non-zero month in any past history
  const anyNonZero = pastMonthsIncomeMinor.filter((amt) => amt > 0);
  if (anyNonZero.length > 0) {
    return { baselineMinor: Math.min(...anyNonZero), hasHistory: true };
  }

  return { baselineMinor: 0, hasHistory: false };
}

/**
 * Calculates Safe-to-Spend Today.
 * Formula:
 * (expectedIncomeRemaining + balance - committedBills - savingsTarget) / daysLeftInPeriod
 * Minimum daysLeft is 1.
 * Return value can be negative.
 */
export function safeToSpendToday(input: SafeToSpendInput): SafeToSpendResult {
  const daysLeft = Math.max(1, Math.round(input.daysLeftInPeriod));

  let expectedIncomeRemainingMinor = 0;
  let baselineIncomeMinor = 0;
  let hasIncomeHistory = true;

  if (input.incomeMode === 'fixed') {
    expectedIncomeRemainingMinor = Math.max(0, input.scheduledIncomeRemainingMinor ?? 0);
  } else {
    // Variable mode
    const baseline = computeVariableBaselineIncome(input.pastCompletedMonthsIncomeMinor ?? []);
    baselineIncomeMinor = baseline.baselineMinor;
    hasIncomeHistory = baseline.hasHistory;

    const received = Math.max(0, input.incomeReceivedThisPeriodMinor ?? 0);
    expectedIncomeRemainingMinor = Math.max(0, baselineIncomeMinor - received);
  }

  const committedBills = Math.max(0, input.committedBillsMinor);
  const savingsTarget = Math.max(0, input.savingsTargetMinor);

  // Total safe to spend across the remainder of the period
  const totalSafeMinor =
    expectedIncomeRemainingMinor + input.currentBalanceMinor - committedBills - savingsTarget;

  // Safe to spend today
  const todaySafeMinor = Math.round(totalSafeMinor / daysLeft);

  return {
    safeToSpendTodayMinor: todaySafeMinor,
    safeToSpendTotalPeriodMinor: totalSafeMinor,
    expectedIncomeRemainingMinor,
    baselineIncomeMinor,
    hasIncomeHistory,
    daysLeftInPeriod: daysLeft,
    isNegative: todaySafeMinor < 0,
  };
}
