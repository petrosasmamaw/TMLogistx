import React, { useEffect } from 'react';
import { X } from 'lucide-react';

/**
 * Desktop: centered dialog. Mobile: bottom sheet (via portal-modal-* CSS).
 */
export default function PortalModal({ open, onClose, title, children, footer, size = 'md' }) {
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const maxW = size === 'lg' ? 'max-w-2xl' : size === 'sm' ? 'max-w-sm' : 'max-w-md';

  return (
    <div
      className="portal-modal-backdrop fixed inset-0 z-[10000] flex items-center justify-center p-4 sm:p-4 bg-black/60 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className={`portal-modal-panel glass-panel w-full ${maxW} border border-slate-200 shadow-xl flex flex-col max-h-[min(92vh,900px)]`}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="flex items-start justify-between gap-3 p-4 sm:p-5 border-b border-slate-100 shrink-0">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-snug pr-2">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-100 text-slate-600 shrink-0"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 text-sm space-y-4">{children}</div>
        {footer && <div className="shrink-0 p-4 sm:p-5 border-t border-slate-100 flex flex-col sm:flex-row gap-2">{footer}</div>}
      </div>
    </div>
  );
}
