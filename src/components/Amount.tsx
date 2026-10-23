import React from 'react';
import { formatMinor } from '@/domain/money';

interface AmountProps {
  minor: number;
  currency?: string;
  locale?: string;
  type?: 'income' | 'expense' | 'transfer' | 'neutral';
  compact?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg' | 'hero';
}

export const Amount: React.FC<AmountProps> = ({
  minor,
  currency = 'GHS',
  locale = 'en-GH',
  type = 'neutral',
  compact = false,
  className = '',
  size = 'md',
}) => {
  const formatted = formatMinor(Math.abs(minor), currency, locale, { compact });

  let colorClass = 'text-primary';
  let prefix = '';

  if (type === 'income') {
    colorClass = 'text-on-tertiary-container font-semibold';
    prefix = '+';
  } else if (type === 'expense') {
    colorClass = 'text-primary font-semibold';
    prefix = '-';
  } else if (type === 'transfer') {
    colorClass = 'text-outline font-medium';
    prefix = '±';
  }

  let sizeClass = 'text-[15px]';
  if (size === 'sm') sizeClass = 'text-[13px]';
  if (size === 'lg') sizeClass = 'text-[18px]';
  if (size === 'hero') sizeClass = 'text-display-hero-mobile font-bold tracking-tight';

  return (
    <span className={`tabular-nums ${sizeClass} ${colorClass} ${className}`}>
      {prefix}
      {formatted}
    </span>
  );
};

