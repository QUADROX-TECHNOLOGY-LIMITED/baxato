'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  Landmark,
  Users,
  Building2,
  Cpu,
  Sliders,
  ShieldAlert,
  LogOut,
  X,
  Crown,
  ChevronRight,
  Activity,
} from 'lucide-react';
import { clearSessionAndRedirect } from '@/lib/auth-session';

interface AdminSidebarProps {
  adminName: string;
  adminEmail?: string;
  isOpen: boolean;
  onClose: () => void;
}

const NAV_ITEMS = [
  {
    label: 'Overview & Treasury',
    href: '/admin/overview',
    icon: Landmark,
    description: 'Solvency, floating balances & revenue',
  },
  {
    label: 'Staff Management',
    href: '/admin/staff',
    icon: Users,
    description: 'Staff accounts, roles & 2FA',
  },
  {
    label: 'Merchant Workspaces',
    href: '/admin/merchants',
    icon: Building2,
    description: 'Businesses, wallets & freeze controls',
  },
  {
    label: 'Gateways & Routing',
    href: '/admin/providers',
    icon: Cpu,
    description: 'Monnify, Interswitch & failovers',
  },
  {
    label: 'System & Audit Logs',
    href: '/admin/settings',
    icon: Sliders,
    description: 'Kill switches, fee markups & audit trail',
  },
];

export default function AdminSidebar({
  adminName,
  adminEmail,
  isOpen,
  onClose,
}: AdminSidebarProps) {
  const pathname = usePathname();

  const handleLogout = () => {
    try {
      localStorage.removeItem('bx_auth_token');
      localStorage.removeItem('bx_user');
      localStorage.removeItem('bx_business');
      document.cookie = 'bx_auth_token=; path=/; max-age=0;';
    } catch {}
    window.location.assign('/admin/login');
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/80 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-[#060913] border-r border-purple-950/40 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand & Master Status */}
        <div className="p-5 border-b border-purple-950/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-900 to-indigo-800 border border-purple-500/30 flex items-center justify-center text-purple-300 shadow-md shadow-purple-950/60">
              <Crown className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold tracking-tight text-white text-base">BAXATO</span>
                <span className="text-[9px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  Root
                </span>
              </div>
              <p className="text-[10px] text-purple-400/80 font-mono font-medium">SUPER ADMIN CONSOLE</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Infrastructure Pulse */}
        <div className="px-4 pt-3 pb-2">
          <div className="p-2.5 rounded-xl bg-[#090E1E] border border-purple-900/30 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-[11px] font-semibold text-slate-300">Platform Online</span>
            </div>
            <span className="text-[10px] font-mono text-purple-400 font-semibold">Tier 4 Sovereign</span>
          </div>
        </div>

        {/* Navigation Section */}
        <div className="flex-1 px-3 py-3 overflow-y-auto space-y-1.5 scrollbar-none">
          <div className="px-3 pb-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400/70">
              Core Command Modules
            </span>
          </div>

          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-start gap-3 px-3 py-2.5 rounded-xl transition-all group ${
                  isActive
                    ? 'bg-gradient-to-r from-purple-600/20 to-indigo-600/10 text-white border border-purple-500/30 shadow-lg shadow-purple-950/40'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
                }`}
              >
                <div
                  className={`p-1.5 rounded-lg shrink-0 mt-0.5 transition-colors ${
                    isActive
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 group-hover:text-purple-300 group-hover:border-purple-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold truncate">{item.label}</span>
                    {isActive && <ChevronRight className="w-3.5 h-3.5 text-purple-400" />}
                  </div>
                  <p className="text-[10px] text-slate-500 group-hover:text-slate-400 truncate mt-0.5">
                    {item.description}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Super Admin User Badge & Logout */}
        <div className="p-3 border-t border-purple-950/40 bg-[#040711]">
          <div className="p-3 rounded-xl bg-[#090E1E] border border-purple-900/30 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-700 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                {(adminName || 'A').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-white truncate">{adminName || 'Super Admin'}</p>
                <p className="text-[10px] text-purple-400 font-mono truncate">
                  {adminEmail || 'admin@baxato.com'}
                </p>
              </div>
            </div>

            <button
              onClick={handleLogout}
              title="Lock Console / Sign Out"
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
