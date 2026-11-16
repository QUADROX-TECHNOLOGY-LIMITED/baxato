'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  TrendingUp,
  TrendingDown,
  Zap,
  Phone,
  Wifi,
  Tv,
  GraduationCap,
  Layers,
  CheckCircle2,
  ChevronDown,
  Check,
  ArrowLeft,
  Download,
  BarChart3,
} from 'lucide-react';
import Sidebar from '@/components/dashboard/Sidebar';
import Header from '@/components/dashboard/Header';
import KycBanner from '@/components/dashboard/KycBanner';
import KycModal from '@/components/dashboard/KycModal';
import {
  getStoredAuthToken,
  isTokenExpired,
  getStoredUser,
  getStoredBusiness,
  clearSessionAndRedirect,
  handleAuthResponse,
} from '@/lib/auth-session';

type Timeframe = 'today' | '7d' | '30d' | '90d' | 'ytd';
type ServiceFilter = 'ALL' | 'AIRTIME' | 'DATA' | 'ELECTRICITY' | 'CABLE_TV' | 'EXAM_PIN';
type ChannelFilter = 'ALL' | 'WEB' | 'API';

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
  serviceLabel?: string;
  count: number;
  successfulCount: number;
  volumeNaira: number;
  formattedVolume: string;
  volumeShare: number;
  successRate: number;
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
}

const TIMEFRAME_OPTIONS: Array<{ key: Timeframe; shortLabel: string; longLabel: string }> = [
  { key: 'today', shortLabel: '24h', longLabel: 'Last 24 hours' },
  { key: '7d', shortLabel: '7D', longLabel: 'Last 7 days' },
  { key: '30d', shortLabel: '30D', longLabel: 'Last 30 days' },
  { key: '90d', shortLabel: '90D', longLabel: 'Last 90 days' },
  { key: 'ytd', shortLabel: 'YTD', longLabel: 'Year to date' },
];

const SERVICE_OPTIONS: Array<{ value: ServiceFilter; label: string; icon: any }> = [
  { value: 'ALL', label: 'All Services', icon: Layers },
  { value: 'AIRTIME', label: 'Airtime', icon: Phone },
  { value: 'DATA', label: 'Data Bundles', icon: Wifi },
  { value: 'ELECTRICITY', label: 'Electricity', icon: Zap },
  { value: 'CABLE_TV', label: 'Cable TV', icon: Tv },
  { value: 'EXAM_PIN', label: 'Exam PINs', icon: GraduationCap },
];

const CHANNEL_OPTIONS: Array<{ value: ChannelFilter; label: string }> = [
  { value: 'ALL', label: 'All Channels' },
  { value: 'WEB', label: 'Dashboard' },
  { value: 'API', label: 'API' },
];

const SERVICE_LABELS: Record<string, string> = {
  AIRTIME: 'Airtime',
  DATA: 'Data Bundles',
  ELECTRICITY: 'Electricity',
  CABLE_TV: 'Cable TV',
  EXAM_PIN: 'Exam PINs',
};

const SERVICE_THEME: Record<string, { hex: string; barClass: string; badgeClass: string; icon: any }> = {
  AIRTIME: {
    hex: '#10b981',
    barClass: 'bg-emerald-500',
    badgeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400',
    icon: Phone,
  },
  DATA: {
    hex: '#126BEB',
    barClass: 'bg-[#126BEB]',
    badgeClass: 'bg-blue-50 text-[#126BEB] dark:bg-blue-950/60 dark:text-[#38BDF8]',
    icon: Wifi,
  },
  ELECTRICITY: {
    hex: '#f59e0b',
    barClass: 'bg-amber-500',
    badgeClass: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400',
    icon: Zap,
  },
  CABLE_TV: {
    hex: '#8b5cf6',
    barClass: 'bg-purple-500',
    badgeClass: 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-400',
    icon: Tv,
  },
  EXAM_PIN: {
    hex: '#f43f5e',
    barClass: 'bg-rose-500',
    badgeClass: 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400',
    icon: GraduationCap,
  },
};

function getOperatorLogo(operator: string): { logoUrl: string | null; fullBleed?: boolean } {
  const norm = (operator || '').toUpperCase().trim();

  if (norm.includes('MTN')) return { logoUrl: '/logos/telecom/mtn.svg', fullBleed: true };
  if (norm.includes('AIRTEL')) return { logoUrl: '/logos/telecom/airtel.svg' };
  if (norm.includes('GLO')) return { logoUrl: '/logos/telecom/glo.svg', fullBleed: true };
  if (norm.includes('9MOBILE') || norm.includes('ETISALAT')) return { logoUrl: '/logos/telecom/9mobile.svg' };

  if (norm.includes('DSTV')) return { logoUrl: '/logos/cable/dstv.svg' };
  if (norm.includes('GOTV')) return { logoUrl: '/logos/cable/gotv.svg', fullBleed: true };
  if (norm.includes('STARTIMES')) return { logoUrl: '/logos/cable/startimes.svg' };
  if (norm.includes('SHOWMAX')) return { logoUrl: '/logos/cable/showmax.svg' };

  if (norm.includes('IKEDC') || norm.includes('IKEJA')) return { logoUrl: '/logos/electricity/ikedc.png' };
  if (norm.includes('EKEDC') || norm.includes('EKO')) return { logoUrl: '/logos/electricity/ekedc.png' };
  if (norm.includes('AEDC') || norm.includes('ABUJA')) return { logoUrl: '/logos/electricity/aedc.png' };
  if (norm.includes('IBEDC') || norm.includes('IBADAN')) return { logoUrl: '/logos/electricity/ibedc.png' };
  if (norm.includes('EEDC') || norm.includes('ENUGU')) return { logoUrl: '/logos/electricity/eedc.png' };
  if (norm.includes('PHED') || norm.includes('PORT')) return { logoUrl: '/logos/electricity/phed.svg' };
  if (norm.includes('BEDC') || norm.includes('BENIN')) return { logoUrl: '/logos/electricity/bedc.png' };
  if (norm.includes('KEDCO') || norm.includes('KANO')) return { logoUrl: '/logos/electricity/kedco.png' };
  if (norm.includes('KAEDCO') || norm.includes('KADUNA')) return { logoUrl: '/logos/electricity/kaedco.png' };
  if (norm.includes('JED') || norm.includes('JOS')) return { logoUrl: '/logos/electricity/jed.png' };
  if (norm.includes('YEDC') || norm.includes('YOLA')) return { logoUrl: '/logos/electricity/yedc.png' };
  if (norm.includes('APLE') || norm.includes('ABA')) return { logoUrl: '/logos/electricity/aple.png' };

  if (norm.includes('WAEC')) return { logoUrl: '/logos/education/waec.png' };
  if (norm.includes('JAMB')) return { logoUrl: '/logos/education/jamb.png' };
  if (norm.includes('NECO')) return { logoUrl: '/logos/education/neco.png' };
  if (norm.includes('NABTEB')) return { logoUrl: '/logos/education/nabteb.png' };

  return { logoUrl: null };
}

