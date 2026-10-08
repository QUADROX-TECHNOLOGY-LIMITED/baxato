'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  FileText,
  ArrowLeft,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  XCircle,
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
  Filter,
  ArrowUpDown,
  ExternalLink,
  ShieldCheck,
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
  providerName?: string;
  metadata?: Record<string, any>;
  errorMessage?: string;
  createdAt: string;
}

const SERVICE_OPTIONS = [
  { value: 'ALL', label: 'All Services', icon: Layers, color: 'text-slate-400' },
  { value: 'CABLE_TV', label: 'Cable TV (PayTV)', icon: Tv, color: 'text-indigo-500' },
  { value: 'EXAM_PIN', label: 'Exam PINs (WAEC/JAMB)', icon: GraduationCap, color: 'text-emerald-500' },
  { value: 'ELECTRICITY', label: 'Electricity Bills', icon: Zap, color: 'text-amber-500' },
  { value: 'AIRTIME', label: 'Airtime Topup', icon: Phone, color: 'text-blue-500' },
  { value: 'DATA', label: 'Data Bundles', icon: Wifi, color: 'text-cyan-500' },
];

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All Statuses', dotColor: 'bg-slate-400' },
  { value: 'SUCCESSFUL', label: 'Successful', dotColor: 'bg-emerald-500' },
  { value: 'PROCESSING', label: 'Processing', dotColor: 'bg-amber-500' },
  { value: 'PENDING', label: 'Pending', dotColor: 'bg-blue-500' },
  { value: 'FAILED', label: 'Failed', dotColor: 'bg-rose-500' },
  { value: 'REVERSED', label: 'Reversed', dotColor: 'bg-purple-500' },
];

