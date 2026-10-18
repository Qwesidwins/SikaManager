import React, { useEffect, useCallback } from 'react';
import { triggerHaptic } from '@/lib/haptics';

interface KeypadProps {
  onKeyPress: (char: string) => void;
  onBackspace: () => void;
  onClear?: () => void;
}

export const Keypad: React.FC<KeypadProps> = ({ onKeyPress, onBackspace, onClear }) => {
  const handlePress = useCallback(
    (char: string) => {
      triggerHaptic(10);
      onKeyPress(char);
    },
    [onKeyPress]
  );

  const handleBackspace = useCallback(() => {
    triggerHaptic(15);
    onBackspace();
  }, [onBackspace]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return; // Don't intercept when focusing text inputs
      }

      if (/^[0-9.]$/.test(e.key)) {
        e.preventDefault();
        handlePress(e.key);
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === 'Escape' && onClear) {
        e.preventDefault();
        onClear();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePress, handleBackspace, onClear]);

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0'];

  return (
    <div className="px-margin pt-space-xs pb-space-2xs select-none">
      <div className="grid grid-cols-3 gap-y-2 gap-x-5 max-w-[340px] mx-auto">
        {keys.map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => handlePress(k)}
            className="h-12 rounded-2xl bg-surface-container-low hover:bg-surface-container-high active:bg-surface-container-highest text-on-surface font-headline-md text-headline-md font-semibold flex items-center justify-center shadow-xs transition-colors active:scale-95"
          >
            {k}
          </button>
        ))}

        <button
          type="button"
          aria-label="Backspace"
          onClick={handleBackspace}
          className="h-12 rounded-2xl bg-surface-container-low hover:bg-surface-container-high active:bg-surface-container-highest text-on-surface flex items-center justify-center shadow-xs transition-colors active:scale-95"
        >
          <span className="material-symbols-outlined text-[24px]">backspace</span>
        </button>
      </div>
    </div>
  );
};