function escapeCsvCell(value: unknown): string {
  const str = String(value ?? '');
  const guarded = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
  return `"${guarded.replace(/"/g, '""')}"`;
}

function formatNaira(val: number): string {
  return `₦${val.toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatCompactAxisNaira(val: number): string {
  if (val >= 1_000_000) return `₦${(val / 1_000_000).toFixed(1)}M`;
  if (val >= 1_000) return `₦${(val / 1_000).toFixed(val >= 10_000 ? 0 : 1)}k`;
  return `₦${Math.round(val).toLocaleString('en-NG')}`;
}

export default function AnalyticsPage() {
  const router = useRouter();
  const [timeframe, setTimeframe] = useState<Timeframe>('30d');
  const [serviceFilter, setServiceFilter] = useState<ServiceFilter>('ALL');
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>('ALL');
  const [chartMetric, setChartMetric] = useState<'volume' | 'count'>('volume');
  const [chartStyle, setChartStyle] = useState<'line' | 'bar'>('line');
  const [activePointIndex, setActivePointIndex] = useState<number | null>(null);
  const [activeDonutIndex, setActiveDonutIndex] = useState<number | null>(null);
  const [openDropdown, setOpenDropdown] = useState<'service' | 'channel' | null>(null);
  const filterBarRef = useRef<HTMLDivElement>(null);

  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const hasLoadedOnceRef = useRef<boolean>(false);

  const cacheRef = useRef<Map<string, AnalyticsData>>(new Map());

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
  const [userFirstName, setUserFirstName] = useState<string>('');
  const [userLastName, setUserLastName] = useState<string>('');
  const [kycStatus, setKycStatus] = useState<string>('VERIFIED');
  const [userRole, setUserRole] = useState<string>('BUSINESS_OWNER');
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isKycModalOpen, setIsKycModalOpen] = useState<boolean>(false);

  const getRequestHeaders = useCallback((customBizId?: string) => {
    const token = getStoredAuthToken();
    if (!token || isTokenExpired(token)) {
      clearSessionAndRedirect('expired');
      return null;
    }
    const storedBiz = getStoredBusiness();
    const activeBizId = customBizId || storedBiz?.id;
    return {
      Authorization: `Bearer ${token}`,
      ...(activeBizId ? { 'x-business-id': activeBizId } : {}),
    };
  }, []);

  const syncUserProfile = useCallback(async () => {
    const headers = getRequestHeaders();
    if (!headers) return;

    try {
      const res = await fetch('/api/users/me', {
        headers: { Authorization: headers.Authorization },
      });
      const json = await res.json().catch(() => null);
      if (handleAuthResponse(res, json)) return;

      const u = json?.data?.user;
      if (res.ok && u) {
        if (u.firstName) {
          setMerchantName(u.firstName);
          setUserFirstName(u.firstName);
        }
        if (u.lastName) setUserLastName(u.lastName);
        if (u.kycStatus) setKycStatus(u.kycStatus);
      }
    } catch {}
  }, [getRequestHeaders]);

  const fetchAnalytics = useCallback(
    async (customBizId?: string) => {
      const headers = getRequestHeaders(customBizId);
      if (!headers) return;

      const storedBiz = getStoredBusiness();
      const activeBizId = customBizId || storedBiz?.id || 'biz';
      const cacheKey = `${activeBizId}_${timeframe}_${serviceFilter}_${channelFilter}`;

      const cached = cacheRef.current.get(cacheKey);
      if (cached) {
        setAnalyticsData(cached);
        setIsLoading(false);
        setIsUpdating(true);
      } else if (!hasLoadedOnceRef.current) {
        setIsLoading(true);
      } else {
        setIsUpdating(true);
      }

      try {
        const params = new URLSearchParams();
        params.set('timeframe', timeframe);
        if (serviceFilter !== 'ALL') params.set('serviceType', serviceFilter);
        if (channelFilter !== 'ALL') params.set('channel', channelFilter);

        const res = await fetch(`/api/analytics?${params.toString()}`, { headers });
        const json = await res.json().catch(() => null);
        if (handleAuthResponse(res, json)) return;

        if (res.ok && json?.success && json.data) {
          setAnalyticsData(json.data);
          cacheRef.current.set(cacheKey, json.data);
        }
      } catch {
        // Keep last visible state cleanly
      } finally {
        hasLoadedOnceRef.current = true;
        setIsLoading(false);
        setIsUpdating(false);
        setIsRefreshing(false);
      }
    },
    [getRequestHeaders, timeframe, serviceFilter, channelFilter],
  );

  // Close dropdowns on outside click or Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterBarRef.current && !filterBarRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Auth & workspace initialization
  useEffect(() => {
    const token = getStoredAuthToken();
    if (!token || isTokenExpired(token)) {
      clearSessionAndRedirect('expired');
      return;
    }

    const storedUser = getStoredUser();
    const storedBiz = getStoredBusiness();

    if (storedUser?.role === 'SUPER_ADMIN') {
      router.replace('/admin');
      return;
    }
    if (storedUser?.role === 'STAFF') {
      router.replace('/staff/overview');
      return;
    }

    if (storedBiz?.role) setUserRole(storedBiz.role);
    else if (storedUser?.role) setUserRole(storedUser.role);

    if (storedUser?.firstName) {
      setMerchantName(storedUser.firstName);
      setUserFirstName(storedUser.firstName);
    }
    if (storedUser?.lastName) setUserLastName(storedUser.lastName);
    if (storedUser?.kycStatus) setKycStatus(storedUser.kycStatus);
    if (storedBiz?.name) setBusinessName(storedBiz.name);

    void syncUserProfile();
  }, [router, syncUserProfile]);

  useEffect(() => {
    setActivePointIndex(null);
    setActiveDonutIndex(null);
    void fetchAnalytics();
  }, [fetchAnalytics]);

  useEffect(() => {
    const handleBusinessSwitched = (e: any) => {
      const biz = e?.detail?.business || getStoredBusiness();
      if (biz?.name) setBusinessName(biz.name);
      if (biz?.role) setUserRole(biz.role);
      cacheRef.current.clear();
      hasLoadedOnceRef.current = false;
      setIsLoading(true);
      void fetchAnalytics(biz?.id);
    };

    window.addEventListener('bx_business_switched', handleBusinessSwitched);
    return () => window.removeEventListener('bx_business_switched', handleBusinessSwitched);
  }, [fetchAnalytics]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    cacheRef.current.clear();
    void fetchAnalytics();
  };

  const handleKycSuccess = (updatedUser: any) => {
    setKycStatus('VERIFIED');
    if (updatedUser?.firstName) {
      setMerchantName(updatedUser.firstName);
      setUserFirstName(updatedUser.firstName);
    }
    if (updatedUser?.lastName) setUserLastName(updatedUser.lastName);
  };

  const isOwnerOrAdmin = userRole === 'BUSINESS_OWNER' || userRole === 'BUSINESS_ADMIN';
  const canExportReports = isOwnerOrAdmin || userRole === 'FINANCE';

  const activeTimeframeObj =
    TIMEFRAME_OPTIONS.find((t) => t.key === timeframe) || TIMEFRAME_OPTIONS[2];
  const activeServiceObj =
    SERVICE_OPTIONS.find((s) => s.value === serviceFilter) || SERVICE_OPTIONS[0];
  const activeChannelObj =
    CHANNEL_OPTIONS.find((c) => c.value === channelFilter) || CHANNEL_OPTIONS[0];

  const handleExportCSV = () => {
    if (!analyticsData) return;

    const sum = analyticsData.summary;
    const csvRows: (string | number)[][] = [
      ['BAXATO ANALYTICS SUMMARY'],
      ['Workspace', businessName || 'Workspace'],
      ['Timeframe', activeTimeframeObj.longLabel],
      ['Date Range', `${analyticsData.startDate} to ${analyticsData.endDate}`],
      [],
      ['SUMMARY'],
      ['Metric', 'Value'],
      ['Completed Volume (NGN)', sum.successfulVolumeNaira.toFixed(2)],
      ['Completed Transactions', sum.successfulCount],
      ['Total Attempts', sum.totalCount],
      ['Failed Transactions', sum.failedCount],
      ['Success Rate (%)', `${sum.successRate}%`],
      ['Average Order (NGN)', sum.avgTicketNaira.toFixed(2)],
      ['Discounts Earned (NGN)', sum.totalDiscountNaira.toFixed(2)],
      [],
      ['SERVICE BREAKDOWN'],
      ['Service', 'Completed Volume (NGN)', 'Share (%)', 'Completed', 'Success Rate (%)', 'Discounts (NGN)'],
      ...analyticsData.serviceBreakdown.map((s) => [
        s.label,
        s.volumeNaira.toFixed(2),
        `${s.volumeShare}%`,
        s.successfulCount,
        `${s.successRate}%`,
        s.discountNaira.toFixed(2),
      ]),
      [],
      ['CHANNELS'],
      ['Channel', 'Completed Volume (NGN)', 'Share (%)', 'Completed', 'Success Rate (%)'],
      [
        'Dashboard',
        analyticsData.channelBreakdown.console.volumeNaira.toFixed(2),
        `${analyticsData.channelBreakdown.console.volumeShare}%`,
        analyticsData.channelBreakdown.console.successfulCount,
        `${analyticsData.channelBreakdown.console.successRate}%`,
      ],
      [
        'API',
        analyticsData.channelBreakdown.api.volumeNaira.toFixed(2),
        `${analyticsData.channelBreakdown.api.volumeShare}%`,
        analyticsData.channelBreakdown.api.successfulCount,
        `${analyticsData.channelBreakdown.api.successRate}%`,
      ],
      [],
      ['TREND'],
      ['Period', 'Completed Volume (NGN)', 'Completed Count', 'Failed Count', 'Success Rate (%)'],
      ...analyticsData.timeline.map((t) => [
        t.label,
        t.successfulVolumeNaira.toFixed(2),
        t.successfulCount,
        t.failedCount,
        `${t.successRate}%`,
      ]),
    ];

    const csvText = csvRows
      .map((row) => row.map((cell) => escapeCsvCell(cell)).join(','))
      .join('\n');
    const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `baxato-analytics-${timeframe}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Chart calculations strictly using completed volume/count
  const timelinePoints = analyticsData?.timeline || [];
  const hasCompletedActivity = (analyticsData?.summary?.successfulCount || 0) > 0;

  const maxChartValue = useMemo(() => {
    if (timelinePoints.length === 0) return 1;
    const max = Math.max(
      ...timelinePoints.map((p) =>
        chartMetric === 'volume' ? p.successfulVolumeNaira : p.successfulCount,
      ),
      0,
    );
    return max > 0 ? max : 1;
  }, [timelinePoints, chartMetric]);

  const chartWidth = 680;
  const chartHeight = 200;
  const padLeft = 12;
  const padRight = 12;
  const padTop = 16;
  const padBottom = 16;

  const chartPoints = useMemo(() => {
    if (timelinePoints.length === 0) return [];
    const usableW = chartWidth - padLeft - padRight;
    const usableH = chartHeight - padTop - padBottom;
    return timelinePoints.map((p, idx) => {
      const x =
        timelinePoints.length === 1
          ? padLeft + usableW / 2
          : padLeft + (idx / (timelinePoints.length - 1)) * usableW;
      const val = chartMetric === 'volume' ? p.successfulVolumeNaira : p.successfulCount;
      const y = chartHeight - padBottom - (val / maxChartValue) * usableH;
      return { x, y, val, raw: p };
    });
  }, [timelinePoints, chartMetric, maxChartValue]);

  const svgPathD = useMemo(() => {
    if (chartPoints.length <= 1) return '';
    return chartPoints.reduce((acc, curr, idx) => {
      if (idx === 0) return `M ${curr.x} ${curr.y}`;
      const prev = chartPoints[idx - 1];
      const cx = prev.x + (curr.x - prev.x) / 2;
      return `${acc} C ${cx} ${prev.y}, ${cx} ${curr.y}, ${curr.x} ${curr.y}`;
    }, '');
  }, [chartPoints]);

  const svgAreaD = useMemo(() => {
    if (chartPoints.length === 0 || !svgPathD) return '';
    const first = chartPoints[0];
    const last = chartPoints[chartPoints.length - 1];
    return `${svgPathD} L ${last.x} ${chartHeight - padBottom} L ${first.x} ${chartHeight - padBottom} Z`;
  }, [svgPathD, chartPoints]);

  const xTickLabels = useMemo(() => {
    if (timelinePoints.length === 0) return [];
    const maxTicks = 5;
    if (timelinePoints.length <= maxTicks) return timelinePoints;
    const step = Math.ceil((timelinePoints.length - 1) / (maxTicks - 1));
    return timelinePoints.filter((_, idx) => idx % step === 0 || idx === timelinePoints.length - 1);
  }, [timelinePoints]);

  // Donut segments strictly by completed service volume
  const donutSegments = useMemo(() => {
    if (!analyticsData || analyticsData.serviceBreakdown.length === 0) return [];
    const totalVol = analyticsData.summary.successfulVolumeNaira;
    if (totalVol <= 0) return [];

    const radius = 58;
    const circumference = 2 * Math.PI * radius;
    let accumulated = 0;

    return analyticsData.serviceBreakdown.map((item, idx) => {
      const pct = (item.volumeNaira / totalVol) * 100;
      const strokeLength = (pct / 100) * circumference;
      const dashOffset = -accumulated;
      accumulated += strokeLength;

      const theme = SERVICE_THEME[item.serviceType] || {
        hex: '#64748b',
        barClass: 'bg-slate-500',
        badgeClass: 'bg-slate-100 text-slate-700',
        icon: Layers,
      };

      return {
        ...item,
        percentage: Number(pct.toFixed(1)),
        strokeDasharray: `${strokeLength} ${circumference}`,
        strokeDashoffset: dashOffset,
        colorHex: theme.hex,
        index: idx,
      };
    });
  }, [analyticsData]);

  const summary = analyticsData?.summary;
  const activePoint = activePointIndex !== null ? chartPoints[activePointIndex] : null;
  const activeDonut = activeDonutIndex !== null ? donutSegments[activeDonutIndex] : null;

  return (
    <div className="min-h-screen bg-white dark:bg-[#070D18] text-slate-900 dark:text-slate-100 flex flex-col lg:flex-row transition-colors duration-150">
      <Sidebar
        businessName={businessName}
        merchantName={merchantName}
        kycStatus={kycStatus}
        userRole={userRole}
        onOpenKycModal={() => setIsKycModalOpen(true)}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 lg:pl-72">
        <Header
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onOpenKycModal={() => setIsKycModalOpen(true)}
          merchantName={merchantName}
          businessName={businessName}
          kycStatus={kycStatus}
          userRole={userRole}
          isRefreshing={isRefreshing || isUpdating}
          onRefresh={handleRefresh}
          sticky={false}
        />

        <main className="flex-1 px-4 py-5 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full min-w-0 space-y-6">
          <KycBanner
            kycStatus={kycStatus}
            userRole={userRole}
            onOpenKycModal={() => setIsKycModalOpen(true)}
          />

          {/* Top Navigation & Page Title */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap shrink-0 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Dashboard</span>
              </Link>

              {canExportReports && (
                <button
                  type="button"
                  onClick={handleExportCSV}
                  disabled={isLoading || !analyticsData || (summary?.totalCount ?? 0) === 0}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap shrink-0 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                  <span>Export CSV</span>
                </button>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Analytics
            </h1>
          </div>

          {/* Filter Strip */}
          <div
            ref={filterBarRef}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 min-w-0"
          >
            {/* Timeframe Selector */}
            <div
              role="group"
              aria-label="Timeframe"
              className="grid grid-cols-5 sm:inline-flex p-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#0B1528] text-xs font-medium"
            >
              {TIMEFRAME_OPTIONS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    if (timeframe !== item.key) {
                      setTimeframe(item.key);
                    }
                  }}
                  className={`px-2.5 sm:px-3 py-1.5 rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                    timeframe === item.key
                      ? 'bg-white dark:bg-[#126BEB] text-slate-900 dark:text-white font-semibold border border-slate-200/80 dark:border-transparent'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {item.shortLabel}
                </button>
              ))}
            </div>

            {/* Service & Channel Selectors */}
            <div className="grid grid-cols-2 sm:flex sm:items-center gap-2.5 min-w-0">
              {/* Service Dropdown */}
              <div className="relative min-w-0 sm:w-44">
                <button
                  type="button"
                  aria-haspopup="listbox"
                  aria-expanded={openDropdown === 'service'}
                  onClick={() => setOpenDropdown(openDropdown === 'service' ? null : 'service')}
                  className="w-full h-10 px-3 rounded-lg bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-100 flex items-center justify-between gap-2 font-medium cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                >
                  <span className="flex items-center gap-1.5 truncate min-w-0">
                    <activeServiceObj.icon className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                    <span className="truncate">{activeServiceObj.label}</span>
                  </span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </button>

                {openDropdown === 'service' && (
                  <div
                    role="listbox"
                    aria-label="Filter by service"
                    className="absolute z-30 left-0 right-0 top-11 bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg overflow-hidden py-1"
                  >
                    {SERVICE_OPTIONS.map((opt) => {
                      const Icon = opt.icon;
                      const isSelected = serviceFilter === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => {
                            setServiceFilter(opt.value);
                            setOpenDropdown(null);
                          }}
                          className={`w-full px-3 py-2 text-xs flex items-center justify-between text-left transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-slate-100 dark:bg-slate-800 text-[#126BEB] dark:text-[#38BDF8] font-semibold'
                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                          }`}
                        >
                          <span className="flex items-center gap-2 truncate">
                            <Icon className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                            <span className="truncate">{opt.label}</span>
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Channel Dropdown */}
              <div className="relative min-w-0 sm:w-36">
                <button
                  type="button"
                  aria-haspopup="listbox"
                  aria-expanded={openDropdown === 'channel'}
                  onClick={() => setOpenDropdown(openDropdown === 'channel' ? null : 'channel')}
                  className="w-full h-10 px-3 rounded-lg bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-100 flex items-center justify-between gap-2 font-medium cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                >
                  <span className="truncate">{activeChannelObj.label}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                </button>

                {openDropdown === 'channel' && (
                  <div
                    role="listbox"
                    aria-label="Filter by channel"
                    className="absolute z-30 left-0 right-0 top-11 bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg overflow-hidden py-1"
                  >
                    {CHANNEL_OPTIONS.map((opt) => {
                      const isSelected = channelFilter === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => {
                            setChannelFilter(opt.value);
                            setOpenDropdown(null);
                          }}
                          className={`w-full px-3 py-2 text-xs flex items-center justify-between text-left transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-slate-100 dark:bg-slate-800 text-[#126BEB] dark:text-[#38BDF8] font-semibold'
                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                          }`}
                        >
                          <span className="truncate">{opt.label}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Summary KPI Grid */}
          <div
            className={`grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 transition-opacity duration-150 ${
              isUpdating ? 'opacity-70' : ''
            }`}
          >
            {/* Card 1: Completed Volume */}
            <div className="min-w-0 p-4 rounded-xl bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800 flex flex-col justify-between gap-3">
              <div className="flex items-center justify-between gap-2 min-w-0">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
                  Volume
                </span>
                {summary && summary.volumeGrowthRate !== 0 && (
                  <span
                    className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold border shrink-0 tabular-nums ${
                      summary.volumeGrowthRate > 0
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800/60'
                        : 'bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/50 dark:text-rose-400 dark:border-rose-800/60'
                    }`}
                  >
                    {summary.volumeGrowthRate > 0 ? (
                      <TrendingUp className="w-3 h-3" aria-hidden="true" />
                    ) : (
                      <TrendingDown className="w-3 h-3" aria-hidden="true" />
                    )}
                    <span>
                      {summary.volumeGrowthRate > 0
                        ? `+${summary.volumeGrowthRate}%`
                        : `${summary.volumeGrowthRate}%`}
                    </span>
                  </span>
                )}
              </div>

              <div>
                {isLoading ? (
                  <div className="h-7 w-28 bg-slate-200 dark:bg-slate-800 rounded-md animate-pulse" />
                ) : (
                  <div className="text-lg sm:text-2xl font-bold tracking-tight tabular-nums text-slate-900 dark:text-white truncate">
                    {summary?.formattedSuccessfulVolume || '₦0.00'}
                  </div>
                )}
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
                  {activeTimeframeObj.longLabel}
                </p>
              </div>
            </div>

            {/* Card 2: Completed Transactions */}
            <div className="min-w-0 p-4 rounded-xl bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800 flex flex-col justify-between gap-3">
              <div className="flex items-center justify-between gap-2 min-w-0">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
                  Transactions
                </span>
                {summary && summary.totalCount > 0 && (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800/60 shrink-0 tabular-nums">
                    <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                    <span>{summary.successRate}%</span>
                  </span>
                )}
              </div>

              <div>
                {isLoading ? (
                  <div className="h-7 w-20 bg-slate-200 dark:bg-slate-800 rounded-md animate-pulse" />
                ) : (
                  <div className="text-lg sm:text-2xl font-bold tracking-tight tabular-nums text-slate-900 dark:text-white truncate">
                    {(summary?.successfulCount || 0).toLocaleString()}
                  </div>
                )}
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate tabular-nums">
                  {summary && summary.totalCount > summary.successfulCount
                    ? `${summary.successfulCount} of ${summary.totalCount} completed`
                    : 'Completed'}
                </p>
              </div>
            </div>

            {/* Card 3: Average Order */}
            <div className="min-w-0 p-4 rounded-xl bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800 flex flex-col justify-between gap-3">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
                Average Order
              </span>

              <div>
                {isLoading ? (
                  <div className="h-7 w-24 bg-slate-200 dark:bg-slate-800 rounded-md animate-pulse" />
                ) : (
                  <div className="text-lg sm:text-2xl font-bold tracking-tight tabular-nums text-slate-900 dark:text-white truncate">
                    {summary?.formattedAvgTicket || '₦0.00'}
                  </div>
                )}
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
                  Per transaction
                </p>
              </div>
            </div>

            {/* Card 4: Discounts */}
            <div className="min-w-0 p-4 rounded-xl bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800 flex flex-col justify-between gap-3">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 truncate">
                Discounts Saved
              </span>

              <div>
                {isLoading ? (
                  <div className="h-7 w-24 bg-slate-200 dark:bg-slate-800 rounded-md animate-pulse" />
                ) : (
                  <div className="text-lg sm:text-2xl font-bold tracking-tight tabular-nums text-slate-900 dark:text-white truncate">
                    {summary?.formattedTotalDiscount || '₦0.00'}
                  </div>
                )}
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate tabular-nums">
                  On completed orders
                </p>
              </div>
            </div>
          </div>

          {/* Transaction Trend Chart */}
          <section
            className={`min-w-0 p-4 sm:p-5 rounded-xl bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800 space-y-4 transition-opacity duration-150 ${
              isUpdating ? 'opacity-70' : ''
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0">
              <div className="min-w-0">
                <h2 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white">
                  Transaction Trend
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums truncate">
                  {activePoint
                    ? `${activePoint.raw.label} — ${formatNaira(activePoint.raw.successfulVolumeNaira)} (${activePoint.raw.successfulCount} completed)`
                    : activeTimeframeObj.longLabel}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <div className="inline-flex p-0.5 rounded-lg bg-slate-100 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={() => setChartMetric('volume')}
                    className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                      chartMetric === 'volume'
                        ? 'bg-white dark:bg-[#126BEB] text-slate-900 dark:text-white'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Volume
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartMetric('count')}
                    className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                      chartMetric === 'count'
                        ? 'bg-white dark:bg-[#126BEB] text-slate-900 dark:text-white'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Count
                  </button>
                </div>

                <div className="inline-flex p-0.5 rounded-lg bg-slate-100 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 text-xs">
                  <button
                    type="button"
                    onClick={() => setChartStyle('line')}
                    className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                      chartStyle === 'line'
                        ? 'bg-white dark:bg-[#126BEB] text-slate-900 dark:text-white'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Line
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartStyle('bar')}
                    className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                      chartStyle === 'bar'
                        ? 'bg-white dark:bg-[#126BEB] text-slate-900 dark:text-white'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Bars
                  </button>
                </div>
              </div>
            </div>

            {isLoading ? (
              <div className="w-full h-[210px] sm:h-[230px] rounded-xl bg-slate-100 dark:bg-slate-800/40 animate-pulse p-5 flex items-end gap-2.5">
                {[38, 62, 48, 84, 56, 92, 68, 76, 44, 70, 58, 80].map((pct, i) => (
                  <div
                    key={i}
                    style={{ height: `${pct}%` }}
                    className="flex-1 rounded-t-md bg-slate-200 dark:bg-slate-700/60"
                  />
                ))}
              </div>
            ) : !hasCompletedActivity ? (
              <div className="py-12 text-center border-t border-slate-100 dark:border-slate-800/80 space-y-1.5">
                <BarChart3 className="w-6 h-6 text-slate-300 dark:text-slate-600 mx-auto" />
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  No completed transactions
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Activity for this period will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-2 min-w-0">
                <div className="grid grid-cols-[auto_1fr] gap-2 sm:gap-3 items-stretch min-w-0">
                  {/* Y-axis labels */}
                  <div className="flex flex-col justify-between py-2 text-[10px] sm:text-[11px] tabular-nums text-slate-400 dark:text-slate-500 text-right select-none shrink-0">
                    <span>
                      {chartMetric === 'volume'
                        ? formatCompactAxisNaira(maxChartValue)
                        : maxChartValue.toLocaleString()}
                    </span>
                    <span>
                      {chartMetric === 'volume'
                        ? formatCompactAxisNaira(maxChartValue * 0.5)
                        : Math.round(maxChartValue * 0.5).toLocaleString()}
                    </span>
                    <span>0</span>
                  </div>

                  {/* Chart SVG Canvas */}
                  <div
                    className="relative h-[190px] sm:h-[220px] min-w-0 select-none"
                    onMouseLeave={() => setActivePointIndex(null)}
                  >
                    <div className="absolute inset-0 flex flex-col justify-between py-3 pointer-events-none">
                      <div className="w-full border-b border-dashed border-slate-200 dark:border-slate-800" />
                      <div className="w-full border-b border-dashed border-slate-200 dark:border-slate-800" />
                      <div className="w-full border-b border-slate-200 dark:border-slate-800" />
                    </div>

                    <svg
                      viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                      className="block w-full h-full"
                      preserveAspectRatio="none"
                      role="img"
                      aria-label="Completed transactions trend chart"
                    >
                      <defs>
                        <linearGradient id="baxatoTrendFill" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#126BEB" stopOpacity="0.22" />
                          <stop offset="100%" stopColor="#126BEB" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {chartStyle === 'line' ? (
                        <>
                          {svgAreaD && <path d={svgAreaD} fill="url(#baxatoTrendFill)" />}
                          {svgPathD && (
                            <path
                              d={svgPathD}
                              fill="none"
                              stroke="#126BEB"
                              strokeWidth="2.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              vectorEffect="non-scaling-stroke"
                            />
                          )}

                          {activePoint && (
                            <line
                              x1={activePoint.x}
                              y1={padTop}
                              x2={activePoint.x}
                              y2={chartHeight - padBottom}
                              stroke="#126BEB"
                              strokeWidth="1"
                              strokeDasharray="3 3"
                              vectorEffect="non-scaling-stroke"
                            />
                          )}
                        </>
                      ) : (
                        timelinePoints.map((pt, idx) => {
                          const usableW = chartWidth - padLeft - padRight;
                          const slotW = usableW / Math.max(timelinePoints.length, 1);
                          const barW = Math.max(4, Math.min(24, slotW * 0.6));
                          const x = padLeft + idx * slotW + (slotW - barW) / 2;
                          const val =
                            chartMetric === 'volume' ? pt.successfulVolumeNaira : pt.successfulCount;
                          const usableH = chartHeight - padTop - padBottom;
                          const h = val > 0 ? Math.max(3, (val / maxChartValue) * usableH) : 0;
                          const y = chartHeight - padBottom - h;
                          const isActive = activePointIndex === idx;

                          return (
                            <rect
                              key={idx}
                              x={x}
                              y={y}
                              width={barW}
                              height={h}
                              rx={3}
                              fill={isActive ? '#38BDF8' : '#126BEB'}
                            />
                          );
                        })
                      )}

                      {/* Interactive hit strips matching active chart geometry */}
                      {chartPoints.map((pt, idx) => {
                        const usableW = chartWidth - padLeft - padRight;
                        const count = chartPoints.length;
                        let hitX = 0;
                        let hitW = chartWidth;

                        if (chartStyle === 'bar') {
                          const slotW = usableW / Math.max(count, 1);
                          hitX = idx === 0 ? 0 : padLeft + idx * slotW;
                          hitW =
                            idx === 0
                              ? padLeft + slotW
                              : idx === count - 1
                              ? slotW + padRight
                              : slotW;
                        } else if (count > 1) {
                          const step = usableW / (count - 1);
                          hitX = idx === 0 ? 0 : pt.x - step / 2;
                          hitW =
                            idx === 0
                              ? padLeft + step / 2
                              : idx === count - 1
                              ? padRight + step / 2
                              : step;
                        }

                        return (
                          <rect
                            key={`hit-${idx}`}
                            x={Math.max(0, hitX)}
                            y={0}
                            width={Math.max(6, hitW)}
                            height={chartHeight}
                            fill="transparent"
                            className="cursor-pointer"
                            onMouseEnter={() => setActivePointIndex(idx)}
                            onClick={() =>
                              setActivePointIndex((cur) => (cur === idx ? null : idx))
                            }
                          />
                        );
                      })}
                    </svg>

                    {/* Circular point indicator in HTML coordinates to avoid SVG preserveAspectRatio distortion */}
                    {chartStyle === 'line' && activePoint && (
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute w-2.5 h-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#126BEB] ring-2 ring-white dark:ring-[#0B1528]"
                        style={{
                          left: `${(activePoint.x / chartWidth) * 100}%`,
                          top: `${(activePoint.y / chartHeight) * 100}%`,
                        }}
                      />
                    )}
                  </div>
                </div>

                {xTickLabels.length > 0 && (
                  <div className="flex items-center justify-between gap-2 pl-9 sm:pl-11 text-[10px] sm:text-[11px] tabular-nums text-slate-400 dark:text-slate-500">
                    {xTickLabels.map((pt, idx) => (
                      <span key={idx} className="truncate">
                        {pt.label}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Service Mix & Category Breakdown */}
          <div
            className={`grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 min-w-0 transition-opacity duration-150 ${
              isUpdating ? 'opacity-70' : ''
            }`}
          >
            {/* Donut Mix */}
            <section className="lg:col-span-5 min-w-0 p-4 sm:p-5 rounded-xl bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800 flex flex-col justify-between gap-4">
              <h2 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white">
                Service Share
              </h2>

              {isLoading ? (
                <div className="py-8 flex flex-col items-center gap-4">
                  <div className="w-36 h-36 rounded-full border-[14px] border-slate-100 dark:border-slate-800 animate-pulse" />
                  <div className="h-4 w-40 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                </div>
              ) : donutSegments.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-500 dark:text-slate-400">
                  No completed transactions in this period.
                </div>
              ) : (
                <div className="flex flex-col items-center gap-5 py-2">
                  <div className="relative w-40 h-40 aspect-square shrink-0">
                    <svg viewBox="0 0 148 148" className="block w-full h-full -rotate-90">
                      {donutSegments.map((seg, idx) => (
                        <circle
                          key={seg.serviceType}
                          cx="74"
                          cy="74"
                          r="58"
                          fill="none"
                          stroke={seg.colorHex}
                          strokeWidth={activeDonutIndex === idx ? '18' : '15'}
                          strokeDasharray={seg.strokeDasharray}
                          strokeDashoffset={seg.strokeDashoffset}
                          className="transition-all duration-150 cursor-pointer"
                          onMouseEnter={() => setActiveDonutIndex(idx)}
                          onMouseLeave={() => setActiveDonutIndex(null)}
                          onClick={() =>
                            setActiveDonutIndex((cur) => (cur === idx ? null : idx))
                          }
                        />
                      ))}
                    </svg>

                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-4">
                      {activeDonut ? (
                        <>
                          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate max-w-full">
                            {activeDonut.label}
                          </span>
                          <span className="text-base font-bold tabular-nums text-slate-900 dark:text-white">
                            {activeDonut.percentage}%
                          </span>
                          <span className="text-[11px] font-medium tabular-nums text-[#126BEB] dark:text-[#38BDF8] truncate max-w-full">
                            {activeDonut.formattedVolume}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                            Completed
                          </span>
                          <span className="text-sm font-bold tabular-nums text-slate-900 dark:text-white truncate max-w-full mt-0.5">
                            {summary?.formattedSuccessfulVolume || '₦0.00'}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="w-full flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
                    {donutSegments.map((seg, idx) => (
                      <button
                        key={seg.serviceType}
                        type="button"
                        onMouseEnter={() => setActiveDonutIndex(idx)}
                        onMouseLeave={() => setActiveDonutIndex(null)}
                        onClick={() =>
                          setActiveDonutIndex((cur) => (cur === idx ? null : idx))
                        }
                        className={`inline-flex items-center gap-1.5 text-xs cursor-pointer transition-opacity ${
                          activeDonutIndex !== null && activeDonutIndex !== idx
                            ? 'opacity-50'
                            : 'opacity-100'
                        }`}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: seg.colorHex }}
                        />
                        <span className="font-medium text-slate-700 dark:text-slate-300">
                          {seg.label}
                        </span>
                        <span className="text-slate-500 dark:text-slate-400 tabular-nums">
                          {seg.percentage}%
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </section>

            {/* Category Breakdown List */}
            <section className="lg:col-span-7 min-w-0 p-4 sm:p-5 rounded-xl bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800 space-y-3">
              <h2 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white">
                By Service
              </h2>

              {isLoading ? (
                <div className="divide-y divide-slate-100 dark:divide-slate-800/70">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="py-3 flex items-center justify-between gap-3 animate-pulse">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800" />
                        <div className="space-y-1.5">
                          <div className="h-3.5 w-24 bg-slate-200 dark:bg-slate-800 rounded" />
                          <div className="h-3 w-16 bg-slate-100 dark:bg-slate-800/70 rounded" />
                        </div>
                      </div>
                      <div className="h-4 w-20 bg-slate-200 dark:bg-slate-800 rounded" />
                    </div>
                  ))}
                </div>
              ) : (analyticsData?.serviceBreakdown?.length || 0) === 0 ? (
                <div className="py-10 text-center text-xs text-slate-500 dark:text-slate-400">
                  No service activity in this period.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800/70">
                  {analyticsData!.serviceBreakdown.map((item) => {
                    const theme = SERVICE_THEME[item.serviceType] || {
                      icon: Layers,
                      badgeClass: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
                      barClass: 'bg-slate-500',
                    };
                    const Icon = theme.icon;

                    return (
                      <div key={item.serviceType} className="py-3 first:pt-1 last:pb-1 space-y-2 min-w-0">
                        <div className="flex items-center justify-between gap-3 min-w-0">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${theme.badgeClass}`}
                            >
                              <Icon className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <div className="text-xs sm:text-sm font-medium text-slate-900 dark:text-white truncate">
                                {item.label}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums truncate">
                                {item.successfulCount} completed • Avg {item.formattedAvgTicket}
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className="text-xs sm:text-sm font-semibold tabular-nums text-slate-900 dark:text-white">
                              {item.formattedVolume}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                              {item.volumeShare}%
                              {item.discountNaira > 0 ? ` • Saved ${item.formattedDiscount}` : ''}
                            </div>
                          </div>
                        </div>

                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${theme.barClass}`}
                            style={{ width: `${Math.min(100, Math.max(0, item.volumeShare))}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>

          {/* Providers & Channels */}
          <div
            className={`grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 min-w-0 transition-opacity duration-150 ${
              isUpdating ? 'opacity-70' : ''
            }`}
          >
            {/* Top Operators */}
            <section className="lg:col-span-7 min-w-0 p-4 sm:p-5 rounded-xl bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800 space-y-3">
              <h2 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white">
                Top Operators
              </h2>

              {isLoading ? (
                <div className="divide-y divide-slate-100 dark:divide-slate-800/70">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="py-3 flex items-center justify-between gap-3 animate-pulse">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800" />
                        <div className="space-y-1.5">
                          <div className="h-3.5 w-28 bg-slate-200 dark:bg-slate-800 rounded" />
                          <div className="h-3 w-20 bg-slate-100 dark:bg-slate-800/70 rounded" />
                        </div>
                      </div>
                      <div className="h-4 w-20 bg-slate-200 dark:bg-slate-800 rounded" />
                    </div>
                  ))}
                </div>
              ) : (analyticsData?.topOperators?.length || 0) === 0 ? (
                <div className="py-10 text-center text-xs text-slate-500 dark:text-slate-400">
                  No operator activity in this period.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800/70">
                  {analyticsData!.topOperators.map((op, idx) => {
                    const { logoUrl, fullBleed } = getOperatorLogo(op.operator);
                    const serviceName =
                      op.serviceLabel || SERVICE_LABELS[op.serviceType] || op.serviceType;

                    return (
                      <div
                        key={`${op.operator}-${op.serviceType}-${idx}`}
                        className="py-3 first:pt-1 last:pb-1 flex items-center justify-between gap-3 min-w-0"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-lg relative shrink-0 overflow-hidden border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-center ${
                              fullBleed ? 'bg-transparent' : 'bg-white'
                            }`}
                          >
                            {logoUrl ? (
                              <Image
                                src={logoUrl}
                                alt={op.operator}
                                fill
                                sizes="36px"
                                className={fullBleed ? 'object-cover' : 'object-contain p-1'}
                              />
                            ) : (
                              <span className="text-[11px] font-bold text-slate-600">
                                {op.operator.slice(0, 3).toUpperCase()}
                              </span>
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="text-xs sm:text-sm font-medium text-slate-900 dark:text-white truncate">
                              {op.operator}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate tabular-nums">
                              {serviceName} • {op.successfulCount} completed
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="text-xs sm:text-sm font-semibold tabular-nums text-slate-900 dark:text-white">
                            {op.formattedVolume}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                            {op.volumeShare}%
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Channels */}
            <section className="lg:col-span-5 min-w-0 p-4 sm:p-5 rounded-xl bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800 space-y-4">
              <h2 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white">
                Channels
              </h2>

              {isLoading ? (
                <div className="space-y-4 animate-pulse">
                  <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full" />
                  <div className="h-14 w-full bg-slate-100 dark:bg-slate-800/70 rounded-lg" />
                  <div className="h-14 w-full bg-slate-100 dark:bg-slate-800/70 rounded-lg" />
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Split Progress Bar */}
                  <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden flex">
                    <div
                      className="bg-[#126BEB] h-full transition-all duration-300"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(0, analyticsData?.channelBreakdown?.console?.volumeShare || 0),
                        )}%`,
                      }}
                    />
                    <div
                      className="bg-emerald-500 h-full transition-all duration-300"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(0, analyticsData?.channelBreakdown?.api?.volumeShare || 0),
                        )}%`,
                      }}
                    />
                  </div>

                  <div className="divide-y divide-slate-100 dark:divide-slate-800/70">
                    {/* Dashboard Channel */}
                    <div className="py-3 first:pt-1 flex items-center justify-between gap-3 min-w-0">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#126BEB] shrink-0" />
                        <div className="min-w-0">
                          <div className="text-xs sm:text-sm font-medium text-slate-900 dark:text-white">
                            Dashboard
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                            {(analyticsData?.channelBreakdown?.console?.successfulCount || 0).toLocaleString()} completed
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs sm:text-sm font-semibold tabular-nums text-slate-900 dark:text-white">
                          {analyticsData?.channelBreakdown?.console?.formattedVolume || '₦0.00'}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                          {analyticsData?.channelBreakdown?.console?.volumeShare || 0}%
                        </div>
                      </div>
                    </div>

                    {/* API Channel */}
                    <div className="py-3 last:pb-1 flex items-center justify-between gap-3 min-w-0">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                        <div className="min-w-0">
                          <div className="text-xs sm:text-sm font-medium text-slate-900 dark:text-white">
                            API
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                            {(analyticsData?.channelBreakdown?.api?.successfulCount || 0).toLocaleString()} completed
                          </div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs sm:text-sm font-semibold tabular-nums text-slate-900 dark:text-white">
                          {analyticsData?.channelBreakdown?.api?.formattedVolume || '₦0.00'}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">
                          {analyticsData?.channelBreakdown?.api?.volumeShare || 0}%
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </section>
          </div>
        </main>
      </div>

      {/* Identity Verification Modal */}
      <KycModal
        isOpen={isKycModalOpen}
        onClose={() => setIsKycModalOpen(false)}
        onSuccess={handleKycSuccess}
        userFirstName={userFirstName}
        userLastName={userLastName}
      />
    </div>
  );
}
