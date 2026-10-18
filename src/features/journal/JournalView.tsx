import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { journalRepo, transactionsRepo, categoriesRepo } from '@/db';
import { EmptyState } from '@/components/EmptyState';
import { formatMinor } from '@/domain/money';
import { triggerHaptic } from '@/lib/haptics';
import type { JournalEntry, Transaction, Category, JournalRating } from '@/domain/types';

interface JournalViewProps {
  onOpenQuickAdd?: (() => void) | undefined;
  onShowToast: (msg: string, onUndo?: (() => void) | undefined) => void;
}

export const JournalView: React.FC<JournalViewProps> = ({ onOpenQuickAdd: _onOpenQuickAdd, onShowToast }) => {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filterRating, setFilterRating] = useState<JournalRating | 'all'>('all');
  const [loading, setLoading] = useState(true);

  // Standalone write reflection modal
  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);
  const [standaloneBody, setStandaloneBody] = useState('');
  const [standaloneRating, setStandaloneRating] = useState<JournalRating>('worth_it');

  // Monthly review modal
  const [isMonthlyReviewOpen, setIsMonthlyReviewOpen] = useState(false);
  const [monthlyStep, setMonthlyStep] = useState(1);
  const [q1Stillness, setQ1Stillness] = useState('');
  const [q2Avoided, setQ2Avoided] = useState('');
  const [q3Intention, setQ3Intention] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    const [jList, tList, cList] = await Promise.all([
      journalRepo.getAll(),
      transactionsRepo.getAll({ includeDeleted: true }),
      categoriesRepo.getAll(undefined, true),
    ]);
    setEntries(jList);
    setTransactions(tList);
    setCategories(cList);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Is today the 1st of the month or within the first 3 days?
  const isMonthlyReviewTime = useMemo(() => {
    const day = new Date().getDate();
    return day <= 3; // First 3 days of the month
  }, []);

  // Filtered entries
  const filteredEntries = useMemo(() => {
    if (filterRating === 'all') return entries;
    return entries.filter((e) => e.rating === filterRating);
  }, [entries, filterRating]);

  // Counts for filter pills
  const counts = useMemo(() => {
    const all = entries.length;
    const worthIt = entries.filter((e) => e.rating === 'worth_it').length;
    const neutral = entries.filter((e) => e.rating === 'neutral').length;
    const regret = entries.filter((e) => e.rating === 'regret').length;
    return { all, worthIt, neutral, regret };
  }, [entries]);

  const handleSaveStandalone = async () => {
    if (!standaloneBody.trim()) return;
    triggerHaptic(20);
    const now = new Date().toISOString();
    await journalRepo.create({
      id: crypto.randomUUID(),
      body: standaloneBody.trim(),
      rating: standaloneRating,
      createdAt: now,
      updatedAt: now,
    });
    setStandaloneBody('');
    setIsWriteModalOpen(false);
    await loadData();
  };

  const handleSaveMonthlyReview = async () => {
    triggerHaptic(20);
    const currentMonthName = new Date().toLocaleDateString('en-GH', { month: 'long' });
    const fullBody = `Monthly Review (${currentMonthName}):\n1. What gave stillness: ${q1Stillness || 'Steady pace'}\n2. Purchase avoided: ${q2Avoided || 'Impulse gear'}\n3. Intention: ${q3Intention || 'Stay intentional'}`;

    const now = new Date().toISOString();
    await journalRepo.create({
      id: crypto.randomUUID(),
      body: fullBody,
      prompt: `${currentMonthName} Review`,
      rating: 'worth_it',
      createdAt: now,
      updatedAt: now,
    });

    setIsMonthlyReviewOpen(false);
    setMonthlyStep(1);
    setQ1Stillness('');
    setQ2Avoided('');
    setQ3Intention('');
    await loadData();
  };

  const handleDeleteEntry = async (id: string) => {
    triggerHaptic(20);
    await journalRepo.softDelete(id);
    await loadData();

    onShowToast('Reflection deleted', async () => {
      await journalRepo.restore(id);
      await loadData();
    });
  };

  const currentMonthName = new Date().toLocaleDateString('en-GH', { month: 'long' });

  return (
    <div className="flex flex-col w-full px-margin pb-space-2xl space-y-space-lg">
      {/* Page Header Sub-strip */}
      <div className="flex items-center justify-between pt-space-xs">
        <div className="flex flex-col">
          <h2 className="font-headline-md text-headline-md text-on-surface tracking-tight">Journal</h2>
          <p className="font-label-sm text-label-sm text-on-surface-variant">
            Reflections on money &amp; peace of mind
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            triggerHaptic(10);
            setIsWriteModalOpen(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-secondary-container text-on-secondary-container shadow-sm active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-[18px] font-semibold">edit_note</span>
          <span className="font-label-md text-label-md font-semibold">+ Write</span>
        </button>
      </div>

      {/* Monthly Review Prompt Card (Hero Banner) */}
      {isMonthlyReviewTime && (
        <div className="relative overflow-hidden rounded-2xl bg-surface-container-low shadow-[0_4px_20px_-2px_rgba(20,33,61,0.05),0_2px_6px_-1px_rgba(20,33,61,0.03)] p-space-lg">
          <div className="absolute -right-12 -top-12 w-40 h-40 bg-secondary-fixed-dim/20 rounded-full blur-2xl pointer-events-none" />
          <div className="relative z-10 flex flex-col space-y-space-sm">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary-container/40 text-on-secondary-container font-label-sm text-[12px] font-semibold">
                <span className="material-symbols-outlined text-[15px]">psychology_alt</span>
                Monthly Pulse
              </span>
              <div className="flex items-center gap-1.5">
                <div className="w-6 h-1.5 rounded-full bg-secondary" />
                <div className="w-2 h-1.5 rounded-full bg-surface-container-highest" />
                <div className="w-2 h-1.5 rounded-full bg-surface-container-highest" />
              </div>
            </div>

            <div className="space-y-1">
              <h3 className="font-headline-sm text-headline-sm text-on-surface">
                {currentMonthName} Review · 3 quick questions
              </h3>
              <p className="font-body-md text-label-md text-on-surface-variant leading-relaxed">
                Takes 2 minutes. Reflect on what brought grounded joy, what slipped past, and what gave you stillness.
              </p>
            </div>

            <div className="pt-1 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsMonthlyReviewOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-primary text-on-primary font-label-md text-label-md shadow-sm active:scale-95 transition-transform"
              >
                <span>Start reflection</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
              <span className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px] text-secondary">schedule</span>
                ~2 mins
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Filter Chips Row */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-margin px-margin no-scrollbar">
        <button
          type="button"
          onClick={() => setFilterRating('all')}
          className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full font-label-md text-label-md transition-colors ${
            filterRating === 'all'
              ? 'bg-primary text-on-primary shadow-sm font-semibold'
              : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
          }`}
        >
          <span>All</span>
          <span className="px-1.5 py-0.5 rounded-full bg-surface-container-highest/40 text-xs">
            {counts.all}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFilterRating('worth_it')}
          className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full font-label-md text-label-md transition-colors ${
            filterRating === 'worth_it'
              ? 'bg-tertiary-fixed text-on-tertiary-fixed font-semibold shadow-sm'
              : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-on-tertiary-container" />
          <span>Worth it</span>
          <span className="px-1.5 py-0.5 rounded-full bg-tertiary-fixed-dim/40 text-xs">
            {counts.worthIt}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFilterRating('neutral')}
          className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full font-label-md text-label-md transition-colors ${
            filterRating === 'neutral'
              ? 'bg-primary text-on-primary font-semibold shadow-sm'
              : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-outline" />
          <span>Neutral</span>
          <span className="px-1.5 py-0.5 rounded-full bg-surface-container-highest text-xs">
            {counts.neutral}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFilterRating('regret')}
          className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full font-label-md text-label-md transition-colors ${
            filterRating === 'regret'
              ? 'bg-error-container text-on-error-container font-semibold shadow-sm'
              : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-secondary" />
          <span>Learning &amp; Regret</span>
          <span className="px-1.5 py-0.5 rounded-full bg-secondary-fixed/50 text-xs">
            {counts.regret}
          </span>
        </button>
      </div>

      {/* Reflection Entry Feed */}
      {!loading && filteredEntries.length === 0 ? (
        <EmptyState
          icon="history_edu"
          title="No reflections yet"
          description="Reflecting on money transforms tracking into peace of mind. Write down a thought or log your reasoning on your next expense."
          actionLabel="Write a reflection"
          onAction={() => setIsWriteModalOpen(true)}
        />
      ) : (
        <div className="flex flex-col space-y-space-md">
          {filteredEntries.map((entry) => {
            const linkedTxn = transactions.find((t) => t.id === entry.transactionId);
            const linkedCat = categories.find((c) => c.id === linkedTxn?.categoryId);

            return (
              <article
                key={entry.id}
                className="group rounded-2xl bg-surface-container-lowest p-space-lg shadow-[0_4px_20px_-2px_rgba(20,33,61,0.05),0_2px_6px_-1px_rgba(20,33,61,0.03)] flex flex-col gap-space-sm"
              >
                {/* Header: Date + Rating Pill */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col">
                    <span className="font-label-sm text-label-sm text-on-surface-variant flex items-center gap-1">
                      <span className="material-symbols-outlined text-[15px]">event</span>
                      {new Date(entry.createdAt).toLocaleDateString('en-GH', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                    {entry.prompt && (
                      <span className="font-label-sm text-secondary font-medium mt-0.5">
                        {entry.prompt}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {entry.rating === 'worth_it' && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-tertiary-fixed text-on-tertiary-fixed font-label-sm text-label-sm font-semibold">
                        <span className="material-symbols-outlined text-[15px]">favorite</span>
                        Worth it
                      </span>
                    )}
                    {entry.rating === 'neutral' && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-surface-container-high text-on-surface-variant font-label-sm text-label-sm font-medium">
                        <span className="material-symbols-outlined text-[15px]">sentiment_neutral</span>
                        Neutral
                      </span>
                    )}
                    {entry.rating === 'regret' && (
                      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-error-container text-on-error-container font-label-sm text-label-sm font-semibold">
                        <span className="material-symbols-outlined text-[15px]">heart_broken</span>
                        Regret · Lesson
                      </span>
                    )}

                    <button
                      type="button"
                      aria-label="Delete reflection"
                      onClick={() => handleDeleteEntry(entry.id)}
                      className="w-7 h-7 rounded-full flex items-center justify-center text-outline hover:text-error hover:bg-error-container/20 transition-colors"
                    >
                      <span className="material-symbols-outlined text-[16px]">delete</span>
                    </button>
                  </div>
                </div>

                {/* Linked Transaction Anchor (if linked) */}
                {linkedTxn && (
                  <div className="flex items-center gap-3 p-2.5 rounded-xl bg-surface-container-low">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${linkedCat?.color || '#14213D'}18` }}
                    >
                      <span
                        className="material-symbols-outlined text-[20px]"
                        style={{ color: linkedCat?.color || '#14213D' }}
                      >
                        {linkedCat?.icon || 'receipt'}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-label-md text-label-md font-semibold text-on-surface truncate">
                        {linkedTxn.note || linkedCat?.name || 'Transaction'}
                      </p>
                      <p className="font-label-sm text-[11px] text-on-surface-variant">
                        {linkedCat?.name || 'Expense'}
                      </p>
                    </div>
                    <span className="font-label-md text-label-md font-bold text-on-surface tabular-nums shrink-0">
                      {formatMinor(linkedTxn.amountMinor)}
                    </span>
                  </div>
                )}

                {/* Reflection Narrative */}
                <div className="relative pl-3">
                  <div className="absolute left-0 top-1 bottom-1 w-0.5 rounded-full bg-secondary/40" />
                  <p className="font-body-md text-body-md text-on-surface leading-relaxed whitespace-pre-wrap">
                    {entry.body}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Standalone Reflection Modal ("Write") */}
      {isWriteModalOpen && (
        <div className="fixed inset-0 z-50 bg-primary/40 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-surface-container-lowest rounded-2xl p-space-md shadow-xl flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h4 className="font-headline-sm text-primary">Write a Reflection</h4>
              <button
                type="button"
                onClick={() => setIsWriteModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-outline"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <p className="font-label-sm text-on-surface-variant">
              Journal an intention, a purchase you resisted, or an observation about your money today.
            </p>

            {/* Rating Selector */}
            <div className="grid grid-cols-3 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setStandaloneRating('worth_it')}
                className={`py-1.5 rounded-xl font-label-sm text-xs font-semibold ${
                  standaloneRating === 'worth_it'
                    ? 'bg-tertiary-fixed text-on-tertiary-fixed'
                    : 'bg-surface-container-low text-on-surface'
                }`}
              >
                Worth it
              </button>
              <button
                type="button"
                onClick={() => setStandaloneRating('neutral')}
                className={`py-1.5 rounded-xl font-label-sm text-xs font-semibold ${
                  standaloneRating === 'neutral'
                    ? 'bg-surface-container-high text-primary'
                    : 'bg-surface-container-low text-on-surface'
                }`}
              >
                Neutral
              </button>
              <button
                type="button"
                onClick={() => setStandaloneRating('regret')}
                className={`py-1.5 rounded-xl font-label-sm text-xs font-semibold ${
                  standaloneRating === 'regret'
                    ? 'bg-error-container text-on-error-container'
                    : 'bg-surface-container-low text-on-surface'
                }`}
              >
                Regret
              </button>
            </div>

            <textarea
              rows={4}
              value={standaloneBody}
              onChange={(e) => setStandaloneBody(e.target.value)}
              placeholder="e.g. I wanted to buy the new headphone today, but decided to wait 48 hours..."
              className="w-full p-3 rounded-xl bg-surface-container-low text-on-surface font-body-md text-sm outline-none resize-none border border-surface-container-high focus:border-secondary"
              autoFocus
            />

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsWriteModalOpen(false)}
                className="px-4 py-2 rounded-xl text-on-surface-variant font-label-md"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveStandalone}
                className="px-4 py-2 rounded-xl bg-secondary-container text-on-secondary-container font-label-md font-semibold"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Monthly Review 3-Question Modal */}
      {isMonthlyReviewOpen && (
        <div className="fixed inset-0 z-50 bg-primary/40 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-surface-container-lowest rounded-2xl p-space-lg shadow-xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="font-label-sm text-secondary font-bold uppercase tracking-wider">
                Question {monthlyStep} of 3
              </span>
              <button
                type="button"
                onClick={() => setIsMonthlyReviewOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-outline"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {monthlyStep === 1 && (
              <div className="flex flex-col gap-2">
                <h4 className="font-headline-sm text-primary">
                  What brought stillness or peace with your money this month?
                </h4>
                <textarea
                  rows={3}
                  value={q1Stillness}
                  onChange={(e) => setQ1Stillness(e.target.value)}
                  placeholder="e.g. Having an emergency buffer, saying no to impulse splurges..."
                  className="w-full p-3 rounded-xl bg-surface-container-low text-on-surface text-sm outline-none resize-none border border-surface-container-high"
                  autoFocus
                />
              </div>
            )}

            {monthlyStep === 2 && (
              <div className="flex flex-col gap-2">
                <h4 className="font-headline-sm text-primary">
                  What was one purchase you are glad you didn't make?
                </h4>
                <textarea
                  rows={3}
                  value={q2Avoided}
                  onChange={(e) => setQ2Avoided(e.target.value)}
                  placeholder="e.g. Late-night food delivery, gadget upgrade..."
                  className="w-full p-3 rounded-xl bg-surface-container-low text-on-surface text-sm outline-none resize-none border border-surface-container-high"
                  autoFocus
                />
              </div>
            )}

            {monthlyStep === 3 && (
              <div className="flex flex-col gap-2">
                <h4 className="font-headline-sm text-primary">
                  What is your key financial intention for this upcoming cycle?
                </h4>
                <textarea
                  rows={3}
                  value={q3Intention}
                  onChange={(e) => setQ3Intention(e.target.value)}
                  placeholder="e.g. Keep transport under GH₵ 300, boost emergency savings..."
                  className="w-full p-3 rounded-xl bg-surface-container-low text-on-surface text-sm outline-none resize-none border border-surface-container-high"
                  autoFocus
                />
              </div>
            )}

            <div className="flex justify-between items-center pt-2">
              {monthlyStep > 1 ? (
                <button
                  type="button"
                  onClick={() => setMonthlyStep(monthlyStep - 1)}
                  className="text-on-surface-variant font-label-md"
                >
                  Back
                </button>
              ) : (
                <div />
              )}

              {monthlyStep < 3 ? (
                <button
                  type="button"
                  onClick={() => setMonthlyStep(monthlyStep + 1)}
                  className="px-5 py-2.5 rounded-full bg-primary text-on-primary font-label-md font-semibold"
                >
                  Next
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSaveMonthlyReview}
                  className="px-5 py-2.5 rounded-full bg-secondary-container text-on-secondary-container font-label-md font-semibold"
                >
                  Complete Review
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
