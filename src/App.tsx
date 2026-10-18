import React, { useState, useEffect, useCallback } from 'react';
import { seedInitialDataIfNeeded } from '@/db/seed';
import { settingsRepo, transactionsRepo } from '@/db';
import { Header } from '@/components/Header';
import { BottomNav, type NavTab } from '@/components/BottomNav';
import { Toast } from '@/components/Toast';
import { QuickAddSheet } from '@/features/quickAdd/QuickAddSheet';
import { HomeView } from '@/features/home/HomeView';
import { ActivityView } from '@/features/transactions/ActivityView';
import { JournalView } from '@/features/journal/JournalView';
import { InsightsView } from '@/features/insights/InsightsView';
import { BudgetsView } from '@/features/budgets/BudgetsView';
import { SettingsView } from '@/features/settings/SettingsView';
import { LockScreen } from '@/features/lock/LockScreen';
import { OnboardingFlow } from '@/features/onboarding/OnboardingFlow';
import { IOSInstallGuide } from '@/pwa/IOSInstallGuide';
import { UpdateToast } from '@/pwa/UpdateToast';
import { checkAndPersistStorage } from '@/lib/storage';
import type { Settings } from '@/domain/types';

export default function App(): React.ReactElement {
  const [initialized, setInitialized] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [isOnboarding, setIsOnboarding] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  // Navigation
  const [currentTab, setCurrentTab] = useState<NavTab>('home');
  const [showSettings, setShowSettings] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ message: string; onUndo?: (() => void) | undefined } | null>(null);

  // Version counter to trigger refresh when transactions mutate
  const [dataVersion, setDataVersion] = useState(0);

  // PWA guides
  const [showIosGuide, setShowIosGuide] = useState(false);

  const initApp = useCallback(async () => {
    try {
      await seedInitialDataIfNeeded();
      await checkAndPersistStorage();
      const s = await settingsRepo.getAll();
      setSettings(s);

      if (!s.onboardingDone) {
        setIsOnboarding(true);
      } else if (s.lockEnabled && s.passcodeHash) {
        setIsLocked(true);
      }
    } catch {
      // Fallback
    } finally {
      setInitialized(true);
    }
  }, []);

  useEffect(() => {
    initApp();
  }, [initApp]);

  // Auto-lock when tab/app goes into background
  useEffect(() => {
    function handleVisibilityChange() {
      if (document.visibilityState === 'hidden' && settings?.lockEnabled && settings.passcodeHash) {
        setIsLocked(true);
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [settings]);

  const showToast = useCallback((message: string, onUndo?: (() => void) | undefined) => {
    setToast({ message, onUndo });
  }, []);

  const handleTransactionSaved = useCallback(
    (txId: string) => {
      setDataVersion((v) => v + 1);
      showToast('Transaction recorded', async () => {
        await transactionsRepo.softDelete(txId);
        setDataVersion((v) => v + 1);
        showToast('Transaction undone');
      });
    },
    [showToast]
  );

  const handleOnboardingComplete = useCallback(async () => {
    const s = await settingsRepo.getAll();
    setSettings(s);
    setIsOnboarding(false);
    setDataVersion((v) => v + 1);
    showToast('SikaManger is ready');
  }, [showToast]);

  const handleResetToOnboarding = useCallback(() => {
    setShowSettings(false);
    setIsOnboarding(true);
    setCurrentTab('home');
    setDataVersion((v) => v + 1);
  }, []);

  if (!initialized) {
    return (
      <div className="flex-1 min-h-screen flex items-center justify-center bg-surface">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  // Gate 1: First-time Onboarding
  if (isOnboarding) {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
  }

  // Gate 2: Security Lock Screen
  if (isLocked && settings?.passcodeHash) {
    return (
      <LockScreen
        onUnlock={() => setIsLocked(false)}
        passcodeHash={settings.passcodeHash}
        biometricEnabled={settings.biometricEnabled}
      />
    );
  }

  // Helper title for Header
  const getHeaderTitle = () => {
    if (showSettings) return 'Settings';
    switch (currentTab) {
      case 'home':
        return 'Home';
      case 'activity':
        return 'Activity';
      case 'journal':
        return 'Journal';
      case 'insights':
        return 'Insights';
      case 'budgets':
        return 'Budgets';
      default:
        return 'SikaManger';
    }
  };

  return (
    <div className="min-h-full flex flex-col bg-surface text-on-surface antialiased selection:bg-secondary-container selection:text-on-secondary-container">
      {/* Top Header */}
      <Header
        title={getHeaderTitle()}
        onOpenSettings={() => setShowSettings(true)}
        onLockApp={() => setIsLocked(true)}
        isLockedEnabled={Boolean(settings?.lockEnabled && settings.passcodeHash)}
      />

      {/* Main View Area */}
      <main className="flex-1 flex flex-col w-full pt-16 pb-20 bg-surface">
        {showSettings ? (
          <SettingsView
            onBack={() => setShowSettings(false)}
            onShowToast={showToast}
            onResetToOnboarding={handleResetToOnboarding}
          />
        ) : (
          <div key={`${currentTab}-${dataVersion}`} className="flex-1 flex flex-col w-full">
            {currentTab === 'home' && (
              <HomeView
                onNavigateToBudgets={() => setCurrentTab('budgets')}
                onNavigateToBackup={() => setShowSettings(true)}
                onNavigateToJournal={() => setCurrentTab('journal')}
                onNavigateToActivity={() => setCurrentTab('activity')}
                onOpenQuickAdd={() => setIsQuickAddOpen(true)}
              />
            )}
            {currentTab === 'activity' && (
              <ActivityView
                onOpenQuickAdd={() => setIsQuickAddOpen(true)}
                onShowToast={showToast}
              />
            )}
            {currentTab === 'journal' && (
              <JournalView
                onOpenQuickAdd={() => setIsQuickAddOpen(true)}
                onShowToast={showToast}
              />
            )}
            {currentTab === 'insights' && <InsightsView onShowToast={showToast} />}
            {currentTab === 'budgets' && (
              <BudgetsView onOpenQuickAdd={() => setIsQuickAddOpen(true)} />
            )}
          </div>
        )}
      </main>

      {/* Quick Add Bottom Sheet Modal */}
      <QuickAddSheet
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        onSaved={handleTransactionSaved}
      />

      {/* 5-Second Toast with Undo */}
      {toast && (
        <Toast
          message={toast.message}
          onUndo={toast.onUndo}
          onDismiss={() => setToast(null)}
          durationMs={5000}
        />
      )}

      {/* Bottom Navigation Bar */}
      {!showSettings && (
        <BottomNav
          currentTab={currentTab}
          onSelectTab={(tab) => {
            setShowSettings(false);
            setCurrentTab(tab);
          }}
          onOpenQuickAdd={() => setIsQuickAddOpen(true)}
        />
      )}

      {/* PWA Update & iOS Install Guide */}
      <UpdateToast />
      <IOSInstallGuide isOpen={showIosGuide} onClose={() => setShowIosGuide(false)} />
    </div>
  );
}
