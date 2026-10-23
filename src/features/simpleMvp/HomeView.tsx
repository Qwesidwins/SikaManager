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
  Search,
  Utensils,
  Car,
  Smartphone,
  Home,
  ShoppingBag,
  HeartPulse,
  Briefcase,
  Gift,
  HelpCircle,
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

  function getCategoryIcon(name?: string) {
    const n = (name || '').toLowerCase();
    if (n.includes('food') || n.includes('dining')) return <Utensils className="w-4 h-4 text-amber-700" />;
    if (n.includes('commute') || n.includes('fuel') || n.includes('transport')) return <Car className="w-4 h-4 text-blue-700" />;
    if (n.includes('airtime') || n.includes('data')) return <Smartphone className="w-4 h-4 text-violet-700" />;
    if (n.includes('rent') || n.includes('housing') || n.includes('util')) return <Home className="w-4 h-4 text-orange-700" />;
    if (n.includes('shop') || n.includes('market')) return <ShoppingBag className="w-4 h-4 text-rose-700" />;
    if (n.includes('health') || n.includes('medical')) return <HeartPulse className="w-4 h-4 text-emerald-700" />;
    if (n.includes('freelance') || n.includes('gig') || n.includes('salary') || n.includes('sale')) return <Briefcase className="w-4 h-4 text-emerald-700" />;
    if (n.includes('gift') || n.includes('remittance')) return <Gift className="w-4 h-4 text-pink-700" />;
    return <HelpCircle className="w-4 h-4 text-slate-500" />;
  }

  return (
    <div className="flex-1 flex flex-col w-full px-4 pt-4 pb-28 max-w-xl mx-auto space-y-4 animate-in fade-in duration-150">
      {/* Top Dignified Header */}
      <header className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-primary text-secondary-container flex items-center justify-center shadow-sm">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-xl font-bold text-primary dark:text-white leading-tight">
                SikaManger
              </h1>
              <span className="inline-flex items-center gap-1 bg-surface-container-high px-2 py-0.5 rounded-full text-[10px] text-on-surface-variant font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                Ready
              </span>
            </div>
            <p className="text-xs text-on-surface-variant">
              Personal Cash Tracker
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenAdd}
          className="px-3.5 py-2 rounded-xl bg-primary hover:bg-primary-container text-white font-semibold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Entry</span>
        </button>
      </header>

      {/* Hero Card: Total Balance & Inflow / Outflow */}
      <div className="relative overflow-hidden rounded-[24px] bg-surface-container-lowest p-6 shadow-[0_4px_24px_-2px_rgba(20,33,61,0.06),0_2px_8px_-1px_rgba(20,33,61,0.03)] border border-outline-variant/30">
        <div className="relative z-10 flex flex-col space-y-4">
          <div>
            <span className="text-xs uppercase tracking-wider text-on-surface-variant font-medium">
              Total Balance
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xl font-semibold text-secondary">
                GH₵
              </span>
              <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-primary dark:text-white">
                {(totalBalanceMinor / 100).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Sub-strip: Inflow and Outflow */}
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-outline-variant/20">
            <div className="flex items-center gap-2.5 p-2 rounded-xl bg-surface-container-low/60">
              <div className="w-8 h-8 rounded-xl bg-tertiary-fixed/50 text-emerald-800 flex items-center justify-center shrink-0">
                <ArrowDownLeft className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-on-surface-variant font-medium">Total Inflow</p>
                <p className="text-sm font-bold text-emerald-600 truncate">
                  +{formatMinor(totalIncomeMinor, 'GHS')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-2 rounded-xl bg-surface-container-low/60">
              <div className="w-8 h-8 rounded-xl bg-red-100 dark:bg-red-950/60 text-red-700 flex items-center justify-center shrink-0">
                <ArrowUpRight className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-on-surface-variant font-medium">Total Outflow</p>
                <p className="text-sm font-bold text-red-600 truncate">
                  -{formatMinor(totalExpenseMinor, 'GHS')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between gap-2">
          {/* Segmented type filter */}
          <div className="flex items-center p-1 bg-surface-container-low rounded-xl">
            {(['all', 'expense', 'income'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => {
                  triggerHaptic();
                  setFilterType(type);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                  filterType === type
                    ? 'bg-primary text-white shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {type}
              </button>
            ))}
          </div>

          {/* Transaction Count Indicator */}
          <span className="text-xs font-medium text-on-surface-variant px-1">
            {filteredTransactions.length} {filteredTransactions.length === 1 ? 'entry' : 'entries'}
          </span>
        </div>

        {/* Search input */}
        <div className="relative">
          <Search className="w-4 h-4 text-outline absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes or categories..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-surface-container-low text-on-surface text-xs placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-secondary/40 transition-all border border-transparent focus:border-outline-variant/30"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-outline hover:text-on-surface"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Transactions Feed */}
      <div className="space-y-2.5">
        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-2 text-outline">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs">Loading ledger...</p>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="py-14 px-4 text-center rounded-[24px] bg-surface-container-lowest border border-dashed border-outline-variant/40 space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-surface-container-low text-secondary flex items-center justify-center mx-auto">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-primary dark:text-white">No transactions found</p>
              <p className="text-xs text-on-surface-variant mt-1 max-w-xs mx-auto">
                {searchQuery || filterType !== 'all'
                  ? 'No entries match your search filters.'
                  : 'Your ledger is clean. Tap "+ Add" below to log your first income or expense.'}
              </p>
            </div>
            {!searchQuery && filterType === 'all' && (
              <button
                type="button"
                onClick={onOpenAdd}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-xs font-semibold shadow-sm active:scale-95 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Log first transaction</span>
              </button>
            )}
          </div>
        ) : (
          <div className="rounded-[20px] bg-surface-container-lowest border border-outline-variant/20 shadow-sm overflow-hidden divide-y divide-outline-variant/15">
            {filteredTransactions.map((tx) => {
              const category = tx.categoryId ? categoryMap.get(tx.categoryId) : undefined;
              const formattedDate = new Date(tx.date).toLocaleDateString('en-GH', {
                month: 'short',
                day: 'numeric',
              });

              return (
                <div
                  key={tx.id}
                  className="p-3.5 flex items-center justify-between hover:bg-surface-container-low/40 transition-colors group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-surface-container-low flex items-center justify-center shrink-0">
                      {getCategoryIcon(category?.name)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-primary dark:text-white truncate">
                        {tx.note || category?.name || (tx.type === 'income' ? 'Income' : 'Expense')}
                      </p>
                      <p className="text-xs text-on-surface-variant truncate">
                        {category?.name || 'General'} · {formattedDate}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`text-sm font-bold tabular-nums ${
                        tx.type === 'income'
                          ? 'text-emerald-600'
                          : 'text-primary dark:text-white'
                      }`}
                    >
                      {tx.type === 'income' ? '+' : '-'}
                      {formatMinor(tx.amountMinor, 'GHS')}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDelete(tx.id)}
                      aria-label="Delete entry"
                      className="w-8 h-8 rounded-lg text-outline hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors opacity-70 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
