import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { InsightsView } from '@/features/insights/InsightsView';
import {
  clearAllDatabaseData,
  seedInitialDataIfNeeded,
  transactionsRepo,
  journalRepo,
} from '@/db';

describe('Component: InsightsView', () => {
  beforeEach(async () => {
    await clearAllDatabaseData();
    await seedInitialDataIfNeeded();

    await transactionsRepo.create({
      id: 'tx-food',
      type: 'expense',
      amountMinor: 30000, // 300
      currency: 'GHS',
      accountId: 'acc-momo',
      categoryId: 'cat-food',
      date: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await transactionsRepo.create({
      id: 'tx-client',
      type: 'income',
      amountMinor: 200000, // 2000
      currency: 'GHS',
      accountId: 'acc-bank',
      date: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  });

  it('renders affordability simulator and updates on input change', async () => {
    render(<InsightsView onShowToast={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/Affordability Check/i)).toBeInTheDocument();
      expect(screen.getByText(/Spending by Category/i)).toBeInTheDocument();
      expect(screen.getByText(/6-Month Cash Flow/i)).toBeInTheDocument();
      expect(screen.getByText(/Savings Projection/i)).toBeInTheDocument();
    });

    // Update purchase amount to 500
    const amountInput = screen.getByPlaceholderText('Amount');
    fireEvent.change(amountInput, { target: { value: '500' } });

    await waitFor(() => {
      expect(amountInput).toHaveValue('500');
    });
  });

  it('triggers 48-hour decision reminder and adds a note to Journal', async () => {
    const onShowToast = vi.fn();
    render(<InsightsView onShowToast={onShowToast} />);

    await waitFor(() => {
      expect(screen.getByText(/Wait 48 hours reminder/i)).toBeInTheDocument();
    });

    // Toggle 48-hour button
    const toggleBtn = screen.getByRole('button', { name: /toggle 48-hour reminder/i });
    fireEvent.click(toggleBtn);

    await waitFor(() => {
      expect(onShowToast).toHaveBeenCalledWith(expect.stringContaining('48-hour'));
    });

    const entries = await journalRepo.getAll();
    expect(entries.some((e) => e.body.includes('48 hours'))).toBe(true);
  });
});
