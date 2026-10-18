import React from 'react';

interface RingProps {
  percent: number; // 0 to 100
  size?: number | undefined; // Size in px
  strokeWidth?: number | undefined;
  colorClass?: string | undefined;
  bgClass?: string | undefined;
  label?: string | React.ReactNode | undefined;
  icon?: string | undefined;
}

export const Ring: React.FC<RingProps> = ({
  percent,
  size = 40,
  strokeWidth = 3.5,
  colorClass = 'text-primary-container',
  bgClass = 'text-surface-variant',
  label,
  icon,
}) => {
  const clampedPercent = Math.min(100, Math.max(0, Math.round(percent)));

  return (
    <div
      className="relative flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      <svg className="-rotate-90" width={size} height={size} viewBox="0 0 36 36">
        <path
          className={bgClass}
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
        />
        <path
          className={colorClass}
          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
          fill="none"
          stroke="currentColor"
          strokeDasharray={`${clampedPercent}, 100`}
          strokeLinecap="round"
          strokeWidth={strokeWidth}
        />
      </svg>
      {icon ? (
        <span className={`material-symbols-outlined text-[14px] ${colorClass} font-bold absolute`}>
          {icon}
        </span>
      ) : label !== undefined ? (
        <span className="absolute font-label-sm text-[10px] font-bold text-primary">
          {label}
        </span>
      ) : (
        <span className="absolute font-label-sm text-[10px] font-bold text-primary">
          {clampedPercent}%
        </span>
      )}
    </div>
  );
};
