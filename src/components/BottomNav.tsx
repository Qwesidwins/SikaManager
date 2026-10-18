import React from 'react';

export type NavTab = 'home' | 'activity' | 'journal' | 'insights' | 'budgets' | 'accounts' | 'settings';

interface BottomNavProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  onOpenQuickAdd: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentTab,
  onSelectTab,
  onOpenQuickAdd,
}) => {
  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 pb-safe bg-surface/90 backdrop-blur-xl shadow-[0_-4px_24px_rgba(20,33,61,0.06)] border-t border-surface-container-high/60">
      <div className="relative flex items-center justify-around h-16 px-space-xs max-w-lg mx-auto">
        {/* Home */}
        <button
          type="button"
          onClick={() => onSelectTab('home')}
          className={`flex-1 flex flex-col items-center justify-center py-1 min-h-[44px] transition-colors ${
            currentTab === 'home'
              ? 'text-primary font-body-md-bold'
              : 'text-on-surface-variant hover:text-primary'
          }`}
        >
          <span
            className="material-symbols-outlined text-[24px]"
            style={currentTab === 'home' ? { fontVariationSettings: "'FILL' 1" } : undefined}
          >
            home
          </span>
          <span className="font-label-sm text-[11px] tracking-tight">Home</span>
        </button>

        {/* Activity */}
        <button
          type="button"
          onClick={() => onSelectTab('activity')}
          className={`flex-1 flex flex-col items-center justify-center py-1 min-h-[44px] transition-colors ${
            currentTab === 'activity'
              ? 'text-primary font-body-md-bold'
              : 'text-on-surface-variant hover:text-primary'
          }`}
        >
          <span
            className="material-symbols-outlined text-[24px]"
            style={currentTab === 'activity' ? { fontVariationSettings: "'FILL' 1" } : undefined}
          >
            swap_horiz
          </span>
          <span className="font-label-sm text-[11px] tracking-tight">Activity</span>
        </button>

        {/* Center Primary Add Button */}
        <div className="flex flex-col items-center justify-center relative -top-4 px-1">
          <button
            type="button"
            aria-label="Add Transaction"
            onClick={onOpenQuickAdd}
            className="w-14 h-14 rounded-full bg-secondary-container flex items-center justify-center text-primary shadow-[0_8px_24px_-2px_rgba(201,150,43,0.38),0_4px_8px_-1px_rgba(201,150,43,0.2)] active:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined text-[30px] font-bold">add</span>
          </button>
        </div>

        {/* Journal */}
        <button
          type="button"
          onClick={() => onSelectTab('journal')}
          className={`flex-1 flex flex-col items-center justify-center py-1 min-h-[44px] transition-colors ${
            currentTab === 'journal'
              ? 'text-primary font-body-md-bold'
              : 'text-on-surface-variant hover:text-primary'
          }`}
        >
          <span
            className="material-symbols-outlined text-[24px]"
            style={currentTab === 'journal' ? { fontVariationSettings: "'FILL' 1" } : undefined}
          >
            menu_book
          </span>
          <span className="font-label-sm text-[11px] tracking-tight">Journal</span>
        </button>

        {/* Insights */}
        <button
          type="button"
          onClick={() => onSelectTab('insights')}
          className={`flex-1 flex flex-col items-center justify-center py-1 min-h-[44px] transition-colors ${
            currentTab === 'insights'
              ? 'text-primary font-body-md-bold'
              : 'text-on-surface-variant hover:text-primary'
          }`}
        >
          <span
            className="material-symbols-outlined text-[24px]"
            style={currentTab === 'insights' ? { fontVariationSettings: "'FILL' 1" } : undefined}
          >
            pie_chart
          </span>
          <span className="font-label-sm text-[11px] tracking-tight">Insights</span>
        </button>
      </div>
    </nav>
  );
};
