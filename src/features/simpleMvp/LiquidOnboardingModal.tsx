import React, { useState, useEffect } from 'react';
import { accountsRepo } from '@/db/repositories/accountsRepo';
import { settingsRepo } from '@/db/repositories/settingsRepo';
import { hashPasscode } from '@/crypto/passcode';
import { parseAmountInput, formatMinor } from '@/domain/money';
import { triggerHaptic } from '@/lib/haptics';
import type { Account, AccountType } from '@/domain/types';
import {
  Banknote,
  Smartphone,
  Landmark,
  ShieldCheck,
  TrendingUp,
  Plus,
  Trash2,
  Check,
  Sparkles,
  HelpCircle,
  X,
  Lock,
  Fingerprint,
} from 'lucide-react';

interface LiquidOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCompleted: (message: string) => void;
}

interface AccountDraft {
  id: string;
  name: string;
  type: AccountType;
  balanceStr: string;
  isCustom?: boolean;
}

export const LiquidOnboardingModal: React.FC<LiquidOnboardingModalProps> = ({
  isOpen,
  onClose,
  onCompleted,
}) => {
  const [drafts, setDrafts] = useState<AccountDraft[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Optional Security setup
  const [enableSecurity, setEnableSecurity] = useState(false);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [enableBiometric, setEnableBiometric] = useState(false);
  const [biometricSupported, setBiometricSupported] = useState(false);

  // Custom asset creation form
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customType, setCustomType] = useState<AccountType>('bank');
  const [customBalance, setCustomBalance] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadInitialAccounts();
      checkBiometricSupport();
    }
  }, [isOpen]);

  async function checkBiometricSupport() {
    if (
      typeof window !== 'undefined' &&
      window.PublicKeyCredential &&
      typeof window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable === 'function'
    ) {
      try {
        const available = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        setBiometricSupported(available);
      } catch {
        setBiometricSupported(false);
      }
    }
  }

  async function loadInitialAccounts() {
    try {
      const existing = await accountsRepo.getAll();
      if (existing.length > 0) {
        setDrafts(
          existing.map((acc) => ({
            id: acc.id,
            name: acc.name,
            type: acc.type,
            balanceStr: acc.openingBalanceMinor > 0 ? (acc.openingBalanceMinor / 100).toFixed(2) : '',
            isCustom: !['acc-cash', 'acc-momo', 'acc-bank', 'acc-savings'].includes(acc.id),
          }))
        );
      } else {
        // Default standard Ghanaian liquid assets
        setDrafts([
          { id: 'acc-cash', name: 'Cash in Hand', type: 'cash', balanceStr: '' },
          { id: 'acc-momo', name: 'Mobile Money (MoMo)', type: 'mobile_money', balanceStr: '' },
          { id: 'acc-bank', name: 'Bank Account', type: 'bank', balanceStr: '' },
          { id: 'acc-savings', name: 'Emergency & Savings', type: 'savings', balanceStr: '' },
          { id: 'acc-stocks', name: 'Stocks & Investments', type: 'investment', balanceStr: '', isCustom: true },
        ]);
      }
    } catch {
      // Fallback
    }
  }

  function handleBalanceChange(index: number, val: string) {
    setDrafts((prev) => {
      const copy = [...prev];
      if (copy[index]) {
        copy[index] = { ...copy[index]!, balanceStr: val };
      }
      return copy;
    });
  }

  function handleRemoveDraft(index: number) {
    triggerHaptic();
    setDrafts((prev) => prev.filter((_, i) => i !== index));
  }

  function handleAddCustomAsset() {
    if (!customName.trim()) {
      setErrorMsg('Please enter a name for your asset or account');
      return;
    }
    setErrorMsg('');
    triggerHaptic();

    const newDraft: AccountDraft = {
      id: `acc-custom-${Date.now()}`,
      name: customName.trim(),
      type: customType,
      balanceStr: customBalance.trim(),
      isCustom: true,
    };

    setDrafts((prev) => [...prev, newDraft]);
    setCustomName('');
    setCustomBalance('');
    setShowAddCustom(false);
  }

  // Calculate live total liquid money
  const totalLiquidMinor = drafts.reduce((sum, d) => {
    if (!d.balanceStr.trim()) return sum;
    const parsed = parseAmountInput(d.balanceStr);
    return parsed.ok ? sum + parsed.minor : sum;
  }, 0);

  async function handleSave() {
    setIsSaving(true);
    setErrorMsg('');
    triggerHaptic();

    try {
      if (enableSecurity) {
        if (!/^\d{4}$/.test(pin)) {
          setErrorMsg('Passcode must be exactly 4 digits');
          setIsSaving(false);
          return;
        }
        if (pin !== confirmPin) {
          setErrorMsg('PIN confirmation does not match');
          setIsSaving(false);
          return;
        }
      }

      for (const draft of drafts) {
        let openingMinor = 0;
        if (draft.balanceStr.trim()) {
          const parsed = parseAmountInput(draft.balanceStr);
          if (parsed.ok) {
            openingMinor = parsed.minor;
          }
        }

        const accountToSave: Account = {
          id: draft.id,
          name: draft.name,
          type: draft.type,
          currency: 'GHS',
          openingBalanceMinor: openingMinor,
          archived: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await accountsRepo.create(accountToSave);
      }

      if (enableSecurity) {
        const passcodeHash = await hashPasscode(pin);
        await settingsRepo.set('passcodeHash', passcodeHash);
        await settingsRepo.set('lockEnabled', true);
        await settingsRepo.set('biometricEnabled', enableBiometric);
      }

      await settingsRepo.set('onboardingDone', true);
      onCompleted(enableSecurity ? 'Assets & Passcode secured successfully' : 'Liquid assets calibrated successfully');
      onClose();
    } catch (err: unknown) {
      setErrorMsg((err as Error).message || 'Failed to save liquid assets');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSkip() {
    triggerHaptic();
    await settingsRepo.set('onboardingDone', true);
    onCompleted('Setup completed. You can update accounts anytime.');
    onClose();
  }

  function getAccountIcon(type: AccountType) {
    switch (type) {
      case 'cash':
        return <Banknote className="w-5 h-5 text-amber-700" />;
      case 'mobile_money':
        return <Smartphone className="w-5 h-5 text-emerald-700" />;
      case 'bank':
        return <Landmark className="w-5 h-5 text-blue-700" />;
      case 'savings':
        return <ShieldCheck className="w-5 h-5 text-violet-700" />;
      case 'investment':
        return <TrendingUp className="w-5 h-5 text-orange-700" />;
      default:
        return <HelpCircle className="w-5 h-5 text-slate-600" />;
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-surface-container-lowest w-full max-w-lg rounded-t-[32px] sm:rounded-[32px] shadow-2xl border border-outline-variant/30 p-6 max-h-[92vh] flex flex-col">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-primary text-secondary-container flex items-center justify-center shadow-sm">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-primary dark:text-white leading-tight">
                Calibrate Liquid Assets
              </h2>
              <p className="text-xs text-on-surface-variant">
                Enter all money at hand, bank, momo & savings
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSkip}
            aria-label="Skip onboarding"
            className="w-8 h-8 rounded-full bg-surface-container-low text-on-surface-variant hover:text-on-surface flex items-center justify-center text-xs"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Total Liquid Summary Banner */}
        <div className="my-3 p-4 rounded-2xl bg-surface-container-low/80 border border-outline-variant/20 flex items-center justify-between">
          <div>
            <span className="text-[11px] uppercase tracking-wider text-on-surface-variant font-medium">
              Total Starting Liquid Money
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-lg font-semibold text-secondary">GH₵</span>
              <span className="text-2xl font-extrabold text-primary dark:text-white tabular-nums">
                {formatMinor(totalLiquidMinor, 'GHS').replace('GH₵', '').trim()}
              </span>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-full bg-tertiary-fixed/60 text-emerald-800 text-[11px] font-semibold">
            {drafts.length} liquid assets
          </span>
        </div>

        {/* Scrollable Account Input Rows */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1 py-1">
          {drafts.map((draft, idx) => (
            <div
              key={draft.id}
              className="p-3.5 rounded-2xl bg-surface-container-low/40 border border-outline-variant/25 flex items-center justify-between gap-3 hover:bg-surface-container-low/70 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="w-9 h-9 rounded-xl bg-surface-container-lowest flex items-center justify-center shadow-xs shrink-0">
                  {getAccountIcon(draft.type)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-primary dark:text-white truncate">
                    {draft.name}
                  </p>
                  <p className="text-[10px] text-on-surface-variant capitalize">
                    {draft.type.replace('_', ' ')}
                  </p>
                </div>
              </div>

              {/* Amount input */}
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-xs font-medium text-on-surface-variant">GH₵</span>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="Starting GH₵"
                  value={draft.balanceStr}
                  onChange={(e) => handleBalanceChange(idx, e.target.value)}
                  className="w-24 px-2.5 py-1.5 rounded-xl bg-surface-container-lowest border border-outline-variant/30 text-xs font-bold text-primary dark:text-white text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-secondary/40"
                />
                {draft.isCustom && (
                  <button
                    type="button"
                    onClick={() => handleRemoveDraft(idx)}
                    aria-label={`Remove ${draft.name}`}
                    className="w-7 h-7 text-outline hover:text-red-500 rounded-lg flex items-center justify-center transition-colors ml-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}

          {/* Add Custom Asset Section */}
          {showAddCustom ? (
            <div className="p-4 rounded-2xl bg-surface-container-lowest border border-secondary/40 space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-primary dark:text-white">
                  Add Custom Asset / Account
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddCustom(false)}
                  className="text-xs text-outline hover:text-on-surface"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Account name (e.g. Telecel Cash, CalBank)"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-container-low text-xs font-medium text-on-surface border border-outline-variant/20 focus:outline-none"
                />
                <select
                  value={customType}
                  onChange={(e) => setCustomType(e.target.value as AccountType)}
                  className="w-full px-3 py-2 rounded-xl bg-surface-container-low text-xs font-medium text-on-surface border border-outline-variant/20 focus:outline-none"
                >
                  <option value="cash">Cash</option>
                  <option value="mobile_money">Mobile Money</option>
                  <option value="bank">Bank</option>
                  <option value="savings">Savings / Susu</option>
                  <option value="investment">Stocks / Investment</option>
                  <option value="other">Other Asset</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="Starting balance (optional)"
                  value={customBalance}
                  onChange={(e) => setCustomBalance(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl bg-surface-container-low text-xs font-medium text-on-surface border border-outline-variant/20 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddCustomAsset}
                  className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold shadow-xs active:scale-95 transition-all"
                >
                  Add
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                triggerHaptic();
                setShowAddCustom(true);
              }}
              className="w-full py-2.5 rounded-2xl border border-dashed border-outline-variant/50 text-on-surface-variant hover:text-primary hover:border-primary text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add another asset (Stocks, another MoMo, Bank)</span>
            </button>
          )}

          {/* Optional App Security (PIN & Biometrics) */}
          <div className="p-4 rounded-2xl bg-surface-container-low/50 border border-outline-variant/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-surface-container-lowest text-primary flex items-center justify-center shadow-xs">
                  <Lock className="w-4 h-4 text-secondary" />
                </div>
                <div>
                  <p className="text-xs font-bold text-primary dark:text-white">
                    App Security (Optional)
                  </p>
                  <p className="text-[10px] text-on-surface-variant">
                    Protect with 4-digit PIN or biometrics
                  </p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableSecurity}
                  onChange={(e) => {
                    triggerHaptic();
                    setEnableSecurity(e.target.checked);
                  }}
                  className="sr-only peer"
                />
                <div className="w-10 h-5 bg-surface-container-high peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-secondary"></div>
              </label>
            </div>

            {enableSecurity && (
              <div className="pt-2 border-t border-outline-variant/20 space-y-3 animate-in fade-in duration-200">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-semibold text-on-surface-variant block mb-1">
                      4-Digit PIN
                    </label>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      placeholder="••••"
                      value={pin}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                        setPin(val);
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-surface-container-lowest border border-outline-variant/30 text-center tracking-widest text-sm font-bold text-primary dark:text-white focus:outline-none focus:ring-2 focus:ring-secondary/40"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-on-surface-variant block mb-1">
                      Confirm PIN
                    </label>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={4}
                      placeholder="••••"
                      value={confirmPin}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, '').slice(0, 4);
                        setConfirmPin(val);
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-surface-container-lowest border border-outline-variant/30 text-center tracking-widest text-sm font-bold text-primary dark:text-white focus:outline-none focus:ring-2 focus:ring-secondary/40"
                    />
                  </div>
                </div>

                {biometricSupported && (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-surface-container-lowest border border-outline-variant/20">
                    <div className="flex items-center gap-2">
                      <Fingerprint className="w-4 h-4 text-secondary" />
                      <span className="text-xs font-semibold text-primary dark:text-white">
                        Enable Biometrics (Face/Fingerprint)
                      </span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={enableBiometric}
                        onChange={(e) => {
                          triggerHaptic();
                          setEnableBiometric(e.target.checked);
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4 bg-surface-container-high peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-secondary"></div>
                    </label>
                  </div>
                )}
              </div>
            )}
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 text-red-600 text-xs font-medium">
              {errorMsg}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-outline-variant/20 space-y-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="w-full py-3.5 px-4 rounded-2xl bg-primary hover:bg-primary-container active:scale-[0.99] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50"
          >
            <Check className="w-4 h-4 stroke-[3]" />
            <span>Save Liquid Assets</span>
          </button>

          <button
            type="button"
            onClick={handleSkip}
            className="w-full py-2 text-center text-xs font-medium text-on-surface-variant hover:text-on-surface"
          >
            Skip for now (I will enter later)
          </button>
        </div>
      </div>
    </div>
  );
};
