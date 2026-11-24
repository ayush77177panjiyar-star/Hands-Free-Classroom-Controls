import React from 'react';
import { cn } from '../utils/helpers';

export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendPositive = true,
  badgeText,
  gradientBorder = false,
  className,
}) {
  return (
    <div
      className={cn(
        'glass-card rounded-2xl p-5 relative overflow-hidden transition-all duration-300 hover:border-slate-700/80 hover:shadow-glow-indigo/10 group',
        gradientBorder && 'border-indigo-500/30',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400 tracking-wider uppercase">{title}</p>
          <div className="flex items-baseline gap-2 mt-2">
            <h3 className="text-2xl lg:text-3xl font-bold tracking-tight text-white">{value}</h3>
            {trend && (
              <span
                className={cn(
                  'text-xs font-semibold px-1.5 py-0.5 rounded-full inline-flex items-center',
                  trendPositive
                    ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'
                    : 'text-rose-400 bg-rose-500/10 border border-rose-500/20'
                )}
              >
                {trend}
              </span>
            )}
          </div>
          {subtitle && <p className="text-xs text-slate-400 mt-1">{subtitle}</p>}
        </div>

        {Icon && (
          <div className="w-12 h-12 rounded-xl bg-slate-800/80 border border-slate-700/50 flex items-center justify-center text-indigo-400 group-hover:scale-105 group-hover:text-indigo-300 transition-all duration-300 shadow-inner">
            <Icon className="w-6 h-6" />
          </div>
        )}
      </div>

      {badgeText && (
        <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
          <span>{badgeText}</span>
          <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
        </div>
      )}
    </div>
  );
}
