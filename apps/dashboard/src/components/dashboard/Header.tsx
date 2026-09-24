'use client';

import React from 'react';
import {
  Menu,
  Search,
  Wallet,
  Bell,
  RefreshCw,
  ShieldCheck,
  AlertCircle,
  Activity,
} from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';

interface HeaderProps {
  onToggleSidebar: () => void;
  onOpenFundWallet: () => void;
  onOpenKycModal: () => void;
  merchantName: string;
  kycStatus: string;
  isRefreshing: boolean;
  onRefresh: () => void;
}

export default function Header({
  onToggleSidebar,
  onOpenFundWallet,
  onOpenKycModal,
  merchantName,
  kycStatus,
  isRefreshing,
  onRefresh,
}: HeaderProps) {
  const isVerified = kycStatus === 'VERIFIED';

  return (
    <header className="sticky top-0 z-30 w-full bg-white/95 dark:bg-[#060D18]/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/80 px-4 sm:px-6 lg:px-8 py-3 transition-colors duration-150">
      <div className="flex items-center justify-between gap-4">
        {/* Left Side: Mobile Menu Button & Search */}
        <div className="flex items-center gap-3 flex-1 max-w-lg">
          <button
            onClick={onToggleSidebar}
            className="lg:hidden p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Open sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Global Quick Search */}
          <div className="relative w-full hidden sm:block">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search transactions, meter numbers, phone numbers..."
              className="w-full h-9 pl-9 pr-12 text-xs rounded-xl bg-slate-100/80 dark:bg-[#0D182B] border border-slate-200/80 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#126BEB] focus:border-[#126BEB] transition-all"
            />
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 px-1.5 py-0.5 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#060D18] text-[10px] font-mono text-slate-400">
              ⌘K
            </div>
          </div>
        </div>

        {/* Right Side: Environment Badge, Grid Status, Actions & Profile */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Environment Pill */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/40 text-[11px] font-bold text-[#126BEB] dark:text-[#38BDF8]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#126BEB] dark:bg-[#38BDF8]" />
            <span>LIVE PRODUCTION</span>
          </div>

          {/* Grid Health Status */}
          <div className="hidden xl:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-900/40 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span>DISCO & Telco Grid: 99.98%</span>
          </div>

          {/* Refresh Balances */}
          <button
            onClick={onRefresh}
            title="Refresh Account Balances"
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <RefreshCw
              className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#126BEB]' : ''}`}
            />
          </button>

          {/* Quick Fund Settlement Wallet CTA */}
          <button
            onClick={onOpenFundWallet}
            className="inline-flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-xl bg-[#126BEB] hover:bg-[#0B5CC7] active:bg-[#094bb5] text-white text-xs font-bold shadow-sm shadow-blue-500/20 transition-all"
          >
            <Wallet className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline">Fund Wallet</span>
          </button>

          {/* Notification Bell */}
          <button
            title="Notifications"
            className="relative p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#126BEB]" />
          </button>

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* User Profile & KYC Badge */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
            <button
              onClick={!isVerified ? onOpenKycModal : undefined}
              className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
            >
              <div className="relative">
                <div className="w-8 h-8 rounded-full bg-[#126BEB] text-white font-black text-xs flex items-center justify-center shadow-sm">
                  {merchantName ? merchantName.charAt(0).toUpperCase() : 'M'}
                </div>
                {isVerified ? (
                  <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-white dark:border-[#060D18] flex items-center justify-center text-white">
                    <ShieldCheck className="w-2.5 h-2.5" />
                  </span>
                ) : (
                  <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-amber-500 border-2 border-white dark:border-[#060D18] flex items-center justify-center text-white animate-pulse">
                    <AlertCircle className="w-2.5 h-2.5" />
                  </span>
                )}
              </div>
              <div className="hidden lg:block text-left">
                <span className="block text-xs font-bold text-slate-800 dark:text-slate-100 leading-tight">
                  {merchantName || 'Merchant'}
                </span>
                <span
                  className={`block text-[10px] font-bold ${
                    isVerified ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                  }`}
                >
                  {isVerified ? 'KYC Verified' : 'Action Needed'}
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
