'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Lock, LogIn } from 'lucide-react';
import StaffSidebar from '@/components/admin/StaffSidebar';
import StaffHeader from '@/components/admin/StaffHeader';
import {
  getStoredAuthToken,
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
    if (!token) {
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
    }
  }, [isLoginPage]);

  // If on dedicated staff login page, bypass staff layout and auth gating
  if (isLoginPage) {
    return <>{children}</>;
  }

  // 1. Silent loading state while evaluating auth — ABSOLUTELY ZERO CONTENT FLASH
  if (isAuthorized === null) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#070D18] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#126BEB] border-t-transparent animate-spin" />
      </div>
    );
  }

  // 2. Unauthorized Screen for non-staff accounts
  if (isAuthorized === false) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#070D18] flex items-center justify-center p-6 text-slate-900 dark:text-white">
        <div className="max-w-md w-full bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center shadow-xl">
          <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold mb-2">Restricted Staff Area</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
            This console is strictly reserved for authorized Baxato Staff and Operations Personnel.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/staff/login"
              className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl font-medium bg-[#126BEB] text-white hover:bg-[#0E58C4] transition shadow-md shadow-blue-500/20 text-xs"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Staff Sign In</span>
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition text-xs"
            >
              Merchant Portal
            </Link>
          </div>
        </div>
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
