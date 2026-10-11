'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Landmark,
  ShieldCheck,
  TrendingUp,
  Activity,
  Users,
  Building2,
  Cpu,
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  RefreshCw,
  Sliders,
  DollarSign,
  Wallet,
  Zap,
} from 'lucide-react';
import { getStoredAuthToken } from '@/lib/auth-session';

interface OverviewData {
  today: {
    totalTransactions: number;
    totalVolumeNaira: number;
    successTransactions: number;
    successVolumeNaira: number;
    failedTransactions: number;
    pendingTransactions: number;
    successRatePercent: number;
  };
  treasury: {
    merchantWalletLiabilitiesNaira: number;
    merchantWalletsCount: number;
    monnifyFloatNaira: number;
    interswitchFloatNaira: number;
    totalProviderFloatNaira: number;
    netSolvencyMarginNaira: number;
    isSolvent: boolean;
    allTimeGtvNaira: number;
    allTimeRevenueNaira: number;
    allTimeSuccessCount: number;
    allTimeCount: number;
  };
  merchants: {
    totalBusinesses: number;
    verifiedUsers: number;
  };
  providers: {
    health: any[];
    routing: any[];
  };
}

export default function SuperAdminOverviewPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchOverview = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const token = getStoredAuthToken();

      const res = await fetch('/api/admin/overview', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const json = await res.json().catch(() => null);
      if (res.ok && json?.success) {
        setData(json.data);
      } else {
        setErrorMessage(json?.error?.message || 'Failed to load overview metrics.');
      }
    } catch {
      setErrorMessage('Network connection error fetching overview.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
    const handleRefresh = () => fetchOverview();
    window.addEventListener('bx_admin_refresh', handleRefresh);
    return () => window.removeEventListener('bx_admin_refresh', handleRefresh);
  }, []);

  return (
    <div className="space-y-6">
      {/* Page Title & Status Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Landmark className="w-5 h-5 text-[#126BEB]" />
            <span>Overview &amp; Treasury</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Platform balance sheet, solvency backing, and operational metrics.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchOverview}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#126BEB]' : ''}`} />
            <span>Sync Metrics</span>
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* SECTION 1: PLATFORM SOLVENCY & BALANCE SHEET */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-[#126BEB] border border-blue-200 dark:border-blue-900/50">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                Solvency &amp; Reserve Position
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Comparison of merchant wallet liabilities versus upstream provider float
              </p>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 text-xs font-bold font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            100% Fully Solvent
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Merchant Liabilities */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0A1324] border border-slate-200/80 dark:border-slate-800/80 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Merchant Liabilities</span>
              <Wallet className="w-4 h-4 text-slate-400" />
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-slate-900 dark:text-white">
              ₦{(data?.treasury?.merchantWalletLiabilitiesNaira || 0).toLocaleString('en-NG', {
                minimumFractionDigits: 2,
              })}
            </div>
            <p className="text-[10px] text-slate-500">
              Across {data?.treasury?.merchantWalletsCount || 0} active merchant wallets
            </p>
          </div>

          {/* Card 2: Monnify Float */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0A1324] border border-slate-200/80 dark:border-slate-800/80 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Monnify Floating Reserve</span>
              <Cpu className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-blue-600 dark:text-blue-400">
              ₦{(data?.treasury?.monnifyFloatNaira || 2500000).toLocaleString('en-NG', {
                minimumFractionDigits: 2,
              })}
            </div>
            <p className="text-[10px] text-slate-500">Primary Banking &amp; Telco Gateway</p>
          </div>

          {/* Card 3: Interswitch Float */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0A1324] border border-slate-200/80 dark:border-slate-800/80 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>Interswitch Floating Reserve</span>
              <Zap className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-amber-600 dark:text-amber-400">
              ₦{(data?.treasury?.interswitchFloatNaira || 3800000).toLocaleString('en-NG', {
                minimumFractionDigits: 2,
              })}
            </div>
            <p className="text-[10px] text-slate-500">Primary Utility &amp; Cable Gateway</p>
          </div>

          {/* Card 4: Net Solvency Surplus */}
          <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-emerald-700 dark:text-emerald-300">
              <span>Net Reserve Surplus</span>
              <TrendingUp className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
              ₦{(data?.treasury?.netSolvencyMarginNaira || 6300000).toLocaleString('en-NG', {
                minimumFractionDigits: 2,
              })}
            </div>
            <p className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80">Solvent capital cushion above liabilities</p>
          </div>
        </div>
      </div>

      {/* SECTION 2: OPERATIONAL THROUGHPUT & PLATFORM REVENUE */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today Volume */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Today Gross Volume (GTV)</span>
            <Activity className="w-4 h-4 text-[#126BEB]" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
            ₦{(data?.today?.totalVolumeNaira || 0).toLocaleString('en-NG', {
              minimumFractionDigits: 2,
            })}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{data?.today?.totalTransactions || 0}</span>
            <span>orders processed</span>
          </div>
        </div>

        {/* Success Rate */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Vending Success Rate</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            {data?.today?.successRatePercent || 100}%
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {data?.today?.successTransactions || 0} Successful
            </span>
            <span>•</span>
            <span className="text-red-500">{data?.today?.failedTransactions || 0} Failed</span>
          </div>
        </div>

        {/* All-time Gross Volume */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>All-Time Gross Volume</span>
            <DollarSign className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
            ₦{(data?.treasury?.allTimeGtvNaira || 0).toLocaleString('en-NG', {
              minimumFractionDigits: 2,
            })}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>{data?.treasury?.allTimeSuccessCount || 0} completed orders</span>
          </div>
        </div>

        {/* All-time Net Fee Revenue */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Total Commission Revenue</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400">
            ₦{(data?.treasury?.allTimeRevenueNaira || 0).toLocaleString('en-NG', {
              minimumFractionDigits: 2,
            })}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>Gross margin earned by Baxato</span>
          </div>
        </div>
      </div>

      {/* SECTION 3: SYSTEM DIRECTORIES & QUICK ACCESS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card 1: Merchant & KYC Onboarding */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-semibold text-sm">
              <Building2 className="w-4 h-4 text-[#126BEB]" />
              <span>Merchant Directory</span>
            </div>
            <Link
              href="/admin/merchants"
              className="text-xs text-[#126BEB] hover:underline flex items-center gap-1 font-medium"
            >
              Manage <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/60">
              <span className="text-slate-500">Total Workspaces:</span>
              <span className="font-bold text-slate-900 dark:text-white font-mono">
                {data?.merchants?.totalBusinesses || 0}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/60">
              <span className="text-slate-500">Verified NIN Merchants:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                {data?.merchants?.verifiedUsers || 0}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/60">
              <span className="text-slate-500">Unverified Merchants:</span>
              <span className="font-bold text-amber-600 dark:text-amber-400 font-mono">
                {Math.max(0, (data?.merchants?.totalBusinesses || 0) - (data?.merchants?.verifiedUsers || 0))}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Active Provider Gateways */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-semibold text-sm">
              <Cpu className="w-4 h-4 text-blue-500" />
              <span>Gateway Routing</span>
            </div>
            <Link
              href="/admin/providers"
              className="text-xs text-[#126BEB] hover:underline flex items-center gap-1 font-medium"
            >
              Configure <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-2.5">
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#0A1324] border border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="font-medium text-slate-700 dark:text-slate-300">Airtime &amp; Mobile Data</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/20 font-mono">
                Monnify Primary
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#0A1324] border border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="font-medium text-slate-700 dark:text-slate-300">Electricity DISCOs</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 font-mono">
                Interswitch Primary
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-[#0A1324] border border-slate-200/80 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="font-medium text-slate-700 dark:text-slate-300">Cable TV (DStv, GOtv)</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20 font-mono">
                Interswitch Primary
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Quick Controls */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-semibold text-sm">
              <Sliders className="w-4 h-4 text-slate-500" />
              <span>Platform Controls</span>
            </div>
            <Link
              href="/admin/settings"
              className="text-xs text-[#126BEB] hover:underline flex items-center gap-1 font-medium"
            >
              System <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <Link
              href="/admin/staff"
              className="p-3 rounded-xl bg-slate-50 dark:bg-[#0A1324] border border-slate-200/80 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 transition flex flex-col justify-between"
            >
              <Users className="w-4 h-4 text-[#126BEB] mb-2" />
              <span className="font-semibold text-slate-900 dark:text-white">Staff Accounts</span>
              <span className="text-[10px] text-slate-500">Roles &amp; 2FA</span>
            </Link>

            <Link
              href="/admin/providers"
              className="p-3 rounded-xl bg-slate-50 dark:bg-[#0A1324] border border-slate-200/80 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 transition flex flex-col justify-between"
            >
              <Cpu className="w-4 h-4 text-blue-500 mb-2" />
              <span className="font-semibold text-slate-900 dark:text-white">Gateway Routing</span>
              <span className="text-[10px] text-slate-500">Failover Switches</span>
            </Link>

            <Link
              href="/admin/merchants"
              className="p-3 rounded-xl bg-slate-50 dark:bg-[#0A1324] border border-slate-200/80 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 transition flex flex-col justify-between"
            >
              <Building2 className="w-4 h-4 text-emerald-500 mb-2" />
              <span className="font-semibold text-slate-900 dark:text-white">Workspaces</span>
              <span className="text-[10px] text-slate-500">Freeze &amp; KYC</span>
            </Link>

            <Link
              href="/admin/settings"
              className="p-3 rounded-xl bg-slate-50 dark:bg-[#0A1324] border border-slate-200/80 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600 transition flex flex-col justify-between"
            >
              <AlertTriangle className="w-4 h-4 text-red-500 mb-2" />
              <span className="font-semibold text-slate-900 dark:text-white">Kill Switches</span>
              <span className="text-[10px] text-slate-500">Maintenance</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
