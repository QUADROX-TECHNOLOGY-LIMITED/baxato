'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Receipt,
  ArrowRight,
  ChevronRight,
  Lock,
  Eye,
  EyeOff,
  Plus,
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
      desc: 'MTN, Airtel, Glo & 9mobile',
      route: '/dashboard/airtime',
      image: '/logos/categories/airtime.png',
      providers: [
        { name: 'MTN', logo: '/logos/telecom/mtn.svg' },
        { name: 'Airtel', logo: '/logos/telecom/airtel.svg' },
        { name: 'Glo', logo: '/logos/telecom/glo.svg' },
        { name: '9mobile', logo: '/logos/telecom/9mobile.svg' },
      ],
    },
    {
      id: 'data',
      name: 'Data Bundles',
      desc: 'SME, Corporate & Direct gifting',
      route: '/dashboard/data',
      image: '/logos/categories/data.png',
      providers: [
        { name: 'MTN', logo: '/logos/telecom/mtn.svg' },
        { name: 'Airtel', logo: '/logos/telecom/airtel.svg' },
        { name: 'Glo', logo: '/logos/telecom/glo.svg' },
        { name: '9mobile', logo: '/logos/telecom/9mobile.svg' },
      ],
    },
    {
      id: 'electricity',
      name: 'Electricity Tokens',
      desc: 'Prepaid tokens & postpaid bills',
      route: '/dashboard/electricity',
      image: '/logos/categories/electricity.png',
      providers: [
        { name: 'IKEDC', logo: '/logos/electricity/ikedc.png' },
        { name: 'EKEDC', logo: '/logos/electricity/ekedc.png' },
        { name: 'AEDC', logo: '/logos/electricity/aedc.png' },
        { name: 'IBEDC', logo: '/logos/electricity/ibedc.png' },
      ],
    },
    {
      id: 'cable',
      name: 'Cable TV (PayTV)',
      desc: 'DStv, GOtv, StarTimes & Showmax',
      route: '/dashboard/cable',
      image: '/logos/categories/cable.png',
      providers: [
        { name: 'DStv', logo: '/logos/cable/dstv.svg' },
        { name: 'GOtv', logo: '/logos/cable/gotv.png' },
        { name: 'StarTimes', logo: '/logos/cable/startimes.svg' },
        { name: 'Showmax', logo: '/logos/cable/showmax.svg' },
      ],
    },
    {
      id: 'education',
      name: 'Exam PINs',
      desc: 'WAEC, JAMB, NECO & NABTEB',
      route: '/dashboard/education',
      image: '/logos/categories/exam.png',
      providers: [
        { name: 'WAEC', logo: '/logos/education/waec.png' },
        { name: 'JAMB', logo: '/logos/education/jamb.png' },
        { name: 'NECO', logo: '/logos/education/neco.png' },
        { name: 'NABTEB', logo: '/logos/education/nabteb.png' },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070D18] text-slate-800 dark:text-slate-100 flex flex-col lg:flex-row transition-colors duration-150">
      {/* Sidebar */}
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

          {/* Simple Greeting */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                {getGreeting()}, {merchantName}
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                {businessName} • Digital Vending Workspace
              </p>
            </div>
          </div>

          {/* Wallet Section: Luxury Virtual ATM Card & Performance Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
            {/* ATM Virtual Card (col-span-12 lg:col-span-7) */}
            <div className="lg:col-span-7 rounded-3xl p-6 sm:p-7 relative overflow-hidden shadow-xl bg-gradient-to-br from-[#0F1E36] via-[#091322] to-[#040A14] border border-slate-700/60 text-white flex flex-col justify-between min-h-[230px] group transition-all">
              {/* Card subtle holographic lighting */}
              <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-blue-500/15 blur-3xl group-hover:bg-blue-500/25 transition-all pointer-events-none" />
              <div className="absolute -left-16 -bottom-16 w-56 h-56 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />

              {/* Card Top: Chip, Waves, Brand & Tier */}
              <div className="flex items-center justify-between z-10">
                <div className="flex items-center gap-3">
                  {/* Golden EMV Chip Icon */}
                  <div className="w-10 h-7 rounded-md bg-gradient-to-tr from-amber-400 via-amber-300 to-yellow-500 border border-amber-300/60 shadow-inner flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[1px] bg-amber-600/50" />
                    <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[1px] bg-amber-600/50" />
                    <div className="w-4 h-3 rounded-[3px] border border-amber-600/40" />
                  </div>
                  {/* Contactless waves symbol */}
                  <svg className="w-4 h-4 text-slate-400 rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.5 16.5a5 5 0 010-9M12 19a8.5 8.5 0 000-14M15.5 21.5a12 12 0 000-19" />
                  </svg>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-black tracking-widest text-slate-300">BAXATO</span>
                  {isVerified ? (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> Sandbox
                    </span>
                  )}
                </div>
              </div>

              {/* Card Center: Balance Display */}
              <div className="my-4 z-10">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span>Available Vending Balance</span>
                  <button
                    onClick={() => setShowBalance(!showBalance)}
                    className="text-slate-400 hover:text-white transition-colors p-0.5"
                    title={showBalance ? 'Hide Balance' : 'Show Balance'}
                  >
                    {showBalance ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="text-3xl sm:text-4xl font-mono font-black tracking-tight text-white mt-1">
                  {showBalance ? '₦0.00' : '••••••••'}
                </div>
              </div>

              {/* Card Bottom: Holder Name & Quick Actions */}
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pt-3 border-t border-white/10 z-10">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 block">Account</span>
                  <span className="text-xs font-bold tracking-wide uppercase text-slate-200">
                    {merchantName} • {businessName}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    href="/dashboard/wallets"
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-[#126BEB] hover:bg-[#0B5CC7] active:bg-[#094bb5] text-white flex items-center gap-1.5 shadow-md shadow-blue-500/30 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Fund Wallet</span>
                  </Link>
                  <Link
                    href="/dashboard/developer"
                    className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/15 text-slate-200 flex items-center gap-1.5 border border-white/15 transition-all"
                  >
                    <Key className="w-3.5 h-3.5 text-[#38BDF8]" />
                    <span>Developer Area</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* Performance Overview (col-span-12 lg:col-span-5) */}
            <div className="lg:col-span-5 p-6 rounded-3xl bg-white dark:bg-[#0B1528] border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-col justify-between min-h-[230px]">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    Today&apos;s Volume
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
                    99.98% Gateway Uptime
                  </span>
                </div>
                <div className="mt-3">
                  <div className="text-3xl font-black text-slate-900 dark:text-white">
                    ₦0.00
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">0 transactions today</p>
                </div>
              </div>

              <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>Routing Gateways: Interswitch & Monnify</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Operational
                  </span>
                </div>
                <Link
                  href="/dashboard/ledger"
                  className="w-full py-2.5 rounded-xl text-xs font-bold text-center bg-slate-50 dark:bg-[#070F1E] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 flex items-center justify-center gap-1.5 transition-all"
                >
                  <span>View Full Settlement Ledger</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>

          {/* Vending Services Grid (Clean, No Cluttered Badges) */}
          <div className="space-y-3.5">
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                Vending Services
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Select a service to start vending
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
              {services.map((svc) => (
                <button
                  key={svc.id}
                  onClick={() => handleServiceClick(svc.name, svc.route)}
                  className="p-4 sm:p-4.5 rounded-2xl bg-white dark:bg-[#0B1528] border border-slate-200/90 dark:border-slate-800 text-left transition-all duration-200 group relative flex flex-col justify-between shadow-xs hover:shadow-lg hover:-translate-y-1 hover:border-[#126BEB]/50 min-h-[180px]"
                >
                  {/* Subtle Lock in Corner when unverified (no badge collision) */}
                  {!isVerified && (
                    <div
                      className="absolute top-3 right-3 p-1 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 z-10"
                      title="NIMC Verification required"
                    >
                      <Lock className="w-3 h-3" />
                    </div>
                  )}

                  <div className="space-y-2.5">
                    {/* 3D Category Icon */}
                    <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-xl overflow-hidden shadow-sm group-hover:scale-105 transition-transform duration-300 bg-[#070D18]">
                      <Image
                        src={svc.image}
                        alt={svc.name}
                        fill
                        sizes="56px"
                        priority
                        className="object-cover"
                      />
                    </div>

                    <div>
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-[#126BEB] dark:group-hover:text-[#38BDF8] transition-colors leading-tight">
                        {svc.name}
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight mt-1 line-clamp-1">
                        {svc.desc}
                      </p>
                    </div>
                  </div>

                  {/* Clean brand icons row */}
                  <div className="pt-2.5 mt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                    <div className="flex items-center -space-x-1 overflow-hidden">
                      {svc.providers.map((p) => (
                        <div
                          key={p.name}
                          title={p.name}
                          className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-white dark:bg-[#070E1C] border border-slate-200 dark:border-slate-700/80 p-0.5 relative shrink-0 shadow-xs"
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

                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#126BEB] group-hover:translate-x-0.5 transition-all" />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Recent Transactions (Clean & Responsive on Mobile) */}
          <div className="bg-white dark:bg-[#0B1528] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                  Recent Transactions
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Latest vending and settlement ledger activity
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

            {/* Transactions Content */}
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
                <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
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
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
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
