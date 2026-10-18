import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { budgetsRepo, categoriesRepo, transactionsRepo, settingsRepo } from '@/db';
import { budgetProgress, calculateBudgetSpent } from '@/domain/budget';
import { parseAmountInput, formatMinor } from '@/domain/money';
import { EmptyState } from '@/components/EmptyState';
import { triggerHaptic } from '@/lib/haptics';
import type { Budget, Category, Transaction, BudgetPeriod, Settings } from '@/domain/types';

interface BudgetsViewProps {
  onBack?: () => void;
  onOpenQuickAdd: () => void;
}

export const BudgetsView: React.FC<BudgetsViewProps> = ({ onBack, onOpenQuickAdd: _onOpenQuickAdd }) => {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal create/edit state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null);
  const [categoryId, setCategoryId] = useState('');
  const [period, setPeriod] = useState<BudgetPeriod>('month');
  const [limitStr, setLimitStr] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    const [bgts, cats, txns, setts] = await Promise.all([
      budgetsRepo.getAll(),
      categoriesRepo.getAll('expense'),
      transactionsRepo.getAll(),
      settingsRepo.getAll(),
    ]);
    setBudgets(bgts);
    setCategories(cats);
    setTransactions(txns);
    setSettings(setts);
    if (cats.length > 0 && !categoryId) {
      setCategoryId(cats[0]!.id);
    }
    setLoading(false);
  }, [categoryId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Budget calculations
  const budgetData = useMemo(() => {
    const referenceDate = new Date();
    return budgets.map((b) => {
      const cat = categories.find((c) => c.id === b.categoryId);
      const spent = calculateBudgetSpent(b, transactions, referenceDate, settings?.weekStart || 1);
      const progress = budgetProgress(b, spent);
      return {
        budget: b,
        category: cat,
        progress,
      };
    });
  }, [budgets, categories, transactions, settings]);

  const handleOpenAdd = () => {
    setEditingBudget(null);
    setCategoryId(categories[0]?.id || '');
    setPeriod('month');
    setLimitStr('');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (b: Budget) => {
    setEditingBudget(b);
    setCategoryId(b.categoryId);
    setPeriod(b.period);
    setLimitStr((b.limitMinor / 100).toString());
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    setErrorMsg('');
    const parsed = parseAmountInput(limitStr);
    if (!parsed.ok) {
      setErrorMsg(parsed.error);
      return;
    }

    if (!categoryId) {
      setErrorMsg('Please select a category');
      return;
    }

    triggerHaptic(20);
    const now = new Date().toISOString();
    const startsOn = now.slice(0, 10);

    if (editingBudget) {
      await budgetsRepo.update(editingBudget.id, {
        categoryId,
        period,
        limitMinor: parsed.minor,
      });
    } else {
      await budgetsRepo.create({
        id: crypto.randomUUID(),
        categoryId,
        period,
        limitMinor: parsed.minor,
        startsOn,
        createdAt: now,
        updatedAt: now,
      });
    }

    setIsModalOpen(false);
    await loadData();
  };

  const handleDelete = async (id: string) => {
    triggerHaptic(20);
    await budgetsRepo.softDelete(id);
    await loadData();
  };

  return (
    <div className="flex flex-col w-full px-margin pb-space-2xl gap-space-lg">
      {/* Header */}
      <div className="flex items-center justify-between pt-space-xs">
        <div className="flex items-center gap-space-xs">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="w-10 h-10 rounded-full flex items-center justify-center text-on-surface hover:bg-surface-container active:scale-95"
            >
              <span className="material-symbols-outlined text-[24px]">arrow_back</span>
            </button>
          )}
          <h2 className="font-headline-lg text-headline-lg text-primary tracking-tight">Budgets</h2>
        </div>
        <button
          type="button"
          onClick={handleOpenAdd}
          className="h-10 px-4 rounded-full bg-secondary-container text-on-secondary-container font-label-md font-semibold flex items-center gap-1 active:scale-95 transition-transform"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          <span>Add Budget</span>
        </button>
      </div>

      {/* Budgets List */}
      {!loading && budgetData.length === 0 ? (
        <EmptyState
          icon="savings"
          title="No budgets yet"
          description="Budgets help guide your spending without harsh alerts. Add a budget for food, transport, or bills to stay on track."
          actionLabel="Create a budget"
          onAction={handleOpenAdd}
        />
      ) : (
        <div className="flex flex-col gap-space-sm">
          {budgetData.map(({ budget, category, progress }) => {
            const isOver = progress.isOver;
            const progressPercent = Math.min(100, progress.percentUsed);

            return (
              <div
                key={budget.id}
                className="rounded-2xl bg-surface-container-lowest p-space-md shadow-sm flex flex-col gap-3 relative overflow-hidden"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-space-xs min-w-0">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${category?.color || '#14213D'}18` }}
                    >
                      <span
                        className="material-symbols-outlined text-[20px]"
                        style={{ color: category?.color || '#14213D' }}
                      >
                        {category?.icon || 'category'}
                      </span>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-body-md-bold text-body-md-bold text-primary truncate">
                        {category?.name || 'Category'}
                      </span>
                      <span className="font-label-sm text-label-sm text-on-surface-variant capitalize">
                        Per {budget.period}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      aria-label="Edit budget"
                      onClick={() => handleOpenEdit(budget)}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-outline hover:text-primary transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                    <button
                      type="button"
                      aria-label="Delete budget"
                      onClick={() => handleDelete(budget.id)}
                      className="w-8 h-8 rounded-full flex items-center justify-center text-outline hover:text-error transition-colors"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full flex flex-col gap-1.5">
                  <div className="w-full h-2 rounded-full bg-surface-container-high overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isOver
                          ? 'bg-warm-caution' // Muted warm color, not alarm red!
                          : progress.percentUsed >= 85
                          ? 'bg-secondary'
                          : 'bg-primary-container'
                      }`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between font-label-sm text-label-sm tabular-nums">
                    <span className={isOver ? 'text-warm-caution font-semibold' : 'text-primary'}>
                      {isOver
                        ? `Over by ${formatMinor(progress.overByMinor)}`
                        : `${formatMinor(progress.remainingMinor)} remaining`}
                    </span>
                    <span className="text-on-surface-variant">
                      {formatMinor(progress.spentMinor)} / {formatMinor(progress.limitMinor)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Budget Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-primary/40 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-surface-container-lowest rounded-2xl p-space-md shadow-xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h4 className="font-headline-sm text-primary">
                {editingBudget ? 'Edit Budget' : 'Add Budget'}
              </h4>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-outline"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {errorMsg && (
              <div className="p-2.5 rounded-xl bg-error-container text-on-error-container font-label-sm text-xs">
                {errorMsg}
              </div>
            )}

            {/* Category Select */}
            <div className="flex flex-col gap-1">
              <label className="font-label-sm font-semibold text-primary">Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full h-11 px-3 rounded-xl bg-surface-container-low text-on-surface font-body-md text-sm outline-none"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Period Toggle */}
            <div className="flex flex-col gap-1">
              <label className="font-label-sm font-semibold text-primary">Period</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPeriod('month')}
                  className={`py-2 rounded-xl font-label-md text-xs font-semibold ${
                    period === 'month'
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-container-low text-on-surface'
                  }`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setPeriod('week')}
                  className={`py-2 rounded-xl font-label-md text-xs font-semibold ${
                    period === 'week'
                      ? 'bg-primary text-on-primary'
                      : 'bg-surface-container-low text-on-surface'
                  }`}
                >
                  Weekly
                </button>
              </div>
            </div>

            {/* Limit Input */}
            <div className="flex flex-col gap-1">
              <label className="font-label-sm font-semibold text-primary">Limit (GH₵)</label>
              <input
                type="text"
                value={limitStr}
                onChange={(e) => setLimitStr(e.target.value)}
                placeholder="e.g. 500"
                className="w-full h-11 px-3 rounded-xl bg-surface-container-low text-on-surface font-body-md text-sm outline-none"
                autoFocus
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-surface-container-low text-on-surface font-label-md"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="flex-1 py-2.5 rounded-xl bg-secondary-container text-on-secondary-container font-label-md font-semibold"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
