'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ArrowRightLeft,
  Server,
  UserCheck,
  ShieldCheck,
  LogOut,
  X,
} from 'lucide-react';
import { clearSessionAndRedirect, getStoredUser } from '@/lib/auth-session';
import { applyThemeChrome, resolveIsDark } from '@/lib/theme-sync';

export type StaffTab = 'overview' | 'transactions' | 'routing' | 'merchants' | 'security';

interface StaffSidebarProps {
  userRole?: string;
  staffName?: string;
  staffEmail?: string;
  isOpen: boolean;
  onClose: () => void;
  activeTab?: StaffTab;
  onSelectTab?: (tab: StaffTab) => void;
}

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  STAFF: 'Platform Staff',
  SUPPORT: 'Support',
};

export const STAFF_NAV_ITEMS = [
  {
    href: '/staff/overview',
    label: 'Overview',
    shortLabel: 'Overview',
    icon: LayoutDashboard,
    group: 'OPERATIONS',
  },
  {
    href: '/staff/transactions',
    label: 'Transactions',
    shortLabel: 'Txns',
    icon: ArrowRightLeft,
    group: 'OPERATIONS',
  },
  {
    href: '/staff/merchants',
    label: 'Merchants & KYC',
    shortLabel: 'Merchants',
    icon: UserCheck,
    group: 'OPERATIONS',
  },
  {
    href: '/staff/routing',
    label: 'Routing & Health',
    shortLabel: 'Routing',
    icon: Server,
    group: 'OPERATIONS',
  },
  {
    href: '/staff/security',
    label: 'Account & Security',
    shortLabel: 'Security',
    icon: ShieldCheck,
    group: 'ACCOUNT',
  },
] as const;

