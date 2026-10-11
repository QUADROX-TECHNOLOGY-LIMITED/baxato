'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
  Smartphone,
  Wifi,
  Tv,
  GraduationCap,
  Clock,
  ArrowUpRight,
  Download,
  RefreshCw,
  Layers,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Filter,
  Server,
  Globe,
  Cpu,
  Receipt,
  ChevronDown,
  Info,
  Check,
  PieChart,
  XCircle,
  AlertTriangle,
  Building,
  SlidersHorizontal,
} from 'lucide-react';
import Sidebar from '@/components/dashboard/Sidebar';
import Header from '@/components/dashboard/Header';
import KycBanner from '@/components/dashboard/KycBanner';
import KycModal from '@/components/dashboard/KycModal';
import {
  getStoredAuthToken,
  getStoredUser,
  getStoredBusiness,
  clearSessionAndRedirect,
} from '@/lib/auth-session';

type Timeframe = 'today' | '7d' | '30d' | '90d' | 'ytd';
type ServiceFilter = 'ALL' | 'AIRTIME' | 'DATA' | 'ELECTRICITY' | 'CABLE_TV' | 'EXAM_PIN';
type ChannelFilter = 'ALL' | 'API' | 'CONSOLE';

interface TimelinePoint {
  bucket: string;
  label: string;
  volumeNaira: number;
  successfulVolumeNaira: number;
  count: number;
  successfulCount: number;
  failedCount: number;
  successRate: number;
}

interface ServiceBreakdownItem {
  serviceType: string;
  label: string;
  count: number;
  successfulCount: number;
  failedCount: number;
  volumeKobo: string;
  volumeNaira: number;
  formattedVolume: string;
  volumeShare: number;
  successRate: number;
  avgTicketNaira: number;
  formattedAvgTicket: string;
  discountNaira: number;
  formattedDiscount: string;
}

interface TopOperatorItem {
  operator: string;
  serviceType: string;
  count: number;
  successfulCount: number;
  volumeNaira: number;
  formattedVolume: string;
  volumeShare: number;
  successRate: number;
}

interface FailureReasonItem {
  reason: string;
  count: number;
  lostVolumeNaira: number;
  formattedLostVolume: string;
  percentage: number;
}

interface HourlyDensityItem {
  hour: number;
  label: string;
  count: number;
  volumeNaira: number;
  formattedVolume: string;
  percentage: number;
}

interface AnalyticsData {
  timeframe: string;
  startDate: string;
  endDate: string;
  serviceFilter: string;
  channelFilter: string;
  summary: {
    totalVolumeKobo: string;
    totalVolumeNaira: number;
    formattedTotalVolume: string;
    successfulVolumeKobo: string;
    successfulVolumeNaira: number;
    formattedSuccessfulVolume: string;
    totalCount: number;
    successfulCount: number;
    failedCount: number;
    pendingCount: number;
    reversedCount: number;
    successRate: number;
    avgTicketNaira: number;
    formattedAvgTicket: string;
    totalDiscountKobo: string;
    totalDiscountNaira: number;
    formattedTotalDiscount: string;
    totalFeeKobo: string;
    totalFeeNaira: number;
    formattedTotalFee: string;
    commissionEarnedKobo: string;
    commissionEarnedNaira: number;
    formattedCommissionEarned: string;
    volumeGrowthRate: number;
    countGrowthRate: number;
    successRateDelta: number;
  };
  timeline: TimelinePoint[];
  serviceBreakdown: ServiceBreakdownItem[];
  channelBreakdown: {
    api: {
      count: number;
      successfulCount: number;
      volumeNaira: number;
      formattedVolume: string;
      volumeShare: number;
      successRate: number;
    };
    console: {
      count: number;
      successfulCount: number;
      volumeNaira: number;
      formattedVolume: string;
      volumeShare: number;
      successRate: number;
    };
  };
  topOperators: TopOperatorItem[];
  failureDiagnostics: {
    totalFailed: number;
    failureRate: number;
    topReasons: FailureReasonItem[];
    statusDistribution: {
      successful: number;
      failed: number;
      pending: number;
      reversed: number;
    };
  };
  hourlyDensity: HourlyDensityItem[];
}

