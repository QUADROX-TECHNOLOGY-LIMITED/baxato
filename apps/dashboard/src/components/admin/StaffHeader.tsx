'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Menu, RefreshCw, LogOut } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import { clearSessionAndRedirect } from '@/lib/auth-session';

interface StaffHeaderProps {
  onToggleSidebar: () => void;
  isSidebarOpen?: boolean;
  staffName: string;
  userRole: string;
  isRefreshing: boolean;
  onRefresh: () => void;
  activeTabTitle?: string;
}

const ROUTE_TITLES: Record<string, string> = {
  '/staff/overview': 'Overview',
  '/staff/transactions': 'Transactions',
  '/staff/merchants': 'Merchants & KYC',
  '/staff/routing': 'Routing & Health',
  '/staff/security': 'Account & Security',
};

const ROLE_TITLES: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  STAFF: 'Platform Staff',
  SUPPORT: 'Support',
};

export default function StaffHeader({
  onToggleSidebar,
  isSidebarOpen = false,
  staffName,
  userRole,
  isRefreshing,
  onRefresh,
  activeTabTitle,
}: StaffHeaderProps) {
  const pathname = usePathname();

  const resolvedTitle =
    activeTabTitle ||
    Object.entries(ROUTE_TITLES).find(([route]) => pathname?.startsWith(route))?.[1] ||
    'Operations';

  const initials = (staffName || 'ST')
    .split(/\s+/)
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 w-full bg-white dark:bg-[#070D18] border-b border-slate-200/80 dark:border-slate-800/80 px-3 sm:px-6 lg:px-8 pt-[env(safe-area-inset-top,0px)] transition-colors duration-150">
      <div className="h-14 sm:h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Mobile drawer trigger & breadcrumb */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <button
            type="button"
            onClick={onToggleSidebar}
            aria-label="Open navigation menu"
            aria-expanded={isSidebarOpen}
            className="lg:hidden min-h-11 min-w-11 -ml-1 flex items-center justify-center rounded-lg text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
          >
            <Menu className="w-5 h-5" aria-hidden="true" />
          </button>

          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 text-sm sm:text-xs">
            <span className="hidden sm:inline font-medium text-slate-500 dark:text-slate-400">
              Staff
            </span>
            <span className="hidden sm:inline text-slate-300 dark:text-slate-700" aria-hidden="true">
              /
            </span>
            <span className="font-semibold text-slate-900 dark:text-white truncate">
              {resolvedTitle}
            </span>
          </div>
        </div>

        {/* Right: Sync, Theme & Account */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            aria-label="Refresh operational data"
            className="min-h-10 sm:min-h-9 px-2.5 sm:px-3 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200/80 dark:hover:bg-slate-700/80 border border-slate-200/80 dark:border-slate-700/80 flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#126BEB] dark:text-[#38BDF8]' : ''}`}
              aria-hidden="true"
            />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          <ThemeToggle />

          <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
            <div className="w-8 h-8 rounded-full bg-[#126BEB] text-white font-semibold flex items-center justify-center text-xs shrink-0">
              {initials}
            </div>
            <div className="hidden md:flex flex-col text-left">
              <span className="text-xs font-semibold text-slate-900 dark:text-white leading-tight max-w-[140px] truncate">
                {staffName || 'Staff User'}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                {ROLE_TITLES[userRole] || 'Platform Staff'}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => clearSessionAndRedirect('logout')}
            title="Sign Out"
            aria-label="Sign Out"
            className="hidden sm:flex min-h-10 min-w-10 items-center justify-center rounded-lg text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
          >
            <LogOut className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
}
