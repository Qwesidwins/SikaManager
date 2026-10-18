import React from 'react';
import { Share, PlusSquare, X } from 'lucide-react';

interface IOSInstallGuideProps {
  isOpen: boolean;
  onClose: () => void;
}

export const IOSInstallGuide: React.FC<IOSInstallGuideProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-primary/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <div className="bg-surface-container-lowest rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-surface-variant/40 space-y-5 animate-slideUp">
        <div className="flex items-center justify-between">
          <h3 className="font-headline-sm text-lg font-bold text-primary">
            Install on your iPhone
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="font-body-md text-xs text-on-surface-variant leading-relaxed">
          Install SikaManger to your Home Screen for instant offline access and native app
          experience:
        </p>

        <div className="space-y-3.5">
          <div className="flex items-start gap-3 bg-surface-container-low rounded-2xl p-3.5">
            <div className="w-8 h-8 rounded-xl bg-surface-container-high flex items-center justify-center text-primary shrink-0">
              <Share className="w-4 h-4 text-secondary" />
            </div>
            <div>
              <p className="font-body-md-bold text-xs text-primary">1. Tap the Share button</p>
              <p className="font-label-sm text-[11px] text-on-surface-variant">
                At the bottom of your Safari screen
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 bg-surface-container-low rounded-2xl p-3.5">
            <div className="w-8 h-8 rounded-xl bg-surface-container-high flex items-center justify-center text-primary shrink-0">
              <PlusSquare className="w-4 h-4 text-on-tertiary-container" />
            </div>
            <div>
              <p className="font-body-md-bold text-xs text-primary">
                2. Tap 'Add to Home Screen'
              </p>
              <p className="font-label-sm text-[11px] text-on-surface-variant">
                Scroll down in the share sheet and tap Add
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-primary text-on-primary font-label-md text-xs font-semibold hover:bg-primary/95 transition-colors shadow-sm"
        >
          Got it
        </button>
      </div>
    </div>
  );
};
