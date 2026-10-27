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
  Legend,
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
  Calendar,
  Layers,
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

function getYearMonthKey(dateStr: string): string {
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function formatMonthLabel(key: string, short = false): string {
  const [yearStr, monthStr] = key.split('-');
  const date = new Date(Number(yearStr), Number(monthStr) - 1, 1);
  return date.toLocaleDateString('en-GH', {
    month: short ? 'short' : 'long',
    year: 'numeric',
  });
}

export const InsightsView: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<string>('all'); // 'all' or 'YYYY-MM'
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

  // Extract all distinct months available in transactions (sorted newest first)
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    for (const t of transactions) {
      if (!t.deletedAt) {
        set.add(getYearMonthKey(t.date));
      }
    }
    // Also include current month if not yet present
    set.add(getYearMonthKey(new Date().toISOString()));
    return Array.from(set).sort().reverse();
  }, [transactions]);

  // Filter transactions by selected month (if not 'all')
  const activeTransactions = useMemo(() => {
    if (selectedMonth === 'all') {
      return transactions.filter((t) => !t.deletedAt);
    }
    return transactions.filter((t) => !t.deletedAt && getYearMonthKey(t.date) === selectedMonth);
  }, [transactions, selectedMonth]);

  // Aggregate metrics for active scope (selected month or all-time)
  const { totalIncomeMinor, totalExpenseMinor, netSavingsMinor, savingsRatePercent } = useMemo(() => {
    let income = 0;
    let expense = 0;

    for (const t of activeTransactions) {
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
  }, [activeTransactions]);

  // Monthly Breakdown History & Multi-Month Chart Data
  const monthlyData = useMemo(() => {
    const map: Record<string, { incomeMinor: number; expenseMinor: number }> = {};

    for (const t of transactions) {
      if (t.deletedAt) continue;
      const key = getYearMonthKey(t.date);
      if (!map[key]) {
        map[key] = { incomeMinor: 0, expenseMinor: 0 };
      }
      if (t.type === 'income') {
        map[key]!.incomeMinor += t.amountMinor;
      } else if (t.type === 'expense') {
        map[key]!.expenseMinor += t.amountMinor;
      }
    }

    // Ensure all available months are represented
    for (const m of availableMonths) {
      if (!map[m]) {
        map[m] = { incomeMinor: 0, expenseMinor: 0 };
      }
    }

    // Sort chronologically for chart (oldest to newest)
    const sortedKeys = Object.keys(map).sort();

    return sortedKeys.map((key) => {
      const item = map[key]!;
      const netMinor = item.incomeMinor - item.expenseMinor;
      const rate = item.incomeMinor > 0 ? Math.max(0, Math.round((netMinor / item.incomeMinor) * 100)) : 0;

      return {
        key,
        label: formatMonthLabel(key, true),
        fullLabel: formatMonthLabel(key, false),
        income: item.incomeMinor / 100,
        expense: item.expenseMinor / 100,
        incomeMinor: item.incomeMinor,
        expenseMinor: item.expenseMinor,
        netMinor,
        savingsRate: rate,
      };
    });
  }, [transactions, availableMonths]);

  // Category Breakdown Data for the active scope
  const categoryBreakdownData = useMemo(() => {
    const expenseTotals: Record<string, number> = {};

    for (const t of activeTransactions) {
      if (t.type !== 'expense') continue;
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

    return items.sort((a, b) => b.value - a.value);
  }, [activeTransactions, categoryMap, totalExpenseMinor]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <p className="text-xs text-outline">Loading insights & analytics...</p>
      </div>
    );
  }

  const hasData = transactions.some((t) => !t.deletedAt);

  return (
    <div className="flex-1 flex flex-col w-full px-4 pt-4 pb-28 max-w-4xl mx-auto space-y-6 animate-in fade-in duration-150">
      {/* Top Header & Monthly Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-primary dark:text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-secondary dark:text-[#ffc657]" />
            Insights & Analytics
          </h1>
          <p className="text-xs text-on-surface-variant dark:text-slate-400 mt-0.5">
            Monthly cash flow comparisons and category spending breakdown
          </p>
        </div>

        {/* Month Selector Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          <button
            type="button"
            onClick={() => setSelectedMonth('all')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              selectedMonth === 'all'
                ? 'bg-primary dark:bg-[#ffc657] text-white dark:text-slate-950 shadow-xs'
                : 'bg-surface-container-low dark:bg-slate-800 text-on-surface-variant dark:text-slate-400 hover:text-on-surface dark:hover:text-white'
            }`}
          >
            All Time
          </button>
          {availableMonths.map((mKey) => (
            <button
              key={mKey}
              type="button"
              onClick={() => setSelectedMonth(mKey)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1 ${
                selectedMonth === mKey
                  ? 'bg-primary dark:bg-[#ffc657] text-white dark:text-slate-950 shadow-xs'
                  : 'bg-surface-container-low dark:bg-slate-800 text-on-surface-variant dark:text-slate-400 hover:text-on-surface dark:hover:text-white'
              }`}
            >
              <Calendar className="w-3 h-3" />
              <span>{formatMonthLabel(mKey, true)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 4 Stat Cards for Selected Month / Scope */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Inflow */}
        <div className="bg-surface-container-lowest dark:bg-slate-900 rounded-[20px] p-4 border border-outline-variant/30 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-on-surface-variant dark:text-slate-400 mb-2">
            <span className="text-[11px] uppercase tracking-wider font-medium">Total Inflow</span>
            <div className="w-7 h-7 rounded-lg bg-tertiary-fixed/50 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 flex items-center justify-center">
              <ArrowDownLeft className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-base sm:text-lg font-bold text-emerald-600 dark:text-emerald-400 truncate">
            {formatMinor(totalIncomeMinor, 'GHS')}
          </p>
          <span className="text-[10px] text-on-surface-variant dark:text-slate-400">
            {selectedMonth === 'all' ? 'All time income' : formatMonthLabel(selectedMonth)}
          </span>
        </div>

        {/* Total Outflow */}
        <div className="bg-surface-container-lowest dark:bg-slate-900 rounded-[20px] p-4 border border-outline-variant/30 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-on-surface-variant dark:text-slate-400 mb-2">
            <span className="text-[11px] uppercase tracking-wider font-medium">Total Outflow</span>
            <div className="w-7 h-7 rounded-lg bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-300 flex items-center justify-center">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-base sm:text-lg font-bold text-red-600 dark:text-red-400 truncate">
            {formatMinor(totalExpenseMinor, 'GHS')}
          </p>
          <span className="text-[10px] text-on-surface-variant dark:text-slate-400">
            {selectedMonth === 'all' ? 'All time expense' : formatMonthLabel(selectedMonth)}
          </span>
        </div>

        {/* Net Savings */}
        <div className="bg-surface-container-lowest dark:bg-slate-900 rounded-[20px] p-4 border border-outline-variant/30 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-on-surface-variant dark:text-slate-400 mb-2">
            <span className="text-[11px] uppercase tracking-wider font-medium">Net Savings</span>
            <div className="w-7 h-7 rounded-lg bg-surface-container-low dark:bg-slate-800 text-secondary dark:text-[#ffc657] flex items-center justify-center">
              <PiggyBank className="w-3.5 h-3.5" />
            </div>
          </div>
          <p
            className={`text-base sm:text-lg font-bold truncate ${
              netSavingsMinor >= 0 ? 'text-primary dark:text-white' : 'text-red-500 dark:text-red-400'
            }`}
          >
            {netSavingsMinor < 0 ? '-' : ''}
            {formatMinor(Math.abs(netSavingsMinor), 'GHS')}
          </p>
          <span className="text-[10px] text-on-surface-variant dark:text-slate-400">
            {netSavingsMinor >= 0 ? 'Surplus retained' : 'Deficit spent'}
          </span>
        </div>

        {/* Savings Rate */}
        <div className="bg-surface-container-lowest dark:bg-slate-900 rounded-[20px] p-4 border border-outline-variant/30 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-on-surface-variant dark:text-slate-400 mb-2">
            <span className="text-[11px] uppercase tracking-wider font-medium">Savings Rate</span>
            <div className="w-7 h-7 rounded-lg bg-surface-container-low dark:bg-slate-800 text-primary dark:text-[#ffc657] flex items-center justify-center">
              <Percent className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-base sm:text-lg font-bold text-secondary dark:text-[#ffc657] truncate">
            {savingsRatePercent}%
          </p>
          <span className="text-[10px] text-on-surface-variant dark:text-slate-400">Of total income</span>
        </div>
      </div>

      {!hasData ? (
        <div className="py-16 text-center rounded-[24px] bg-surface-container-lowest dark:bg-slate-900 border border-dashed border-outline-variant/40 dark:border-slate-800">
          <p className="text-sm font-semibold text-primary dark:text-white">No chart data yet</p>
          <p className="text-xs text-on-surface-variant dark:text-slate-400 mt-1">
            Log your first income or expense to see the visual analytics.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Chart 1: Month-by-Month Cash Flow (Income vs Expense side-by-side) */}
          <div className="bg-surface-container-lowest dark:bg-slate-900 rounded-[24px] p-5 border border-outline-variant/30 dark:border-slate-800 shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-surface-container-low dark:bg-slate-800 text-primary dark:text-[#ffc657] flex items-center justify-center">
                  <BarChart3 className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-primary dark:text-white">
                    Month-by-Month Cashflow
                  </h2>
                  <p className="text-[11px] text-on-surface-variant dark:text-slate-400">
                    Compare Income vs Expenses side-by-side per month
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-semibold text-secondary dark:text-[#ffc657] bg-secondary-container/30 dark:bg-amber-400/20 px-2.5 py-1 rounded-full">
                Monthly Trend
              </span>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <XAxis dataKey="label" stroke="#75777e" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#75777e" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(val) => `GH₵${val}`} />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      `GH₵ ${value.toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                      name,
                    ]}
                    contentStyle={{
                      backgroundColor: '#1e293b',
                      color: '#f8fafc',
                      borderRadius: '12px',
                      border: '1px solid #334155',
                      fontSize: '12px',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                    }}
                    itemStyle={{ color: '#f8fafc' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                  <Bar dataKey="income" name="Income" fill="#2E7D5B" radius={[6, 6, 0, 0]} maxBarSize={32} />
                  <Bar dataKey="expense" name="Expense" fill="#C77D2B" radius={[6, 6, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Chart 2: Category Spending Breakdown */}
            <div className="bg-surface-container-lowest dark:bg-slate-900 rounded-[24px] p-5 border border-outline-variant/30 dark:border-slate-800 shadow-sm flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-surface-container-low dark:bg-slate-800 text-secondary dark:text-[#ffc657] flex items-center justify-center">
                    <PieIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-primary dark:text-white">
                      Spending Breakdown
                    </h2>
                    <p className="text-[11px] text-on-surface-variant dark:text-slate-400">
                      {selectedMonth === 'all' ? 'All time categories' : formatMonthLabel(selectedMonth)}
                    </p>
                  </div>
                </div>
                <span className="text-[11px] text-on-surface-variant dark:text-slate-400">By Category</span>
              </div>

              {categoryBreakdownData.length === 0 ? (
                <div className="flex-1 flex items-center justify-center py-12 text-outline dark:text-slate-500 text-xs">
                  No expense transactions in this period.
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="h-52 w-52 shrink-0 relative flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryBreakdownData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={75}
                          paddingAngle={3}
                        >
                          {categoryBreakdownData.map((entry, index) => (
                            <Cell key={`pie-cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value: number) => [`GH₵ ${value.toFixed(2)}`, 'Spent']}
                          contentStyle={{
                            backgroundColor: '#1e293b',
                            color: '#f8fafc',
                            borderRadius: '12px',
                            border: '1px solid #334155',
                            fontSize: '12px',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                          }}
                          itemStyle={{ color: '#f8fafc' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-[10px] uppercase font-semibold text-on-surface-variant dark:text-slate-400">Spent</span>
                      <span className="text-xs font-bold text-primary dark:text-white">
                        GH₵ {(totalExpenseMinor / 100).toFixed(0)}
                      </span>
                    </div>
                  </div>

                  {/* Percentage Legend */}
                  <div className="flex-1 w-full space-y-2 max-h-52 overflow-y-auto pr-1">
                    {categoryBreakdownData.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs py-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                          <span className="font-medium text-primary dark:text-white truncate">
                            {item.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-on-surface-variant dark:text-slate-400 tabular-nums font-semibold">
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

            {/* Monthly History Summary List */}
            <div className="bg-surface-container-lowest dark:bg-slate-900 rounded-[24px] p-5 border border-outline-variant/30 dark:border-slate-800 shadow-sm flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-surface-container-low dark:bg-slate-800 text-primary dark:text-[#ffc657] flex items-center justify-center">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-primary dark:text-white">
                      Monthly Summary
                    </h2>
                    <p className="text-[11px] text-on-surface-variant dark:text-slate-400">
                      Income vs Expenses history
                    </p>
                  </div>
                </div>
                <span className="text-[11px] text-on-surface-variant dark:text-slate-400 font-medium">
                  {monthlyData.length} {monthlyData.length === 1 ? 'month' : 'months'}
                </span>
              </div>

              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1 divide-y divide-outline-variant/15 dark:divide-slate-800">
                {[...monthlyData].reverse().map((m) => (
                  <div
                    key={m.key}
                    onClick={() => setSelectedMonth(m.key)}
                    className={`pt-2.5 first:pt-0 cursor-pointer p-2 rounded-xl transition-colors ${
                      selectedMonth === m.key
                        ? 'bg-surface-container-low/80 dark:bg-slate-800 ring-1 ring-primary dark:ring-amber-400/50'
                        : 'hover:bg-surface-container-low/40 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-primary dark:text-white">
                        {m.fullLabel}
                      </span>
                      <span
                        className={`text-xs font-bold tabular-nums ${
                          m.netMinor >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'
                        }`}
                      >
                        {m.netMinor >= 0 ? '+' : ''}
                        {formatMinor(m.netMinor, 'GHS')}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-on-surface-variant dark:text-slate-400">
                      <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                        Income: +{formatMinor(m.incomeMinor, 'GHS')}
                      </span>
                      <span className="text-red-600 dark:text-red-400 font-medium">
                        Expense: -{formatMinor(m.expenseMinor, 'GHS')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
