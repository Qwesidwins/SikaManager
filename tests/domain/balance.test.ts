import { describe, it, expect } from 'vitest';
import { accountBalance, totalBalance } from '@/domain/balance';
import type { Account, Transaction } from '@/domain/types';

describe('Domain: Balance', () => {
  const mockAccount1: Account = {
    id: 'acc-1',
    name: 'MTN MoMo',
    type: 'mobile_money',
    currency: 'GHS',
    openingBalanceMinor: 5000, // 50.00
    archived: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  const mockAccount2: Account = {
    id: 'acc-2',
    name: 'CalBank',
    type: 'bank',
    currency: 'GHS',
    openingBalanceMinor: 20000, // 200.00
    archived: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };

  it('calculates balance with opening balance + income - expenses', () => {
    const transactions: Transaction[] = [
      {
        id: 'tx-1',
        type: 'income',
        amountMinor: 10000,
        currency: 'GHS',
        accountId: 'acc-1',
        date: '2026-01-02T10:00:00.000Z',
        createdAt: '2026-01-02T10:00:00.000Z',
        updatedAt: '2026-01-02T10:00:00.000Z',
      },
      {
        id: 'tx-2',
        type: 'expense',
        amountMinor: 3000,
        currency: 'GHS',
        accountId: 'acc-1',
        date: '2026-01-03T10:00:00.000Z',
        createdAt: '2026-01-03T10:00:00.000Z',
        updatedAt: '2026-01-03T10:00:00.000Z',
      },
    ];

    // 5000 + 10000 - 3000 = 12000
    expect(accountBalance(mockAccount1, transactions)).toBe(12000);
  });

  it('handles transfers affecting two accounts properly', () => {
    const transferTx: Transaction = {
      id: 'tx-transfer',
      type: 'transfer',
      amountMinor: 4000,
      currency: 'GHS',
      accountId: 'acc-1', // Source
      transferAccountId: 'acc-2', // Destination
      date: '2026-01-04T12:00:00.000Z',
      createdAt: '2026-01-04T12:00:00.000Z',
      updatedAt: '2026-01-04T12:00:00.000Z',
    };

    // acc-1 loses 4000: 5000 - 4000 = 1000
    expect(accountBalance(mockAccount1, [transferTx])).toBe(1000);

    // acc-2 gains 4000: 20000 + 4000 = 24000
    expect(accountBalance(mockAccount2, [transferTx])).toBe(24000);
  });

  it('strictly excludes soft-deleted transactions', () => {
    const transactions: Transaction[] = [
      {
        id: 'tx-1',
        type: 'income',
        amountMinor: 5000,
        currency: 'GHS',
        accountId: 'acc-1',
        date: '2026-01-02T10:00:00.000Z',
        createdAt: '2026-01-02T10:00:00.000Z',
        updatedAt: '2026-01-02T10:00:00.000Z',
      },
      {
        id: 'tx-deleted',
        type: 'expense',
        amountMinor: 2000,
        currency: 'GHS',
        accountId: 'acc-1',
        date: '2026-01-02T12:00:00.000Z',
        createdAt: '2026-01-02T12:00:00.000Z',
        updatedAt: '2026-01-02T12:00:00.000Z',
        deletedAt: '2026-01-02T13:00:00.000Z', // Deleted!
      },
    ];

    // 5000 + 5000 = 10000 (deleted 2000 is ignored)
    expect(accountBalance(mockAccount1, transactions)).toBe(10000);
  });

  it('handles negative balance without breaking', () => {
    const overdraftTx: Transaction = {
      id: 'tx-overdraft',
      type: 'expense',
      amountMinor: 8000,
      currency: 'GHS',
      accountId: 'acc-1',
      date: '2026-01-05T12:00:00.000Z',
      createdAt: '2026-01-05T12:00:00.000Z',
      updatedAt: '2026-01-05T12:00:00.000Z',
    };

    // 5000 - 8000 = -3000
    expect(accountBalance(mockAccount1, [overdraftTx])).toBe(-3000);
  });

  it('computes total balance and excludes archived accounts', () => {
    const archivedAccount: Account = {
      id: 'acc-old',
      name: 'Old Cash',
      type: 'cash',
      currency: 'GHS',
      openingBalanceMinor: 10000,
      archived: true,
      createdAt: '2025-01-01T00:00:00.000Z',
      updatedAt: '2025-01-01T00:00:00.000Z',
    };

    const res = totalBalance([mockAccount1, mockAccount2, archivedAccount], [], 'GHS');
    expect(res.hasMixedCurrencies).toBe(false);
    expect(res.totalMinor).toBe(25000); // 5000 + 20000 (archived excluded)
  });

  it('flags mixed currencies and provides per-currency breakdowns', () => {
    const usdAccount: Account = {
      id: 'acc-usd',
      name: 'USD Domiciliary',
      type: 'bank',
      currency: 'USD',
      openingBalanceMinor: 10000, // $100.00
      archived: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };

    const res = totalBalance([mockAccount1, usdAccount], [], 'GHS');
    expect(res.hasMixedCurrencies).toBe(true);
    expect(res.primaryCurrency).toBe('GHS');
    expect(res.totalMinor).toBe(5000);
    expect(res.byCurrency['GHS']).toBe(5000);
    expect(res.byCurrency['USD']).toBe(10000);
  });

  it('uses first available currency when preferred currency has no accounts', () => {
    const usdAccount: Account = {
      id: 'acc-usd-only',
      name: 'USD Account',
      type: 'bank',
      currency: 'USD',
      openingBalanceMinor: 20000,
      archived: false,
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
    };

    const res = totalBalance([usdAccount], [], 'EUR');
    expect(res.primaryCurrency).toBe('USD');
    expect(res.totalMinor).toBe(20000);
  });
});
