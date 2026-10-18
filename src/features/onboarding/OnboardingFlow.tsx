import React, { useState } from 'react';
import { settingsRepo, accountsRepo } from '@/db';
import { parseAmountInput } from '@/domain/money';
import { hashPasscode } from '@/crypto/passcode';
import { triggerHaptic } from '@/lib/haptics';
import {
  Wallet,
  Shield,
  Coins,
  ChevronRight,
  ChevronLeft,
  Check,
  Smartphone,
  HardDrive,
  PiggyBank,
  Building,
} from 'lucide-react';
import type { AccountType } from '@/domain/types';

interface OnboardingFlowProps {
  onComplete: () => void;
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete }) => {
  const [step, setStep] = useState(1);

  // Step 1: Currency & Locale
  const [currency, setCurrency] = useState('GHS');
  const [locale, setLocale] = useState('en-GH');

  // Step 2: Accounts & Opening Balances (in Cedis)
  const [accounts, setAccounts] = useState<
    Array<{ id: string; name: string; type: AccountType; balanceStr: string; icon: string }>
  >([
    { id: 'acc-momo', name: 'MTN Mobile Money', type: 'mobile_money', balanceStr: '0', icon: 'smartphone' },
    { id: 'acc-cash', name: 'Cash in Hand', type: 'cash', balanceStr: '0', icon: 'wallet' },
    { id: 'acc-bank', name: 'Bank Account', type: 'bank', balanceStr: '0', icon: 'building' },
    { id: 'acc-savings', name: 'Emergency Savings', type: 'savings', balanceStr: '0', icon: 'piggy' },
  ]);

  // Step 3: Income Mode
  const [incomeMode, setIncomeMode] = useState<'variable' | 'fixed'>('variable');

  // Step 4: Essentials & Savings Buffer
  const [essentialMonthlyStr, setEssentialMonthlyStr] = useState('1000');
  const [savingsTargetStr, setSavingsTargetStr] = useState('3000');

  // Step 5: Optional Passcode
  const [enableLock, setEnableLock] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [passcodeError, setPasscodeError] = useState<string | null>(null);

  const [persisting, setPersisting] = useState(false);

  // Request storage persistence from browser
  async function requestStoragePersistence() {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
      try {
        await navigator.storage.persist();
      } catch {
        // Continue even if browser denies persistence
      }
    }
  }

  // Finish onboarding
  async function handleFinish() {
    setPersisting(true);
    triggerHaptic();

    try {
      await requestStoragePersistence();

      // Update accounts in DB
      for (const acc of accounts) {
        const parsed = parseAmountInput(acc.balanceStr);
        const openingBalanceMinor = parsed.ok ? parsed.minor : 0;
        await accountsRepo.update(acc.id, {
          openingBalanceMinor,
          currency,
        });
      }

      // Update settings in DB
      const essentialResult = parseAmountInput(essentialMonthlyStr);
      const savingsResult = parseAmountInput(savingsTargetStr);

      await settingsRepo.set('currency', currency);
      await settingsRepo.set('locale', locale);
      await settingsRepo.set('incomeMode', incomeMode);
      await settingsRepo.set(
        'essentialMonthlyMinor',
        essentialResult.ok ? essentialResult.minor : 100000
      );
      await settingsRepo.set(
        'savingsTargetMinor',
        savingsResult.ok ? savingsResult.minor : 300000
      );

      if (enableLock && passcode && passcode === confirmPasscode && passcode.length >= 4) {
        const hash = await hashPasscode(passcode);
        await settingsRepo.set('passcodeHash', hash);
        await settingsRepo.set('lockEnabled', true);
      }

      await settingsRepo.set('onboardingDone', true);
      onComplete();
    } catch {
      onComplete();
    } finally {
      setPersisting(false);
    }
  }

  // Skip onboarding with defaults
  async function handleSkip() {
    triggerHaptic();
    await requestStoragePersistence();
    await settingsRepo.set('onboardingDone', true);
    onComplete();
  }

  return (
    <div className="fixed inset-0 z-50 bg-surface flex flex-col justify-between p-6 max-w-lg mx-auto w-full">
      {/* Top Header & Skip */}
      <div className="flex items-center justify-between pt-2">
        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 4, 5].map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                s === step
                  ? 'w-6 bg-primary'
                  : s < step
                  ? 'w-2 bg-on-tertiary-container'
                  : 'w-2 bg-surface-variant'
              }`}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={handleSkip}
          className="font-label-sm text-xs font-medium text-on-surface-variant hover:text-primary transition-colors py-1 px-2"
        >
          Skip Setup
        </button>
      </div>

      {/* Step Content */}
      <div className="my-auto py-4">
        {step === 1 && (
          <div className="space-y-4 animate-fadeIn">
            <div className="w-12 h-12 rounded-2xl bg-secondary/15 flex items-center justify-center text-secondary mb-2">
              <Coins className="w-6 h-6" />
            </div>
            <h2 className="font-headline-lg text-2xl font-bold text-primary tracking-tight">
              Welcome to SikaManger
            </h2>
            <p className="font-body-md text-sm text-on-surface-variant leading-relaxed">
              Your private, offline personal finance companion. Let's calibrate your currency and
              locale.
            </p>

            <div className="space-y-3 pt-3">
              <div>
                <label className="block font-label-sm text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
                  Default Currency
                </label>
                <input
                  type="text"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                  className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl px-3.5 py-2.5 font-body-md text-sm text-on-surface focus:outline-none focus:border-secondary"
                  placeholder="GHS"
                />
              </div>

              <div>
                <label className="block font-label-sm text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
                  Locale
                </label>
                <input
                  type="text"
                  value={locale}
                  onChange={(e) => setLocale(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl px-3.5 py-2.5 font-body-md text-sm text-on-surface focus:outline-none focus:border-secondary"
                  placeholder="en-GH"
                />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 animate-fadeIn">
            <div className="w-12 h-12 rounded-2xl bg-tertiary-container/30 flex items-center justify-center text-on-tertiary-container mb-2">
              <Wallet className="w-6 h-6" />
            </div>
            <h2 className="font-headline-lg text-2xl font-bold text-primary tracking-tight">
              Starting Balances
            </h2>
            <p className="font-body-md text-sm text-on-surface-variant leading-relaxed">
              Enter your current balances in {currency}. You can adjust these anytime.
            </p>

            <div className="space-y-2.5 max-h-[50vh] overflow-y-auto pr-1">
              {accounts.map((acc, index) => (
                <div
                  key={acc.id}
                  className="bg-surface-container-lowest rounded-xl p-3 border border-surface-variant/40 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-surface-container-high flex items-center justify-center text-primary shrink-0">
                      {acc.type === 'mobile_money' && <Smartphone className="w-4 h-4 text-secondary" />}
                      {acc.type === 'cash' && <Wallet className="w-4 h-4 text-on-tertiary-container" />}
                      {acc.type === 'bank' && <Building className="w-4 h-4 text-primary" />}
                      {acc.type === 'savings' && <PiggyBank className="w-4 h-4 text-secondary" />}
                    </div>
                    <span className="font-label-md text-xs font-semibold text-on-surface truncate">
                      {acc.name}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 w-28 shrink-0">
                    <span className="font-label-sm text-xs text-on-surface-variant">GH₵</span>
                    <input
                      type="text"
                      value={acc.balanceStr}
                      onChange={(e) => {
                        const next = [...accounts];
                        next[index]!.balanceStr = e.target.value;
                        setAccounts(next);
                      }}
                      className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg px-2 py-1.5 text-right font-body-md text-xs text-on-surface focus:outline-none focus:border-secondary"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 animate-fadeIn">
            <div className="w-12 h-12 rounded-2xl bg-secondary/15 flex items-center justify-center text-secondary mb-2">
              <Coins className="w-6 h-6" />
            </div>
            <h2 className="font-headline-lg text-2xl font-bold text-primary tracking-tight">
              How Do You Earn?
            </h2>
            <p className="font-body-md text-sm text-on-surface-variant leading-relaxed">
              SikaManger tailors your Safe-to-Spend allowance depending on your income predictability.
            </p>

            <div className="space-y-3 pt-2">
              <button
                type="button"
                onClick={() => setIncomeMode('variable')}
                className={`w-full p-4 rounded-2xl text-left border transition-all ${
                  incomeMode === 'variable'
                    ? 'border-primary bg-surface-container-high/60 shadow-sm'
                    : 'border-surface-variant/40 bg-surface-container-lowest hover:bg-surface-container-low'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-headline-sm text-sm font-bold text-primary">
                    Variable Income (Recommended)
                  </span>
                  {incomeMode === 'variable' && (
                    <div className="w-5 h-5 rounded-full bg-primary text-on-primary flex items-center justify-center">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
                <p className="font-body-md text-xs text-on-surface-variant leading-relaxed">
                  For freelancers, traders, and entrepreneurs. Calculates conservative daily
                  allowances based on your leanest months so you never overspend between contracts.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setIncomeMode('fixed')}
                className={`w-full p-4 rounded-2xl text-left border transition-all ${
                  incomeMode === 'fixed'
                    ? 'border-primary bg-surface-container-high/60 shadow-sm'
                    : 'border-surface-variant/40 bg-surface-container-lowest hover:bg-surface-container-low'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-headline-sm text-sm font-bold text-primary">
                    Fixed Salary
                  </span>
                  {incomeMode === 'fixed' && (
                    <div className="w-5 h-5 rounded-full bg-primary text-on-primary flex items-center justify-center">
                      <Check className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
                <p className="font-body-md text-xs text-on-surface-variant leading-relaxed">
                  For salaried workers with predictable monthly paydays.
                </p>
              </button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4 animate-fadeIn">
            <div className="w-12 h-12 rounded-2xl bg-tertiary-container/30 flex items-center justify-center text-on-tertiary-container mb-2">
              <PiggyBank className="w-6 h-6" />
            </div>
            <h2 className="font-headline-lg text-2xl font-bold text-primary tracking-tight">
              Safety & Essentials
            </h2>
            <p className="font-body-md text-sm text-on-surface-variant leading-relaxed">
              These figures help SikaManger track your cash runway and protect your emergency cushion.
            </p>

            <div className="space-y-3 pt-2">
              <div>
                <label className="block font-label-sm text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
                  Essential Monthly Expenses ({currency})
                </label>
                <input
                  type="text"
                  value={essentialMonthlyStr}
                  onChange={(e) => setEssentialMonthlyStr(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl px-3.5 py-2.5 font-body-md text-sm text-on-surface focus:outline-none focus:border-secondary"
                  placeholder="1000"
                />
                <p className="font-label-sm text-[11px] text-on-surface-variant mt-1">
                  Rent, food, utilities, transport, and non-negotiables.
                </p>
              </div>

              <div>
                <label className="block font-label-sm text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
                  Emergency Buffer Target ({currency})
                </label>
                <input
                  type="text"
                  value={savingsTargetStr}
                  onChange={(e) => setSavingsTargetStr(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl px-3.5 py-2.5 font-body-md text-sm text-on-surface focus:outline-none focus:border-secondary"
                  placeholder="3000"
                />
                <p className="font-label-sm text-[11px] text-on-surface-variant mt-1">
                  Usually 3 months of essential expenses.
                </p>
              </div>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4 animate-fadeIn">
            <div className="w-12 h-12 rounded-2xl bg-secondary/15 flex items-center justify-center text-secondary mb-2">
              <Shield className="w-6 h-6" />
            </div>
            <h2 className="font-headline-lg text-2xl font-bold text-primary tracking-tight">
              App Security & Storage
            </h2>
            <p className="font-body-md text-sm text-on-surface-variant leading-relaxed">
              SikaManger runs 100% offline. We request permanent storage from your device to keep your
              data safe even during phone storage cleanup.
            </p>

            <div className="bg-surface-container-lowest rounded-2xl p-4 border border-surface-variant/40 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-body-md-bold text-sm text-primary">Require Passcode</p>
                  <p className="font-label-sm text-xs text-on-surface-variant">
                    Lock the app whenever you close it
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEnableLock(!enableLock)}
                  className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                    enableLock ? 'bg-primary justify-end' : 'bg-surface-variant justify-start'
                  }`}
                >
                  <div className="w-4 h-4 rounded-full bg-surface-container-lowest shadow-sm" />
                </button>
              </div>

              {enableLock && (
                <div className="space-y-2 pt-2 border-t border-surface-variant/30">
                  <input
                    type="password"
                    pattern="[0-9]*"
                    inputMode="numeric"
                    maxLength={6}
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    placeholder="Enter 4-6 digit passcode"
                    className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl px-3.5 py-2 font-body-md text-sm text-on-surface focus:outline-none focus:border-secondary"
                  />
                  <input
                    type="password"
                    pattern="[0-9]*"
                    inputMode="numeric"
                    maxLength={6}
                    value={confirmPasscode}
                    onChange={(e) => setConfirmPasscode(e.target.value)}
                    placeholder="Confirm passcode"
                    className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl px-3.5 py-2 font-body-md text-sm text-on-surface focus:outline-none focus:border-secondary"
                  />
                  {passcodeError && (
                    <p className="font-label-sm text-xs text-error font-medium">{passcodeError}</p>
                  )}
                </div>
              )}
            </div>

            <div className="bg-surface-container-low rounded-xl p-3 flex items-start gap-2.5 text-xs text-on-surface-variant">
              <HardDrive className="w-4 h-4 text-on-tertiary-container shrink-0 mt-0.5" />
              <span>
                Your data stays encrypted solely on this device. SikaManger has no servers, no ads,
                and no tracking.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex gap-3 pt-4">
        {step > 1 && (
          <button
            type="button"
            onClick={() => {
              triggerHaptic();
              setStep(step - 1);
            }}
            className="py-3 px-4 rounded-xl bg-surface-container-high text-primary font-label-md text-xs font-semibold flex items-center justify-center gap-1 hover:bg-surface-variant transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>
        )}

        {step < 5 ? (
          <button
            type="button"
            onClick={() => {
              triggerHaptic();
              setStep(step + 1);
            }}
            className="flex-1 py-3 px-4 rounded-xl bg-primary text-on-primary font-label-md text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-primary/95 transition-colors shadow-sm"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            disabled={persisting}
            onClick={() => {
              if (enableLock) {
                if (passcode.length < 4) {
                  setPasscodeError('Passcode must be at least 4 digits');
                  return;
                }
                if (passcode !== confirmPasscode) {
                  setPasscodeError('Passcodes do not match');
                  return;
                }
              }
              handleFinish();
            }}
            className="flex-1 py-3 px-4 rounded-xl bg-primary text-on-primary font-label-md text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-primary/95 transition-colors shadow-sm disabled:opacity-50"
          >
            {persisting ? 'Preparing SikaManger...' : 'Complete Setup'}
            <Check className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
};
