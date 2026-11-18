'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, AlertTriangle } from 'lucide-react';
import BaxatoLoader from '@/components/BaxatoLoader';
import {
  getStoredAuthToken,
  isTokenExpired,
  clearSessionAndRedirect,
  handleAuthResponse,
} from '@/lib/auth-session';

const SERVICE_LABELS: Record<string, string> = {
  AIRTIME: 'Airtime',
  DATA: 'Data',
  ELECTRICITY: 'Electricity',
  CABLE_TV: 'Cable TV',
  EXAM_PIN: 'Exam PINs',
};

function renderStatusPill(status: string) {
  if (status === 'SUCCESSFUL') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/60">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
        <span>Successful</span>
      </span>
    );
  }
  if (status === 'FAILED') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200/80 dark:border-rose-800/60">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" aria-hidden="true" />
        <span>Failed</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200/80 dark:border-amber-800/60">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" aria-hidden="true" />
      <span>{status === 'PROCESSING' ? 'Processing' : 'Pending'}</span>
    </span>
  );
}

export default function StaffOverviewPage() {
  const [overviewData, setOverviewData] = useState<any>(null);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const token = getStoredAuthToken();
      if (!token || isTokenExpired(token)) {
        clearSessionAndRedirect('expired');
        return;
      }

      const [overviewRes, txRes] = await Promise.all([
        fetch('/api/admin/overview', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/admin/transactions?page=1&limit=8', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const [overviewJson, txJson] = await Promise.all([
        overviewRes.json().catch(() => null),
        txRes.json().catch(() => null),
      ]);

      if (handleAuthResponse(overviewRes, overviewJson) || handleAuthResponse(txRes, txJson)) {
        return;
      }

      if (overviewRes.ok && overviewJson?.success) {
        setOverviewData(overviewJson.data);
      } else {
        setErrorMessage(overviewJson?.error?.message || 'Unable to load platform overview.');
      }

      if (txRes.ok && txJson?.success) {
        setRecentTransactions(txJson.data || []);
      }
    } catch {
      setErrorMessage('Network error loading platform overview.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
    const handleRefreshEvent = () => {
      void loadData();
    };
    window.addEventListener('bx_staff_refresh', handleRefreshEvent);
    return () => window.removeEventListener('bx_staff_refresh', handleRefreshEvent);
  }, [loadData]);

  const totalTx = Number(overviewData?.today?.totalTransactions || 0);
  const successTx = Number(overviewData?.today?.successTransactions || 0);
  const failedTx = Number(overviewData?.today?.failedTransactions || 0);
  const pendingTx = Number(overviewData?.today?.pendingTransactions || 0);
  const successRate = overviewData?.today?.successRatePercent;

  if (isLoading && !overviewData) {
    return <BaxatoLoader variant="inline" className="py-24" />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight [text-wrap:balance]">
          Overview
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Daily transaction summary and recent activity.
        </p>
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-700 dark:text-rose-300 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => void loadData()}
            className="min-h-9 px-2.5 rounded-md font-semibold hover:bg-rose-100 dark:hover:bg-rose-900/40 shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* Summary Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-xl bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Today&apos;s Volume
          </span>
          <div className="text-lg sm:text-2xl font-semibold text-slate-900 dark:text-white tabular-nums truncate">
            ₦{Number(overviewData?.today?.totalVolumeNaira || 0).toLocaleString('en-NG', {
              minimumFractionDigits: 2,
            })}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {totalTx} requests
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-xl bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Success Rate
          </span>
          <div className="text-lg sm:text-2xl font-semibold tabular-nums">
            {totalTx === 0 ? (
              <span className="text-slate-400 font-normal">—</span>
            ) : (
              <span className="text-emerald-600 dark:text-emerald-400">{successRate}%</span>
            )}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {totalTx === 0 ? 'No activity today' : `${successTx} ok · ${failedTx} failed`}
          </div>
        </div>

        <Link
          href={pendingTx > 0 ? '/staff/transactions?status=PENDING' : '/staff/transactions?status=FAILED'}
          className="p-4 sm:p-5 rounded-xl bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors space-y-1 block"
        >
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">
            Pending Queue
          </span>
          <div className="text-lg sm:text-2xl font-semibold tabular-nums text-amber-600 dark:text-amber-400">
            {pendingTx}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {failedTx} failed today
          </div>
        </Link>

        <Link
          href="/staff/merchants"
          className="p-4 sm:p-5 rounded-xl bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors space-y-1 block"
        >
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">
            Businesses
          </span>
          <div className="text-lg sm:text-2xl font-semibold tabular-nums text-slate-900 dark:text-white">
            {overviewData?.merchants?.totalBusinesses ?? 0}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {overviewData?.merchants?.verifiedUsers ?? 0} verified accounts
          </div>
        </Link>
      </div>

      {/* Recent Transactions */}
      <section className="rounded-xl bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-4 sm:px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Recent Transactions
          </h2>
          <Link
            href="/staff/transactions"
            className="text-xs font-medium text-[#126BEB] dark:text-[#38BDF8] hover:underline inline-flex items-center gap-1 min-h-9 px-2"
          >
            <span>View all</span>
            <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
          </Link>
        </div>

        {/* Mobile Cards */}
        <div className="md:hidden divide-y divide-slate-200/70 dark:divide-slate-800">
          {recentTransactions.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No transactions recorded yet.
            </div>
          ) : (
            recentTransactions.map((tx) => (
              <Link
                key={tx.id}
                href={`/staff/transactions?search=${encodeURIComponent(
                  tx.providerReference || tx.requestReference || tx.clientReference || tx.recipient || '',
                )}`}
                className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold text-slate-900 dark:text-white">
                      {SERVICE_LABELS[tx.serviceType] || tx.serviceType}
                    </span>
                    {renderStatusPill(tx.status)}
                  </div>
                  <div className="text-xs text-slate-700 dark:text-slate-300 truncate">
                    {tx.recipient}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {tx.businessName || 'Business'}
                  </div>
                </div>
                <div className="text-right shrink-0 space-y-0.5">
                  <div className="text-sm font-semibold tabular-nums text-slate-900 dark:text-white">
                    {tx.formattedAmount}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {new Date(tx.createdAt).toLocaleTimeString('en-NG', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>

        {/* Desktop Table */}
        <div
          tabIndex={0}
          role="region"
          aria-label="Recent platform transactions"
          className="hidden md:block overflow-x-auto focus:outline-none"
        >
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 font-medium">
                <th className="py-3 px-4">Service</th>
                <th className="py-3 px-4">Recipient</th>
                <th className="py-3 px-4">Merchant</th>
                <th className="py-3 px-4">Amount</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
              {recentTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-slate-500">
                    No transactions recorded yet.
                  </td>
                </tr>
              ) : (
                recentTransactions.map((tx) => (
                  <tr
                    key={tx.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition-colors"
                  >
                    <td className="py-3 px-4 font-medium text-slate-900 dark:text-white whitespace-nowrap">
                      {SERVICE_LABELS[tx.serviceType] || tx.serviceType}
                    </td>
                    <td className="py-3 px-4 text-slate-800 dark:text-slate-200">
                      {tx.recipient}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900 dark:text-white truncate max-w-[180px]">
                        {tx.businessName || 'Business'}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white tabular-nums">
                      {tx.formattedAmount}
                    </td>
                    <td className="py-3 px-4">{renderStatusPill(tx.status)}</td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400 text-right whitespace-nowrap">
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
      </section>
    </div>
  );
}
