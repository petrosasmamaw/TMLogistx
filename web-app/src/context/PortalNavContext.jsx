import React, { createContext, useContext, useEffect, useState } from 'react';
import { getDefaultPortalSection } from '../constants/portalNav.js';

const PortalNavContext = createContext(null);

export function PortalNavProvider({ role, sessionKey, children }) {
  const [section, setSection] = useState(() => getDefaultPortalSection(role));

  useEffect(() => {
    setSection(getDefaultPortalSection(role));
  }, [role, sessionKey]);

  return (
    <PortalNavContext.Provider value={{ section, setSection }}>
      {children}
    </PortalNavContext.Provider>
  );
}

export function usePortalNav() {
  const ctx = useContext(PortalNavContext);
  if (!ctx) {
    throw new Error('usePortalNav must be used within PortalNavProvider');
  }
  return ctx;
}
