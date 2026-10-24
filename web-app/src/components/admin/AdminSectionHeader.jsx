import React from 'react';

export default function AdminSectionHeader({ icon: Icon, title, subtitle, actions }) {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
          {Icon && <Icon className="w-6 h-6 sm:w-7 sm:h-7 text-brand-600 shrink-0" />}
          <span className="min-w-0">{title}</span>
        </h1>
        {subtitle && <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-2xl leading-relaxed">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
