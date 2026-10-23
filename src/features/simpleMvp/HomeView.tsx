import React, { useState, useEffect, useMemo } from 'react';
import { transactionsRepo } from '@/db/repositories/transactionsRepo';
import { categoriesRepo } from '@/db/repositories/categoriesRepo';
import { formatMinor } from '@/domain/money';
import { triggerHaptic } from '@/lib/haptics';
import type { Transaction, Category, TransactionType } from '@/domain/types';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  Trash2,
  Plus,
  Receipt,
  Search,
} from 'lucide-react';

interface HomeViewProps {
  onOpenAdd: () => void;
  onShowToast: (message: string) => void;
}

export const HomeView: React.FC<HomeViewProps> = ({ onOpenAdd, onShowToast }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filterType, setFilterType] = useState<TransactionType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
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

  // Balance & Inflow/Outflow calculations
  const { totalBalanceMinor, totalIncomeMinor, totalExpenseMinor } = useMemo(() => {
    let income = 0;
    let expense = 0;

    for (const t of transactions) {
      if (t.deletedAt) continue;
      if (t.type === 'income') {
        income += t.amountMinor;
      } else if (t.type === 'expense') {
        expense += t.amountMinor;
      }
    }

    return {
      totalBalanceMinor: income - expense,
      totalIncomeMinor: income,
      totalExpenseMinor: expense,
    };
  }, [transactions]);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (t.deletedAt) return false;
      if (filterType !== 'all' && t.type !== filterType) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const cat = t.categoryId ? categoryMap.get(t.categoryId)?.name.toLowerCase() : '';
        const note = (t.note || '').toLowerCase();
        return (cat && cat.includes(q)) || note.includes(q);
      }
      return true;
    });
  }, [transactions, filterType, searchQuery, categoryMap]);

  async function handleDelete(id: string) {
    triggerHaptic();
    await transactionsRepo.softDelete(id);
    onShowToast('Transaction deleted');
    await loadData();
  }

  return (
    <div className="flex-1 flex flex-col w-full px-4 pt-4 pb-28 max-w-xl mx-auto space-y-5 animate-in fade-in duration-150">
      {/* Top App Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-amber-600 flex items-center justify-center text-white shadow-md shadow-amber-600/20">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">
              SikaManger
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Personal Cash Tracker</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenAdd}
          className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-amber-600/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Entry</span>
        </button>
      </div>

      {/* Hero Balance Card */}
      <div className="relative overflow-hidden rounded-3xl bg-slate-900 text-white p-6 shadow-xl border border-slate-800">
        <div className="relative z-10 flex flex-col space-y-4">
          <div>
            <span className="text-xs uppercase tracking-wider text-slate-400 font-medium">
              Total Balance
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-semibold text-amber-400">GH₵</span>
              <span
                className={`text-3xl sm:text-4xl font-extrabold tracking-tight ${
                  totalBalanceMinor < 0 ? 'text-red-400' : 'text-white'
                }`}
              >
                {formatMinor(totalBalanceMinor, 'GHS', 'en-GH', { hideCurrency: true })}
              </span>
            </div>
          </div>

          {/* Inflow vs Outflow Mini-Strip */}
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800/80">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-950/80 text-emerald-400 flex items-center justify-center shrink-0">
                <ArrowUpRight className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-slate-400 font-medium">Total In</p>
                <p className="text-sm font-bold text-emerald-400 truncate">
                  +{formatMinor(totalIncomeMinor, 'GHS', 'en-GH')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-red-950/80 text-red-400 flex items-center justify-center shrink-0">
                <ArrowDownLeft className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-slate-400 font-medium">Total Out</p>
                <p className="text-sm font-bold text-red-400 truncate">
                  -{formatMinor(totalExpenseMinor, 'GHS', 'en-GH')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Chips & Search Bar */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          {/* Segmented Filter */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
            {(['all', 'expense', 'income'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => {
                  setFilterType(mode);
                  triggerHaptic();
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                  filterType === mode
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 dark:text-slate-400'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          <span className="text-xs font-semibold text-slate-400 px-1">
            {filteredTransactions.length} {filteredTransactions.length === 1 ? 'entry' : 'entries'}
          </span>
        </div>

        {/* Search Input */}
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search note or category..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/80 rounded-xl text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* Transaction List */}
      <div className="space-y-2">
        {loading ? (
          <div className="py-12 text-center text-xs text-slate-400">Loading entries...</div>
        ) : filteredTransactions.length === 0 ? (
          <div className="py-12 px-4 text-center rounded-3xl bg-slate-50 dark:bg-slate-800/30 border border-dashed border-slate-200 dark:border-slate-800 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
              <Receipt className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                No transactions found
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {searchQuery || filterType !== 'all'
                  ? 'Try adjusting your search or filters'
                  : 'Start logging your daily income and expenses with the button below'}
              </p>
            </div>
            {!searchQuery && filterType === 'all' && (
              <button
                type="button"
                onClick={onOpenAdd}
                className="mt-2 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs inline-flex items-center gap-1.5 shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Add First Transaction
              </button>
            )}
          </div>
        ) : (
          filteredTransactions.map((tx) => {
            const cat = tx.categoryId ? categoryMap.get(tx.categoryId) : undefined;
            const isIncome = tx.type === 'income';

            return (
              <div
                key={tx.id}
                className="bg-white dark:bg-slate-800/80 rounded-2xl p-3.5 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 shadow-xs hover:border-slate-200 dark:hover:border-slate-700 transition-all group"
              >
                {/* Left: Icon & Description */}
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      isIncome
                        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400'
                        : 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'
                    }`}
                  >
                    {isIncome ? (
                      <ArrowUpRight className="w-5 h-5" />
                    ) : (
                      <ArrowDownLeft className="w-5 h-5" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {cat?.name || (isIncome ? 'Income' : 'Expense')}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {tx.note || new Date(tx.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                </div>

                {/* Right: Amount & Delete Button */}
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`text-sm font-bold tabular-nums ${
                      isIncome ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-900 dark:text-white'
                    }`}
                  >
                    {isIncome ? '+' : '-'}
                    {formatMinor(tx.amountMinor, 'GHS', 'en-GH')}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleDelete(tx.id)}
                    aria-label="Delete entry"
                    className="w-8 h-8 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center justify-center transition-colors opacity-70 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
