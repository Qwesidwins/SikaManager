import React, { useState, useEffect } from 'react';
import { RefreshCw, X } from 'lucide-react';

export const UpdateToast: React.FC = () => {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    navigator.serviceWorker.ready.then((reg) => {
      setRegistration(reg);

      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setNeedRefresh(true);
          }
        });
      });
    });

    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  }, []);

  function handleUpdate() {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
  }

  if (!needRefresh) return null;

  return (
    <div className="fixed bottom-20 inset-x-4 z-50 max-w-sm mx-auto bg-primary text-on-primary rounded-2xl p-4 shadow-xl border border-secondary/30 flex items-center justify-between gap-3 animate-slideUp">
      <div className="flex items-center gap-2.5 min-w-0">
        <RefreshCw className="w-5 h-5 text-secondary animate-spin" />
        <div>
          <p className="font-body-md-bold text-xs">Update Available</p>
          <p className="font-label-sm text-[11px] text-surface-dim">
            A newer offline version of SikaManger is ready.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={handleUpdate}
          className="py-1.5 px-3 rounded-lg bg-secondary text-on-secondary font-label-md text-xs font-semibold hover:bg-secondary/90 transition-colors"
        >
          Update
        </button>
        <button
          type="button"
          onClick={() => setNeedRefresh(false)}
          aria-label="Dismiss update"
          className="w-7 h-7 flex items-center justify-center text-surface-dim hover:text-on-primary"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

