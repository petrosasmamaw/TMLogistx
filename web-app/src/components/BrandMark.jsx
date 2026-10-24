import React from 'react';

const sizes = {
  sm: 'w-9 h-9 rounded-lg',
  md: 'w-10 h-10 rounded-lg',
  lg: 'w-14 h-14 rounded-xl',
  xl: 'w-16 h-16 rounded-xl',
};

/**
 * Raster brand mark (matches mobile app icon / Expo assets).
 */
export default function BrandMark({ size = 'md', className = '', alt = 'TMLogistx' }) {
  const dim = sizes[size] || sizes.md;
  return (
    <img
      src="/brand-mark.png"
      alt={alt}
      className={`${dim} object-contain shrink-0 shadow-lg shadow-brand-500/20 ${className}`}
      width={size === 'lg' ? 56 : size === 'xl' ? 64 : 40}
      height={size === 'lg' ? 56 : size === 'xl' ? 64 : 40}
    />
  );
}
