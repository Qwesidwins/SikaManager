import React, { useState, useEffect, useMemo } from 'react';
import { transactionsRepo } from '@/db/repositories/transactionsRepo';
import { categoriesRepo } from '@/db/repositories/categoriesRepo';
import { accountsRepo } from '@/db/repositories/accountsRepo';
import { parseAmountInput, formatMinor } from '@/domain/money';
import { accountBalance } from '@/domain/balance';
import { triggerHaptic } from '@/lib/haptics';
import type { Category, TransactionType, Account, Transaction } from '@/domain/types';
import {
  X,
  Check,
  ArrowDownLeft,
  ArrowUpRight,
  Utensils,
  Car,
  Smartphone,
  Home,
  ShoppingBag,
  HeartPulse,
  Briefcase,
  Gift,
  HelpCircle,
  Calendar,
  Building2,
  Wallet,
  Landmark,
  ShieldCheck,
  TrendingUp,
  ChevronDown,
  Layers,
} from 'lucide-react';

interface AddTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export const AddTransactionModal: React.FC<AddTransactionModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [type, setType] = useState<TransactionType>('expense');
  const [amountStr, setAmountStr] = useState('');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0] ?? '');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setType('expense');
      setAmountStr('');
      setNote('');
      setDate(new Date().toISOString().split('T')[0] ?? '');
      setErrorMsg('');
      setShowAccountPicker(false);
      loadAccountsAndTransactions();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      loadCategories();
    }
  }, [isOpen, type]);

  async function loadAccountsAndTransactions() {
    try {
      const [accs, txs] = await Promise.all([
        accountsRepo.getAll(),
        transactionsRepo.getAll(),
      ]);
      setAccounts(accs);
      setTransactions(txs);
      if (accs.length > 0 && !selectedAccountId) {
        setSelectedAccountId(accs[0]!.id);
      }
    } catch {
      // Fallback
    }
  }

  async function loadCategories() {
    try {
      const cats = await categoriesRepo.getAll(type === 'income' ? 'income' : 'expense');
      setCategories(cats);
      if (cats.length > 0) {
        setSelectedCategoryId(cats[0]!.id);
      }
    } catch {
      // Fallback
    }
  }

  // Current derived account balances
  const accountBalances = useMemo(() => {
    const map = new Map<string, number>();
    for (const acc of accounts) {
      map.set(acc.id, accountBalance(acc, transactions));
    }
    return map;
  }, [accounts, transactions]);

  const selectedAccount = useMemo(() => {
    return accounts.find((a) => a.id === selectedAccountId) || accounts[0];
  }, [accounts, selectedAccountId]);

  const selectedAccountBalance = useMemo(() => {
    if (!selectedAccount) return 0;
    return accountBalances.get(selectedAccount.id) ?? 0;
  }, [selectedAccount, accountBalances]);

  // Parse amount for previewing projected balance
  const parsedAmount = useMemo(() => {
    const res = parseAmountInput(amountStr);
    return res.ok ? res.minor : 0;
  }, [amountStr]);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg('');

    const parsed = parseAmountInput(amountStr);
    if (!parsed.ok) {
      setErrorMsg(parsed.error);
      return;
    }
    if (parsed.minor <= 0) {
      setErrorMsg('Amount must be greater than zero');
      return;
    }

    try {
      setIsSubmitting(true);
      triggerHaptic();

      const accountId = selectedAccountId || accounts[0]?.id || 'acc-cash';
      const isoDate = new Date(`${date}T12:00:00.000Z`).toISOString();

      await transactionsRepo.create({
        type,
        amountMinor: parsed.minor,
        currency: 'GHS',
        accountId,
        categoryId: selectedCategoryId || undefined,
        date: isoDate,
        note: note.trim() || undefined,
      });

      onSuccess(type === 'income' ? 'Income added successfully' : 'Expense recorded');
      onClose();
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Failed to save transaction');
    } finally {
      setIsSubmitting(false);
    }
  }

  function getChipIcon(name: string) {
    const n = name.toLowerCase();
    if (n.includes('food')) return <Utensils className="w-3.5 h-3.5" />;
    if (n.includes('commute') || n.includes('transport') || n.includes('fuel')) return <Car className="w-3.5 h-3.5" />;
    if (n.includes('airtime') || n.includes('data')) return <Smartphone className="w-3.5 h-3.5" />;
    if (n.includes('rent') || n.includes('util') || n.includes('housing')) return <Home className="w-3.5 h-3.5" />;
    if (n.includes('shop')) return <ShoppingBag className="w-3.5 h-3.5" />;
    if (n.includes('health')) return <HeartPulse className="w-3.5 h-3.5" />;
    if (n.includes('freelance') || n.includes('gig') || n.includes('sale') || n.includes('trade')) return <Briefcase className="w-3.5 h-3.5" />;
    if (n.includes('gift')) return <Gift className="w-3.5 h-3.5" />;
    return <HelpCircle className="w-3.5 h-3.5" />;
  }

  function getAccountBadgeIcon(type: string) {
    switch (type) {
      case 'cash':
        return <Wallet className="w-4 h-4 text-amber-600" />;
      case 'mobile_money':
        return <Smartphone className="w-4 h-4 text-emerald-600" />;
      case 'bank':
        return <Landmark className="w-4 h-4 text-blue-600" />;
      case 'savings':
        return <ShieldCheck className="w-4 h-4 text-violet-600" />;
      case 'investment':
        return <TrendingUp className="w-4 h-4 text-orange-600" />;
      default:
        return <Building2 className="w-4 h-4 text-slate-500" />;
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-surface-container-lowest dark:bg-slate-900 w-full max-w-lg rounded-t-[28px] sm:rounded-[28px] shadow-2xl border border-outline-variant/30 p-6 max-h-[92vh] overflow-y-auto relative">
        {/* Drag handle for mobile */}
        <div className="w-12 h-1.5 bg-outline-variant/60 rounded-full mx-auto -mt-1 mb-4 sm:hidden"></div>

        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3">
          <h2 className="text-xl font-bold text-primary dark:text-white">
            {type === 'income' ? 'Add Income' : 'Add Expense'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 rounded-full bg-surface-container-low text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Segmented Type Toggle Pill */}
          <div className="bg-surface-container-low p-1 rounded-full grid grid-cols-2 gap-1">
            <button
              type="button"
              onClick={() => {
                triggerHaptic();
                setType('expense');
              }}
              className={`py-2 rounded-full font-semibold text-xs flex items-center justify-center gap-1.5 transition-all ${
                type === 'expense'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5 text-red-400" />
              <span>Expense</span>
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHaptic();
                setType('income');
              }}
              className={`py-2 rounded-full font-semibold text-xs flex items-center justify-center gap-1.5 transition-all ${
                type === 'income'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-400" />
              <span>Income</span>
            </button>
          </div>

          {/* Large Hero Amount Input */}
          <div className="flex flex-col items-center justify-center py-4 bg-surface-container-low/50 rounded-2xl border border-outline-variant/20">
            <span className="text-[11px] uppercase tracking-wider text-on-surface-variant font-medium mb-1">
              Amount ({type.toUpperCase()})
            </span>
            <div className="flex items-baseline justify-center gap-2">
              <span className="text-2xl font-bold text-secondary">
                GH₵
              </span>
              <input
                type="text"
                inputMode="decimal"
                autoFocus
                placeholder="0.00"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                className="w-48 text-3xl sm:text-4xl font-extrabold tracking-tight text-center bg-transparent text-primary dark:text-white placeholder:text-outline focus:outline-none"
              />
            </div>
          </div>

          {/* Account Selector Card: Tap to open Pop-up Box */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-primary dark:text-white">
                {type === 'expense' ? 'Deduct From' : 'Deposit Into'}
              </label>
              <span className="text-[11px] text-secondary font-medium">
                Tap to change account
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                triggerHaptic();
                setShowAccountPicker(true);
              }}
              aria-label={`Choose account: currently ${selectedAccount?.name || 'none'}`}
              className="w-full p-3 rounded-2xl bg-surface-container-low border border-outline-variant/30 flex items-center justify-between hover:bg-surface-container/80 transition-all group active:scale-[0.99]"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-surface-container-lowest flex items-center justify-center shadow-xs shrink-0">
                  {selectedAccount ? getAccountBadgeIcon(selectedAccount.type) : <Wallet className="w-5 h-5 text-secondary" />}
                </div>
                <div className="min-w-0 text-left">
                  <p className="text-xs font-bold text-primary dark:text-white truncate">
                    {selectedAccount?.name || 'Select Account'}
                  </p>
                  <p className="text-[11px] text-on-surface-variant tabular-nums">
                    Current Balance: {formatMinor(selectedAccountBalance, 'GHS')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container-lowest text-xs font-semibold text-secondary group-hover:bg-primary group-hover:text-white transition-colors shrink-0 shadow-2xs">
                <span>Change</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </div>
            </button>
          </div>

          {/* Where or Category Input (Optional) */}
          <div>
            <label className="block text-xs font-semibold text-primary dark:text-white mb-1.5">
              Where or Custom Category (Optional)
            </label>
            <input
              type="text"
              placeholder="Lunch, Uber, Project fee, Auntie Muni, Shell station..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-surface-container-low text-xs font-medium text-on-surface border border-outline-variant/20 placeholder:text-outline focus:outline-none focus:ring-2 focus:ring-secondary/40"
            />
          </div>

          {/* Category Chips Scroll Carousel */}
          <div>
            <label className="block text-[11px] font-semibold text-on-surface-variant mb-1.5">
              Quick Category Chips
            </label>
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
              {categories.map((cat) => {
                const isSelected = selectedCategoryId === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      triggerHaptic();
                      setSelectedCategoryId(cat.id);
                    }}
                    className={`shrink-0 h-[34px] px-3 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 ${
                      isSelected
                        ? 'bg-primary text-white shadow-sm'
                        : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
                    }`}
                  >
                    {getChipIcon(cat.name)}
                    <span>{cat.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date Picker */}
          <div>
            <label className="block text-xs font-semibold text-primary dark:text-white mb-1.5">
              Date
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-outline absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-surface-container-low text-xs font-medium text-on-surface border border-outline-variant/20 focus:outline-none focus:ring-2 focus:ring-secondary/40"
              />
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-300 text-xs font-medium">
              {errorMsg}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 px-4 rounded-2xl bg-primary hover:bg-primary-container active:scale-[0.99] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>{type === 'income' ? 'Save Income' : 'Save Expense'}</span>
          </button>
        </form>

        {/* Dedicated Account Pop-up Box / Modal */}
        {showAccountPicker && (
          <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-surface-container-lowest dark:bg-slate-900 max-w-md w-full rounded-t-[32px] sm:rounded-[32px] p-6 shadow-2xl border border-outline-variant/30 flex flex-col max-h-[85vh]">
              {/* Pop-up Header */}
              <div className="flex items-center justify-between pb-3 border-b border-outline-variant/20">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-primary text-secondary-container flex items-center justify-center shadow-xs">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-primary dark:text-white leading-tight">
                      {type === 'expense' ? 'Choose Account to Deduct From' : 'Choose Account to Deposit Into'}
                    </h3>
                    <p className="text-[11px] text-on-surface-variant">
                      Select which wallet or account is affected
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowAccountPicker(false)}
                  aria-label="Close account picker"
                  className="w-8 h-8 rounded-full bg-surface-container-low text-on-surface-variant hover:text-on-surface flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Pop-up Account List */}
              <div className="flex-1 overflow-y-auto space-y-2.5 py-3 pr-1">
                {accounts.map((acc) => {
                  const bal = accountBalances.get(acc.id) ?? 0;
                  const isSelected = (selectedAccountId || accounts[0]?.id) === acc.id;
                  const newBal = type === 'expense' ? bal - parsedAmount : bal + parsedAmount;

                  return (
                    <button
                      key={acc.id}
                      type="button"
                      aria-label={`Select account ${acc.name}`}
                      onClick={() => {
                        triggerHaptic();
                        setSelectedAccountId(acc.id);
                        setShowAccountPicker(false);
                      }}
                      className={`w-full p-3.5 rounded-2xl border text-left flex items-center justify-between gap-3 transition-all ${
                        isSelected
                          ? 'bg-primary text-white border-primary shadow-sm ring-2 ring-secondary/30'
                          : 'bg-surface-container-low/70 border-outline-variant/20 hover:bg-surface-container hover:border-outline-variant/40'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-surface-container-lowest shadow-xs'
                          }`}
                        >
                          {getAccountBadgeIcon(acc.type)}
                        </div>
                        <div className="min-w-0">
                          <p
                            className={`text-xs font-bold truncate ${
                              isSelected ? 'text-white' : 'text-primary dark:text-white'
                            }`}
                          >
                            {acc.name}
                          </p>
                          <p
                            className={`text-[11px] tabular-nums ${
                              isSelected ? 'text-white/80' : 'text-on-surface-variant'
                            }`}
                          >
                            Current: {formatMinor(bal, 'GHS')}
                          </p>
                          {parsedAmount > 0 && (
                            <p
                              className={`text-[10px] font-semibold mt-0.5 tabular-nums ${
                                isSelected ? 'text-secondary-fixed' : 'text-secondary'
                              }`}
                            >
                              After {type === 'expense' ? 'deduction' : 'deposit'}: {formatMinor(newBal, 'GHS')}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center">
                        {isSelected ? (
                          <div className="w-7 h-7 rounded-full bg-secondary text-primary flex items-center justify-center font-bold">
                            <Check className="w-4 h-4 stroke-[3]" />
                          </div>
                        ) : (
                          <span className="text-xs text-on-surface-variant font-medium px-2 py-1 rounded-lg bg-surface-container-lowest">
                            Select
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Pop-up Footer */}
              <div className="pt-2 border-t border-outline-variant/20">
                <button
                  type="button"
                  onClick={() => setShowAccountPicker(false)}
                  className="w-full py-2.5 rounded-xl bg-surface-container-low text-xs font-semibold text-on-surface hover:bg-surface-container"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
