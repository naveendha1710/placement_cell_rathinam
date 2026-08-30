import React from 'react';
import { cn } from '../../lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'approved' | 'pending' | 'rejected' | 'placed' | 'unplaced' | 'yet_to_be_placed' | 'opted_out';
}

export const Badge: React.FC<BadgeProps> = ({ className, variant = 'default', children, ...props }) => {
  const base = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-950 focus:ring-offset-2';

  const variants = {
    default: 'bg-zinc-900 text-zinc-50 hover:bg-zinc-800',
    secondary: 'bg-zinc-100 text-zinc-900 hover:bg-zinc-200 border border-zinc-200',
    outline: 'text-zinc-950 border border-zinc-300',
    
    // Status Badges (allowed meaningful color accents)
    approved: 'bg-emerald-100 text-emerald-800 border border-emerald-300',
    pending: 'bg-amber-100 text-amber-800 border border-amber-300',
    rejected: 'bg-rose-100 text-rose-800 border border-rose-300',
    placed: 'bg-emerald-100 text-emerald-800 border border-emerald-300',
    unplaced: 'bg-zinc-100 text-zinc-700 border border-zinc-300',
    yet_to_be_placed: 'bg-amber-50 text-amber-800 border border-amber-300',
    opted_out: 'bg-slate-100 text-slate-600 border border-slate-300',
  };

  return (
    <div className={cn(base, variants[variant], className)} {...props}>
      {children}
    </div>
  );
};
