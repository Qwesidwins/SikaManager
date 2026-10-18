export interface SavingsProjectionScheduleItem {
  month: number;
  principalMinor: number;
  totalContributedMinor: number;
  interestEarnedMinor: number;
  balanceMinor: number;
}

export interface SavingsProjectionResult {
  finalBalanceMinor: number;
  totalContributionsMinor: number;
  totalInterestMinor: number;
  schedule: SavingsProjectionScheduleItem[];
}

/**
 * Calculates compound future value projection:
 * - principalMinor: initial lump sum in minor units
 * - monthlyContributionMinor: regular deposit added each month
 * - annualRatePercent: e.g. 15 for 15% per annum
 * - months: total projection horizon in months
 *
 * Uses monthly compounding: monthlyRate = (annualRatePercent / 100) / 12.
 * Contribution is compounded from the end of each month (annuity ordinary).
 * Returns integer minor units with zero hidden assumptions.
 */
export function savingsProjection(
  principalMinor: number,
  monthlyContributionMinor: number,
  annualRatePercent: number,
  months: number
): SavingsProjectionResult {
  const principal = Math.max(0, Math.round(principalMinor));
  const contribution = Math.max(0, Math.round(monthlyContributionMinor));
  const durationMonths = Math.max(0, Math.round(months));
  const monthlyRate = Math.max(0, annualRatePercent) / 100 / 12;

  let currentBalance = principal;
  let totalContributed = principal;
  const schedule: SavingsProjectionScheduleItem[] = [];

  for (let m = 1; m <= durationMonths; m++) {
    const interest = currentBalance * monthlyRate;
    currentBalance = currentBalance + interest + contribution;
    totalContributed += contribution;

    schedule.push({
      month: m,
      principalMinor: principal,
      totalContributedMinor: Math.round(totalContributed),
      interestEarnedMinor: Math.round(currentBalance - totalContributed),
      balanceMinor: Math.round(currentBalance),
    });
  }

  const finalBalanceMinor = Math.round(currentBalance);
  const totalContributionsMinor = Math.round(totalContributed);
  const totalInterestMinor = Math.max(0, finalBalanceMinor - totalContributionsMinor);

  return {
    finalBalanceMinor,
    totalContributionsMinor,
    totalInterestMinor,
    schedule,
  };
}
