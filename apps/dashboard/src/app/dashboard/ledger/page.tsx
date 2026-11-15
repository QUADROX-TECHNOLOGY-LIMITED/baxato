'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  FileText,
  ArrowLeft,
  Search,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Tv,
  GraduationCap,
  Zap,
  Phone,
  Wifi,
  Layers,
  X,
  Download,
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
import { useModalThemeSync } from '@/lib/use-modal-theme-sync';

export interface UnifiedTransaction {
  id: string;
  reference: string;
  clientReference?: string;
  providerReference?: string;
  serviceType: 'AIRTIME' | 'DATA' | 'ELECTRICITY' | 'CABLE_TV' | 'EXAM_PIN';
  recipient: string;
  amountKobo: string;
  amountNaira: number;
  formattedAmount: string;
  feeKobo: string;
  feeNaira: number;
  discountKobo: string;
  discountNaira: number;
  totalAmountKobo: string;
  totalAmountNaira: number;
  channel?: 'API' | 'WEB' | string;
  status: 'SUCCESSFUL' | 'PROCESSING' | 'PENDING' | 'FAILED' | 'REVERSED';
  metadata?: Record<string, any>;
  createdAt: string;
}

const SERVICE_OPTIONS = [
  { value: 'ALL', label: 'All Services', icon: Layers },
  { value: 'AIRTIME', label: 'Airtime', icon: Phone },
  { value: 'DATA', label: 'Data Bundles', icon: Wifi },
  { value: 'ELECTRICITY', label: 'Electricity', icon: Zap },
  { value: 'CABLE_TV', label: 'Cable TV', icon: Tv },
  { value: 'EXAM_PIN', label: 'Exam PINs', icon: GraduationCap },
];

const CHANNEL_OPTIONS = [
  { value: 'ALL', label: 'All Channels' },
  { value: 'WEB', label: 'Dashboard' },
  { value: 'API', label: 'API' },
];

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All Statuses', dotColor: 'bg-slate-400' },
  { value: 'SUCCESSFUL', label: 'Successful', dotColor: 'bg-emerald-500' },
  { value: 'PENDING', label: 'Pending', dotColor: 'bg-amber-500' },
  { value: 'FAILED', label: 'Failed', dotColor: 'bg-rose-500' },
];

const SERVICE_LABELS: Record<string, string> = {
  AIRTIME: 'Airtime',
  DATA: 'Data Bundles',
  ELECTRICITY: 'Electricity',
  CABLE_TV: 'Cable TV',
  EXAM_PIN: 'Exam PINs',
};

function getServiceIcon(type: string) {
  switch (type) {
    case 'CABLE_TV':
      return Tv;
    case 'EXAM_PIN':
      return GraduationCap;
    case 'ELECTRICITY':
      return Zap;
    case 'AIRTIME':
      return Phone;
    case 'DATA':
      return Wifi;
    default:
      return Layers;
  }
}

function getServiceDisplayLabel(type: string, metadata?: Record<string, any>): string {
  if (type === 'CABLE_TV') return metadata?.operatorName || metadata?.operator || 'Cable TV';
  if (type === 'EXAM_PIN') return metadata?.examBody || 'Exam PINs';
  if (type === 'ELECTRICITY') return metadata?.disco || 'Electricity';
  return SERVICE_LABELS[type] || type;
}

function escapeCsvCell(value: unknown): string {
  const str = String(value ?? '');
  const guarded = /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
  return `"${guarded.replace(/"/g, '""')}"`;
}

