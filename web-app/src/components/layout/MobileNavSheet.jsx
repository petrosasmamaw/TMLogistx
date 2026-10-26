import React, { useEffect, useState } from 'react';
import { X, KeyRound } from 'lucide-react';
import AccountSheet from '../account/AccountSheet.jsx';
import { usePortalNav } from '../../context/PortalNavContext.jsx';
import { getPortalNavItems } from '../../constants/portalNav.js';
import { roleLabel } from '../../constants/roles.js';

export default function MobileNavSheet({ open, onClose, role, user, onLogout }) {
  const [accountOpen, setAccountOpen] = useState(false);
  const { section, setSection } = usePortalNav();
  const navItems = getPortalNavItems(role);
  const accountRole = roleLabel(role || user?.role);

  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] lg:hidden" role="dialog" aria-modal="true">
      <button type="button" className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} aria-label="Close menu" />
      <div className="absolute inset-x-0 bottom-0 max-h-[88vh] rounded-t-3xl bg-white border-t border-slate-200 shadow-2xl flex flex-col mobile-sheet-enter">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100">
          <div>
            <p className="text-sm font-bold text-slate-900">All sections</p>
            <p className="text-xs text-slate-500">{accountRole}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-100 text-slate-600"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {navItems.map(({ id, label, icon: Icon }) => {
            const active = section === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setSection(id);
                  onClose();
                }}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-semibold transition-colors ${
                  active
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-500/25'
                    : 'bg-slate-50 text-slate-700 active:bg-slate-100'
                }`}
              >
                <Icon className={`w-5 h-5 shrink-0 ${active ? 'text-white' : 'text-brand-600'}`} />
                {label}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100 space-y-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <div className="px-2">
            <p className="text-sm font-semibold text-slate-900 truncate">{user?.full_name || 'User'}</p>
            <p className="text-xs text-slate-500 truncate">{user?.email}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              onClose();
              setAccountOpen(true);
            }}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-brand-200 text-sm font-semibold text-brand-700 bg-brand-50"
          >
            <KeyRound className="w-4 h-4" />
            Account & password
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onLogout();
            }}
            className="w-full py-3 rounded-2xl border border-slate-200 text-sm font-semibold text-slate-700 bg-white"
          >
            Sign out
          </button>
        </div>
      </div>
      <AccountSheet open={accountOpen} onClose={() => setAccountOpen(false)} user={user} />
    </div>
  );
}
