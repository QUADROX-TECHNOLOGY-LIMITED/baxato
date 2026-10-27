'use client';

import React, { useState, useEffect } from 'react';
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
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#070D18] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#126BEB] border-t-transparent animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
