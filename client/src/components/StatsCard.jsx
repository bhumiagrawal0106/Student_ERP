import React from 'react';

export default function StatsCard({ title, value, subtitle, icon: Icon, color = 'forest', trend = null }) {
  const colorMap = {
    forest: {
      bg: 'bg-forest-50 dark:bg-forest-950/40',
      iconBg: 'bg-forest-600 text-white',
      border: 'border-forest-200 dark:border-forest-900',
    },
    terracotta: {
      bg: 'bg-terracotta-50 dark:bg-terracotta-950/40',
      iconBg: 'bg-terracotta-600 text-white',
      border: 'border-terracotta-200 dark:border-terracotta-900',
    },
    earth: {
      bg: 'bg-earth-50 dark:bg-earth-950/40',
      iconBg: 'bg-earth-600 text-white',
      border: 'border-earth-200 dark:border-earth-800',
    },
    sage: {
      bg: 'bg-sage-50 dark:bg-sage-950/40',
      iconBg: 'bg-sage-600 text-white',
      border: 'border-sage-200 dark:border-sage-800',
    },
    rose: {
      bg: 'bg-rose-50 dark:bg-rose-950/40',
      iconBg: 'bg-rose-600 text-white',
      border: 'border-rose-200 dark:border-rose-900',
    }
  };

  const scheme = colorMap[color] || colorMap.forest;

  return (
    <div className={`p-5 rounded-2xl border bg-white dark:bg-slate-900 shadow-sm transition-all hover:shadow-md ${scheme.border}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {title}
          </p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white">
              {value}
            </span>
            {trend && (
              <span className={`text-xs font-medium ${trend.positive ? 'text-forest-600' : 'text-rose-600'}`}>
                {trend.text}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              {subtitle}
            </p>
          )}
        </div>
        {Icon && (
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${scheme.iconBg}`}>
            <Icon className="w-6 h-6" />
          </div>
        )}
      </div>
    </div>
  );
}
