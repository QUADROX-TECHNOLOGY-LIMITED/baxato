'use client';

import React from 'react';
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
  TrendingUp,
  Key,
  Webhook,
  ShieldCheck,
  Settings,
  Users,
  LogOut,
  X,
  Building,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

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

  const [activeRole, setActiveRole] = React.useState<string>(userRole || 'BUSINESS_OWNER');

  React.useEffect(() => {
    if (userRole) {
      setActiveRole(userRole);
    } else {
      try {
        const raw = localStorage.getItem('bx_user');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.role) setActiveRole(parsed.role);
        }
      } catch {}
    }
  }, [userRole]);

  const isOwnerOrAdmin = activeRole === 'BUSINESS_OWNER' || activeRole === 'BUSINESS_ADMIN';

  // Role-filtered navigation
  const navGroups = React.useMemo(() => {
    const allGroups = [
      {
        id: 'CORE',
        title: 'CORE PLATFORM',
        items: [
          { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
          { label: 'Transaction History', href: '/dashboard/ledger', icon: Receipt },
        ],
      },
      {
        id: 'SERVICES',
        title: 'SERVICES',
        items: [
          { label: 'Airtime Top-up', href: '/dashboard/airtime', icon: Smartphone },
          { label: 'Data Bundles', href: '/dashboard/data', icon: Wifi },
          { label: 'Electricity Tokens', href: '/dashboard/electricity', icon: Zap },
          { label: 'Cable TV (PayTV)', href: '/dashboard/cable', icon: Tv },
          { label: 'Exam PINs (WAEC/JAMB)', href: '/dashboard/education', icon: GraduationCap },
        ],
      },
      {
        id: 'ANALYTICS',
        title: 'ANALYTICS & INSIGHTS',
        items: [
          { label: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
        ],
      },
      {
        id: 'DEVELOPER',
        title: 'DEVELOPERS & API',
        items: [
          { label: 'API Keys', href: '/dashboard/developer', icon: Key },
          { label: 'Webhooks & Events', href: '/dashboard/webhooks', icon: Webhook },
        ],
      },
      {
        id: 'ORGANIZATION',
        title: 'ORGANIZATION',
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
        allGroups[0], // CORE
        allGroups[1], // SERVICES
        allGroups[2], // ANALYTICS
        allGroups[3], // DEVELOPER
        {
          id: 'ORGANIZATION',
          title: 'ORGANIZATION',
          items: [{ label: 'Settings', href: '/dashboard/settings', icon: Settings }],
        },
      ];
    }

    if (activeRole === 'FINANCE') {
      return [
        allGroups[0], // CORE
        allGroups[2], // ANALYTICS
        {
          id: 'ORGANIZATION',
          title: 'ORGANIZATION',
          items: [{ label: 'Settings', href: '/dashboard/settings', icon: Settings }],
        },
      ];
    }

    if (activeRole === 'SUPPORT') {
      return [
        allGroups[0], // CORE
        allGroups[1], // SERVICES
        allGroups[2], // ANALYTICS
        {
          id: 'ORGANIZATION',
          title: 'ORGANIZATION',
          items: [{ label: 'Settings', href: '/dashboard/settings', icon: Settings }],
        },
      ];
    }

    if (activeRole === 'VIEWER') {
      return [
        allGroups[0], // CORE
        allGroups[2], // ANALYTICS
        {
          id: 'ORGANIZATION',
          title: 'ORGANIZATION',
          items: [{ label: 'Settings', href: '/dashboard/settings', icon: Settings }],
        },
      ];
    }

    return allGroups;
  }, [activeRole, isOwnerOrAdmin]);

  const handleLogout = () => {
    try {
      localStorage.removeItem('bx_auth_token');
      localStorage.removeItem('bx_user');
      localStorage.removeItem('bx_business');
    } catch {}
    window.location.href = '/login';
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
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 bg-white dark:bg-[#060D18] border-r border-slate-200 dark:border-slate-800/80 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Header / Brand Logo */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="relative w-9 h-9 rounded-xl overflow-hidden shadow-sm border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0B1528] p-1 group-hover:scale-105 transition-transform">
              <Image
                src="/baxato-logo.jpg"
                alt="BAXATO"
                fill
                priority
                className="object-contain rounded-lg"
              />
            </div>
            <div>
              <span className="font-black text-xl tracking-tight text-slate-900 dark:text-white block leading-tight">
                BAXATO
              </span>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest block">
                Merchant Gateway
              </span>
            </div>
          </Link>

          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Business Workspace */}
        <div className="px-5 py-3 bg-slate-50/70 dark:bg-[#071120] border-b border-slate-200 dark:border-slate-800/80">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-[#126BEB]/10 dark:bg-[#126BEB]/20 text-[#126BEB] dark:text-[#38BDF8] flex items-center justify-center shrink-0 border border-[#126BEB]/20">
              <Building className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate block">
                {businessName || 'Business Workspace'}
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 block">
                Merchant Gateway
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Links Scrollable Area */}
        <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-6 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
          {navGroups.map((group) => (
            <div key={group.title}>
              <h3 className="px-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1.5">
                {group.title}
              </h3>
              <div className="space-y-1">
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
                          ? 'bg-[#126BEB] text-white shadow-md shadow-blue-500/25 font-bold'
                          : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/90 dark:hover:bg-[#0C1527] hover:translate-x-0.5'
                      }`}
                    >
                      <Icon
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

        {/* Bottom Profile & KYC Verification Box */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800/80 bg-slate-50/60 dark:bg-[#071120]/70 space-y-3">
          {isOwnerOrAdmin ? (
            /* KYC Status Card for Owner & Admin */
            <div
              onClick={!isVerified ? onOpenKycModal : undefined}
              className={`p-3 rounded-xl border text-xs transition-all ${
                isVerified
                  ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-800 dark:text-emerald-300'
                  : 'bg-amber-500/5 border-amber-500/25 text-amber-800 dark:text-amber-300 cursor-pointer hover:border-amber-400/50 shadow-sm hover:shadow'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold flex items-center gap-1.5 text-[11px]">
                  {isVerified ? (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      Identity Verified
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3.5 h-3.5 text-amber-500 shrink-0 animate-pulse" />
                      Identity Verification
                    </>
                  )}
                </span>
                {!isVerified && (
                  <span className="text-[10px] font-black uppercase text-[#126BEB] dark:text-[#38BDF8] underline">
                    Verify Now
                  </span>
                )}
              </div>
              <p className="text-[10.5px] leading-tight text-slate-500 dark:text-slate-400">
                {isVerified
                  ? 'Full production vending & payouts active.'
                  : 'Verify your NIMC identity to activate live services.'}
              </p>
            </div>
          ) : (
            /* Assigned Role Profile Card for Non-Admin Collaborators */
            <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/70 dark:bg-[#0C1527] text-xs">
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold flex items-center gap-1.5 text-[11px] text-slate-800 dark:text-slate-200">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#126BEB] dark:text-[#38BDF8] shrink-0" />
                  Assigned Role
                </span>
                <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-[#126BEB] dark:text-[#38BDF8] border border-blue-200 dark:border-blue-800/60">
                  {ROLE_TITLES[activeRole] || activeRole}
                </span>
              </div>
              <p className="text-[10.5px] leading-tight text-slate-500 dark:text-slate-400">
                Workspace collaborator permissions active.
              </p>
            </div>
          )}

          {/* User Profile & Logout */}
          <div className="flex items-center justify-between pt-0.5">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#126BEB] to-[#38BDF8] text-white font-black text-xs flex items-center justify-center shrink-0 shadow-sm">
                {merchantName ? merchantName.charAt(0).toUpperCase() : 'M'}
              </div>
              <div className="min-w-0">
                <span className="block text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                  {merchantName || 'Merchant'}
                </span>
                <span className="block text-[10px] font-medium text-slate-400 truncate">
                  {isOwnerOrAdmin
                    ? isVerified
                      ? 'Verified Merchant'
                      : 'Unverified Account'
                    : (ROLE_TITLES[activeRole] || 'Team Collaborator')}
                </span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              title="Sign Out"
              className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
