'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowUpRight,
  Clock,
  Server,
  UserCheck,
  XCircle,
} from 'lucide-react';
import BaxatoLoader from '@/components/BaxatoLoader';
import {
  getStoredAuthToken,
  isTokenExpired,
  clearSessionAndRedirect,
  handleAuthResponse,
} from '@/lib/auth-session';

const SERVICE_ORDER = ['AIRTIME', 'DATA', 'ELECTRICITY', 'CABLE_TV', 'EXAM_PIN'] as const;

const SERVICE_LABELS: Record<string, string> = {
  AIRTIME: 'Airtime',
  DATA: 'Data',
  ELECTRICITY: 'Electricity',
  CABLE_TV: 'Cable TV',
  EXAM_PIN: 'Exam PINs',
};

const STRATEGY_LABELS: Record<string, string> = {
  PRIMARY_FALLBACK: 'Monnify → VTPass',
  VTPASS_FALLBACK: 'VTPass → Monnify',
  MONNIFY_ONLY: 'Monnify only',
  VTPASS_ONLY: 'VTPass only',
};

export default function StaffOverviewPage() {
  const [overviewData, setOverviewData] = useState<any>(null);
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

      const overviewRes = await fetch('/api/admin/overview', {
        headers: { Authorization: `Bearer ${token}` },
      });

      const overviewJson = await overviewRes.json().catch(() => null);

      if (handleAuthResponse(overviewRes, overviewJson)) {
        return;
      }

      if (overviewRes.ok && overviewJson?.success) {
        setOverviewData(overviewJson.data);
      } else {
        setErrorMessage(overviewJson?.error?.message || 'Unable to load overview.');
      }
    } catch {
      setErrorMessage('Network error loading overview.');
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

  if (isLoading && !overviewData) {
    return <BaxatoLoader variant="inline" className="py-24" />;
  }

  const totalTx = Number(overviewData?.today?.totalTransactions || 0);
  const successTx = Number(overviewData?.today?.successTransactions || 0);
  const failedTx = Number(overviewData?.today?.failedTransactions || 0);
  const pendingTx = Number(overviewData?.today?.pendingTransactions || 0);
  const successRate = overviewData?.today?.successRatePercent ?? 0;

  const providerHealth: any[] = Array.isArray(overviewData?.providers?.health)
    ? overviewData.providers.health
    : [];
  const totalGateways = providerHealth.length;
  const offlineGateways = providerHealth.filter((p) => !p?.health?.isHealthy);
  const onlineGateways = Math.max(0, totalGateways - offlineGateways.length);

  const verifiedUsers = Number(overviewData?.merchants?.verifiedUsers || 0);
  const pendingKycUsers = Number(overviewData?.merchants?.pendingKycUsers || 0);
  const totalBusinesses = Number(overviewData?.merchants?.totalBusinesses || 0);

  const breakdownMap = new Map<string, number>();
  if (Array.isArray(overviewData?.serviceBreakdown)) {
    for (const item of overviewData.serviceBreakdown) {
      if (item?.serviceType) {
        breakdownMap.set(String(item.serviceType), Number(item.count || 0));
      }
    }
  }

  const routingMap = new Map<string, string>();
  if (Array.isArray(overviewData?.providers?.routing)) {
    for (const item of overviewData.providers.routing) {
      if (item?.serviceType && item?.strategy) {
        routingMap.set(String(item.serviceType), String(item.strategy));
      }
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight [text-wrap:balance]">
        Overview
      </h1>

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-700 dark:text-rose-300 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
            <span className="[overflow-wrap:break-word]">{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => void loadData()}
            className="min-h-11 sm:min-h-9 px-3 rounded-lg font-semibold hover:bg-rose-100 dark:hover:bg-rose-900/40 shrink-0"
          >
            Retry
          </button>
        </div>
      )}

      {offlineGateways.length > 0 && (
        <div className="p-3.5 sm:p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <AlertTriangle
              className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0"
              aria-hidden="true"
            />
            <p className="text-xs text-amber-900 dark:text-amber-200 font-medium">
              {offlineGateways.length === 1
                ? '1 gateway is currently offline.'
                : `${offlineGateways.length} gateways are currently offline.`}
            </p>
          </div>
          <Link
            href="/staff/routing"
            className="min-h-11 sm:min-h-9 px-3.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold inline-flex items-center justify-center shrink-0 transition-colors"
          >
            Open Routing
          </Link>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Link
          href="/staff/transactions?status=PENDING"
          className="p-4 sm:p-5 rounded-xl bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors space-y-1.5 block"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Pending
            </span>
            <Clock className="w-4 h-4 text-amber-500 shrink-0" aria-hidden="true" />
          </div>
          <div
            className={`text-xl sm:text-2xl font-semibold tabular-nums ${
              pendingTx > 0
                ? 'text-amber-600 dark:text-amber-400'
                : 'text-slate-900 dark:text-white'
            }`}
          >
            {pendingTx}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {pendingTx === 0 ? 'None waiting' : 'View pending'}
          </div>
        </Link>

        <Link
          href="/staff/transactions?status=FAILED"
          className="p-4 sm:p-5 rounded-xl bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors space-y-1.5 block"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Failed Today
            </span>
            <XCircle className="w-4 h-4 text-rose-500 shrink-0" aria-hidden="true" />
          </div>
          <div
            className={`text-xl sm:text-2xl font-semibold tabular-nums ${
              failedTx > 0
                ? 'text-rose-600 dark:text-rose-400'
                : 'text-slate-900 dark:text-white'
            }`}
          >
            {failedTx}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {totalTx === 0 ? '0 requests today' : `${successRate}% ok (${successTx}/${totalTx})`}
          </div>
        </Link>

        <Link
          href="/staff/routing"
          className="p-4 sm:p-5 rounded-xl bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors space-y-1.5 block"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Gateways
            </span>
            <Server className="w-4 h-4 text-[#126BEB] dark:text-[#38BDF8] shrink-0" aria-hidden="true" />
          </div>
          <div
            className={`text-xl sm:text-2xl font-semibold tabular-nums ${
              offlineGateways.length > 0
                ? 'text-rose-600 dark:text-rose-400'
                : 'text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {totalGateways === 0
              ? '—'
              : offlineGateways.length > 0
                ? `${offlineGateways.length} Offline`
                : 'Online'}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {totalGateways === 0 ? '—' : `${onlineGateways} of ${totalGateways} online`}
          </div>
        </Link>

        <Link
          href="/staff/merchants"
          className="p-4 sm:p-5 rounded-xl bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors space-y-1.5 block"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Merchants
            </span>
            <UserCheck className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" aria-hidden="true" />
          </div>
          <div className="text-xl sm:text-2xl font-semibold tabular-nums text-slate-900 dark:text-white">
            {totalBusinesses}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {verifiedUsers} verified · {pendingKycUsers} unverified
          </div>
        </Link>
      </div>

      {/* Today's Requests by Service (Moved Up) */}
      <section className="rounded-xl bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-3.5">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white [text-wrap:balance]">
            Today&apos;s Requests by Service
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            {totalTx} total
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 sm:gap-3">
          {SERVICE_ORDER.map((svc) => {
            const count = breakdownMap.get(svc) ?? 0;
            return (
              <Link
                key={svc}
                href={`/staff/transactions?serviceType=${svc}`}
                className="min-h-16 px-3.5 py-3 rounded-lg bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors flex flex-col justify-between"
              >
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {SERVICE_LABELS[svc]}
                </span>
                <span className="text-lg font-semibold tabular-nums text-slate-900 dark:text-white mt-1">
                  {count}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* Active Service Routing Snapshot */}
      <section className="rounded-xl bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-3.5">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white [text-wrap:balance]">
            Active Routing
          </h2>
          <Link
            href="/staff/routing"
            className="text-xs font-medium text-[#126BEB] dark:text-[#38BDF8] hover:underline inline-flex items-center gap-1 min-h-11 sm:min-h-8 px-1"
          >
            <span>Manage</span>
            <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-3">
          {SERVICE_ORDER.map((svc) => {
            const rawStrategy = routingMap.get(svc) || 'MONNIFY_ONLY';
            return (
              <Link
                key={svc}
                href="/staff/routing"
                className="min-h-14 px-3.5 py-3 rounded-lg bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors flex items-center sm:flex-col sm:items-start justify-between gap-2"
              >
                <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  {SERVICE_LABELS[svc]}
                </span>
                <span className="text-xs font-semibold text-slate-900 dark:text-white">
                  {STRATEGY_LABELS[rawStrategy] || rawStrategy}
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
