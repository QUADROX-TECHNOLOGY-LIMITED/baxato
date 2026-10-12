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
  ArrowUpRight,
  CheckCircle2,
  RefreshCw,
  Sliders,
  Wallet,
  AlertTriangle,
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
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Landmark className="w-5 h-5 text-[#126BEB]" />
            <span>Platform Overview</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Operational throughput, merchant balances, and system health
          </p>
        </div>

        <button
          onClick={fetchOverview}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#126BEB]' : ''}`} />
          <span>Sync Metrics</span>
        </button>
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* METRIC CARDS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Merchant Wallets Balance */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Merchant Wallets Balance</span>
            <Wallet className="w-4 h-4 text-[#126BEB]" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            ₦{(data?.treasury?.merchantWalletLiabilitiesNaira || 0).toLocaleString('en-NG', {
              minimumFractionDigits: 2,
            })}
          </div>
          <p className="text-[11px] text-slate-500">
            Across {data?.treasury?.merchantWalletsCount || 0} active merchant wallets
          </p>
        </div>

        {/* Today's Volume */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Today&apos;s Gross Volume</span>
            <Activity className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            ₦{(data?.today?.totalVolumeNaira || 0).toLocaleString('en-NG', {
              minimumFractionDigits: 2,
            })}
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
              {data?.today?.totalTransactions || 0}
            </span>
            <span>transactions today</span>
          </div>
        </div>

        {/* All-time Processed Volume */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>All-Time Gross Volume</span>
            <TrendingUp className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white">
            ₦{(data?.treasury?.allTimeGtvNaira || 0).toLocaleString('en-NG', {
              minimumFractionDigits: 2,
            })}
          </div>
          <p className="text-[11px] text-slate-500">
            {data?.treasury?.allTimeSuccessCount || 0} successful orders
          </p>
        </div>

        {/* Total Platform Commission */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Platform Commission Revenue</span>
            <ShieldCheck className="w-4 h-4 text-teal-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            ₦{(data?.treasury?.allTimeRevenueNaira || 0).toLocaleString('en-NG', {
              minimumFractionDigits: 2,
            })}
          </div>
          <p className="text-[11px] text-slate-500">
            Cumulative earned fee margins
          </p>
        </div>
      </div>

      {/* OPERATIONAL SUMMARY */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Merchant Compliance Summary */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-semibold text-sm">
              <Building2 className="w-4 h-4 text-[#126BEB]" />
              <span>Merchant Onboarding</span>
            </div>
            <Link
              href="/admin/merchants"
              className="text-xs text-[#126BEB] hover:underline flex items-center gap-1 font-medium"
            >
              View All <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/60">
              <span className="text-slate-500">Total Workspaces:</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {data?.merchants?.totalBusinesses || 0}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/60">
              <span className="text-slate-500">Verified KYC Merchants:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {data?.merchants?.verifiedUsers || 0}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/60">
              <span className="text-slate-500">Pending Verification:</span>
              <span className="font-bold text-amber-600 dark:text-amber-400">
                {Math.max(0, (data?.merchants?.totalBusinesses || 0) - (data?.merchants?.verifiedUsers || 0))}
              </span>
            </div>
          </div>
        </div>

        {/* Transaction Health */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-semibold text-sm">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Vending Success Rate</span>
            </div>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
              {data?.today?.successRatePercent || 100}%
            </span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/60">
              <span className="text-slate-500">Successful Orders:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {data?.today?.successTransactions || 0}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/60">
              <span className="text-slate-500">Pending Orders:</span>
              <span className="font-bold text-amber-600 dark:text-amber-400">
                {data?.today?.pendingTransactions || 0}
              </span>
            </div>
            <div className="flex justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/60">
              <span className="text-slate-500">Failed Orders:</span>
              <span className="font-bold text-red-600 dark:text-red-400">
                {data?.today?.failedTransactions || 0}
              </span>
            </div>
          </div>
        </div>

        {/* Quick Portal Navigation */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-semibold text-sm">
              <Sliders className="w-4 h-4 text-[#126BEB]" />
              <span>Administrative Controls</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <Link
              href="/admin/staff"
              className="p-3 rounded-xl bg-slate-50 dark:bg-[#0A1324] border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition flex flex-col justify-between"
            >
              <Users className="w-4 h-4 text-[#126BEB] mb-2" />
              <span className="font-semibold text-slate-900 dark:text-white">Staff Team</span>
              <span className="text-[10px] text-slate-400">Roles &amp; 2FA</span>
            </Link>

            <Link
              href="/admin/providers"
              className="p-3 rounded-xl bg-slate-50 dark:bg-[#0A1324] border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition flex flex-col justify-between"
            >
              <Cpu className="w-4 h-4 text-blue-500 mb-2" />
              <span className="font-semibold text-slate-900 dark:text-white">Gateways</span>
              <span className="text-[10px] text-slate-400">Routing Rules</span>
            </Link>

            <Link
              href="/admin/settings"
              className="p-3 rounded-xl bg-slate-50 dark:bg-[#0A1324] border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition flex flex-col justify-between"
            >
              <Sliders className="w-4 h-4 text-amber-500 mb-2" />
              <span className="font-semibold text-slate-900 dark:text-white">Settings</span>
              <span className="text-[10px] text-slate-400">Kill Switches</span>
            </Link>

            <Link
              href="/admin/audit-logs"
              className="p-3 rounded-xl bg-slate-50 dark:bg-[#0A1324] border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition flex flex-col justify-between"
            >
              <Activity className="w-4 h-4 text-emerald-500 mb-2" />
              <span className="font-semibold text-slate-900 dark:text-white">Audit Trail</span>
              <span className="text-[10px] text-slate-400">Activity Logs</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
