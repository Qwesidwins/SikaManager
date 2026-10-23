import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '@/App';
import { clearAllDatabaseData } from '@/db/database';
import { seedInitialDataIfNeeded } from '@/db/seed';

describe('Simple MVP: Core Financial Flow & Visual Analytics', () => {
  beforeEach(async () => {
    await clearAllDatabaseData();
    await seedInitialDataIfNeeded();
  });

  it('allows logging an expense and an income, and updates balance & list', async () => {
    render(<App />);

    // Wait for App to load
    await waitFor(() => {
      expect(screen.getByText('SikaManger')).toBeInTheDocument();
      expect(screen.getByText('Total Balance')).toBeInTheDocument();
    });

    // 1. Add Income of GH₵ 500.00
    const addBtn = screen.getByLabelText(/Add transaction/i);
    fireEvent.click(addBtn);

    expect(screen.getByText('Add Expense')).toBeInTheDocument();

    // Toggle to Income in modal
    const incomeToggles = screen.getAllByRole('button', { name: /income/i });
    fireEvent.click(incomeToggles[incomeToggles.length - 1]!);

    // Enter 500
    const amountInput = screen.getByPlaceholderText('0.00');
    fireEvent.change(amountInput, { target: { value: '500' } });

    // Enter Note
    const noteInput = screen.getByPlaceholderText(/Lunch, Uber, Project fee/i);
    fireEvent.change(noteInput, { target: { value: 'Design client payout' } });

    // Submit
    const submitBtn = screen.getByRole('button', { name: /Save Income/i });
    fireEvent.click(submitBtn);

    // Verify Inflow updated
    await waitFor(() => {
      expect(screen.getByText('Design client payout')).toBeInTheDocument();
      expect(screen.getAllByText('+GH₵ 500.00').length).toBeGreaterThanOrEqual(1);
    });

    // 2. Add Expense of GH₵ 120.00
    fireEvent.click(addBtn);
    const expenseAmountInput = screen.getByPlaceholderText('0.00');
    fireEvent.change(expenseAmountInput, { target: { value: '120' } });

    const expenseNoteInput = screen.getByPlaceholderText(/Lunch, Uber, Project fee/i);
    fireEvent.change(expenseNoteInput, { target: { value: 'Groceries and veggies' } });

    const saveExpenseBtn = screen.getByRole('button', { name: /Save Expense/i });
    fireEvent.click(saveExpenseBtn);

    // Verify Expense and Net Balance: 500 - 120 = 380
    await waitFor(() => {
      expect(screen.getByText('Groceries and veggies')).toBeInTheDocument();
      expect(screen.getAllByText('-GH₵ 120.00').length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText('380.00')).toBeInTheDocument();
    });
  });

  it('navigates to Insights & Analytics and renders visual stats and chart components', async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('SikaManger')).toBeInTheDocument();
    });

    // Navigate to Insights tab
    const insightsTab = screen.getByRole('button', { name: /Insights/i });
    fireEvent.click(insightsTab);

    await waitFor(() => {
      expect(screen.getByText('Insights & Analytics')).toBeInTheDocument();
      expect(screen.getByText('Total Inflow')).toBeInTheDocument();
      expect(screen.getByText('Total Outflow')).toBeInTheDocument();
      expect(screen.getByText('Net Savings')).toBeInTheDocument();
    });
  });
});
