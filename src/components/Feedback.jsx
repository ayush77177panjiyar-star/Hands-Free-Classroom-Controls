import React from 'react';
import { CheckCircle2, AlertCircle, Info, Sparkles, X } from 'lucide-react';
import { cn } from '../utils/helpers';

export default function Feedback({
  toasts = [],
  onDismiss = null,
}) {
  if (!toasts || toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-sm pointer-events-none">
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isWarning = toast.type === 'warning';
        const isInfo = toast.type === 'info' || !toast.type;

        return (
          <div
            key={toast.id}
            className={cn(
              'pointer-events-auto p-3.5 rounded-xl border backdrop-blur-md shadow-glass flex items-start gap-3 transition-all duration-300 animate-in slide-in-from-bottom-3',
              isSuccess && 'bg-emerald-950/80 border-emerald-500/40 text-emerald-200',
              isWarning && 'bg-amber-950/80 border-amber-500/40 text-amber-200',
              isInfo && 'bg-slate-900/90 border-indigo-500/30 text-slate-200'
            )}
          >
            <div className="flex-shrink-0 mt-0.5">
              {isSuccess && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
              {isWarning && <AlertCircle className="w-4 h-4 text-amber-400" />}
              {isInfo && <Sparkles className="w-4 h-4 text-indigo-400" />}
            </div>

            <div className="flex-1 text-xs">
              {toast.title && <p className="font-semibold text-white">{toast.title}</p>}
              <p className={cn('text-slate-300', toast.title ? 'mt-0.5' : '')}>{toast.message}</p>
            </div>

            {onDismiss && (
              <button
                onClick={() => onDismiss(toast.id)}
                className="text-slate-400 hover:text-white p-0.5 rounded"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
