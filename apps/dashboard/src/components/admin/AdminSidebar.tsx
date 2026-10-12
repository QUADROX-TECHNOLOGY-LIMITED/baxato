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
  History,
  LogOut,
  X,
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
    label: 'Overview',
    href: '/admin/overview',
    icon: Landmark,
  },
  {
    label: 'Staff Team',
    href: '/admin/staff',
    icon: Users,
  },
  {
    label: 'Merchants & Wallets',
    href: '/admin/merchants',
    icon: Building2,
  },
  {
    label: 'Gateways & Routing',
    href: '/admin/providers',
    icon: Cpu,
  },
  {
    label: 'System Settings',
    href: '/admin/settings',
    icon: Sliders,
  },
  {
    label: 'Audit Trail',
    href: '/admin/audit-logs',
    icon: History,
  },
];

export default function AdminSidebar({
  adminName,
  isOpen,
  onClose,
}: AdminSidebarProps) {
  const pathname = usePathname();

  const handleLogout = () => {
    clearSessionAndRedirect('logout');
  };

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

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#0B132B] text-slate-200 border-r border-slate-800 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand & Badge Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="relative w-7 h-7 flex-shrink-0 rounded-lg overflow-hidden border border-slate-700 bg-white p-0.5">
              <Image
                src="/baxato-logo.jpg"
                alt="Baxato"
                fill
                priority
                className="object-contain rounded"
              />
            </div>
            <span className="font-bold text-base tracking-wider text-white">
              BAXATO
            </span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase bg-slate-800 text-slate-300 border border-slate-700">
              ADMIN
            </span>
          </div>

          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Section */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <span className="px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500 block mb-2">
            Platform Administration
          </span>
          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href === '/admin/overview' && pathname === '/admin');

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => {
                    if (isOpen) onClose();
                  }}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-[#126BEB] text-white'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Profile Card & Logout */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/50 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 font-semibold flex items-center justify-center text-xs shrink-0">
              {adminName
                ? adminName
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase()
                : 'AD'}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-medium text-white truncate">
                {adminName || 'Platform Admin'}
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                Administrator
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-medium text-red-400 hover:text-white hover:bg-red-500/20 border border-red-500/20 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
