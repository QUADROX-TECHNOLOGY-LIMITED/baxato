'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Lock, LogIn } from 'lucide-react';
import StaffSidebar from '@/components/admin/StaffSidebar';
import StaffHeader from '@/components/admin/StaffHeader';
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
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // 1. Strict Auth Verification (Runs immediately on client mount)
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
      setStaffName(`${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Staff');
      setIsAuthorized(true);
    } else {
      // Immediate lock out — user is regular merchant or unauthenticated
      setIsAuthorized(false);
      clearSessionAndRedirect('unauthorized');
    }
  }, [isLoginPage]);

  // If on dedicated staff login page, bypass staff layout and auth gating
  if (isLoginPage) {
    return <>{children}</>;
  }

  // Silent loading state while evaluating auth or redirecting — ABSOLUTELY ZERO CONTENT FLASH
  if (isAuthorized !== true) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#070D18] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#126BEB] border-t-transparent animate-spin" />
      </div>
    );
  }

  // 3. Authorized View: Rendered ONLY when isAuthorized === true
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070D18] text-slate-900 dark:text-white">
      {/* Dedicated Staff Operations Navigation Sidebar */}
      <StaffSidebar
        userRole={userRole}
        staffName={staffName}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className="lg:pl-72 flex flex-col min-h-screen">
        {/* Dedicated Staff Header */}
        <StaffHeader
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          staffName={staffName}
          userRole={userRole}
          isRefreshing={isRefreshing}
          onRefresh={() => {
            setIsRefreshing(true);
            router.refresh();
            setTimeout(() => setIsRefreshing(false), 800);
          }}
        />

        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
}