function LedgerContent() {
  const searchParams = useSearchParams();
  const initialService = searchParams.get('service') || searchParams.get('serviceType') || 'ALL';

  // Layout & Session
  const [merchantName, setMerchantName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const u = getStoredUser();
      if (u?.firstName) return u.firstName;
    }
    return '';
  });
  const [businessName, setBusinessName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const b = getStoredBusiness();
      if (b?.name) return b.name;
    }
    return '';
  });
  const [kycStatus, setKycStatus] = useState<string>('VERIFIED');
  const [userRole, setUserRole] = useState<string>('BUSINESS_OWNER');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isKycModalOpen, setIsKycModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters & Dropdowns
  const [selectedService, setSelectedService] = useState<string>(initialService);
  const [selectedChannel, setSelectedChannel] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [openDropdown, setOpenDropdown] = useState<'service' | 'channel' | 'status' | null>(null);
  const filterBarRef = useRef<HTMLDivElement>(null);

  // Data & Pagination
  const [transactions, setTransactions] = useState<UnifiedTransaction[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [limit] = useState<number>(20);
  const [page, setPage] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const hasLoadedOnceRef = useRef<boolean>(false);
  const [selectedTransaction, setSelectedTransaction] = useState<UnifiedTransaction | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  useModalThemeSync(Boolean(selectedTransaction));

  // Initialize Auth Context
  useEffect(() => {
    const user = getStoredUser();
    const biz = getStoredBusiness();
    if (biz?.role) setUserRole(biz.role);
    else if (user?.role) setUserRole(user.role);
    if (user?.firstName) setMerchantName(user.firstName);
    if (user?.kycStatus) setKycStatus(user.kycStatus);
    if (biz?.name) setBusinessName(biz.name);
  }, []);

  // Close dropdowns on outside click & modal/dropdown on Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterBarRef.current && !filterBarRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenDropdown(null);
        setSelectedTransaction(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const isOwnerOrAdmin = userRole === 'BUSINESS_OWNER' || userRole === 'BUSINESS_ADMIN';
  const canExportReports = isOwnerOrAdmin || userRole === 'FINANCE';

  // Update selectedService when URL changes
  useEffect(() => {
    const urlService = searchParams.get('service') || searchParams.get('serviceType');
    if (urlService) {
      setSelectedService(urlService);
      setPage(1);
    }
  }, [searchParams]);

  // Build query parameters shared between list fetch and CSV export
  const buildFilterParams = (customLimit: number, customOffset: number) => {
    const params = new URLSearchParams();
    if (selectedService && selectedService !== 'ALL') params.set('serviceType', selectedService);
    if (selectedChannel && selectedChannel !== 'ALL') params.set('channel', selectedChannel);
    if (selectedStatus && selectedStatus !== 'ALL') params.set('status', selectedStatus);
    if (searchQuery.trim()) params.set('search', searchQuery.trim());
    params.set('limit', customLimit.toString());
    params.set('offset', customOffset.toString());
    return params;
  };

  // Load Transactions
  const fetchTransactions = async () => {
    try {
      if (!hasLoadedOnceRef.current) {
        setIsLoading(true);
      } else {
        setIsUpdating(true);
      }
      const authToken = getStoredAuthToken();
      if (!authToken) {
        clearSessionAndRedirect('expired');
        return;
      }

      const offset = (page - 1) * limit;
      const params = buildFilterParams(limit, offset);

      const res = await fetch(`/api/transactions?${params.toString()}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json().catch(() => null);

      if (res.ok && data?.success) {
        setTransactions(data.data?.transactions || []);
        setTotalCount(data.data?.total || 0);
      }
    } catch {
      // Graceful error fallback
    } finally {
      hasLoadedOnceRef.current = true;
      setIsLoading(false);
      setIsUpdating(false);
      setIsRefreshing(false);
    }
  };

  // Debounce search input without causing a duplicate fetch on initial mount
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed === debouncedSearch) return;
    const timer = setTimeout(() => {
      setPage(1);
      setDebouncedSearch(trimmed);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery, debouncedSearch]);

  useEffect(() => {
    fetchTransactions();
  }, [selectedService, selectedChannel, selectedStatus, debouncedSearch, page]);

  const copyToClipboard = (text: string, key: string = text) => {
    if (!text || typeof navigator === 'undefined' || !navigator.clipboard) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  const handleExportCSV = async () => {
    try {
      setIsExporting(true);
      const authToken = getStoredAuthToken();
      if (!authToken) return;

      const params = buildFilterParams(1000, 0);

      const res = await fetch(`/api/transactions?${params.toString()}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json().catch(() => null);

      const exportList: UnifiedTransaction[] =
        res.ok && data?.success && Array.isArray(data.data?.transactions)
          ? data.data.transactions
          : transactions;

      if (exportList.length === 0) {
        return;
      }

      const headers = [
        'Reference',
        'Client Reference',
        'Date & Time',
        'Service',
        'Recipient',
        'Channel',
        'Amount (NGN)',
        'Amount Paid (NGN)',
        'Status',
      ];

      const csvRows = [
        headers.join(','),
        ...exportList.map((t) =>
          [
            escapeCsvCell(t.reference || ''),
            escapeCsvCell(t.clientReference || ''),
            escapeCsvCell(new Date(t.createdAt).toLocaleString('en-NG')),
            escapeCsvCell(SERVICE_LABELS[t.serviceType] || t.serviceType || ''),
            escapeCsvCell(t.recipient || ''),
            escapeCsvCell(t.channel === 'API' ? 'API' : 'Dashboard'),
            (t.amountNaira || 0).toFixed(2),
            (t.totalAmountNaira || t.amountNaira || 0).toFixed(2),
            escapeCsvCell(t.status || ''),
          ].join(','),
        ),
      ];

      const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvRows.join('\n'));
      const downloadLink = document.createElement('a');
      downloadLink.setAttribute('href', csvContent);
      downloadLink.setAttribute(
        'download',
        `baxato-transactions-${new Date().toISOString().slice(0, 10)}.csv`,
      );
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    } finally {
      setIsExporting(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / limit));

  const activeServiceObj =
    SERVICE_OPTIONS.find((s) => s.value === selectedService) || SERVICE_OPTIONS[0];
  const activeChannelObj =
    CHANNEL_OPTIONS.find((c) => c.value === selectedChannel) || CHANNEL_OPTIONS[0];
  const activeStatusObj =
    STATUS_OPTIONS.find((s) => s.value === selectedStatus) || STATUS_OPTIONS[0];

  const renderStatusPill = (status: string) => {
    switch (status) {
      case 'SUCCESSFUL':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/60">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Successful</span>
          </span>
        );
      case 'PROCESSING':
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200/80 dark:border-amber-800/60">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>{status === 'PROCESSING' ? 'Processing' : 'Pending'}</span>
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200/80 dark:border-rose-800/60">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            <span>Failed</span>
          </span>
        );
      case 'REVERSED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-400 border border-purple-200/80 dark:border-purple-800/60">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
            <span>Reversed</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            {status}
          </span>
        );
    }
  };

  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    selectedService !== 'ALL' ||
    selectedChannel !== 'ALL' ||
    selectedStatus !== 'ALL';

  return (
    <div className="min-h-screen bg-white dark:bg-[#070D18]">
      {/* Sidebar */}
      <Sidebar
        businessName={businessName}
        merchantName={merchantName}
        kycStatus={kycStatus}
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
          isRefreshing={isRefreshing}
          onRefresh={() => {
            setIsRefreshing(true);
            fetchTransactions();
          }}
          sticky={false}
        />

        <main className="flex-1 px-4 py-5 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full space-y-5">
          <KycBanner kycStatus={kycStatus} onOpenKycModal={() => setIsKycModalOpen(true)} />

          {/* Clean Top Actions & Full-Width Page Title */}
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
                  disabled={isExporting}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap shrink-0 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                  <span>{isExporting ? 'Exporting...' : 'Export CSV'}</span>
                </button>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              Transaction History
            </h1>
          </div>

          {/* Compact Filter Row */}
          <div
            ref={filterBarRef}
            className="grid grid-cols-2 sm:grid-cols-12 gap-2.5"
          >
            {/* Search Input */}
            <div className="col-span-2 sm:col-span-5 relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search reference or recipient..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-9 pr-3 text-xs rounded-lg bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#126BEB]/20 focus:border-[#126BEB]"
              />
            </div>

            {/* Service Selector */}
            <div className="col-span-1 sm:col-span-3 relative">
              <button
                type="button"
                onClick={() => setOpenDropdown(openDropdown === 'service' ? null : 'service')}
                className="w-full h-10 px-3 rounded-lg bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-100 flex items-center justify-between gap-2 font-medium cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
              >
                <span className="flex items-center gap-1.5 truncate">
                  <activeServiceObj.icon className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                  <span className="truncate">{activeServiceObj.label}</span>
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </button>

              {openDropdown === 'service' && (
                <div className="absolute z-30 left-0 right-0 top-11 bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg overflow-hidden py-1">
                  {SERVICE_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const isSelected = selectedService === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setSelectedService(opt.value);
                          setOpenDropdown(null);
                          setPage(1);
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

            {/* Channel Selector (Dashboard vs API) */}
            <div className="col-span-1 sm:col-span-2 relative">
              <button
                type="button"
                onClick={() => setOpenDropdown(openDropdown === 'channel' ? null : 'channel')}
                className="w-full h-10 px-3 rounded-lg bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-100 flex items-center justify-between gap-2 font-medium cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
              >
                <span className="truncate">{activeChannelObj.label}</span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </button>

              {openDropdown === 'channel' && (
                <div className="absolute z-30 left-0 right-0 top-11 bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg overflow-hidden py-1">
                  {CHANNEL_OPTIONS.map((opt) => {
                    const isSelected = selectedChannel === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setSelectedChannel(opt.value);
                          setOpenDropdown(null);
                          setPage(1);
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

            {/* Status Selector */}
            <div className="col-span-2 sm:col-span-2 relative">
              <button
                type="button"
                onClick={() => setOpenDropdown(openDropdown === 'status' ? null : 'status')}
                className="w-full h-10 px-3 rounded-lg bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-100 flex items-center justify-between gap-2 font-medium cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
              >
                <span className="flex items-center gap-2 truncate">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${activeStatusObj.dotColor}`} />
                  <span className="truncate">{activeStatusObj.label}</span>
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </button>

              {openDropdown === 'status' && (
                <div className="absolute z-30 left-0 right-0 top-11 bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg overflow-hidden py-1">
                  {STATUS_OPTIONS.map((opt) => {
                    const isSelected = selectedStatus === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setSelectedStatus(opt.value);
                          setOpenDropdown(null);
                          setPage(1);
                        }}
                        className={`w-full px-3 py-2 text-xs flex items-center justify-between text-left transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-slate-100 dark:bg-slate-800 text-[#126BEB] dark:text-[#38BDF8] font-semibold'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                        }`}
                      >
                        <span className="flex items-center gap-2 truncate">
                          <span className={`w-2 h-2 rounded-full shrink-0 ${opt.dotColor}`} />
                          <span className="truncate">{opt.label}</span>
                        </span>
                        {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Clean Transactions Table */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-[#0B1528]">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-[13px] whitespace-nowrap">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 text-xs font-medium text-slate-500 dark:text-slate-400">
                    <th className="py-3 px-4">Service</th>
                    <th className="py-3 px-4">Recipient</th>
                    <th className="py-3 px-4">Reference</th>
                    <th className="py-3 px-4">Channel</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Paid</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody
                  className={`divide-y divide-slate-100 dark:divide-slate-800/70 transition-opacity duration-150 ${
                    isUpdating ? 'opacity-60' : ''
                  }`}
                >
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="py-3.5 px-4"><div className="w-24 h-4 bg-slate-100 dark:bg-slate-800 rounded" /></td>
                        <td className="py-3.5 px-4"><div className="w-28 h-4 bg-slate-100 dark:bg-slate-800 rounded" /></td>
                        <td className="py-3.5 px-4"><div className="w-28 h-4 bg-slate-100 dark:bg-slate-800 rounded" /></td>
                        <td className="py-3.5 px-4"><div className="w-16 h-4 bg-slate-100 dark:bg-slate-800 rounded" /></td>
                        <td className="py-3.5 px-4"><div className="w-16 h-4 bg-slate-100 dark:bg-slate-800 rounded" /></td>
                        <td className="py-3.5 px-4"><div className="w-16 h-4 bg-slate-100 dark:bg-slate-800 rounded" /></td>
                        <td className="py-3.5 px-4"><div className="w-20 h-4 bg-slate-100 dark:bg-slate-800 rounded-full" /></td>
                        <td className="py-3.5 px-4"><div className="w-24 h-4 bg-slate-100 dark:bg-slate-800 rounded" /></td>
                        <td className="py-3.5 px-4 text-right"><div className="w-12 h-4 bg-slate-100 dark:bg-slate-800 rounded ml-auto" /></td>
                      </tr>
                    ))
                  ) : transactions.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 px-4 text-center">
                        <div className="max-w-xs mx-auto space-y-1.5">
                          <FileText className="w-6 h-6 text-slate-300 dark:text-slate-600 mx-auto" />
                          <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                            No transactions found
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {hasActiveFilters
                              ? 'Try adjusting your search or filter selections.'
                              : 'Completed purchases will appear here.'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    transactions.map((tx) => {
                      const SvcIcon = getServiceIcon(tx.serviceType);
                      const isApi = tx.channel === 'API';
                      return (
                        <tr
                          key={tx.id}
                          className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition-colors"
                        >
                          <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">
                            <span className="inline-flex items-center gap-2">
                              <SvcIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{getServiceDisplayLabel(tx.serviceType, tx.metadata)}</span>
                            </span>
                          </td>

                          <td className="py-3 px-4">
                            <div className="font-medium text-slate-900 dark:text-white truncate max-w-[180px]">
                              {tx.recipient}
                            </div>
                            {(tx.metadata?.customerName || tx.metadata?.bouquetName) && (
                              <div className="text-[11px] text-slate-400 truncate max-w-[180px]">
                                {tx.metadata.customerName || tx.metadata.bouquetName}
                              </div>
                            )}
                          </td>

                          <td className="py-3 px-4">
                            <button
                              type="button"
                              onClick={() => copyToClipboard(tx.reference, `row-${tx.id}`)}
                              className="inline-flex items-center gap-1.5 font-mono text-[11px] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer group"
                              title="Copy reference"
                            >
                              <span>
                                {tx.reference.length > 18
                                  ? `${tx.reference.substring(0, 18)}...`
                                  : tx.reference}
                              </span>
                              {copiedKey === `row-${tx.id}` ? (
                                <Check className="w-3 h-3 text-emerald-500" />
                              ) : (
                                <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 text-slate-400 transition-opacity" />
                              )}
                            </button>
                          </td>

                          <td className="py-3 px-4">
                            <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                              {isApi ? 'API' : 'Dashboard'}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-slate-700 dark:text-slate-300 tabular-nums">
                            ₦{(tx.amountNaira || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                          </td>

                          <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white tabular-nums">
                            ₦{(tx.totalAmountNaira || tx.amountNaira || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                          </td>

                          <td className="py-3 px-4">{renderStatusPill(tx.status)}</td>

                          <td className="py-3 px-4 text-xs text-slate-500 dark:text-slate-400">
                            {new Date(tx.createdAt).toLocaleDateString('en-NG', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>

                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => setSelectedTransaction(tx)}
                              className="inline-flex items-center justify-center px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Compact Pagination Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-200 dark:border-slate-800 text-xs">
              <span className="text-slate-500 dark:text-slate-400">
                Showing{' '}
                <span className="font-medium text-slate-900 dark:text-white">
                  {transactions.length === 0 ? 0 : (page - 1) * limit + 1}
                </span>
                {' - '}
                <span className="font-medium text-slate-900 dark:text-white">
                  {Math.min(page * limit, totalCount)}
                </span>{' '}
                of <span className="font-medium text-slate-900 dark:text-white">{totalCount}</span>
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || isLoading}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900/50 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <span className="px-2.5 py-1 font-medium text-slate-700 dark:text-slate-200 text-xs">
                  Page {page} of {totalPages}
                </span>

                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages || isLoading}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-900/50 text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Soft Transaction Detail Modal */}
      {selectedTransaction && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/35 dark:bg-black/70 animate-in fade-in duration-150"
          onClick={() => setSelectedTransaction(null)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-[#0B1528] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-semibold text-base text-slate-900 dark:text-white">
                Transaction Details
              </h3>
              <button
                type="button"
                onClick={() => setSelectedTransaction(null)}
                aria-label="Close"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4 max-h-[75dvh] overflow-y-auto">
              {/* Calm Top Summary */}
              <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">Amount Paid</span>
                  <div className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums mt-0.5">
                    ₦{(selectedTransaction.totalAmountNaira || selectedTransaction.amountNaira || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                  </div>
                  {selectedTransaction.amountNaira !== selectedTransaction.totalAmountNaira && (
                    <span className="text-[11px] text-slate-400">
                      Face value: ₦{(selectedTransaction.amountNaira || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                    </span>
                  )}
                </div>

                <div className="flex flex-col items-end gap-1.5">
                  {renderStatusPill(selectedTransaction.status)}
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    {selectedTransaction.channel === 'API' ? 'API' : 'Dashboard'}
                  </span>
                </div>
              </div>

              {/* Clean Key-Value List */}
              <dl className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                <div className="py-2.5 flex items-center justify-between gap-4">
                  <dt className="text-slate-500 dark:text-slate-400">Source</dt>
                  <dd className="font-medium text-slate-900 dark:text-white text-right">
                    {selectedTransaction.channel === 'API' ? 'API' : 'Dashboard'}
                  </dd>
                </div>

                <div className="py-2.5 flex items-center justify-between gap-4">
                  <dt className="text-slate-500 dark:text-slate-400">Service</dt>
                  <dd className="font-medium text-slate-900 dark:text-white text-right">
                    {SERVICE_LABELS[selectedTransaction.serviceType] || selectedTransaction.serviceType}
                    {selectedTransaction.metadata?.operator ||
                    selectedTransaction.metadata?.disco ||
                    selectedTransaction.metadata?.examBody
                      ? ` (${
                          selectedTransaction.metadata.operator ||
                          selectedTransaction.metadata.disco ||
                          selectedTransaction.metadata.examBody
                        })`
                      : ''}
                  </dd>
                </div>

                <div className="py-2.5 flex items-center justify-between gap-4">
                  <dt className="text-slate-500 dark:text-slate-400">Recipient</dt>
                  <dd className="font-medium text-slate-900 dark:text-white text-right break-all">
                    {selectedTransaction.recipient}
                  </dd>
                </div>

                {selectedTransaction.metadata?.customerName && (
                  <div className="py-2.5 flex items-center justify-between gap-4">
                    <dt className="text-slate-500 dark:text-slate-400">Customer</dt>
                    <dd className="font-medium text-slate-900 dark:text-white text-right">
                      {selectedTransaction.metadata.customerName}
                    </dd>
                  </div>
                )}

                {selectedTransaction.metadata?.bouquetName && (
                  <div className="py-2.5 flex items-center justify-between gap-4">
                    <dt className="text-slate-500 dark:text-slate-400">Package</dt>
                    <dd className="font-medium text-slate-900 dark:text-white text-right">
                      {selectedTransaction.metadata.bouquetName}
                    </dd>
                  </div>
                )}

                {selectedTransaction.metadata?.token && (
                  <div className="py-2.5 flex items-center justify-between gap-4">
                    <dt className="text-slate-500 dark:text-slate-400">Meter Token</dt>
                    <dd className="flex items-center gap-2 font-mono font-semibold text-slate-900 dark:text-white">
                      <span>{selectedTransaction.metadata.token}</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(selectedTransaction.metadata!.token, 'modal-token')}
                        className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                        title="Copy token"
                      >
                        {copiedKey === 'modal-token' ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </dd>
                  </div>
                )}

                {selectedTransaction.metadata?.pins && Array.isArray(selectedTransaction.metadata.pins) && (
                  <div className="py-2.5 space-y-1.5">
                    <dt className="text-slate-500 dark:text-slate-400">Exam PINs</dt>
                    <dd className="space-y-1">
                      {selectedTransaction.metadata.pins.map((p: any, idx: number) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between gap-2 font-mono text-xs text-slate-900 dark:text-white bg-slate-50 dark:bg-slate-900/60 px-2.5 py-1.5 rounded-lg"
                        >
                          <span>
                            {p.pin} {p.serialNumber ? `(S/N: ${p.serialNumber})` : ''}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(String(p.pin || ''), `modal-pin-${idx}`)}
                            className="p-1 rounded hover:bg-slate-200/70 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer"
                            title="Copy PIN"
                          >
                            {copiedKey === `modal-pin-${idx}` ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      ))}
                    </dd>
                  </div>
                )}

                <div className="py-2.5 flex items-center justify-between gap-4">
                  <dt className="text-slate-500 dark:text-slate-400 shrink-0">Reference</dt>
                  <dd className="flex items-center gap-1.5 min-w-0">
                    <span className="font-mono text-slate-800 dark:text-slate-200 truncate">
                      {selectedTransaction.reference}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(selectedTransaction.reference, 'modal-ref')}
                      className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors shrink-0 cursor-pointer"
                      title="Copy reference"
                    >
                      {copiedKey === 'modal-ref' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </dd>
                </div>

                <div className="py-2.5 flex items-center justify-between gap-4">
                  <dt className="text-slate-500 dark:text-slate-400 shrink-0">Client Reference</dt>
                  <dd className="flex items-center gap-1.5 min-w-0">
                    {selectedTransaction.clientReference ? (
                      <>
                        <span className="font-mono text-slate-800 dark:text-slate-200 truncate">
                          {selectedTransaction.clientReference}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            copyToClipboard(selectedTransaction.clientReference!, 'modal-client-ref')
                          }
                          className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors shrink-0 cursor-pointer"
                          title="Copy client reference"
                        >
                          {copiedKey === 'modal-client-ref' ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </dd>
                </div>

                <div className="py-2.5 flex items-center justify-between gap-4">
                  <dt className="text-slate-500 dark:text-slate-400">Date</dt>
                  <dd className="text-slate-700 dark:text-slate-300 text-right">
                    {new Date(selectedTransaction.createdAt).toLocaleString('en-NG')}
                  </dd>
                </div>
              </dl>
            </div>

            {/* Footer */}
            <div className="px-5 py-3.5 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedTransaction(null)}
                className="px-4 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KYC Modal */}
      <KycModal
        isOpen={isKycModalOpen}
        onClose={() => setIsKycModalOpen(false)}
        onSuccess={() => setKycStatus('VERIFIED')}
      />
    </div>
  );
}

export default function LedgerPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#070D18]">
          <div className="w-7 h-7 border-2 border-[#126BEB] border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LedgerContent />
    </Suspense>
  );
}
