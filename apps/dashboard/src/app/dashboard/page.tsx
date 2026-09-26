'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Wallet,
  Receipt,
  ArrowRight,
  ChevronRight,
  Clock,
  Lock,
  Eye,
  EyeOff,
  Plus,
  ShieldAlert,
  Sparkles,
  Key,
} from 'lucide-react';
import Sidebar from '@/components/dashboard/Sidebar';
import Header from '@/components/dashboard/Header';
import KycBanner from '@/components/dashboard/KycBanner';
import KycModal from '@/components/dashboard/KycModal';

export default function DashboardOverviewPage() {
  const router = useRouter();
  const [merchantName, setMerchantName] = useState('Merchant');
  const [userFirstName, setUserFirstName] = useState('');
  const [userLastName, setUserLastName] = useState('');
  const [businessName, setBusinessName] = useState('My Business');
  const [kycStatus, setKycStatus] = useState('UNVERIFIED');
  const [isKycModalOpen, setIsKycModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showBalance, setShowBalance] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('bx_user');
      const storedBiz = localStorage.getItem('bx_business');

      if (storedUser) {
        const u = JSON.parse(storedUser);
        if (u.firstName) {
          setMerchantName(u.firstName);
          setUserFirstName(u.firstName);
        }
        if (u.lastName) setUserLastName(u.lastName);
        if (u.kycStatus) {
          setKycStatus(u.kycStatus);
          if (u.kycStatus !== 'VERIFIED') {
            const timer = setTimeout(() => {
              setIsKycModalOpen(true);
            }, 600);
            return () => clearTimeout(timer);
          }
        }
      }

      if (storedBiz) {
        const b = JSON.parse(storedBiz);
        if (b.name) setBusinessName(b.name);
      }
    } catch {}
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 700);
  };

  const handleKycSuccess = (updatedUser: any) => {
    setKycStatus('VERIFIED');
    if (updatedUser?.firstName) setUserFirstName(updatedUser.firstName);
    if (updatedUser?.lastName) setUserLastName(updatedUser.lastName);
  };

  const handleServiceClick = (serviceName: string, serviceRoute: string) => {
    if (kycStatus !== 'VERIFIED') {
      setIsKycModalOpen(true);
      return;
    }
    router.push(serviceRoute);
  };

  const isVerified = kycStatus === 'VERIFIED';

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const services = [
    {
      id: 'airtime',
      name: 'Airtime Recharge',
      desc: 'Instant VTU airtime across all Nigerian telcos',
      route: '/dashboard/airtime',
      image: '/logos/categories/airtime.png',
      badgeText: '4 Networks',
      providers: [
        { name: 'MTN', logo: '/logos/telecom/mtn.svg' },
        { name: 'Airtel', logo: '/logos/telecom/airtel.svg' },
        { name: 'Glo', logo: '/logos/telecom/glo.svg' },
        { name: '9mobile', logo: '/logos/telecom/9mobile.svg' },
      ],
      glowBorder: 'hover:border-blue-500/50 hover:shadow-blue-500/10',
    },
    {
      id: 'data',
      name: 'Data Bundles',
      desc: 'SME, Corporate & Direct gifting bundles',
      route: '/dashboard/data',
      image: '/logos/categories/data.png',
      badgeText: '5G / SME',
      providers: [
        { name: 'MTN', logo: '/logos/telecom/mtn.svg' },
        { name: 'Airtel', logo: '/logos/telecom/airtel.svg' },
        { name: 'Glo', logo: '/logos/telecom/glo.svg' },
        { name: '9mobile', logo: '/logos/telecom/9mobile.svg' },
      ],
      glowBorder: 'hover:border-cyan-500/50 hover:shadow-cyan-500/10',
    },
    {
      id: 'electricity',
      name: 'Electricity Tokens',
      desc: 'Prepaid meter tokens & postpaid settlements',
      route: '/dashboard/electricity',
      image: '/logos/categories/electricity.png',
      badgeText: '11 DisCos',
      providers: [
        { name: 'IKEDC', logo: '/logos/electricity/ikedc.png' },
        { name: 'EKEDC', logo: '/logos/electricity/ekedc.png' },
        { name: 'AEDC', logo: '/logos/electricity/aedc.png' },
        { name: 'IBEDC', logo: '/logos/electricity/ibedc.png' },
      ],
      glowBorder: 'hover:border-amber-500/50 hover:shadow-amber-500/10',
    },
    {
      id: 'cable',
      name: 'Cable TV (PayTV)',
      desc: 'DStv, GOtv, StarTimes & Showmax renewals',
      route: '/dashboard/cable',
      image: '/logos/categories/cable.png',
      badgeText: 'Instant Reconnection',
      providers: [
        { name: 'DStv', logo: '/logos/cable/dstv.svg' },
        { name: 'GOtv', logo: '/logos/cable/gotv.png' },
        { name: 'StarTimes', logo: '/logos/cable/startimes.svg' },
        { name: 'Showmax', logo: '/logos/cable/showmax.svg' },
      ],
      glowBorder: 'hover:border-purple-500/50 hover:shadow-purple-500/10',
    },
    {
      id: 'education',
      name: 'Exam PINs',
      desc: 'WAEC, JAMB, NECO & NABTEB result PINs',
      route: '/dashboard/education',
      image: '/logos/categories/exam.png',
      badgeText: 'Instant Token',
      providers: [
        { name: 'WAEC', logo: '/logos/education/waec.png' },
        { name: 'JAMB', logo: '/logos/education/jamb.png' },
        { name: 'NECO', logo: '/logos/education/neco.png' },
        { name: 'NABTEB', logo: '/logos/education/nabteb.png' },
      ],
      glowBorder: 'hover:border-emerald-500/50 hover:shadow-emerald-500/10',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070D18] text-slate-800 dark:text-slate-100 flex flex-col lg:flex-row transition-colors duration-150">
      {/* Redesigned Sidebar */}
      <Sidebar
        businessName={businessName}
        merchantName={merchantName}
        kycStatus={kycStatus}
        onOpenKycModal={() => setIsKycModalOpen(true)}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-72">
        <Header
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onOpenKycModal={() => setIsKycModalOpen(true)}
          merchantName={merchantName}
          kycStatus={kycStatus}
          isRefreshing={isRefreshing}
          onRefresh={handleRefresh}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6 sm:space-y-8">
          {/* Identity Verification Warning Banner */}
          <KycBanner
            kycStatus={kycStatus}
            onOpenKycModal={() => setIsKycModalOpen(true)}
          />

          {/* Welcome Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                  {getGreeting()}, {merchantName}
                </h1>
                <span className="hidden sm:inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 dark:bg-blue-950/60 text-[#126BEB] dark:text-[#38BDF8] border border-blue-200/50 dark:border-blue-800/40">
                  {businessName}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                Manage your digital vending infrastructure, wallets, and provider routing.
              </p>
            </div>

            <div className="flex items-center gap-2.5">
              <Link
                href="/dashboard/developer"
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-200 shadow-sm transition-all"
              >
                <Key className="w-3.5 h-3.5 text-[#126BEB]" />
                <span>API Keys</span>
              </Link>
              <Link
                href="/dashboard/wallets"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#126BEB] hover:bg-[#0B5CC7] active:bg-[#094bb5] text-white shadow-sm shadow-blue-500/25 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Fund Wallet</span>
              </Link>
            </div>
          </div>

          {/* Financial Cards (Settlement Wallet & Volume) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {/* Settlement Wallet Card */}
            <div className="p-6 rounded-2xl bg-white dark:bg-[#0B1528] border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-colors pointer-events-none" />

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#126BEB] dark:text-[#38BDF8] flex items-center justify-center shrink-0 border border-blue-500/15">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-700 dark:text-slate-300 block">Settlement Wallet</span>
                    <span className="text-[10px] text-slate-400">Main Vending Balance</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowBalance(!showBalance)}
                    title={showBalance ? 'Hide Balance' : 'Show Balance'}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    {showBalance ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>

                  {isVerified ? (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25">
                      Live
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/25">
                      Sandbox
                    </span>
                  )}
                </div>
              </div>

              <div>
                <div className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                  {showBalance ? '₦0.00' : '••••••••'}
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Available for instant service fulfillment</p>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-400 text-[11px]">Commission Wallet: ₦0.00</span>
                <Link
                  href="/dashboard/wallets"
                  className="font-bold text-[#126BEB] dark:text-[#38BDF8] hover:underline flex items-center gap-1 text-[11px]"
                >
                  Manage Wallets <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Today's Transactions Volume Card */}
            <div className="p-6 rounded-2xl bg-white dark:bg-[#0B1528] border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 rounded-full blur-2xl group-hover:bg-purple-500/10 transition-colors pointer-events-none" />

              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0 border border-purple-500/15">
                    <Clock className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-700 dark:text-slate-300 block">Today&apos;s Volume</span>
                    <span className="text-[10px] text-slate-400">Total Vended Today</span>
                  </div>
                </div>

                <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  0 Transactions
                </span>
              </div>

              <div>
                <div className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                  ₦0.00
                </div>
                <div className="flex items-center gap-1.5 mt-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Gateways Operational (Interswitch & Monnify)</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-400 text-[11px]">Success Rate: 100%</span>
                <Link
                  href="/dashboard/ledger"
                  className="font-bold text-[#126BEB] dark:text-[#38BDF8] hover:underline flex items-center gap-1 text-[11px]"
                >
                  View Ledger <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* 3D CATEGORIES & VENDING SERVICES SECTION                */}
          {/* ======================================================== */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                    Vending Services
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-blue-500/10 text-[#126BEB] dark:text-[#38BDF8] border border-blue-500/20">
                    5 Verticals
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Select a category to vend airtime, data, electricity, pay TV, or exam scratch cards.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {services.map((svc) => (
                <button
                  key={svc.id}
                  onClick={() => handleServiceClick(svc.name, svc.route)}
                  className={`p-5 rounded-2xl bg-white dark:bg-[#0B1528] border border-slate-200/90 dark:border-slate-800 text-left transition-all duration-200 group relative flex flex-col justify-between min-h-[220px] shadow-sm hover:shadow-xl hover:-translate-y-1 ${svc.glowBorder}`}
                >
                  {/* Lock Indicator when unverified */}
                  {!isVerified && (
                    <div
                      className="absolute top-3.5 right-3.5 p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 z-10"
                      title="NIMC Verification required to unlock"
                    >
                      <Lock className="w-3.5 h-3.5" />
                    </div>
                  )}

                  {/* 3D Category Icon with Specular Floating Frame */}
                  <div className="flex items-start justify-between">
                    <div className="relative w-16 h-16 rounded-2xl overflow-hidden shadow-md shadow-slate-950/20 group-hover:scale-105 group-hover:rotate-1 transition-transform duration-300 border border-white/10 shrink-0 bg-[#070D18]">
                      <Image
                        src={svc.image}
                        alt={svc.name}
                        fill
                        sizes="64px"
                        priority
                        className="object-cover"
                      />
                    </div>

                    <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 dark:bg-[#070F1E] text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-800">
                      {svc.badgeText}
                    </span>
                  </div>

                  {/* Category Info */}
                  <div className="space-y-1 my-2">
                    <h3 className="text-sm font-black text-slate-900 dark:text-white group-hover:text-[#126BEB] dark:group-hover:text-[#38BDF8] transition-colors leading-tight">
                      {svc.name}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug line-clamp-2">
                      {svc.desc}
                    </p>
                  </div>

                  {/* Brand Logos Row & Action Arrow */}
                  <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                    <div className="flex items-center -space-x-1.5 overflow-hidden">
                      {svc.providers.map((p) => (
                        <div
                          key={p.name}
                          title={p.name}
                          className="w-5 h-5 rounded-full bg-white dark:bg-[#070E1C] border border-slate-200 dark:border-slate-700/80 p-0.5 relative shrink-0 shadow-xs"
                        >
                          <Image
                            src={p.logo}
                            alt={p.name}
                            fill
                            sizes="20px"
                            className="object-contain rounded-full"
                          />
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center gap-1 text-[11px] font-bold text-[#126BEB] dark:text-[#38BDF8] group-hover:translate-x-1 transition-transform">
                      <span>Vend</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* ======================================================== */}
          {/* RECENT TRANSACTIONS                                      */}
          {/* ======================================================== */}
          <div className="bg-white dark:bg-[#0B1528] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                  Recent Transactions
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Your latest vending and settlement ledger activity.
                </p>
              </div>

              <Link
                href="/dashboard/ledger"
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#126BEB] dark:text-[#38BDF8] hover:underline"
              >
                <span>View Full Ledger</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {/* Transactions Content / Clean Empty State */}
            {transactions.length === 0 ? (
              <div className="py-12 text-center rounded-xl bg-slate-50/60 dark:bg-[#070E1C]/60 border border-dashed border-slate-200 dark:border-slate-800">
                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-2.5">
                  <Receipt className="w-5 h-5" />
                </div>
                <h3 className="text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300">
                  No transactions yet
                </h3>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                  Live vending receipts and reconciliation records will populate here in real time.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-[#070F1E] border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">Reference</th>
                      <th className="py-3 px-4">Service</th>
                      <th className="py-3 px-4">Recipient</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                    {transactions.map((txn) => (
                      <tr key={txn.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
                        <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-white">
                          {txn.reference}
                        </td>
                        <td className="py-3 px-4">{txn.service}</td>
                        <td className="py-3 px-4 font-mono">{txn.recipient}</td>
                        <td className="py-3 px-4 font-bold">₦{txn.amount.toLocaleString()}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700">
                            {txn.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-400">{txn.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Identity Verification Modal */}
      <KycModal
        isOpen={isKycModalOpen}
        onClose={() => setIsKycModalOpen(false)}
        onSuccess={handleKycSuccess}
        userFirstName={userFirstName}
        userLastName={userLastName}
      />
    </div>
  );
}