function LedgerContent() {
  const searchParams = useSearchParams();
  const initialService = searchParams.get('service') || searchParams.get('serviceType') || 'ALL';

  // Layout & Session
  const [merchantName, setMerchantName] = useState('Merchant');
  const [businessName, setBusinessName] = useState('My Business');
  const [kycStatus, setKycStatus] = useState<string>('VERIFIED');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isKycModalOpen, setIsKycModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters & State
  const [selectedService, setSelectedService] = useState<string>(initialService);
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isServiceDropdownOpen, setIsServiceDropdownOpen] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);

  // Data & Pagination
  const [transactions, setTransactions] = useState<UnifiedTransaction[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [limit] = useState<number>(20);
  const [page, setPage] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedTransaction, setSelectedTransaction] = useState<UnifiedTransaction | null>(null);
  const [copiedRef, setCopiedRef] = useState<string | null>(null);

  // Initialize Auth Context
  useEffect(() => {
    const user = getStoredUser();
    const biz = getStoredBusiness();
    if (user?.firstName) setMerchantName(user.firstName);
    if (user?.kycStatus) setKycStatus(user.kycStatus);
    if (biz?.name) setBusinessName(biz.name);
  }, []);

  // Update selectedService when URL changes
  useEffect(() => {
    const urlService = searchParams.get('service') || searchParams.get('serviceType');
    if (urlService) {
      setSelectedService(urlService);
      setPage(1);
    }
  }, [searchParams]);

  // Load Transactions
  const fetchTransactions = async () => {
    try {
      setIsLoading(true);
      const authToken = getStoredAuthToken();
      if (!authToken) {
        clearSessionAndRedirect('expired');
        return;
      }

      const offset = (page - 1) * limit;
      const params = new URLSearchParams();
      if (selectedService && selectedService !== 'ALL') params.set('serviceType', selectedService);
      if (selectedStatus && selectedStatus !== 'ALL') params.set('status', selectedStatus);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      params.set('limit', limit.toString());
      params.set('offset', offset.toString());

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
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [selectedService, selectedStatus, page]);

  // Handle Search Debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchTransactions();
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const copyToClipboard = (text: string) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedRef(text);
      setTimeout(() => setCopiedRef(null), 2000);
    }
  };

  const [isExporting, setIsExporting] = useState<boolean>(false);

  const handleExportCSV = async () => {
    try {
      setIsExporting(true);
      const authToken = getStoredAuthToken();
      if (!authToken) return;

      const params = new URLSearchParams();
      if (selectedService && selectedService !== 'ALL') params.set('serviceType', selectedService);
      if (selectedStatus && selectedStatus !== 'ALL') params.set('status', selectedStatus);
      if (searchQuery.trim()) params.set('search', searchQuery.trim());
      params.set('limit', '1000');
      params.set('offset', '0');

      const res = await fetch(`/api/transactions?${params.toString()}`, {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json().catch(() => null);

      const exportList: UnifiedTransaction[] =
        res.ok && data?.success && Array.isArray(data.data?.transactions)
          ? data.data.transactions
          : transactions;

      if (exportList.length === 0) {
        alert('No transactions to export.');
        return;
      }

      const headers = [
        'Reference',
        'Date & Time',
        'Service',
        'Recipient',
        'Channel',
        'Amount (NGN)',
        'Amount Paid (NGN)',
        'Status',
        'Provider Reference',
      ];

      const csvRows = [
        headers.join(','),
        ...exportList.map((t) => [
          `"${t.reference || ''}"`,
          `"${new Date(t.createdAt).toLocaleString('en-NG').replace(/"/g, '""')}"`,
          `"${t.serviceType || ''}"`,
          `"${t.recipient || ''}"`,
          `"${t.channel || (t.id.startsWith('key_') ? 'API' : 'WEB')}"`,
          (t.amountNaira || 0).toFixed(2),
          (t.totalAmountNaira || t.amountNaira || 0).toFixed(2),
          `"${t.status || ''}"`,
          `"${t.providerReference || ''}"`,
        ].join(',')),
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
    } catch {
      alert('Failed to export transactions.');
    } finally {
      setIsExporting(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / limit));

  const activeServiceObj = SERVICE_OPTIONS.find((s) => s.value === selectedService) || SERVICE_OPTIONS[0];
  const activeStatusObj = STATUS_OPTIONS.find((s) => s.value === selectedStatus) || STATUS_OPTIONS[0];

  const getServiceBadge = (type: string, metadata?: Record<string, any>) => {
    switch (type) {
      case 'CABLE_TV':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
            <Tv className="w-3 h-3" />
            <span>{metadata?.operator || metadata?.operatorName || 'Cable TV'}</span>
          </span>
        );
      case 'EXAM_PIN':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <GraduationCap className="w-3 h-3" />
            <span>{metadata?.examBody || 'Exam PIN'}</span>
          </span>
        );
      case 'ELECTRICITY':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Zap className="w-3 h-3" />
            <span>{metadata?.disco || 'Electricity'}</span>
          </span>
        );
      case 'AIRTIME':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
            <Phone className="w-3 h-3" />
            <span>Airtime</span>
          </span>
        );
      case 'DATA':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
            <Wifi className="w-3 h-3" />
            <span>Data</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            <Layers className="w-3 h-3" />
            <span>{type}</span>
          </span>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SUCCESSFUL':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" />
            <span>Successful</span>
          </span>
        );
      case 'PROCESSING':
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            <Clock className="w-3 h-3 animate-spin" />
            <span>{status === 'PROCESSING' ? 'Processing' : 'Pending'}</span>
          </span>
        );
      case 'FAILED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            <XCircle className="w-3 h-3" />
            <span>Failed</span>
          </span>
        );
      case 'REVERSED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
            <RefreshCw className="w-3 h-3" />
            <span>Reversed</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#070D18]">
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
          kycStatus={kycStatus}
          isRefreshing={isRefreshing}
          onRefresh={() => {
            setIsRefreshing(true);
            fetchTransactions();
          }}
          sticky={false}
        />

        <main className="flex-1 p-3 sm:p-5 lg:p-7 max-w-7xl mx-auto w-full space-y-5">
          <KycBanner kycStatus={kycStatus} onOpenKycModal={() => setIsKycModalOpen(true)} />

          {/* Top Navigation & Action Controls */}
          <div className="flex items-center justify-between gap-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1528] text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors shadow-xs w-fit"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-slate-400" />
              <span>Back to Dashboard</span>
            </Link>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportCSV}
                disabled={isExporting}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1528] text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors shadow-xs cursor-pointer disabled:opacity-60"
                title="Export transactions as CSV / Excel spreadsheet"
              >
                <Download className={`w-3.5 h-3.5 text-emerald-500 ${isExporting ? 'animate-bounce' : ''}`} />
                <span>{isExporting ? 'Exporting...' : 'Export Excel / CSV'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsRefreshing(true);
                  fetchTransactions();
                }}
                disabled={isRefreshing}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1528] text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors shadow-xs cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          {/* Header Title Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-[#0B1528] p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-500/10 text-blue-500 dark:bg-blue-500/15 dark:text-blue-400 border border-blue-500/20">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                  Transaction History
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Real-time records of all airtime, data, electricity, cable TV, and exam PIN vending transactions
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">Total Recorded:</span>
              <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-blue-500/10 text-[#126BEB] dark:text-blue-400 border border-blue-500/20">
                {totalCount.toLocaleString()} {totalCount === 1 ? 'Transaction' : 'Transactions'}
              </span>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 bg-white dark:bg-[#0B1528] p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
            {/* Search Input */}
            <div className="sm:col-span-6 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search reference, recipient, smartcard..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-3 text-xs rounded-lg bg-slate-50 dark:bg-[#070D18] border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#126BEB]"
              />
            </div>

            {/* Custom Service Selector Dropdown */}
            <div className="sm:col-span-3 relative">
              <button
                type="button"
                onClick={() => {
                  setIsServiceDropdownOpen(!isServiceDropdownOpen);
                  setIsStatusDropdownOpen(false);
                }}
                className="w-full h-9 px-3 rounded-lg bg-slate-50 dark:bg-[#070D18] border border-slate-200 dark:border-slate-700/80 text-xs text-slate-900 dark:text-white flex items-center justify-between font-semibold cursor-pointer hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
              >
                <div className="flex items-center gap-2 truncate">
                  <activeServiceObj.icon className={`w-3.5 h-3.5 shrink-0 ${activeServiceObj.color}`} />
                  <span className="truncate">{activeServiceObj.label}</span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </button>

              {isServiceDropdownOpen && (
                <div className="absolute z-30 left-0 right-0 top-10 mt-1 bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-700/80 rounded-xl shadow-xl overflow-hidden py-1 max-h-60 overflow-y-auto">
                  {SERVICE_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const isSelected = selectedService === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setSelectedService(opt.value);
                          setIsServiceDropdownOpen(false);
                          setPage(1);
                        }}
                        className={`w-full px-3 py-2 text-xs flex items-center justify-between text-left transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50 dark:bg-[#126BEB]/15 text-[#126BEB] dark:text-blue-400 font-bold'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Icon className={`w-3.5 h-3.5 shrink-0 ${opt.color}`} />
                          <span className="truncate">{opt.label}</span>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#126BEB]" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Custom Status Selector Dropdown */}
            <div className="sm:col-span-3 relative">
              <button
                type="button"
                onClick={() => {
                  setIsStatusDropdownOpen(!isStatusDropdownOpen);
                  setIsServiceDropdownOpen(false);
                }}
                className="w-full h-9 px-3 rounded-lg bg-slate-50 dark:bg-[#070D18] border border-slate-200 dark:border-slate-700/80 text-xs text-slate-900 dark:text-white flex items-center justify-between font-semibold cursor-pointer hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${activeStatusObj.dotColor}`} />
                  <span>{activeStatusObj.label}</span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              </button>

              {isStatusDropdownOpen && (
                <div className="absolute z-30 left-0 right-0 top-10 mt-1 bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-700/80 rounded-xl shadow-xl overflow-hidden py-1">
                  {STATUS_OPTIONS.map((opt) => {
                    const isSelected = selectedStatus === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setSelectedStatus(opt.value);
                          setIsStatusDropdownOpen(false);
                          setPage(1);
                        }}
                        className={`w-full px-3 py-2 text-xs flex items-center justify-between text-left transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-blue-50 dark:bg-[#126BEB]/15 text-[#126BEB] dark:text-blue-400 font-bold'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${opt.dotColor}`} />
                          <span>{opt.label}</span>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-[#126BEB]" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Unified Transactions Data Table */}
          <div className="bg-white dark:bg-[#0B1528] rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-[#070D18]/80 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Service</th>
                    <th className="py-3 px-4">Recipient</th>
                    <th className="py-3 px-4">Reference</th>
                    <th className="py-3 px-4">Channel</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Amount Paid</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Date &amp; Time</th>
                    <th className="py-3 px-4 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="animate-pulse">
                        <td className="py-4 px-4"><div className="w-24 h-4 bg-slate-200 dark:bg-slate-800 rounded" /></td>
                        <td className="py-4 px-4"><div className="w-32 h-4 bg-slate-200 dark:bg-slate-800 rounded" /></td>
                        <td className="py-4 px-4"><div className="w-28 h-4 bg-slate-200 dark:bg-slate-800 rounded" /></td>
                        <td className="py-4 px-4"><div className="w-14 h-4 bg-slate-200 dark:bg-slate-800 rounded" /></td>
                        <td className="py-4 px-4"><div className="w-20 h-4 bg-slate-200 dark:bg-slate-800 rounded" /></td>
                        <td className="py-4 px-4"><div className="w-20 h-4 bg-slate-200 dark:bg-slate-800 rounded" /></td>
                        <td className="py-4 px-4"><div className="w-20 h-4 bg-slate-200 dark:bg-slate-800 rounded-full" /></td>
                        <td className="py-4 px-4"><div className="w-28 h-4 bg-slate-200 dark:bg-slate-800 rounded" /></td>
                        <td className="py-4 px-4 text-right"><div className="w-12 h-4 bg-slate-200 dark:bg-slate-800 rounded ml-auto" /></td>
                      </tr>
                    ))
                  ) : transactions.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 text-center">
                        <div className="max-w-xs mx-auto space-y-2">
                          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800/60 text-slate-400 flex items-center justify-center mx-auto">
                            <FileText className="w-6 h-6" />
                          </div>
                          <p className="font-bold text-sm text-slate-800 dark:text-slate-200">
                            No transactions found
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {searchQuery || selectedService !== 'ALL' || selectedStatus !== 'ALL'
                              ? 'Try adjusting your search criteria or filters.'
                              : 'Vended transactions and bill payments will appear here in real time.'}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    transactions.map((tx) => (
                      <tr
                        key={tx.id}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                      >
                        {/* Service Type */}
                        <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-white">
                          {getServiceBadge(tx.serviceType, tx.metadata)}
                        </td>

                        {/* Recipient / Customer */}
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900 dark:text-white truncate max-w-[180px]">
                            {tx.recipient}
                          </div>
                          {tx.metadata?.customerName && (
                            <div className="text-[11px] text-slate-400 truncate max-w-[180px]">
                              {tx.metadata.customerName}
                            </div>
                          )}
                          {tx.metadata?.bouquetName && (
                            <div className="text-[11px] text-slate-400 truncate max-w-[180px]">
                              {tx.metadata.bouquetName}
                            </div>
                          )}
                        </td>

                        {/* Reference */}
                        <td className="py-3.5 px-4">
                          <button
                            type="button"
                            onClick={() => copyToClipboard(tx.reference)}
                            className="inline-flex items-center gap-1 font-mono text-[11px] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer group"
                            title="Click to copy reference"
                          >
                            <span>{tx.reference.length > 18 ? `${tx.reference.substring(0, 18)}...` : tx.reference}</span>
                            {copiedRef === tx.reference ? (
                              <Check className="w-3 h-3 text-emerald-500" />
                            ) : (
                              <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 text-slate-400 transition-opacity" />
                            )}
                          </button>
                        </td>

                        {/* Channel (WEB vs API) */}
                        <td className="py-3.5 px-4">
                          {tx.channel === 'API' || tx.id.startsWith('key_') ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60">
                              API
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60">
                              WEB
                            </span>
                          )}
                        </td>

                        {/* Amount (Face Value) */}
                        <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                          ₦{(tx.amountNaira || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                        </td>

                        {/* Amount Paid */}
                        <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white whitespace-nowrap">
                          ₦{(tx.totalAmountNaira || tx.amountNaira || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4">
                          {getStatusBadge(tx.status)}
                        </td>

                        {/* Date */}
                        <td className="py-3.5 px-4 text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          {new Date(tx.createdAt).toLocaleDateString('en-NG', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>

                        {/* Action Details */}
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedTransaction(tx)}
                            className="px-2.5 py-1 rounded-md text-[11px] font-bold text-[#126BEB] dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-500/15 transition-colors cursor-pointer"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#070D18]/50 text-xs">
              <span className="text-slate-500 dark:text-slate-400">
                Showing{' '}
                <span className="font-bold text-slate-900 dark:text-white">
                  {transactions.length === 0 ? 0 : (page - 1) * limit + 1}
                </span>{' '}
                to{' '}
                <span className="font-bold text-slate-900 dark:text-white">
                  {Math.min(page * limit, totalCount)}
                </span>{' '}
                of <span className="font-bold text-slate-900 dark:text-white">{totalCount}</span> entries
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || isLoading}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <span className="px-3 py-1 font-bold text-slate-900 dark:text-white text-xs">
                  Page {page} of {totalPages}
                </span>

                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages || isLoading}
                  className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-slate-600 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Transaction Details Modal */}
      {selectedTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-lg bg-white dark:bg-[#0B1528] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-500/10 text-blue-500 dark:bg-blue-500/15 dark:text-blue-400">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                    Transaction Audit Details
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Ref: {selectedTransaction.reference}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTransaction(null)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Status Header Tile */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#070D18] border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Status</span>
                    <div className="mt-0.5">{getStatusBadge(selectedTransaction.status)}</div>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Channel</span>
                    <div className="mt-0.5">
                      {selectedTransaction.channel === 'API' || selectedTransaction.id.startsWith('key_') ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200 dark:border-purple-800/60">
                          API
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60">
                          WEB
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Amount Paid</span>
                  <div className="font-black text-base text-slate-900 dark:text-white">
                    ₦{(selectedTransaction.totalAmountNaira || selectedTransaction.amountNaira || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    Face Value: ₦{(selectedTransaction.amountNaira || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

              {/* Data Grid */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#070D18] border border-slate-200/60 dark:border-slate-800/60">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Service</span>
                  <div className="mt-1 font-bold text-slate-900 dark:text-white">
                    {selectedTransaction.serviceType}
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#070D18] border border-slate-200/60 dark:border-slate-800/60">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Recipient</span>
                  <div className="mt-1 font-bold text-slate-900 dark:text-white truncate">
                    {selectedTransaction.recipient}
                  </div>
                </div>

                {selectedTransaction.metadata?.customerName && (
                  <div className="col-span-2 p-2.5 rounded-lg bg-slate-50 dark:bg-[#070D18] border border-slate-200/60 dark:border-slate-800/60">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Customer Name</span>
                    <div className="mt-1 font-bold text-slate-900 dark:text-white">
                      {selectedTransaction.metadata.customerName}
                    </div>
                  </div>
                )}

                {selectedTransaction.metadata?.bouquetName && (
                  <div className="col-span-2 p-2.5 rounded-lg bg-slate-50 dark:bg-[#070D18] border border-slate-200/60 dark:border-slate-800/60">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Package / Bouquet</span>
                    <div className="mt-1 font-bold text-slate-900 dark:text-white">
                      {selectedTransaction.metadata.bouquetName}
                    </div>
                  </div>
                )}

                {selectedTransaction.metadata?.token && (
                  <div className="col-span-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Electricity Token</span>
                    <div className="mt-1 font-mono font-black text-sm text-amber-700 dark:text-amber-300 tracking-wider">
                      {selectedTransaction.metadata.token}
                    </div>
                  </div>
                )}

                {selectedTransaction.metadata?.pins && Array.isArray(selectedTransaction.metadata.pins) && (
                  <div className="col-span-2 p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 space-y-1">
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Exam PINs</span>
                    {selectedTransaction.metadata.pins.map((p: any, idx: number) => (
                      <div key={idx} className="font-mono text-xs font-bold text-emerald-700 dark:text-emerald-300">
                        PIN: {p.pin} {p.serialNumber && `(S/N: ${p.serialNumber})`}
                      </div>
                    ))}
                  </div>
                )}

                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#070D18] border border-slate-200/60 dark:border-slate-800/60">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date & Time</span>
                  <div className="mt-1 font-semibold text-slate-700 dark:text-slate-300 text-[11px]">
                    {new Date(selectedTransaction.createdAt).toLocaleString('en-NG')}
                  </div>
                </div>

                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#070D18] border border-slate-200/60 dark:border-slate-800/60">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Client Reference</span>
                  <div className="mt-1 font-mono text-[11px] text-slate-600 dark:text-slate-400 truncate">
                    {selectedTransaction.clientReference || 'N/A'}
                  </div>
                </div>
              </div>

              {selectedTransaction.errorMessage && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400">
                  <span className="font-bold">Error Reason:</span> {selectedTransaction.errorMessage}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-[#070D18]/50 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedTransaction(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer"
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
        <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] dark:bg-[#070D18]">
          <div className="w-8 h-8 border-3 border-blue-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LedgerContent />
    </Suspense>
  );
}