export default function StaffSidebar({
  userRole = 'STAFF',
  staffName = 'Staff User',
  staffEmail,
  isOpen,
  onClose,
}: StaffSidebarProps) {
  const pathname = usePathname();
  const [backdropEpoch, setBackdropEpoch] = useState(0);
  const [resolvedEmail, setResolvedEmail] = useState<string>(staffEmail || '');
  const asideRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (staffEmail) {
      setResolvedEmail(staffEmail);
      return;
    }
    const stored = getStoredUser();
    if (stored?.email) setResolvedEmail(stored.email);
  }, [staffEmail]);

  // Close mobile drawer on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Sync mobile browser chrome & frosted backdrop if theme changes while drawer is open
  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return;

    const prevBodyOverflow = document.body.style.overflow;
    if (window.innerWidth < 1024) {
      document.body.style.overflow = 'hidden';
      applyThemeChrome(resolveIsDark(), undefined, { forceMetaRefresh: true, silent: true });
    }

    let raf1 = 0;
    let raf2 = 0;
    let settleTimer: ReturnType<typeof setTimeout> | undefined;

    const refreshMobileDrawerLayer = () => {
      if (window.innerWidth >= 1024) return;
      setBackdropEpoch((prev) => prev + 1);
      applyThemeChrome(resolveIsDark(), undefined, { forceMetaRefresh: true, silent: true });

      const asideEl = asideRef.current;
      if (asideEl) {
        cancelAnimationFrame(raf1);
        cancelAnimationFrame(raf2);
        raf1 = requestAnimationFrame(() => {
          asideEl.style.transform = 'translate3d(0.01px, 0, 0)';
          void asideEl.offsetHeight;
          raf2 = requestAnimationFrame(() => {
            asideEl.style.transform = '';
          });
        });
      }
    };

    const handleThemeChange = () => {
      refreshMobileDrawerLayer();
      if (settleTimer) clearTimeout(settleTimer);
      settleTimer = setTimeout(refreshMobileDrawerLayer, 200);
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        handleThemeChange();
      }
    };

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', handleThemeChange);
    window.addEventListener('baxato:theme-changed', handleThemeChange);
    window.addEventListener('focus', handleThemeChange);
    window.addEventListener('pageshow', handleThemeChange);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      document.body.style.overflow = prevBodyOverflow;
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
      if (settleTimer) clearTimeout(settleTimer);
      mediaQuery.removeEventListener('change', handleThemeChange);
      window.removeEventListener('baxato:theme-changed', handleThemeChange);
      window.removeEventListener('focus', handleThemeChange);
      window.removeEventListener('pageshow', handleThemeChange);
      document.removeEventListener('visibilitychange', handleVisibility);
      applyThemeChrome(resolveIsDark(), undefined, { forceMetaRefresh: true, silent: true });
    };
  }, [isOpen]);

  const operationsItems = STAFF_NAV_ITEMS.filter((item) => item.group === 'OPERATIONS');
  const accountItems = STAFF_NAV_ITEMS.filter((item) => item.group === 'ACCOUNT');

  const initials = (staffName || 'ST')
    .split(/\s+/)
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          key={`staff-backdrop-${backdropEpoch}`}
          onClick={onClose}
          className="fixed inset-0 z-40 bg-white/75 dark:bg-[#070D18]/80 backdrop-blur-sm lg:hidden"
          aria-hidden="true"
        />
      )}

      {/* Staff Sidebar / Mobile Drawer */}
      <aside
        ref={asideRef}
        aria-label="Staff navigation"
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 max-w-[84vw] bg-white dark:bg-[#070D18] text-slate-900 dark:text-slate-100 border-r border-slate-200/80 dark:border-slate-800/80 shadow-2xl shadow-slate-900/10 dark:shadow-black/50 lg:shadow-none flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="px-5 py-4 pt-[max(1rem,env(safe-area-inset-top,0px))] border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between gap-2">
          <Link
            href="/staff/overview"
            onClick={() => {
              if (isOpen) onClose();
            }}
            className="flex items-center gap-3 min-w-0"
          >
            <div className="relative w-8 h-8 shrink-0">
              <Image
                src="/baxato-mark.svg"
                alt="BAXATO"
                fill
                priority
                className="object-contain"
              />
            </div>
            <div className="min-w-0">
              <span className="font-bold text-lg tracking-tight text-slate-900 dark:text-white block leading-tight">
                BAXATO
              </span>
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
                Staff Dashboard
              </span>
            </div>
          </Link>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation menu"
            className="lg:hidden min-h-11 min-w-11 -mr-2 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          <div>
            <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
              Operations
            </p>
            <ul className="space-y-1">
              {operationsItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={isActive ? 'page' : undefined}
                      onClick={() => {
                        if (isOpen) onClose();
                      }}
                      className={`flex items-center gap-3 px-3 min-h-11 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-[#126BEB]/10 dark:bg-[#126BEB]/20 text-[#126BEB] dark:text-[#38BDF8] font-semibold'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <Icon className="w-[18px] h-[18px] shrink-0" aria-hidden="true" />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800/80">
            <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
              Account
            </p>
            <ul className="space-y-1">
              {accountItems.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={isActive ? 'page' : undefined}
                      onClick={() => {
                        if (isOpen) onClose();
                      }}
                      className={`flex items-center gap-3 px-3 min-h-11 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-[#126BEB]/10 dark:bg-[#126BEB]/20 text-[#126BEB] dark:text-[#38BDF8] font-semibold'
                          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/70 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <Icon className="w-[18px] h-[18px] shrink-0" aria-hidden="true" />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>

        {/* Bottom Staff Profile Footer */}
        <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] border-t border-slate-200/80 dark:border-slate-800/80 space-y-3 bg-white dark:bg-[#070D18]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#126BEB] text-white font-semibold flex items-center justify-center text-xs shrink-0">
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                {staffName || 'Staff User'}
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/60 text-[#126BEB] dark:text-[#38BDF8]">
                  {ROLE_LABELS[userRole] || 'Staff'}
                </span>
                {resolvedEmail && (
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {resolvedEmail}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => clearSessionAndRedirect('logout')}
            className="w-full h-11 flex items-center justify-center gap-2 px-3 rounded-lg text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-slate-200 dark:border-slate-800 transition-colors"
          >
            <LogOut className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
