import React from 'react';

interface BadgeProps {
  variant?: 'deposit' | 'withdrawal' | 'neutral' | 'planned' | 'warning';
  children: React.ReactNode;
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({ variant = 'neutral', children, size = 'sm' }) => {
  const sizeClasses = size === 'sm' ? 'text-xs px-2.5 py-0.5' : 'text-sm px-3 py-1';

  const variantClasses = {
    deposit: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30',
    withdrawal: 'bg-rose-500/10 text-rose-400 border border-rose-500/30',
    neutral: 'bg-slate-800 text-slate-300 border border-slate-700',
    planned: 'bg-amber-500/10 text-amber-400 border border-amber-500/30 font-medium',
    warning: 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30',
  }[variant];

  return (
    <span className={`inline-flex items-center gap-1 rounded-full font-semibold uppercase tracking-wider ${sizeClasses} ${variantClasses}`}>
      {children}
    </span>
  );
};
