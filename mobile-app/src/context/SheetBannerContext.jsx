import React from 'react';

export const SheetBannerContext = React.createContext(null);

export function useSheetBanner() {
  return React.useContext(SheetBannerContext);
}
