'use client';

import React, { useState, useEffect } from 'react';
import BaxatoLoader from '@/components/BaxatoLoader';
import {
  getStoredAuthToken,
  isTokenExpired,
  clearSessionAndRedirect,
} from '@/lib/auth-session';

export default function MerchantDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    const token = getStoredAuthToken();
    if (!token || isTokenExpired(token)) {
      setIsAuthorized(false);
      clearSessionAndRedirect('expired');
      return;
    }

    setIsAuthorized(true);
  }, []);

  // Silent loading state while validating session — ZERO EXPIRED CONTENT FLASH
  if (isAuthorized !== true) {
    return <BaxatoLoader variant="fullscreen" />;
  }

  return <>{children}</>;
}
