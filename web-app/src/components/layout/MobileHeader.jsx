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
    <header className="sticky top-0 z-40 lg:hidden border-b border-line bg-white pt-[env(safe-area-inset-top)]">
      <div className="flex items-center gap-3 px-4 py-2.5">
        <BrandMark size="sm" className="!w-8 !max-w-[36px]" />
        <div className="flex-1 min-w-0">
          <h1 className="text-[17px] font-extrabold text-ink truncate leading-tight">{current?.label || 'TMLogistx'}</h1>
          <p className="text-xs font-bold text-mute truncate">{accountRole}</p>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="shrink-0 w-11 h-11 flex items-center justify-center rounded-xl text-mute hover:bg-page"
          aria-label="Sign out"
        >
          <LogOut className="w-5 h-5" strokeWidth={1.8} />
        </button>
      </div>
    </header>
  );
}
