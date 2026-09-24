'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
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
  Bell,
  SlidersHorizontal,
  Building,
} from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';

export default function DashboardOverviewPage() {
  const [merchantName, setMerchantName] = useState('Merchant');
  const [businessName, setBusinessName] = useState('My Business');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem('bx_user');
      const storedBiz = localStorage.getItem('bx_business');
      if (storedUser) {
        const u = JSON.parse(storedUser);
        if (u.firstName) setMerchantName(u.firstName);
      }
      if (storedBiz) {
        const b = JSON.parse(storedBiz);
        if (b.name) setBusinessName(b.name);
      }
    } catch {}
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 800);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#060D1A] text-slate-800 dark:text-slate-100 transition-colors duration-200">
      {/* Top Navigation */}
      <header className="sticky top-0 z-30 w-full bg-white/90 dark:bg-[#071022]/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800/80 px-4 sm:px-8 py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Brand & Business Selector */}
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="flex items-center gap-2.5 group">
              <div className="relative w-8 h-8 rounded-xl overflow-hidden border border-slate-200 dark:border-blue-900/60 shadow-sm bg-white dark:bg-white/5 p-0.5">
                <Image
                  src="/baxato-logo.jpg"
                  alt="BAXATO"
                  fill
                  priority
                  className="object-contain rounded-lg"
                />
              </div>
              <span className="font-extrabold text-xl tracking-tight text-slate-900 dark:text-white">
                BAXATO
              </span>
            </Link>

            <span className="hidden sm:inline-block text-slate-300 dark:text-slate-700">|</span>

            {/* Business Badge */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-100 dark:bg-[#0D1728] border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200">
              <Building className="w-3.5 h-3.5 text-[#126BEB]" />
              <span className="truncate max-w-[160px]">{businessName}</span>
              <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 font-bold">
                ACTIVE
              </span>
            </div>
          </div>

          {/* Right Utilities */}
          <div className="flex items-center gap-3">
            {/* System Status Pill */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-xs text-emerald-700 dark:text-emerald-300 font-semibold">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Grid: Operational</span>
            </div>

            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              title="Refresh Balance"
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-[#126BEB]' : ''}`} />
            </button>

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* User Profile Pill */}
            <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-800">
              <div className="w-8 h-8 rounded-full bg-[#126BEB] text-white font-bold text-xs flex items-center justify-center shadow-sm shadow-blue-500/20">
                {merchantName.charAt(0).toUpperCase()}
              </div>
              <span className="hidden lg:inline text-xs font-semibold text-slate-800 dark:text-slate-200">
                {merchantName}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-8 py-8 space-y-8">
        {/* Welcome Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Welcome, {merchantName} 👋
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Your merchant workspace for <strong className="text-slate-800 dark:text-slate-200">{businessName}</strong> is provisioned and ready.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#126BEB] hover:bg-[#0B5CC7] text-white text-xs font-semibold shadow-md shadow-blue-500/20 transition-all active:scale-[0.98]">
              <Wallet className="w-3.5 h-3.5" />
              <span>Fund Settlement Wallet</span>
            </button>
          </div>
        </div>

        {/* 4 Key Financial Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Main Wallet */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="p-5 rounded-2xl bg-white dark:bg-[#0A1324] border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-[#126BEB]/40 transition-colors"
          >
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
              <span className="font-semibold uppercase tracking-wider text-[11px]">Main Settlement</span>
              <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#126BEB] flex items-center justify-center">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              ₦0.00
            </div>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-slate-400 font-normal">Available for vending</span>
              <span className="font-semibold text-[#126BEB] hover:underline cursor-pointer flex items-center gap-1">
                Top up <ChevronRight className="w-3 h-3" />
              </span>
            </div>
          </motion.div>

          {/* Commission Wallet */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-5 rounded-2xl bg-white dark:bg-[#0A1324] border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-emerald-500/40 transition-colors"
          >
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
              <span className="font-semibold uppercase tracking-wider text-[11px]">Commission Wallet</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              ₦0.00
            </div>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-slate-400 font-normal">Accumulated earnings</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">0% fee payout</span>
            </div>
          </motion.div>

          {/* Today's Transactions */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="p-5 rounded-2xl bg-white dark:bg-[#0A1324] border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-purple-500/40 transition-colors"
          >
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
              <span className="font-semibold uppercase tracking-wider text-[11px]">Today&apos;s Volume</span>
              <div className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              ₦0.00
            </div>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-slate-400 font-normal">0 successful vendings</span>
              <span className="font-semibold text-purple-600 dark:text-purple-400">Real-time</span>
            </div>
          </motion.div>

          {/* KYC & Identity Status */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-5 rounded-2xl bg-white dark:bg-[#0A1324] border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:border-blue-500/40 transition-colors"
          >
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
              <span className="font-semibold uppercase tracking-wider text-[11px]">NIN Compliance</span>
              <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-[#126BEB] flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400 tracking-tight flex items-center gap-2">
              <span>Tier 1 Basic</span>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs">
              <span className="text-slate-400 font-normal">Daily cap: ₦50,000</span>
              <span className="font-semibold text-[#126BEB] hover:underline cursor-pointer">
                Verify NIN
              </span>
            </div>
          </motion.div>
        </div>

        {/* Quick Telecom & Utility Services Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Direct Telecom &amp; Utility Vending
            </h2>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Automated 2-second fulfillment
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            {/* Airtime */}
            <div className="p-4 rounded-xl bg-white dark:bg-[#0A1324] border border-slate-200 dark:border-slate-800 hover:border-[#126BEB] transition-all cursor-pointer group shadow-sm flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-[#126BEB] flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform">
                <Smartphone className="w-5 h-5" />
              </div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">Airtime Top-up</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Up to 3% discount</p>
            </div>

            {/* Data */}
            <div className="p-4 rounded-xl bg-white dark:bg-[#0A1324] border border-slate-200 dark:border-slate-800 hover:border-[#126BEB] transition-all cursor-pointer group shadow-sm flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform">
                <Wifi className="w-5 h-5" />
              </div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">Data Bundles</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">SME &amp; Gifting</p>
            </div>

            {/* Electricity */}
            <div className="p-4 rounded-xl bg-white dark:bg-[#0A1324] border border-slate-200 dark:border-slate-800 hover:border-[#126BEB] transition-all cursor-pointer group shadow-sm flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform">
                <Zap className="w-5 h-5" />
              </div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">Electricity</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">All 11 DISCOs</p>
            </div>

            {/* Cable TV */}
            <div className="p-4 rounded-xl bg-white dark:bg-[#0A1324] border border-slate-200 dark:border-slate-800 hover:border-[#126BEB] transition-all cursor-pointer group shadow-sm flex flex-col items-center text-center">
              <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform">
                <Tv className="w-5 h-5" />
              </div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">Cable TV</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">DStv, GOtv, StarTimes</p>
            </div>

            {/* Education PINs */}
            <div className="p-4 rounded-xl bg-white dark:bg-[#0A1324] border border-slate-200 dark:border-slate-800 hover:border-[#126BEB] transition-all cursor-pointer group shadow-sm flex flex-col items-center text-center col-span-2 sm:col-span-1">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2.5 group-hover:scale-110 transition-transform">
                <GraduationCap className="w-5 h-5" />
              </div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white">Exam PINs</h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">WAEC, JAMB, NECO</p>
            </div>
          </div>
        </div>

        {/* Developer Integration & Getting Started Checklist */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Developer Quickstart */}
          <div className="p-6 rounded-2xl bg-white dark:bg-[#0A1324] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Key className="w-4 h-4 text-[#126BEB]" />
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Developer API Integration
                </h3>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-blue-50 dark:bg-blue-950/60 text-[#126BEB]">
                REST v1.0
              </span>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Integrate BAXATO vending into your website, mobile app, or ERP with our ultra-fast REST API and instant webhooks.
            </p>

            <div className="bg-slate-900 text-slate-200 rounded-xl p-3.5 text-xs font-mono overflow-x-auto border border-slate-800">
              <span className="text-emerald-400">POST</span> https://api.baxato.ng/v1/airtime/vend
            </div>

            <div className="flex items-center gap-3 pt-1">
              <button className="px-3.5 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                Generate API Keys
              </button>
              <a
                href="https://api.baxato.ng/docs"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#126BEB] hover:underline"
              >
                <span>Read API Reference</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Quick Onboarding Progress */}
          <div className="p-6 rounded-2xl bg-white dark:bg-[#0A1324] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Merchant Readiness Checklist
              </h3>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                2 of 4 Complete
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="text-slate-700 dark:text-slate-300 font-medium line-through opacity-70">
                  Verify Work Email Address (Clerk)
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="text-slate-700 dark:text-slate-300 font-medium line-through opacity-70">
                  Verify WhatsApp Phone (Meta OTP)
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <div className="w-4 h-4 rounded-full border-2 border-slate-300 dark:border-slate-600 shrink-0" />
                <span className="text-slate-800 dark:text-slate-200 font-semibold">
                  Fund Settlement Wallet to start vending
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <div className="w-4 h-4 rounded-full border-2 border-slate-300 dark:border-slate-600 shrink-0" />
                <span className="text-slate-800 dark:text-slate-200 font-semibold">
                  Complete NIN Tier 2 Verification for unlimited limits
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
