import React, { useEffect } from 'react';

interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export const Sheet: React.FC<SheetProps> = ({ isOpen, onClose, children }) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-primary/40 backdrop-blur-[2px] transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet Container */}
      <div className="relative w-full max-w-lg mx-auto bg-surface-container-lowest rounded-t-[24px] shadow-[0_-8px_32px_rgba(20,33,61,0.12)] flex flex-col z-10 max-h-[92vh] overflow-y-auto no-scrollbar pb-safe transition-transform duration-200 animate-in slide-in-from-bottom">
        {/* Drag Handle & Header */}
        <div className="pt-space-xs pb-space-2xs px-margin flex items-center justify-between sticky top-0 bg-surface-container-lowest z-20">
          <div className="w-10 h-10" />
          <div className="w-10 h-1.5 bg-outline-variant/60 rounded-full mx-auto self-center" />
          <button
            type="button"
            aria-label="Close sheet"
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full text-on-surface-variant hover:bg-surface-container-high transition-colors active:scale-95"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {children}
      </div>
    </div>
  );
};

