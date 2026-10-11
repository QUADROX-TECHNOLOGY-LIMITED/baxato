'use client';

import React from 'react';
import { Menu, RefreshCw, LogOut } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';
import { clearSessionAndRedirect } from '@/lib/auth-session';

interface AdminHeaderProps {
  onToggleSidebar: () => void;
  adminName: string;
  isRefreshing: boolean;
  onRefresh: () => void;
  title?: string;
}

export default function AdminHeader({
  onToggleSidebar,
  adminName,
  isRefreshing,
  onRefresh,
  title = 'Overview',
}: AdminHeaderProps) {
  const handleLogout = () => {
    clearSessionAndRedirect('logout');
  };

  return (
    <header className="sticky top-0 z-30 w-full bg-white/95 dark:bg-[#070D18]/95 backdrop-blur border-b border-slate-200 dark:border-slate-800/80 px-4 sm:px-6 lg:px-8 py-3 transition-colors duration-150">
      <div className="flex items-center justify-between gap-4">
        {/* Left Side: Mobile Menu Button & Breadcrumb */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Open admin navigation"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              Admin
            </span>
            <span className="text-slate-300 dark:text-slate-700">/</span>
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              {title}
            </span>
          </div>
        </div>

        {/* Right Side: Refresh, Theme Toggle & Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Refresh button */}
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Refresh Metrics"
            aria-label="Refresh Metrics"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700/80 transition disabled:opacity-50"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#126BEB]' : ''}`}
            />
            <span className="hidden md:inline">Sync Metrics</span>
          </button>

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Admin Profile Badge */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
            <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 text-white font-bold flex items-center justify-center text-xs shadow-sm">
              {adminName
                ? adminName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()
                : 'AD'}
            </div>
            <div className="hidden md:flex flex-col text-left">
              <span className="text-xs font-semibold text-slate-900 dark:text-white leading-tight">
                {adminName || 'Platform Admin'}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                Super Admin
              </span>
            </div>
          </div>

          {/* Sign Out */}
          <button
            onClick={handleLogout}
            title="Sign Out"
            className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
