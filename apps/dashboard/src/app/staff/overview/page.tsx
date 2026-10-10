'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  RefreshCw,
  ArrowUpRight,
} from 'lucide-react';
import { getStoredAuthToken } from '@/lib/auth-session';

export default function StaffOverviewPage() {
  const [overviewData, setOverviewData] = useState<any>(null);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const token = getStoredAuthToken();
      if (!token) return;

      const [overviewRes, txRes] = await Promise.all([
        fetch('/api/admin/overview', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/admin/transactions?page=1&limit=5', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const [overviewJson, txJson] = await Promise.all([
        overviewRes.json(),
        txRes.json(),
      ]);

      if (overviewRes.ok && overviewJson?.success) {
        setOverviewData(overviewJson.data);
      }
      if (txRes.ok && txJson?.success) {
        setRecentTransactions(txJson.data || []);
      }
    } catch (err) {
      console.error('Failed to load overview data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalTx = overviewData?.today?.totalTransactions || 0;
  const successTx = overviewData?.today?.successTransactions || 0;
  const failedTx = overviewData?.today?.failedTransactions || 0;
  const successRate = overviewData?.today?.successRatePercent;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Overview
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Platform transaction volume and merchant activity.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={isLoading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Today's Volume */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800">
          <span className="text-xs text-slate-500 font-medium">Today's Volume</span>
          <div className="text-xl font-bold mt-1 text-slate-900 dark:text-white font-mono">
            ₦{Number(overviewData?.today?.totalVolumeNaira || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {totalTx} transactions
          </div>
        </div>

        {/* Success Rate */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800">
          <span className="text-xs text-slate-500 font-medium">Success Rate</span>
          <div className="text-xl font-bold mt-1 text-slate-900 dark:text-white">
            {totalTx === 0 ? (
              <span className="text-slate-400 text-base font-normal">—</span>
            ) : (
              <span className="text-emerald-600 dark:text-emerald-400 font-mono">
                {successRate}%
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {totalTx === 0 ? 'No activity today' : `${successTx} succeeded, ${failedTx} failed`}
          </div>
        </div>

        {/* Registered Businesses */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800">
          <span className="text-xs text-slate-500 font-medium">Businesses</span>
          <div className="text-xl font-bold mt-1 text-slate-900 dark:text-white font-mono">
            {overviewData?.merchants?.totalBusinesses || 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Registered businesses
          </div>
        </div>

        {/* Verified Merchants */}
        <div className="p-4 rounded-xl bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800">
          <span className="text-xs text-slate-500 font-medium">Verified Identity</span>
          <div className="text-xl font-bold mt-1 text-slate-900 dark:text-white font-mono">
            {overviewData?.merchants?.verifiedUsers || 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            NIN verified merchants
          </div>
        </div>
      </div>

      {/* Service Providers Allocation */}
      <div className="p-4 rounded-xl bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Active Service Providers
          </span>
          <Link
            href="/staff/routing"
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
          >
            Manage Routing <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800">
            <span className="text-slate-500 block text-[11px]">Airtime</span>
            <span className="font-semibold text-slate-900 dark:text-white mt-0.5 block">Monnify</span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800">
            <span className="text-slate-500 block text-[11px]">Data</span>
            <span className="font-semibold text-slate-900 dark:text-white mt-0.5 block">Monnify</span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800">
            <span className="text-slate-500 block text-[11px]">Electricity</span>
            <span className="font-semibold text-slate-900 dark:text-white mt-0.5 block">Monnify</span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800">
            <span className="text-slate-500 block text-[11px]">Cable TV</span>
            <span className="font-semibold text-slate-900 dark:text-white mt-0.5 block">Interswitch</span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800">
            <span className="text-slate-500 block text-[11px]">Exam PINs</span>
            <span className="font-semibold text-slate-900 dark:text-white mt-0.5 block">Interswitch</span>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="rounded-xl bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Recent Transactions
            </h2>
          </div>
          <Link
            href="/staff/transactions"
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
          >
            All Transactions <ArrowUpRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400">
                <th className="py-2.5 px-4 font-semibold">Service</th>
                <th className="py-2.5 px-4 font-semibold">Recipient</th>
                <th className="py-2.5 px-4 font-semibold">Merchant</th>
                <th className="py-2.5 px-4 font-semibold">Amount</th>
                <th className="py-2.5 px-4 font-semibold">Provider</th>
                <th className="py-2.5 px-4 font-semibold">Status</th>
                <th className="py-2.5 px-4 font-semibold text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {recentTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    {isLoading ? 'Loading...' : 'No transactions recorded yet.'}
                  </td>
                </tr>
              ) : (
                recentTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition">
                    <td className="py-2.5 px-4 font-medium text-slate-900 dark:text-white">
                      {tx.serviceType}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-700 dark:text-slate-300">
                      {tx.recipient}
                    </td>
                    <td className="py-2.5 px-4">
                      <div className="font-medium text-slate-900 dark:text-white truncate max-w-[140px]">
                        {tx.businessName || 'Business'}
                      </div>
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-slate-900 dark:text-white font-mono">
                      {tx.formattedAmount}
                    </td>
                    <td className="py-2.5 px-4 font-mono text-slate-600 dark:text-slate-300">
                      {tx.providerName}
                    </td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          tx.status === 'SUCCESSFUL'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : tx.status === 'FAILED'
                              ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {tx.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-500 text-[11px] text-right whitespace-nowrap">
                      {new Date(tx.createdAt).toLocaleTimeString('en-NG', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
