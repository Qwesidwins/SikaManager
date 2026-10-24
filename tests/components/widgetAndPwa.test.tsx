import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FinanceWidgetCard } from '@/features/simpleMvp/FinanceWidgetCard';
import type { Account, Category, Transaction } from '@/domain/types';

describe('Widget & PWA Installation Features', () => {
  const mockAccounts: Account[] = [
    {
      id: 'acc-cash',
      name: 'Cash in Hand',
      type: 'cash',
      currency: 'GHS',
      openingBalanceMinor: 200000,
      archived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'acc-momo',
      name: 'MTN MoMo',
      type: 'mobile_money',
      currency: 'GHS',
      openingBalanceMinor: 500000,
      archived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  const mockCategories: Category[] = [
    {
      id: 'cat-food',
      name: 'Food & Dining',
      icon: 'utensils',
      color: '#C9962B',
      kind: 'expense',
      sortOrder: 1,
      archived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  const mockTransactions: Transaction[] = [
    {
      id: 'tx-1',
      accountId: 'acc-cash',
      categoryId: 'cat-food',
      amountMinor: 15000,
      currency: 'GHS',
      type: 'expense',
      date: new Date().toISOString(),
      note: 'Dinner',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  it('renders contracted widget with Inflow, Outflow and Net Flow', () => {
    render(
      <FinanceWidgetCard
        monthLabel="October 2026"
        transactions={mockTransactions}
        accounts={mockAccounts}
        categories={mockCategories}
        totalIncomeMinor={50000} // GH₵ 500.00
        totalExpenseMinor={15000} // GH₵ 150.00
      />
    );

    expect(screen.getByText(/Live Cashflow Widget/i)).toBeInTheDocument();
    expect(screen.getByText('October 2026')).toBeInTheDocument();
    expect(screen.getByText('+GH₵ 500.00')).toBeInTheDocument();
    expect(screen.getByText('-GH₵ 150.00')).toBeInTheDocument();
    expect(screen.getByText('+GH₵ 350.00')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Expand/i })).toBeInTheDocument();
  });

  it('expands to show vital visualizations (cash flow ratio, top expenses, liquid assets)', () => {
    render(
      <FinanceWidgetCard
        monthLabel="October 2026"
        transactions={mockTransactions}
        accounts={mockAccounts}
        categories={mockCategories}
        totalIncomeMinor={50000}
        totalExpenseMinor={15000}
      />
    );

    const expandBtn = screen.getByRole('button', { name: /Expand/i });
    fireEvent.click(expandBtn);

    // Visualizations visible
    expect(screen.getByText(/Cash Flow Balance/i)).toBeInTheDocument();
    expect(screen.getByText(/Top Expenses This Period/i)).toBeInTheDocument();
    expect(screen.getByText('Food & Dining')).toBeInTheDocument();
    expect(screen.getByText(/Liquid Assets/i)).toBeInTheDocument();
    expect(screen.getByText('Cash in Hand')).toBeInTheDocument();
    expect(screen.getByText('MTN MoMo')).toBeInTheDocument();

    // Contract again
    const contractBtn = screen.getByRole('button', { name: /^Contract$/i });
    fireEvent.click(contractBtn);

    expect(screen.queryByText(/Cash Flow Balance/i)).toBeNull();
  });
});
