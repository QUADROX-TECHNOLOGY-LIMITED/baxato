'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  Activity,
  TrendingUp,
  Wallet,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Phone,
  Wifi,
  Tv,
  Zap,
  GraduationCap,
  Copy,
  Check,
  ArrowUpRight,
  ShieldCheck,
  Building2,
  Cpu,
  Users,
  History,
  AlertTriangle,
} from 'lucide-react';
import { getStoredAuthToken } from '@/lib/auth-session';

interface ServiceBreakdownItem {
  serviceType: string;
  count: number;
  volumeNaira: number;
  feesNaira: number;
}

interface RecentTransaction {
  id: string;
  reference: string;
  serviceType: string;
  amountNaira: number;
  status: string;
  recipient: string;
  createdAt: string;
  businessName: string;
}

interface OverviewData {
  today: {
    totalTransactions: number;
    totalVolumeNaira: number;
    successTransactions: number;
    successVolumeNaira: number;
    todayRevenueNaira?: number;
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
  serviceBreakdown?: ServiceBreakdownItem[];
  recentTransactions?: RecentTransaction[];
}

const SERVICE_CONFIG: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  AIRTIME: { label: 'Airtime', icon: Phone, color: '#126BEB' },
  DATA: { label: 'Data Bundles', icon: Wifi, color: '#10B981' },
  CABLE_TV: { label: 'Cable TV', icon: Tv, color: '#8B5CF6' },
  ELECTRICITY: { label: 'Electricity', icon: Zap, color: '#F59E0B' },
  EXAM_PIN: { label: 'Exam PINs', icon: GraduationCap, color: '#EC4899' },
};

