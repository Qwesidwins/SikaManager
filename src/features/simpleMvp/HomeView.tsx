import React, { useState, useEffect, useMemo } from 'react';
import { transactionsRepo } from '@/db/repositories/transactionsRepo';
import { categoriesRepo } from '@/db/repositories/categoriesRepo';
import { accountsRepo } from '@/db/repositories/accountsRepo';
import { settingsRepo } from '@/db/repositories/settingsRepo';
import { hashPasscode } from '@/crypto/passcode';
import { useTheme } from '@/lib/theme';
import { clearAllDatabaseData } from '@/db/database';
import { seedInitialDataIfNeeded } from '@/db/seed';
import { formatMinor } from '@/domain/money';
import { accountBalance } from '@/domain/balance';
import { triggerHaptic } from '@/lib/haptics';
import type { Transaction, Category, TransactionType, Account } from '@/domain/types';
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
  Landmark,
  ShieldCheck,
  TrendingUp,
  Settings,
  SlidersHorizontal,
  X,
  AlertTriangle,
  RotateCcw,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Lock,
  Fingerprint,
  Check,
} from 'lucide-react';

interface HomeViewProps {
  onOpenAdd: () => void;
  onOpenOnboarding: () => void;
  onShowToast: (message: string) => void;
}

function getYearMonthKey(dateStr: string): string {
  const d = new Date(dateStr);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function formatMonthLabel(key: string): string {
  const [yearStr, monthStr] = key.split('-');
  const date = new Date(Number(yearStr), Number(monthStr) - 1, 1);
  return date.toLocaleDateString('en-GH', { month: 'long', year: 'numeric' });
}

export const HomeView: React.FC<HomeViewProps> = ({
  onOpenAdd,
  onOpenOnboarding,
  onShowToast,
}) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [filterType, setFilterType] = useState<TransactionType | 'all'>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all'); // 'all' or 'YYYY-MM'
  const [selectedAccountFilter, setSelectedAccountFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Modals & Settings
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Theme
  const { theme, toggleTheme } = useTheme();

  // Security settings
  const [hasPasscode, setHasPasscode] = useState(false);
  const [biometricActive, setBiometricActive] = useState(false);
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [newPin, setNewPin] = useState('');
  const [confirmNewPin, setConfirmNewPin] = useState('');
  const [pinError, setPinError] = useState('');

  useEffect(() => {
    loadData();
    loadSecuritySettings();
  }, []);

  async function loadSecuritySettings() {
    try {
      const lockEnabled = await settingsRepo.get('lockEnabled');
      const hash = await settingsRepo.get('passcodeHash');
      const bio = await settingsRepo.get('biometricEnabled');
      setHasPasscode(Boolean(lockEnabled && hash));
      setBiometricActive(Boolean(bio));
      if (
        typeof window !== 'undefined' &&
        window.PublicKeyCredential &&
        typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function'
      ) {
        const avail = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        setBiometricsAvailable(avail);
      }
    } catch {
      // Fallback
    }
  }

  async function handleSavePin() {
    if (!/^\d{4}$/.test(newPin)) {
      setPinError('PIN must be exactly 4 digits');
      return;
    }
    if (newPin !== confirmNewPin) {
      setPinError('PIN confirmation does not match');
      return;
    }
    try {
      const hash = await hashPasscode(newPin);
      await settingsRepo.set('passcodeHash', hash);
      await settingsRepo.set('lockEnabled', true);
      setHasPasscode(true);
      setShowPinSetup(false);
      setNewPin('');
      setConfirmNewPin('');
      setPinError('');
      onShowToast('4-digit PIN security activated');
    } catch {
      setPinError('Failed to save PIN');
    }
  }

  async function handleDisablePin() {
    triggerHaptic();
    await settingsRepo.set('passcodeHash', null);
    await settingsRepo.set('lockEnabled', false);
    await settingsRepo.set('biometricEnabled', false);
    setHasPasscode(false);
    setBiometricActive(false);
    onShowToast('PIN lock turned off');
  }

  async function handleToggleBiometric(val: boolean) {
    triggerHaptic();
    await settingsRepo.set('biometricEnabled', val);
    setBiometricActive(val);
    onShowToast(val ? 'Biometrics activated' : 'Biometrics deactivated');
  }

  async function loadData() {
    setLoading(true);
    try {
      const [txs, cats, accs] = await Promise.all([
        transactionsRepo.getAll(),
        categoriesRepo.getAll(),
        accountsRepo.getAll(),
      ]);
      setTransactions(txs);
      setCategories(cats);
      setAccounts(accs);
    } finally {
      setLoading(false);
    }
  }

  const categoryMap = useMemo(() => {
    return new Map(categories.map((c) => [c.id, c]));
  }, [categories]);

  const accountMap = useMemo(() => {
    return new Map(accounts.map((a) => [a.id, a]));
  }, [accounts]);

  // Distinct available months
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    for (const t of transactions) {
      if (!t.deletedAt) {
        set.add(getYearMonthKey(t.date));
      }
    }
    set.add(getYearMonthKey(new Date().toISOString()));
    return Array.from(set).sort().reverse();
  }, [transactions]);

  // Derived account balances (all transactions apply to live account balances)
  const accountBalances = useMemo(() => {
    const map = new Map<string, number>();
    for (const acc of accounts) {
      map.set(acc.id, accountBalance(acc, transactions));
    }
    return map;
  }, [accounts, transactions]);

  // Total Liquid Net Worth across all active accounts
  const totalBalanceMinor = useMemo(() => {
    let sum = 0;
    for (const acc of accounts) {
      if (!acc.archived) {
        sum += accountBalances.get(acc.id) ?? 0;
      }
    }
    return sum;
  }, [accounts, accountBalances]);

  // Active transactions within selected month (or all-time)
  const monthTransactions = useMemo(() => {
    if (selectedMonth === 'all') {
      return transactions.filter((t) => !t.deletedAt);
    }
    return transactions.filter((t) => !t.deletedAt && getYearMonthKey(t.date) === selectedMonth);
  }, [transactions, selectedMonth]);

  // Inflow & Outflow calculations for selected month scope
  const { totalIncomeMinor, totalExpenseMinor } = useMemo(() => {
    let income = 0;
    let expense = 0;

    for (const t of monthTransactions) {
      if (t.type === 'income') {
        income += t.amountMinor;
      } else if (t.type === 'expense') {
        expense += t.amountMinor;
      }
    }

    return { totalIncomeMinor: income, totalExpenseMinor: expense };
  }, [monthTransactions]);

  // Filtered transactions for the ledger view
  const filteredTransactions = useMemo(() => {
    return monthTransactions.filter((t) => {
      if (filterType !== 'all' && t.type !== filterType) return false;
      if (selectedAccountFilter && t.accountId !== selectedAccountFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const cat = t.categoryId ? categoryMap.get(t.categoryId)?.name.toLowerCase() : '';
        const note = (t.note || '').toLowerCase();
        const accName = accountMap.get(t.accountId)?.name.toLowerCase() || '';
        return (cat && cat.includes(q)) || note.includes(q) || accName.includes(q);
      }
      return true;
    });
  }, [monthTransactions, filterType, selectedAccountFilter, searchQuery, categoryMap, accountMap]);

  async function handleDeleteTransaction(id: string) {
    triggerHaptic();
    await transactionsRepo.softDelete(id);
    onShowToast('Transaction deleted');
    await loadData();
  }

  async function handleConfirmDeleteAccount() {
    if (!accountToDelete) return;
    triggerHaptic();
    try {
      await accountsRepo.delete(accountToDelete.id);
      if (selectedAccountFilter === accountToDelete.id) {
        setSelectedAccountFilter(null);
      }
      onShowToast(`Account "${accountToDelete.name}" deleted`);
      setAccountToDelete(null);
      await loadData();
    } catch {
      onShowToast('Failed to delete account');
    }
  }

  async function handleResetAllData() {
    triggerHaptic();
    try {
      await clearAllDatabaseData();
      await seedInitialDataIfNeeded();
      setShowResetConfirm(false);
      setShowSettingsModal(false);
      onShowToast('All data reset to initial state');
      await loadData();
    } catch {
      onShowToast('Failed to reset data');
    }
  }

  function getCategoryIcon(name?: string) {
    const n = (name || '').toLowerCase();
    if (n.includes('food') || n.includes('dining')) return <Utensils className="w-4 h-4 text-amber-700" />;
    if (n.includes('commute') || n.includes('fuel') || n.includes('transport')) return <Car className="w-4 h-4 text-blue-700" />;
    if (n.includes('airtime') || n.includes('data')) return <Smartphone className="w-4 h-4 text-violet-700" />;
    if (n.includes('rent') || n.includes('housing') || n.includes('util')) return <Home className="w-4 h-4 text-orange-700" />;
    if (n.includes('shop') || n.includes('market')) return <ShoppingBag className="w-4 h-4 text-rose-700" />;
    if (n.includes('health') || n.includes('medical')) return <HeartPulse className="w-4 h-4 text-emerald-700" />;
    if (n.includes('salary') || n.includes('stipend') || n.includes('freelance') || n.includes('gig') || n.includes('sale')) return <Briefcase className="w-4 h-4 text-emerald-700" />;
    if (n.includes('gift') || n.includes('remittance')) return <Gift className="w-4 h-4 text-pink-700" />;
    return <HelpCircle className="w-4 h-4 text-slate-500" />;
  }

  function getAccountIcon(type: string) {
    switch (type) {
      case 'cash':
        return <Wallet className="w-4 h-4 text-amber-700" />;
      case 'mobile_money':
        return <Smartphone className="w-4 h-4 text-emerald-700" />;
      case 'bank':
        return <Landmark className="w-4 h-4 text-blue-700" />;
      case 'savings':
        return <ShieldCheck className="w-4 h-4 text-violet-700" />;
      case 'investment':
        return <TrendingUp className="w-4 h-4 text-orange-700" />;
      default:
        return <Wallet className="w-4 h-4 text-slate-600" />;
    }
  }

  // Month navigation helpers
  const currentMonthIdx = selectedMonth === 'all' ? -1 : availableMonths.indexOf(selectedMonth);

  function handlePrevMonth() {
    triggerHaptic();
    if (selectedMonth === 'all') {
      if (availableMonths.length > 0) setSelectedMonth(availableMonths[0]!);
    } else if (currentMonthIdx < availableMonths.length - 1) {
      setSelectedMonth(availableMonths[currentMonthIdx + 1]!);
    }
  }

  function handleNextMonth() {
    triggerHaptic();
    if (currentMonthIdx > 0) {
      setSelectedMonth(availableMonths[currentMonthIdx - 1]!);
    } else if (currentMonthIdx === 0) {
      setSelectedMonth('all');
    }
  }

  return (
    <div className="flex-1 flex flex-col w-full px-4 pt-4 pb-28 max-w-xl mx-auto space-y-4 animate-in fade-in duration-150">
      {/* Top Header */}
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

        {/* Top Right Actions: Dark/Light Mode + Settings */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              triggerHaptic();
              toggleTheme();
            }}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            className="w-10 h-10 rounded-2xl bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-all shadow-xs"
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5 text-amber-400" />
            ) : (
              <Moon className="w-5 h-5 text-slate-700" />
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic();
              loadSecuritySettings();
              setShowSettingsModal(true);
            }}
            aria-label="Settings and security"
            className="w-10 h-10 rounded-2xl bg-surface-container-low hover:bg-surface-container text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-all shadow-xs"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Hero Card: Total Liquid Balance & Inflow / Outflow */}
      <div className="relative overflow-hidden rounded-[24px] bg-surface-container-lowest p-6 shadow-[0_4px_24px_-2px_rgba(20,33,61,0.06),0_2px_8px_-1px_rgba(20,33,61,0.03)] border border-outline-variant/30">
        <div className="relative z-10 flex flex-col space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-on-surface-variant font-medium">
                Total Balance
              </span>
              <span className="text-[11px] text-on-surface-variant font-medium bg-surface-container-low px-2 py-0.5 rounded-full">
                Liquid Money
              </span>
            </div>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-xl font-semibold text-secondary">
                GH₵
              </span>
              <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-primary dark:text-white">
                {(totalBalanceMinor / 100).toLocaleString('en-GH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* Month Navigator Header Bar */}
          <div className="flex items-center justify-between pt-1 pb-1 border-t border-outline-variant/20">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handlePrevMonth}
                aria-label="Previous month"
                className="w-7 h-7 rounded-lg bg-surface-container-low text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-xs font-bold text-primary dark:text-white flex items-center gap-1 px-1">
                <Calendar className="w-3.5 h-3.5 text-secondary" />
                <span>{selectedMonth === 'all' ? 'All Months (Lifetime)' : formatMonthLabel(selectedMonth)}</span>
              </span>
              <button
                type="button"
                onClick={handleNextMonth}
                disabled={selectedMonth === 'all'}
                aria-label="Next month"
                className="w-7 h-7 rounded-lg bg-surface-container-low text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-colors disabled:opacity-40"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {selectedMonth !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedMonth('all')}
                className="text-[11px] font-semibold text-secondary hover:underline"
              >
                Show All Time
              </button>
            )}
          </div>

          {/* Sub-strip: Inflow and Outflow for Selected Period */}
          <div className="grid grid-cols-2 gap-3 pt-1">
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

      {/* Liquid Assets Dashboard Section */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-primary dark:text-white">
              Liquid Assets
            </h2>
            <span className="text-[11px] text-on-surface-variant font-medium">
              ({accounts.length})
            </span>
          </div>
          <button
            type="button"
            onClick={onOpenOnboarding}
            className="text-xs font-semibold text-secondary hover:underline flex items-center gap-1"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Calibrate Starting Money</span>
          </button>
        </div>

        {/* Horizontal Scroll of Liquid Asset Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {accounts.map((acc) => {
            const bal = accountBalances.get(acc.id) ?? 0;
            const isFilterActive = selectedAccountFilter === acc.id;

            return (
              <div
                key={acc.id}
                onClick={() => {
                  triggerHaptic();
                  setSelectedAccountFilter(isFilterActive ? null : acc.id);
                }}
                className={`p-3 rounded-2xl border transition-all cursor-pointer relative group ${
                  isFilterActive
                    ? 'bg-primary text-white border-primary shadow-sm'
                    : 'bg-surface-container-lowest border-outline-variant/30 hover:border-outline-variant/60 shadow-xs'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div
                    className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                      isFilterActive ? 'bg-white/20 text-white' : 'bg-surface-container-low'
                    }`}
                  >
                    {getAccountIcon(acc.type)}
                  </div>

                  {/* Delete Account Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setAccountToDelete(acc);
                    }}
                    aria-label={`Delete account ${acc.name}`}
                    className={`w-6 h-6 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity ${
                      isFilterActive
                        ? 'text-white/70 hover:text-white hover:bg-white/20'
                        : 'text-outline hover:text-red-500 hover:bg-red-50'
                    }`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <p
                  className={`text-xs font-bold truncate ${
                    isFilterActive ? 'text-white' : 'text-primary dark:text-white'
                  }`}
                >
                  {acc.name}
                </p>

                <p
                  className={`text-sm font-extrabold tabular-nums mt-0.5 ${
                    isFilterActive
                      ? 'text-secondary-fixed'
                      : bal >= 0
                      ? 'text-primary dark:text-white'
                      : 'text-red-500'
                  }`}
                >
                  {formatMinor(bal, 'GHS')}
                </p>

                {isFilterActive && (
                  <span className="block text-[10px] text-white/80 mt-1 font-medium">
                    Filter Active (tap to clear)
                  </span>
                )}
              </div>
            );
          })}
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

          {/* Account Filter Active Pill */}
          {selectedAccountFilter && (
            <button
              type="button"
              onClick={() => setSelectedAccountFilter(null)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-secondary-container/40 text-secondary text-[11px] font-semibold"
            >
              <span>{accountMap.get(selectedAccountFilter)?.name}</span>
              <X className="w-3 h-3" />
            </button>
          )}

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
            placeholder="Search notes, places, or categories..."
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
                {searchQuery || filterType !== 'all' || selectedAccountFilter || selectedMonth !== 'all'
                  ? 'No entries match your search, month, and account filters.'
                  : 'Your ledger is clean. Tap "+ Add" below to log your first income or expense.'}
              </p>
            </div>
            {!searchQuery && filterType === 'all' && !selectedAccountFilter && (
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
              const account = accountMap.get(tx.accountId);
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
                        {account?.name || 'Cash'} · {category?.name || 'General'} · {formattedDate}
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
                      onClick={() => handleDeleteTransaction(tx.id)}
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

      {/* Delete Account Confirmation Modal */}
      {accountToDelete && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest max-w-sm w-full rounded-3xl p-6 shadow-2xl border border-outline-variant/30 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-primary dark:text-white">
                Delete {accountToDelete.name}?
              </h3>
              <p className="text-xs text-on-surface-variant">
                This will delete the account from your liquid assets. Existing transactions recorded to this account will remain in your activity log.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAccountToDelete(null)}
                className="py-2.5 px-4 rounded-xl bg-surface-container-low text-xs font-semibold text-on-surface hover:bg-surface-container transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteAccount}
                className="py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors"
              >
                Delete Account
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Settings / Manage Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest max-w-sm w-full rounded-3xl p-6 shadow-2xl border border-outline-variant/30 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
              <h3 className="text-base font-bold text-primary dark:text-white">
                SikaManger Settings
              </h3>
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="w-8 h-8 rounded-full bg-surface-container-low text-on-surface-variant hover:text-on-surface flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 max-h-[75vh] overflow-y-auto pr-1">
              {/* Appearance Mode Toggle */}
              <div className="p-3.5 rounded-2xl bg-surface-container-low flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-surface-container-lowest text-amber-500 flex items-center justify-center shadow-xs">
                    {theme === 'dark' ? (
                      <Sun className="w-4 h-4 text-amber-400" />
                    ) : (
                      <Moon className="w-4 h-4 text-slate-700" />
                    )}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-primary dark:text-white">
                      Appearance
                    </p>
                    <p className="text-[10px] text-on-surface-variant">
                      {theme === 'dark' ? 'Dark theme enabled' : 'Light theme enabled'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic();
                    toggleTheme();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-surface-container-lowest text-xs font-bold text-primary dark:text-white border border-outline-variant/30 hover:bg-surface-container transition-colors"
                >
                  {theme === 'dark' ? 'Light' : 'Dark'}
                </button>
              </div>

              {/* Security Section */}
              <div className="p-3.5 rounded-2xl bg-surface-container-low space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-surface-container-lowest text-secondary flex items-center justify-center shadow-xs">
                      <Lock className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-primary dark:text-white">
                        4-Digit PIN Security
                      </p>
                      <p className="text-[10px] text-on-surface-variant">
                        {hasPasscode ? 'Active & Protecting app' : 'Optional passcode protection'}
                      </p>
                    </div>
                  </div>

                  {!showPinSetup && (
                    hasPasscode ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            triggerHaptic();
                            setShowPinSetup(true);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-surface-container-lowest text-[11px] font-semibold text-secondary hover:bg-surface-container"
                        >
                          Change
                        </button>
                        <button
                          type="button"
                          onClick={handleDisablePin}
                          className="px-2.5 py-1 rounded-lg bg-red-50 text-[11px] font-semibold text-red-600 hover:bg-red-100"
                        >
                          Disable
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic();
                          setShowPinSetup(true);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-primary text-white text-xs font-bold shadow-xs active:scale-95"
                      >
                        Set Up
                      </button>
                    )
                  )}
                </div>

                {/* Inline PIN setup form */}
                {showPinSetup && (
                  <div className="pt-3 border-t border-outline-variant/20 space-y-2.5 animate-in fade-in duration-150">
                    <p className="text-[11px] font-semibold text-primary dark:text-white">
                      {hasPasscode ? 'Enter New 4-Digit PIN' : 'Create 4-Digit PIN'}
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="password"
                        inputMode="numeric"
                        maxLength={4}
                        placeholder="PIN"
                        value={newPin}
                        onChange={(e) => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        className="w-full px-3 py-2 rounded-xl bg-surface-container-lowest border border-outline-variant/30 text-center tracking-widest text-xs font-bold text-primary dark:text-white focus:outline-none"
                      />
                      <input
                        type="password"
                        inputMode="numeric"
                        maxLength={4}
                        placeholder="Confirm"
                        value={confirmNewPin}
                        onChange={(e) => setConfirmNewPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        className="w-full px-3 py-2 rounded-xl bg-surface-container-lowest border border-outline-variant/30 text-center tracking-widest text-xs font-bold text-primary dark:text-white focus:outline-none"
                      />
                    </div>

                    {pinError && (
                      <p className="text-[10px] text-red-600 font-medium">{pinError}</p>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setShowPinSetup(false);
                          setNewPin('');
                          setConfirmNewPin('');
                          setPinError('');
                        }}
                        className="px-3 py-1.5 rounded-xl text-xs font-medium text-on-surface-variant hover:text-on-surface"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSavePin}
                        className="px-4 py-1.5 rounded-xl bg-primary text-white text-xs font-bold shadow-xs flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        Save PIN
                      </button>
                    </div>
                  </div>
                )}

                {/* Biometrics Toggle */}
                {biometricsAvailable && (
                  <div className="pt-2 border-t border-outline-variant/20 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Fingerprint className="w-4 h-4 text-secondary" />
                      <span className="text-xs font-semibold text-primary dark:text-white">
                        Biometrics (Fingerprint / Face)
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={biometricActive}
                        onChange={(e) => handleToggleBiometric(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4 bg-surface-container-high peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-secondary"></div>
                    </label>
                  </div>
                )}
              </div>

              {/* Calibrate Liquid Money */}
              <button
                type="button"
                onClick={() => {
                  setShowSettingsModal(false);
                  onOpenOnboarding();
                }}
                className="w-full p-3 rounded-2xl bg-surface-container-low text-left flex items-center gap-3 hover:bg-surface-container transition-colors"
              >
                <div className="w-8 h-8 rounded-xl bg-surface-container-lowest text-secondary flex items-center justify-center shadow-xs">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-primary dark:text-white">
                    Calibrate Starting Liquid Money
                  </p>
                  <p className="text-[10px] text-on-surface-variant">
                    Update Cash, Bank, MoMo and Savings balances
                  </p>
                </div>
              </button>

              {/* Clear All Data */}
              <button
                type="button"
                onClick={() => setShowResetConfirm(true)}
                className="w-full p-3 rounded-2xl bg-red-50 text-left flex items-center gap-3 hover:bg-red-100/70 transition-colors text-red-700"
              >
                <div className="w-8 h-8 rounded-xl bg-white text-red-600 flex items-center justify-center shadow-xs">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold">Clear All Data</p>
                  <p className="text-[10px] text-red-500">
                    Reset ledger and restart onboarding fresh
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirmation Dialog */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest max-w-sm w-full rounded-3xl p-6 shadow-2xl border border-red-200 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-primary dark:text-white">
                Delete All Information?
              </h3>
              <p className="text-xs text-on-surface-variant">
                This will erase all accounts and transactions from IndexedDB. This action cannot be undone.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="py-2.5 px-4 rounded-xl bg-surface-container-low text-xs font-semibold text-on-surface"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetAllData}
                className="py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold"
              >
                Yes, Reset All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
