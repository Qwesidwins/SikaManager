import { subDays, parseISO, isAfter } from 'date-fns';
import type { Transaction } from './types';

/**
 * Calculates average daily spend over a rolling window of N days (default 30).
 * Excludes transfers and income, excludes soft-deleted rows.
 * Returns integer minor units per day (rounded).
 * Returns 0 when there is no data, never NaN.
 */
export function averageDailySpend(
  transactions: Transaction[],
  days = 30,
  referenceDate: Date = new Date()
): number {
  if (days <= 0) return 0;

  const cutoff = subDays(referenceDate, days);
  let totalExpensesMinor = 0;

  for (const txn of transactions) {
    if (txn.deletedAt) continue;
    if (txn.type !== 'expense') continue;

    const txnDate = parseISO(txn.date);
    if (isAfter(txnDate, cutoff) || txnDate.getTime() === cutoff.getTime()) {
      totalExpensesMinor += txn.amountMinor;
    }
  }

  if (totalExpensesMinor <= 0) return 0;

  return Math.round(totalExpensesMinor / days);
}

/**
 * Calculates cash runway in days: balanceMinor / avgDailySpendMinor.
 * If avgDailySpend is 0, returns null ("No spending yet"), never Infinity.
 * If balance is negative or 0, clamps to 0.
 */
export function runwayDays(balanceMinor: number, avgDailySpendMinor: number): number | null {
  if (!avgDailySpendMinor || avgDailySpendMinor <= 0) {
    return null;
  }

  if (balanceMinor <= 0) {
    return 0;
  }

  return Math.floor(balanceMinor / avgDailySpendMinor);
}

