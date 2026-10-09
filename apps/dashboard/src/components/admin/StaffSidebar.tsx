'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ArrowRightLeft,
  Server,
  UserCheck,
  ShieldCheck,
  ExternalLink,
  LogOut,
  X,
  Activity,
  ShieldAlert,
} from 'lucide-react';
import { clearSessionAndRedirect } from '@/lib/auth-session';

export type StaffTab = 'overview' | 'transactions' | 'routing' | 'merchants';

interface StaffSidebarProps {
  userRole?: string;
  staffName?: string;
  isOpen: boolean;
  onClose: () => void;
  activeTab?: StaffTab;
  onSelectTab?: (tab: StaffTab) => void;
}

export default function StaffSidebar({
  userRole = 'STAFF',
  staffName = 'Staff User',
  isOpen,
  onClose,
}: StaffSidebarProps) {
  const pathname = usePathname();
  const isSuperAdmin = userRole === 'SUPER_ADMIN';

  const navItems = [
    {
      href: '/staff/overview',
      label: 'Platform Overview',
      subtitle: 'Telemetry & Volume',
      icon: LayoutDashboard,
    },
    {
      href: '/staff/transactions',
      label: 'Transaction Desk',
      subtitle: 'Audit & Upstream Sync',
      icon: ArrowRightLeft,
    },
    {
      href: '/staff/routing',
      label: 'Provider Failovers',
      subtitle: 'Monnify / Interswitch',
      icon: Server,
    },
    {
      href: '/staff/merchants',
      label: 'Merchants & NIN Directory',
      subtitle: 'KYC & Business Accounts',
      icon: UserCheck,
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-sm lg:hidden transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Staff Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-[#0B132B] text-slate-200 border-r border-slate-800/80 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand & Backoffice Badge Header */}
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2.5">
              <div className="relative w-7 h-7 flex-shrink-0">
                <Image
                  src="/baxato-logo-white.png"
                  alt="Baxato"
                  fill
                  className="object-contain"
                  onError={(e) => {
                    (e.target as any).src = '/baxato-logo-blue.png';
                  }}
                />
              </div>
              <span className="font-extrabold text-base tracking-wider text-white">
                BAXATO
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                STAFF
              </span>
            </div>
            <div className="flex items-center gap-1.5 pl-9">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[11px] font-medium text-emerald-400 tracking-wide">
                Live Operations Desk
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dedicated Staff Navigation */}
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
          <div>
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center justify-between">
              <span>Operations & Routing</span>
              <Activity className="w-3.5 h-3.5 text-slate-500" />
            </div>

            <nav className="space-y-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || (item.href === '/staff/overview' && pathname === '/staff');

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => {
                      if (isOpen) onClose();
                    }}
                    className={`w-full text-left flex items-start gap-3 px-3 py-2.5 rounded-xl text-xs transition-all group ${
                      isActive
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-md shadow-blue-500/20'
                        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 mt-0.5 flex-shrink-0 transition-transform group-hover:scale-110 ${
                        isActive ? 'text-white' : 'text-slate-400'
                      }`}
                    />
                    <div className="flex flex-col min-w-0">
                      <span className="truncate">{item.label}</span>
                      <span
                        className={`text-[10px] truncate ${
                          isActive ? 'text-blue-100' : 'text-slate-500'
                        }`}
                      >
                        {item.subtitle}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Security & Access Info */}
          <div>
            <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 flex items-center justify-between">
              <span>Access & Security</span>
              <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span>Access Level</span>
                <span className="font-mono font-bold text-slate-200">
                  {isSuperAdmin ? 'Super Administrator' : 'Platform Staff'}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Identity System</span>
                <span className="text-emerald-400 font-semibold">NIMC NIN Only</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Internal Scope</span>
                <span className="font-mono text-slate-300">Staff Ops Desk</span>
              </div>
            </div>
          </div>

          {/* Super Admin link if caller has SUPER_ADMIN role */}
          {isSuperAdmin && (
            <div>
              <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-purple-400 flex items-center justify-between">
                <span>Governance</span>
                <ShieldAlert className="w-3.5 h-3.5 text-purple-400" />
              </div>

              <Link
                href="/admin"
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl bg-purple-950/40 border border-purple-500/30 text-purple-200 hover:bg-purple-900/40 text-xs transition font-medium"
              >
                <span>Super Admin Console</span>
                <span className="text-[10px] font-mono bg-purple-500/30 px-1.5 py-0.5 rounded text-purple-300">/admin</span>
              </Link>
            </div>
          )}
        </div>

        {/* Bottom Staff Profile Card & Portal Switch */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/40 space-y-3">
          {/* User Details */}
          <div className="flex items-center gap-3 px-2 py-1">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center text-xs flex-shrink-0 shadow-sm shadow-blue-500/20">
              {staffName
                ? staffName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()
                : 'ST'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-white truncate">
                {staffName || 'Staff Member'}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-bold uppercase tracking-wider ${
                    isSuperAdmin
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                      : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                  }`}
                >
                  {userRole}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Switch to Merchant View */}
          <Link
            href="/dashboard"
            className="flex items-center justify-between w-full px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs transition"
          >
            <span className="flex items-center gap-2">
              <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
              <span>Merchant Portal</span>
            </span>
            <span className="text-[10px] text-slate-500">/dashboard</span>
          </Link>

          {/* Sign Out Button */}
          <button
            onClick={() => clearSessionAndRedirect('logout')}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/20 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
