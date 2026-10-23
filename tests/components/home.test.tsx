import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { HomeView } from '@/features/home/HomeView';
import {
  clearAllDatabaseData,
  seedInitialDataIfNeeded,
  transactionsRepo,
  budgetsRepo,
  accountsRepo,
  settingsRepo,
} from '@/db';

describe('Component: HomeView', () => {
  beforeEach(async () => {
    await clearAllDatabaseData();
    await seedInitialDataIfNeeded();

    // Create an account with balance
    await accountsRepo.create({
      id: 'acc-test-momo',
      name: 'MTN MoMo',
      type: 'mobile_money',
      currency: 'GHS',
      openingBalanceMinor: 100000, // 1000
      archived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Create a budget
    await budgetsRepo.create({
      id: 'b-food',
      categoryId: 'cat-food',
      period: 'month',
      limitMinor: 50000, // 500
      startsOn: '2026-03-01',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Create a transaction
    await transactionsRepo.create({
      id: 'tx-1',
      type: 'expense',
      amountMinor: 15000, // 150
      currency: 'GHS',
      accountId: 'acc-test-momo',
      categoryId: 'cat-food',
      date: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Set settings
    await settingsRepo.update({
      essentialMonthlyMinor: 50000,
      savingsTargetMinor: 100000,
      incomeMode: 'fixed',
    });
  });

  it('renders safe-to-spend hero card, total balance, runway, and active budgets', async () => {
    render(
      <HomeView
        onNavigateToBudgets={vi.fn()}
        onNavigateToBackup={vi.fn()}
        onNavigateToJournal={vi.fn()}
        onNavigateToActivity={vi.fn()}
        onOpenQuickAdd={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Safe to spend today/i)).toBeInTheDocument();
      expect(screen.getByText(/Active Budgets/i)).toBeInTheDocument();
      expect(screen.getByText('Food & Groceries')).toBeInTheDocument();
    });

    // Check budget readout: 150 / 500
    expect(screen.getByText(/150/)).toBeInTheDocument();
    expect(screen.getByText(/\/ 500/)).toBeInTheDocument();

    // Weekly insight should be rendered
    expect(screen.getByText(/Weekly Insight/i)).toBeInTheDocument();
  });

  it('shows and allows dismissing the backup warning banner', async () => {
    // Set last backup to 20 days ago
    const twentyDaysAgo = new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString();
    await settingsRepo.update({ lastBackupAt: twentyDaysAgo });

    render(
      <HomeView
        onNavigateToBudgets={vi.fn()}
        onNavigateToBackup={vi.fn()}
        onNavigateToJournal={vi.fn()}
        onNavigateToActivity={vi.fn()}
        onOpenQuickAdd={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/Last backup was/i)).toBeInTheDocument();
      expect(screen.getByText(/20 days ago/i)).toBeInTheDocument();
    });

    // Dismiss banner
    const dismissBtn = screen.getByRole('button', { name: /dismiss banner/i });
    fireEvent.click(dismissBtn);

    await waitFor(() => {
      expect(screen.queryByText(/Last backup was/i)).not.toBeInTheDocument();
    });
  });
});

