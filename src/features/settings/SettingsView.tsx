import React, { useState, useEffect, useRef } from 'react';
import { settingsRepo } from '@/db';
import { clearAllDatabaseData } from '@/db/database';
import { seedInitialDataIfNeeded } from '@/db/seed';
import {
  createBackupPayload,
  restoreBackup,
  exportTransactionsCsv,
  triggerFileDownload,
  type RestoreSummary,
} from '@/features/backup/backupService';
import { encryptBackup, decryptBackup } from '@/crypto/encryption';
import { hashPasscode, verifyPasscode } from '@/crypto/passcode';
import { parseAmountInput } from '@/domain/money';
import { type BackupPayload, BackupPayloadSchema } from '@/domain/validation';
import { triggerHaptic } from '@/lib/haptics';
import {
  Shield,
  Download,
  Upload,
  FileSpreadsheet,
  Trash2,
  Lock,
  AlertTriangle,
  CheckCircle,
  Wallet,
  Coins,
  ChevronLeft,
} from 'lucide-react';
import type { Settings } from '@/domain/types';

interface SettingsViewProps {
  onBack: () => void;
  onShowToast: (msg: string) => void;
  onResetToOnboarding?: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  onBack,
  onShowToast,
  onResetToOnboarding,
}) => {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);

  // Backup Passphrase Modal State
  const [backupModalOpen, setBackupModalOpen] = useState(false);
  const [backupPassphrase, setBackupPassphrase] = useState('');
  const [backupPassphraseConfirm, setBackupPassphraseConfirm] = useState('');
  const [backupError, setBackupError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Restore Modal State
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [restorePassphrase, setRestorePassphrase] = useState('');
  const [restoreFileContent, setRestoreFileContent] = useState<string | null>(null);
  const [restoreSummary, setRestoreSummary] = useState<RestoreSummary | null>(null);
  const [pendingPayload, setPendingPayload] = useState<BackupPayload | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Passcode Modal State
  const [passcodeModalOpen, setPasscodeModalOpen] = useState(false);
  const [oldPasscode, setOldPasscode] = useState('');
  const [newPasscode, setNewPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [passcodeError, setPasscodeError] = useState<string | null>(null);

  // Delete All Data Modal State
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Editable form fields
  const [currency, setCurrency] = useState('GHS');
  const [locale, setLocale] = useState('en-GH');
  const [incomeMode, setIncomeMode] = useState<'fixed' | 'variable'>('variable');
  const [weekStart, setWeekStart] = useState<0 | 1>(1);
  const [essentialMonthlyStr, setEssentialMonthlyStr] = useState('1000');
  const [savingsTargetStr, setSavingsTargetStr] = useState('3000');

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    setLoading(true);
    const s = await settingsRepo.getAll();
    setSettings(s);
    setCurrency(s.currency);
    setLocale(s.locale);
    setIncomeMode(s.incomeMode);
    setWeekStart(s.weekStart);
    setEssentialMonthlyStr((s.essentialMonthlyMinor / 100).toString());
    setSavingsTargetStr((s.savingsTargetMinor / 100).toString());
    setLoading(false);
  }

  // Save changes to settings
  async function handleSaveSettings() {
    triggerHaptic();
    const essentialResult = parseAmountInput(essentialMonthlyStr);
    const savingsResult = parseAmountInput(savingsTargetStr);

    const essentialMinor = essentialResult.ok ? essentialResult.minor : 100000;
    const savingsMinor = savingsResult.ok ? savingsResult.minor : 300000;

    await settingsRepo.set('currency', currency);
    await settingsRepo.set('locale', locale);
    await settingsRepo.set('incomeMode', incomeMode);
    await settingsRepo.set('weekStart', weekStart);
    await settingsRepo.set('essentialMonthlyMinor', essentialMinor);
    await settingsRepo.set('savingsTargetMinor', savingsMinor);

    onShowToast('Settings saved successfully');
    await loadSettings();
  }

  // Export encrypted backup
  async function handleExportBackupSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!backupPassphrase) {
      setBackupError('Please enter a passphrase');
      return;
    }
    if (backupPassphrase.length < 8) {
      setBackupError('Passphrase must be at least 8 characters long');
      return;
    }
    if (backupPassphrase !== backupPassphraseConfirm) {
      setBackupError('Passphrases do not match');
      return;
    }

    try {
      setIsExporting(true);
      setBackupError(null);
      triggerHaptic();

      const payload = await createBackupPayload();
      const encryptedJson = await encryptBackup(payload, backupPassphrase);

      const dateStr = new Date().toISOString().split('T')[0];
      triggerFileDownload(
        encryptedJson,
        `sikamanger-backup-${dateStr}.sikamanger`,
        'application/json'
      );

      await settingsRepo.set('lastBackupAt', new Date().toISOString());
      setBackupModalOpen(false);
      setBackupPassphrase('');
      setBackupPassphraseConfirm('');
      onShowToast('Encrypted backup downloaded successfully');
      await loadSettings();
    } catch (err: unknown) {
      setBackupError((err as Error).message || 'Failed to create backup');
    } finally {
      setIsExporting(false);
    }
  }

  // Handle file select for restore
  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setRestoreFileContent(content);
      setRestoreModalOpen(true);
      setRestorePassphrase('');
      setRestoreSummary(null);
      setPendingPayload(null);
      setRestoreError(null);
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = '';
  }

  // Decrypt and inspect restore file
  async function handleDecryptRestoreSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!restoreFileContent || !restorePassphrase) {
      setRestoreError('Passphrase is required');
      return;
    }

    try {
      setIsRestoring(true);
      setRestoreError(null);
      triggerHaptic();

      const raw = await decryptBackup(restoreFileContent, restorePassphrase);
      const parsed = BackupPayloadSchema.parse(raw);
      setPendingPayload(parsed);

      setRestoreSummary({
        accounts: parsed.accounts.length,
        categories: parsed.categories.length,
        transactions: parsed.transactions.length,
        journalEntries: parsed.journalEntries.length,
        budgets: parsed.budgets.length,
        goals: parsed.goals.length,
      });
    } catch (err: unknown) {
      setRestoreError((err as Error).message || 'Invalid passphrase or corrupt file');
    } finally {
      setIsRestoring(false);
    }
  }

  // Execute restore with chosen mode
  async function handleExecuteRestore(mode: 'replace' | 'merge') {
    if (!pendingPayload) return;

    try {
      setIsRestoring(true);
      triggerHaptic();
      await restoreBackup(pendingPayload, mode);
      setRestoreModalOpen(false);
      setPendingPayload(null);
      setRestoreSummary(null);
      onShowToast(`Database restored successfully (${mode === 'replace' ? 'Replaced all' : 'Merged'})`);
      await loadSettings();
    } catch (err: unknown) {
      setRestoreError((err as Error).message || 'Failed to restore database');
    } finally {
      setIsRestoring(false);
    }
  }

  // Export CSV
  async function handleExportCsv() {
    try {
      triggerHaptic();
      const csv = await exportTransactionsCsv();
      const dateStr = new Date().toISOString().split('T')[0];
      triggerFileDownload(
        csv,
        `sikamanger-transactions-${dateStr}.csv`,
        'text/csv;charset=utf-8;'
      );
      onShowToast('Transactions CSV exported');
    } catch (err: unknown) {
      onShowToast(`Export failed: ${(err as Error).message}`);
    }
  }

  // Passcode setup / change
  async function handlePasscodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPasscodeError(null);

    if (settings?.lockEnabled && settings.passcodeHash) {
      const match = await verifyPasscode(oldPasscode, settings.passcodeHash);
      if (!match) {
        setPasscodeError('Current passcode is incorrect');
        return;
      }
    }

    if (newPasscode.length < 4) {
      setPasscodeError('Passcode must be at least 4 digits');
      return;
    }

    if (newPasscode !== confirmPasscode) {
      setPasscodeError('New passcodes do not match');
      return;
    }

    try {
      triggerHaptic();
      const hash = await hashPasscode(newPasscode);
      await settingsRepo.set('passcodeHash', hash);
      await settingsRepo.set('lockEnabled', true);
      setPasscodeModalOpen(false);
      setOldPasscode('');
      setNewPasscode('');
      setConfirmPasscode('');
      onShowToast('App passcode updated and lock enabled');
      await loadSettings();
    } catch (err: unknown) {
      setPasscodeError((err as Error).message);
    }
  }

  // Toggle lock enabled
  async function handleToggleLock() {
    triggerHaptic();
    if (!settings) return;

    if (!settings.lockEnabled) {
      // Must set passcode first if no hash
      if (!settings.passcodeHash) {
        setPasscodeModalOpen(true);
        return;
      }
      await settingsRepo.set('lockEnabled', true);
      onShowToast('App lock enabled');
    } else {
      await settingsRepo.set('lockEnabled', false);
      onShowToast('App lock disabled');
    }
    await loadSettings();
  }

  // Toggle biometric
  async function handleToggleBiometric() {
    triggerHaptic();
    if (!settings) return;
    const newVal = !settings.biometricEnabled;
    await settingsRepo.set('biometricEnabled', newVal);
    onShowToast(`Biometric unlock ${newVal ? 'enabled' : 'disabled'}`);
    await loadSettings();
  }

  // Delete all data
  async function handleDeleteAllData() {
    if (deleteConfirmationText.trim() !== 'DELETE') {
      return;
    }
    try {
      setIsDeleting(true);
      triggerHaptic();
      await clearAllDatabaseData();
      await seedInitialDataIfNeeded();
      await settingsRepo.set('onboardingDone', false);
      setDeleteModalOpen(false);
      onShowToast('All data deleted and database reset');
      if (onResetToOnboarding) {
        onResetToOnboarding();
      } else {
        window.location.reload();
      }
    } catch (err: unknown) {
      onShowToast(`Failed to delete data: ${(err as Error).message}`);
    } finally {
      setIsDeleting(false);
    }
  }

  if (loading || !settings) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-surface">
        <div className="w-8 h-8 rounded-full border-2 border-secondary border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col w-full pb-32 bg-surface text-on-surface">
      {/* Top Bar */}
      <div className="sticky top-0 z-40 bg-surface/90 backdrop-blur-md border-b border-surface-variant/40 px-4 h-14 flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="flex items-center gap-1.5 text-on-surface-variant hover:text-primary transition-colors py-2 px-1 -ml-1"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="font-label-md text-label-md font-medium">Home</span>
        </button>
        <h1 className="font-headline-sm text-headline-sm text-primary font-bold">Settings</h1>
        <div className="w-12" />
      </div>

      <div className="px-4 py-4 space-y-6 max-w-lg mx-auto w-full">
        {/* Currency & Locale Section */}
        <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm border border-surface-variant/30 space-y-4">
          <div className="flex items-center gap-2.5 text-primary">
            <Coins className="w-5 h-5 text-secondary" />
            <h2 className="font-headline-sm text-base font-bold">Currency & Region</h2>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block font-label-sm text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
                Currency Code
              </label>
              <input
                type="text"
                value={currency}
                onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                maxLength={4}
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl px-3.5 py-2.5 font-body-md text-sm text-on-surface focus:outline-none focus:border-secondary"
                placeholder="GHS"
              />
              <p className="font-label-sm text-[11px] text-on-surface-variant mt-1">
                Defaults to Ghana Cedi (GHS / GH₵).
              </p>
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

            <div>
              <label className="block font-label-sm text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
                Week Starts On
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setWeekStart(1)}
                  className={`py-2 px-3 rounded-xl font-label-sm text-xs font-semibold transition-all border ${
                    weekStart === 1
                      ? 'bg-primary text-on-primary border-primary'
                      : 'bg-surface-container-low text-on-surface-variant border-transparent hover:bg-surface-variant'
                  }`}
                >
                  Monday
                </button>
                <button
                  type="button"
                  onClick={() => setWeekStart(0)}
                  className={`py-2 px-3 rounded-xl font-label-sm text-xs font-semibold transition-all border ${
                    weekStart === 0
                      ? 'bg-primary text-on-primary border-primary'
                      : 'bg-surface-container-low text-on-surface-variant border-transparent hover:bg-surface-variant'
                  }`}
                >
                  Sunday
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Financial Calibration Section */}
        <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm border border-surface-variant/30 space-y-4">
          <div className="flex items-center gap-2.5 text-primary">
            <Wallet className="w-5 h-5 text-tertiary-container text-on-tertiary-container" />
            <h2 className="font-headline-sm text-base font-bold">Income & Budget Calibration</h2>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block font-label-sm text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
                Income Mode
              </label>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => setIncomeMode('variable')}
                  className={`py-2 px-3 rounded-xl font-label-sm text-xs font-semibold transition-all border ${
                    incomeMode === 'variable'
                      ? 'bg-primary text-on-primary border-primary'
                      : 'bg-surface-container-low text-on-surface-variant border-transparent hover:bg-surface-variant'
                  }`}
                >
                  Variable (Irregular)
                </button>
                <button
                  type="button"
                  onClick={() => setIncomeMode('fixed')}
                  className={`py-2 px-3 rounded-xl font-label-sm text-xs font-semibold transition-all border ${
                    incomeMode === 'fixed'
                      ? 'bg-primary text-on-primary border-primary'
                      : 'bg-surface-container-low text-on-surface-variant border-transparent hover:bg-surface-variant'
                  }`}
                >
                  Fixed (Salary)
                </button>
              </div>
              <p className="font-label-sm text-[12px] text-on-surface-variant leading-relaxed">
                {incomeMode === 'variable'
                  ? 'Calculates a conservative baseline from your lowest recent earning months so you never overspend between irregular contracts or payouts.'
                  : 'Assumes predictable scheduled salary inflows over each budget period.'}
              </p>
            </div>

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
                Food, rent, utilities, data, and obligations you must cover every month.
              </p>
            </div>

            <div>
              <label className="block font-label-sm text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
                Emergency Savings Buffer Target ({currency})
              </label>
              <input
                type="text"
                value={savingsTargetStr}
                onChange={(e) => setSavingsTargetStr(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl px-3.5 py-2.5 font-body-md text-sm text-on-surface focus:outline-none focus:border-secondary"
                placeholder="3000"
              />
              <p className="font-label-sm text-[11px] text-on-surface-variant mt-1">
                Your safety buffer target (typically 3 months of essentials).
              </p>
            </div>

            <button
              type="button"
              onClick={handleSaveSettings}
              className="w-full py-2.5 rounded-xl bg-surface-container-high hover:bg-surface-variant font-label-md text-xs font-semibold text-primary transition-colors mt-2"
            >
              Save Calibration Preferences
            </button>
          </div>
        </div>

        {/* Security & Lock Section */}
        <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm border border-surface-variant/30 space-y-4">
          <div className="flex items-center gap-2.5 text-primary">
            <Shield className="w-5 h-5 text-secondary" />
            <h2 className="font-headline-sm text-base font-bold">App Lock & Security</h2>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between py-1">
              <div>
                <p className="font-body-md-bold text-sm text-on-surface">Require Passcode</p>
                <p className="font-label-sm text-xs text-on-surface-variant">
                  Lock app when closed or after inactivity
                </p>
              </div>
              <button
                type="button"
                onClick={handleToggleLock}
                className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                  settings.lockEnabled ? 'bg-primary justify-end' : 'bg-surface-variant justify-start'
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-surface-container-lowest shadow-sm" />
              </button>
            </div>

            {settings.lockEnabled && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setPasscodeError(null);
                    setOldPasscode('');
                    setNewPasscode('');
                    setConfirmPasscode('');
                    setPasscodeModalOpen(true);
                  }}
                  className="w-full py-2.5 rounded-xl bg-surface-container-low hover:bg-surface-variant text-left px-3.5 flex items-center justify-between text-on-surface transition-colors"
                >
                  <span className="font-label-md text-xs font-medium">Change Passcode</span>
                  <Lock className="w-4 h-4 text-on-surface-variant" />
                </button>

                <div className="flex items-center justify-between py-1">
                  <div>
                    <p className="font-body-md-bold text-sm text-on-surface">Biometric Unlock</p>
                    <p className="font-label-sm text-xs text-on-surface-variant">
                      Face ID, Touch ID, or fingerprint (WebAuthn)
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleBiometric}
                    className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors ${
                      settings.biometricEnabled ? 'bg-primary justify-end' : 'bg-surface-variant justify-start'
                    }`}
                  >
                    <div className="w-4 h-4 rounded-full bg-surface-container-lowest shadow-sm" />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Backup & Export Section */}
        <div className="bg-surface-container-lowest rounded-2xl p-5 shadow-sm border border-surface-variant/30 space-y-4">
          <div className="flex items-center gap-2.5 text-primary">
            <Download className="w-5 h-5 text-secondary" />
            <h2 className="font-headline-sm text-base font-bold">Encrypted Backup & Data</h2>
          </div>

          <p className="font-label-sm text-xs text-on-surface-variant leading-relaxed">
            All your data is kept exclusively in your device's IndexedDB. Download regular
            passphrase-encrypted backups to safely transfer or preserve your records.
          </p>

          {settings.lastBackupAt && (
            <div className="bg-surface-container-low rounded-xl p-3 flex items-center gap-2 text-on-surface-variant text-xs">
              <CheckCircle className="w-4 h-4 text-on-tertiary-container shrink-0" />
              <span>
                Last backup: {new Date(settings.lastBackupAt).toLocaleDateString(locale, {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          )}

          <div className="space-y-2.5">
            <button
              type="button"
              onClick={() => {
                setBackupError(null);
                setBackupPassphrase('');
                setBackupPassphraseConfirm('');
                setBackupModalOpen(true);
              }}
              className="w-full py-3 px-4 rounded-xl bg-primary text-on-primary font-label-md text-xs font-semibold flex items-center justify-center gap-2 hover:bg-primary/95 transition-colors shadow-sm"
            >
              <Download className="w-4 h-4" />
              Download Encrypted Backup (.sikamanger)
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-3 px-4 rounded-xl bg-surface-container-low text-primary hover:bg-surface-variant font-label-md text-xs font-semibold flex items-center justify-center gap-2 transition-colors border border-outline-variant/30"
            >
              <Upload className="w-4 h-4 text-secondary" />
              Restore From Backup File
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelected}
              accept=".sikamanger,.json"
              className="hidden"
            />

            <button
              type="button"
              onClick={handleExportCsv}
              className="w-full py-2.5 px-4 rounded-xl bg-surface-container-lowest text-on-surface-variant hover:text-primary hover:bg-surface-container-low font-label-md text-xs font-medium flex items-center justify-center gap-2 transition-colors border border-outline-variant/20"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Export Transactions to CSV (Excel / Sheets)
            </button>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-error-container/30 rounded-2xl p-5 shadow-sm border border-error/20 space-y-3">
          <div className="flex items-center gap-2.5 text-error">
            <Trash2 className="w-5 h-5 text-error" />
            <h2 className="font-headline-sm text-base font-bold">Danger Zone</h2>
          </div>

          <p className="font-label-sm text-xs text-on-surface-variant leading-relaxed">
            Permanently wipes all accounts, transactions, budgets, journal reflections, and settings
            from this phone. This action cannot be undone.
          </p>

          <button
            type="button"
            onClick={() => {
              setDeleteConfirmationText('');
              setDeleteModalOpen(true);
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-error text-on-error font-label-md text-xs font-semibold hover:bg-error/90 transition-colors"
          >
            Delete All Data
          </button>
        </div>
      </div>

      {/* Export Passphrase Modal */}
      {backupModalOpen && (
        <div className="fixed inset-0 z-50 bg-primary/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl p-6 w-full max-w-sm shadow-xl border border-surface-variant/40 space-y-4">
            <h3 className="font-headline-sm text-lg font-bold text-primary">
              Set Backup Passphrase
            </h3>
            <p className="font-label-sm text-xs text-on-surface-variant leading-relaxed">
              Your backup is encrypted with Web Crypto PBKDF2 (SHA-256, 600,000 iterations) and
              AES-GCM (256-bit).{' '}
              <strong className="text-secondary font-semibold">
                If you lose this passphrase, your backup cannot be recovered by anyone.
              </strong>
            </p>

            <form onSubmit={handleExportBackupSubmit} className="space-y-3">
              <div>
                <label className="block font-label-sm text-xs font-medium text-on-surface-variant mb-1">
                  Passphrase (min 8 chars)
                </label>
                <input
                  type="password"
                  value={backupPassphrase}
                  onChange={(e) => setBackupPassphrase(e.target.value)}
                  placeholder="Enter strong passphrase"
                  className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl px-3.5 py-2.5 font-body-md text-sm text-on-surface focus:outline-none focus:border-secondary"
                  autoFocus
                />
              </div>

              <div>
                <label className="block font-label-sm text-xs font-medium text-on-surface-variant mb-1">
                  Confirm Passphrase
                </label>
                <input
                  type="password"
                  value={backupPassphraseConfirm}
                  onChange={(e) => setBackupPassphraseConfirm(e.target.value)}
                  placeholder="Confirm passphrase"
                  className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl px-3.5 py-2.5 font-body-md text-sm text-on-surface focus:outline-none focus:border-secondary"
                />
              </div>

              {backupError && (
                <p className="font-label-sm text-xs text-error font-medium">{backupError}</p>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setBackupModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-surface-container-high text-on-surface-variant font-label-md text-xs font-semibold hover:bg-surface-variant"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isExporting}
                  className="flex-1 py-2.5 rounded-xl bg-primary text-on-primary font-label-md text-xs font-semibold hover:bg-primary/95 disabled:opacity-50"
                >
                  {isExporting ? 'Encrypting...' : 'Export'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Restore Decrypt & Summary Modal */}
      {restoreModalOpen && (
        <div className="fixed inset-0 z-50 bg-primary/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl p-6 w-full max-w-sm shadow-xl border border-surface-variant/40 space-y-4">
            <h3 className="font-headline-sm text-lg font-bold text-primary">Restore Backup</h3>

            {!restoreSummary ? (
              <form onSubmit={handleDecryptRestoreSubmit} className="space-y-3">
                <p className="font-label-sm text-xs text-on-surface-variant leading-relaxed">
                  Enter the passphrase you used when creating this backup file to decrypt and inspect
                  it.
                </p>

                <div>
                  <label className="block font-label-sm text-xs font-medium text-on-surface-variant mb-1">
                    Passphrase
                  </label>
                  <input
                    type="password"
                    value={restorePassphrase}
                    onChange={(e) => setRestorePassphrase(e.target.value)}
                    placeholder="Enter passphrase"
                    className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl px-3.5 py-2.5 font-body-md text-sm text-on-surface focus:outline-none focus:border-secondary"
                    autoFocus
                  />
                </div>

                {restoreError && (
                  <p className="font-label-sm text-xs text-error font-medium">{restoreError}</p>
                )}

                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setRestoreModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl bg-surface-container-high text-on-surface-variant font-label-md text-xs font-semibold hover:bg-surface-variant"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isRestoring}
                    className="flex-1 py-2.5 rounded-xl bg-primary text-on-primary font-label-md text-xs font-semibold hover:bg-primary/95 disabled:opacity-50"
                  >
                    {isRestoring ? 'Decrypting...' : 'Verify'}
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="bg-surface-container-low rounded-xl p-3 text-xs space-y-1">
                  <p className="font-body-md-bold text-primary mb-1">Backup Summary:</p>
                  <p>• {restoreSummary.accounts} Accounts</p>
                  <p>• {restoreSummary.transactions} Transactions</p>
                  <p>• {restoreSummary.categories} Categories</p>
                  <p>• {restoreSummary.journalEntries} Journal Reflections</p>
                  <p>• {restoreSummary.budgets} Budgets</p>
                </div>

                <p className="font-label-sm text-xs text-on-surface-variant">
                  How would you like to apply this backup?
                </p>

                <div className="space-y-2">
                  <button
                    type="button"
                    disabled={isRestoring}
                    onClick={() => handleExecuteRestore('replace')}
                    className="w-full py-2.5 px-3 rounded-xl bg-primary text-on-primary font-label-md text-xs font-semibold hover:bg-primary/95 text-left"
                  >
                    <span className="block font-bold">Replace All Data</span>
                    <span className="block text-[11px] text-surface-dim font-normal">
                      Wipes local data and completely replaces with backup
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={isRestoring}
                    onClick={() => handleExecuteRestore('merge')}
                    className="w-full py-2.5 px-3 rounded-xl bg-surface-container-high text-primary font-label-md text-xs font-semibold hover:bg-surface-variant text-left"
                  >
                    <span className="block font-bold">Merge with Existing Data</span>
                    <span className="block text-[11px] text-on-surface-variant font-normal">
                      Updates records by ID without deleting existing entries
                    </span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setRestoreModalOpen(false)}
                  className="w-full py-2 rounded-xl text-on-surface-variant font-label-md text-xs font-medium hover:text-on-surface"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Change Passcode Modal */}
      {passcodeModalOpen && (
        <div className="fixed inset-0 z-50 bg-primary/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl p-6 w-full max-w-sm shadow-xl border border-surface-variant/40 space-y-4">
            <h3 className="font-headline-sm text-lg font-bold text-primary">
              {settings.passcodeHash ? 'Change Passcode' : 'Set App Passcode'}
            </h3>

            <form onSubmit={handlePasscodeSubmit} className="space-y-3">
              {settings.passcodeHash && (
                <div>
                  <label className="block font-label-sm text-xs font-medium text-on-surface-variant mb-1">
                    Current Passcode
                  </label>
                  <input
                    type="password"
                    pattern="[0-9]*"
                    inputMode="numeric"
                    value={oldPasscode}
                    onChange={(e) => setOldPasscode(e.target.value)}
                    placeholder="Enter current passcode"
                    className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl px-3.5 py-2.5 font-body-md text-sm text-on-surface focus:outline-none focus:border-secondary"
                    autoFocus
                  />
                </div>
              )}

              <div>
                <label className="block font-label-sm text-xs font-medium text-on-surface-variant mb-1">
                  New Passcode (4-6 digits)
                </label>
                <input
                  type="password"
                  pattern="[0-9]*"
                  inputMode="numeric"
                  value={newPasscode}
                  onChange={(e) => setNewPasscode(e.target.value)}
                  placeholder="Enter new digits"
                  className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl px-3.5 py-2.5 font-body-md text-sm text-on-surface focus:outline-none focus:border-secondary"
                />
              </div>

              <div>
                <label className="block font-label-sm text-xs font-medium text-on-surface-variant mb-1">
                  Confirm New Passcode
                </label>
                <input
                  type="password"
                  pattern="[0-9]*"
                  inputMode="numeric"
                  value={confirmPasscode}
                  onChange={(e) => setConfirmPasscode(e.target.value)}
                  placeholder="Repeat new digits"
                  className="w-full bg-surface-container-low border border-outline-variant/40 rounded-xl px-3.5 py-2.5 font-body-md text-sm text-on-surface focus:outline-none focus:border-secondary"
                />
              </div>

              {passcodeError && (
                <p className="font-label-sm text-xs text-error font-medium">{passcodeError}</p>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPasscodeModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-surface-container-high text-on-surface-variant font-label-md text-xs font-semibold hover:bg-surface-variant"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-primary text-on-primary font-label-md text-xs font-semibold hover:bg-primary/95"
                >
                  Save Passcode
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete All Confirmation Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 z-50 bg-primary/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl p-6 w-full max-w-sm shadow-xl border border-error/30 space-y-4">
            <div className="flex items-center gap-2 text-error">
              <AlertTriangle className="w-5 h-5 text-error" />
              <h3 className="font-headline-sm text-lg font-bold text-error">Delete All Data?</h3>
            </div>

            <p className="font-label-sm text-xs text-on-surface-variant leading-relaxed">
              This will completely wipe your local database and reset SikaManger to its onboarding state.
              To confirm, type <strong className="text-error font-bold">DELETE</strong> below:
            </p>

            <input
              type="text"
              value={deleteConfirmationText}
              onChange={(e) => setDeleteConfirmationText(e.target.value)}
              placeholder="Type DELETE"
              className="w-full bg-surface-container-low border border-error/40 rounded-xl px-3.5 py-2.5 font-body-md text-sm text-on-surface focus:outline-none focus:border-error"
              autoFocus
            />

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-surface-container-high text-on-surface-variant font-label-md text-xs font-semibold hover:bg-surface-variant"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteConfirmationText.trim() !== 'DELETE' || isDeleting}
                onClick={handleDeleteAllData}
                className="flex-1 py-2.5 rounded-xl bg-error text-on-error font-label-md text-xs font-semibold hover:bg-error/90 disabled:opacity-40"
              >
                {isDeleting ? 'Deleting...' : 'Confirm Wipe'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
