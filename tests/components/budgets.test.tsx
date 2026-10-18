import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { BudgetsView } from '@/features/budgets/BudgetsView';
import {
  clearAllDatabaseData,
  seedInitialDataIfNeeded,
  budgetsRepo,
  transactionsRepo,
} from '@/db';

describe('Component: BudgetsView', () => {
  beforeEach(async () => {
    await clearAllDatabaseData();
    await seedInitialDataIfNeeded();

    await budgetsRepo.create({
      id: 'b-food',
      categoryId: 'cat-food',
      period: 'month',
      limitMinor: 20000, // 200
      startsOn: '2026-03-01',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await transactionsRepo.create({
      id: 'tx-food',
      type: 'expense',
      amountMinor: 25000, // 250 (over by 50)
      currency: 'GHS',
      accountId: 'acc-momo',
      categoryId: 'cat-food',
      date: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });

  it('renders budgets list and identifies over-budget status in warm style', async () => {
    render(<BudgetsView onOpenQuickAdd={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Food & Groceries')).toBeInTheDocument();
      expect(screen.getByText(/Over by GH₵ 50\.00/i)).toBeInTheDocument();
    });
  });

  it('creates a new budget through modal form', async () => {
    render(<BudgetsView onOpenQuickAdd={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Food & Groceries')).toBeInTheDocument();
    });

    // Click Add Budget
    const addBtn = screen.getByRole('button', { name: /add budget/i });
    fireEvent.click(addBtn);

    // Enter limit "300"
    const limitInput = screen.getByPlaceholderText(/e\.g\. 500/i);
    fireEvent.change(limitInput, { target: { value: '300' } });

    // Click Save
    const saveBtn = screen.getByRole('button', { name: 'Save' });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.queryByPlaceholderText(/e\.g\. 500/i)).not.toBeInTheDocument();
    });

    const allBudgets = await budgetsRepo.getAll();
    expect(allBudgets.length).toBeGreaterThanOrEqual(2);
  });
});
