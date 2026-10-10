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
  LogOut,
  X,
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

  const navItems = [
    {
      href: '/staff/overview',
      label: 'Overview',
      icon: LayoutDashboard,
    },
    {
      href: '/staff/transactions',
      label: 'Transactions',
      icon: ArrowRightLeft,
    },
    {
      href: '/staff/merchants',
      label: 'Merchants',
      icon: UserCheck,
    },
    {
      href: '/staff/routing',
      label: 'Routing',
      icon: Server,
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
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#0B132B] text-slate-200 border-r border-slate-800 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand & Backoffice Badge Header */}
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
              STAFF
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

        {/* Staff Navigation */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                pathname === item.href ||
                (item.href === '/staff/overview' && pathname === '/staff');

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => {
                    if (isOpen) onClose();
                  }}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-blue-600 text-white'
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

        {/* Bottom Staff Profile Card */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/50 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 font-semibold flex items-center justify-center text-xs shrink-0">
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
              <div className="text-xs font-medium text-white truncate">
                {staffName || 'Staff Member'}
              </div>
              <div className="text-[10px] text-slate-400 font-mono">
                Staff Account
              </div>
            </div>
          </div>

          {/* Sign Out Button */}
          <button
            onClick={() => clearSessionAndRedirect('logout')}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/20 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
