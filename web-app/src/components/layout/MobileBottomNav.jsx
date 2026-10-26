import React, { useMemo, useState } from 'react';
import { Menu, UserCircle } from 'lucide-react';
import AccountSheet from '../account/AccountSheet.jsx';
import { usePortalNav } from '../../context/PortalNavContext.jsx';
import { getPortalNavItems } from '../../constants/portalNav.js';
import MobileNavSheet from './MobileNavSheet.jsx';

const MAX_TABS = 3;

export default function MobileBottomNav({ role, user, onLogout }) {
  const { section, setSection } = usePortalNav();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const navItems = getPortalNavItems(role);

  const { tabs, hasMore } = useMemo(() => {
    if (navItems.length <= MAX_TABS + 1) {
      return { tabs: navItems, hasMore: false };
    }
    return { tabs: navItems.slice(0, MAX_TABS), hasMore: true };
  }, [navItems]);

  const moreActive = hasMore && !tabs.some((t) => t.id === section);

  return (
    <>
      <nav
        className="fixed bottom-0 inset-x-0 z-50 lg:hidden border-t border-slate-200 bg-white/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]"
        aria-label="Primary"
      >
        <div className="flex items-stretch justify-around max-w-lg mx-auto">
          {tabs.map(({ id, label, icon: Icon }) => {
            const active = section === id;
            const short = label.split(' ')[0];
            return (
              <button
                key={id}
                type="button"
                onClick={() => setSection(id)}
                className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 min-h-[56px] transition-colors ${
                  active ? 'text-brand-600' : 'text-slate-500'
                }`}
              >
                <span
                  className={`flex items-center justify-center w-9 h-9 rounded-2xl transition-colors ${
                    active ? 'bg-brand-50' : ''
                  }`}
                >
                  <Icon className="w-5 h-5" strokeWidth={active ? 2.25 : 2} />
                </span>
                <span className="text-[10px] font-semibold leading-tight px-1 truncate max-w-full">{short}</span>
              </button>
            );
          })}
          {hasMore && (
            <button
              type="button"
              onClick={() => setSheetOpen(true)}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 min-h-[56px] ${
                moreActive ? 'text-brand-600' : 'text-slate-500'
              }`}
            >
              <span
                className={`flex items-center justify-center w-9 h-9 rounded-2xl ${moreActive ? 'bg-brand-50' : ''}`}
              >
                <Menu className="w-5 h-5" />
              </span>
              <span className="text-[10px] font-semibold">More</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setAccountOpen(true)}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 min-h-[56px] ${
              accountOpen ? 'text-brand-600' : 'text-slate-500'
            }`}
          >
            <span className={`flex items-center justify-center w-9 h-9 rounded-2xl ${accountOpen ? 'bg-brand-50' : ''}`}>
              <UserCircle className="w-5 h-5" strokeWidth={accountOpen ? 2.25 : 2} />
            </span>
            <span className="text-[10px] font-semibold">Account</span>
          </button>
        </div>
      </nav>

      <AccountSheet open={accountOpen} onClose={() => setAccountOpen(false)} user={user} />

      <MobileNavSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        role={role}
        user={user}
        onLogout={onLogout}
      />
    </>
  );
}
