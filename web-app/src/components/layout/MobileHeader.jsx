import React, { useMemo } from 'react';
import { LogOut } from 'lucide-react';
import BrandMark from '../BrandMark.jsx';
import { usePortalNav } from '../../context/PortalNavContext.jsx';
import { getPortalNavItems } from '../../constants/portalNav.js';
import { roleLabel } from '../../constants/roles.js';

export default function MobileHeader({ role, user, onLogout }) {
  const { section } = usePortalNav();
  const navItems = getPortalNavItems(role);
  const current = useMemo(() => navItems.find((n) => n.id === section) || navItems[0], [navItems, section]);
  const accountRole = roleLabel(role || user?.role);

  return (
    <header className="sticky top-0 z-40 lg:hidden border-b border-slate-200/80 bg-white/95 backdrop-blur-md pt-[env(safe-area-inset-top)]">
      <div className="flex items-center gap-3 px-4 py-3">
        <BrandMark size="sm" />
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-brand-600 uppercase tracking-wide truncate">{accountRole}</p>
          <h1 className="text-base font-bold text-slate-900 truncate leading-tight">{current?.label || 'TMLogistx'}</h1>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="shrink-0 p-2.5 rounded-xl bg-slate-100 text-slate-600 active:bg-slate-200"
          aria-label="Sign out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
