'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import StaffSidebar from '@/components/admin/StaffSidebar';
import StaffHeader from '@/components/admin/StaffHeader';
import BaxatoLoader from '@/components/BaxatoLoader';
import {
  getStoredAuthToken,
  isTokenExpired,
  getStoredUser,
  clearSessionAndRedirect,
} from '@/lib/auth-session';

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const isLoginPage = pathname === '/staff/login';

  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [userRole, setUserRole] = useState<string>('STAFF');
  const [staffName, setStaffName] = useState<string>('Staff User');
  const [staffEmail, setStaffEmail] = useState<string>('');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  useEffect(() => {
    if (isLoginPage) return;

    const token = getStoredAuthToken();
    if (!token || isTokenExpired(token)) {
      setIsAuthorized(false);
      clearSessionAndRedirect('expired');
      return;
    }

    const user = getStoredUser();

    if (user && (user.role === 'STAFF' || user.role === 'SUPER_ADMIN')) {
      setUserRole(user.role);
      setStaffName(`${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Staff User');
      setStaffEmail(user.email || '');
      setIsAuthorized(true);
    } else {
      setIsAuthorized(false);
      clearSessionAndRedirect('unauthorized');
    }
  }, [isLoginPage]);

  const handleGlobalRefresh = useCallback(() => {
    setIsRefreshing(true);
    router.refresh();
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('bx_staff_refresh'));
    }
    setTimeout(() => setIsRefreshing(false), 700);
  }, [router]);

  if (isLoginPage) {
    return <>{children}</>;
  }

  if (isAuthorized !== true) {
    return <BaxatoLoader variant="fullscreen" />;
  }

  return (
    <div className="min-h-[100dvh] bg-white dark:bg-[#070D18] text-slate-900 dark:text-white transition-colors duration-150">
      <StaffSidebar
        userRole={userRole}
        staffName={staffName}
        staffEmail={staffEmail}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className="lg:pl-72 flex flex-col min-h-[100dvh]">
        <StaffHeader
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          isSidebarOpen={isSidebarOpen}
          staffName={staffName}
          userRole={userRole}
          isRefreshing={isRefreshing}
          onRefresh={handleGlobalRefresh}
        />

        <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-[max(2.5rem,env(safe-area-inset-bottom,0px))] space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
}
