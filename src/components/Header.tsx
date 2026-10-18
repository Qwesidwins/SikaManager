import React from 'react';

interface HeaderProps {
  title: string;
  onOpenSettings: () => void;
  onLockApp?: () => void;
  isLockedEnabled?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  onOpenSettings,
  onLockApp,
  isLockedEnabled = false,
}) => {
  return (
    <header className="fixed top-0 inset-x-0 z-40 bg-surface/85 backdrop-blur-xl shadow-[0_1px_8px_rgba(20,33,61,0.04)] pt-safe">
      <div className="h-16 px-margin max-w-lg mx-auto flex items-center justify-between gap-space-sm">
        {/* Brand & Page Title */}
        <div className="flex items-center gap-space-xs min-w-0 flex-1">
          <div className="w-8 h-8 rounded-xl bg-secondary-container flex items-center justify-center text-primary font-bold shadow-xs shrink-0">
            <span className="material-symbols-outlined text-[20px]">account_balance_wallet</span>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="font-label-sm text-[11px] text-on-surface-variant leading-none truncate">
              SikaManger
            </span>
            <h1 className="font-headline-sm text-headline-sm text-on-surface truncate leading-tight">
              {title}
            </h1>
          </div>
        </div>

        {/* Right Tools */}
        <div className="flex items-center gap-space-2xs shrink-0">
          {/* Subtle Offline Ready Pill */}
          <div className="flex items-center gap-1 bg-surface-container-high px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-on-tertiary-container animate-pulse" />
            <span className="font-label-sm text-[11px] text-on-surface-variant">Ready</span>
          </div>

          {isLockedEnabled && onLockApp && (
            <button
              type="button"
              aria-label="Lock App"
              onClick={onLockApp}
              className="w-10 h-10 flex items-center justify-center rounded-full text-on-surface-variant hover:text-on-surface transition-colors"
            >
              <span className="material-symbols-outlined text-[20px]">lock</span>
            </button>
          )}

          <button
            type="button"
            aria-label="Settings"
            onClick={onOpenSettings}
            className="w-10 h-10 flex items-center justify-center rounded-full text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined text-[22px]">settings</span>
          </button>
        </div>
      </div>
    </header>
  );
};
