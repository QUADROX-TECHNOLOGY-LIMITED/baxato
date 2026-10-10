'use client';

import React from 'react';
import {
  Menu,
  Search,
  Bell,
  RefreshCw,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import BusinessSwitcher from './BusinessSwitcher';

interface HeaderProps {
  onToggleSidebar: () => void;
  onOpenFundWallet?: () => void;
  onOpenKycModal: () => void;
  merchantName: string;
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
  kycStatus,
  userRole,
  isRefreshing,
  onRefresh,
  sticky = true,
}: HeaderProps) {
  const isVerified = kycStatus === 'VERIFIED';
  const [activeRole, setActiveRole] = React.useState<string>(userRole || 'BUSINESS_OWNER');

  React.useEffect(() => {
    if (userRole) {
      setActiveRole(userRole);
    } else {
      try {
        const raw = localStorage.getItem('bx_user');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.role) setActiveRole(parsed.role);
        }
      } catch {}
    }
  }, [userRole]);

  const isOwnerOrAdmin = activeRole === 'BUSINESS_OWNER' || activeRole === 'BUSINESS_ADMIN';

  return (
    <header className={`${sticky ? 'sticky top-0 z-30' : 'relative z-10'} w-full bg-white dark:bg-[#070D18] border-b border-slate-200 dark:border-slate-800/80 px-3 sm:px-6 lg:px-8 py-2.5 sm:py-3 transition-colors duration-150`}>
      <div className="flex items-center justify-between gap-2.5 sm:gap-4">
        {/* Left Side: Mobile Menu Button, Business Switcher & Search */}
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Business Workspace Switcher in Header (accessible directly on mobile & desktop) */}
          <BusinessSwitcher currentBusinessName={merchantName} variant="header" />

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
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Refresh Balances */}
          <button
            onClick={onRefresh}
            title="Refresh"
            aria-label="Refresh"
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <RefreshCw
              className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#126BEB]' : ''}`}
            />
          </button>

          {/* Notification Bell */}
          <button
            title="Notifications"
            aria-label="Notifications"
            className="relative p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Bell className="w-4 h-4" />
          </button>

          {/* Theme Toggle (Light / System / Dark) */}
          <ThemeToggle />

          {/* User Profile & Status */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
            <button
              onClick={isOwnerOrAdmin && !isVerified ? onOpenKycModal : undefined}
              className={`flex items-center gap-2 p-1 rounded-xl transition-colors text-left ${
                isOwnerOrAdmin && !isVerified
                  ? 'hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer'
                  : 'cursor-default'
              }`}
            >
              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-[#126BEB] text-white font-bold text-xs flex items-center justify-center shadow-sm">
                  {merchantName ? merchantName.charAt(0).toUpperCase() : 'M'}
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
                <span className="block text-xs font-bold text-slate-800 dark:text-slate-100 leading-tight">
                  {merchantName || 'Merchant'}
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
          </div>
        </div>
      </div>
    </header>
  );
}
