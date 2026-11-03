import React from 'react';

export default function AdminStatCard({
  icon: _Icon,
  label,
  value,
  active = false,
  onClick,
  hint: _hint = 'View list',
  tone = 'brand'
}) {
  const Wrapper = onClick ? 'button' : 'div';

  let valueClass = 'text-ink';
  if (tone === 'rose' && Number(value) > 0) valueClass = 'text-danger';
  else if (tone === 'amber') valueClass = 'text-live-text';

  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`portal-stat-cell flex-1 min-w-[120px] text-left px-[18px] py-4 relative border-l border-line first:border-l-0 ${
        onClick ? 'cursor-pointer hover:bg-[#fafcfb] transition-colors duration-150' : ''
      } ${active ? 'portal-stat-cell-active' : ''}`}
    >
      <div className={`text-[26px] font-extrabold tracking-[-0.8px] leading-none ${valueClass}`}>{value}</div>
      <div
        className={`text-[13px] font-semibold mt-1.5 ${active ? 'text-brand-600' : 'text-mute'}`}
      >
        {label}
      </div>
    </Wrapper>
  );
}