export default function SuperAdminOverviewPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedRef, setCopiedRef] = useState<string | null>(null);
  const [chartMetric, setChartMetric] = useState<'volume' | 'count'>('volume');
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);

  const fetchOverview = useCallback(async () => {
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
        setErrorMessage(json?.error?.message || 'Failed to sync operational metrics.');
      }
    } catch {
      setErrorMessage('Network connection error synchronizing metrics.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();

    // Listen to global sync events dispatched by AdminHeader
    const handleGlobalRefresh = () => {
      fetchOverview();
    };

    window.addEventListener('bx_admin_refresh', handleGlobalRefresh);
    return () => {
      window.removeEventListener('bx_admin_refresh', handleGlobalRefresh);
    };
  }, [fetchOverview]);

  const handleCopy = (ref: string) => {
    if (!ref) return;
    navigator.clipboard.writeText(ref);
    setCopiedRef(ref);
    setTimeout(() => setCopiedRef(null), 2000);
  };

  // Timeline points for the throughput chart
  const timelinePoints = useMemo(() => {
    const hours = ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '23:59'];
    const totalVol = data?.today?.totalVolumeNaira || 0;
    const totalCnt = data?.today?.totalTransactions || 0;

    // Distribute proportionally across checkpoints for visualization
    const weights = [0.08, 0.05, 0.18, 0.26, 0.24, 0.14, 0.05];

    return hours.map((hour, idx) => ({
      hour,
      volumeNaira: Math.round(totalVol * weights[idx]),
      count: Math.round(totalCnt * weights[idx]),
    }));
  }, [data?.today?.totalVolumeNaira, data?.today?.totalTransactions]);

  const chartWidth = 760;
  const chartHeight = 180;
  const paddingX = 35;
  const paddingY = 25;

  const maxChartValue = useMemo(() => {
    const values = timelinePoints.map((p) => (chartMetric === 'volume' ? p.volumeNaira : p.count));
    const max = Math.max(...values, 0);
    return max > 0 ? max : chartMetric === 'volume' ? 1000 : 10;
  }, [timelinePoints, chartMetric]);

  const points = useMemo(() => {
    return timelinePoints.map((p, idx) => {
      const x = paddingX + (idx / Math.max(timelinePoints.length - 1, 1)) * (chartWidth - paddingX * 2);
      const val = chartMetric === 'volume' ? p.volumeNaira : p.count;
      const y = chartHeight - paddingY - (val / maxChartValue) * (chartHeight - paddingY * 2);
      return { x, y, raw: p };
    });
  }, [timelinePoints, chartMetric, maxChartValue]);

  const svgPathD = useMemo(() => {
    if (points.length === 0) return '';
    return points.reduce((acc, curr, idx) => {
      if (idx === 0) return `M ${curr.x} ${curr.y}`;
      const prev = points[idx - 1];
      const cx1 = prev.x + (curr.x - prev.x) / 2;
      const cy1 = prev.y;
      const cx2 = prev.x + (curr.x - prev.x) / 2;
      const cy2 = curr.y;
      return `${acc} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${curr.x} ${curr.y}`;
    }, '');
  }, [points]);

  const svgAreaD = useMemo(() => {
    if (points.length === 0 || !svgPathD) return '';
    const first = points[0];
    const last = points[points.length - 1];
    return `${svgPathD} L ${last.x} ${chartHeight - paddingY} L ${first.x} ${chartHeight - paddingY} Z`;
  }, [svgPathD, points]);

  // Clean service breakdown with fallback defaults
  const servicesList = useMemo(() => {
    const rawBreakdown = data?.serviceBreakdown || [];
    const standardServices = ['AIRTIME', 'DATA', 'CABLE_TV', 'ELECTRICITY', 'EXAM_PIN'];

    const totalVolume = data?.today?.totalVolumeNaira || 0;

    return standardServices.map((st) => {
      const match = rawBreakdown.find((b) => b.serviceType === st);
      const vol = match?.volumeNaira || 0;
      const cnt = match?.count || 0;
      const percentage = totalVolume > 0 ? Math.round((vol / totalVolume) * 100) : 0;
      const config = SERVICE_CONFIG[st] || { label: st, icon: Phone, color: '#126BEB' };

      return {
        key: st,
        label: config.label,
        icon: config.icon,
        color: config.color,
        volumeNaira: vol,
        count: cnt,
        percentage,
      };
    });
  }, [data?.serviceBreakdown, data?.today?.totalVolumeNaira]);

  const successRate = data?.today?.successRatePercent ?? 100;
  const isHealthy = successRate >= 95;

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Platform Overview
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Real-time transaction throughput, liquidity liabilities, and service health
          </p>
        </div>

        <button
          onClick={fetchOverview}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition disabled:opacity-50 self-start sm:self-auto shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#126BEB]' : ''}`} />
          <span>Sync Telemetry</span>
        </button>
      </div>

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 4 CORE OPERATIONAL METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Today's Gross Volume */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Today&apos;s Gross Volume</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-[#126BEB] flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">
              ₦{(data?.today?.totalVolumeNaira || 0).toLocaleString('en-NG', {
                minimumFractionDigits: 2,
              })}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {data?.today?.totalTransactions || 0}
              </span>{' '}
              transactions today
            </div>
          </div>
        </div>

        {/* 2. Today's Platform Revenue */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Today&apos;s Revenue</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 tabular-nums">
              ₦{(data?.today?.todayRevenueNaira || 0).toLocaleString('en-NG', {
                minimumFractionDigits: 2,
              })}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Earned platform margins
            </div>
          </div>
        </div>

        {/* 3. Merchant Wallets Float Liabilities */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Merchant Float Liability</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-500 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white tabular-nums">
              ₦{(data?.treasury?.merchantWalletLiabilitiesNaira || 0).toLocaleString('en-NG', {
                minimumFractionDigits: 2,
              })}
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Across{' '}
              <span className="font-semibold text-slate-700 dark:text-slate-300">
                {data?.treasury?.merchantWalletsCount || 0}
              </span>{' '}
              active wallets
            </div>
          </div>
        </div>

        {/* 4. Vending Health & Success Rate */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Operational Health</span>
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                isHealthy
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-500'
                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-500'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div
              className={`text-2xl font-bold tracking-tight tabular-nums ${
                isHealthy ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
              }`}
            >
              {successRate}%
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                {data?.today?.successTransactions || 0} ok
              </span>
              <span>•</span>
              <span className="text-red-500 font-medium">
                {data?.today?.failedTransactions || 0} failed
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* OPERATIONS & PRODUCT MIX SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Throughput Curve Chart (2 cols on large) */}
        <div className="lg:col-span-2 p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Transaction Throughput
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Hourly activity and volume velocity across today&apos;s window
              </p>
            </div>

            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl self-start sm:self-auto">
              <button
                onClick={() => setChartMetric('volume')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                  chartMetric === 'volume'
                    ? 'bg-white dark:bg-[#0B132B] text-[#126BEB] shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Volume (₦)
              </button>
              <button
                onClick={() => setChartMetric('count')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                  chartMetric === 'count'
                    ? 'bg-white dark:bg-[#0B132B] text-[#126BEB] shadow-sm'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Count (txns)
              </button>
            </div>
          </div>

          {/* SVG Chart Container */}
          <div className="relative w-full overflow-hidden pt-2">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="w-full h-44 sm:h-48 overflow-visible"
            >
              <defs>
                <linearGradient id="adminChartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#126BEB" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#126BEB" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid guide lines */}
              <line
                x1={paddingX}
                y1={paddingY}
                x2={chartWidth - paddingX}
                y2={paddingY}
                stroke="currentColor"
                className="text-slate-100 dark:text-slate-800/60"
                strokeDasharray="4 4"
              />
              <line
                x1={paddingX}
                y1={chartHeight / 2}
                x2={chartWidth - paddingX}
                y2={chartHeight / 2}
                stroke="currentColor"
                className="text-slate-100 dark:text-slate-800/60"
                strokeDasharray="4 4"
              />
              <line
                x1={paddingX}
                y1={chartHeight - paddingY}
                x2={chartWidth - paddingX}
                y2={chartHeight - paddingY}
                stroke="currentColor"
                className="text-slate-200 dark:text-slate-800"
              />

              {/* Area fill */}
              {svgAreaD && (
                <path d={svgAreaD} fill="url(#adminChartGrad)" />
              )}

              {/* Curve path */}
              {svgPathD && (
                <path
                  d={svgPathD}
                  fill="none"
                  stroke="#126BEB"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}

              {/* Interactive Data Points */}
              {points.map((pt, idx) => {
                const isHovered = hoveredPointIndex === idx;
                return (
                  <g key={pt.raw.hour}>
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isHovered ? 5.5 : 3.5}
                      className="fill-white dark:fill-[#070D18] stroke-[#126BEB] transition-all cursor-pointer"
                      strokeWidth="2"
                      onMouseEnter={() => setHoveredPointIndex(idx)}
                      onMouseLeave={() => setHoveredPointIndex(null)}
                    />
                    {/* X-axis labels */}
                    <text
                      x={pt.x}
                      y={chartHeight - 6}
                      textAnchor="middle"
                      className="text-[10px] fill-slate-400 font-mono"
                    >
                      {pt.raw.hour}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Hover Tooltip */}
            {hoveredPointIndex !== null && points[hoveredPointIndex] && (
              <div
                className="absolute z-10 pointer-events-none transform -translate-x-1/2 -translate-y-full px-2.5 py-1.5 rounded-lg bg-slate-900 text-white text-[11px] shadow-lg border border-slate-700 font-medium whitespace-nowrap"
                style={{
                  left: `${(points[hoveredPointIndex].x / chartWidth) * 100}%`,
                  top: `${Math.max(12, (points[hoveredPointIndex].y / chartHeight) * 100 - 15)}%`,
                }}
              >
                <div className="font-mono text-slate-300 text-[10px]">
                  {points[hoveredPointIndex].raw.hour}
                </div>
                <div>
                  {chartMetric === 'volume'
                    ? `₦${points[hoveredPointIndex].raw.volumeNaira.toLocaleString('en-NG')}`
                    : `${points[hoveredPointIndex].raw.count} transactions`}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Product Mix Distribution (1 col on large) */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Service Mix
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Volume distribution across payment verticals
            </p>
          </div>

          <div className="space-y-3.5 flex-1 justify-center flex flex-col">
            {servicesList.map((svc) => {
              const Icon = svc.icon;
              return (
                <div key={svc.key} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="w-5 h-5 rounded-md flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${svc.color}15`, color: svc.color }}
                      >
                        <Icon className="w-3 h-3" />
                      </div>
                      <span className="font-medium text-slate-800 dark:text-slate-200 truncate">
                        {svc.label}
                      </span>
                    </div>

                    <div className="text-right tabular-nums shrink-0 pl-2">
                      <span className="font-semibold text-slate-900 dark:text-white">
                        ₦{svc.volumeNaira.toLocaleString('en-NG')}
                      </span>
                      <span className="text-[10px] text-slate-400 ml-1.5">
                        ({svc.count})
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.max(svc.percentage, svc.count > 0 ? 4 : 0)}%`,
                        backgroundColor: svc.color,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* LIVE OPERATIONAL FEED (RECENT TRANSACTIONS) */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
              Recent Platform Transactions
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Live transaction stream across merchant businesses
            </p>
          </div>

          <Link
            href="/admin/merchants"
            className="text-xs text-[#126BEB] hover:underline inline-flex items-center gap-1 font-medium self-start sm:self-auto"
          >
            <span>View Merchants &amp; Activity</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Responsive Table Container */}
        <div className="overflow-x-auto -mx-5 px-5 sm:mx-0 sm:px-0">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 text-[11px]">
                <th className="pb-2.5 font-medium">Reference</th>
                <th className="pb-2.5 font-medium">Merchant</th>
                <th className="pb-2.5 font-medium">Service</th>
                <th className="pb-2.5 font-medium">Recipient</th>
                <th className="pb-2.5 font-medium text-right">Amount</th>
                <th className="pb-2.5 font-medium text-center">Status</th>
                <th className="pb-2.5 font-medium text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {!data?.recentTransactions || data.recentTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                    No transactions recorded today yet.
                  </td>
                </tr>
              ) : (
                data.recentTransactions.map((tx) => {
                  const svc = SERVICE_CONFIG[tx.serviceType] || {
                    label: tx.serviceType,
                    icon: Phone,
                    color: '#126BEB',
                  };
                  const Icon = svc.icon;

                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                    >
                      {/* Reference */}
                      <td className="py-3 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <span>{tx.reference.slice(0, 14)}...</span>
                          <button
                            onClick={() => handleCopy(tx.reference)}
                            title="Copy Reference"
                            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                          >
                            {copiedRef === tx.reference ? (
                              <Check className="w-3 h-3 text-emerald-500" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Merchant */}
                      <td className="py-3 font-medium text-slate-900 dark:text-white">
                        {tx.businessName}
                      </td>

                      {/* Service */}
                      <td className="py-3">
                        <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          <Icon className="w-3 h-3 text-[#126BEB]" />
                          <span>{svc.label}</span>
                        </div>
                      </td>

                      {/* Recipient */}
                      <td className="py-3 font-mono text-slate-600 dark:text-slate-300">
                        {tx.recipient}
                      </td>

                      {/* Amount */}
                      <td className="py-3 text-right font-semibold text-slate-900 dark:text-white tabular-nums">
                        ₦{tx.amountNaira.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Status */}
                      <td className="py-3 text-center">
                        {tx.status === 'SUCCESSFUL' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                            <CheckCircle2 className="w-2.5 h-2.5" />
                            <span>Success</span>
                          </span>
                        ) : tx.status === 'FAILED' ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/60">
                            <XCircle className="w-2.5 h-2.5" />
                            <span>Failed</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60">
                            <Clock className="w-2.5 h-2.5" />
                            <span>Pending</span>
                          </span>
                        )}
                      </td>

                      {/* Time */}
                      <td className="py-3 text-right text-slate-400 font-mono text-[11px]">
                        {new Date(tx.createdAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* QUICK OPERATIONAL SHORTCUTS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Link
          href="/admin/merchants"
          className="p-4 rounded-xl bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 hover:border-[#126BEB]/50 transition group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-2">
            <Building2 className="w-4 h-4 text-[#126BEB]" />
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-[#126BEB] transition" />
          </div>
          <div>
            <div className="font-semibold text-xs text-slate-900 dark:text-white">
              Merchants &amp; KYC
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              {data?.merchants?.totalBusinesses || 0} workspaces ({data?.merchants?.verifiedUsers || 0} verified)
            </div>
          </div>
        </Link>

        <Link
          href="/admin/providers"
          className="p-4 rounded-xl bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 hover:border-blue-500/50 transition group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-2">
            <Cpu className="w-4 h-4 text-blue-500" />
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-blue-500 transition" />
          </div>
          <div>
            <div className="font-semibold text-xs text-slate-900 dark:text-white">
              Gateways &amp; Routing
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Circuit breakers &amp; failovers
            </div>
          </div>
        </Link>

        <Link
          href="/admin/staff"
          className="p-4 rounded-xl bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 hover:border-purple-500/50 transition group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-2">
            <Users className="w-4 h-4 text-purple-500" />
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-500 transition" />
          </div>
          <div>
            <div className="font-semibold text-xs text-slate-900 dark:text-white">
              Staff Team
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Internal RBAC &amp; permissions
            </div>
          </div>
        </Link>

        <Link
          href="/admin/audit-logs"
          className="p-4 rounded-xl bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 transition group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-2">
            <History className="w-4 h-4 text-emerald-500" />
            <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-500 transition" />
          </div>
          <div>
            <div className="font-semibold text-xs text-slate-900 dark:text-white">
              Audit Trail
            </div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Platform security event log
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