export default function AnalyticsPage() {
  const [timeframe, setTimeframe] = useState<Timeframe>('30d');
  const [serviceFilter, setServiceFilter] = useState<ServiceFilter>('ALL');
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>('ALL');
  const [chartMetric, setChartMetric] = useState<'volume' | 'count'>('volume');
  const [chartStyle, setChartStyle] = useState<'curve' | 'bar'>('curve');
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);
  const [hoveredDonutIndex, setHoveredDonutIndex] = useState<number | null>(null);

  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [businessName, setBusinessName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const b = getStoredBusiness();
      if (b?.name) return b.name;
    }
    return '';
  });
  const [merchantName, setMerchantName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const u = getStoredUser();
      if (u?.firstName) return u.firstName;
    }
    return '';
  });
  const [kycStatus, setKycStatus] = useState<string>('UNVERIFIED');
  const [userRole, setUserRole] = useState<string>('BUSINESS_OWNER');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isKycModalOpen, setIsKycModalOpen] = useState<boolean>(false);

  // Fetch real analytics telemetry
  const fetchAnalytics = useCallback(async (customBizId?: string) => {
    const token = getStoredAuthToken();
    if (!token) {
      clearSessionAndRedirect('expired');
      return;
    }

    const storedBiz = getStoredBusiness();
    const activeBizId = customBizId || storedBiz?.id;

    try {
      const params = new URLSearchParams();
      params.set('timeframe', timeframe);
      if (serviceFilter !== 'ALL') params.set('serviceType', serviceFilter);
      if (channelFilter !== 'ALL') params.set('channel', channelFilter);

      const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
      };
      if (activeBizId) {
        headers['x-business-id'] = activeBizId;
      }

      const res = await fetch(`/api/analytics?${params.toString()}`, { headers });
      const json = await res.json().catch(() => null);

      if (res.ok && json?.success && json.data) {
        setAnalyticsData(json.data);
      } else {
        console.warn('Analytics fetch error:', json?.error);
      }
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [timeframe, serviceFilter, channelFilter]);

  // Initial load and auth check
  useEffect(() => {
    const token = getStoredAuthToken();
    if (!token) {
      clearSessionAndRedirect('expired');
      return;
    }

    try {
      const storedUser = getStoredUser();
      const storedBiz = getStoredBusiness();

      if (storedUser) {
        if (storedUser.role) setUserRole(storedUser.role);
        if (storedUser.firstName) setMerchantName(storedUser.firstName);
        if (storedUser.kycStatus) setKycStatus(storedUser.kycStatus);
      }
      if (storedBiz?.name) {
        setBusinessName(storedBiz.name);
      }
    } catch {}

    fetchAnalytics();
  }, [fetchAnalytics]);

  // Reactive Workspace Switcher listener (Zero-Reload)
  useEffect(() => {
    const handleBusinessSwitched = (e: any) => {
      const biz = e.detail?.business;
      if (biz?.name) setBusinessName(biz.name);
      if (biz?.role) setUserRole(biz.role);
      setIsLoading(true);
      fetchAnalytics(biz?.id);
    };

    window.addEventListener('bx_business_switched', handleBusinessSwitched);
    return () => window.removeEventListener('bx_business_switched', handleBusinessSwitched);
  }, [fetchAnalytics]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchAnalytics();
    showToast('Analytics refreshed successfully');
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const formatNaira = (val: number) => {
    return `₦${val.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Export Analytics to CSV
  const handleExportCSV = () => {
    if (!analyticsData) return;

    const summary = analyticsData.summary;
    const csvRows: (string | number)[][] = [
      ['BAXATO MERCHANT ANALYTICS REPORT'],
      ['Workspace', businessName],
      ['Timeframe', timeframe.toUpperCase()],
      ['Date Range', `${analyticsData.startDate} to ${analyticsData.endDate}`],
      ['Generated At', new Date().toISOString()],
      [],
      ['EXECUTIVE SUMMARY KPI'],
      ['Metric', 'Value'],
      ['Gross Vended Volume (NGN)', summary.totalVolumeNaira.toFixed(2)],
      ['Successful Volume (NGN)', summary.successfulVolumeNaira.toFixed(2)],
      ['Total Transactions', summary.totalCount],
      ['Successful Transactions', summary.successfulCount],
      ['Failed Transactions', summary.failedCount],
      ['Pending Transactions', summary.pendingCount],
      ['Reversed Transactions', summary.reversedCount],
      ['Success Rate (%)', `${summary.successRate}%`],
      ['Volume Growth vs Prior Period (%)', `${summary.volumeGrowthRate}%`],
      ['Count Growth vs Prior Period (%)', `${summary.countGrowthRate}%`],
      ['Average Order Value (NGN)', summary.avgTicketNaira.toFixed(2)],
      ['Merchant Discount / Margin (NGN)', summary.totalDiscountNaira.toFixed(2)],
      ['Commission Wallet Earned (NGN)', summary.commissionEarnedNaira.toFixed(2)],
      [],
      ['PRODUCT / SERVICE PERFORMANCE'],
      ['Service Category', 'Volume (NGN)', 'Volume Share (%)', 'Count', 'Success Rate (%)', 'Margin (NGN)'],
      ...analyticsData.serviceBreakdown.map((s) => [
        s.label,
        s.volumeNaira.toFixed(2),
        `${s.volumeShare}%`,
        s.count,
        `${s.successRate}%`,
        s.discountNaira.toFixed(2),
      ]),
      [],
      ['CHANNELS PERFORMANCE'],
      ['Channel', 'Volume (NGN)', 'Volume Share (%)', 'Count', 'Success Rate (%)'],
      [
        'REST API',
        analyticsData.channelBreakdown.api.volumeNaira.toFixed(2),
        `${analyticsData.channelBreakdown.api.volumeShare}%`,
        analyticsData.channelBreakdown.api.count,
        `${analyticsData.channelBreakdown.api.successRate}%`,
      ],
      [
        'Web Console',
        analyticsData.channelBreakdown.console.volumeNaira.toFixed(2),
        `${analyticsData.channelBreakdown.console.volumeShare}%`,
        analyticsData.channelBreakdown.console.count,
        `${analyticsData.channelBreakdown.console.successRate}%`,
      ],
      [],
      ['DAILY / HOURLY TIMELINE BREAKDOWN'],
      ['Bucket Label', 'Total Volume (NGN)', 'Successful Volume (NGN)', 'Total Count', 'Success Count', 'Failed Count', 'Success Rate (%)'],
      ...analyticsData.timeline.map((t) => [
        t.label,
        t.volumeNaira.toFixed(2),
        t.successfulVolumeNaira.toFixed(2),
        t.count,
        t.successfulCount,
        t.failedCount,
        `${t.successRate}%`,
      ]),
    ];

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      csvRows.map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `baxato_analytics_${timeframe}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast('Analytics summary exported as CSV');
  };

  // Visual Palette configuration for services
  const serviceTheme: Record<string, { color: string; hex: string; bg: string; badge: string; icon: any }> = {
    AIRTIME: {
      color: 'text-emerald-500',
      hex: '#10b981',
      bg: 'bg-emerald-500',
      badge: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900',
      icon: Smartphone,
    },
    DATA: {
      color: 'text-blue-500',
      hex: '#3b82f6',
      bg: 'bg-blue-500',
      badge: 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-900',
      icon: Wifi,
    },
    ELECTRICITY: {
      color: 'text-amber-500',
      hex: '#f59e0b',
      bg: 'bg-amber-500',
      badge: 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900',
      icon: Zap,
    },
    CABLE_TV: {
      color: 'text-purple-500',
      hex: '#8b5cf6',
      bg: 'bg-purple-500',
      badge: 'bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-900',
      icon: Tv,
    },
    EXAM_PIN: {
      color: 'text-rose-500',
      hex: '#f43f5e',
      bg: 'bg-rose-500',
      badge: 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900',
      icon: GraduationCap,
    },
  };

  // SVG Master Chart Calculations
  const timelinePoints = analyticsData?.timeline || [];
  const maxChartValue = useMemo(() => {
    if (timelinePoints.length === 0) return 100;
    const max = Math.max(
      ...timelinePoints.map((p) => (chartMetric === 'volume' ? p.volumeNaira : p.count)),
      0,
    );
    return max > 0 ? max : 100;
  }, [timelinePoints, chartMetric]);

  const chartWidth = 760;
  const chartHeight = 220;
  const paddingX = 40;
  const paddingY = 25;

  const points = useMemo(() => {
    if (timelinePoints.length === 0) return [];
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

  // Donut Chart Segment Calculations
  const donutSegments = useMemo(() => {
    if (!analyticsData || analyticsData.serviceBreakdown.length === 0) return [];
    const radius = 64;
    const circumference = 2 * Math.PI * radius;
    let accumulatedOffset = 0;

    const totalVol = analyticsData.summary.totalVolumeNaira || 1;

    return analyticsData.serviceBreakdown.map((item, idx) => {
      const pct = (item.volumeNaira / totalVol) * 100;
      const strokeLength = (pct / 100) * circumference;
      const offset = circumference - accumulatedOffset;
      accumulatedOffset += strokeLength;

      const meta = serviceTheme[item.serviceType] || {
        hex: '#64748b',
        color: 'text-slate-400',
        badge: '',
      };

      return {
        ...item,
        percentage: Number(pct.toFixed(1)),
        strokeDasharray: `${strokeLength} ${circumference}`,
        strokeDashoffset: -accumulatedOffset + strokeLength,
        colorHex: meta.hex,
        index: idx,
      };
    });
  }, [analyticsData]);

  // Active Summary values
  const summary = analyticsData?.summary;
  const isZeroTxn = (summary?.totalCount || 0) === 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070D18] text-slate-800 dark:text-slate-100 flex flex-col lg:flex-row transition-colors duration-150">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-semibold animate-in fade-in slide-in-from-bottom-3 duration-200">
          <Check className="w-4 h-4 text-emerald-400 dark:text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Sidebar Navigation */}
      <Sidebar
        businessName={businessName}
        merchantName={merchantName}
        kycStatus={kycStatus}
        userRole={userRole}
        onOpenKycModal={() => setIsKycModalOpen(true)}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-72">
        <Header
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onOpenKycModal={() => setIsKycModalOpen(true)}
          merchantName={merchantName}
          businessName={businessName}
          kycStatus={kycStatus}
          userRole={userRole}
          isRefreshing={isRefreshing}
          onRefresh={handleRefresh}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6 sm:space-y-8">
          {/* Identity Verification Warning Banner (if unverified) */}
          <KycBanner
            kycStatus={kycStatus}
            userRole={userRole}
            onOpenKycModal={() => setIsKycModalOpen(true)}
          />

          {/* Top Page Control Header */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-[#126BEB]/10 dark:bg-[#126BEB]/20 text-[#126BEB] dark:text-[#38BDF8] flex items-center justify-center border border-[#126BEB]/20 shadow-xs">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                    Analytics & Business Intelligence
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                    Live transaction velocity, service margins, error telemetry, and trading volume for <span className="font-semibold text-slate-800 dark:text-slate-200">{businessName || 'Workspace'}</span>.
                  </p>
                </div>
              </div>
            </div>

            {/* Timeframe & Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
              {/* Timeframe Pill Selector */}
              <div className="inline-flex p-1 bg-slate-200/70 dark:bg-[#0B1528] rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-semibold shadow-inner">
                {(
                  [
                    { key: 'today', label: '24h' },
                    { key: '7d', label: '7D' },
                    { key: '30d', label: '30D' },
                    { key: '90d', label: '90D' },
                    { key: 'ytd', label: 'YTD' },
                  ] as { key: Timeframe; label: string }[]
                ).map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setTimeframe(item.key)}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      timeframe === item.key
                        ? 'bg-white dark:bg-[#126BEB] text-slate-900 dark:text-white shadow-xs font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Service Filter Dropdown */}
              <div className="relative">
                <select
                  value={serviceFilter}
                  onChange={(e) => setServiceFilter(e.target.value as ServiceFilter)}
                  aria-label="Filter analytics by service type"
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1528] text-slate-700 dark:text-slate-300 text-xs font-semibold shadow-xs focus:outline-none focus:ring-2 focus:ring-[#126BEB]/30 cursor-pointer"
                >
                  <option value="ALL">All Services</option>
                  <option value="AIRTIME">Airtime</option>
                  <option value="DATA">Data Bundles</option>
                  <option value="ELECTRICITY">Electricity</option>
                  <option value="CABLE_TV">Cable TV</option>
                  <option value="EXAM_PIN">Exam PINs</option>
                </select>
              </div>

              {/* Channel Filter Dropdown */}
              <div className="relative">
                <select
                  value={channelFilter}
                  onChange={(e) => setChannelFilter(e.target.value as ChannelFilter)}
                  aria-label="Filter analytics by channel"
                  className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1528] text-slate-700 dark:text-slate-300 text-xs font-semibold shadow-xs focus:outline-none focus:ring-2 focus:ring-[#126BEB]/30 cursor-pointer"
                >
                  <option value="ALL">All Channels</option>
                  <option value="API">API Gateway</option>
                  <option value="CONSOLE">Web Console</option>
                </select>
              </div>

              {/* Refresh Button */}
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="p-2 sm:px-3 sm:py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1528] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
                title="Refresh real metrics"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#126BEB]' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>

              {/* Export CSV Button */}
              <button
                onClick={handleExportCSV}
                disabled={isLoading || isZeroTxn}
                className="px-3.5 py-2 rounded-xl bg-[#126BEB] hover:bg-[#0B5CC7] active:bg-[#094bb5] text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          {/* 5 Executive KPI Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* KPI 1: Gross Vended Volume */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0B1528] border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col justify-between group hover:border-[#126BEB]/40 transition-all">
              <div>
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold mb-1.5">
                  <span>Gross Volume</span>
                  {summary && summary.volumeGrowthRate !== 0 && (
                    <span
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                        summary.volumeGrowthRate > 0
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900'
                          : 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900'
                      }`}
                    >
                      {summary.volumeGrowthRate > 0 ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      {summary.volumeGrowthRate > 0 ? `+${summary.volumeGrowthRate}%` : `${summary.volumeGrowthRate}%`}
                    </span>
                  )}
                </div>
                {isLoading ? (
                  <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse w-3/4 my-1" />
                ) : (
                  <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    {summary?.formattedTotalVolume || '₦0.00'}
                  </div>
                )}
              </div>
              <p className="text-[10.5px] text-slate-400 mt-2 truncate">
                Fulfilled: <span className="font-semibold text-slate-700 dark:text-slate-300">{summary?.formattedSuccessfulVolume || '₦0.00'}</span>
              </p>
            </div>

            {/* KPI 2: Total Transactions */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0B1528] border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col justify-between group hover:border-[#126BEB]/40 transition-all">
              <div>
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold mb-1.5">
                  <span>Total Transactions</span>
                  {summary && (
                    <span
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                        summary.successRate >= 90
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900'
                          : summary.successRate >= 60
                          ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900'
                          : 'bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900'
                      }`}
                    >
                      {summary.successRate}% Success
                    </span>
                  )}
                </div>
                {isLoading ? (
                  <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse w-1/2 my-1" />
                ) : (
                  <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    {(summary?.totalCount || 0).toLocaleString()}
                  </div>
                )}
              </div>
              <p className="text-[10.5px] text-slate-400 mt-2 truncate">
                {summary ? `${summary.successfulCount} success • ${summary.failedCount} failed` : 'Throughput'}
              </p>
            </div>

            {/* KPI 3: Merchant Margin / Discounts */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0B1528] border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col justify-between group hover:border-[#126BEB]/40 transition-all">
              <div>
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold mb-1.5">
                  <span>Net Margin / Discount</span>
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                    Earned
                  </span>
                </div>
                {isLoading ? (
                  <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse w-2/3 my-1" />
                ) : (
                  <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                    {summary?.formattedTotalDiscount || '₦0.00'}
                  </div>
                )}
              </div>
              <p className="text-[10.5px] text-slate-400 mt-2 truncate">
                Direct discounts saved on vends
              </p>
            </div>

            {/* KPI 4: Average Order Value */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0B1528] border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col justify-between group hover:border-[#126BEB]/40 transition-all">
              <div>
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold mb-1.5">
                  <span>Avg. Ticket Size</span>
                  <Activity className="w-3.5 h-3.5 text-slate-400" />
                </div>
                {isLoading ? (
                  <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse w-2/3 my-1" />
                ) : (
                  <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    {summary?.formattedAvgTicket || '₦0.00'}
                  </div>
                )}
              </div>
              <p className="text-[10.5px] text-slate-400 mt-2 truncate">
                Average per successful vend
              </p>
            </div>

            {/* KPI 5: API Throughput Velocity */}
            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0B1528] border border-slate-200/90 dark:border-slate-800 shadow-xs flex flex-col justify-between group hover:border-[#126BEB]/40 transition-all">
              <div>
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold mb-1.5">
                  <span>API Traffic Share</span>
                  <span className="text-[10px] font-bold text-slate-400">
                    {analyticsData?.channelBreakdown?.console?.volumeShare || 0}% Console
                  </span>
                </div>
                {isLoading ? (
                  <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse w-1/2 my-1" />
                ) : (
                  <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    {analyticsData?.channelBreakdown?.api?.volumeShare || 0}%
                  </div>
                )}
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2">
                <div
                  className="bg-[#126BEB] h-full rounded-full transition-all duration-500"
                  style={{ width: `${analyticsData?.channelBreakdown?.api?.volumeShare || 0}%` }}
                />
              </div>
            </div>
          </div>

          {/* Section 1: Master Interactive Visualizer (Curve vs Grouped Bars) */}
          <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#0B1528] border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Vending Velocity & Trajectory</span>
                  <span className="text-xs font-normal text-slate-400">
                    • {timeframe.toUpperCase()} Window
                  </span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Accurate, real-time disbursement trajectory across all bill vending services.
                </p>
              </div>

              {/* Chart Controls: Metric & Style Toggle */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Metric Selector */}
                <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-[#060D18] rounded-xl border border-slate-200 dark:border-slate-800/80 text-xs">
                  <button
                    onClick={() => setChartMetric('volume')}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                      chartMetric === 'volume'
                        ? 'bg-white dark:bg-[#126BEB] text-slate-900 dark:text-white shadow-xs font-bold'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Volume (₦)
                  </button>
                  <button
                    onClick={() => setChartMetric('count')}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                      chartMetric === 'count'
                        ? 'bg-white dark:bg-[#126BEB] text-slate-900 dark:text-white shadow-xs font-bold'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Count
                  </button>
                </div>

                {/* Chart Style Toggle (Curve vs Bars) */}
                <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-[#060D18] rounded-xl border border-slate-200 dark:border-slate-800/80 text-xs">
                  <button
                    onClick={() => setChartStyle('curve')}
                    className={`px-2.5 py-1.5 rounded-lg font-semibold transition-all ${
                      chartStyle === 'curve'
                        ? 'bg-white dark:bg-[#126BEB] text-slate-900 dark:text-white shadow-xs font-bold'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Area Curve
                  </button>
                  <button
                    onClick={() => setChartStyle('bar')}
                    className={`px-2.5 py-1.5 rounded-lg font-semibold transition-all ${
                      chartStyle === 'bar'
                        ? 'bg-white dark:bg-[#126BEB] text-slate-900 dark:text-white shadow-xs font-bold'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Grouped Bars
                  </button>
                </div>
              </div>
            </div>

            {/* Chart Canvas */}
            {isLoading ? (
              <div className="w-full h-[260px] flex items-center justify-center">
                <div className="flex flex-col items-center gap-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-[#126BEB]" />
                  <span className="text-xs text-slate-400">Loading live chart telemetry...</span>
                </div>
              </div>
            ) : isZeroTxn ? (
              <div className="w-full h-[260px] flex flex-col items-center justify-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-[#081120]/50 p-6 text-center">
                <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-[#126BEB] flex items-center justify-center mb-3">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  No Transactions Recorded For This Period
                </h3>
                <p className="text-xs text-slate-400 max-w-sm mt-1">
                  Once airtime, data, electricity, cable TV, or exam PINs are vended via your API keys or console, live volume curves will display here in real time.
                </p>
                <div className="flex items-center gap-2 mt-4">
                  <Link
                    href="/dashboard/airtime"
                    className="px-3 py-1.5 rounded-lg bg-[#126BEB] text-white text-xs font-bold shadow-xs hover:bg-[#0B5CC7]"
                  >
                    Vend Airtime Now
                  </Link>
                  <Link
                    href="/dashboard/developer"
                    className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    View API Docs
                  </Link>
                </div>
              </div>
            ) : (
              <div className="relative w-full h-[260px] select-none pt-4">
                {/* Horizontal Gridlines */}
                <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-8 pt-2">
                  <div className="w-full border-b border-dashed border-slate-200 dark:border-slate-800/60 flex justify-between text-[10px] text-slate-400 pr-2">
                    <span>{chartMetric === 'volume' ? formatNaira(maxChartValue) : `${maxChartValue} txns`}</span>
                  </div>
                  <div className="w-full border-b border-dashed border-slate-200 dark:border-slate-800/60 flex justify-between text-[10px] text-slate-400 pr-2">
                    <span>
                      {chartMetric === 'volume'
                        ? formatNaira(maxChartValue * 0.66)
                        : `${Math.round(maxChartValue * 0.66)} txns`}
                    </span>
                  </div>
                  <div className="w-full border-b border-dashed border-slate-200 dark:border-slate-800/60 flex justify-between text-[10px] text-slate-400 pr-2">
                    <span>
                      {chartMetric === 'volume'
                        ? formatNaira(maxChartValue * 0.33)
                        : `${Math.round(maxChartValue * 0.33)} txns`}
                    </span>
                  </div>
                  <div className="w-full border-b border-slate-200 dark:border-slate-800 flex justify-between text-[10px] text-slate-400 pr-2">
                    <span>0</span>
                  </div>
                </div>

                {chartStyle === 'curve' ? (
                  /* SVG Curve Mode */
                  <svg
                    viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                    className="w-full h-full overflow-visible"
                    preserveAspectRatio="none"
                  >
                    <defs>
                      <linearGradient id="analyticsBlueGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#126BEB" stopOpacity="0.32" />
                        <stop offset="100%" stopColor="#126BEB" stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Filled Gradient Area */}
                    {svgAreaD && <path d={svgAreaD} fill="url(#analyticsBlueGrad)" />}

                    {/* Smooth Line Curve */}
                    {svgPathD && (
                      <path
                        d={svgPathD}
                        fill="none"
                        stroke="#126BEB"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    )}

                    {/* Interactive Points */}
                    {points.map((pt, idx) => {
                      const isHovered = hoveredPointIndex === idx;
                      return (
                        <g key={idx} className="cursor-pointer">
                          {isHovered && (
                            <line
                              x1={pt.x}
                              y1={paddingY}
                              x2={pt.x}
                              y2={chartHeight - paddingY}
                              stroke="#126BEB"
                              strokeWidth="1.5"
                              strokeDasharray="3 3"
                            />
                          )}
                          <circle
                            cx={pt.x}
                            cy={pt.y}
                            r={isHovered ? 6 : 4}
                            className={`transition-all duration-150 ${
                              isHovered
                                ? 'fill-[#126BEB] stroke-white dark:stroke-[#0B1528] stroke-2 shadow-lg'
                                : 'fill-white dark:fill-[#0B1528] stroke-[#126BEB] stroke-2'
                            }`}
                            onMouseEnter={() => setHoveredPointIndex(idx)}
                            onMouseLeave={() => setHoveredPointIndex(null)}
                          />
                        </g>
                      );
                    })}
                  </svg>
                ) : (
                  /* SVG Grouped Bar Mode */
                  <svg
                    viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                    className="w-full h-full overflow-visible"
                    preserveAspectRatio="none"
                  >
                    {timelinePoints.map((pt, idx) => {
                      const barWidth = Math.max(4, Math.min(24, (chartWidth - paddingX * 2) / timelinePoints.length - 6));
                      const x = paddingX + idx * ((chartWidth - paddingX * 2) / timelinePoints.length) + 4;
                      const val = chartMetric === 'volume' ? pt.volumeNaira : pt.count;
                      const h = (val / maxChartValue) * (chartHeight - paddingY * 2);
                      const y = chartHeight - paddingY - h;
                      const isHovered = hoveredPointIndex === idx;

                      return (
                        <g
                          key={idx}
                          className="cursor-pointer"
                          onMouseEnter={() => setHoveredPointIndex(idx)}
                          onMouseLeave={() => setHoveredPointIndex(null)}
                        >
                          <rect
                            x={x}
                            y={y}
                            width={barWidth}
                            height={Math.max(2, h)}
                            rx={4}
                            fill={isHovered ? '#38BDF8' : '#126BEB'}
                            className="transition-colors duration-150"
                          />
                        </g>
                      );
                    })}
                  </svg>
                )}

                {/* Floating Tooltip */}
                {hoveredPointIndex !== null && points[hoveredPointIndex] && (
                  <div
                    className="absolute pointer-events-none z-20 px-3.5 py-2.5 bg-slate-900/95 dark:bg-white/95 text-white dark:text-slate-900 rounded-xl shadow-xl border border-white/10 dark:border-slate-800 text-xs backdrop-blur-sm -translate-x-1/2 -translate-y-full transition-all duration-75"
                    style={{
                      left: `${(points[hoveredPointIndex].x / chartWidth) * 100}%`,
                      top: `${Math.max(10, (points[hoveredPointIndex].y / chartHeight) * 100 - 15)}%`,
                    }}
                  >
                    <div className="font-bold text-[11px] opacity-80 mb-0.5">
                      {points[hoveredPointIndex].raw.label}
                    </div>
                    <div className="text-sm font-black text-[#38BDF8] dark:text-[#126BEB]">
                      {formatNaira(points[hoveredPointIndex].raw.volumeNaira)}
                    </div>
                    <div className="text-[10px] text-slate-300 dark:text-slate-600 mt-0.5 flex items-center gap-2">
                      <span>{points[hoveredPointIndex].raw.count} transactions</span>
                      <span>•</span>
                      <span className="text-emerald-400 dark:text-emerald-600 font-semibold">
                        {points[hoveredPointIndex].raw.successRate}% Success
                      </span>
                    </div>
                    {points[hoveredPointIndex].raw.failedCount > 0 && (
                      <div className="text-[10px] text-rose-400 dark:text-rose-600 mt-0.5">
                        {points[hoveredPointIndex].raw.failedCount} failed
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* X-Axis Tick Labels */}
            {timelinePoints.length > 0 && (
              <div className="flex justify-between items-center text-[10.5px] font-semibold text-slate-400 dark:text-slate-500 px-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 overflow-x-auto">
                {timelinePoints
                  .filter((_, idx) => {
                    const step = Math.ceil(timelinePoints.length / 8);
                    return idx % step === 0 || idx === timelinePoints.length - 1;
                  })
                  .map((p, idx) => (
                    <span key={idx} className="truncate px-1">
                      {p.label}
                    </span>
                  ))}
              </div>
            )}
          </div>

          {/* Section 2: Product / Service Performance (Donut + Table Breakdown) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Donut Chart & Revenue Share (col-span-5) */}
            <div className="lg:col-span-5 p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#0B1528] border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-4">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-[#126BEB]" />
                  <span>Service Revenue Share</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Proportion of vending turnover generated across each utility category.
                </p>
              </div>

              {donutSegments.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  No service vends recorded in this period.
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center my-4">
                  {/* SVG Donut Canvas */}
                  <div className="relative w-48 h-48">
                    <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90">
                      {donutSegments.map((seg, idx) => (
                        <circle
                          key={idx}
                          cx="80"
                          cy="80"
                          r="64"
                          fill="none"
                          stroke={seg.colorHex}
                          strokeWidth={hoveredDonutIndex === idx ? '22' : '18'}
                          strokeDasharray={seg.strokeDasharray}
                          strokeDashoffset={seg.strokeDashoffset}
                          className="transition-all duration-200 cursor-pointer"
                          onMouseEnter={() => setHoveredDonutIndex(idx)}
                          onMouseLeave={() => setHoveredDonutIndex(null)}
                        />
                      ))}
                    </svg>

                    {/* Donut Center Display */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none p-4">
                      {hoveredDonutIndex !== null && donutSegments[hoveredDonutIndex] ? (
                        <>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 truncate max-w-[120px]">
                            {donutSegments[hoveredDonutIndex].label}
                          </span>
                          <span className="text-base font-black text-slate-900 dark:text-white mt-0.5">
                            {donutSegments[hoveredDonutIndex].percentage}%
                          </span>
                          <span className="text-[10px] text-[#126BEB] font-semibold mt-0.5">
                            {formatNaira(donutSegments[hoveredDonutIndex].volumeNaira)}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Total Volume
                          </span>
                          <span className="text-sm sm:text-base font-black text-slate-900 dark:text-white mt-0.5">
                            {summary?.formattedTotalVolume || '₦0.00'}
                          </span>
                          <span className="text-[10px] text-slate-400 mt-0.5">
                            {summary?.totalCount || 0} vends
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Legend Pills */}
                  <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                    {donutSegments.map((seg, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs cursor-pointer transition-all ${
                          hoveredDonutIndex === idx
                            ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 shadow-xs'
                            : 'bg-transparent border-transparent text-slate-600 dark:text-slate-400'
                        }`}
                        onMouseEnter={() => setHoveredDonutIndex(idx)}
                        onMouseLeave={() => setHoveredDonutIndex(null)}
                      >
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: seg.colorHex }} />
                        <span className="font-semibold text-[11px]">{seg.label}</span>
                        <span className="text-[10px] opacity-70">({seg.percentage}%)</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                <span>Active biller categories</span>
                <span className="font-bold text-slate-700 dark:text-slate-300">
                  {donutSegments.length} Integrated
                </span>
              </div>
            </div>

            {/* Granular Service Performance Table (col-span-7) */}
            <div className="lg:col-span-7 p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#0B1528] border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-4">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#126BEB]" />
                  <span>Category Performance & Margins</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Detailed breakdown of transaction volume, customer success rates, and discounts earned.
                </p>
              </div>

              {analyticsData?.serviceBreakdown.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  No service transactions found matching active filters.
                </div>
              ) : (
                <div className="space-y-3">
                  {analyticsData?.serviceBreakdown.map((item) => {
                    const meta = serviceTheme[item.serviceType] || {
                      icon: Smartphone,
                      badge: 'bg-slate-100 text-slate-700',
                      bg: 'bg-slate-500',
                    };
                    const Icon = meta.icon;

                    return (
                      <div
                        key={item.serviceType}
                        className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#071120]/50 hover:bg-slate-100/60 dark:hover:bg-[#091529] transition-all"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2.5">
                            <div className={`p-2 rounded-lg ${meta.badge}`}>
                              <Icon className="w-4 h-4" />
                            </div>
                            <div>
                              <span className="text-xs font-bold text-slate-900 dark:text-white block">
                                {item.label}
                              </span>
                              <span className="text-[10.5px] text-slate-400">
                                {item.count} vends ({item.successfulCount} fulfilled)
                              </span>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-xs font-black text-slate-900 dark:text-white block">
                              {item.formattedVolume}
                            </span>
                            <div className="flex items-center justify-end gap-1.5 text-[10px]">
                              <span className="font-bold text-[#126BEB] dark:text-[#38BDF8]">
                                {item.volumeShare}% share
                              </span>
                              <span>•</span>
                              <span
                                className={`font-semibold ${
                                  item.successRate >= 90
                                    ? 'text-emerald-500'
                                    : item.successRate >= 60
                                    ? 'text-amber-500'
                                    : 'text-rose-500'
                                }`}
                              >
                                {item.successRate}% Success
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Progress Meter Bar */}
                        <div className="w-full bg-slate-200/70 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${meta.bg} transition-all duration-700`}
                            style={{ width: `${item.volumeShare}%` }}
                          />
                        </div>

                        {/* Sub-row with Margin & AOV */}
                        <div className="mt-2 pt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400">
                          <span>
                            Avg. Ticket: <span className="font-semibold text-slate-700 dark:text-slate-300">{item.formattedAvgTicket}</span>
                          </span>
                          <span>
                            Discount Earned: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{item.formattedDiscount}</span>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Channel Integration & Carrier Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Integration Channels (API vs Console) (col-span-5) */}
            <div className="lg:col-span-5 p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#0B1528] border border-slate-200/90 dark:border-slate-800 shadow-sm flex flex-col justify-between space-y-5">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Server className="w-4 h-4 text-[#126BEB]" />
                  <span>Channel Origin & Integration</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Comparison between programmatic REST API calls and manual Web Console vends.
                </p>

                {/* API vs Console Card */}
                <div className="mt-4 p-4 rounded-xl bg-gradient-to-br from-[#0F1E36] to-[#081222] border border-slate-700/60 text-white space-y-4">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                    <span>Traffic Split</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                      {analyticsData?.channelBreakdown?.api?.successRate || 100}% API Reliability
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-center">
                    <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-bold">
                        REST API
                      </span>
                      <span className="text-xl font-black text-white mt-1 block">
                        {analyticsData?.channelBreakdown?.api?.volumeShare || 0}%
                      </span>
                      <span className="text-[10px] text-slate-300 mt-0.5 block">
                        {formatNaira(analyticsData?.channelBreakdown?.api?.volumeNaira || 0)}
                      </span>
                      <span className="text-[10px] text-slate-400 mt-0.5 block">
                        {analyticsData?.channelBreakdown?.api?.count || 0} calls
                      </span>
                    </div>

                    <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                      <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-bold">
                        Web Console
                      </span>
                      <span className="text-xl font-black text-white mt-1 block">
                        {analyticsData?.channelBreakdown?.console?.volumeShare || 0}%
                      </span>
                      <span className="text-[10px] text-slate-300 mt-0.5 block">
                        {formatNaira(analyticsData?.channelBreakdown?.console?.volumeNaira || 0)}
                      </span>
                      <span className="text-[10px] text-slate-400 mt-0.5 block">
                        {analyticsData?.channelBreakdown?.console?.count || 0} vends
                      </span>
                    </div>
                  </div>

                  {/* Dual color progress meter */}
                  <div className="w-full bg-white/10 h-2.5 rounded-full overflow-hidden flex">
                    <div
                      className="bg-[#126BEB] h-full"
                      style={{ width: `${analyticsData?.channelBreakdown?.api?.volumeShare || 0}%` }}
                      title="API traffic"
                    />
                    <div
                      className="bg-indigo-400 h-full"
                      style={{ width: `${analyticsData?.channelBreakdown?.console?.volumeShare || 0}%` }}
                      title="Console traffic"
                    />
                  </div>
                </div>

                {/* API Automation Notice */}
                <div className="mt-4 p-3.5 rounded-xl border border-blue-200/60 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/20 text-xs space-y-1.5">
                  <div className="font-bold text-[#126BEB] dark:text-[#38BDF8] flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 shrink-0" />
                    <span>Automate with BAXATO REST API</span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                    Integrate your FinTech or business app using our developer SDK and API keys for instant sub-second airtime, data, and utility token dispatch.
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Manage API Credentials
                </span>
                <Link
                  href="/dashboard/developer"
                  className="text-xs font-bold text-[#126BEB] dark:text-[#38BDF8] hover:underline flex items-center gap-1"
                >
                  <span>Go to Developer Portal</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Carrier / Operator Breakdown (col-span-7) */}
            <div className="lg:col-span-7 p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#0B1528] border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-4">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Globe className="w-4 h-4 text-[#126BEB]" />
                  <span>Top Carriers & Utility Providers</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Turnover volume distributed by telecommunications network (MTN, Airtel, Glo, 9mobile) and DISCO electricity entities.
                </p>
              </div>

              {analyticsData?.topOperators.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  No operator traffic recorded in this period.
                </div>
              ) : (
                <div className="space-y-3">
                  {analyticsData?.topOperators.map((op, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl border border-slate-200/70 dark:border-slate-800/70 bg-slate-50/50 dark:bg-[#071120]/40 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs flex items-center justify-center shrink-0">
                          {op.operator.slice(0, 3).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-slate-900 dark:text-white truncate block">
                            {op.operator}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {op.serviceType} • {op.count} vends
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-xs font-bold text-slate-900 dark:text-white block">
                          {op.formattedVolume}
                        </span>
                        <div className="flex items-center justify-end gap-1.5 text-[10px]">
                          <span className="font-bold text-[#126BEB] dark:text-[#38BDF8]">
                            {op.volumeShare}%
                          </span>
                          <span>•</span>
                          <span
                            className={`font-semibold ${
                              op.successRate >= 90
                                ? 'text-emerald-500'
                                : op.successRate >= 60
                                ? 'text-amber-500'
                                : 'text-rose-500'
                            }`}
                          >
                            {op.successRate}% Success
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Section 4: System Health & Failure Diagnostics */}
          <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#0B1528] border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#126BEB]" />
                  <span>Transaction Health & Failure Diagnostics</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Granular root-cause analysis of upstream biller and gateway rejections.
                </p>
              </div>

              {/* Status Breakdown Pills */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-200 dark:border-emerald-900 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{summary?.successfulCount || 0} Successful</span>
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-xs font-bold border border-rose-200 dark:border-rose-900 flex items-center gap-1">
                  <XCircle className="w-3.5 h-3.5" />
                  <span>{summary?.failedCount || 0} Failed</span>
                </span>
                {(summary?.pendingCount || 0) > 0 && (
                  <span className="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 text-xs font-bold border border-amber-200 dark:border-amber-900 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{summary?.pendingCount} Processing</span>
                  </span>
                )}
                {(summary?.reversedCount || 0) > 0 && (
                  <span className="px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 text-xs font-bold border border-purple-200 dark:border-purple-900 flex items-center gap-1">
                    <Receipt className="w-3.5 h-3.5" />
                    <span>{summary?.reversedCount} Reversed</span>
                  </span>
                )}
              </div>
            </div>

            {/* Top Failure Reasons Table */}
            {analyticsData?.failureDiagnostics?.topReasons.length === 0 ? (
              <div className="p-6 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 text-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                  Zero Upstream Failures Recorded
                </h4>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                  All transactions during this period fulfilled with 100% gateway success.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                      <th className="py-2.5 px-3">Failure Reason / Provider Response</th>
                      <th className="py-2.5 px-3">Occurrences</th>
                      <th className="py-2.5 px-3">Unfulfilled Volume</th>
                      <th className="py-2.5 px-3 text-right">% of Failures</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {analyticsData?.failureDiagnostics.topReasons.map((reason, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-[#0C1527]/50 transition-colors">
                        <td className="py-3 px-3 font-semibold text-slate-800 dark:text-slate-200">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                            <span className="truncate max-w-md">{reason.reason}</span>
                          </div>
                        </td>
                        <td className="py-3 px-3 font-bold text-slate-700 dark:text-slate-300">
                          {reason.count}
                        </td>
                        <td className="py-3 px-3 font-semibold text-rose-600 dark:text-rose-400">
                          {reason.formattedLostVolume}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-600 dark:text-slate-400">
                          {reason.percentage}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section 5: 24-Hour Trading Velocity Matrix (Heatmap) */}
          <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#0B1528] border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-4">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#126BEB]" />
                <span>24-Hour Peak Trading Density (WAT)</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Hourly transaction frequency showing your customers' peak purchasing windows throughout the day.
              </p>
            </div>

            {/* 24-Column Density Matrix */}
            <div className="grid grid-cols-6 sm:grid-cols-12 md:grid-cols-24 gap-1.5 pt-2">
              {(analyticsData?.hourlyDensity || []).map((slot) => {
                const count = slot.count;
                const isPeak = slot.percentage > 8;
                const hasActivity = count > 0;

                return (
                  <div
                    key={slot.hour}
                    className="flex flex-col items-center group relative cursor-pointer"
                  >
                    {/* Activity Column Bar */}
                    <div className="w-full h-20 bg-slate-100 dark:bg-slate-800/80 rounded-md flex flex-col justify-end p-0.5 overflow-hidden">
                      <div
                        className={`w-full rounded-sm transition-all duration-300 ${
                          isPeak
                            ? 'bg-[#126BEB]'
                            : hasActivity
                            ? 'bg-blue-400 dark:bg-blue-500'
                            : 'bg-transparent'
                        }`}
                        style={{ height: `${Math.max(hasActivity ? 15 : 0, slot.percentage * 3)}%` }}
                      />
                    </div>

                    {/* Hour Label */}
                    <span className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 mt-1">
                      {slot.label.slice(0, 2)}h
                    </span>

                    {/* Hover Floating Tooltip */}
                    <div className="opacity-0 group-hover:opacity-100 pointer-events-none absolute bottom-full mb-1 z-30 px-2.5 py-1.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg text-[10px] whitespace-nowrap shadow-lg transition-opacity duration-150">
                      <div className="font-bold">{slot.label} WAT</div>
                      <div>{slot.count} transactions</div>
                      <div className="text-[#38BDF8] dark:text-[#126BEB] font-bold">
                        {slot.formattedVolume}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 6: Live Ledger Deep Inspection Banner */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-50/80 via-slate-50 to-indigo-50/80 dark:from-[#091528] dark:via-[#070D18] dark:to-[#0B1528] border border-blue-200/70 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#126BEB]/10 dark:bg-[#126BEB]/20 text-[#126BEB] dark:text-[#38BDF8] flex items-center justify-center shrink-0 border border-[#126BEB]/20">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Need itemized receipt accounting and token lookups?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Inspect granular audit logs, provider references, customer phone numbers, and electricity tokens in Transaction History.
                </p>
              </div>
            </div>

            <Link
              href="/dashboard/ledger"
              className="px-4 py-2.5 rounded-xl bg-white dark:bg-[#0F1E36] text-slate-900 dark:text-white font-bold text-xs border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-[#152744] transition-colors shrink-0 flex items-center gap-1.5 shadow-xs"
            >
              <span>Open Transaction History</span>
              <ArrowUpRight className="w-4 h-4 text-[#126BEB]" />
            </Link>
          </div>
        </main>
      </div>

      {/* KYC Verification Modal */}
      <KycModal
        isOpen={isKycModalOpen}
        onClose={() => setIsKycModalOpen(false)}
        onSuccess={() => setKycStatus('VERIFIED')}
      />
    </div>
  );
}
