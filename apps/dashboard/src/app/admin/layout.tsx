'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Lock, LogIn, Crown, ArrowRight, ShieldAlert } from 'lucide-react';
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
  const [adminName, setAdminName] = useState<string>('Super Admin');
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
      setAdminName(`${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Super Admin');
      setAdminEmail(user.email || 'admin@baxato.com');
      setIsAuthorized(true);
    } else {
      // Immediate lock out for staff and regular merchants
      setIsAuthorized(false);
    }
  }, [isLoginPage]);

  // If on dedicated super admin login page, bypass layout
  if (isLoginPage) {
    return <>{children}</>;
  }

  // 1. Silent loading state while evaluating auth — ZERO CONTENT FLASH
  if (isAuthorized === null) {
    return (
      <div className="min-h-screen bg-[#040711] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-purple-950/40 border border-purple-500/30 flex items-center justify-center animate-pulse">
            <Crown className="w-5 h-5 text-purple-400" />
          </div>
          <span className="text-xs font-mono text-purple-400 tracking-wider">Verifying Root Authority...</span>
        </div>
      </div>
    );
  }

  // 2. Unauthorized Screen for non-super-admin accounts
  if (isAuthorized === false) {
    return (
      <div className="min-h-screen bg-[#040711] flex items-center justify-center p-6 text-slate-100">
        <div className="max-w-md w-full bg-[#080D1D] border border-purple-900/40 rounded-3xl p-8 text-center shadow-2xl shadow-purple-950/50 space-y-6 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-purple-600 to-amber-500" />

          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-tr from-purple-950 to-red-950 border border-purple-700/40 flex items-center justify-center text-purple-300 shadow-inner">
            <Lock className="w-8 h-8 text-red-400" />
          </div>

          <div className="space-y-2">
            <h2 className="text-xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
              Super Admin Access Only
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              This master control plane is strictly restricted to sovereign platform owners. Your active credentials do not have root administrative permissions.
            </p>
          </div>

          <div className="flex flex-col gap-2.5 pt-2">
            <Link
              href="/admin/login"
              className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white transition text-xs shadow-lg shadow-purple-900/40"
            >
              <Crown className="w-4 h-4 text-amber-400" />
              <span>Sign In as Super Admin (2FA)</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 3. Authorized View: Rendered ONLY when isAuthorized === true
  return (
    <div className="min-h-screen bg-[#040711] text-slate-100 flex flex-col selection:bg-purple-600 selection:text-white antialiased">
      {/* Super Admin Navigation Sidebar */}
      <AdminSidebar
        adminName={adminName}
        adminEmail={adminEmail}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Container */}
      <div className="lg:pl-72 flex flex-col min-h-screen">
        <AdminHeader
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          adminName={adminName}
          isRefreshing={isRefreshing}
          onRefresh={() => {
            setIsRefreshing(true);
            window.dispatchEvent(new CustomEvent('bx_admin_refresh'));
            setTimeout(() => setIsRefreshing(false), 800);
          }}
        />

        <main className="flex-1 p-3 sm:p-5 lg:p-7 max-w-7xl mx-auto w-full space-y-6">
          {children}
        </main>
      </div>
    </div>
  );
}
