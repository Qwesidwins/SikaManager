import React from 'react';
import { Wallet, Plus, TrendingUp } from 'lucide-react';
import { triggerHaptic } from '@/lib/haptics';

export type MvpTab = 'home' | 'insights';

interface BottomNavProps {
  currentTab: MvpTab;
  onSelectTab: (tab: MvpTab) => void;
  onOpenAdd: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onSelectTab,
  onOpenAdd,
}) => {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-surface-container-lowest/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-outline-variant/30 dark:border-slate-800 pb-safe">
      <div className="relative flex items-center justify-around h-16 max-w-md mx-auto px-4">
        {/* Tab 1: Transactions / Ledger */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic();
            onSelectTab('home');
          }}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors ${
            currentTab === 'home'
              ? 'text-primary dark:text-[#ffc657] font-bold'
              : 'text-on-surface-variant dark:text-slate-400 hover:text-on-surface dark:hover:text-slate-200'
          }`}
        >
          <Wallet className={`w-5 h-5 mb-0.5 ${currentTab === 'home' ? 'text-secondary dark:text-[#ffc657]' : ''}`} />
          <span className="text-[11px] font-medium tracking-tight">Transactions</span>
        </button>

        {/* Center: Tactile Elevated Add Button */}
        <div className="flex flex-col items-center justify-center relative -top-3.5 px-2">
          <button
            type="button"
            onClick={() => {
              triggerHaptic();
              onOpenAdd();
            }}
            aria-label="Add transaction"
            className="w-12 h-12 rounded-2xl bg-primary dark:bg-[#ffc657] hover:bg-primary-container dark:hover:bg-[#f5bd50] active:scale-95 text-secondary-container dark:text-slate-950 flex items-center justify-center shadow-md shadow-primary/20 transition-all p-3 border border-secondary/30 dark:border-amber-400/50"
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </button>
        </div>

        {/* Tab 2: Insights */}
        <button
          type="button"
          onClick={() => {
            triggerHaptic();
            onSelectTab('insights');
          }}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors ${
            currentTab === 'insights'
              ? 'text-primary dark:text-[#ffc657] font-bold'
              : 'text-on-surface-variant dark:text-slate-400 hover:text-on-surface dark:hover:text-slate-200'
          }`}
        >
          <TrendingUp className={`w-5 h-5 mb-0.5 ${currentTab === 'insights' ? 'text-secondary dark:text-[#ffc657]' : ''}`} />
          <span className="text-[11px] font-medium tracking-tight">Insights</span>
        </button>
      </div>
    </nav>
  );
};

