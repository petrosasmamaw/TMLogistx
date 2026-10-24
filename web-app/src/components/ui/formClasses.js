/** Shared mobile-first form control classes (48px touch targets on phone). */
export const fieldLabel = 'block text-xs font-semibold text-slate-600 mb-1.5';
export const fieldInput =
  'field-control w-full rounded-xl border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 disabled:bg-slate-50 disabled:text-slate-500';
export const fieldSelect = fieldInput;
export const fieldTextarea = `${fieldInput} min-h-[100px] py-3 resize-y`;
export const btnPrimary =
  'inline-flex items-center justify-center gap-2 min-h-[48px] px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold transition-colors disabled:opacity-50';
export const btnSecondary =
  'inline-flex items-center justify-center gap-2 min-h-[48px] px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50';
