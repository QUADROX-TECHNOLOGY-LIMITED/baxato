'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import {
  Menu,
  Search,
  Bell,
  RefreshCw,
  ShieldCheck,
  AlertCircle,
  Settings,
  Users,
  LogOut,
  CheckCircle2,
} from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import BusinessSwitcher from './BusinessSwitcher';
import { getStoredUser, clearSessionAndRedirect, type StoredUser } from '@/lib/auth-session';

interface HeaderProps {
  onToggleSidebar: () => void;
  onOpenFundWallet?: () => void;
  onOpenKycModal: () => void;
  merchantName: string;
  businessName?: string;
  kycStatus: string;
  userRole?: string;
  isRefreshing: boolean;
  onRefresh: () => void;
  sticky?: boolean;
}

const ROLE_TITLES: Record<string, string> = {
  SUPER_ADMIN: 'Platform Owner',
  STAFF: 'Platform Staff',
  BUSINESS_OWNER: 'Business Owner',
  BUSINESS_ADMIN: 'Administrator',
  DEVELOPER: 'Developer',
  FINANCE: 'Finance',
  SUPPORT: 'Customer Support',
  VIEWER: 'Viewer',
};

export default function Header({
  onToggleSidebar,
  onOpenKycModal,
  merchantName,
  businessName,
  kycStatus,
  userRole,
  isRefreshing,
  onRefresh,
  sticky = true,
}: HeaderProps) {
  const isVerified = kycStatus === 'VERIFIED';
  const [activeRole, setActiveRole] = useState<string>(userRole || 'BUSINESS_OWNER');
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  const [storedUser, setStoredUser] = useState<StoredUser | null>(() => {
    if (typeof window !== 'undefined') return getStoredUser();
    return null;
  });

  useEffect(() => {
    if (userRole) {
      setActiveRole(userRole);
    } else {
      try {
        const u = getStoredUser();
        if (u?.role) setActiveRole(u.role);
        if (u) setStoredUser(u);
      } catch {}
    }
  }, [userRole, merchantName]);

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayName = useMemo(() => {
    if (merchantName && merchantName !== 'Merchant') return merchantName;
    if (storedUser?.firstName) {
      return `${storedUser.firstName} ${storedUser.lastName || ''}`.trim();
    }
    return merchantName || '';
  }, [merchantName, storedUser]);

  const isOwnerOrAdmin = activeRole === 'BUSINESS_OWNER' || activeRole === 'BUSINESS_ADMIN';

  return (
    <header className={`${sticky ? 'sticky top-0 z-30' : 'relative z-10'} w-full bg-white dark:bg-[#070D18] border-b border-slate-200/80 dark:border-slate-800/80 px-2.5 sm:px-6 lg:px-8 py-2 sm:py-3 transition-colors duration-150`}>
      <div className="flex items-center justify-between gap-2 sm:gap-4">
        {/* Left Side: Mobile Menu Button, Business Switcher & Search */}
        <div className="flex items-center gap-1.5 sm:gap-3 flex-1 min-w-0">
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-1.5 sm:p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Business Workspace Switcher in Header (accessible directly on mobile & desktop) */}
          <div className="min-w-0 max-w-[130px] xs:max-w-[160px] sm:max-w-[220px] md:max-w-[260px]">
            <BusinessSwitcher currentBusinessName={businessName} variant="header" />
          </div>

          {/* Quick Search */}
          <div className="relative w-full max-w-xs hidden md:block">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search transactions or services..."
              className="w-full h-9 pl-9 pr-12 text-xs rounded-xl bg-slate-100/80 dark:bg-[#0E1828] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#126BEB] focus:border-[#126BEB] transition-all"
            />
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#070D18] text-[10px] font-mono text-slate-400">
              ⌘K
            </div>
          </div>
        </div>

        {/* Right Side: Refresh, Theme, Bell & Profile */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {/* Refresh Balances */}
          <button
            onClick={onRefresh}
            title="Refresh"
            aria-label="Refresh"
            className="p-1.5 sm:p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
          >
            <RefreshCw
              className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#126BEB]' : ''}`}
            />
          </button>

          {/* Notification Bell */}
          <button
            title="Notifications"
            aria-label="Notifications"
            className="relative p-1.5 sm:p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
          >
            <Bell className="w-4 h-4" />
          </button>

          {/* Theme Toggle (Light / System / Dark) */}
          <ThemeToggle />

          {/* User Profile & Status */}
          <div className="relative pl-1.5 sm:pl-2 border-l border-slate-200 dark:border-slate-800 shrink-0" ref={userMenuRef}>
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors text-left group cursor-pointer"
              title="Account Menu"
            >
              <div className="relative shrink-0">
                <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-gradient-to-tr from-[#126BEB] to-[#38BDF8] text-white font-bold text-xs flex items-center justify-center shadow-sm">
                  {displayName ? displayName.charAt(0).toUpperCase() : '•'}
                </div>
                {isOwnerOrAdmin ? (
                  isVerified ? (
                    <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-[#070D18] flex items-center justify-center text-white">
                      <ShieldCheck className="w-2.5 h-2.5" />
                    </span>
                  ) : (
                    <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-amber-500 border-2 border-white dark:border-[#070D18] flex items-center justify-center text-white">
                      <AlertCircle className="w-2.5 h-2.5" />
                    </span>
                  )
                ) : null}
              </div>
              <div className="hidden lg:block text-left">
                <span className="block text-xs font-bold text-slate-800 dark:text-slate-100 leading-tight group-hover:text-[#126BEB] transition-colors">
                  {displayName || ''}
                </span>
                <span
                  className={`block text-[10px] font-semibold ${
                    isOwnerOrAdmin
                      ? isVerified
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-amber-600 dark:text-amber-400'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {isOwnerOrAdmin
                    ? isVerified
                      ? 'Verified'
                      : 'Verify Identity'
                    : (ROLE_TITLES[activeRole] || 'Team Collaborator')}
                </span>
              </div>
            </button>

            {/* User Dropdown Menu */}
            {isUserMenuOpen && (
              <div className="absolute top-full right-0 mt-2 w-56 p-2 bg-white dark:bg-[#0A1324] border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-xl shadow-slate-900/10 dark:shadow-black/50 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-3 py-2.5 border-b border-slate-100 dark:border-slate-800/80 mb-1">
                  <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {displayName || 'Merchant'}
                  </div>
                  {storedUser?.email && (
                    <div className="text-[11px] text-slate-400 truncate mt-0.5">
                      {storedUser.email}
                    </div>
                  )}
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/60 text-[#126BEB] dark:text-[#38BDF8] border border-blue-200/50 dark:border-blue-900/50">
                      {ROLE_TITLES[activeRole] || activeRole}
                    </span>
                    {isVerified && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-3 h-3" />
                        Verified
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-0.5">
                  {isOwnerOrAdmin && !isVerified && (
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        onOpenKycModal();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-colors text-left"
                    >
                      <AlertCircle className="w-4 h-4 text-amber-500" strokeWidth={1.75} />
                      <span>Verify Identity</span>
                    </button>
                  )}

                  <Link
                    href="/dashboard/settings"
                    onClick={() => setIsUserMenuOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
                  >
                    <Settings className="w-4 h-4 text-slate-400" strokeWidth={1.75} />
                    <span>Account Settings</span>
                  </Link>

                  {isOwnerOrAdmin && (
                    <Link
                      href="/dashboard/team"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
                    >
                      <Users className="w-4 h-4 text-slate-400" strokeWidth={1.75} />
                      <span>Team Members</span>
                    </Link>
                  )}

                  <div className="border-t border-slate-100 dark:border-slate-800/80 my-1" />

                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      clearSessionAndRedirect('logout');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors text-left"
                  >
                    <LogOut className="w-4 h-4 text-rose-500" strokeWidth={1.75} />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
