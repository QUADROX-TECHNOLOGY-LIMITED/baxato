'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Activity,
  ArrowRightLeft,
  Server,
  UserCheck,
  TrendingUp,
  RefreshCw,
  Zap,
  Smartphone,
  Wifi,
  Tv,
  GraduationCap,
} from 'lucide-react';
import { getStoredAuthToken } from '@/lib/auth-session';

export default function StaffOverviewPage() {
  const [overviewData, setOverviewData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadOverview = async () => {
    try {
      setIsLoading(true);
      const token = getStoredAuthToken();
      if (!token) return;

      const res = await fetch('/api/admin/overview', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data?.success) {
        setOverviewData(data.data);
      }
    } catch (err) {
      console.error('Failed to load staff overview:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOverview();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              Operations Telemetry
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Live Platform Health
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Platform Operations Overview
          </h1>
        </div>

        <button
          onClick={loadOverview}
          disabled={isLoading}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition self-start md:self-auto shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-500' : ''}`} />
          <span>Refresh Data</span>
        </button>
      </div>

      {/* Telemetry Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Today's Volume</span>
          <div className="text-xl md:text-2xl font-bold mt-1 text-slate-900 dark:text-white">
            ₦{Number(overviewData?.today?.totalVolumeNaira || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {overviewData?.today?.totalTransactions || 0} Total transactions
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Success Rate</span>
          <div className="text-xl md:text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
            {overviewData?.today?.successRatePercent ?? 100}%
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {overviewData?.today?.successTransactions || 0} successful / {overviewData?.today?.failedTransactions || 0} failed
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Registered Businesses</span>
          <div className="text-xl md:text-2xl font-bold mt-1 text-slate-900 dark:text-white">
            {overviewData?.merchants?.totalBusinesses || 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Active merchant accounts
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Verified NIN Identities</span>
          <div className="text-xl md:text-2xl font-bold mt-1 text-blue-600 dark:text-blue-400">
            {overviewData?.merchants?.verifiedUsers || 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Verified through NIMC
          </div>
        </div>
      </div>

      {/* Provider Health Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 rounded-xl bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold text-xs">
                ISW
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Interswitch Orion Gateway</h3>
                <p className="text-[11px] text-slate-500">SVA v5 Enterprise Provider</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Circuit: CLOSED (Normal)
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
            Active for JAMB PIN vending, Cable TV, and backup routes for Airtime, Data, and Electricity.
          </p>
          <Link
            href="/staff/routing"
            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
          >
            View Routing & Failover Switches <ArrowRightLeft className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="p-5 rounded-xl bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold text-xs">
                MNF
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Monnify VAS Aggregator</h3>
                <p className="text-[11px] text-slate-500">Direct Telecom & DisCo Gateway</p>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              Circuit: CLOSED (Normal)
            </span>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
            Primary gateway for instant Airtime, Data top-ups, DisCo tokens, and backup Cable TV vending.
          </p>
          <Link
            href="/staff/routing"
            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
          >
            Configure Routing Strategy <ArrowRightLeft className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Quick Access to Operational Desks */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-blue-900/20 to-indigo-900/20 border border-blue-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-white mb-1">
            Need to audit live customer transactions or sync with upstream?
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xl">
            Access the Transaction Operations Desk to search by external reference, inspect raw gateway payloads, or trigger upstream status re-queries.
          </p>
        </div>
        <Link
          href="/staff/transactions"
          className="px-4 py-2.5 rounded-xl font-medium bg-[#126BEB] text-white hover:bg-[#0E58C4] transition shadow-md shadow-blue-500/20 text-xs shrink-0 flex items-center gap-1.5"
        >
          <ArrowRightLeft className="w-3.5 h-3.5" />
          <span>Open Transaction Desk</span>
        </Link>
      </div>
    </div>
  );
}
