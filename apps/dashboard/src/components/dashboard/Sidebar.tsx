'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Receipt,
  Smartphone,
  Wifi,
  Zap,
  Tv,
  GraduationCap,
  BarChart3,
  Key,
  Webhook,
  Settings,
  Users,
  LogOut,
  Power,
  X,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import BusinessSwitcher from './BusinessSwitcher';
import {
  getStoredUser,
  getStoredBusiness,
  clearSessionAndRedirect,
  type StoredUser,
} from '@/lib/auth-session';

interface SidebarProps {
  businessName: string;
  merchantName: string;
  kycStatus: string;
  userRole?: string;
  onOpenKycModal: () => void;
  isOpen: boolean;
  onClose: () => void;
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

export default function Sidebar({
  businessName,
  merchantName,
  kycStatus,
  userRole,
  onOpenKycModal,
  isOpen,
  onClose,
}: SidebarProps) {
  const pathname = usePathname();
  const isVerified = kycStatus === 'VERIFIED';

  const [activeRole, setActiveRole] = useState<string>(userRole || 'BUSINESS_OWNER');
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const [storedUser, setStoredUser] = useState<StoredUser | null>(() => {
    if (typeof window !== 'undefined') return getStoredUser();
    return null;
  });

  useEffect(() => {
    if (userRole) {
      setActiveRole(userRole);
    } else {
      try {
        const u = getStoredUser();
        if (u?.role) setActiveRole(u.role);
        if (u) setStoredUser(u);
      } catch {}
    }
  }, [userRole, merchantName]);

  const [currentBiz, setCurrentBiz] = useState(() => {
    if (typeof window !== 'undefined') return getStoredBusiness();
    return null;
  });

  useEffect(() => {
    const handleSwitched = (e: any) => {
      const b = e?.detail?.business || getStoredBusiness();
      if (b) setCurrentBiz(b);
      const u = getStoredUser();
      if (u) {
        setStoredUser(u);
        if (u.role) setActiveRole(u.role);
      }
    };
    window.addEventListener('bx_business_switched', handleSwitched);
    return () => window.removeEventListener('bx_business_switched', handleSwitched);
  }, []);

  // Close profile dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isOwnerOrAdmin = activeRole === 'BUSINESS_OWNER' || activeRole === 'BUSINESS_ADMIN';

  // Format clean display name and business name
  const displayName = useMemo(() => {
    if (merchantName && merchantName !== 'Merchant') return merchantName;
    if (storedUser?.firstName) {
      return `${storedUser.firstName} ${storedUser.lastName || ''}`.trim();
    }
    return merchantName || '';
  }, [merchantName, storedUser]);

  const displayBusiness = useMemo(() => {
    if (currentBiz?.name) return currentBiz.name;
    if (businessName) return businessName;
    return 'Verified Merchant';
  }, [currentBiz, businessName]);

  const avatarInitial = (displayName?.charAt(0) || '•').toUpperCase();

  // Role-filtered clean navigation groups
  const navGroups = useMemo(() => {
    const allGroups = [
      {
        id: 'MAIN',
        title: '',
        items: [
          { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
          { label: 'Transactions', href: '/dashboard/ledger', icon: Receipt },
          { label: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
        ],
      },
      {
        id: 'SERVICES',
        title: 'SERVICES',
        items: [
          { label: 'Airtime Top-up', href: '/dashboard/airtime', icon: Smartphone },
          { label: 'Data Bundles', href: '/dashboard/data', icon: Wifi },
          { label: 'Electricity', href: '/dashboard/electricity', icon: Zap },
          { label: 'Cable TV', href: '/dashboard/cable', icon: Tv },
          { label: 'Exam PINs', href: '/dashboard/education', icon: GraduationCap },
        ],
      },
      {
        id: 'DEVELOPER',
        title: 'DEVELOPER',
        items: [
          { label: 'API Keys', href: '/dashboard/developer', icon: Key },
          { label: 'Webhooks', href: '/dashboard/webhooks', icon: Webhook },
        ],
      },
      {
        id: 'ORGANIZATION',
        title: 'SETTINGS',
        items: [
          { label: 'Team Members', href: '/dashboard/team', icon: Users },
          { label: 'Settings', href: '/dashboard/settings', icon: Settings },
        ],
      },
    ];

    if (isOwnerOrAdmin) {
      return allGroups;
    }

    // Role-specific filtering
    if (activeRole === 'DEVELOPER') {
      return [
        allGroups[0],
        allGroups[1],
        allGroups[2],
        {
          id: 'ORGANIZATION',
          title: 'SETTINGS',
          items: [{ label: 'Settings', href: '/dashboard/settings', icon: Settings }],
        },
      ];
    }

    if (activeRole === 'FINANCE') {
      return [
        allGroups[0],
        {
          id: 'ORGANIZATION',
          title: 'SETTINGS',
          items: [{ label: 'Settings', href: '/dashboard/settings', icon: Settings }],
        },
      ];
    }

    if (activeRole === 'SUPPORT') {
      return [
        allGroups[0],
        allGroups[1],
        {
          id: 'ORGANIZATION',
          title: 'SETTINGS',
          items: [{ label: 'Settings', href: '/dashboard/settings', icon: Settings }],
        },
      ];
    }

    if (activeRole === 'VIEWER') {
      return [
        allGroups[0],
        {
          id: 'ORGANIZATION',
          title: 'SETTINGS',
          items: [{ label: 'Settings', href: '/dashboard/settings', icon: Settings }],
        },
      ];
    }

    return allGroups;
  }, [activeRole, isOwnerOrAdmin]);

  const handleLogout = () => {
    clearSessionAndRedirect('logout');
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-white dark:bg-[#060D18] border-r border-slate-200/80 dark:border-slate-800/80 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header / Brand Logo */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="relative w-8 h-8 rounded-xl overflow-hidden shadow-sm border border-slate-200/80 dark:border-white/10 bg-white dark:bg-[#0B1528] p-1 group-hover:scale-105 transition-transform">
              <Image
                src="/baxato-logo.jpg"
                alt="BAXATO"
                fill
                priority
                className="object-contain rounded-lg"
              />
            </div>
            <div>
              <span className="font-black text-lg tracking-tight text-slate-900 dark:text-white block leading-tight">
                BAXATO
              </span>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest block">
                Merchant Gateway
              </span>
            </div>
          </Link>

          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" strokeWidth={1.75} />
          </button>
        </div>

        {/* Business Workspace Switcher */}
        <div className="px-3.5 py-3 border-b border-slate-100 dark:border-slate-800/80">
          <BusinessSwitcher currentBusinessName={businessName} />
        </div>

        {/* Navigation Links Scrollable Area */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
          {navGroups.map((group) => (
            <div key={group.id}>
              {group.title ? (
                <h3 className="px-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1 mt-3">
                  {group.title}
                </h3>
              ) : null}
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={(e) => {
                        onClose();
                        if (
                          isOwnerOrAdmin &&
                          !isVerified &&
                          (item.href.startsWith('/dashboard/airtime') ||
                            item.href.startsWith('/dashboard/data') ||
                            item.href.startsWith('/dashboard/electricity') ||
                            item.href.startsWith('/dashboard/cable') ||
                            item.href.startsWith('/dashboard/education'))
                        ) {
                          e.preventDefault();
                          onOpenKycModal();
                        }
                      }}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                        isActive
                          ? 'bg-[#126BEB] text-white shadow-sm shadow-blue-500/20 font-bold'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-[#0C1527] hover:translate-x-0.5'
                      }`}
                    >
                      <Icon
                        strokeWidth={1.75}
                        className={`w-4 h-4 shrink-0 transition-colors ${
                          isActive
                            ? 'text-white'
                            : 'text-slate-400 dark:text-slate-500 group-hover:text-[#126BEB] dark:group-hover:text-[#38BDF8]'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Profile Pill Container (Directly emulating the reference layout) */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800/80 bg-white dark:bg-[#060D18]">
          <div className="relative" ref={profileMenuRef}>
            {/* Popover Menu Floating Upward */}
            {isProfileMenuOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-2 p-2 bg-white dark:bg-[#0A1324] border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-xl shadow-slate-900/10 dark:shadow-black/50 z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
                {/* User Info Header */}
                <div className="px-3 py-2.5 border-b border-slate-100 dark:border-slate-800/80 mb-1">
                  <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {displayName || 'Merchant'}
                  </div>
                  {storedUser?.email && (
                    <div className="text-[11px] text-slate-400 truncate mt-0.5">
                      {storedUser.email}
                    </div>
                  )}
                  <div className="mt-1.5 flex items-center gap-1.5">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/60 text-[#126BEB] dark:text-[#38BDF8] border border-blue-200/50 dark:border-blue-900/50">
                      {ROLE_TITLES[activeRole] || activeRole}
                    </span>
                    {isVerified && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-3 h-3" />
                        Verified
                      </span>
                    )}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="space-y-0.5">
                  <Link
                    href="/dashboard/settings"
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      onClose();
                    }}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
                  >
                    <Settings className="w-4 h-4 text-slate-400" strokeWidth={1.75} />
                    <span>Account Settings</span>
                  </Link>

                  {isOwnerOrAdmin && (
                    <Link
                      href="/dashboard/team"
                      onClick={() => {
                        setIsProfileMenuOpen(false);
                        onClose();
                      }}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors"
                    >
                      <Users className="w-4 h-4 text-slate-400" strokeWidth={1.75} />
                      <span>Team Members</span>
                    </Link>
                  )}

                  <div className="border-t border-slate-100 dark:border-slate-800/80 my-1" />

                  <button
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors text-left"
                  >
                    <LogOut className="w-4 h-4 text-rose-500" strokeWidth={1.75} />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}

            {/* Profile Card Pill */}
            <div className="flex items-center justify-between p-2 rounded-2xl bg-rose-50/20 dark:bg-[#0A1220] border border-rose-100/60 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
              <button
                type="button"
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="flex items-center gap-2.5 min-w-0 flex-1 text-left group pr-2"
                title="Account menu"
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#126BEB] to-[#38BDF8] text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm ring-1 ring-white dark:ring-slate-800">
                  {avatarInitial}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="block text-xs font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-[#126BEB] dark:group-hover:text-[#38BDF8] transition-colors leading-tight">
                    {displayName || 'Merchant'}
                  </span>
                  <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate leading-tight mt-0.5">
                    {displayBusiness}
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={handleLogout}
                title="Sign Out"
                className="p-1.5 rounded-xl text-rose-500/80 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors shrink-0"
              >
                <Power className="w-4 h-4" strokeWidth={2} />
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

