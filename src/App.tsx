import React, { useState, useEffect, useCallback } from 'react';
import { seedInitialDataIfNeeded } from '@/db/seed';
import { settingsRepo } from '@/db/repositories/settingsRepo';
import { useTheme } from '@/lib/theme';
import { LaunchScreen } from '@/features/simpleMvp/LaunchScreen';
import { LockScreen } from '@/features/lock/LockScreen';
import { HomeView } from '@/features/simpleMvp/HomeView';
import { InsightsView } from '@/features/simpleMvp/InsightsView';
import { AddTransactionModal } from '@/features/simpleMvp/AddTransactionModal';
import { LiquidOnboardingModal } from '@/features/simpleMvp/LiquidOnboardingModal';
import { BottomNav, type MvpTab } from '@/features/simpleMvp/BottomNav';

interface AppProps {
  skipLaunchScreen?: boolean;
}

export default function App({
  skipLaunchScreen = process.env.NODE_ENV === 'test',
}: AppProps = {}): React.ReactElement {
  useTheme(); // Initialize and bind theme
  const [showLaunchScreen, setShowLaunchScreen] = useState(!skipLaunchScreen);
  const [isLocked, setIsLocked] = useState(false);
  const [passcodeHash, setPasscodeHash] = useState<string | null>(null);
  const [biometricEnabled, setBiometricEnabled] = useState(false);

  const [currentTab, setCurrentTab] = useState<MvpTab>('home');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [dataVersion, setDataVersion] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      try {
        await seedInitialDataIfNeeded();

        // Check lock & passcode protection
        const lockEnabled = await settingsRepo.get('lockEnabled');
        const hash = await settingsRepo.get('passcodeHash');
        const bio = await settingsRepo.get('biometricEnabled');
        if (lockEnabled && hash) {
          setIsLocked(true);
          setPasscodeHash(hash);
          setBiometricEnabled(Boolean(bio));
        }

        const done = await settingsRepo.get('onboardingDone');
        if (!done) {
          setIsOnboardingOpen(true);
        }
      } catch {
        // Fallback
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  }, []);

  const handleTransactionAdded = useCallback(
    (msg: string) => {
      setDataVersion((v) => v + 1);
      showToast(msg);
    },
    [showToast]
  );

  const handleOnboardingCompleted = useCallback(
    (msg: string) => {
      setIsOnboardingOpen(false);
      setDataVersion((v) => v + 1);
      showToast(msg);
    },
    [showToast]
  );

  // 1. Launch / Splash animation screen
  if (showLaunchScreen) {
    return <LaunchScreen onFinish={() => setShowLaunchScreen(false)} />;
  }

  // 2. Loading state during initialization
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  // 3. Security lock screen
  if (isLocked && passcodeHash) {
    return (
      <LockScreen
        passcodeHash={passcodeHash}
        biometricEnabled={biometricEnabled}
        onUnlock={() => setIsLocked(false)}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-surface text-on-surface font-body-md antialiased selection:bg-secondary-container selection:text-on-secondary-container">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 inset-x-4 z-50 max-w-sm mx-auto bg-primary text-white py-2.5 px-4 rounded-2xl shadow-xl flex items-center justify-center text-xs font-semibold animate-in slide-in-from-top-4 duration-200 border border-outline-variant/30">
          {toastMessage}
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col">
        {currentTab === 'home' && (
          <HomeView
            key={`home-${dataVersion}`}
            onOpenAdd={() => setIsAddModalOpen(true)}
            onOpenOnboarding={() => setIsOnboardingOpen(true)}
            onShowToast={showToast}
          />
        )}
        {currentTab === 'insights' && (
          <InsightsView key={`insights-${dataVersion}`} />
        )}
      </main>

      {/* Liquid Assets Onboarding & Calibration Modal */}
      <LiquidOnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        onCompleted={handleOnboardingCompleted}
      />

      {/* Add Transaction Modal */}
      <AddTransactionModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleTransactionAdded}
      />

      {/* 3-Tab Bottom Navigation */}
      <BottomNav
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenAdd={() => setIsAddModalOpen(true)}
      />
    </div>
  );
}
