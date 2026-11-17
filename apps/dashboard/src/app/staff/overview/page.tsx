'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowUpRight,
  RefreshCw,
  AlertTriangle,
  Activity,
  CheckCircle2,
  Clock,
  Server,
  Building2,
} from 'lucide-react';
import BaxatoLoader from '@/components/BaxatoLoader';
import {
  getStoredAuthToken,
  isTokenExpired,
  clearSessionAndRedirect,
  handleAuthResponse,
} from '@/lib/auth-session';

const SERVICE_LABELS: Record<string, string> = {
  AIRTIME: 'Airtime',
  DATA: 'Mobile Data',
  ELECTRICITY: 'Electricity',
  CABLE_TV: 'Cable TV',
  EXAM_PIN: 'Exam PINs',
};

const STRATEGY_LABELS: Record<string, { label: string; route: string }> = {
  PRIMARY_FALLBACK: { label: 'Primary + Failover', route: 'Monnify -> VTPass' },
  MONNIFY_ONLY: { label: 'Monnify Only', route: 'Monnify' },
  VTPASS_ONLY: { label: 'VTPass Only', route: 'VTPass' },
};

function formatStatusStyle(status: string) {
  if (status === 'SUCCESSFUL') {
    return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400';
  }
  if (status === 'FAILED') {
    return 'bg-rose-500/10 text-rose-700 dark:text-rose-400';
  }
  return 'bg-amber-500/10 text-amber-700 dark:text-amber-400';
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
        fetch('/api/admin/transactions?page=1&limit=6', {
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
      setErrorMessage('Network error loading platform telemetry.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
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

  const routingRows: any[] = overviewData?.providers?.routing || [];
  const providerHealth: any[] = overviewData?.providers?.health || [];
  const serviceBreakdown: any[] = overviewData?.serviceBreakdown || [];
  const hourlyThroughput: any[] = overviewData?.hourlyThroughput || [];

  const maxHourlyCount = Math.max(1, ...hourlyThroughput.map((h) => Number(h.count || 0)));
  const maxServiceVolume = Math.max(1, ...serviceBreakdown.map((s) => Number(s.volumeNaira || 0)));

  if (isLoading && !overviewData) {
    return <BaxatoLoader variant="inline" className="py-24" />;
  }

  return (
    <div className="space-y-6">
      {/* Page Heading */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white [text-wrap:balance]">
            Operations Overview
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Live service routing, transaction queue status, and merchant KYC metrics.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={loadData}
            disabled={isLoading}
            className="h-11 sm:h-10 px-3.5 rounded-lg text-xs font-medium bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
            <span>Sync Telemetry</span>
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-700 dark:text-rose-300 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={loadData}
            className="min-h-9 px-2.5 rounded-md font-semibold hover:bg-rose-100 dark:hover:bg-rose-900/40 shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 sm:p-5 rounded-xl bg-white dark:bg-[#0B1528] border border-slate-200/80 dark:border-slate-800 space-y-1.5">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Today&apos;s Volume
          </span>
          <div className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white font-mono tabular-nums truncate">
            ₦{Number(overviewData?.today?.totalVolumeNaira || 0).toLocaleString('en-NG', {
              minimumFractionDigits: 2,
            })}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            {totalTx} requests today
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-xl bg-white dark:bg-[#0B1528] border border-slate-200/80 dark:border-slate-800 space-y-1.5">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Success Rate
          </span>
          <div className="text-lg sm:text-2xl font-bold font-mono tabular-nums">
            {totalTx === 0 ? (
              <span className="text-slate-400 font-normal">—</span>
            ) : (
              <span className="text-emerald-600 dark:text-emerald-400">{successRate}%</span>
            )}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            {totalTx === 0 ? 'No activity today' : `${successTx} ok · ${failedTx} failed`}
          </div>
        </div>

        <Link
          href={pendingTx > 0 ? '/staff/transactions?status=PENDING' : '/staff/transactions?status=FAILED'}
          className="p-4 sm:p-5 rounded-xl bg-white dark:bg-[#0B1528] border border-slate-200/80 dark:border-slate-800 hover:border-[#126BEB]/50 dark:hover:border-[#38BDF8]/50 transition-colors space-y-1.5 block"
        >
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Queue Attention
            </span>
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
          </div>
          <div className="text-lg sm:text-2xl font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400">
            {pendingTx}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            pending · {failedTx} failed today
          </div>
        </Link>

        <Link
          href="/staff/merchants"
          className="p-4 sm:p-5 rounded-xl bg-white dark:bg-[#0B1528] border border-slate-200/80 dark:border-slate-800 hover:border-[#126BEB]/50 dark:hover:border-[#38BDF8]/50 transition-colors space-y-1.5 block"
        >
          <div className="flex items-center justify-between gap-1">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Merchants & KYC
            </span>
            <Building2 className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
          </div>
          <div className="text-lg sm:text-2xl font-bold font-mono tabular-nums text-slate-900 dark:text-white">
            {overviewData?.merchants?.totalBusinesses ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">
            {overviewData?.merchants?.verifiedUsers ?? 0} KYC verified users
          </div>
        </Link>
      </div>

      {/* Operational Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
        {/* Left: Provider Health + Live Service Routing */}
        <div className="lg:col-span-7 space-y-4 sm:space-y-6">
          {/* Provider Health */}
          <section className="p-4 sm:p-5 rounded-xl bg-white dark:bg-[#0B1528] border border-slate-200/80 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#126BEB] dark:text-[#38BDF8]" aria-hidden="true" />
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Provider Health
                </h2>
              </div>
              <Link
                href="/staff/routing"
                className="text-xs font-medium text-[#126BEB] dark:text-[#38BDF8] hover:underline inline-flex items-center gap-1"
              >
                <span>Routing</span>
                <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
              </Link>
            </div>

            {providerHealth.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 py-3">
                No gateway health telemetry reported yet.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {providerHealth.map((p: any) => {
                  const isHealthy = Boolean(p.health?.isHealthy);
                  const cbState = p.circuitBreaker?.state || 'CLOSED';
                  return (
                    <div
                      key={p.providerName}
                      className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-[#070D18]/60 space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {p.providerName}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            isHealthy
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                              : 'bg-rose-500/10 text-rose-700 dark:text-rose-400'
                          }`}
                        >
                          {isHealthy ? (
                            <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                          ) : (
                            <AlertTriangle className="w-3 h-3" aria-hidden="true" />
                          )}
                          <span>{isHealthy ? 'Healthy' : 'Degraded'}</span>
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                        <span className="inline-flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3" aria-hidden="true" />
                          {p.health?.latencyMs ?? 0}ms
                        </span>
                        <span className="font-mono">Circuit: {cbState}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Active Service Routing */}
          <section className="p-4 sm:p-5 rounded-xl bg-white dark:bg-[#0B1528] border border-slate-200/80 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-[#126BEB] dark:text-[#38BDF8]" aria-hidden="true" />
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Active Routing Matrix
                </h2>
              </div>
              <Link
                href="/staff/routing"
                className="text-xs font-medium text-[#126BEB] dark:text-[#38BDF8] hover:underline inline-flex items-center gap-1"
              >
                <span>Configure</span>
                <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
              </Link>
            </div>

            {routingRows.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 py-3">
                No active routing rules available.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {routingRows.map((rule: any) => {
                  const meta = STRATEGY_LABELS[rule.strategy] || {
                    label: rule.strategy,
                    route: rule.primaryProvider || 'Default',
                  };
                  return (
                    <div
                      key={rule.serviceType}
                      className="p-3 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-[#070D18]/50"
                    >
                      <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
                        {SERVICE_LABELS[rule.serviceType] || rule.serviceType}
                      </span>
                      <span className="text-xs font-semibold text-slate-900 dark:text-white mt-0.5 block">
                        {meta.route}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 block">
                        {meta.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Right: Service Breakdown & Hourly Throughput */}
        <div className="lg:col-span-5 space-y-4 sm:space-y-6">
          <section className="p-4 sm:p-5 rounded-xl bg-white dark:bg-[#0B1528] border border-slate-200/80 dark:border-slate-800 space-y-4">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Today by Service Category
            </h2>

            {serviceBreakdown.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 py-4 text-center">
                No transactions processed today.
              </p>
            ) : (
              <div className="space-y-3">
                {serviceBreakdown.map((item: any) => {
                  const vol = Number(item.volumeNaira || 0);
                  const pct = Math.max(4, Math.round((vol / maxServiceVolume) * 100));
                  return (
                    <div key={item.serviceType} className="space-y-1">
                      <div className="flex items-center justify-between text-xs gap-2">
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          {SERVICE_LABELS[item.serviceType] || item.serviceType}
                        </span>
                        <span className="font-mono tabular-nums text-slate-600 dark:text-slate-300">
                          ₦{vol.toLocaleString('en-NG', { maximumFractionDigits: 0 })} · {item.count}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#126BEB] dark:bg-[#38BDF8]"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="p-4 sm:p-5 rounded-xl bg-white dark:bg-[#0B1528] border border-slate-200/80 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Hourly Throughput
              </h2>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Today (WAT)</span>
            </div>

            {hourlyThroughput.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 py-4 text-center">
                No hourly telemetry recorded yet.
              </p>
            ) : (
              <div className="grid grid-cols-6 gap-2 pt-2 items-end h-28">
                {hourlyThroughput.map((bucket: any) => {
                  const count = Number(bucket.count || 0);
                  const heightPct = count > 0 ? Math.max(16, Math.round((count / maxHourlyCount) * 100)) : 8;
                  return (
                    <div
                      key={bucket.hour}
                      className="flex flex-col items-center justify-end h-full gap-1.5"
                    >
                      <span className="text-[10px] font-mono tabular-nums text-slate-500 dark:text-slate-400">
                        {count}
                      </span>
                      <div
                        className={`w-full max-w-[28px] rounded-t-md transition-all ${
                          count > 0
                            ? 'bg-[#126BEB] dark:bg-[#38BDF8]'
                            : 'bg-slate-200 dark:bg-slate-800'
                        }`}
                        style={{ height: `${heightPct}%` }}
                        title={`${bucket.hour}: ${count} requests`}
                      />
                      <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                        {bucket.hour}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Recent Platform Transactions */}
      <section className="rounded-xl bg-white dark:bg-[#0B1528] border border-slate-200/80 dark:border-slate-800 overflow-hidden">
        <div className="p-4 sm:px-5 border-b border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Recent Transactions
          </h2>
          <Link
            href="/staff/transactions"
            className="text-xs font-medium text-[#126BEB] dark:text-[#38BDF8] hover:underline inline-flex items-center gap-1 min-h-9 px-2"
          >
            <span>All Transactions</span>
            <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
          </Link>
        </div>

        {/* Mobile Card Stack */}
        <div className="md:hidden divide-y divide-slate-200/70 dark:divide-slate-800">
          {recentTransactions.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-500">
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
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-900 dark:text-white">
                      {SERVICE_LABELS[tx.serviceType] || tx.serviceType}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${formatStatusStyle(
                        tx.status,
                      )}`}
                    >
                      {tx.status}
                    </span>
                  </div>
                  <div className="text-xs font-mono text-slate-600 dark:text-slate-300 truncate">
                    {tx.recipient}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {tx.businessName || 'Business'} ·{' '}
                    {new Date(tx.createdAt).toLocaleTimeString('en-NG', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>
                <div className="text-right shrink-0 space-y-0.5">
                  <div className="text-sm font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                    {tx.formattedAmount}
                  </div>
                  <div className="text-[10px] font-mono text-slate-500">{tx.providerName}</div>
                </div>
              </Link>
            ))
          )}
        </div>

        {/* Laptop Table */}
        <div
          tabIndex={0}
          role="region"
          aria-label="Recent platform transactions"
          className="hidden md:block overflow-x-auto focus:outline-none"
        >
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#070D18]/70 text-slate-500 dark:text-slate-400">
                <th className="py-3 px-4 font-semibold">Service</th>
                <th className="py-3 px-4 font-semibold">Recipient</th>
                <th className="py-3 px-4 font-semibold">Merchant</th>
                <th className="py-3 px-4 font-semibold">Amount</th>
                <th className="py-3 px-4 font-semibold">Provider</th>
                <th className="py-3 px-4 font-semibold">Status</th>
                <th className="py-3 px-4 font-semibold text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
              {recentTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No transactions recorded yet.
                  </td>
                </tr>
              ) : (
                recentTransactions.map((tx) => (
                  <tr
                    key={tx.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition-colors"
                  >
                    <td className="py-3 px-4 font-medium text-slate-900 dark:text-white whitespace-nowrap">
                      {SERVICE_LABELS[tx.serviceType] || tx.serviceType}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700 dark:text-slate-300">
                      {tx.recipient}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-900 dark:text-white truncate max-w-[180px]">
                        {tx.businessName || 'Business'}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white font-mono tabular-nums">
                      {tx.formattedAmount}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">
                      {tx.providerName}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${formatStatusStyle(
                          tx.status,
                        )}`}
                      >
                        {tx.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400 text-[11px] text-right whitespace-nowrap">
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
