'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  Smartphone,
  Wifi,
  Zap,
  Tv,
  GraduationCap,
  Key,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  RefreshCw,
  SlidersHorizontal,
  Building,
  Lock,
  AlertTriangle,
  Copy,
  Check,
  Search,
  Filter,
  ArrowRight,
  Sparkles,
  Receipt,
} from 'lucide-react';
import Sidebar from '@/components/dashboard/Sidebar';
import Header from '@/components/dashboard/Header';
import KycBanner from '@/components/dashboard/KycBanner';
import KycModal from '@/components/dashboard/KycModal';

// Sample live ledger items for realistic demonstration
const INITIAL_TRANSACTIONS = [
  {
    id: 'txn_902184128912',
    reference: 'BX-AIR-902184',
    service: 'AIRTIME',
    provider: 'MTN',
    recipient: '08161437292',
    amount: 2000,
    commission: 40,
    status: 'SUCCESSFUL',
    date: 'Just now',
  },
  {
    id: 'txn_902184128913',
    reference: 'BX-PWR-419821',
    service: 'ELECTRICITY',
    provider: 'IKEDC',
    recipient: '01029384756',
    amount: 10000,
    commission: 120,
    status: 'SUCCESSFUL',
    date: '12 mins ago',
  },
  {
    id: 'txn_902184128914',
    reference: 'BX-DAT-812739',
    service: 'DATA',
    provider: 'AIRTEL',
    recipient: '08023456789',
    amount: 3500,
    commission: 85,
    status: 'SUCCESSFUL',
    date: '45 mins ago',
  },
  {
    id: 'txn_902184128915',
    reference: 'BX-CAB-618293',
    service: 'CABLE_TV',
    provider: 'DSTV',
    recipient: '7029182391',
    amount: 14500,
    commission: 150,
    status: 'SUCCESSFUL',
    date: '2 hours ago',
  },
];

