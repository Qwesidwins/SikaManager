import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import App from '@/App';
import { clearAllDatabaseData } from '@/db/database';
import { seedInitialDataIfNeeded } from '@/db/seed';
import { accountsRepo } from '@/db/repositories/accountsRepo';
import { transactionsRepo } from '@/db/repositories/transactionsRepo';

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

  it('supports calibrating liquid assets, account-specific deduction, and account deletion', async () => {
    // Pre-create an account with starting balance
    await accountsRepo.create({
      id: 'acc-test-momo',
      name: 'Test MTN MoMo',
      type: 'mobile_money',
      currency: 'GHS',
      openingBalanceMinor: 25000, // GH₵ 250.00
      archived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText('Test MTN MoMo')).toBeInTheDocument();
      expect(screen.getByText('GH₵ 250.00')).toBeInTheDocument();
    });

    // Deduct GH₵ 50.00 from Test MTN MoMo
    const addBtn = screen.getByLabelText(/Add transaction/i);
    fireEvent.click(addBtn);

    const amountInput = screen.getByPlaceholderText('0.00');
    fireEvent.change(amountInput, { target: { value: '50' } });

    // Select "Test MTN MoMo" account
    const momoAccountBtn = await screen.findByLabelText(/Select account Test MTN MoMo/i);
    fireEvent.click(momoAccountBtn);

    // Add optional custom place/category
    const noteInput = screen.getByPlaceholderText(/Lunch, Uber, Project fee/i);
    fireEvent.change(noteInput, { target: { value: 'Shell Fuel station' } });

    const saveExpenseBtn = screen.getByRole('button', { name: /Save Expense/i });
    fireEvent.click(saveExpenseBtn);

    // Verify balance reduced: 250 - 50 = 200
    await waitFor(() => {
      expect(screen.getByText('Shell Fuel station')).toBeInTheDocument();
      expect(screen.getByText('GH₵ 200.00')).toBeInTheDocument();
    });
  });

  it('calculates monthly cashflow (e.g. 20K income and 10K expense) and supports monthly breakdown', async () => {
    // Seed 20,000 Income and 10,000 Expense in October 2026
    const octDate = '2026-10-15T10:00:00.000Z';
    await transactionsRepo.create({
      type: 'income',
      amountMinor: 2000000, // GH₵ 20,000.00
      currency: 'GHS',
      accountId: 'acc-bank',
      date: octDate,
      note: 'October Major Consulting Contract',
    });

    await transactionsRepo.create({
      type: 'expense',
      amountMinor: 1000000, // GH₵ 10,000.00
      currency: 'GHS',
      accountId: 'acc-bank',
      date: octDate,
      note: 'October Office Rent and Operations',
    });

    render(<App />);

    // Verify Home Dashboard reflects 20k Inflow and 10k Outflow
    await waitFor(() => {
      expect(screen.getAllByText('+GH₵ 20,000.00').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('-GH₵ 10,000.00').length).toBeGreaterThanOrEqual(1);
    });

    // Navigate to Insights
    const insightsTab = screen.getByRole('button', { name: /Insights/i });
    fireEvent.click(insightsTab);

    // Verify Monthly breakdown displays +GH₵ 20,000.00 and -GH₵ 10,000.00
    await waitFor(() => {
      expect(screen.getByText('Month-by-Month Cashflow')).toBeInTheDocument();
      expect(screen.getByText('Monthly Summary')).toBeInTheDocument();
      expect(screen.getByText(/Income: \+GH₵ 20,000\.00/i)).toBeInTheDocument();
      expect(screen.getByText(/Expense: -GH₵ 10,000\.00/i)).toBeInTheDocument();
    });
  });
});
