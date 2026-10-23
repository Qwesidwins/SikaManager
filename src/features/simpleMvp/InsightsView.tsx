import React, { useState, useEffect, useMemo } from 'react';
import { transactionsRepo } from '@/db/repositories/transactionsRepo';
import { categoriesRepo } from '@/db/repositories/categoriesRepo';
import { formatMinor } from '@/domain/money';
import type { Transaction, Category } from '@/domain/types';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import {
  TrendingUp,
  PieChart as PieIcon,
  BarChart3,
  ArrowUpRight,
  ArrowDownLeft,
  PiggyBank,
  Percent,
} from 'lucide-react';

const PALETTE = [
  '#C9962B', // Gold / Amber
  '#2E7D5B', // Emerald / Forest
  '#14213D', // Deep Navy
  '#E76F51', // Terracotta
  '#2A9D8F', // Teal
  '#E9C46A', // Warm Yellow
  '#845EC2', // Royal Purple
  '#D65DB1', // Magenta
];

export const InsightsView: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [txs, cats] = await Promise.all([
        transactionsRepo.getAll(),
        categoriesRepo.getAll(),
      ]);
      setTransactions(txs);
      setCategories(cats);
    } finally {
      setLoading(false);
    }
  }

  const categoryMap = useMemo(() => {
    return new Map(categories.map((c) => [c.id, c]));
  }, [categories]);

  // Aggregate metrics
  const { totalIncomeMinor, totalExpenseMinor, netSavingsMinor, savingsRatePercent } = useMemo(() => {
    let income = 0;
    let expense = 0;

    for (const t of transactions) {
      if (t.deletedAt) continue;
      if (t.type === 'income') income += t.amountMinor;
      if (t.type === 'expense') expense += t.amountMinor;
    }

    const net = income - expense;
    const rate = income > 0 ? Math.max(0, Math.round((net / income) * 100)) : 0;

    return {
      totalIncomeMinor: income,
      totalExpenseMinor: expense,
      netSavingsMinor: net,
      savingsRatePercent: rate,
    };
  }, [transactions]);

  // Chart 1: Income vs Expense Data
  const incomeVsExpenseData = useMemo(() => {
    return [
      {
        name: 'Income',
        amount: totalIncomeMinor / 100,
        formatted: formatMinor(totalIncomeMinor, 'GHS', 'en-GH'),
        fill: '#2E7D5B', // Income Forest Emerald
      },
      {
        name: 'Expense',
        amount: totalExpenseMinor / 100,
        formatted: formatMinor(totalExpenseMinor, 'GHS', 'en-GH'),
        fill: '#C77D2B', // Warm Caution Terracotta
      },
    ];
  }, [totalIncomeMinor, totalExpenseMinor]);

  // Chart 2: Category Breakdown Data
  const categoryBreakdownData = useMemo(() => {
    const expenseTotals: Record<string, number> = {};

    for (const t of transactions) {
      if (t.deletedAt || t.type !== 'expense') continue;
      const catId = t.categoryId || 'uncategorized';
      expenseTotals[catId] = (expenseTotals[catId] || 0) + t.amountMinor;
    }

    const items = Object.entries(expenseTotals).map(([catId, minor], index) => {
      const cat = categoryMap.get(catId);
      const name = cat?.name || (catId === 'uncategorized' ? 'Uncategorized' : 'Other');
      const val = minor / 100;
      const percent = totalExpenseMinor > 0 ? Math.round((minor / totalExpenseMinor) * 100) : 0;

      return {
        name,
        value: val,
        minor,
        percent,
        color: cat?.color || PALETTE[index % PALETTE.length],
      };
    });

    // Sort highest spend first
    return items.sort((a, b) => b.value - a.value);
  }, [transactions, categoryMap, totalExpenseMinor]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <p className="text-xs text-outline">Loading insights & analytics...</p>
      </div>
    );
  }

  const hasData = transactions.some((t) => !t.deletedAt);

  return (
    <div className="flex-1 flex flex-col w-full px-4 pt-4 pb-28 max-w-4xl mx-auto space-y-5 animate-in fade-in duration-150">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-primary dark:text-white flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-secondary" />
          Insights & Analytics
        </h1>
        <p className="text-xs text-on-surface-variant mt-0.5">
          Visual representation of your cash flow and spending patterns
        </p>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Inflow */}
        <div className="bg-surface-container-lowest rounded-[20px] p-4 border border-outline-variant/30 shadow-sm">
          <div className="flex items-center justify-between text-on-surface-variant mb-2">
            <span className="text-[11px] uppercase tracking-wider font-medium">Total Inflow</span>
            <div className="w-7 h-7 rounded-lg bg-tertiary-fixed/50 text-emerald-800 flex items-center justify-center">
              <ArrowDownLeft className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-base sm:text-lg font-bold text-emerald-600 truncate">
            {formatMinor(totalIncomeMinor, 'GHS')}
          </p>
        </div>

        {/* Total Outflow */}
        <div className="bg-surface-container-lowest rounded-[20px] p-4 border border-outline-variant/30 shadow-sm">
          <div className="flex items-center justify-between text-on-surface-variant mb-2">
            <span className="text-[11px] uppercase tracking-wider font-medium">Total Outflow</span>
            <div className="w-7 h-7 rounded-lg bg-red-100 dark:bg-red-950/60 text-red-700 flex items-center justify-center">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-base sm:text-lg font-bold text-red-600 truncate">
            {formatMinor(totalExpenseMinor, 'GHS')}
          </p>
        </div>

        {/* Net Savings */}
        <div className="bg-surface-container-lowest rounded-[20px] p-4 border border-outline-variant/30 shadow-sm">
          <div className="flex items-center justify-between text-on-surface-variant mb-2">
            <span className="text-[11px] uppercase tracking-wider font-medium">Net Savings</span>
            <div className="w-7 h-7 rounded-lg bg-surface-container-low text-secondary flex items-center justify-center">
              <PiggyBank className="w-3.5 h-3.5" />
            </div>
          </div>
          <p
            className={`text-base sm:text-lg font-bold truncate ${
              netSavingsMinor >= 0 ? 'text-primary dark:text-white' : 'text-red-500'
            }`}
          >
            {netSavingsMinor < 0 ? '-' : ''}
            {formatMinor(Math.abs(netSavingsMinor), 'GHS')}
          </p>
        </div>

        {/* Savings Rate */}
        <div className="bg-surface-container-lowest rounded-[20px] p-4 border border-outline-variant/30 shadow-sm">
          <div className="flex items-center justify-between text-on-surface-variant mb-2">
            <span className="text-[11px] uppercase tracking-wider font-medium">Savings Rate</span>
            <div className="w-7 h-7 rounded-lg bg-surface-container-low text-primary flex items-center justify-center">
              <Percent className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-base sm:text-lg font-bold text-secondary truncate">
            {savingsRatePercent}%
          </p>
        </div>
      </div>

      {/* Visual Representation Area */}
      {!hasData ? (
        <div className="py-16 text-center rounded-[24px] bg-surface-container-lowest border border-dashed border-outline-variant/40">
          <p className="text-sm font-semibold text-primary dark:text-white">No chart data yet</p>
          <p className="text-xs text-on-surface-variant mt-1">
            Log your first income or expense to see the visual analytics.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Chart 1: Income vs Expense Comparison */}
          <div className="bg-surface-container-lowest rounded-[24px] p-5 border border-outline-variant/30 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-surface-container-low text-primary flex items-center justify-center">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <h2 className="text-sm font-bold text-primary dark:text-white">
                  Income vs Expenses
                </h2>
              </div>
              <span className="text-[11px] text-on-surface-variant">Total Comparison</span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={incomeVsExpenseData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#75777e" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#75777e" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `GH₵${val}`} />
                  <Tooltip
                    formatter={(value: number) => [`GH₵ ${value.toFixed(2)}`, 'Amount']}
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderRadius: '12px',
                      border: '1px solid #dce2f3',
                      fontSize: '12px',
                      boxShadow: '0 4px 12px rgba(20,33,61,0.08)',
                    }}
                  />
                  <Bar dataKey="amount" radius={[8, 8, 0, 0]} maxBarSize={48}>
                    {incomeVsExpenseData.map((entry, index) => (
                      <Cell key={`bar-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Category Spending Breakdown */}
          <div className="bg-surface-container-lowest rounded-[24px] p-5 border border-outline-variant/30 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-surface-container-low text-secondary flex items-center justify-center">
                  <PieIcon className="w-4 h-4" />
                </div>
                <h2 className="text-sm font-bold text-primary dark:text-white">
                  Spending Breakdown
                </h2>
              </div>
              <span className="text-[11px] text-on-surface-variant">By Category</span>
            </div>

            {categoryBreakdownData.length === 0 ? (
              <div className="flex-1 flex items-center justify-center py-12 text-outline text-xs">
                No expense transactions logged yet.
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <div className="h-56 w-56 shrink-0 relative flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryBreakdownData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={3}
                      >
                        {categoryBreakdownData.map((entry, index) => (
                          <Cell key={`pie-cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => [`GH₵ ${value.toFixed(2)}`, 'Spent']}
                        contentStyle={{
                          backgroundColor: '#ffffff',
                          borderRadius: '12px',
                          border: '1px solid #dce2f3',
                          fontSize: '12px',
                          boxShadow: '0 4px 12px rgba(20,33,61,0.08)',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-[10px] uppercase font-semibold text-on-surface-variant">Total</span>
                    <span className="text-xs font-bold text-primary dark:text-white">
                      GH₵ {(totalExpenseMinor / 100).toFixed(0)}
                    </span>
                  </div>
                </div>

                {/* Percentage Legend */}
                <div className="flex-1 w-full space-y-2 max-h-56 overflow-y-auto pr-1">
                  {categoryBreakdownData.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs py-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="font-medium text-primary dark:text-white truncate">
                          {item.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-on-surface-variant tabular-nums font-semibold">
                          {item.percent}%
                        </span>
                        <span className="text-primary dark:text-white font-bold tabular-nums">
                          GH₵ {item.value.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
