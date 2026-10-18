import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QuickAddSheet } from '@/features/quickAdd/QuickAddSheet';
import { clearAllDatabaseData, seedInitialDataIfNeeded, transactionsRepo, journalRepo } from '@/db';

describe('Component: QuickAddSheet', () => {
  beforeEach(async () => {
    await clearAllDatabaseData();
    await seedInitialDataIfNeeded();
  });

  it('renders keypad and logs a transaction in seconds', async () => {
    const onSaved = vi.fn();
    const onClose = vi.fn();

    const startTime = performance.now();

    render(<QuickAddSheet isOpen={true} onClose={onClose} onSaved={onSaved} />);

    // Wait for categories to load
    await waitFor(() => {
      expect(screen.getByText('Food & Groceries')).toBeInTheDocument();
    });

    // Enter amount "15" on numeric keypad
    const key1 = screen.getByRole('button', { name: '1' });
    const key5 = screen.getByRole('button', { name: '5' });
    fireEvent.click(key1);
    fireEvent.click(key5);

    // Click Save button
    const saveBtn = screen.getByRole('button', { name: /save gh/i });
    expect(saveBtn).not.toBeDisabled();
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(onSaved).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });

    const elapsedMs = performance.now() - startTime;
    // Verify fast operation target (under 5000ms)
    expect(elapsedMs).toBeLessThan(5000);

    // Verify persisted in Dexie
    const txns = await transactionsRepo.getAll();
    expect(txns).toHaveLength(1);
    expect(txns[0]?.amountMinor).toBe(1500); // GH₵ 15.00
    expect(txns[0]?.type).toBe('expense');
  });

  it('saves an emotional reflection when "Reflect on this purchase" is toggled', async () => {
    const onSaved = vi.fn();
    const onClose = vi.fn();

    render(<QuickAddSheet isOpen={true} onClose={onClose} onSaved={onSaved} />);

    await waitFor(() => {
      expect(screen.getByText('Food & Groceries')).toBeInTheDocument();
    });

    // Enter amount "20"
    fireEvent.click(screen.getByRole('button', { name: '2' }));
    fireEvent.click(screen.getByRole('button', { name: '0' }));

    // Toggle reflection
    const reflectToggle = screen.getByRole('button', { name: /toggle reflection/i });
    fireEvent.click(reflectToggle);

    // Select "Worth it"
    const worthItBtn = await screen.findByRole('button', { name: /worth it/i });
    fireEvent.click(worthItBtn);

    // Save
    const saveBtn = screen.getByRole('button', { name: /save gh/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(onSaved).toHaveBeenCalled();
    });

    // Verify transaction and linked journal entry
    const txns = await transactionsRepo.getAll();
    expect(txns).toHaveLength(1);
    const journals = await journalRepo.getAll();
    expect(journals).toHaveLength(1);
    expect(journals[0]?.transactionId).toBe(txns[0]?.id);
    expect(journals[0]?.rating).toBe('worth_it');
  });
});
