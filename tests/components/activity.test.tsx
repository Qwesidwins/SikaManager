import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ActivityView } from '@/features/transactions/ActivityView';
import { clearAllDatabaseData, seedInitialDataIfNeeded, transactionsRepo } from '@/db';

describe('Component: ActivityView', () => {
  beforeEach(async () => {
    await clearAllDatabaseData();
    await seedInitialDataIfNeeded();

    // Create fixture transactions
    await transactionsRepo.create({
      id: 'tx-waakye',
      type: 'expense',
      amountMinor: 1500,
      currency: 'GHS',
      accountId: 'acc-momo',
      categoryId: 'cat-food',
      date: new Date().toISOString(),
      note: 'Waakye at lunch',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await transactionsRepo.create({
      id: 'tx-uber',
      type: 'expense',
      amountMinor: 3200,
      currency: 'GHS',
      accountId: 'acc-momo',
      categoryId: 'cat-transport',
      date: new Date().toISOString(),
      note: 'Uber ride',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await transactionsRepo.create({
      id: 'tx-income',
      type: 'income',
      amountMinor: 300000,
      currency: 'GHS',
      accountId: 'acc-bank',
      date: new Date().toISOString(),
      note: 'Freelance design client payout',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });

  it('renders transactions grouped with daily totals and running balance', async () => {
    render(<ActivityView onOpenQuickAdd={vi.fn()} onShowToast={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Waakye at lunch')).toBeInTheDocument();
      expect(screen.getByText('Uber ride')).toBeInTheDocument();
      expect(screen.getByText('Freelance design client payout')).toBeInTheDocument();
    });

    // Check inflow and outflow
    expect(screen.getAllByText(/\+GH₵ 3,000\.00/)[0]).toBeInTheDocument();
    expect(screen.getByText(/-GH₵ 47\.00/)).toBeInTheDocument();
  });

  it('filters activity by search keyword', async () => {
    render(<ActivityView onOpenQuickAdd={vi.fn()} onShowToast={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('Waakye at lunch')).toBeInTheDocument();
    });

    // Open search
    const searchBtn = screen.getByRole('button', { name: /search transactions/i });
    fireEvent.click(searchBtn);

    const searchInput = screen.getByPlaceholderText(/search merchants/i);
    fireEvent.change(searchInput, { target: { value: 'Waakye' } });

    await waitFor(() => {
      expect(screen.getByText('Waakye at lunch')).toBeInTheDocument();
      expect(screen.queryByText('Uber ride')).not.toBeInTheDocument();
    });
  });

  it('allows soft-deleting a transaction with undo trigger', async () => {
    const onShowToast = vi.fn();
    render(<ActivityView onOpenQuickAdd={vi.fn()} onShowToast={onShowToast} />);

    await waitFor(() => {
      expect(screen.getByText('Waakye at lunch')).toBeInTheDocument();
    });

    // Click delete on the first row
    const deleteButtons = screen.getAllByRole('button', { name: /delete transaction/i });
    fireEvent.click(deleteButtons[0]!);

    await waitFor(() => {
      expect(onShowToast).toHaveBeenCalledWith('Transaction deleted', expect.any(Function));
    });
  });
});
