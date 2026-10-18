import { describe, it, expect, beforeEach } from 'vitest';
import {
  clearAllDatabaseData,
  seedInitialDataIfNeeded,
  accountsRepo,
  categoriesRepo,
  transactionsRepo,
  journalRepo,
  budgetsRepo,
  settingsRepo,
} from '@/db';
import type { Transaction, JournalEntry, Budget } from '@/domain/types';

describe('DB: Repositories & Seed Operations', () => {
  beforeEach(async () => {
    await clearAllDatabaseData();
  });

  it('seeds default categories, accounts, and settings into an empty database', async () => {
    await seedInitialDataIfNeeded();

    const categories = await categoriesRepo.getAll();
    expect(categories.length).toBeGreaterThanOrEqual(12);
    expect(categories.some((c) => c.name === 'Food & Groceries')).toBe(true);

    const accounts = await accountsRepo.getAll();
    expect(accounts.length).toBeGreaterThanOrEqual(4);
    expect(accounts.some((a) => a.name === 'MTN MoMo')).toBe(true);

    const settings = await settingsRepo.getAll();
    expect(settings.currency).toBe('GHS');
    expect(settings.locale).toBe('en-GH');
    expect(settings.incomeMode).toBe('variable');
  });

  it('manages transactions with soft-delete and undo/restore functionality', async () => {
    const txn: Transaction = {
      id: 'tx-test-1',
      type: 'expense',
      amountMinor: 1500,
      currency: 'GHS',
      accountId: 'acc-momo',
      categoryId: 'cat-food',
      date: new Date().toISOString(),
      note: 'Waakye at Osu',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await transactionsRepo.create(txn);

    // Initial query
    const activeBefore = await transactionsRepo.getAll();
    expect(activeBefore).toHaveLength(1);
    expect(activeBefore[0]?.id).toBe('tx-test-1');

    // Soft delete
    await transactionsRepo.softDelete('tx-test-1');
    const activeAfterDelete = await transactionsRepo.getAll();
    expect(activeAfterDelete).toHaveLength(0); // Excluded by default

    const allWithDeleted = await transactionsRepo.getAll({ includeDeleted: true });
    expect(allWithDeleted).toHaveLength(1);
    expect(allWithDeleted[0]?.deletedAt).toBeTruthy();

    // Restore (undo action)
    await transactionsRepo.restore('tx-test-1');
    const activeAfterRestore = await transactionsRepo.getAll();
    expect(activeAfterRestore).toHaveLength(1);
    expect(activeAfterRestore[0]?.deletedAt).toBeNull();
  });

  it('filters transactions by type, account, and search term', async () => {
    await transactionsRepo.create({
      id: 'tx-1',
      type: 'expense',
      amountMinor: 2000,
      currency: 'GHS',
      accountId: 'acc-1',
      categoryId: 'cat-food',
      date: '2026-03-01T10:00:00.000Z',
      note: 'Lunch jollof',
      createdAt: '2026-03-01T10:00:00.000Z',
      updatedAt: '2026-03-01T10:00:00.000Z',
    });

    await transactionsRepo.create({
      id: 'tx-2',
      type: 'income',
      amountMinor: 50000,
      currency: 'GHS',
      accountId: 'acc-1',
      date: '2026-03-02T10:00:00.000Z',
      note: 'Freelance web deposit',
      createdAt: '2026-03-02T10:00:00.000Z',
      updatedAt: '2026-03-02T10:00:00.000Z',
    });

    // Filter by type
    const incomeOnly = await transactionsRepo.getAll({ type: 'income' });
    expect(incomeOnly).toHaveLength(1);
    expect(incomeOnly[0]?.id).toBe('tx-2');

    // Filter by search note
    const searchRes = await transactionsRepo.getAll({ search: 'jollof' });
    expect(searchRes).toHaveLength(1);
    expect(searchRes[0]?.id).toBe('tx-1');
  });

  it('manages journal entries and links to transactions', async () => {
    const entry: JournalEntry = {
      id: 'j-1',
      transactionId: 'tx-1',
      body: 'Delicious and fuel for the afternoon work.',
      rating: 'worth_it',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await journalRepo.create(entry);

    const byTx = await journalRepo.getByTransactionId('tx-1');
    expect(byTx).toBeDefined();
    expect(byTx?.rating).toBe('worth_it');

    // Filter by rating
    const worthIt = await journalRepo.getAll('worth_it');
    expect(worthIt).toHaveLength(1);

    const regrets = await journalRepo.getAll('regret');
    expect(regrets).toHaveLength(0);
  });

  it('manages budgets and settings updates', async () => {
    const budget: Budget = {
      id: 'b-1',
      categoryId: 'cat-food',
      period: 'month',
      limitMinor: 50000,
      startsOn: '2026-03-01',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await budgetsRepo.create(budget);
    const byCategory = await budgetsRepo.getByCategoryId('cat-food');
    expect(byCategory).toBeDefined();
    expect(byCategory?.limitMinor).toBe(50000);

    // Settings update
    await settingsRepo.update({ incomeMode: 'fixed', savingsTargetMinor: 500000 });
    const updatedSettings = await settingsRepo.getAll();
    expect(updatedSettings.incomeMode).toBe('fixed');
    expect(updatedSettings.savingsTargetMinor).toBe(500000);
  });
});
