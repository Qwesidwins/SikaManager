import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  transactionsRepo,
  categoriesRepo,
  accountsRepo,
  settingsRepo,
  journalRepo,
} from '@/db';
import { affordability, emergencyFundProgress } from '@/domain/affordability';
import { savingsProjection } from '@/domain/projection';
import { parseAmountInput, formatMinor } from '@/domain/money';
import { averageDailySpend } from '@/domain/runway';
import { totalBalance } from '@/domain/balance';
import { triggerHaptic } from '@/lib/haptics';
import type {
  Transaction,
  Category,
  Account,
  Settings,
} from '@/domain/types';

interface InsightsViewProps {
  onShowToast: (msg: string) => void;
}

export const InsightsView: React.FC<InsightsViewProps> = ({ onShowToast }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  // Affordability Simulator State
  const [purchaseAmountStr, setPurchaseAmountStr] = useState('150');
  const [is48HourReminderActive, setIs48HourReminderActive] = useState(false);

  // Savings Projection Calculator State
  const [projPrincipalStr, setProjPrincipalStr] = useState('1000');
  const [projMonthlyStr, setProjMonthlyStr] = useState('200');
  const [projRateStr, setProjRateStr] = useState('15');
  const [projMonthsStr, setProjMonthsStr] = useState('12');

  const loadData = useCallback(async () => {
    setLoading(true);
    const [txns, cats, accs, setts] = await Promise.all([
      transactionsRepo.getAll(),
      categoriesRepo.getAll(undefined, true),
      accountsRepo.getAll(),
      settingsRepo.getAll(),
    ]);
    setTransactions(txns);
    setCategories(cats);
    setAccounts(accs);
    setSettings(setts);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Total balance and liquid savings
  const totalBalResult = useMemo(
    () => totalBalance(accounts, transactions, settings?.currency || 'GHS'),
    [accounts, transactions, settings]
  );

  const savingsBalanceMinor = useMemo(() => {
    const savingsAccounts = accounts.filter((a) => a.type === 'savings' && !a.archived);
    return savingsAccounts.reduce((sum, acc) => {
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

  const avgDailySpendMinor = useMemo(() => averageDailySpend(transactions, 30), [transactions]);

  // Category breakdown for donut chart
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of transactions) {
      if (t.deletedAt || t.type !== 'expense' || !t.categoryId) continue;
      map[t.categoryId] = (map[t.categoryId] ?? 0) + t.amountMinor;
    }

    const data = Object.entries(map).map(([catId, amountMinor]) => {
      const cat = categories.find((c) => c.id === catId);
      return {
        name: cat?.name || 'Other',
        amountMinor,
        amountDecimal: Math.round(amountMinor / 100),
        color: cat?.color || '#14213D',
      };
    });

    return data.sort((a, b) => b.amountMinor - a.amountMinor);
  }, [transactions, categories]);

  // 6-month income vs expense cash flow bars
  const sixMonthCashFlow = useMemo(() => {
    const now = new Date();
    const result: { monthLabel: string; income: number; expense: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const targetMonthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const targetYear = targetMonthDate.getFullYear();
      const targetMonth = targetMonthDate.getMonth();
      const label = targetMonthDate.toLocaleDateString('en-GH', { month: 'short' });

      let incomeMinor = 0;
      let expenseMinor = 0;

      for (const t of transactions) {
        if (t.deletedAt) continue;
        const d = new Date(t.date);
        if (d.getFullYear() === targetYear && d.getMonth() === targetMonth) {
          if (t.type === 'income') incomeMinor += t.amountMinor;
          if (t.type === 'expense') expenseMinor += t.amountMinor;
        }
      }

      result.push({
        monthLabel: label,
        income: Math.round(incomeMinor / 100),
        expense: Math.round(expenseMinor / 100),
      });
    }

    return result;
  }, [transactions]);

  // Affordability calculation
  const affordabilityResult = useMemo(() => {
    const parsed = parseAmountInput(purchaseAmountStr);
    const purchaseMinor = parsed.ok ? parsed.minor : 0;

    const daysLeft = Math.max(1, new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - new Date().getDate());

    const safeInput = {
      incomeMode: settings?.incomeMode || 'variable',
      currentBalanceMinor: totalBalResult.totalMinor,
      committedBillsMinor: settings?.essentialMonthlyMinor || 0,
      savingsTargetMinor: settings?.savingsTargetMinor || 0,
      daysLeftInPeriod: daysLeft,
      pastCompletedMonthsIncomeMinor: [],
      incomeReceivedThisPeriodMinor: 0,
    };

    return affordability(purchaseMinor, {
      currentBalanceMinor: totalBalResult.totalMinor,
      savingsBalanceMinor,
      essentialMonthlyMinor: settings?.essentialMonthlyMinor || 100000,
      avgDailySpendMinor,
      safeToSpendInput: safeInput,
      targetMonths: 3,
    });
  }, [purchaseAmountStr, settings, totalBalResult.totalMinor, savingsBalanceMinor, avgDailySpendMinor]);

  // Savings Projection calculation
  const projectionResult = useMemo(() => {
    const p = parseAmountInput(projPrincipalStr);
    const m = parseAmountInput(projMonthlyStr);
    const principalMinor = p.ok ? p.minor : 0;
    const monthlyMinor = m.ok ? m.minor : 0;
    const rate = parseFloat(projRateStr) || 0;
    const months = parseInt(projMonthsStr, 10) || 12;

    return savingsProjection(principalMinor, monthlyMinor, rate, months);
  }, [projPrincipalStr, projMonthlyStr, projRateStr, projMonthsStr]);

  // Emergency Fund Details
  const emergencyFund = useMemo(() => {
    const essentials = settings?.essentialMonthlyMinor || 100000;
    return emergencyFundProgress(savingsBalanceMinor, essentials, 3);
  }, [savingsBalanceMinor, settings]);

  const handleToggle48HourReminder = async () => {
    const nextState = !is48HourReminderActive;
    setIs48HourReminderActive(nextState);
    triggerHaptic(15);

    if (nextState) {
      // Try local notification permission
      if (typeof window !== 'undefined' && 'Notification' in window) {
        if (Notification.permission === 'default') {
          await Notification.requestPermission();
        }
      }

      // Add a journal reminder entry
      const now = new Date().toISOString();
      await journalRepo.create({
        id: crypto.randomUUID(),
        prompt: '48-Hour Purchase Decision',
        body: `Considering a purchase of GH₵ ${purchaseAmountStr}. Waited 48 hours to assess necessity and calm peace of mind.`,
        rating: 'neutral',
        createdAt: now,
        updatedAt: now,
      });

      onShowToast('48-hour reflection saved to Journal');
    }
  };

  if (loading) {
    return <div className="p-margin text-center text-on-surface-variant">Loading insights...</div>;
  }

  return (
    <div className="flex flex-col w-full px-margin pb-space-2xl space-y-space-xl">
      {/* Page Header */}
      <div className="pt-space-xs">
        <h2 className="font-headline-lg text-headline-lg text-primary tracking-tight">Insights</h2>
        <p className="font-label-sm text-label-sm text-on-surface-variant">
          Clear patterns, simulated scenarios, and future projections
        </p>
      </div>

      {/* 1. Affordability Check Simulator */}
      <section className="rounded-2xl bg-surface-container-lowest p-space-lg shadow-sm flex flex-col gap-4 border border-surface-container-high/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-[22px]">
              price_check
            </span>
            <h3 className="font-headline-sm text-headline-sm text-primary">
              Affordability Check
            </h3>
          </div>
          <span className="font-label-sm text-[11px] bg-secondary-fixed/50 text-on-secondary-fixed font-semibold px-2.5 py-1 rounded-full">
            Simulation
          </span>
        </div>

        <p className="font-body-md text-label-md text-on-surface-variant">
          Enter a planned purchase amount to see how it shifts your safe-to-spend allowance and runway.
        </p>

        {/* Purchase Input Field */}
        <div className="flex items-center gap-2">
          <div className="h-12 px-3.5 rounded-xl bg-surface-container-low flex items-center gap-2 flex-1">
            <span className="font-body-md-bold text-on-surface-variant">GH₵</span>
            <input
              type="text"
              value={purchaseAmountStr}
              onChange={(e) => setPurchaseAmountStr(e.target.value)}
              placeholder="Amount"
              className="bg-transparent font-headline-sm text-primary w-full outline-none"
            />
          </div>
        </div>

        {/* Before vs After Impact Comparison Grid */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          {/* Runway Impact */}
          <div className="p-3 rounded-xl bg-surface-container-low flex flex-col">
            <span className="font-label-sm text-[11px] text-on-surface-variant">Runway</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="font-headline-sm font-bold text-primary tabular-nums">
                {affordabilityResult.after.runwayDays !== null
                  ? `${affordabilityResult.after.runwayDays}d`
                  : '—'}
              </span>
              <span className="font-label-sm text-xs text-outline tabular-nums">
                (was {affordabilityResult.before.runwayDays ?? '—'}d)
              </span>
            </div>
          </div>

          {/* Safe-to-Spend Impact */}
          <div className="p-3 rounded-xl bg-surface-container-low flex flex-col">
            <span className="font-label-sm text-[11px] text-on-surface-variant">Safe Today</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span
                className={`font-headline-sm font-bold tabular-nums ${
                  affordabilityResult.after.safeToSpendTodayMinor < 0
                    ? 'text-warm-caution'
                    : 'text-primary'
                }`}
              >
                {formatMinor(affordabilityResult.after.safeToSpendTodayMinor, 'GHS', 'en-GH', { compact: true })}
              </span>
              <span className="font-label-sm text-xs text-outline tabular-nums">
                ({formatMinor(affordabilityResult.before.safeToSpendTodayMinor, 'GHS', 'en-GH', { compact: true })})
              </span>
            </div>
          </div>
        </div>

        {/* Emergency Fund Impact Note */}
        <div className="p-2.5 rounded-xl bg-surface-container-high/40 flex items-center gap-2 text-xs text-on-surface-variant">
          <span
            className={`material-symbols-outlined text-[18px] ${
              affordabilityResult.emergencyFundHolds ? 'text-on-tertiary-container' : 'text-warm-caution'
            }`}
          >
            {affordabilityResult.emergencyFundHolds ? 'verified_user' : 'info'}
          </span>
          <span>
            {affordabilityResult.emergencyFundHolds
              ? 'Your 3-month emergency buffer target remains intact.'
              : 'This purchase would draw from your emergency buffer reserve.'}
          </span>
        </div>

        {/* 48-Hour Decision Rule Toggle */}
        <div className="flex items-center justify-between pt-1 border-t border-surface-container-high">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-[18px]">timer</span>
            <span className="font-label-md text-label-md text-primary font-medium">
              Wait 48 hours reminder
            </span>
          </div>
          <button
            type="button"
            aria-label="Toggle 48-hour reminder"
            onClick={handleToggle48HourReminder}
            className={`w-9 h-5 rounded-full relative transition-colors cursor-pointer flex items-center px-0.5 ${
              is48HourReminderActive ? 'bg-secondary' : 'bg-surface-variant'
            }`}
          >
            <span
              className={`w-4 h-4 rounded-full shadow-sm transition-transform ${
                is48HourReminderActive
                  ? 'bg-on-secondary translate-x-4'
                  : 'bg-outline-variant translate-x-0'
              }`}
            />
          </button>
        </div>
      </section>

      {/* 2. Spending by Category (Donut / Breakdown) */}
      <section className="rounded-2xl bg-surface-container-lowest p-space-lg shadow-sm flex flex-col gap-3">
        <h3 className="font-headline-sm text-headline-sm text-primary">Spending by Category</h3>
        {categoryBreakdown.length === 0 ? (
          <p className="text-on-surface-variant text-sm py-4 text-center">
            Log some expenses to reveal your category spending breakdown.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryBreakdown}
                    dataKey="amountDecimal"
                    nameKey="name"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={3}
                  >
                    {categoryBreakdown.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [`GH₵ ${value.toFixed(2)}`, 'Spent']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Category Top List */}
            <div className="flex flex-col divide-y divide-surface-container-high/60">
              {categoryBreakdown.slice(0, 4).map((c) => (
                <div key={c.name} className="flex items-center justify-between py-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                    <span className="font-medium text-primary">{c.name}</span>
                  </div>
                  <span className="tabular-nums font-semibold text-primary">
                    {formatMinor(c.amountMinor)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 3. 6-Month Income vs Expense Flow */}
      <section className="rounded-2xl bg-surface-container-lowest p-space-lg shadow-sm flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="font-headline-sm text-headline-sm text-primary">6-Month Cash Flow</h3>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1 text-on-tertiary-container font-semibold">
              <span className="w-2 h-2 rounded-full bg-income-forest" /> Inflow
            </span>
            <span className="flex items-center gap-1 text-primary-ink font-semibold">
              <span className="w-2 h-2 rounded-full bg-primary" /> Outflow
            </span>
          </div>
        </div>

        <div className="h-44 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={sixMonthCashFlow}>
              <XAxis dataKey="monthLabel" tickLine={false} axisLine={false} textAnchor="middle" />
              <YAxis hide />
              <Tooltip formatter={(value: number) => [`GH₵ ${value.toFixed(2)}`]} />
              <Bar dataKey="income" fill="#2E7D5B" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" fill="#14213D" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* 4. Emergency Fund Detail */}
      <section className="rounded-2xl bg-surface-container-lowest p-space-lg shadow-sm flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="font-headline-sm text-headline-sm text-primary">Emergency Buffer</h3>
          <span className="font-label-sm font-semibold text-secondary tabular-nums">
            {emergencyFund.monthsCovered} / {emergencyFund.targetMonths} months
          </span>
        </div>

        <div className="w-full h-2.5 rounded-full bg-surface-container-high overflow-hidden">
          <div
            className="h-full bg-secondary rounded-full transition-all duration-300"
            style={{ width: `${emergencyFund.progress * 100}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-xs text-on-surface-variant tabular-nums">
          <span>Current: {formatMinor(emergencyFund.currentMinor)}</span>
          <span>Target (3 mos): {formatMinor(emergencyFund.targetMinor)}</span>
        </div>
      </section>

      {/* 5. Future Savings Projection Calculator */}
      <section className="rounded-2xl bg-surface-container-lowest p-space-lg shadow-sm flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="font-headline-sm text-headline-sm text-primary">Savings Projection</h3>
          <span className="font-label-sm text-[11px] bg-secondary-container/40 text-on-secondary-container font-semibold px-2.5 py-1 rounded-full">
            Compound
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="font-label-sm text-[11px] text-on-surface-variant">Initial (GH₵)</label>
            <input
              type="text"
              value={projPrincipalStr}
              onChange={(e) => setProjPrincipalStr(e.target.value)}
              className="w-full h-10 px-2.5 rounded-xl bg-surface-container-low text-on-surface text-sm outline-none"
            />
          </div>
          <div>
            <label className="font-label-sm text-[11px] text-on-surface-variant">Monthly Add (GH₵)</label>
            <input
              type="text"
              value={projMonthlyStr}
              onChange={(e) => setProjMonthlyStr(e.target.value)}
              className="w-full h-10 px-2.5 rounded-xl bg-surface-container-low text-on-surface text-sm outline-none"
            />
          </div>
          <div>
            <label className="font-label-sm text-[11px] text-on-surface-variant">Annual Rate (%)</label>
            <input
              type="text"
              value={projRateStr}
              onChange={(e) => setProjRateStr(e.target.value)}
              className="w-full h-10 px-2.5 rounded-xl bg-surface-container-low text-on-surface text-sm outline-none"
            />
          </div>
          <div>
            <label className="font-label-sm text-[11px] text-on-surface-variant">Horizon (Months)</label>
            <input
              type="text"
              value={projMonthsStr}
              onChange={(e) => setProjMonthsStr(e.target.value)}
              className="w-full h-10 px-2.5 rounded-xl bg-surface-container-low text-on-surface text-sm outline-none"
            />
          </div>
        </div>

        <div className="p-3 rounded-xl bg-surface-container-low flex flex-col gap-1 text-center">
          <span className="font-label-sm text-xs text-on-surface-variant">Projected Value</span>
          <span className="font-headline-md text-primary font-bold tabular-nums">
            {formatMinor(projectionResult.finalBalanceMinor)}
          </span>
          <span className="font-label-sm text-[11px] text-on-tertiary-container font-semibold tabular-nums">
            +{formatMinor(projectionResult.totalInterestMinor)} estimated interest earned
          </span>
        </div>
      </section>
    </div>
  );
};
