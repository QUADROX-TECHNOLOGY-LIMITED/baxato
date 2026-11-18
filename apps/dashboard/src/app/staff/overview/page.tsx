'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
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

function renderExceptionBadge(status: string) {
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
        setErrorMessage(overviewJson?.error?.message || 'Unable to load operations overview.');
      }
    } catch {
      setErrorMessage('Network error loading operations overview.');
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
  const degradedGateways = providerHealth.filter(
    (p) => !p?.health?.isHealthy || (p?.circuitBreaker?.state && p.circuitBreaker.state !== 'CLOSED'),
  );
  const healthyGateways = Math.max(0, totalGateways - degradedGateways.length);

  const verifiedUsers = Number(overviewData?.merchants?.verifiedUsers || 0);
  const pendingKycUsers = Number(overviewData?.merchants?.pendingKycUsers || 0);
  const totalBusinesses = Number(overviewData?.merchants?.totalBusinesses || 0);

  const attentionTransactions: any[] = Array.isArray(overviewData?.attentionTransactions)
    ? overviewData.attentionTransactions
    : [];

  const breakdownMap = new Map<string, number>();
  if (Array.isArray(overviewData?.serviceBreakdown)) {
    for (const item of overviewData.serviceBreakdown) {
      if (item?.serviceType) {
        breakdownMap.set(String(item.serviceType), Number(item.count || 0));
      }
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight [text-wrap:balance]">
          Operations Overview
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 [text-wrap:pretty]">
          Live queues, gateway health, and requests needing attention.
        </p>
      </div>

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

      {degradedGateways.length > 0 && (
        <div className="p-3.5 sm:p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-2.5 min-w-0">
            <AlertTriangle
              className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5 sm:mt-0"
              aria-hidden="true"
            />
            <p className="text-xs text-amber-900 dark:text-amber-200 font-medium [text-wrap:pretty]">
              {degradedGateways.length === 1
                ? '1 service gateway is reporting degraded connectivity or circuit open.'
                : `${degradedGateways.length} service gateways are reporting degraded connectivity.`}
            </p>
          </div>
          <Link
            href="/staff/routing"
            className="min-h-11 sm:min-h-9 px-3.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold inline-flex items-center justify-center shrink-0 transition-colors"
          >
            Check Routing
          </Link>
        </div>
      )}

      {/* Operational Triage Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Link
          href="/staff/transactions?status=PENDING"
          className="p-4 sm:p-5 rounded-xl bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors space-y-1.5 block"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              In-Flight / Pending
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
            {pendingTx === 0 ? 'No stuck requests' : 'Awaiting settlement'}
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
            {totalTx === 0 ? 'No requests today' : `${successRate}% success (${successTx}/${totalTx})`}
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
              degradedGateways.length > 0
                ? 'text-rose-600 dark:text-rose-400'
                : 'text-emerald-600 dark:text-emerald-400'
            }`}
          >
            {totalGateways === 0
              ? '—'
              : degradedGateways.length > 0
                ? `${degradedGateways.length} Degraded`
                : 'Healthy'}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {totalGateways === 0
              ? 'Probing gateways'
              : `${healthyGateways} of ${totalGateways} online`}
          </div>
        </Link>

        <Link
          href={pendingKycUsers > 0 ? '/staff/merchants' : '/staff/merchants'}
          className="p-4 sm:p-5 rounded-xl bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors space-y-1.5 block"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Unverified KYC
            </span>
            <UserCheck className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" aria-hidden="true" />
          </div>
          <div className="text-xl sm:text-2xl font-semibold tabular-nums text-slate-900 dark:text-white">
            {pendingKycUsers}
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {verifiedUsers} verified · {totalBusinesses} workspaces
          </div>
        </Link>
      </div>

      {/* Exceptions Queue (Pending, Processing & Failed Requests ONLY) */}
      <section className="rounded-xl bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-4 sm:px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 flex-wrap">
          <div className="min-w-0">
            <h2
              id="exceptions-queue-heading"
              className="text-sm font-semibold text-slate-900 dark:text-white [text-wrap:balance]"
            >
              Exceptions Queue
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Pending, processing, and failed requests for investigation or re-query.
            </p>
          </div>
          <Link
            href="/staff/transactions"
            className="text-xs font-medium text-[#126BEB] dark:text-[#38BDF8] hover:underline inline-flex items-center gap-1 min-h-11 sm:min-h-9 px-2 shrink-0"
          >
            <span>All transactions</span>
            <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
          </Link>
        </div>

        {attentionTransactions.length === 0 ? (
          <div className="px-4 py-12 text-center space-y-2">
            <div className="w-9 h-9 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            </div>
            <p className="text-xs font-semibold text-slate-900 dark:text-white">
              All clear
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              No pending or failed requests require attention right now.
            </p>
          </div>
        ) : (
          <>
            {/* Mobile Stacked Cards */}
            <div className="md:hidden divide-y divide-slate-200/70 dark:divide-slate-800">
              {attentionTransactions.map((tx) => {
                const lookupTerm =
                  tx.providerReference ||
                  tx.requestReference ||
                  tx.clientReference ||
                  tx.reference ||
                  tx.recipient ||
                  '';
                return (
                  <div key={tx.id} className="p-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-semibold text-slate-900 dark:text-white">
                            {SERVICE_LABELS[tx.serviceType] || tx.serviceType}
                          </span>
                          {renderExceptionBadge(tx.status)}
                        </div>
                        <div className="text-xs font-mono text-slate-800 dark:text-slate-200 truncate">
                          {tx.recipient}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {tx.businessName || 'Merchant'}
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
                    </div>

                    <div className="flex items-center justify-between gap-3 pt-1">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate min-w-0">
                        {tx.errorMessage || `Ref: ${tx.reference}`}
                      </span>
                      <Link
                        href={`/staff/transactions?search=${encodeURIComponent(lookupTerm)}`}
                        className="min-h-11 px-3.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-900 dark:text-white inline-flex items-center justify-center shrink-0 transition-colors"
                      >
                        Inspect
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table */}
            <div
              tabIndex={0}
              role="region"
              aria-labelledby="exceptions-queue-heading"
              className="hidden md:block overflow-x-auto max-h-[420px] focus:outline-none"
            >
              <table className="w-full text-left border-separate border-spacing-0 text-xs">
                <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-[#0D1930]">
                  <tr className="text-slate-500 dark:text-slate-400 font-medium">
                    <th scope="col" className="py-3 px-4 border-b border-slate-200 dark:border-slate-800">
                      Status
                    </th>
                    <th scope="col" className="py-3 px-4 border-b border-slate-200 dark:border-slate-800">
                      Service
                    </th>
                    <th scope="col" className="py-3 px-4 border-b border-slate-200 dark:border-slate-800">
                      Recipient
                    </th>
                    <th scope="col" className="py-3 px-4 border-b border-slate-200 dark:border-slate-800">
                      Merchant
                    </th>
                    <th scope="col" className="py-3 px-4 border-b border-slate-200 dark:border-slate-800">
                      Amount
                    </th>
                    <th scope="col" className="py-3 px-4 border-b border-slate-200 dark:border-slate-800">
                      Reason / Reference
                    </th>
                    <th scope="col" className="py-3 px-4 border-b border-slate-200 dark:border-slate-800">
                      Time
                    </th>
                    <th
                      scope="col"
                      className="py-3 px-4 border-b border-slate-200 dark:border-slate-800 text-right"
                    >
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                  {attentionTransactions.map((tx) => {
                    const lookupTerm =
                      tx.providerReference ||
                      tx.requestReference ||
                      tx.clientReference ||
                      tx.reference ||
                      tx.recipient ||
                      '';
                    return (
                      <tr
                        key={tx.id}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition-colors"
                      >
                        <td className="py-3 px-4 whitespace-nowrap">
                          {renderExceptionBadge(tx.status)}
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-900 dark:text-white whitespace-nowrap">
                          {SERVICE_LABELS[tx.serviceType] || tx.serviceType}
                        </td>
                        <th
                          scope="row"
                          className="py-3 px-4 font-mono font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap"
                        >
                          {tx.recipient}
                        </th>
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-900 dark:text-white truncate max-w-[160px]">
                            {tx.businessName || 'Merchant'}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white tabular-nums whitespace-nowrap">
                          {tx.formattedAmount}
                        </td>
                        <td className="py-3 px-4 text-slate-500 dark:text-slate-400 max-w-[240px]">
                          <span className="block truncate" title={tx.errorMessage || tx.reference}>
                            {tx.errorMessage || tx.reference}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          {new Date(tx.createdAt).toLocaleTimeString('en-NG', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <Link
                            href={`/staff/transactions?search=${encodeURIComponent(lookupTerm)}`}
                            className="min-h-8 px-3 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold text-slate-900 dark:text-white inline-flex items-center justify-center transition-colors"
                          >
                            Inspect
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {/* Today's Service Throughput (Request Counts Only — Zero Revenue/Float Exposure) */}
      <section className="rounded-xl bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white [text-wrap:balance]">
            Today&apos;s Requests by Service
          </h2>
          <span className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
            {totalTx} total today
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 sm:gap-3">
          {SERVICE_ORDER.map((svc) => {
            const count = breakdownMap.get(svc) ?? 0;
            return (
              <Link
                key={svc}
                href={`/staff/transactions?serviceType=${svc}`}
                className="min-h-14 px-3.5 py-3 rounded-lg bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors flex flex-col justify-between"
              >
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  {SERVICE_LABELS[svc]}
                </span>
                <span className="text-base font-semibold tabular-nums text-slate-900 dark:text-white mt-1">
                  {count}
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
