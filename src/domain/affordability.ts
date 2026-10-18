import { runwayDays } from './runway';
import { safeToSpendToday, type SafeToSpendInput } from './safeToSpend';

export interface EmergencyFundProgress {
  progress: number; // 0 to 1 (capped at 1 for meter/ring)
  rawProgress: number; // Uncapped (e.g. 1.25 for 125%)
  monthsCovered: number; // Formatted to 1 decimal place, e.g. 1.7
  targetMonths: number;
  targetMinor: number;
  currentMinor: number;
  holdsTarget: boolean;
}

/**
 * Calculates emergency fund progress:
 * Target = essentialMonthlyMinor * targetMonths.
 * Progress = savingsBalance / target.
 * Handles essentialMonthlyMinor = 0 safely.
 */
export function emergencyFundProgress(
  savingsBalanceMinor: number,
  essentialMonthlyMinor: number,
  targetMonths = 3
): EmergencyFundProgress {
  const current = Math.max(0, savingsBalanceMinor);
  const essentials = Math.max(0, essentialMonthlyMinor);
  const targetMinor = essentials * Math.max(1, targetMonths);

  let rawProgress = 0;
  let monthsCovered = 0;

  if (targetMinor > 0) {
    rawProgress = current / targetMinor;
    monthsCovered = Math.round((current / essentials) * 10) / 10;
  } else if (current > 0) {
    rawProgress = 1;
    monthsCovered = targetMonths;
  }

  const progress = Math.min(1, Math.max(0, rawProgress));
  const holdsTarget = current >= targetMinor;

  return {
    progress,
    rawProgress,
    monthsCovered,
    targetMonths,
    targetMinor,
    currentMinor: current,
    holdsTarget,
  };
}

export interface AffordabilityState {
  currentBalanceMinor: number;
  savingsBalanceMinor: number;
  essentialMonthlyMinor: number;
  avgDailySpendMinor: number;
  safeToSpendInput: SafeToSpendInput;
  targetMonths?: number;
}

export interface AffordabilityResult {
  purchaseMinor: number;
  before: {
    runwayDays: number | null;
    safeToSpendTodayMinor: number;
    emergencyProgress: EmergencyFundProgress;
  };
  after: {
    runwayDays: number | null;
    safeToSpendTodayMinor: number;
    emergencyProgress: EmergencyFundProgress;
  };
  emergencyFundHolds: boolean;
  runwayDifferenceDays: number | null;
  safeToSpendDifferenceMinor: number;
}

/**
 * Evaluates the impact of a planned purchase on financial runway, safe-to-spend, and emergency fund buffer.
 * Pure and neutral.
 */
export function affordability(
  purchaseMinor: number,
  state: AffordabilityState
): AffordabilityResult {
  const purchase = Math.max(0, purchaseMinor);

  // Before metrics
  const beforeRunway = runwayDays(state.currentBalanceMinor, state.avgDailySpendMinor);
  const beforeSafe = safeToSpendToday(state.safeToSpendInput);
  const beforeEmergency = emergencyFundProgress(
    state.savingsBalanceMinor,
    state.essentialMonthlyMinor,
    state.targetMonths ?? 3
  );

  // After metrics (purchase reduces total liquid balance)
  const afterBalance = state.currentBalanceMinor - purchase;
  const afterRunway = runwayDays(afterBalance, state.avgDailySpendMinor);

  const afterSafeInput: SafeToSpendInput = {
    ...state.safeToSpendInput,
    currentBalanceMinor: afterBalance,
  };
  const afterSafe = safeToSpendToday(afterSafeInput);

  // If purchase depletes non-savings first, does it cut into emergency savings?
  // Liquid non-savings = currentBalance - savingsBalance
  const nonSavings = Math.max(0, state.currentBalanceMinor - state.savingsBalanceMinor);
  const savingsDepletion = Math.max(0, purchase - nonSavings);
  const afterSavings = Math.max(0, state.savingsBalanceMinor - savingsDepletion);

  const afterEmergency = emergencyFundProgress(
    afterSavings,
    state.essentialMonthlyMinor,
    state.targetMonths ?? 3
  );

  const runwayDifferenceDays =
    beforeRunway !== null && afterRunway !== null ? afterRunway - beforeRunway : null;

  const safeToSpendDifferenceMinor =
    afterSafe.safeToSpendTodayMinor - beforeSafe.safeToSpendTodayMinor;

  return {
    purchaseMinor: purchase,
    before: {
      runwayDays: beforeRunway,
      safeToSpendTodayMinor: beforeSafe.safeToSpendTodayMinor,
      emergencyProgress: beforeEmergency,
    },
    after: {
      runwayDays: afterRunway,
      safeToSpendTodayMinor: afterSafe.safeToSpendTodayMinor,
      emergencyProgress: afterEmergency,
    },
    emergencyFundHolds: afterEmergency.holdsTarget,
    runwayDifferenceDays,
    safeToSpendDifferenceMinor,
  };
}

