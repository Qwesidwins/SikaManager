import React, { useState, useEffect } from 'react';
import { transactionsRepo } from '@/db/repositories/transactionsRepo';
import { categoriesRepo } from '@/db/repositories/categoriesRepo';
import { accountsRepo } from '@/db/repositories/accountsRepo';
import { parseAmountInput } from '@/domain/money';
import { triggerHaptic } from '@/lib/haptics';
import type { Category, TransactionType } from '@/domain/types';
import { X, Check, ArrowDownLeft, ArrowUpRight } from 'lucide-react';

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
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      loadCategories();
    }
  }, [isOpen, type]);

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

      // Ensure we have a default account
      const accounts = await accountsRepo.getAll();
      const accountId = accounts[0]?.id ?? 'acc-cash';

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

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 p-6 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            {type === 'income' ? 'Add Income' : 'Add Expense'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 pt-4">
          {/* Segmented Control: Expense vs Income */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
            <button
              type="button"
              onClick={() => {
                setType('expense');
                triggerHaptic();
              }}
              className={`py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-1.5 transition-all ${
                type === 'expense'
                  ? 'bg-white dark:bg-slate-700 text-red-600 dark:text-red-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              <ArrowDownLeft className="w-4 h-4" />
              Expense
            </button>
            <button
              type="button"
              onClick={() => {
                setType('income');
                triggerHaptic();
              }}
              className={`py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-1.5 transition-all ${
                type === 'income'
                  ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              <ArrowUpRight className="w-4 h-4" />
              Income
            </button>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
              Amount (GH₵)
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-4 text-slate-400 font-bold text-xl">GH₵</span>
              <input
                type="text"
                inputMode="decimal"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                placeholder="0.00"
                autoFocus
                className="w-full pl-16 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl text-2xl font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* Category Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
              Category
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto pr-1">
              {categories.map((cat) => {
                const isSelected = cat.id === selectedCategoryId;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      setSelectedCategoryId(cat.id);
                      triggerHaptic();
                    }}
                    className={`p-2.5 rounded-xl border text-left text-xs font-medium flex items-center gap-2 transition-all ${
                      isSelected
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 font-semibold'
                        : 'border-slate-200 dark:border-slate-750 bg-slate-50/50 dark:bg-slate-800/40 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: cat.color || '#C9962B' }}
                    />
                    <span className="truncate">{cat.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date & Note in a clean 2-column or stacked layout */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                Note (Optional)
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Lunch, Uber, Project fee"
                className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {errorMsg && (
            <p className="text-xs font-medium text-red-500 bg-red-50 dark:bg-red-950/40 p-2.5 rounded-xl border border-red-200 dark:border-red-900">
              {errorMsg}
            </p>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 px-4 rounded-2xl bg-amber-600 hover:bg-amber-700 active:scale-[0.99] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-600/20 transition-all disabled:opacity-50"
          >
            <Check className="w-5 h-5" />
            <span>Save {type === 'income' ? 'Income' : 'Expense'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
