import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { transactionsRepo, accountsRepo, categoriesRepo, journalRepo } from '@/db';
import { Amount } from '@/components/Amount';
import { EmptyState } from '@/components/EmptyState';
import { formatMinor } from '@/domain/money';
import { triggerHaptic } from '@/lib/haptics';
import type {
  Transaction,
  Account,
  Category,
  JournalEntry,
  TransactionType,
} from '@/domain/types';

interface ActivityViewProps {
  onOpenQuickAdd: () => void;
  onShowToast: (msg: string, onUndo?: (() => void) | undefined) => void;
}

export const ActivityView: React.FC<ActivityViewProps> = ({ onOpenQuickAdd, onShowToast }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isFilterSheetOpen, setIsFilterSheetOpen] = useState(false);
  const [filterType, setFilterType] = useState<TransactionType | 'all'>('all');
  const [filterAccountId, setFilterAccountId] = useState<string>('all');
  const [filterCategoryId, setFilterCategoryId] = useState<string>('all');
  const [showRunningBalance, setShowRunningBalance] = useState(true);

  // Edit modal state
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editNote, setEditNote] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    const [txns, accs, cats, journals] = await Promise.all([
      transactionsRepo.getAll(),
      accountsRepo.getAll(),
      categoriesRepo.getAll(undefined, true),
      journalRepo.getAll(),
    ]);
    setTransactions(txns);
    setAccounts(accs);
    setCategories(cats);
    setJournalEntries(journals);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (filterType !== 'all' && t.type !== filterType) return false;
      if (filterAccountId !== 'all' && t.accountId !== filterAccountId && t.transferAccountId !== filterAccountId) {
        return false;
      }
      if (filterCategoryId !== 'all' && t.categoryId !== filterCategoryId) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const noteMatch = t.note?.toLowerCase().includes(q);
        const catMatch = categories.find((c) => c.id === t.categoryId)?.name.toLowerCase().includes(q);
        const accMatch = accounts.find((a) => a.id === t.accountId)?.name.toLowerCase().includes(q);
        if (!noteMatch && !catMatch && !accMatch) return false;
      }
      return true;
    });
  }, [transactions, filterType, filterAccountId, filterCategoryId, searchQuery, categories, accounts]);

  // Calculate monthly flow metrics (Inflow, Outflow, Net)
  const monthlyMetrics = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    let inflowMinor = 0;
    let outflowMinor = 0;

    for (const t of transactions) {
      const d = new Date(t.date);
      if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
        if (t.type === 'income') {
          inflowMinor += t.amountMinor;
        } else if (t.type === 'expense') {
          outflowMinor += t.amountMinor;
        }
      }
    }

    const netSavedMinor = inflowMinor - outflowMinor;
    return { inflowMinor, outflowMinor, netSavedMinor };
  }, [transactions]);

  // Compute running balance map (from oldest to newest)
  const runningBalances = useMemo(() => {
    const balances: Record<string, number> = {};
    // Chronological order
    const sorted = [...transactions].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Initial sum of opening balances
    let running = accounts.reduce((acc, a) => acc + (a.archived ? 0 : a.openingBalanceMinor), 0);

    for (const t of sorted) {
      if (t.type === 'income') {
        running += t.amountMinor;
      } else if (t.type === 'expense') {
        running -= t.amountMinor;
      }
      balances[t.id] = running;
    }

    return balances;
  }, [transactions, accounts]);

  // Group by day (YYYY-MM-DD)
  const groupedByDay = useMemo(() => {
    const groups: { dateKey: string; dateObj: Date; items: Transaction[]; dailyExpenseMinor: number; dailyIncomeMinor: number }[] = [];
    const map = new Map<string, Transaction[]>();

    for (const t of filteredTransactions) {
      const dateKey = t.date.slice(0, 10);
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(t);
    }

    for (const [dateKey, items] of map.entries()) {
      let dailyExpenseMinor = 0;
      let dailyIncomeMinor = 0;
      for (const item of items) {
        if (item.type === 'expense') dailyExpenseMinor += item.amountMinor;
        if (item.type === 'income') dailyIncomeMinor += item.amountMinor;
      }
      groups.push({
        dateKey,
        dateObj: new Date(dateKey),
        items,
        dailyExpenseMinor,
        dailyIncomeMinor,
      });
    }

    // Sort newest day first
    return groups.sort((a, b) => b.dateKey.localeCompare(a.dateKey));
  }, [filteredTransactions]);

  const handleDelete = async (id: string) => {
    triggerHaptic(20);
    await transactionsRepo.softDelete(id);
    await loadData();

    onShowToast('Transaction deleted', async () => {
      await transactionsRepo.restore(id);
      await loadData();
    });
  };

  const handleSaveEdit = async () => {
    if (!editingTransaction) return;
    triggerHaptic(15);
    await transactionsRepo.update(editingTransaction.id, {
      note: editNote.trim() || undefined,
    });
    setEditingTransaction(null);
    await loadData();
  };

  const getDayLabel = (dateStr: string) => {
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (dateStr === today) return 'Today';
    if (dateStr === yesterday) return 'Yesterday';
    return new Date(dateStr).toLocaleDateString('en-GH', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const currentMonthName = new Date().toLocaleDateString('en-GH', { month: 'long' });

  return (
    <div className="flex flex-col w-full px-margin pb-space-2xl gap-space-lg">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between pt-space-xs">
        <div className="flex items-center gap-space-xs">
          <h2 className="font-headline-lg text-headline-lg text-primary tracking-tight">Activity</h2>
          <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm">
            {currentMonthName}
          </span>
        </div>
        <div className="flex items-center gap-space-2xs">
          <button
            type="button"
            aria-label="Toggle running balance"
            onClick={() => setShowRunningBalance(!showRunningBalance)}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors active:scale-95 ${
              showRunningBalance
                ? 'bg-secondary-container text-on-secondary-container'
                : 'bg-surface-container-low text-primary'
            }`}
            title="Toggle running balance"
          >
            <span className="material-symbols-outlined text-[20px]">account_balance</span>
          </button>
          <button
            type="button"
            aria-label="Search transactions"
            onClick={() => setIsSearchOpen(!isSearchOpen)}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors active:scale-95 ${
              isSearchOpen
                ? 'bg-primary text-on-primary'
                : 'bg-surface-container-low text-primary hover:bg-surface-container'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">search</span>
          </button>
          <button
            type="button"
            aria-label="Filter activity"
            onClick={() => setIsFilterSheetOpen(true)}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-surface-container-low text-primary hover:bg-surface-container transition-colors active:scale-95 relative"
          >
            <span className="material-symbols-outlined text-[20px]">tune</span>
            {(filterType !== 'all' || filterAccountId !== 'all' || filterCategoryId !== 'all') && (
              <span className="w-2 h-2 rounded-full bg-secondary absolute top-2 right-2 ring-2 ring-surface" />
            )}
          </button>
        </div>
      </div>

      {/* Collapsible Search Bar */}
      {isSearchOpen && (
        <div className="flex flex-col gap-space-xs animate-in fade-in">
          <div className="relative w-full">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">
              search
            </span>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search merchants, categories, amounts..."
              className="w-full h-11 pl-10 pr-4 rounded-xl bg-surface-container-lowest text-primary placeholder:text-outline font-body-md text-body-md shadow-sm outline-none"
              autoFocus
            />
          </div>
        </div>
      )}

      {/* Top Month Cash Flow Summary Strip */}
      <section className="w-full rounded-2xl bg-surface-container-lowest shadow-[0_4px_20px_-2px_rgba(20,33,61,0.05),0_2px_6px_-1px_rgba(20,33,61,0.03)] p-space-md flex flex-col gap-space-sm relative overflow-hidden">
        <div className="absolute -right-8 -top-8 w-28 h-28 bg-secondary-fixed/30 rounded-full blur-2xl pointer-events-none" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-on-tertiary-container" />
            <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">
              This month
            </span>
          </div>
          <div className="flex items-center gap-1 bg-surface-container-low px-2 py-0.5 rounded-full">
            <span className="font-label-sm text-[11px] text-on-surface-variant">Net cash flow</span>
            <span
              className={`font-label-sm text-[11px] font-semibold tabular-nums ${
                monthlyMetrics.netSavedMinor >= 0 ? 'text-on-tertiary-container' : 'text-warm-caution'
              }`}
            >
              {formatMinor(monthlyMetrics.netSavedMinor)}
            </span>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 gap-space-xs pt-1">
          <div className="flex flex-col p-2.5 rounded-lg bg-surface-container-low/70">
            <span className="font-label-sm text-[12px] text-on-surface-variant flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px] text-on-tertiary-container font-bold">
                arrow_downward
              </span>
              Inflow
            </span>
            <span className="font-headline-sm text-headline-sm font-bold text-on-tertiary-container tabular-nums tracking-tight mt-0.5">
              +{formatMinor(monthlyMetrics.inflowMinor)}
            </span>
          </div>
          <div className="flex flex-col p-2.5 rounded-lg bg-surface-container-low/70">
            <span className="font-label-sm text-[12px] text-on-surface-variant flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px] text-on-surface-variant font-bold">
                arrow_upward
              </span>
              Outflow
            </span>
            <span className="font-headline-sm text-headline-sm font-bold text-primary tabular-nums tracking-tight mt-0.5">
              -{formatMinor(monthlyMetrics.outflowMinor)}
            </span>
          </div>
        </div>
      </section>

      {/* Activity Grouped List */}
      {!loading && groupedByDay.length === 0 ? (
        <EmptyState
          icon="receipt_long"
          title="No transactions found"
          description={
            searchQuery || filterType !== 'all' || filterAccountId !== 'all'
              ? 'Try adjusting your filters or search keywords.'
              : 'Your transaction history will appear here. Tap below to log your first transaction in seconds.'
          }
          actionLabel="Log a transaction"
          onAction={onOpenQuickAdd}
        />
      ) : (
        <div className="flex flex-col gap-space-md">
          {groupedByDay.map((group) => (
            <section key={group.dateKey} className="flex flex-col gap-space-xs">
              {/* Day Header */}
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-headline-sm text-[15px] font-semibold text-primary tracking-tight">
                    {getDayLabel(group.dateKey)}
                  </h3>
                  {getDayLabel(group.dateKey) === 'Today' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
                  )}
                </div>
                <div className="flex items-center gap-2 font-label-sm text-label-sm text-on-surface-variant tabular-nums">
                  {group.dailyExpenseMinor > 0 && <span>Out {formatMinor(group.dailyExpenseMinor)}</span>}
                  {group.dailyIncomeMinor > 0 && (
                    <span className="text-on-tertiary-container">
                      In {formatMinor(group.dailyIncomeMinor)}
                    </span>
                  )}
                </div>
              </div>

              {/* Day Items Card */}
              <div className="flex flex-col rounded-2xl bg-surface-container-lowest shadow-[0_4px_20px_-2px_rgba(20,33,61,0.05),0_2px_6px_-1px_rgba(20,33,61,0.03)] overflow-hidden divide-y divide-surface-container-high/60">
                {group.items.map((txn) => {
                  const cat = categories.find((c) => c.id === txn.categoryId);
                  const acc = accounts.find((a) => a.id === txn.accountId);
                  const destAcc = accounts.find((a) => a.id === txn.transferAccountId);
                  const reflection = journalEntries.find((j) => j.transactionId === txn.id);
                  const runningBal = runningBalances[txn.id];

                  const icon =
                    txn.type === 'transfer'
                      ? 'swap_horiz'
                      : cat?.icon || (txn.type === 'income' ? 'arrow_downward' : 'payments');

                  return (
                    <div
                      key={txn.id}
                      className="group flex items-center justify-between p-space-md hover:bg-surface-container-low/40 transition-colors cursor-pointer select-none"
                      onClick={() => {
                        setEditingTransaction(txn);
                        setEditNote(txn.note || '');
                      }}
                    >
                      <div className="flex items-center gap-space-sm min-w-0 flex-1">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                            txn.type === 'income'
                              ? 'bg-tertiary-fixed/50 text-on-tertiary-container'
                              : txn.type === 'transfer'
                              ? 'bg-surface-container-high text-outline'
                              : 'bg-surface-container text-primary'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[20px]">{icon}</span>
                        </div>

                        <div className="flex flex-col min-w-0 pr-2">
                          <div className="flex items-center gap-1.5">
                            <span className="font-body-md-bold text-body-md-bold text-primary truncate">
                              {txn.note || (txn.type === 'transfer' ? `Transfer to ${destAcc?.name || 'Account'}` : cat?.name || 'Uncategorized')}
                            </span>
                            {/* Reflection Pill */}
                            {reflection?.rating === 'worth_it' && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-tertiary-fixed text-on-tertiary-fixed text-[10px] font-semibold">
                                <span className="material-symbols-outlined text-[10px]">favorite</span>
                                Worth it
                              </span>
                            )}
                            {reflection?.rating === 'regret' && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full bg-error-container text-on-error-container text-[10px] font-semibold">
                                <span className="material-symbols-outlined text-[10px]">heart_broken</span>
                                Regret
                              </span>
                            )}
                          </div>
                          <span className="font-label-sm text-label-sm text-on-surface-variant truncate">
                            {cat ? `${cat.name} · ` : ''}
                            {acc?.name || 'Account'}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end shrink-0 pl-2">
                        <Amount minor={txn.amountMinor} type={txn.type} />
                        <div className="flex items-center gap-2 mt-0.5">
                          {showRunningBalance && runningBal !== undefined && (
                            <span className="font-label-sm text-[11px] text-outline tabular-nums">
                              bal {formatMinor(runningBal, 'GHS', 'en-GH', { compact: true })}
                            </span>
                          )}
                          <span className="font-label-sm text-[11px] text-on-surface-variant">
                            {new Date(txn.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>

                      {/* Quick delete button */}
                      <button
                        type="button"
                        aria-label="Delete transaction"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(txn.id);
                        }}
                        className="ml-2 w-8 h-8 rounded-full flex items-center justify-center text-outline hover:text-error hover:bg-error-container/20 transition-colors"
                        title="Delete"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Edit Note Sheet / Dialog */}
      {editingTransaction && (
        <div className="fixed inset-0 z-50 bg-primary/40 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-surface-container-lowest rounded-2xl p-space-md shadow-xl flex flex-col gap-3">
            <h4 className="font-headline-sm text-primary">Edit Transaction Note</h4>
            <input
              type="text"
              value={editNote}
              onChange={(e) => setEditNote(e.target.value)}
              placeholder="Add or update note..."
              className="w-full h-11 px-3 rounded-xl bg-surface-container-low text-on-surface font-body-md text-sm outline-none border border-surface-container-high focus:border-secondary"
              autoFocus
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingTransaction(null)}
                className="px-4 py-2 rounded-xl text-on-surface-variant font-label-md hover:bg-surface-container"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="px-4 py-2 rounded-xl bg-secondary-container text-on-secondary-container font-label-md font-semibold"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Filter Bottom Sheet */}
      {isFilterSheetOpen && (
        <div className="fixed inset-0 z-50 bg-primary/40 flex items-end">
          <div className="w-full max-w-lg mx-auto bg-surface-container-lowest rounded-t-[24px] p-space-md max-h-[80vh] overflow-y-auto no-scrollbar flex flex-col gap-4">
            <div className="flex items-center justify-between pb-2 border-b border-surface-container-high">
              <h4 className="font-headline-sm text-primary">Filter Activity</h4>
              <button
                type="button"
                onClick={() => setIsFilterSheetOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-outline"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Type Filter */}
            <div className="flex flex-col gap-1.5">
              <span className="font-label-sm font-semibold text-primary">Type</span>
              <div className="grid grid-cols-4 gap-2">
                {(['all', 'expense', 'income', 'transfer'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setFilterType(t)}
                    className={`py-1.5 rounded-xl font-label-md text-xs capitalize ${
                      filterType === t
                        ? 'bg-primary text-on-primary font-semibold'
                        : 'bg-surface-container-low text-on-surface'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Account Filter */}
            <div className="flex flex-col gap-1.5">
              <span className="font-label-sm font-semibold text-primary">Account</span>
              <select
                value={filterAccountId}
                onChange={(e) => setFilterAccountId(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-surface-container-low text-on-surface font-label-sm outline-none"
              >
                <option value="all">All Accounts</option>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Category Filter */}
            <div className="flex flex-col gap-1.5">
              <span className="font-label-sm font-semibold text-primary">Category</span>
              <select
                value={filterCategoryId}
                onChange={(e) => setFilterCategoryId(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-surface-container-low text-on-surface font-label-sm outline-none"
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setFilterType('all');
                  setFilterAccountId('all');
                  setFilterCategoryId('all');
                  setIsFilterSheetOpen(false);
                }}
                className="flex-1 py-2.5 rounded-xl bg-surface-container-low text-on-surface font-label-md"
              >
                Reset Filters
              </button>
              <button
                type="button"
                onClick={() => setIsFilterSheetOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-secondary-container text-on-secondary-container font-label-md font-semibold"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
