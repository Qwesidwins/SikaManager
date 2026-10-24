import React, { useState } from 'react';
import { formatMinor } from '@/domain/money';
import { triggerHaptic } from '@/lib/haptics';
import type { Transaction, Account, Category } from '@/domain/types';
import {
  ChevronDown,
  ChevronUp,
  TrendingUp,
  ArrowUpRight,
  ArrowDownLeft,
  PieChart as PieIcon,
  Wallet,
  Landmark,
  Smartphone,
  ShieldCheck,
} from 'lucide-react';

interface FinanceWidgetCardProps {
  monthLabel: string;
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  totalIncomeMinor: number;
  totalExpenseMinor: number;
}

export const FinanceWidgetCard: React.FC<FinanceWidgetCardProps> = ({
  monthLabel,
  transactions,
  accounts,
  categories,
  totalIncomeMinor,
  totalExpenseMinor,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const netMinor = totalIncomeMinor - totalExpenseMinor;
  const isPositive = netMinor >= 0;

  // Percentage calculations
  const totalFlow = totalIncomeMinor + totalExpenseMinor;
  const incomePercent = totalFlow > 0 ? Math.round((totalIncomeMinor / totalFlow) * 100) : 50;
  const expensePercent = totalFlow > 0 ? Math.round((totalExpenseMinor / totalFlow) * 100) : 50;
  const savingsRate = totalIncomeMinor > 0 ? Math.max(0, Math.round((netMinor / totalIncomeMinor) * 100)) : 0;

  // Category spending breakdown for top categories
  const categoryMap = new Map(categories.map((c) => [c.id, c]));
  const catTotals = new Map<string, number>();

  for (const t of transactions) {
    if (t.type === 'expense' && t.categoryId && !t.deletedAt) {
      catTotals.set(t.categoryId, (catTotals.get(t.categoryId) ?? 0) + t.amountMinor);
    }
  }

  const topCategories = Array.from(catTotals.entries())
    .map(([catId, amountMinor]) => ({
      name: categoryMap.get(catId)?.name || 'General',
      amountMinor,
      percent: totalExpenseMinor > 0 ? Math.round((amountMinor / totalExpenseMinor) * 100) : 0,
    }))
    .sort((a, b) => b.amountMinor - a.amountMinor)
    .slice(0, 3);

  function toggleExpand() {
    triggerHaptic();
    setIsExpanded((prev) => !prev);
  }

  function getAccountIcon(type: string) {
    switch (type) {
      case 'mobile_money':
        return <Smartphone className="w-3.5 h-3.5 text-emerald-600" />;
      case 'bank':
        return <Landmark className="w-3.5 h-3.5 text-blue-600" />;
      case 'savings':
        return <ShieldCheck className="w-3.5 h-3.5 text-violet-600" />;
      default:
        return <Wallet className="w-3.5 h-3.5 text-amber-600" />;
    }
  }

  return (
    <div className="rounded-[24px] bg-surface-container-lowest border border-outline-variant/30 shadow-[0_4px_20px_-2px_rgba(20,33,61,0.05)] overflow-hidden transition-all duration-300">
      {/* Contracted / Always-Visible Widget Top Section */}
      <div className="p-4 sm:p-5">
        <div className="flex items-center justify-between pb-3 border-b border-outline-variant/15">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#ffc657] animate-pulse" />
            <span className="text-[11px] font-bold tracking-wider uppercase text-on-surface-variant">
              Live Cashflow Widget
            </span>
            <span className="text-[10px] bg-surface-container-low text-on-surface-variant font-medium px-2 py-0.5 rounded-full">
              {monthLabel}
            </span>
          </div>

          <button
            type="button"
            onClick={toggleExpand}
            className="text-xs font-semibold text-secondary hover:text-primary flex items-center gap-1 px-2.5 py-1 rounded-xl bg-surface-container-low hover:bg-surface-container transition-all"
          >
            <span>{isExpanded ? 'Contract' : 'Expand'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Contracted 3-Metric Bar */}
        <div className="grid grid-cols-3 gap-2 pt-3 text-center">
          {/* Income */}
          <div className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-100 flex flex-col justify-center">
            <div className="flex items-center justify-center gap-1 text-[10px] font-semibold text-emerald-700 uppercase">
              <ArrowDownLeft className="w-3 h-3" />
              <span>Inflow</span>
            </div>
            <span className="text-xs sm:text-sm font-bold text-emerald-800 tabular-nums mt-0.5">
              +{formatMinor(totalIncomeMinor, 'GHS')}
            </span>
          </div>

          {/* Expense */}
          <div className="p-2.5 rounded-xl bg-red-50/70 border border-red-100 flex flex-col justify-center">
            <div className="flex items-center justify-center gap-1 text-[10px] font-semibold text-red-700 uppercase">
              <ArrowUpRight className="w-3 h-3" />
              <span>Outflow</span>
            </div>
            <span className="text-xs sm:text-sm font-bold text-red-800 tabular-nums mt-0.5">
              -{formatMinor(totalExpenseMinor, 'GHS')}
            </span>
          </div>

          {/* Net Flow */}
          <div className={`p-2.5 rounded-xl border flex flex-col justify-center ${
            isPositive ? 'bg-surface-container-low border-outline-variant/30' : 'bg-amber-50/70 border-amber-200'
          }`}>
            <span className="text-[10px] font-semibold text-on-surface-variant uppercase">
              Net Flow
            </span>
            <span className={`text-xs sm:text-sm font-bold tabular-nums mt-0.5 ${
              isPositive ? 'text-primary' : 'text-amber-800'
            }`}>
              {isPositive ? '+' : ''}{formatMinor(netMinor, 'GHS')}
            </span>
          </div>
        </div>
      </div>

      {/* Expanded Visualization Section */}
      {isExpanded && (
        <div className="px-4 pb-5 pt-1 space-y-4 border-t border-outline-variant/20 bg-surface-container-low/30 animate-in fade-in duration-200">
          {/* Ratio Visualizer Bar */}
          <div className="space-y-1.5 pt-2">
            <div className="flex items-center justify-between text-[11px] font-semibold text-on-surface-variant">
              <span>Cash Flow Balance</span>
              <span className="text-emerald-700">{savingsRate}% Saved</span>
            </div>
            <div className="h-2.5 w-full bg-red-200 rounded-full overflow-hidden flex shadow-inner">
              <div
                className="bg-emerald-500 h-full transition-all duration-500"
                style={{ width: `${incomePercent}%` }}
              />
              <div
                className="bg-red-500 h-full transition-all duration-500"
                style={{ width: `${expensePercent}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-on-surface-variant">
              <span className="text-emerald-700 font-medium">Income ({incomePercent}%)</span>
              <span className="text-red-700 font-medium">Expenses ({expensePercent}%)</span>
            </div>
          </div>

          {/* Top Categories Breakdown */}
          {topCategories.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
                <PieIcon className="w-3.5 h-3.5 text-secondary" />
                <span>Top Expenses This Period</span>
              </div>
              <div className="space-y-2">
                {topCategories.map((cat, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-primary">{cat.name}</span>
                      <span className="font-bold text-on-surface tabular-nums">
                        {formatMinor(cat.amountMinor, 'GHS')} ({cat.percent}%)
                      </span>
                    </div>
                    <div className="w-full bg-surface-container-high h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-primary h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, cat.percent)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active Liquid Accounts Snapshot */}
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-primary">
              <TrendingUp className="w-3.5 h-3.5 text-secondary" />
              <span>Liquid Assets</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {accounts.filter((a) => !a.archived).map((acc) => (
                <div
                  key={acc.id}
                  className="p-2 rounded-xl bg-surface-container-lowest border border-outline-variant/20 flex items-center justify-between"
                >
                  <div className="flex items-center gap-1.5 min-w-0">
                    {getAccountIcon(acc.type)}
                    <span className="text-[11px] font-semibold text-primary truncate">
                      {acc.name}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Contract Button at bottom */}
          <button
            type="button"
            onClick={toggleExpand}
            className="w-full py-2 rounded-xl bg-surface-container-low text-xs font-semibold text-on-surface-variant hover:text-on-surface flex items-center justify-center gap-1 transition-colors"
          >
            <ChevronUp className="w-3.5 h-3.5" />
            <span>Show Compact Widget</span>
          </button>
        </div>
      )}
    </div>
  );
};
