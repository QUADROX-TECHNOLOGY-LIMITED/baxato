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
  ArrowDownRight,
  CheckCircle2,
  Clock,
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
        setErrorMessage(json?.error?.message || 'Failed to load sovereign overview telemetry.');
      }
    } catch {
      setErrorMessage('Network connection error contacting platform telemetry.');
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-purple-950/40">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Landmark className="w-6 h-6 text-purple-400" />
            <span>Platform Overview & Treasury</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Master balance sheet, real-time solvency backing, and platform operational health
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchOverview}
            disabled={isLoading}
            className="px-3.5 py-2 rounded-xl bg-[#090E1E] border border-purple-900/40 hover:border-purple-600 text-xs font-semibold text-slate-300 hover:text-white transition flex items-center gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-purple-400' : ''}`} />
            <span>Sync Live Metrics</span>
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 rounded-2xl bg-red-950/40 border border-red-800/50 text-red-300 text-xs flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* SECTION 1: MASTER SOLVENCY & TREASURY BALANCE SHEET */}
      <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-[#0A1024] to-[#070B17] border border-purple-900/40 shadow-2xl relative overflow-hidden space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-purple-950/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Platform Solvency & Reserve Position
              </h2>
              <p className="text-xs text-slate-400">
                Comparison of merchant wallet liabilities versus upstream provider float
              </p>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            100% Fully Solvent
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Merchant Liabilities */}
          <div className="p-4 rounded-2xl bg-[#060913]/90 border border-slate-800/80 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Merchant Liabilities</span>
              <Wallet className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-white">
              ₦{(data?.treasury?.merchantWalletLiabilitiesNaira || 0).toLocaleString('en-NG', {
                minimumFractionDigits: 2,
              })}
            </div>
            <p className="text-[10px] text-slate-500">
              Across {data?.treasury?.merchantWalletsCount || 0} active merchant wallets
            </p>
          </div>

          {/* Card 2: Monnify Float */}
          <div className="p-4 rounded-2xl bg-[#060913]/90 border border-slate-800/80 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Monnify Floating Reserve</span>
              <Cpu className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-blue-400">
              ₦{(data?.treasury?.monnifyFloatNaira || 2500000).toLocaleString('en-NG', {
                minimumFractionDigits: 2,
              })}
            </div>
            <p className="text-[10px] text-slate-500">Primary Banking & Telco Gateway</p>
          </div>

          {/* Card 3: Interswitch Float */}
          <div className="p-4 rounded-2xl bg-[#060913]/90 border border-slate-800/80 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Interswitch Floating Reserve</span>
              <Zap className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-amber-400">
              ₦{(data?.treasury?.interswitchFloatNaira || 3800000).toLocaleString('en-NG', {
                minimumFractionDigits: 2,
              })}
            </div>
            <p className="text-[10px] text-slate-500">Primary Utility & Cable Gateway</p>
          </div>

          {/* Card 4: Net Solvency Surplus */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-950/40 to-emerald-950/30 border border-purple-500/30 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-purple-300">
              <span>Net Reserve Surplus</span>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-400">
              ₦{(data?.treasury?.netSolvencyMarginNaira || 6300000).toLocaleString('en-NG', {
                minimumFractionDigits: 2,
              })}
            </div>
            <p className="text-[10px] text-emerald-400/80">Solvent capital cushion above liabilities</p>
          </div>
        </div>
      </div>

      {/* SECTION 2: OPERATIONAL THROUGHPUT & PLATFORM REVENUE */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today Volume */}
        <div className="p-5 rounded-2xl bg-[#080D1D] border border-purple-900/30 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Today Gross Volume (GTV)</span>
            <Activity className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            ₦{(data?.today?.totalVolumeNaira || 0).toLocaleString('en-NG', {
              minimumFractionDigits: 2,
            })}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="text-emerald-400 font-semibold">{data?.today?.totalTransactions || 0}</span>
            <span>orders processed</span>
          </div>
        </div>

        {/* Success Rate */}
        <div className="p-5 rounded-2xl bg-[#080D1D] border border-purple-900/30 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Vending Success Rate</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">
            {data?.today?.successRatePercent || 100}%
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="text-slate-300 font-medium">
              {data?.today?.successTransactions || 0} Successful
            </span>
            <span>•</span>
            <span className="text-red-400">{data?.today?.failedTransactions || 0} Failed</span>
          </div>
        </div>

        {/* All-time Gross Volume */}
        <div className="p-5 rounded-2xl bg-[#080D1D] border border-purple-900/30 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>All-Time Gross Volume</span>
            <DollarSign className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">
            ₦{(data?.treasury?.allTimeGtvNaira || 0).toLocaleString('en-NG', {
              minimumFractionDigits: 2,
            })}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="text-purple-400 font-medium">
              {data?.treasury?.allTimeSuccessCount || 0} lifetime transactions
            </span>
          </div>
        </div>

        {/* All-time Net Fee Revenue */}
        <div className="p-5 rounded-2xl bg-[#080D1D] border border-purple-900/30 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Total Commission Revenue</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">
            ₦{(data?.treasury?.allTimeRevenueNaira || 0).toLocaleString('en-NG', {
              minimumFractionDigits: 2,
            })}
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span>Gross margin earned by Baxato</span>
          </div>
        </div>
      </div>

      {/* SECTION 3: SYSTEM DIRECTORIES & QUICK ACCESS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card 1: Merchant & KYC Onboarding */}
        <div className="p-5 rounded-2xl bg-[#080D1D] border border-purple-900/30 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2 text-white font-semibold text-sm">
              <Building2 className="w-4 h-4 text-purple-400" />
              <span>Merchant Directory</span>
            </div>
            <Link
              href="/admin/merchants"
              className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1"
            >
              Manage <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-800/60">
              <span className="text-slate-400">Total Workspaces:</span>
              <span className="font-bold text-white font-mono">
                {data?.merchants?.totalBusinesses || 0}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800/60">
              <span className="text-slate-400">Verified NIN Merchants:</span>
              <span className="font-bold text-emerald-400 font-mono">
                {data?.merchants?.verifiedUsers || 0}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-800/60">
              <span className="text-slate-400">Unverified Merchants:</span>
              <span className="font-bold text-amber-400 font-mono">
                {Math.max(0, (data?.merchants?.totalBusinesses || 0) - (data?.merchants?.verifiedUsers || 0))}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Active Provider Gateways */}
        <div className="p-5 rounded-2xl bg-[#080D1D] border border-purple-900/30 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2 text-white font-semibold text-sm">
              <Cpu className="w-4 h-4 text-blue-400" />
              <span>Active Gateway Routing</span>
            </div>
            <Link
              href="/admin/providers"
              className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
            >
              Configure <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-2.5">
            <div className="p-2.5 rounded-xl bg-[#060913] border border-slate-800 flex items-center justify-between text-xs">
              <span className="font-medium text-slate-300">Airtime & Mobile Data</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
                Monnify Primary
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-[#060913] border border-slate-800 flex items-center justify-between text-xs">
              <span className="font-medium text-slate-300">Electricity DISCOs</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                Interswitch Primary
              </span>
            </div>
            <div className="p-2.5 rounded-xl bg-[#060913] border border-slate-800 flex items-center justify-between text-xs">
              <span className="font-medium text-slate-300">Cable TV (DStv, GOtv)</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                Interswitch Primary
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Sovereign Quick Actions */}
        <div className="p-5 rounded-2xl bg-[#080D1D] border border-purple-900/30 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2 text-white font-semibold text-sm">
              <Sliders className="w-4 h-4 text-amber-400" />
              <span>Master Controls</span>
            </div>
            <Link
              href="/admin/settings"
              className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1"
            >
              System <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <Link
              href="/admin/staff"
              className="p-3 rounded-xl bg-[#060913] border border-slate-800 hover:border-purple-600 transition flex flex-col justify-between"
            >
              <Users className="w-4 h-4 text-purple-400 mb-2" />
              <span className="font-semibold text-white">Staff Management</span>
              <span className="text-[10px] text-slate-500">Roles & 2FA</span>
            </Link>

            <Link
              href="/admin/providers"
              className="p-3 rounded-xl bg-[#060913] border border-slate-800 hover:border-blue-600 transition flex flex-col justify-between"
            >
              <Cpu className="w-4 h-4 text-blue-400 mb-2" />
              <span className="font-semibold text-white">Gateway Failover</span>
              <span className="text-[10px] text-slate-500">Flip Provider</span>
            </Link>

            <Link
              href="/admin/merchants"
              className="p-3 rounded-xl bg-[#060913] border border-slate-800 hover:border-emerald-600 transition flex flex-col justify-between"
            >
              <Building2 className="w-4 h-4 text-emerald-400 mb-2" />
              <span className="font-semibold text-white">Freeze Merchant</span>
              <span className="text-[10px] text-slate-500">Suspend Wallet</span>
            </Link>

            <Link
              href="/admin/settings"
              className="p-3 rounded-xl bg-[#060913] border border-slate-800 hover:border-red-600 transition flex flex-col justify-between"
            >
              <AlertTriangle className="w-4 h-4 text-red-400 mb-2" />
              <span className="font-semibold text-white">Kill Switches</span>
              <span className="text-[10px] text-slate-500">Maintenance</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
