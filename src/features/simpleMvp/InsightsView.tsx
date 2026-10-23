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
        fill: '#10B981', // Emerald
      },
      {
        name: 'Expense',
        amount: totalExpenseMinor / 100,
        formatted: formatMinor(totalExpenseMinor, 'GHS', 'en-GH'),
        fill: '#EF4444', // Warm Red
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
        <p className="text-xs text-slate-400">Loading insights & analytics...</p>
      </div>
    );
  }

  const hasData = transactions.some((t) => !t.deletedAt);

  return (
    <div className="flex-1 flex flex-col w-full px-4 pt-4 pb-28 max-w-4xl mx-auto space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-amber-600" />
          Insights & Analytics
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Visual representation of your cash flow and spending patterns
        </p>
      </div>

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Inflow */}
        <div className="bg-white dark:bg-slate-800/80 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Inflow</span>
            <ArrowUpRight className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 truncate">
            +{formatMinor(totalIncomeMinor, 'GHS', 'en-GH')}
          </p>
        </div>

        {/* Total Outflow */}
        <div className="bg-white dark:bg-slate-800/80 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Outflow</span>
            <ArrowDownLeft className="w-4 h-4 text-red-500" />
          </div>
          <p className="text-lg font-bold text-red-600 dark:text-red-400 truncate">
            -{formatMinor(totalExpenseMinor, 'GHS', 'en-GH')}
          </p>
        </div>

        {/* Net Savings */}
        <div className="bg-white dark:bg-slate-800/80 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Net Savings</span>
            <PiggyBank className="w-4 h-4 text-amber-500" />
          </div>
          <p
            className={`text-lg font-bold truncate ${
              netSavingsMinor < 0 ? 'text-red-500' : 'text-slate-900 dark:text-white'
            }`}
          >
            {formatMinor(netSavingsMinor, 'GHS', 'en-GH')}
          </p>
        </div>

        {/* Savings Rate */}
        <div className="bg-white dark:bg-slate-800/80 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Savings Rate</span>
            <Percent className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-lg font-bold text-slate-900 dark:text-white truncate">
            {savingsRatePercent}%
          </p>
        </div>
      </div>

      {!hasData ? (
        <div className="py-16 text-center rounded-3xl bg-slate-50 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-800">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
            No chart data yet
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Log your first income or expense to see the visual analytics.
          </p>
        </div>
      ) : (
        /* Composition of Chart 1 and Chart 2: Side by Side on Desktop, Top & Bottom on Mobile */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Chart 1: Income vs Expense Comparison Bar Chart */}
          <div className="bg-white dark:bg-slate-800/80 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Income vs. Expense
                </h3>
              </div>
              <span className="text-xs font-medium text-slate-400">Total Comparison</span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={incomeVsExpenseData}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                  <XAxis
                    dataKey="name"
                    tick={{ fill: '#94A3B8', fontSize: 12, fontWeight: 500 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#94A3B8', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `GH₵${v}`}
                  />
                  <Tooltip
                    formatter={(val: number) => [`GH₵ ${val.toFixed(2)}`, 'Total']}
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderColor: '#334155',
                      borderRadius: 12,
                      color: '#F8FAFC',
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                    {incomeVsExpenseData.map((entry, index) => (
                      <Cell key={`bar-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="flex items-center justify-around pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-md bg-emerald-500" />
                <span className="text-slate-600 dark:text-slate-300 font-medium">
                  Inflow: +{formatMinor(totalIncomeMinor, 'GHS', 'en-GH')}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-md bg-red-500" />
                <span className="text-slate-600 dark:text-slate-300 font-medium">
                  Outflow: -{formatMinor(totalExpenseMinor, 'GHS', 'en-GH')}
                </span>
              </div>
            </div>
          </div>

          {/* Chart 2: Category Spending Breakdown Donut Chart */}
          <div className="bg-white dark:bg-slate-800/80 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-xs flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <PieIcon className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Spending by Category
                </h3>
              </div>
              <span className="text-xs font-medium text-slate-400">Expenses Only</span>
            </div>

            {categoryBreakdownData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-xs text-slate-400">
                No expense categories logged yet
              </div>
            ) : (
              <>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryBreakdownData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={3}
                      >
                        {categoryBreakdownData.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={entry.color || PALETTE[index % PALETTE.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val: number) => [`GH₵ ${val.toFixed(2)}`, 'Spent']}
                        contentStyle={{
                          backgroundColor: '#0F172A',
                          borderColor: '#334155',
                          borderRadius: 12,
                          color: '#F8FAFC',
                          fontSize: 12,
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Category Legend List */}
                <div className="grid grid-cols-2 gap-2 pt-3 border-t border-slate-100 dark:border-slate-800 max-h-32 overflow-y-auto">
                  {categoryBreakdownData.map((cat, idx) => (
                    <div key={idx} className="flex items-center justify-between text-xs pr-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="truncate text-slate-600 dark:text-slate-300">
                          {cat.name}
                        </span>
                      </div>
                      <span className="font-semibold text-slate-900 dark:text-white pl-1 shrink-0">
                        {cat.percent}%
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
