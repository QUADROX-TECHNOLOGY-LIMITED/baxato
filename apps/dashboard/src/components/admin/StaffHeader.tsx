'use client';

import React from 'react';
import Link from 'next/link';
import {
  Menu,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
  Activity,
  Layers,
} from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';

interface StaffHeaderProps {
  onToggleSidebar: () => void;
  staffName: string;
  userRole: string;
  isRefreshing: boolean;
  onRefresh: () => void;
  activeTabTitle?: string;
}

export default function StaffHeader({
  onToggleSidebar,
  staffName,
  userRole,
  isRefreshing,
  onRefresh,
  activeTabTitle = 'Platform Operations',
}: StaffHeaderProps) {
  const isSuperAdmin = userRole === 'SUPER_ADMIN';

  return (
    <header className="sticky top-0 z-30 w-full bg-white/95 dark:bg-[#070D18]/95 backdrop-blur border-b border-slate-200 dark:border-slate-800/80 px-4 sm:px-6 lg:px-8 py-3 transition-colors duration-150">
      <div className="flex items-center justify-between gap-4">
        {/* Left Side: Mobile Menu Button & Breadcrumb */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Open staff navigation"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 text-xs font-semibold">
              <Activity className="w-3.5 h-3.5" />
              <span>Operations Desk</span>
            </div>
            <span className="hidden sm:inline text-slate-300 dark:text-slate-700">/</span>
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              {activeTabTitle}
            </span>
          </div>
        </div>

        {/* Right Side: Telemetry Refresh, Theme Toggle & Portal Switch */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Real-time sync button */}
          <button
            onClick={onRefresh}
            title="Refresh Operations Telemetry"
            aria-label="Refresh Operations Telemetry"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700/80 transition"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#126BEB]' : ''}`}
            />
            <span className="hidden md:inline">Sync Metrics</span>
          </button>

          {/* Theme Switcher */}
          <ThemeToggle />

          {/* Switch to Merchant Mode */}
          <Link
            href="/dashboard"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Merchant Portal</span>
          </Link>

          {/* Staff Profile Badge */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center text-xs shadow-sm">
              {staffName
                ? staffName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()
                : 'ST'}
            </div>
            <div className="hidden md:flex flex-col text-left">
              <span className="text-xs font-semibold text-slate-900 dark:text-white leading-tight">
                {staffName || 'Staff Member'}
              </span>
              <span className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 font-medium">
                {isSuperAdmin ? 'SUPER ADMIN' : 'STAFF'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
