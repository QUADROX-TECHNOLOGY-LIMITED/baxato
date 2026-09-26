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

          {/* Wallet Section: Sleek Virtual Card & Today's Volume */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-stretch">
            {/* ATM Virtual Card (col-span-12 lg:col-span-7) */}
            <div className="lg:col-span-7 rounded-2xl p-4 sm:p-5 relative overflow-hidden shadow-lg bg-gradient-to-br from-[#0F1E36] via-[#091322] to-[#040A14] border border-slate-700/60 text-white flex flex-col justify-between group transition-all">
              {/* Subtle background glow */}
              <div className="absolute -right-16 -top-16 w-44 h-44 rounded-full bg-blue-500/10 blur-2xl group-hover:bg-blue-500/20 transition-all pointer-events-none" />

              {/* Card Top: Chip, Contactless Symbol & Brand */}
              <div className="flex items-center justify-between z-10">
                <div className="flex items-center gap-2.5">
                  {/* Golden EMV Chip */}
                  <div className="w-8 h-5.5 rounded bg-gradient-to-tr from-amber-400 via-amber-300 to-yellow-500 border border-amber-300/60 shadow-xs flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[1px] bg-amber-600/40" />
                    <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[1px] bg-amber-600/40" />
                    <div className="w-3.5 h-2.5 rounded-[2px] border border-amber-600/40" />
                  </div>
                  {/* Contactless waves symbol */}
                  <svg className="w-3.5 h-3.5 text-slate-400 rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.5 16.5a5 5 0 010-9M12 19a8.5 8.5 0 000-14M15.5 21.5a12 12 0 000-19" />
                  </svg>
                </div>

                <span className="text-xs font-black tracking-widest text-slate-300">BAXATO</span>
              </div>

              {/* Card Center: Balance Display */}
              <div className="my-2.5 z-10">
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <span>Available Balance</span>
                  <button
                    onClick={() => setShowBalance(!showBalance)}
                    className="text-slate-400 hover:text-white transition-colors p-0.5"
                    title={showBalance ? 'Hide Balance' : 'Show Balance'}
                  >
                    {showBalance ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="text-2xl sm:text-3xl font-mono font-bold tracking-tight text-white mt-0.5">
                  {showBalance ? '₦0.00' : '••••••••'}
                </div>
              </div>

              {/* Card Bottom: Holder Name & Quick Actions */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-2.5 border-t border-white/10 z-10">
                <span className="text-[11px] font-medium tracking-wide uppercase text-slate-300 truncate max-w-[200px]">
                  {merchantName} • {businessName}
                </span>

                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    href="/dashboard/wallets"
                    className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[#126BEB] hover:bg-[#0B5CC7] active:bg-[#094bb5] text-white flex items-center gap-1 shadow-xs transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Fund Wallet</span>
                  </Link>
                  <Link
                    href="/dashboard/developer"
                    className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/15 text-slate-200 flex items-center gap-1 border border-white/10 transition-colors"
                  >
                    <Key className="w-3.5 h-3.5 text-[#38BDF8]" />
                    <span>API Keys</span>
                  </Link>
                </div>
              </div>
            </div>

            {/* Today's Volume (col-span-12 lg:col-span-5) */}
            <div className="lg:col-span-5 p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0B1528] border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-col justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Today&apos;s Volume
                </span>
                <div className="mt-1.5">
                  <div className="text-2xl sm:text-3xl font-mono font-bold text-slate-900 dark:text-white">
                    ₦0.00
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">0 transactions completed today</p>
                </div>
              </div>

              <div className="pt-2.5 mt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <span>Real-time wallet settlement</span>
                <span className="text-slate-500 dark:text-slate-400 font-medium">Instant Vending</span>
              </div>
            </div>
          </div>

          {/* Vending Services Grid */}
          <div className="space-y-3">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                Vending Services
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Select a service to start vending
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
              {services.map((svc) => (
                <button
                  key={svc.id}
                  onClick={() => handleServiceClick(svc.name, svc.route)}
                  className="p-3.5 sm:p-4 rounded-xl bg-white dark:bg-[#0B1528] border border-slate-200/90 dark:border-slate-800 text-left transition-all duration-150 group relative flex flex-col justify-between shadow-xs hover:border-[#126BEB]/50 hover:shadow-md min-h-[160px]"
                >
                  {/* Subtle Lock in Corner when unverified */}
                  {!isVerified && (
                    <div
                      className="absolute top-2.5 right-2.5 p-1 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 z-10"
                      title="NIMC Verification required"
                    >
                      <Lock className="w-3 h-3" />
                    </div>
                  )}

                  <div className="space-y-2">
                    {/* 3D Category Icon */}
                    <div className="relative w-11 h-11 sm:w-12 sm:h-12 rounded-lg overflow-hidden shadow-xs bg-[#070D18]">
                      <Image
                        src={svc.image}
                        alt={svc.name}
                        fill
                        sizes="48px"
                        priority
                        className="object-cover"
                      />
                    </div>

                    <div>
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white group-hover:text-[#126BEB] dark:group-hover:text-[#38BDF8] transition-colors leading-tight">
                        {svc.name}
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5 line-clamp-1">
                        {svc.desc}
                      </p>
                    </div>
                  </div>

                  {/* Clean brand icons row */}
                  <div className="pt-2 mt-1.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
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

                    <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#126BEB] transition-transform group-hover:translate-x-0.5" />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Recent Transactions Section (Clean, Seamless, No Heavy Wrapper Card) */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                  Recent Transactions
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Latest vending activity and transaction status
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
              <div className="py-8 text-center text-xs text-slate-400 dark:text-slate-500">
                No transactions recorded yet. Real-time vending receipts will appear here.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1528]">
                <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-[#070F1E] border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                      <th className="py-2.5 px-4">Reference</th>
                      <th className="py-2.5 px-4">Service</th>
                      <th className="py-2.5 px-4">Recipient</th>
                      <th className="py-2.5 px-4">Amount</th>
                      <th className="py-2.5 px-4">Status</th>
                      <th className="py-2.5 px-4">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                    {transactions.map((txn) => (
                      <tr key={txn.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30">
                        <td className="py-2.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                          {txn.reference}
                        </td>
                        <td className="py-2.5 px-4">{txn.service}</td>
                        <td className="py-2.5 px-4 font-mono">{txn.recipient}</td>
                        <td className="py-2.5 px-4 font-bold">₦{txn.amount.toLocaleString()}</td>
                        <td className="py-2.5 px-4">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400">
                            {txn.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-slate-400">{txn.date}</td>
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
