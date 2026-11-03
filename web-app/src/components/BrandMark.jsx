import React from 'react';

const sizeMap = {
  sm: { width: 36, height: 28, className: 'h-7 w-auto max-w-[36px]' },
  md: { width: 44, height: 34, className: 'h-8 w-auto max-w-[44px]' },
  lg: { width: 120, height: 92, className: 'h-[92px] w-auto max-w-[120px]' },
  xl: { width: 140, height: 108, className: 'h-[108px] w-auto max-w-[140px]' },
};

/** TM monogram raster — no border, no shadow; fits header/login frames. */
export default function BrandMark({ size = 'md', className = '', alt = 'TMLogistx' }) {
  const dim = sizeMap[size] || sizeMap.md;
  return (
    <img
      src="/brand-mark.png"
      alt={alt}
      className={`${dim.className} object-contain shrink-0 ${className}`}
      width={dim.width}
      height={dim.height}
    />
  );
}
