import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { JournalView } from '@/features/journal/JournalView';
import { clearAllDatabaseData, seedInitialDataIfNeeded, journalRepo, transactionsRepo } from '@/db';

describe('Component: JournalView', () => {
  beforeEach(async () => {
    await clearAllDatabaseData();
    await seedInitialDataIfNeeded();

    // Create a transaction
    await transactionsRepo.create({
      id: 'tx-waakye',
      type: 'expense',
      amountMinor: 1500,
      currency: 'GHS',
      accountId: 'acc-momo',
      categoryId: 'cat-food',
      date: new Date().toISOString(),
      note: 'Waakye with colleagues',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Create a linked reflection
    await journalRepo.create({
      id: 'j-1',
      transactionId: 'tx-waakye',
      body: 'Shared lunch with Ama and Kwesi. Great conversation.',
      rating: 'worth_it',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Create a regret reflection
    await journalRepo.create({
      id: 'j-2',
      body: 'Late night snack delivery was unnecessary.',
      rating: 'regret',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      updatedAt: new Date(Date.now() - 3600000).toISOString(),
    });
  });

  it('renders reflections feed and filters by rating chips', async () => {
    render(<JournalView onOpenQuickAdd={vi.fn()} onShowToast={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/Shared lunch with Ama/i)).toBeInTheDocument();
      expect(screen.getByText(/Late night snack delivery/i)).toBeInTheDocument();
    });

    // Filter to "Worth it"
    const worthItFilter = screen.getByRole('button', { name: /worth it/i });
    fireEvent.click(worthItFilter);

    await waitFor(() => {
      expect(screen.getByText(/Shared lunch with Ama/i)).toBeInTheDocument();
      expect(screen.queryByText(/Late night snack delivery/i)).not.toBeInTheDocument();
    });
  });

  it('allows writing a standalone reflection without a transaction', async () => {
    render(<JournalView onOpenQuickAdd={vi.fn()} onShowToast={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(/Shared lunch with Ama/i)).toBeInTheDocument();
    });

    // Click "+ Write"
    const writeBtn = screen.getByRole('button', { name: /\+ write/i });
    fireEvent.click(writeBtn);

    // Type text in textarea
    const textarea = screen.getByPlaceholderText(/I wanted to buy the new headphone/i);
    fireEvent.change(textarea, { target: { value: 'Resisted buying an impulse gadget today!' } });

    // Save
    const saveBtn = screen.getByRole('button', { name: 'Save' });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByText(/Resisted buying an impulse gadget today!/i)).toBeInTheDocument();
    });

    const entries = await journalRepo.getAll();
    expect(entries.some((e) => e.body.includes('Resisted buying an impulse gadget'))).toBe(true);
  });
});

