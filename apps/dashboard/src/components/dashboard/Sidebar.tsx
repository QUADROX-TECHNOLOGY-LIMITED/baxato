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
  Wallet,
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
  onOpenKycModal: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({
  businessName,
  merchantName,
  kycStatus,
  onOpenKycModal,
  isOpen,
  onClose,
}: SidebarProps) {
  const pathname = usePathname();
  const isVerified = kycStatus === 'VERIFIED';

  const navGroups = [
    {
      title: 'CORE PLATFORM',
      items: [
        { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
        { label: 'Live Ledger', href: '/dashboard/ledger', icon: Receipt },
      ],
    },
    {
      title: 'VENDING SERVICES',
      items: [
        { label: 'Airtime Top-up', href: '/dashboard/airtime', icon: Smartphone },
        { label: 'Data Bundles', href: '/dashboard/data', icon: Wifi },
        { label: 'Electricity Tokens', href: '/dashboard/electricity', icon: Zap },
        { label: 'Cable TV (PayTV)', href: '/dashboard/cable', icon: Tv },
        { label: 'Exam PINs (WAEC/JAMB)', href: '/dashboard/education', icon: GraduationCap },
      ],
    },
    {
      title: 'FINANCE & PAYOUTS',
      items: [
        { label: 'Settlement Wallets', href: '/dashboard/wallets', icon: Wallet },
      ],
    },
    {
      title: 'DEVELOPERS & API',
      items: [
        { label: 'API Keys', href: '/dashboard/developer', icon: Key },
        { label: 'Webhooks & Events', href: '/dashboard/webhooks', icon: Webhook },
      ],
    },
    {
      title: 'ORGANIZATION',
      items: [
        { label: 'Team Members', href: '/dashboard/team', icon: Users },
        { label: 'Settings', href: '/dashboard/settings', icon: Settings },
      ],
    },
  ];

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

        {/* Business Selector Pill */}
        <div className="px-5 py-3.5 bg-slate-50/70 dark:bg-[#071120] border-b border-slate-200 dark:border-slate-800/80">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-[#126BEB]/10 dark:bg-[#126BEB]/20 text-[#126BEB] dark:text-[#38BDF8] flex items-center justify-center shrink-0 border border-[#126BEB]/20">
                <Building className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate block">
                  {businessName || 'Business Workspace'}
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 block">
                  {isVerified ? 'Production Tier' : 'Testing Environment'}
                </span>
              </div>
            </div>
            {isVerified ? (
              <span className="shrink-0 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 flex items-center gap-1 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Live
              </span>
            ) : (
              <span className="shrink-0 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25 flex items-center gap-1 shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                Sandbox
              </span>
            )}
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
                      onClick={() => onClose()}
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
          {/* KYC Status Card */}
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
                  {isVerified ? 'Verified Merchant' : 'Unverified Account'}
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
