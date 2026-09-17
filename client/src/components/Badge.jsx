import React from 'react';

export default function Badge({ variant = 'default', children, className = '' }) {
  const styles = {
    // Natural / Earth / Forest variants
    success: 'bg-forest-100 text-forest-800 border-forest-200 dark:bg-forest-950/60 dark:text-forest-300 dark:border-forest-800',
    present: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
    danger: 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800',
    absent: 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800',
    warning: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
    pending: 'bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
    extra: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800',
    info: 'bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800',
    terracotta: 'bg-terracotta-100 text-terracotta-800 border-terracotta-200 dark:bg-terracotta-950/60 dark:text-terracotta-300 dark:border-terracotta-800',
    earth: 'bg-earth-100 text-earth-800 border-earth-200 dark:bg-earth-900/60 dark:text-earth-200 dark:border-earth-700',
    default: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  };

  const currentStyle = styles[variant.toLowerCase()] || styles.default;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${currentStyle} ${className}`}
    >
      {children}
    </span>
  );
}
