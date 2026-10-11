'use client';

import React from 'react';
import { Menu, RefreshCw, ShieldCheck, Lock, Activity, Bell } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';

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
  title,
}: AdminHeaderProps) {
  return (
    <header className="sticky top-0 z-30 h-16 bg-[#060913]/85 backdrop-blur-md border-b border-purple-950/40 px-4 sm:px-6 flex items-center justify-between">
      {/* Left: Mobile hamburger & breadcrumbs */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
          <span className="text-xs font-mono uppercase tracking-wider text-purple-400 font-semibold">
            Baxato Master Root
          </span>
          {title && (
            <>
              <span className="text-slate-600">/</span>
              <span className="text-xs font-semibold text-white truncate">{title}</span>
            </>
          )}
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2.5 sm:gap-3.5">
        {/* Solvency Indicator */}
        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-purple-950/30 border border-purple-800/40 text-xs">
          <Activity className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-slate-300">Solvency:</span>
          <span className="font-semibold text-emerald-400 font-mono">100% Backed</span>
        </div>

        {/* Refresh Telemetry */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
          title="Refresh Platform Telemetry"
          className="p-2 rounded-xl bg-[#090E1E] border border-slate-800 text-slate-300 hover:text-white hover:border-purple-600 transition disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-purple-400' : ''}`} />
        </button>

        <ThemeToggle />

        {/* Lock Console */}
        <button
          onClick={() => {
            try {
              localStorage.removeItem('bx_auth_token');
              localStorage.removeItem('bx_user');
              localStorage.removeItem('bx_business');
              document.cookie = 'bx_auth_token=; path=/; max-age=0;';
            } catch {}
            window.location.assign('/admin/login');
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-950/40 border border-red-800/50 hover:bg-red-900/50 text-red-300 hover:text-red-200 text-xs font-semibold transition"
          title="Emergency Lock Master Console"
        >
          <Lock className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Lock</span>
        </button>
      </div>
    </header>
  );
}
