import React from 'react';

export default function AdminSectionHeader({ icon: _Icon, title, subtitle, actions }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-[22px]">
      <div className="min-w-0">
        <h1 className="text-[26px] font-extrabold text-ink tracking-[-0.6px] leading-tight">{title}</h1>
        {subtitle && (
          <p className="text-sm text-mute mt-1 max-w-[640px] leading-relaxed font-medium">{subtitle}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
