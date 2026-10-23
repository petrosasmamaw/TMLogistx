import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingButton({
  loading = false,
  loadingLabel,
  children,
  className = '',
  disabled,
  type = 'button',
  ...rest
}) {
  const isDisabled = disabled || loading;
  return (
    <button
      type={type}
      disabled={isDisabled}
      className={`inline-flex items-center justify-center gap-2 disabled:opacity-60 disabled:pointer-events-none transition-opacity ${className}`}
      {...rest}
    >
      {loading && <Loader2 className="w-4 h-4 animate-spin shrink-0" aria-hidden="true" />}
      <span>{loading && loadingLabel ? loadingLabel : children}</span>
    </button>
  );
}
