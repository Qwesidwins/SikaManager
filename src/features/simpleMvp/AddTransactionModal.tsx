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
  ArrowLeft,
  ArrowRight,
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
  const [step, setStep] = useState<'input' | 'choose_account'>('input');
  const [type, setType] = useState<TransactionType>('expense');
  const [amountStr, setAmountStr] = useState('');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0] ?? '');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStep('input');
      setType('expense');
      setAmountStr('');
      setNote('');
      setDate(new Date().toISOString().split('T')[0] ?? '');
      setErrorMsg('');
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

  // Parse amount for previewing projected balance
  const parsedAmount = useMemo(() => {
    const res = parseAmountInput(amountStr);
    return res.ok ? res.minor : 0;
  }, [amountStr]);

  if (!isOpen) return null;

  // Step 1: Validate amount and trigger pop-up transition
  function handleProceedToAccountChoice(e: React.FormEvent) {
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

    triggerHaptic();
    setStep('choose_account');
  }

  // Step 2: Strictly choose the asset to deduct from or deposit to, and save
  async function handleConfirmSaveWithAccount(accountId: string) {
    const parsed = parseAmountInput(amountStr);
    if (!parsed.ok || parsed.minor <= 0) return;

    try {
      setIsSubmitting(true);
      triggerHaptic();

      const isoDate = new Date(`${date}T12:00:00.000Z`).toISOString();
      const targetAccount = accounts.find((a) => a.id === accountId);

      await transactionsRepo.create({
        type,
        amountMinor: parsed.minor,
        currency: 'GHS',
        accountId,
        categoryId: selectedCategoryId || undefined,
        date: isoDate,
        note: note.trim() || undefined,
      });

      const actionText = type === 'expense' ? 'Deducted' : 'Deposited';
      onSuccess(
        `${actionText} GH₵ ${amountStr} ${
          type === 'expense' ? 'from' : 'into'
        } ${targetAccount?.name || 'account'}`
      );
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

  function getAccountBadgeIcon(accType: string) {
    switch (accType) {
      case 'cash':
        return <Wallet className="w-5 h-5 text-amber-700" />;
      case 'mobile_money':
        return <Smartphone className="w-5 h-5 text-emerald-700" />;
      case 'bank':
        return <Landmark className="w-5 h-5 text-blue-700" />;
      case 'savings':
        return <ShieldCheck className="w-5 h-5 text-violet-700" />;
      case 'investment':
        return <TrendingUp className="w-5 h-5 text-orange-700" />;
      default:
        return <Building2 className="w-5 h-5 text-slate-500" />;
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-surface-container-lowest dark:bg-slate-900 w-full max-w-lg rounded-t-[28px] sm:rounded-[28px] shadow-2xl border border-outline-variant/30 p-6 max-h-[92vh] overflow-y-auto relative">
        {/* Drag handle for mobile */}
        <div className="w-12 h-1.5 bg-outline-variant/60 rounded-full mx-auto -mt-1 mb-4 sm:hidden"></div>

        {step === 'input' ? (
          /* STEP 1: Enter Amount & Details */
          <div className="space-y-4 animate-in fade-in duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
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

            <form onSubmit={handleProceedToAccountChoice} className="space-y-4 pt-1">
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

              {/* Submit Button -> Transitions to Pop-Up */}
              <button
                type="submit"
                className="w-full py-3.5 px-4 rounded-2xl bg-primary hover:bg-primary-container active:scale-[0.99] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                <span>{type === 'expense' ? 'Save Expense' : 'Save Income'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        ) : (
          /* STEP 2: Dedicated Pop-up asking where money is deducted/debited from */
          <div className="animate-in fade-in slide-in-from-right-4 duration-200 space-y-4">
            {/* Pop-up Navigation Header */}
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20">
              <button
                type="button"
                onClick={() => setStep('input')}
                className="text-xs font-semibold text-secondary hover:underline flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-surface-container-low transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Edit Amount (GH₵ {amountStr})</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="w-8 h-8 rounded-full bg-surface-container-low text-on-surface-variant hover:text-on-surface flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Prompt Question */}
            <div className="text-center py-2 space-y-1">
              <div
                className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center mb-1.5 shadow-xs"
                style={{
                  backgroundColor: type === 'expense' ? '#fee2e2' : '#dcfce7',
                  color: type === 'expense' ? '#dc2626' : '#16a34a',
                }}
              >
                {type === 'expense' ? (
                  <ArrowUpRight className="w-6 h-6" />
                ) : (
                  <ArrowDownLeft className="w-6 h-6" />
                )}
              </div>
              <h3 className="text-base sm:text-lg font-extrabold text-primary dark:text-white leading-tight">
                {type === 'expense'
                  ? `Where are you taking this GH₵ ${amountStr} from?`
                  : `Where are you depositing this GH₵ ${amountStr} into?`}
              </h3>
              <p className="text-xs text-on-surface-variant">
                Strictly choose from your listed liquid assets:
              </p>
            </div>

            {/* Listed Liquid Assets to strictly choose from */}
            <div className="space-y-2.5 max-h-[55vh] overflow-y-auto pr-1">
              {accounts.map((acc) => {
                const bal = accountBalances.get(acc.id) ?? 0;
                const afterBal = type === 'expense' ? bal - parsedAmount : bal + parsedAmount;

                return (
                  <button
                    key={acc.id}
                    type="button"
                    aria-label={`Select account ${acc.name}`}
                    onClick={() => handleConfirmSaveWithAccount(acc.id)}
                    disabled={isSubmitting}
                    className="w-full p-4 rounded-2xl bg-surface-container-low border border-outline-variant/30 hover:border-primary hover:bg-surface-container flex items-center justify-between gap-3 transition-all active:scale-[0.99] group shadow-xs hover:shadow-md text-left disabled:opacity-50"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-11 h-11 rounded-2xl bg-surface-container-lowest flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                        {getAccountBadgeIcon(acc.type)}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-primary dark:text-white truncate">
                          {acc.name}
                        </p>
                        <p className="text-xs text-on-surface-variant tabular-nums">
                          Available: {formatMinor(bal, 'GHS')}
                        </p>
                        <p className="text-[11px] font-semibold text-secondary tabular-nums mt-0.5">
                          After: {formatMinor(afterBal, 'GHS')}
                        </p>
                      </div>
                    </div>

                    <div className="px-3.5 py-2 rounded-xl bg-primary text-white text-xs font-bold shrink-0 shadow-xs group-hover:bg-primary-container transition-colors">
                      {type === 'expense' ? 'Deduct' : 'Deposit'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
