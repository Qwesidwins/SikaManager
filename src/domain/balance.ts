import type { Account, Transaction } from './types';

/**
 * Calculates the current derived balance of a specific account in minor units.
 * Formula: openingBalance + income - expenses + transfers_in - transfers_out.
 * Excludes soft-deleted transactions (deletedAt != null).
 */
export function accountBalance(account: Account, transactions: Transaction[]): number {
  let balance = account.openingBalanceMinor;

  for (const txn of transactions) {
    if (txn.deletedAt) continue;

    if (txn.accountId === account.id) {
      if (txn.type === 'income') {
        balance += txn.amountMinor;
      } else if (txn.type === 'expense') {
        balance -= txn.amountMinor;
      } else if (txn.type === 'transfer') {
        balance -= txn.amountMinor; // Money leaving this account
      }
    } else if (txn.type === 'transfer' && txn.transferAccountId === account.id) {
      balance += txn.amountMinor; // Money entering this account
    }
  }

  return balance;
}

export interface TotalBalanceResult {
  hasMixedCurrencies: boolean;
  primaryCurrency: string;
  totalMinor: number; // Sum of non-archived accounts in the primary currency
  byCurrency: Record<string, number>;
}

/**
 * Calculates the total balance across all non-archived accounts.
 * In v1, mixed currencies are not summed together blindly;
 * hasMixedCurrencies will be true and byCurrency details each currency total.
 */
export function totalBalance(
  accounts: Account[],
  transactions: Transaction[],
  preferredCurrency = 'GHS'
): TotalBalanceResult {
  const activeAccounts = accounts.filter((a) => !a.archived);
  const byCurrency: Record<string, number> = {};

  for (const acc of activeAccounts) {
    const bal = accountBalance(acc, transactions);
    const curr = acc.currency || preferredCurrency;
    byCurrency[curr] = (byCurrency[curr] ?? 0) + bal;
  }

  const currencies = Object.keys(byCurrency);
  const hasMixedCurrencies = currencies.length > 1;
  const primaryCurrency = currencies.includes(preferredCurrency)
    ? preferredCurrency
    : (currencies[0] ?? preferredCurrency);

  const totalMinor = byCurrency[primaryCurrency] ?? 0;

  return {
    hasMixedCurrencies,
    primaryCurrency,
    totalMinor,
    byCurrency,
  };
}

