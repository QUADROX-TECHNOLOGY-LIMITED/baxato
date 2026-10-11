'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Lock, LogIn } from 'lucide-react';
import AdminSidebar from '@/components/admin/AdminSidebar';
import AdminHeader from '@/components/admin/AdminHeader';
import {
  getStoredAuthToken,
  getStoredUser,
  clearSessionAndRedirect,
} from '@/lib/auth-session';

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const isLoginPage = pathname === '/admin/login';

  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [adminName, setAdminName] = useState<string>('Platform Admin');
  const [adminEmail, setAdminEmail] = useState<string>('admin@baxato.com');
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

    // STRICT CHECK: ONLY SUPER_ADMIN is permitted into /admin
    if (user && user.role === 'SUPER_ADMIN') {
      setAdminName(`${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Platform Admin');
      setAdminEmail(user.email || 'admin@baxato.com');
      setIsAuthorized(true);
    } else {
      setIsAuthorized(false);
    }
  }, [isLoginPage]);

  // If on dedicated admin login page, bypass layout
  if (isLoginPage) {
    return <>{children}</>;
  }

  // 1. Silent loading state while evaluating auth
  if (isAuthorized === null) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#070D18] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#126BEB] border-t-transparent animate-spin" />
      </div>
    );
  }

  // 2. Unauthorized Screen for non-admin accounts
  if (isAuthorized === false) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#070D18] flex items-center justify-center p-6 text-slate-900 dark:text-white">
        <div className="max-w-md w-full bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center shadow-xl space-y-5">
          <div className="w-14 h-14 mx-auto rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <Lock className="w-7 h-7" />
          </div>

          <div className="space-y-1.5">
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Admin Access Required
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Please sign in with a platform administrator account to access this portal.
            </p>
          </div>

          <div className="pt-2 flex justify-center">
            <Link
              href="/admin/login"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-medium bg-[#126BEB] hover:bg-[#0E58C4] text-white transition text-xs shadow-md shadow-blue-500/20"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Admin Sign In</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 3. Authorized View: Rendered ONLY when isAuthorized === true
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070D18] text-slate-900 dark:text-white flex flex-col font-sans">
      {/* Admin Navigation Sidebar */}
      <AdminSidebar
        adminName={adminName}
        adminEmail={adminEmail}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className="lg:pl-64 flex flex-col min-h-screen">
        {/* Admin Header */}
        <AdminHeader
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          adminName={adminName}
          isRefreshing={isRefreshing}
          onRefresh={() => {
            setIsRefreshing(true);
            router.refresh();
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('bx_admin_refresh'));
            }
            setTimeout(() => setIsRefreshing(false), 800);
          }}
        />

        {/* Dynamic Page Content */}
        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
}
