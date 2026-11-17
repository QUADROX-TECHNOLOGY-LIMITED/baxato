'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import StaffSidebar, { STAFF_NAV_ITEMS } from '@/components/admin/StaffSidebar';
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

        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 sm:pt-6 pb-24 lg:pb-10 space-y-6">
          {children}
        </main>
      </div>

      {/* Thumb-friendly Mobile Quick Dock */}
      <nav
        aria-label="Mobile quick navigation"
        className="staff-mobile-dock lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 dark:bg-[#070D18]/95 backdrop-blur border-t border-slate-200/80 dark:border-slate-800/80 px-1 pt-1 pb-[max(0.375rem,env(safe-area-inset-bottom,0px))]"
      >
        <ul className="grid grid-cols-5 gap-0.5 max-w-md mx-auto">
          {STAFF_NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive ? 'page' : undefined}
                  className={`min-h-11 flex flex-col items-center justify-center gap-0.5 rounded-lg px-1 py-1 text-[10px] font-medium transition-colors ${
                    isActive
                      ? 'text-[#126BEB] dark:text-[#38BDF8] font-semibold'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className="w-[18px] h-[18px] shrink-0" aria-hidden="true" />
                  <span className="truncate max-w-full">{item.shortLabel}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
