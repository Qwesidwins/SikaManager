import React, { useEffect, useState } from 'react';

interface ToastProps {
  message: string;
  onUndo?: () => void;
  onDismiss: () => void;
  durationMs?: number;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  onUndo,
  onDismiss,
  durationMs = 5000,
}) => {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remainingPercent = Math.max(0, 100 - (elapsed / durationMs) * 100);
      setProgress(remainingPercent);

      if (elapsed >= durationMs) {
        clearInterval(interval);
        onDismiss();
      }
    }, 50);

    return () => clearInterval(interval);
  }, [durationMs, onDismiss]);

  return (
    <div className="fixed bottom-24 inset-x-0 z-50 px-margin max-w-lg mx-auto pointer-events-auto">
      <div className="w-full bg-primary text-on-primary py-2.5 px-4 rounded-full shadow-lg flex flex-col relative overflow-hidden animate-in fade-in slide-in-from-bottom-2">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2 min-w-0 pr-2">
            <span className="material-symbols-outlined text-secondary-fixed text-[18px] shrink-0">
              verified
            </span>
            <span className="font-label-md text-label-md font-medium truncate">{message}</span>
          </div>

          {onUndo && (
            <button
              type="button"
              onClick={onUndo}
              className="font-label-md text-label-md font-bold text-secondary-fixed uppercase tracking-wider hover:underline active:opacity-80 shrink-0"
            >
              Undo
            </button>
          )}
        </div>

        {/* Linear progress countdown line */}
        <div
          className="absolute bottom-0 left-0 h-[2px] bg-secondary-fixed rounded-full transition-all duration-75"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};
