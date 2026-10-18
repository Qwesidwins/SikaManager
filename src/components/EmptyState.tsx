import React from 'react';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = 'spa',
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center p-space-xl rounded-2xl bg-surface-container-low my-space-md">
      <div className="w-14 h-14 rounded-full bg-surface-container-high flex items-center justify-center text-primary mb-space-sm">
        <span className="material-symbols-outlined text-[28px]">{icon}</span>
      </div>
      <h3 className="font-headline-sm text-headline-sm text-primary mb-1">{title}</h3>
      <p className="font-body-md text-label-md text-on-surface-variant max-w-xs">{description}</p>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="mt-space-md px-space-md py-2.5 rounded-full bg-secondary-container text-on-secondary-container font-label-md font-semibold active:scale-95 transition-transform"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};
