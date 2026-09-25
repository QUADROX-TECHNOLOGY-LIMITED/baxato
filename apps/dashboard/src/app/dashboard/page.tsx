'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Wallet,
  Smartphone,
  Wifi,
  Zap,
  Tv,
  GraduationCap,
  Receipt,
  ArrowRight,
  ChevronRight,
  Clock,
  Lock,
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
          // If unverified, prompt identity verification modal
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
      name: 'Airtime',
      desc: 'Instant recharge across all networks',
      route: '/dashboard/airtime',
      icon: Smartphone,
      color: 'bg-blue-50 dark:bg-blue-950/40 text-[#126BEB] dark:text-[#38BDF8]',
    },
    {
      id: 'data',
      name: 'Data Bundles',
      desc: 'SME, Corporate & Direct data',
      route: '/dashboard/data',
      icon: Wifi,
      color: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400',
    },
    {
      id: 'electricity',
      name: 'Electricity',
      desc: 'Prepaid & Postpaid meter tokens',
      route: '/dashboard/electricity',
      icon: Zap,
      color: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400',
    },
    {
      id: 'cable',
      name: 'Cable TV',
      desc: 'DSTV, GOtv, StarTimes & Showmax',
      route: '/dashboard/cable',
      icon: Tv,
      color: 'bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400',
    },
    {
      id: 'education',
      name: 'Exam PINs',
      desc: 'WAEC, NECO, JAMB & NABTEB',
      route: '/dashboard/education',
      icon: GraduationCap,
      color: 'bg-teal-50 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400',
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

          {/* Simple Clean Greeting */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              {getGreeting()}, {merchantName}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Welcome to your business dashboard.
            </p>
          </div>

          {/* Financial Cards (Settlement Wallet & Volume) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Settlement Wallet */}
            <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-xs">Settlement Wallet</span>
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#126BEB] dark:text-[#38BDF8] flex items-center justify-center">
                  <Wallet className="w-4 h-4" />
                </div>
              </div>

              <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                ₦0.00
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-400">Available for vending</span>
                <Link
                  href="/dashboard/wallets"
                  className="font-semibold text-[#126BEB] dark:text-[#38BDF8] hover:underline flex items-center gap-1"
                >
                  Fund Wallet <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Today's Transactions Volume */}
            <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span className="font-semibold text-xs">Today&apos;s Volume</span>
                <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
              </div>

              <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                ₦0.00
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <span>0 transactions today</span>
                <span>Active</span>
              </div>
            </div>
          </div>

          {/* ======================================================== */}
          {/* SERVICES SECTION (Clean 5 Cards)                         */}
          {/* ======================================================== */}
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                Services
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Select a service to start vending.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
              {services.map((svc) => {
                const Icon = svc.icon;
                return (
                  <button
                    key={svc.id}
                    onClick={() => handleServiceClick(svc.name, svc.route)}
                    className="p-4 rounded-xl bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800 text-left hover:border-[#126BEB] dark:hover:border-[#126BEB] hover:shadow-md transition-all group relative flex flex-col justify-between h-36"
                  >
                    {!isVerified && (
                      <div className="absolute top-3.5 right-3.5" title="Identity verification required">
                        <Lock className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                    )}
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${svc.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-[#126BEB] transition-colors">
                        {svc.name}
                      </h3>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                        {svc.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* ======================================================== */}
          {/* RECENT TRANSACTIONS                                      */}
          {/* ======================================================== */}
          <div className="bg-white dark:bg-[#0B1528] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                  Recent Transactions
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Your latest vending and wallet activity.
                </p>
              </div>

              <Link
                href="/dashboard/ledger"
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#126BEB] dark:text-[#38BDF8] hover:underline"
              >
                <span>View All</span>
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
                  Transactions will appear here once you begin vending services.
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
