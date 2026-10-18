import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  accountsRepo,
  categoriesRepo,
  transactionsRepo,
  budgetsRepo,
  settingsRepo,
} from '@/db';
import { totalBalance } from '@/domain/balance';
import { averageDailySpend, runwayDays } from '@/domain/runway';
import { safeToSpendToday, type SafeToSpendInput } from '@/domain/safeToSpend';
import { emergencyFundProgress } from '@/domain/affordability';
import { budgetProgress, calculateBudgetSpent } from '@/domain/budget';
import { formatMinor } from '@/domain/money';
import { Ring } from '@/components/Ring';
import type {
  Account,
  Category,
  Transaction,
  Budget,
  Settings,
} from '@/domain/types';

interface HomeViewProps {
  onNavigateToBudgets: () => void;
  onNavigateToBackup: () => void;
  onNavigateToJournal: () => void;
  onNavigateToActivity: () => void;
  onOpenQuickAdd: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  onNavigateToBudgets,
  onNavigateToBackup,
  onNavigateToJournal,
  onNavigateToActivity: _onNavigateToActivity,
  onOpenQuickAdd: _onOpenQuickAdd,
}) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [isBackupBannerDismissed, setIsBackupBannerDismissed] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [accs, cats, txns, bgts, setts] = await Promise.all([
      accountsRepo.getAll(),
      categoriesRepo.getAll(undefined, true),
      transactionsRepo.getAll(),
      budgetsRepo.getAll(),
      settingsRepo.getAll(),
    ]);
    setAccounts(accs);
    setCategories(cats);
    setTransactions(txns);
    setBudgets(bgts);
    setSettings(setts);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Greeting based on local time
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  // Time & city label
  const timeContext = useMemo(() => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return `Accra, ${timeStr}`;
  }, []);

  // Check if last backup is more than 14 days old
  const showBackupBanner = useMemo(() => {
    if (isBackupBannerDismissed || !settings) return false;
    if (!settings.lastBackupAt) return true; // Never backed up
    const lastDate = new Date(settings.lastBackupAt).getTime();
    const diffDays = (Date.now() - lastDate) / (1000 * 60 * 60 * 24);
    return diffDays > 14;
  }, [settings, isBackupBannerDismissed]);

  const daysSinceBackup = useMemo(() => {
    if (!settings?.lastBackupAt) return 16;
    const diff = (Date.now() - new Date(settings.lastBackupAt).getTime()) / (1000 * 60 * 60 * 24);
    return Math.floor(diff);
  }, [settings]);

  // Total balance computation
  const totalBalResult = useMemo(() => {
    return totalBalance(accounts, transactions, settings?.currency || 'GHS');
  }, [accounts, transactions, settings]);

  // Liquid savings balance (type === 'savings')
  const savingsBalanceMinor = useMemo(() => {
    const savingsAccounts = accounts.filter((a) => a.type === 'savings' && !a.archived);
    return savingsAccounts.reduce((sum, acc) => {
      // Derived balance
      const bal = transactions.reduce((accBal, t) => {
        if (t.deletedAt) return accBal;
        if (t.accountId === acc.id) {
          if (t.type === 'income') return accBal + t.amountMinor;
          if (t.type === 'expense' || t.type === 'transfer') return accBal - t.amountMinor;
        } else if (t.type === 'transfer' && t.transferAccountId === acc.id) {
          return accBal + t.amountMinor;
        }
        return accBal;
      }, acc.openingBalanceMinor);
      return sum + bal;
    }, 0);
  }, [accounts, transactions]);

  // Average daily spend over rolling 30 days
  const avgDailySpendMinor = useMemo(() => {
    return averageDailySpend(transactions, 30);
  }, [transactions]);

  // Runway days
  const runway = useMemo(() => {
    return runwayDays(totalBalResult.totalMinor, avgDailySpendMinor);
  }, [totalBalResult.totalMinor, avgDailySpendMinor]);

  // Emergency buffer progress
  const emergencyBuffer = useMemo(() => {
    const essentials = settings?.essentialMonthlyMinor ?? 100000;
    return emergencyFundProgress(savingsBalanceMinor, essentials, 3);
  }, [savingsBalanceMinor, settings]);

  // Days left in current month
  const daysLeftInPeriod = useMemo(() => {
    const now = new Date();
    const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return Math.max(1, lastDayOfMonth - now.getDate());
  }, []);

  // Safe to spend today
  const safeToSpend = useMemo(() => {
    if (!settings) {
      return { safeToSpendTodayMinor: 0, isNegative: false };
    }

    // Past completed months income
    const now = new Date();
    const pastMonthlyIncomes: number[] = [0, 0, 0];
    for (const t of transactions) {
      if (t.deletedAt || t.type !== 'income') continue;
      const d = new Date(t.date);
      const monthDiff = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
      if (monthDiff >= 1 && monthDiff <= 3) {
        pastMonthlyIncomes[monthDiff - 1] = (pastMonthlyIncomes[monthDiff - 1] ?? 0) + t.amountMinor;
      }
    }

    // Income received this month
    let incomeReceivedThisMonth = 0;
    for (const t of transactions) {
      if (t.deletedAt || t.type !== 'income') continue;
      const d = new Date(t.date);
      if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
        incomeReceivedThisMonth += t.amountMinor;
      }
    }

    const input: SafeToSpendInput = {
      incomeMode: settings.incomeMode,
      currentBalanceMinor: totalBalResult.totalMinor,
      committedBillsMinor: settings.essentialMonthlyMinor || 0,
      savingsTargetMinor: settings.savingsTargetMinor || 0,
      daysLeftInPeriod,
      pastCompletedMonthsIncomeMinor: pastMonthlyIncomes,
      incomeReceivedThisPeriodMinor: incomeReceivedThisMonth,
    };

    return safeToSpendToday(input);
  }, [settings, totalBalResult.totalMinor, transactions, daysLeftInPeriod]);

  // Top 4 active budgets with progress
  const topBudgets = useMemo(() => {
    const referenceDate = new Date();
    return budgets.slice(0, 4).map((b) => {
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

  // Dynamic weekly insight sentence
  const weeklyInsight = useMemo(() => {
    // If transport or food has highest spend, generate friendly insight
    const categoryTotals: Record<string, number> = {};
    for (const t of transactions) {
      if (t.deletedAt || t.type !== 'expense' || !t.categoryId) continue;
      categoryTotals[t.categoryId] = (categoryTotals[t.categoryId] ?? 0) + t.amountMinor;
    }

    const sortedCats = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
    if (sortedCats.length > 0) {
      const topCatId = sortedCats[0]![0];
      const topCat = categories.find((c) => c.id === topCatId);
      const catName = topCat?.name || 'Top category';
      return `Your spending in ${catName} makes up the largest share of your budget this month.`;
    }

    return 'Tracking each expense builds quiet clarity over time. You are fully in control.';
  }, [transactions, categories]);

  if (loading) {
    return <div className="p-margin text-center text-on-surface-variant">Loading dashboard...</div>;
  }

  return (
    <div className="flex flex-col w-full px-margin pb-space-2xl space-y-space-lg">
      {/* Salutation & Micro Context */}
      <div className="flex items-center justify-between pt-space-xs">
        <div>
          <p className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1.5">
            <span>{timeContext}</span>
            <span className="w-1 h-1 rounded-full bg-outline-variant" />
            <span className="text-on-tertiary-container font-label-sm">Offline ready</span>
          </p>
          <h2 className="font-headline-md text-headline-md text-primary mt-0.5 tracking-tight">
            {greeting}
          </h2>
        </div>
      </div>

      {/* Dismissible Backup Notification Banner */}
      {showBackupBanner && (
        <div
          id="backup-banner"
          className="relative rounded-2xl bg-surface-container-low p-space-sm shadow-sm transition-all duration-300"
        >
          <div className="flex items-center justify-between gap-space-xs">
            <div className="flex items-center gap-space-xs min-w-0">
              <div className="w-8 h-8 rounded-xl bg-secondary-container/40 flex items-center justify-center text-secondary shrink-0">
                <span className="material-symbols-outlined text-[18px]">cloud_sync</span>
              </div>
              <div className="min-w-0">
                <p className="font-label-sm text-label-sm text-on-surface leading-tight">
                  Last backup was{' '}
                  <span className="font-body-md-bold text-label-sm">
                    {daysSinceBackup} days ago
                  </span>
                </p>
                <button
                  type="button"
                  onClick={onNavigateToBackup}
                  className="font-label-sm text-label-sm text-secondary hover:text-on-secondary-container font-medium underline underline-offset-2 transition-colors text-left mt-0.5"
                >
                  Export secure backup now
                </button>
              </div>
            </div>
            <button
              type="button"
              aria-label="Dismiss banner"
              onClick={() => setIsBackupBannerDismissed(true)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-outline hover:text-on-surface active:bg-surface-variant transition-colors shrink-0"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
            </button>
          </div>
        </div>
      )}

      {/* Hero Card: Safe to Spend Today */}
      <div className="relative overflow-hidden rounded-[20px] bg-surface-container-lowest p-space-xl shadow-[0_4px_24px_-2px_rgba(20,33,61,0.06),0_2px_8px_-1px_rgba(20,33,61,0.03)]">
        <div className="absolute -right-12 -top-12 w-48 h-48 bg-secondary-fixed/30 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -left-12 -bottom-12 w-40 h-40 bg-surface-container-high/60 rounded-full blur-xl pointer-events-none" />

        <div className="relative z-10 flex flex-col">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  safeToSpend.isNegative ? 'bg-warm-caution' : 'bg-on-tertiary-container animate-pulse'
                }`}
              />
              <span className="font-label-sm text-label-sm uppercase tracking-wider text-on-surface-variant font-medium">
                Safe to spend today
              </span>
            </div>
            <span className="font-label-sm text-[12px] bg-surface-container-low px-2.5 py-1 rounded-full text-on-surface-variant">
              Until midnight
            </span>
          </div>

          <div className="my-space-md">
            <div className="flex items-baseline gap-1 text-primary">
              <span className="font-headline-md text-headline-md tracking-tight font-medium text-on-surface-variant">
                GH₵
              </span>
              <span
                className={`font-display-hero-mobile text-display-hero-mobile tracking-tight tabular-nums font-bold ${
                  safeToSpend.isNegative ? 'text-warm-caution' : 'text-primary'
                }`}
              >
                {formatMinor(safeToSpend.safeToSpendTodayMinor, 'GHS', 'en-GH', { hideCurrency: true })}
              </span>
            </div>
          </div>

          <div className="rounded-xl bg-surface-container-low/75 p-space-xs flex items-center justify-between gap-space-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="material-symbols-outlined text-[18px] text-on-tertiary-container shrink-0">
                calendar_month
              </span>
              <p className="font-label-sm text-label-sm text-on-surface-variant leading-snug truncate">
                {safeToSpend.isNegative
                  ? 'Expenses exceed expected income this cycle'
                  : `Calibrated for ${daysLeftInPeriod} days till the next monthly reset`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Three-Tile Metrics Row */}
      <div className="grid grid-cols-3 gap-space-xs">
        {/* Total Balance Tile */}
        <div className="rounded-2xl bg-surface-container-lowest p-space-sm shadow-sm flex flex-col justify-between min-h-[110px]">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-[11px] text-on-surface-variant uppercase tracking-wider">
              Total
            </span>
            <span className="material-symbols-outlined text-[16px] text-on-surface-variant">
              account_balance_wallet
            </span>
          </div>
          <div>
            <p className="font-body-md-bold text-[14px] text-primary tracking-tight leading-tight tabular-nums">
              {formatMinor(totalBalResult.totalMinor, 'GHS', 'en-GH', { compact: true })}
            </p>
            <span className="font-label-sm text-[11px] text-on-surface-variant">
              {accounts.filter((a) => !a.archived).length} accounts
            </span>
          </div>
        </div>

        {/* Cash Runway Tile */}
        <div className="rounded-2xl bg-surface-container-lowest p-space-sm shadow-sm flex flex-col justify-between min-h-[110px]">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-[11px] text-on-surface-variant uppercase tracking-wider">
              Runway
            </span>
            <span className="material-symbols-outlined text-[16px] text-on-tertiary-container">
              nest_eco_leaf
            </span>
          </div>
          <div>
            <div className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-tertiary-fixed/40 text-on-tertiary-fixed-variant font-body-md-bold text-[13px] leading-tight">
              {runway !== null ? `${runway} days` : 'No spend'}
            </div>
            <p className="font-label-sm text-[11px] text-on-surface-variant mt-1">Calm & steady</p>
          </div>
        </div>

        {/* Buffer Tile with Progress Ring */}
        <div className="rounded-2xl bg-surface-container-lowest p-space-sm shadow-sm flex flex-col justify-between min-h-[110px]">
          <div className="flex items-center justify-between">
            <span className="font-label-sm text-[11px] text-on-surface-variant uppercase tracking-wider">
              Buffer
            </span>
            <span className="material-symbols-outlined text-[16px] text-secondary">savings</span>
          </div>
          <div className="flex items-center gap-2">
            <Ring
              percent={emergencyBuffer.progress * 100}
              size={34}
              strokeWidth={3.5}
              colorClass="text-secondary"
            />
            <div className="min-w-0">
              <p className="font-label-sm text-[11px] font-medium text-primary leading-tight">
                {emergencyBuffer.monthsCovered} / {emergencyBuffer.targetMonths}
              </p>
              <span className="font-label-sm text-[10px] text-on-surface-variant">target mos</span>
            </div>
          </div>
        </div>
      </div>

      {/* Budgets Section */}
      <div className="space-y-space-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-headline-sm text-headline-sm text-primary tracking-tight">
              Active Budgets
            </h3>
            <p className="font-label-sm text-label-sm text-on-surface-variant">
              Cycles refresh on the 1st
            </p>
          </div>
          <button
            type="button"
            onClick={onNavigateToBudgets}
            className="font-label-sm text-label-sm text-secondary hover:text-on-secondary-container font-medium flex items-center gap-0.5"
          >
            <span>Manage</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </button>
        </div>

        {/* 2x2 Grid of Progress Ring Cards */}
        <div className="grid grid-cols-2 gap-space-xs">
          {topBudgets.map(({ budget, category, progress }) => {
            const isCompleted = progress.percentUsed >= 100 && !progress.isOver;
            const isCaution = progress.isOver || progress.percentUsed >= 85;

            return (
              <div
                key={budget.id}
                onClick={onNavigateToBudgets}
                className="rounded-[20px] bg-surface-container-lowest p-space-md shadow-sm flex flex-col justify-between cursor-pointer hover:bg-surface-container-low/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${category?.color || '#14213D'}15` }}
                  >
                    <span
                      className="material-symbols-outlined text-[18px]"
                      style={{ color: category?.color || '#14213D' }}
                    >
                      {category?.icon || 'category'}
                    </span>
                  </div>

                  <Ring
                    percent={progress.percentUsed}
                    size={38}
                    colorClass={
                      isCaution
                        ? 'text-warm-caution'
                        : isCompleted
                        ? 'text-on-tertiary-container'
                        : 'text-primary-container'
                    }
                    icon={isCompleted ? 'check' : undefined}
                  />
                </div>

                <div className="mt-space-sm">
                  <h4 className="font-body-md-bold text-[14px] text-primary truncate">
                    {category?.name || 'Budget'}
                  </h4>
                  <p
                    className={`font-label-sm text-label-sm tabular-nums mt-0.5 ${
                      progress.isOver ? 'text-warm-caution font-medium' : 'text-on-surface-variant'
                    }`}
                  >
                    GH₵ {Math.round(progress.spentMinor / 100)}{' '}
                    <span className="text-outline-variant font-normal">
                      / {Math.round(progress.limitMinor / 100)}
                    </span>
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Weekly Insight Card */}
      <div className="rounded-2xl bg-surface-container-low p-space-md shadow-sm relative overflow-hidden">
        <div className="flex items-start gap-space-sm">
          <div className="w-10 h-10 rounded-xl bg-secondary-fixed flex items-center justify-center text-on-secondary-fixed shrink-0">
            <span className="material-symbols-outlined text-[20px]">lightbulb</span>
          </div>
          <div className="space-y-1">
            <div className="inline-flex items-center px-2 py-0.5 rounded-full bg-secondary-container text-on-secondary-container font-label-sm text-[11px] font-bold uppercase tracking-wider">
              Weekly Insight
            </div>
            <p className="font-body-md text-label-md text-on-surface leading-relaxed">
              {weeklyInsight}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Action Drawer Trigger Pill */}
      <div className="pt-space-xs flex justify-center">
        <button
          type="button"
          onClick={onNavigateToJournal}
          className="inline-flex items-center gap-2 px-space-md py-2 rounded-full bg-surface-container-high text-on-surface-variant hover:text-primary transition-colors text-label-sm font-label-sm shadow-sm active:scale-95"
        >
          <span className="material-symbols-outlined text-[16px]">history_edu</span>
          <span>Open reflections journal</span>
        </button>
      </div>
    </div>
  );
};
