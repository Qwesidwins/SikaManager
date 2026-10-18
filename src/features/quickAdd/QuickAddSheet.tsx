import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Sheet } from '@/components/Sheet';
import { Keypad } from '@/components/Keypad';
import { triggerHaptic } from '@/lib/haptics';
import { parseAmountInput } from '@/domain/money';
import { accountsRepo, categoriesRepo, transactionsRepo, journalRepo } from '@/db';
import type { Account, Category, TransactionType, JournalRating } from '@/domain/types';

interface QuickAddSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (transactionId: string, summary: string) => void;
}

export const QuickAddSheet: React.FC<QuickAddSheetProps> = ({ isOpen, onClose, onSaved }) => {
  const [type, setType] = useState<TransactionType>('expense');
  const [amountStr, setAmountStr] = useState<string>('0');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [recentCategoryIds, setRecentCategoryIds] = useState<string[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [selectedTransferAccountId, setSelectedTransferAccountId] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString());
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [note, setNote] = useState<string>('');
  const [showNoteField, setShowNoteField] = useState(false);
  const [showReflection, setShowReflection] = useState(false);
  const [rating, setRating] = useState<JournalRating>(null);
  const [reflectionNote, setReflectionNote] = useState<string>('');
  const [showMoreCategories, setShowMoreCategories] = useState(false);

  // Load accounts and categories
  const loadData = useCallback(async () => {
    const [accList, catList, recentCats] = await Promise.all([
      accountsRepo.getAll(),
      categoriesRepo.getAll(),
      transactionsRepo.getRecentCategoryIds(6),
    ]);
    setAccounts(accList);
    setCategories(catList);
    setRecentCategoryIds(recentCats);

    if (accList.length > 0 && !selectedAccountId) {
      setSelectedAccountId(accList[0]!.id);
      if (accList.length > 1) {
        setSelectedTransferAccountId(accList[1]!.id);
      }
    }
  }, [selectedAccountId]);

  useEffect(() => {
    if (isOpen) {
      loadData();
      // Reset state on open
      setAmountStr('0');
      setNote('');
      setShowNoteField(false);
      setShowReflection(false);
      setRating(null);
      setReflectionNote('');
      setDate(new Date().toISOString());
    }
  }, [isOpen, loadData]);

  // Filter categories by transaction type
  const availableCategories = useMemo(() => {
    if (type === 'transfer') return [];
    return categories.filter((c) => c.kind === type);
  }, [categories, type]);

  // Set default category when type changes
  useEffect(() => {
    if (availableCategories.length > 0) {
      // Pick first recent category matching kind, or first available
      const match = recentCategoryIds.find((id) =>
        availableCategories.some((c) => c.id === id)
      );
      setSelectedCategoryId(match || availableCategories[0]!.id);
    }
  }, [type, availableCategories, recentCategoryIds]);

  const handleKeyPress = (char: string) => {
    setAmountStr((prev) => {
      if (prev === '0' && char !== '.') {
        return char;
      }
      if (char === '.' && prev.includes('.')) {
        return prev;
      }
      // Max 2 decimal digits
      if (prev.includes('.')) {
        const parts = prev.split('.');
        if (parts[1] && parts[1].length >= 2) {
          return prev;
        }
      }
      // Length protection
      if (prev.length >= 9) return prev;
      return prev + char;
    });
  };

  const handleBackspace = () => {
    setAmountStr((prev) => {
      if (prev.length <= 1) return '0';
      return prev.slice(0, -1);
    });
  };

  const parsedAmount = useMemo(() => parseAmountInput(amountStr), [amountStr]);
  const isValidAmount = parsedAmount.ok && parsedAmount.minor > 0;

  const handleSave = async () => {
    if (!isValidAmount || !selectedAccountId) return;

    triggerHaptic(20);
    const txnId = crypto.randomUUID();
    const now = new Date().toISOString();
    const selectedAccount = accounts.find((a) => a.id === selectedAccountId);
    const currency = selectedAccount?.currency || 'GHS';

    await transactionsRepo.create({
      id: txnId,
      type,
      amountMinor: parsedAmount.minor,
      currency,
      accountId: selectedAccountId,
      transferAccountId: type === 'transfer' ? selectedTransferAccountId : null,
      categoryId: type === 'transfer' ? null : selectedCategoryId,
      date,
      note: note.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    });

    // Save reflection journal entry if active
    if (showReflection && (rating || reflectionNote.trim())) {
      await journalRepo.create({
        id: crypto.randomUUID(),
        transactionId: txnId,
        rating,
        body: reflectionNote.trim() || (rating === 'worth_it' ? 'Worth it' : rating === 'regret' ? 'Regret' : 'Neutral reflection'),
        createdAt: now,
        updatedAt: now,
      });
    }

    const categoryObj = categories.find((c) => c.id === selectedCategoryId);
    const summary =
      type === 'transfer'
        ? 'Transfer recorded'
        : `Logged to ${categoryObj?.name || 'Transactions'}`;

    onSaved(txnId, summary);
    onClose();
  };

  const currentCategory = categories.find((c) => c.id === selectedCategoryId);
  const currentAccount = accounts.find((a) => a.id === selectedAccountId);

  return (
    <Sheet isOpen={isOpen} onClose={onClose}>
      <div className="flex flex-col w-full">
        {/* Segmented Type Control */}
        <div className="px-margin mb-space-sm">
          <div className="bg-surface-container-low p-1 rounded-full flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                triggerHaptic(10);
                setType('expense');
              }}
              className={`flex-1 py-1.5 rounded-full font-label-md text-label-md font-semibold transition-all text-center ${
                type === 'expense'
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Expense
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHaptic(10);
                setType('income');
              }}
              className={`flex-1 py-1.5 rounded-full font-label-md text-label-md font-semibold transition-all text-center ${
                type === 'income'
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Income
            </button>
            <button
              type="button"
              onClick={() => {
                triggerHaptic(10);
                setType('transfer');
              }}
              className={`flex-1 py-1.5 rounded-full font-label-md text-label-md font-semibold transition-all text-center ${
                type === 'transfer'
                  ? 'bg-primary text-on-primary shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              Transfer
            </button>
          </div>
        </div>

        {/* Hero Amount Display with Pulsing Caret */}
        <div className="px-margin py-space-xs flex flex-col items-center justify-center text-center">
          <div className="flex items-baseline justify-center gap-1.5 tracking-tight">
            <span className="font-headline-md text-headline-md text-outline font-semibold select-none">
              GH₵
            </span>
            <span className="font-display-hero-mobile text-display-hero-mobile text-on-surface font-bold tracking-tight tabular-nums">
              {amountStr}
            </span>
            <span className="w-[3px] h-9 bg-secondary rounded-full animate-pulse self-center ml-0.5" />
          </div>

          {currentCategory && type !== 'transfer' && (
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-container/20 mt-1">
              <span className="material-symbols-outlined text-secondary text-[15px]">
                {currentCategory.icon}
              </span>
              <span className="font-label-sm text-label-sm text-secondary font-medium">
                {currentCategory.name}
              </span>
            </div>
          )}
        </div>

        {/* Category Chips (Only for Expense & Income) */}
        {type !== 'transfer' && (
          <div className="px-margin mt-space-xs mb-space-xs">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
              {availableCategories.slice(0, 6).map((cat) => {
                const isSelected = selectedCategoryId === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => {
                      triggerHaptic(10);
                      setSelectedCategoryId(cat.id);
                    }}
                    className={`shrink-0 h-[34px] px-3.5 rounded-full font-label-md text-label-md flex items-center gap-1.5 transition-all active:scale-95 ${
                      isSelected
                        ? 'bg-primary text-on-primary shadow-sm font-semibold'
                        : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[17px]">{cat.icon}</span>
                    <span>{cat.name}</span>
                  </button>
                );
              })}

              {availableCategories.length > 6 && (
                <button
                  type="button"
                  onClick={() => setShowMoreCategories(true)}
                  className="shrink-0 h-[34px] px-3 rounded-full bg-surface-container-low text-on-surface-variant hover:text-on-surface font-label-md text-label-md flex items-center gap-1 active:scale-95"
                >
                  <span className="material-symbols-outlined text-[17px]">more_horiz</span>
                  <span>More</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Account & Date Selection Row */}
        <div className="px-margin flex items-center justify-between gap-2 my-space-xs">
          {/* Account Dropdown */}
          <div className="relative flex-1">
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="w-full h-10 px-3 rounded-xl bg-surface-container-low text-on-surface font-label-sm text-label-sm font-semibold appearance-none pr-8 cursor-pointer border-0 outline-none"
            >
              {accounts.map((acc) => (
                <option key={acc.id} value={acc.id}>
                  {acc.name} ({acc.currency})
                </option>
              ))}
            </select>
            <span className="material-symbols-outlined text-[18px] text-outline absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
              expand_more
            </span>
          </div>

          {/* Transfer Destination Account */}
          {type === 'transfer' && (
            <div className="relative flex-1">
              <select
                value={selectedTransferAccountId}
                onChange={(e) => setSelectedTransferAccountId(e.target.value)}
                className="w-full h-10 px-3 rounded-xl bg-surface-container-low text-on-surface font-label-sm text-label-sm font-semibold appearance-none pr-8 cursor-pointer border-0 outline-none"
              >
                {accounts
                  .filter((a) => a.id !== selectedAccountId)
                  .map((acc) => (
                    <option key={acc.id} value={acc.id}>
                      To: {acc.name}
                    </option>
                  ))}
              </select>
              <span className="material-symbols-outlined text-[18px] text-outline absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                expand_more
              </span>
            </div>
          )}

          {/* Date Picker Button */}
          <button
            type="button"
            onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
            className="h-10 px-3 rounded-xl bg-surface-container-low flex items-center gap-1.5 text-on-surface-variant active:bg-surface-container transition-colors shrink-0"
          >
            <span className="material-symbols-outlined text-[16px] text-outline">schedule</span>
            <span className="font-label-sm text-label-sm font-medium">
              {new Date(date).toDateString() === new Date().toDateString() ? 'Now' : date.slice(5, 10)}
            </span>
          </button>
        </div>

        {/* Date Selector input when expanded */}
        {isDatePickerOpen && (
          <div className="px-margin mb-space-xs">
            <input
              type="datetime-local"
              value={date.slice(0, 16)}
              onChange={(e) => setDate(new Date(e.target.value).toISOString())}
              className="w-full h-10 px-3 rounded-xl bg-surface-container-low text-on-surface font-body-md text-sm border-0 outline-none"
            />
          </div>
        )}

        {/* Note input field (Collapsed toggle) */}
        <div className="px-margin my-space-2xs">
          {!showNoteField ? (
            <button
              type="button"
              onClick={() => setShowNoteField(true)}
              className="text-label-sm text-secondary flex items-center gap-1 hover:underline"
            >
              <span className="material-symbols-outlined text-[16px]">edit_note</span>
              <span>Add a note</span>
            </button>
          ) : (
            <div className="h-11 px-3.5 rounded-xl bg-surface-container-low flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-outline">edit_note</span>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Add a note..."
                className="bg-transparent font-body-md text-body-md text-on-surface placeholder:text-outline focus:outline-none w-full"
                autoFocus
              />
            </div>
          )}
        </div>

        {/* "Reflect on this" Warm Inquiry Section (Collapsed by default) */}
        {type === 'expense' && (
          <div className="px-margin my-space-xs">
            <div className="p-3 rounded-2xl bg-surface-container-low flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-[18px]">
                    psychology_alt
                  </span>
                  <span className="font-label-md text-label-md text-on-surface font-semibold">
                    Reflect on this purchase
                  </span>
                </div>
                <button
                  type="button"
                  aria-label="Toggle reflection"
                  onClick={() => setShowReflection(!showReflection)}
                  className={`w-9 h-5 rounded-full relative transition-colors cursor-pointer flex items-center px-0.5 ${
                    showReflection ? 'bg-secondary' : 'bg-surface-variant'
                  }`}
                >
                  <span
                    className={`w-4 h-4 rounded-full shadow-sm transition-transform ${
                      showReflection
                        ? 'bg-on-secondary translate-x-4'
                        : 'bg-outline-variant translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {showReflection && (
                <div className="flex flex-col gap-2 pt-1 animate-in fade-in">
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setRating(rating === 'worth_it' ? null : 'worth_it')}
                      className={`py-1.5 px-2 rounded-xl flex items-center justify-center gap-1.5 font-label-sm text-label-sm font-semibold transition-all ${
                        rating === 'worth_it'
                          ? 'bg-tertiary-fixed text-on-tertiary-fixed shadow-xs'
                          : 'bg-surface-container-lowest text-on-surface-variant'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px]">favorite</span>
                      <span>Worth it</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRating(rating === 'neutral' ? null : 'neutral')}
                      className={`py-1.5 px-2 rounded-xl flex items-center justify-center gap-1.5 font-label-sm text-label-sm font-medium transition-all ${
                        rating === 'neutral'
                          ? 'bg-secondary-fixed text-on-secondary-fixed font-semibold shadow-xs'
                          : 'bg-surface-container-lowest text-on-surface-variant'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        sentiment_neutral
                      </span>
                      <span>Neutral</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRating(rating === 'regret' ? null : 'regret')}
                      className={`py-1.5 px-2 rounded-xl flex items-center justify-center gap-1.5 font-label-sm text-label-sm font-medium transition-all ${
                        rating === 'regret'
                          ? 'bg-error-container text-on-error-container font-semibold shadow-xs'
                          : 'bg-surface-container-lowest text-on-surface-variant'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[16px]">heart_broken</span>
                      <span>Regret</span>
                    </button>
                  </div>

                  <input
                    type="text"
                    value={reflectionNote}
                    onChange={(e) => setReflectionNote(e.target.value)}
                    placeholder="Why this purchase was made..."
                    className="w-full h-9 px-3 rounded-xl bg-surface-container-lowest text-on-surface font-body-md text-xs placeholder:text-outline outline-none"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Custom Numeric Keypad */}
        <Keypad onKeyPress={handleKeyPress} onBackspace={handleBackspace} />

        {/* Primary Action Button (Fixed Dock in Sheet) */}
        <div className="px-margin pt-space-xs pb-space-sm">
          <button
            type="button"
            disabled={!isValidAmount}
            onClick={handleSave}
            className={`w-full h-13 py-3.5 rounded-full font-headline-sm text-headline-sm font-bold flex items-center justify-center gap-2 transition-all ${
              isValidAmount
                ? 'bg-secondary-container text-on-secondary-container shadow-[0_8px_24px_-2px_rgba(201,150,43,0.38)] active:scale-[0.98]'
                : 'bg-surface-variant text-outline cursor-not-allowed opacity-60'
            }`}
          >
            <span className="material-symbols-outlined text-[22px]">check</span>
            <span>
              Save GH₵ {amountStr !== '0' ? amountStr : ''}{' '}
              {currentAccount ? `to ${currentAccount.name}` : ''}
            </span>
          </button>
        </div>

        {/* More Categories Modal */}
        {showMoreCategories && (
          <div className="fixed inset-0 z-50 bg-primary/40 flex items-end">
            <div className="w-full max-w-lg mx-auto bg-surface-container-lowest rounded-t-[24px] p-space-md max-h-[70vh] overflow-y-auto no-scrollbar">
              <div className="flex items-center justify-between pb-3 border-b border-surface-container-high">
                <h4 className="font-headline-sm text-primary">Select Category</h4>
                <button
                  type="button"
                  onClick={() => setShowMoreCategories(false)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-outline"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-3">
                {availableCategories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setSelectedCategoryId(c.id);
                      setShowMoreCategories(false);
                    }}
                    className="p-3 rounded-xl bg-surface-container-low flex items-center gap-2 text-left hover:bg-surface-container"
                  >
                    <span className="material-symbols-outlined text-[20px] text-primary">
                      {c.icon}
                    </span>
                    <span className="font-label-md text-on-surface truncate">{c.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </Sheet>
  );
};
