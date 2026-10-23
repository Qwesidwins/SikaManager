import React from 'react';
import { Wallet, Plus, TrendingUp } from 'lucide-react';

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
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-t border-slate-200/80 dark:border-slate-800 pb-safe">
      <div className="relative flex items-center justify-around h-16 max-w-md mx-auto px-4">
        {/* Tab 1: Home */}
        <button
          type="button"
          onClick={() => onSelectTab('home')}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors ${
            currentTab === 'home'
              ? 'text-amber-600 dark:text-amber-400 font-bold'
              : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          <Wallet className="w-5 h-5 mb-0.5" />
          <span className="text-[11px] font-medium tracking-tight">Transactions</span>
        </button>

        {/* Center: Add Button */}
        <div className="flex flex-col items-center justify-center relative -top-4 px-2">
          <button
            type="button"
            onClick={onOpenAdd}
            aria-label="Add transaction"
            className="w-13 h-13 rounded-2xl bg-amber-600 hover:bg-amber-700 active:scale-95 text-white flex items-center justify-center shadow-lg shadow-amber-600/30 transition-all p-3.5"
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </button>
        </div>

        {/* Tab 2: Insights */}
        <button
          type="button"
          onClick={() => onSelectTab('insights')}
          className={`flex-1 flex flex-col items-center justify-center py-1 transition-colors ${
            currentTab === 'insights'
              ? 'text-amber-600 dark:text-amber-400 font-bold'
              : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
          }`}
        >
          <TrendingUp className="w-5 h-5 mb-0.5" />
          <span className="text-[11px] font-medium tracking-tight">Insights</span>
        </button>
      </div>
    </nav>
  );
};