export default function DashboardOverviewPage() {
  const [merchantName, setMerchantName] = useState('Merchant');
  const [userFirstName, setUserFirstName] = useState('');
  const [userLastName, setUserLastName] = useState('');
  const [businessName, setBusinessName] = useState('My Business Enterprise');
  const [kycStatus, setKycStatus] = useState('UNVERIFIED');
  const [isKycModalOpen, setIsKycModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedRef, setCopiedRef] = useState<string | null>(null);
  const [activeServiceTab, setActiveServiceTab] = useState<'AIRTIME' | 'DATA' | 'ELECTRICITY' | 'CABLE' | 'EDUCATION'>('AIRTIME');
  const [ledgerFilter, setLedgerFilter] = useState('ALL');
  const [vendingNotice, setVendingNotice] = useState<string | null>(null);

  // Initialize merchant profile from local state and check KYC requirement
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
          // If the user has just registered or is unverified, prompt KYC modal automatically
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

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRef(text);
    setTimeout(() => setCopiedRef(null), 1500);
  };

  const handleKycSuccess = (updatedUser: any) => {
    setKycStatus('VERIFIED');
    setVendingNotice(null);
  };

  const handleServiceClick = (serviceName: string) => {
    if (kycStatus !== 'VERIFIED') {
      setVendingNotice(`Verification Required: Please link your National Identity Number (NIN) to unlock automated ${serviceName} vending.`);
      setIsKycModalOpen(true);
      return;
    }
    // Verified: navigate or open vending flow
    alert(`${serviceName} vending interface is active. Select plan/provider to vend.`);
  };

  const isVerified = kycStatus === 'VERIFIED';

  // Time-of-day greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070D18] text-slate-800 dark:text-slate-100 flex flex-col lg:flex-row transition-colors duration-150">
      {/* Responsive Collapsible Sidebar */}
      <Sidebar
        businessName={businessName}
        merchantName={merchantName}
        kycStatus={kycStatus}
        onOpenKycModal={() => setIsKycModalOpen(true)}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main App Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-72">
        {/* Sticky Header */}
        <Header
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onOpenFundWallet={() => handleServiceClick('Wallet Funding')}
          onOpenKycModal={() => setIsKycModalOpen(true)}
          merchantName={merchantName}
          kycStatus={kycStatus}
          isRefreshing={isRefreshing}
          onRefresh={handleRefresh}
        />

        {/* Scrollable Main Canvas */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6 sm:space-y-8">
          {/* Mandatory KYC Warning Banner (Displayed when unverified) */}
          <KycBanner
            kycStatus={kycStatus}
            onOpenKycModal={() => setIsKycModalOpen(true)}
          />

          {/* Welcome Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-[#126BEB] dark:text-[#38BDF8] mb-1">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{getGreeting()}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                {merchantName}&apos;s Merchant Console
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                Workspace for <strong className="text-slate-800 dark:text-slate-200 font-bold">{businessName}</strong> • Automated VTU, utility settlement, and payment gateway.
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => handleServiceClick('Wallet Funding')}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#126BEB] hover:bg-[#0B5CC7] active:bg-[#094bb5] text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all active:scale-[0.98]"
              >
                <Wallet className="w-4 h-4" />
                <span>Fund Settlement Wallet</span>
              </button>
            </div>
          </div>

          {/* 4 Financial & Compliance KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Main Settlement Wallet */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="p-5 rounded-2xl bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800/80 shadow-sm relative overflow-hidden group hover:border-[#126BEB]/50 transition-colors"
            >
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
                <span className="font-bold uppercase tracking-wider text-[11px]">Main Settlement</span>
                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#126BEB] dark:text-[#38BDF8] flex items-center justify-center">
                  <Wallet className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                ₦0.00
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-normal">Available for vending</span>
                <button
                  onClick={() => handleServiceClick('Wallet Funding')}
                  className="font-bold text-[#126BEB] dark:text-[#38BDF8] hover:underline flex items-center gap-1"
                >
                  Top Up <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </motion.div>

            {/* Commission Earnings Wallet */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="p-5 rounded-2xl bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800/80 shadow-sm relative overflow-hidden group hover:border-emerald-500/50 transition-colors"
            >
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
                <span className="font-bold uppercase tracking-wider text-[11px]">Commission Wallet</span>
                <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                ₦0.00
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-normal">Instant cash reward</span>
                <button
                  onClick={() => handleServiceClick('Commission Sweep')}
                  className="font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                >
                  Sweep <ArrowUpRight className="w-3 h-3" />
                </button>
              </div>
            </motion.div>

            {/* Today's Transactions Volume */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="p-5 rounded-2xl bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800/80 shadow-sm relative overflow-hidden group hover:border-purple-500/50 transition-colors"
            >
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
                <span className="font-bold uppercase tracking-wider text-[11px]">Today&apos;s Volume</span>
                <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                ₦0.00
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-normal">0 successful vendings</span>
                <span className="font-bold text-purple-600 dark:text-purple-400">99.98% uptime</span>
              </div>
            </motion.div>

            {/* KYC & Identity Status Card */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              onClick={!isVerified ? () => setIsKycModalOpen(true) : undefined}
              className={`p-5 rounded-2xl border shadow-sm relative overflow-hidden transition-all ${
                isVerified
                  ? 'bg-white dark:bg-[#0B1528] border-slate-200 dark:border-slate-800/80 hover:border-emerald-500/50'
                  : 'bg-amber-50/50 dark:bg-[#1A180E] border-amber-300 dark:border-amber-900/60 cursor-pointer hover:border-amber-500 shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
                <span className="font-bold uppercase tracking-wider text-[11px]">NIN Compliance</span>
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                    isVerified
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                      : 'bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`text-xl sm:text-2xl font-black tracking-tight ${
                    isVerified
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-amber-600 dark:text-amber-400'
                  }`}
                >
                  {isVerified ? 'Tier 1 Verified' : 'Tier 0 Unverified'}
                </span>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-normal">
                  {isVerified ? 'Limit: ₦5M / day' : 'Daily cap: ₦0'}
                </span>
                <span
                  className={`font-bold flex items-center gap-1 ${
                    isVerified ? 'text-emerald-600 dark:text-emerald-400' : 'text-[#126BEB] underline'
                  }`}
                >
                  {isVerified ? 'Active' : 'Verify NIN'}
                </span>
              </div>
            </motion.div>
          </div>

          {/* ======================================================== */}
          {/* DIRECT TELECOM & UTILITY VENDING HUB                     */}
          {/* ======================================================== */}
          <div className="bg-white dark:bg-[#0B1528] rounded-3xl border border-slate-200 dark:border-slate-800/80 p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  <span>Direct Telecom &amp; Utility Vending</span>
                  {!isVerified && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center gap-1">
                      <Lock className="w-3 h-3" /> Locked until verified
                    </span>
                  )}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Automated sub-second vending to all Nigerian DISCOs, telecom networks, and cable operators.
                </p>
              </div>

              {/* Service Navigation Tabs */}
              <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-[#070E1C] border border-slate-200/80 dark:border-slate-800 overflow-x-auto">
                {[
                  { id: 'AIRTIME', label: 'Airtime', icon: Smartphone },
                  { id: 'DATA', label: 'Data', icon: Wifi },
                  { id: 'ELECTRICITY', label: 'Electricity', icon: Zap },
                  { id: 'CABLE', label: 'Cable TV', icon: Tv },
                  { id: 'EDUCATION', label: 'Exam PINs', icon: GraduationCap },
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeServiceTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveServiceTab(tab.id as any)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                        isActive
                          ? 'bg-[#126BEB] text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{tab.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* TAB CONTENT: AIRTIME */}
            {activeServiceTab === 'AIRTIME' && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { name: 'MTN Nigeria', discount: '2.5% Discount', color: 'bg-yellow-400/20 text-yellow-700 dark:text-yellow-300 border-yellow-400/40', badge: 'MTN' },
                  { name: 'Airtel Nigeria', discount: '2.0% Discount', color: 'bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/40', badge: 'AIRTEL' },
                  { name: 'Glo Mobile', discount: '3.0% Discount', color: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40', badge: 'GLO' },
                  { name: '9mobile', discount: '3.5% Discount', color: 'bg-teal-500/20 text-teal-700 dark:text-teal-300 border-teal-500/40', badge: '9MOBILE' },
                ].map((provider) => (
                  <button
                    key={provider.name}
                    onClick={() => handleServiceClick(`Airtime (${provider.name})`)}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-[#070E1C] border border-slate-200/80 dark:border-slate-800 text-left hover:border-[#126BEB] hover:shadow-md transition-all group relative overflow-hidden"
                  >
                    {!isVerified && (
                      <div className="absolute top-2 right-2">
                        <Lock className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                    )}
                    <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-black border ${provider.color} mb-3`}>
                      {provider.badge}
                    </span>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white block group-hover:text-[#126BEB] transition-colors">
                      {provider.name}
                    </h4>
                    <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                      {provider.discount}
                    </p>
                  </button>
                ))}
              </div>
            )}

            {/* TAB CONTENT: DATA */}
            {activeServiceTab === 'DATA' && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { name: 'MTN SME & Corporate', discount: 'From ₦240 / GB', badge: 'MTN' },
                  { name: 'Airtel Gifting & SME', discount: 'From ₦255 / GB', badge: 'AIRTEL' },
                  { name: 'Glo Corporate Data', discount: 'From ₦230 / GB', badge: 'GLO' },
                  { name: '9mobile Direct Bundles', discount: 'From ₦260 / GB', badge: '9MOBILE' },
                ].map((provider) => (
                  <button
                    key={provider.name}
                    onClick={() => handleServiceClick(`Data (${provider.name})`)}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-[#070E1C] border border-slate-200/80 dark:border-slate-800 text-left hover:border-[#126BEB] hover:shadow-md transition-all group relative"
                  >
                    {!isVerified && (
                      <div className="absolute top-2 right-2">
                        <Lock className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                    )}
                    <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-black bg-blue-50 dark:bg-blue-950/60 text-[#126BEB] border border-blue-200 dark:border-blue-900/40 mb-3">
                      {provider.badge} DATA
                    </span>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white block group-hover:text-[#126BEB] transition-colors">
                      {provider.name}
                    </h4>
                    <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                      {provider.discount}
                    </p>
                  </button>
                ))}
              </div>
            )}

            {/* TAB CONTENT: ELECTRICITY */}
            {activeServiceTab === 'ELECTRICITY' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
                {[
                  { name: 'Ikeja Electric', code: 'IKEDC', zone: 'Lagos Mainland' },
                  { name: 'Eko Electricity', code: 'EKEDC', zone: 'Lagos Island' },
                  { name: 'Abuja Electricity', code: 'AEDC', zone: 'FCT, Niger, Kogi' },
                  { name: 'Ibadan Electricity', code: 'IBEDC', zone: 'Oyo, Ogun, Osun' },
                  { name: 'Port Harcourt DisCo', code: 'PHED', zone: 'Rivers, Bayelsa' },
                  { name: 'Enugu Electricity', code: 'EEDC', zone: 'South East' },
                  { name: 'Kano Electricity', code: 'KEDCO', zone: 'Kano, Katsina' },
                  { name: 'Benin Electricity', code: 'BEDC', zone: 'Edo, Delta, Ondo' },
                ].map((disco) => (
                  <button
                    key={disco.code}
                    onClick={() => handleServiceClick(`Electricity (${disco.code})`)}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-[#070E1C] border border-slate-200/80 dark:border-slate-800 text-left hover:border-amber-500 hover:shadow-md transition-all group relative"
                  >
                    {!isVerified && (
                      <div className="absolute top-2 right-2">
                        <Lock className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                    )}
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-4 h-4 text-amber-500" />
                      <span className="font-extrabold text-xs text-slate-900 dark:text-white">
                        {disco.code}
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                      {disco.name}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                      {disco.zone}
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* TAB CONTENT: CABLE TV */}
            {activeServiceTab === 'CABLE' && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { name: 'DSTV Nigeria', code: 'DSTV', desc: 'Premium, Compact, Yanga' },
                  { name: 'GOtv Nigeria', code: 'GOTV', desc: 'Supa, Max, Jinja' },
                  { name: 'StarTimes', code: 'STARTIMES', desc: 'Nova, Basic, Classic' },
                  { name: 'Showmax', code: 'SHOWMAX', desc: 'Mobile & Pro Entertainment' },
                ].map((cable) => (
                  <button
                    key={cable.code}
                    onClick={() => handleServiceClick(`Cable TV (${cable.code})`)}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-[#070E1C] border border-slate-200/80 dark:border-slate-800 text-left hover:border-purple-500 hover:shadow-md transition-all group relative"
                  >
                    {!isVerified && (
                      <div className="absolute top-2 right-2">
                        <Lock className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                    )}
                    <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-black bg-purple-50 dark:bg-purple-950/60 text-purple-600 border border-purple-200 dark:border-purple-900/40 mb-3">
                      {cable.code}
                    </span>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white block group-hover:text-purple-600 transition-colors">
                      {cable.name}
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {cable.desc}
                    </p>
                  </button>
                ))}
              </div>
            )}

            {/* TAB CONTENT: EXAM PINS */}
            {activeServiceTab === 'EDUCATION' && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { name: 'WAEC Result Checker', code: 'WAEC', fee: '₦3,500 / token' },
                  { name: 'NECO Result Token', code: 'NECO', fee: '₦1,200 / token' },
                  { name: 'JAMB UTME / DE PIN', code: 'JAMB', fee: 'Official E-PIN' },
                  { name: 'NABTEB Result Checker', code: 'NABTEB', fee: '₦1,000 / token' },
                ].map((exam) => (
                  <button
                    key={exam.code}
                    onClick={() => handleServiceClick(`Exam PIN (${exam.code})`)}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-[#070E1C] border border-slate-200/80 dark:border-slate-800 text-left hover:border-emerald-500 hover:shadow-md transition-all group relative"
                  >
                    {!isVerified && (
                      <div className="absolute top-2 right-2">
                        <Lock className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                    )}
                    <span className="inline-block px-2.5 py-1 rounded-lg text-xs font-black bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 border border-emerald-200 dark:border-emerald-900/40 mb-3">
                      {exam.code}
                    </span>
                    <h4 className="text-xs font-bold text-slate-900 dark:text-white block group-hover:text-emerald-600 transition-colors">
                      {exam.name}
                    </h4>
                    <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
                      {exam.fee}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ======================================================== */}
          {/* LIVE FINANCIAL LEDGER & RECENT TRANSACTIONS               */}
          {/* ======================================================== */}
          <div className="bg-white dark:bg-[#0B1528] rounded-3xl border border-slate-200 dark:border-slate-800/80 p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-[#126BEB]" />
                  <span>Real-Time Financial Ledger</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Live cryptographic ledger with dual-entry accounting and instant commission auditing.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href="/dashboard/ledger"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors"
                >
                  <span>View All Ledger Entries</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Transactions Table */}
            <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800/80">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-[#070F1E] border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Transaction Ref</th>
                    <th className="py-3 px-4">Service</th>
                    <th className="py-3 px-4">Recipient / Meter</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Commission</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                  {INITIAL_TRANSACTIONS.map((txn) => (
                    <tr
                      key={txn.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-900 dark:text-white">
                        <div className="flex items-center gap-1.5">
                          <span>{txn.reference}</span>
                          <button
                            onClick={() => handleCopy(txn.reference)}
                            title="Copy reference"
                            className="text-slate-400 hover:text-slate-700 dark:hover:text-white"
                          >
                            {copiedRef === txn.reference ? (
                              <Check className="w-3 h-3 text-emerald-500" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 dark:bg-blue-950/60 text-[#126BEB] dark:text-[#38BDF8] border border-blue-200 dark:border-blue-900/40">
                          {txn.provider} {txn.service}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-slate-300">
                        {txn.recipient}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">
                        ₦{txn.amount.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-emerald-600 dark:text-emerald-400">
                        +₦{txn.commission.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          SUCCESSFUL
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400">
                        {txn.date}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ======================================================== */}
          {/* DEVELOPER API & PROGRAMMATIC VENDING CALLOUT              */}
          {/* ======================================================== */}
          <div className="rounded-3xl bg-gradient-to-r from-slate-900 to-[#0B1528] text-white p-6 sm:p-8 border border-slate-800 shadow-xl relative overflow-hidden">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
              <div className="max-w-xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-[#38BDF8] border border-blue-500/30 text-xs font-bold mb-3">
                  <Key className="w-3.5 h-3.5" />
                  <span>Developer REST API Platform</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  Integrate Automated Telecom Vending Directly Into Your App
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 mt-2 leading-relaxed">
                  Generate your secure API Keys, configure automated webhooks, and dispense airtime, data bundles, and electricity tokens with a single cURL request.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <Link
                  href="/dashboard/developer"
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#126BEB] hover:bg-[#0B5CC7] text-white text-xs font-bold transition-all shadow-lg shadow-blue-500/30"
                >
                  <Key className="w-4 h-4" />
                  <span>Manage API Keys</span>
                </Link>
                <a
                  href="https://api.baxato.com/docs"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold transition-all border border-white/10"
                >
                  <span>Interactive API Docs</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Interactive NIN Verification Modal */}
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
