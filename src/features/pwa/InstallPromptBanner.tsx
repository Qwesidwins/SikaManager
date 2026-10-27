import React, { useState, useEffect } from 'react';
import { Download, X, Share, Smartphone, PlusSquare } from 'lucide-react';
import { triggerHaptic } from '@/lib/haptics';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const DISMISS_KEY = 'sikamanger-install-dismissed-at';
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export const InstallPromptBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);

  useEffect(() => {
    // 1. Check if already running in standalone mode (already installed as PWA)
    const isStandalone =
      (typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(display-mode: standalone)').matches) ||
      (typeof window !== 'undefined' &&
        (window.navigator as unknown as { standalone?: boolean })?.standalone === true);

    if (isStandalone) {
      return;
    }

    // 2. Check if user dismissed recently
    try {
      const dismissedAt = localStorage.getItem(DISMISS_KEY);
      if (dismissedAt) {
        const timePassed = Date.now() - parseInt(dismissedAt, 10);
        if (timePassed < SEVEN_DAYS_MS) {
          return;
        }
      }
    } catch {
      // Storage error fallback
    }

    // 3. Detect iOS Safari
    const userAgent = (window.navigator?.userAgent || '').toLowerCase();
    const isAppleDevice = /iphone|ipad|ipod/.test(userAgent);
    const isSafari =
      userAgent.includes('safari') &&
      !userAgent.includes('crios') &&
      !userAgent.includes('fxios') &&
      !userAgent.includes('chrome');

    if (isAppleDevice && isSafari) {
      setIsIOS(true);
      setShowPrompt(true);
      return;
    }

    // 4. Listen for Chromium `beforeinstallprompt`
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  function handleDismiss() {
    triggerHaptic();
    setShowPrompt(false);
    setShowIOSModal(false);
    try {
      localStorage.setItem(DISMISS_KEY, Date.now().toString());
    } catch {
      // Storage error fallback
    }
  }

  async function handleInstallClick() {
    triggerHaptic();
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }

    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setShowPrompt(false);
      }
      setDeferredPrompt(null);
    } catch {
      // Fallback
    }
  }

  if (!showPrompt) return null;

  return (
    <>
      {/* Floating Bottom Install Banner */}
      <div className="fixed bottom-20 inset-x-4 z-40 max-w-md mx-auto animate-in slide-in-from-bottom-4 duration-300">
        <div className="p-3.5 rounded-2xl bg-primary text-white shadow-xl border border-secondary/30 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="w-10 h-10 rounded-xl bg-surface-container-low/15 text-[#ffc657] flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-bold text-white truncate">Install SikaManager</h4>
              <p className="text-[11px] text-slate-300 truncate">
                Add to your phone for instant, offline access
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleInstallClick}
              className="px-3 py-1.5 rounded-xl bg-[#ffc657] text-primary text-xs font-bold hover:bg-[#ffc657]/90 active:scale-95 transition-all shadow-xs flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Install</span>
            </button>

            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Dismiss install banner"
              className="w-8 h-8 rounded-lg text-slate-400 hover:text-white flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* iOS Safari Step-by-Step Instructions Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="bg-surface-container-lowest dark:bg-slate-900 max-w-sm w-full rounded-3xl p-6 shadow-2xl border border-outline-variant/30 dark:border-slate-800 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-outline-variant/20 dark:border-slate-800">
              <h3 className="text-base font-bold text-primary dark:text-white">Install on iPhone</h3>
              <button
                type="button"
                onClick={() => setShowIOSModal(false)}
                className="w-8 h-8 rounded-full bg-surface-container-low dark:bg-slate-800 text-on-surface-variant dark:text-slate-300 hover:text-on-surface dark:hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-on-surface-variant dark:text-slate-400">
              Follow these two quick steps in Safari to add SikaManager to your home screen:
            </p>

            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-surface-container-low dark:bg-slate-800">
                <div className="w-8 h-8 rounded-xl bg-white dark:bg-slate-700 text-secondary dark:text-[#ffc657] flex items-center justify-center shrink-0 shadow-xs">
                  <Share className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-primary dark:text-white">1. Tap the Share button</p>
                  <p className="text-[11px] text-on-surface-variant dark:text-slate-400">
                    Look for the Share icon at the bottom of your Safari screen
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-surface-container-low dark:bg-slate-800">
                <div className="w-8 h-8 rounded-xl bg-white dark:bg-slate-700 text-secondary dark:text-[#ffc657] flex items-center justify-center shrink-0 shadow-xs">
                  <PlusSquare className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-primary dark:text-white">2. Select &apos;Add to Home Screen&apos;</p>
                  <p className="text-[11px] text-on-surface-variant dark:text-slate-400">
                    Scroll down and tap &quot;Add to Home Screen&quot; to install SikaManager as an app
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDismiss}
              className="w-full py-2.5 rounded-xl bg-primary dark:bg-[#ffc657] text-white dark:text-slate-950 text-xs font-bold active:scale-95 transition-all"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
