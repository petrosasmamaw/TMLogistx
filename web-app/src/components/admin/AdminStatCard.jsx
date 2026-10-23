import React from 'react';
import { ChevronRight } from 'lucide-react';

export default function AdminStatCard({
  icon: Icon,
  label,
  value,
  active = false,
  onClick,
  hint = 'View list',
  tone = 'brand'
}) {
  const tones = {
    brand: 'bg-brand-500/15 border-brand-200 text-brand-600',
    purple: 'bg-purple-500/15 border-purple-200 text-purple-600',
    emerald: 'bg-emerald-500/15 border-emerald-200 text-emerald-600',
    blue: 'bg-blue-500/15 border-blue-200 text-blue-600',
    amber: 'bg-amber-500/15 border-amber-200 text-amber-700',
    rose: 'bg-rose-500/15 border-rose-200 text-rose-600'
  };

  const Wrapper = onClick ? 'button' : 'div';

  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`glass-panel p-5 rounded-2xl flex items-center gap-4 text-left w-full transition-all border ${
        active ? 'border-brand-400 ring-2 ring-brand-100 shadow-md' : 'border-transparent hover:border-slate-200 hover:shadow-sm'
      }`}
    >
      <div className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 ${tones[tone] || tones.brand}`}>
        {Icon && <Icon className="w-6 h-6" />}
      </div>
      <div className="min-w-0">
        <div className="text-xs font-medium text-slate-500">{label}</div>
        <div className="text-2xl font-bold text-slate-900 mt-0.5 truncate">{value}</div>
        {onClick && (
          <div className="text-[10px] text-brand-600 font-semibold mt-0.5 flex items-center gap-0.5">
            {hint} <ChevronRight className="w-3 h-3" />
          </div>
        )}
      </div>
    </Wrapper>
  );
}
