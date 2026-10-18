import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  parseISO,
  isWithinInterval,
} from 'date-fns';
import type { Budget, BudgetPeriod, WeekStart, Transaction } from './types';

export interface PeriodRange {
  start: Date;
  end: Date;
  startISO: string;
  endISO: string;
}

/**
 * Returns the start and end of the current period (week or month) in the local timezone, inclusive.
 * Handles weekStart 0 (Sunday) and 1 (Monday).
 */
export function periodRange(
  dateInput: Date | string,
  period: BudgetPeriod,
  weekStart: WeekStart = 1
): PeriodRange {
  const date = typeof dateInput === 'string' ? parseISO(dateInput) : dateInput;

  let start: Date;
  let end: Date;

  if (period === 'week') {
    start = startOfWeek(date, { weekStartsOn: weekStart });
    end = endOfWeek(date, { weekStartsOn: weekStart });
  } else {
    start = startOfMonth(date);
    end = endOfMonth(date);
  }

  return {
    start,
    end,
    startISO: start.toISOString(),
    endISO: end.toISOString(),
  };
}

export interface BudgetProgress {
  limitMinor: number;
  spentMinor: number;
  remainingMinor: number;
  percentUsed: number; // 0 to 100 for display
  rawPercentUsed: number; // Uncapped (e.g. 135 for 135%)
  overByMinor: number; // > 0 if over budget, else 0
  isOver: boolean;
}

/**
 * Calculates budget progress safely.
 * Capped percentUsed at 100 for circular progress displays.
 * Handles zero limit safely without division by zero.
 */
export function budgetProgress(budget: Budget, spentInPeriodMinor: number): BudgetProgress {
  const limitMinor = Math.max(0, budget.limitMinor);
  const spentMinor = Math.max(0, spentInPeriodMinor);
  const remainingMinor = limitMinor - spentMinor;
  const isOver = spentMinor > limitMinor;
  const overByMinor = isOver ? spentMinor - limitMinor : 0;

  let rawPercentUsed = 0;
  if (limitMinor > 0) {
    rawPercentUsed = Math.round((spentMinor / limitMinor) * 100);
  } else if (spentMinor > 0) {
    rawPercentUsed = 100;
  }

  const percentUsed = Math.min(100, Math.max(0, rawPercentUsed));

  return {
    limitMinor,
    spentMinor,
    remainingMinor,
    percentUsed,
    rawPercentUsed,
    overByMinor,
    isOver,
  };
}

/**
 * Sums all expenses for a budget within its active period range.
 * Respects budget.startsOn (if transaction occurred before startsOn, it is excluded).
 * Excludes soft-deleted transactions and non-expense transactions.
 */
export function calculateBudgetSpent(
  budget: Budget,
  transactions: Transaction[],
  referenceDate: Date | string,
  weekStart: WeekStart = 1
): number {
  const range = periodRange(referenceDate, budget.period, weekStart);
  const budgetStartDate = parseISO(budget.startsOn);

  let totalSpent = 0;

  for (const txn of transactions) {
    if (txn.deletedAt) continue;
    if (txn.type !== 'expense') continue;
    if (txn.categoryId !== budget.categoryId) continue;

    const txnDate = parseISO(txn.date);

    // If budget started mid-period, only count transactions on/after startsOn
    if (txnDate < budgetStartDate) continue;

    if (isWithinInterval(txnDate, { start: range.start, end: range.end })) {
      totalSpent += txn.amountMinor;
    }
  }

  return totalSpent;
}
