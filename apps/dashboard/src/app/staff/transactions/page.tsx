'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Search,
  RefreshCw,
  X,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  Receipt,
} from 'lucide-react';
import BaxatoLoader from '@/components/BaxatoLoader';
import ModalDialog from '@/components/ModalDialog';
import StaffReceiptModal from '@/components/admin/StaffReceiptModal';
import StaffFilterSelect, { type SelectOption } from '@/components/admin/StaffFilterSelect';
import {
  clearSessionAndRedirect,
  getStoredAuthToken,
  handleAuthResponse,
  isTokenExpired,
} from '@/lib/auth-session';

const SERVICE_OPTIONS: SelectOption[] = [
  { value: 'ALL', label: 'All Services' },
  { value: 'AIRTIME', label: 'Airtime' },
  { value: 'DATA', label: 'Data' },
  { value: 'ELECTRICITY', label: 'Electricity' },
  { value: 'CABLE_TV', label: 'Cable TV' },
  { value: 'EXAM_PIN', label: 'Exam PINs' },
];

const STATUS_OPTIONS: SelectOption[] = [
  { value: 'ALL', label: 'All Statuses', dotColor: 'bg-slate-400' },
  { value: 'SUCCESSFUL', label: 'Successful', dotColor: 'bg-emerald-500' },
  { value: 'PENDING', label: 'Pending', dotColor: 'bg-amber-500' },
  { value: 'PROCESSING', label: 'Processing', dotColor: 'bg-amber-500' },
  { value: 'FAILED', label: 'Failed', dotColor: 'bg-rose-500' },
];

const SERVICE_DISPLAY: Record<string, string> = {
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

export default function StaffTransactionsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [txSearch, setTxSearch] = useState<string>('');
  const [txServiceFilter, setTxServiceFilter] = useState<string>('ALL');
  const [txStatusFilter, setTxStatusFilter] = useState<string>('ALL');
  const [businessIdFilter, setBusinessIdFilter] = useState<string>('');
  const [txPage, setTxPage] = useState<number>(1);
  const [txPagination, setTxPagination] = useState<any>(null);
  const [isLoadingTx, setIsLoadingTx] = useState<boolean>(true);
  const [hasInitializedParams, setHasInitializedParams] = useState<boolean>(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedTx, setSelectedTx] = useState<any | null>(null);
  const [isRequerying, setIsRequerying] = useState<boolean>(false);
  const [requeryResult, setRequeryResult] = useState<{
    type: 'success' | 'warning' | 'error';
    message: string;
    detail?: string;
  } | null>(null);

  const requeryResultRef = useRef<HTMLDivElement>(null);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedReceiptTx, setSelectedReceiptTx] = useState<any | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState<boolean>(false);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const search = params.get('search');
        const status = params.get('status');
        const serviceType = params.get('serviceType');
        const businessId = params.get('businessId');

        if (search) setTxSearch(search);
        if (status) setTxStatusFilter(status);
        if (serviceType) setTxServiceFilter(serviceType);
        if (businessId) setBusinessIdFilter(businessId);
      }
    } catch {}
    setHasInitializedParams(true);
  }, []);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const loadTransactions = useCallback(
    async (overrideSearch?: string) => {
      try {
        setIsLoadingTx(true);
        setLoadError(null);
        const token = getStoredAuthToken();
        if (!token || isTokenExpired(token)) {
          clearSessionAndRedirect('expired');
          return;
        }

        const effectiveSearch = overrideSearch !== undefined ? overrideSearch : txSearch;
        const params = new URLSearchParams({
          page: txPage.toString(),
          limit: '20',
        });
        if (effectiveSearch.trim()) params.append('search', effectiveSearch.trim());
        if (txServiceFilter !== 'ALL') params.append('serviceType', txServiceFilter);
        if (txStatusFilter !== 'ALL') params.append('status', txStatusFilter);
        if (businessIdFilter) params.append('businessId', businessIdFilter);

        const res = await fetch(`/api/admin/transactions?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json().catch(() => null);

        if (handleAuthResponse(res, data)) {
          return;
        }

        if (res.ok && data?.success) {
          setTransactions(data.data || []);
          setTxPagination(data.pagination || null);
        } else {
          setLoadError(data?.error?.message || 'Unable to load transactions.');
        }
      } catch {
        setLoadError('Network error loading transactions.');
      } finally {
        setIsLoadingTx(false);
      }
    },
    [txPage, txSearch, txServiceFilter, txStatusFilter, businessIdFilter],
  );

  useEffect(() => {
    if (!hasInitializedParams) return;
    void loadTransactions();
  }, [hasInitializedParams, txPage, txServiceFilter, txStatusFilter, businessIdFilter]);

  useEffect(() => {
    const handleRefreshEvent = () => {
      void loadTransactions();
    };
    window.addEventListener('bx_staff_refresh', handleRefreshEvent);
    return () => window.removeEventListener('bx_staff_refresh', handleRefreshEvent);
  }, [loadTransactions]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (txPage !== 1) {
      setTxPage(1);
    } else {
      void loadTransactions();
    }
  };

  const handleClearFilters = () => {
    setTxSearch('');
    setTxServiceFilter('ALL');
    setTxStatusFilter('ALL');
    setBusinessIdFilter('');
    setTxPage(1);
    if (typeof window !== 'undefined' && window.location.search) {
      window.history.replaceState({}, '', '/staff/transactions');
    }
    void loadTransactions('');
  };

  const handleOpenInspect = (tx: any) => {
    setSelectedTx(tx);
    setRequeryResult(null);
  };

  const scrollResultIntoView = () => {
    setTimeout(() => {
      requeryResultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 40);
  };

  const handleRequery = async (txId: string) => {
    try {
      setIsRequerying(true);
      setRequeryResult(null);
      const token = getStoredAuthToken();
      if (!token) {
        clearSessionAndRedirect('expired');
        return;
      }

      const res = await fetch(`/api/admin/transactions/${txId}/requery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json().catch(() => null);
      if (handleAuthResponse(res, data)) {
        return;
      }

      if (res.ok && data?.success) {
        const currentStatus = data.data?.currentStatus;
        const syncMsg =
          data.data?.syncMessage ||
          data.data?.message ||
          `Gateway returned status: ${currentStatus}`;
        const detailLine = [
          data.data?.providerResponseCode ? `Code: ${data.data.providerResponseCode}` : '',
          data.data?.providerMessage || '',
        ]
          .filter(Boolean)
          .join(' — ');

        const feedbackType =
          currentStatus === 'SUCCESSFUL'
            ? 'success'
            : currentStatus === 'FAILED'
              ? 'error'
              : 'warning';

        setRequeryResult({
          type: feedbackType,
          message: syncMsg,
          detail: detailLine || undefined,
        });

        setSelectedTx((prev: any) =>
          prev
            ? {
                ...prev,
                status: currentStatus || prev.status,
                providerReference: data.data?.providerReference || prev.providerReference,
                errorMessage:
                  currentStatus === 'FAILED'
                    ? data.data?.providerMessage || prev.errorMessage
                    : prev.errorMessage,
              }
            : null,
        );

        void loadTransactions();
      } else {
        const errMsg =
          data?.error?.message ||
          data?.message ||
          `Re-query failed (HTTP ${res.status}).`;
        setRequeryResult({
          type: 'error',
          message: errMsg,
        });
      }
      scrollResultIntoView();
    } catch {
      setRequeryResult({
        type: 'error',
        message: 'Network error communicating with upstream gateway.',
      });
      scrollResultIntoView();
    } finally {
      setIsRequerying(false);
    }
  };

  const hasActiveFilters =
    Boolean(txSearch.trim()) ||
    txServiceFilter !== 'ALL' ||
    txStatusFilter !== 'ALL' ||
    Boolean(businessIdFilter);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight [text-wrap:balance]">
          Transactions
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Search references, inspect receipts, and verify status directly with upstream providers.
        </p>
      </div>

      {/* Compact Filter Bar */}
      <search>
        <form
          onSubmit={handleSearchSubmit}
          className="grid grid-cols-2 sm:grid-cols-12 gap-2.5"
        >
          <div className="col-span-2 sm:col-span-5 relative">
            <Search
              className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              aria-hidden="true"
            />
            <input
              type="search"
              aria-label="Search transactions"
              placeholder="Reference, phone, meter, or smartcard..."
              value={txSearch}
              onChange={(e) => setTxSearch(e.target.value)}
              className="w-full h-11 sm:h-10 pl-10 pr-3.5 text-sm sm:text-xs rounded-lg bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#126BEB] dark:focus:border-[#38BDF8] focus:ring-2 focus:ring-[#126BEB]/15"
            />
          </div>

          <StaffFilterSelect
            className="col-span-1 sm:col-span-3"
            ariaLabel="Filter by service"
            options={SERVICE_OPTIONS}
            value={txServiceFilter}
            onChange={(val) => {
              setTxServiceFilter(val);
              setTxPage(1);
            }}
          />

          <StaffFilterSelect
            className="col-span-1 sm:col-span-2"
            ariaLabel="Filter by status"
            options={STATUS_OPTIONS}
            value={txStatusFilter}
            onChange={(val) => {
              setTxStatusFilter(val);
              setTxPage(1);
            }}
          />

          <div className="col-span-2 sm:col-span-2 flex gap-2">
            <button
              type="submit"
              className="flex-1 h-11 sm:h-10 px-4 rounded-lg text-xs font-semibold bg-[#126BEB] hover:bg-[#0E59C9] text-white transition-colors"
            >
              Search
            </button>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="h-11 sm:h-10 px-3 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shrink-0"
              >
                Reset
              </button>
            )}
          </div>
        </form>
      </search>

      {businessIdFilter && (
        <div className="flex items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-medium">
            <span>Filtered to selected business</span>
            <button
              type="button"
              onClick={() => {
                setBusinessIdFilter('');
                setTxPage(1);
              }}
              aria-label="Clear business filter"
              className="hover:text-slate-900 dark:hover:text-white"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </span>
        </div>
      )}

      {loadError && (
        <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-700 dark:text-rose-300 flex items-center justify-between gap-2">
          <span>{loadError}</span>
          <button
            type="button"
            onClick={() => void loadTransactions()}
            className="min-h-9 px-2.5 rounded-md font-semibold hover:bg-rose-100 dark:hover:bg-rose-900/40"
          >
            Retry
          </button>
        </div>
      )}

      {isLoadingTx && transactions.length === 0 ? (
        <div className="rounded-xl bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800">
          <BaxatoLoader variant="inline" />
        </div>
      ) : transactions.length === 0 ? (
        <div className="rounded-xl bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800 p-10 text-center space-y-1.5">
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            No transactions found
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Try adjusting your search reference or filter selections.
          </p>
        </div>
      ) : (
        <>
          {/* Mobile Stacked Cards */}
          <div className="md:hidden space-y-3">
            {transactions.map((tx) => {
              const refCode =
                tx.providerReference || tx.requestReference || tx.clientReference || tx.id;
              return (
                <article
                  key={tx.id}
                  className="p-4 rounded-xl bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-slate-900 dark:text-white">
                          {SERVICE_DISPLAY[tx.serviceType] || tx.serviceType}
                        </span>
                        {renderStatusPill(tx.status)}
                      </div>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                        {tx.recipient}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-semibold tabular-nums text-slate-900 dark:text-white">
                        {tx.formattedAmount}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {tx.providerName}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100 dark:border-slate-800/80">
                    <div className="min-w-0">
                      <span className="text-slate-500 dark:text-slate-400 block">Merchant</span>
                      <span className="font-medium text-slate-900 dark:text-white truncate block">
                        {tx.businessName || 'Business'}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-500 dark:text-slate-400 block">Date</span>
                      <span className="text-slate-700 dark:text-slate-300">
                        {new Date(tx.createdAt).toLocaleDateString('en-NG', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <div className="col-span-2 min-w-0">
                      <span className="text-slate-500 dark:text-slate-400 block">Reference</span>
                      <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300 truncate block">
                        {refCode}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedReceiptTx(tx);
                        setIsReceiptOpen(true);
                      }}
                      className="h-11 rounded-lg text-xs font-medium bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Receipt className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Receipt</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenInspect(tx)}
                      className="h-11 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                      Inspect
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block rounded-xl bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div
              tabIndex={0}
              role="region"
              aria-label="Platform transactions table"
              className="overflow-auto max-h-[68dvh] focus:outline-none"
            >
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-medium">
                  <tr>
                    <th className="py-3 px-4">Service</th>
                    <th className="py-3 px-4">Recipient</th>
                    <th className="py-3 px-4">Merchant</th>
                    <th className="py-3 px-4">Reference</th>
                    <th className="py-3 px-4">Provider</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                  {transactions.map((tx) => {
                    const refText =
                      tx.providerReference || tx.requestReference || tx.clientReference || tx.id;
                    return (
                      <tr
                        key={tx.id}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition-colors"
                      >
                        <td className="py-3 px-4 font-medium text-slate-900 dark:text-white whitespace-nowrap">
                          {SERVICE_DISPLAY[tx.serviceType] || tx.serviceType}
                        </td>
                        <td className="py-3 px-4 text-slate-800 dark:text-slate-200">
                          {tx.recipient}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-900 dark:text-white truncate max-w-[150px]">
                            {tx.businessName || 'Business'}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <button
                            type="button"
                            onClick={() => copyToClipboard(refText, `row-${tx.id}`)}
                            title="Copy reference"
                            className="inline-flex items-center gap-1.5 font-mono text-[11px] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                          >
                            <span className="truncate max-w-[140px]">{refText}</span>
                            {copiedId === `row-${tx.id}` ? (
                              <Check className="w-3 h-3 text-emerald-500 shrink-0" aria-hidden="true" />
                            ) : (
                              <Copy className="w-3 h-3 opacity-60 shrink-0" aria-hidden="true" />
                            )}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300 font-medium">
                          {tx.providerName}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white tabular-nums">
                          {tx.formattedAmount}
                        </td>
                        <td className="py-3 px-4">{renderStatusPill(tx.status)}</td>
                        <td className="py-3 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          {new Date(tx.createdAt).toLocaleDateString('en-NG', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedReceiptTx(tx);
                                setIsReceiptOpen(true);
                              }}
                              className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 transition-colors"
                            >
                              Receipt
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenInspect(tx)}
                              className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-medium text-slate-900 dark:text-white transition-colors"
                            >
                              Inspect
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {txPagination && txPagination.totalPages > 1 && (
              <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-slate-200 dark:border-slate-800 text-xs">
                <span className="text-slate-500 dark:text-slate-400">
                  Page <span className="font-medium text-slate-900 dark:text-white">{txPagination.page}</span> of{' '}
                  <span className="font-medium text-slate-900 dark:text-white">{txPagination.totalPages}</span> ({txPagination.totalCount} total)
                </span>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={!txPagination.hasPrevPage}
                    onClick={() => setTxPage((p) => Math.max(1, p - 1))}
                    className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    disabled={!txPagination.hasNextPage}
                    onClick={() => setTxPage((p) => p + 1)}
                    className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Mobile Pagination */}
          {txPagination && txPagination.totalPages > 1 && (
            <div className="md:hidden flex items-center justify-between gap-3 pt-1 text-xs">
              <span className="text-slate-500 dark:text-slate-400">
                Page {txPagination.page} of {txPagination.totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={!txPagination.hasPrevPage}
                  onClick={() => setTxPage((p) => Math.max(1, p - 1))}
                  className="h-11 px-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1528] disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={!txPagination.hasNextPage}
                  onClick={() => setTxPage((p) => p + 1)}
                  className="h-11 px-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1528] disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* TRANSACTION INSPECTOR DIALOG */}
      <ModalDialog
        isOpen={Boolean(selectedTx)}
        onClose={() => setSelectedTx(null)}
        ariaLabelledBy="tx-inspector-title"
        maxWidthClass="max-w-lg"
        className="bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
      >
        {selectedTx && (
          <div className="flex flex-col max-h-[85dvh]">
            <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-200 dark:border-slate-800">
              <div>
                <h2
                  id="tx-inspector-title"
                  className="text-base font-semibold text-slate-900 dark:text-white"
                >
                  Transaction Details
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Review references and verify upstream status.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTx(null)}
                aria-label="Close transaction details"
                className="min-h-10 min-w-10 -mr-2 -mt-1 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto">
              <dl className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                <div className="py-2.5 flex justify-between items-center gap-3">
                  <dt className="text-slate-500 dark:text-slate-400">Service</dt>
                  <dd className="font-medium text-slate-900 dark:text-white">
                    {SERVICE_DISPLAY[selectedTx.serviceType] || selectedTx.serviceType}
                  </dd>
                </div>

                <div className="py-2.5 flex justify-between items-center gap-3">
                  <dt className="text-slate-500 dark:text-slate-400">Amount</dt>
                  <dd className="font-semibold text-slate-900 dark:text-white tabular-nums text-sm">
                    {selectedTx.formattedAmount}
                  </dd>
                </div>

                <div className="py-2.5 flex justify-between items-center gap-3">
                  <dt className="text-slate-500 dark:text-slate-400">Recipient</dt>
                  <dd className="font-medium text-slate-900 dark:text-white">
                    {selectedTx.recipient}
                  </dd>
                </div>

                <div className="py-2.5 flex justify-between items-center gap-3">
                  <dt className="text-slate-500 dark:text-slate-400">Merchant</dt>
                  <dd className="font-medium text-slate-900 dark:text-white text-right truncate max-w-[240px]">
                    {selectedTx.businessName || 'Business'}
                  </dd>
                </div>

                <div className="py-2.5 flex justify-between items-center gap-3">
                  <dt className="text-slate-500 dark:text-slate-400">Status</dt>
                  <dd>{renderStatusPill(selectedTx.status)}</dd>
                </div>

                <div className="py-2.5 flex justify-between items-center gap-3">
                  <dt className="text-slate-500 dark:text-slate-400">Provider</dt>
                  <dd className="font-medium text-slate-900 dark:text-white">
                    {selectedTx.providerName}
                  </dd>
                </div>

                <div className="py-2.5 flex justify-between items-center gap-3">
                  <dt className="text-slate-500 dark:text-slate-400 shrink-0">Provider Ref</dt>
                  <dd className="flex items-center gap-1.5 font-mono text-[11px] text-slate-700 dark:text-slate-300 min-w-0">
                    <span className="truncate">{selectedTx.providerReference || 'N/A'}</span>
                    {selectedTx.providerReference && (
                      <button
                        type="button"
                        onClick={() => copyToClipboard(selectedTx.providerReference, 'pRef')}
                        aria-label="Copy provider reference"
                        className="min-h-8 min-w-8 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white shrink-0"
                      >
                        {copiedId === 'pRef' ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" aria-hidden="true" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                        )}
                      </button>
                    )}
                  </dd>
                </div>

                <div className="py-2.5 flex justify-between items-center gap-3">
                  <dt className="text-slate-500 dark:text-slate-400 shrink-0">Request Ref</dt>
                  <dd className="flex items-center gap-1.5 font-mono text-[11px] text-slate-700 dark:text-slate-300 min-w-0">
                    <span className="truncate">
                      {selectedTx.requestReference || selectedTx.clientReference || 'N/A'}
                    </span>
                    {(selectedTx.requestReference || selectedTx.clientReference) && (
                      <button
                        type="button"
                        onClick={() =>
                          copyToClipboard(
                            selectedTx.requestReference || selectedTx.clientReference,
                            'reqRef',
                          )
                        }
                        aria-label="Copy request reference"
                        className="min-h-8 min-w-8 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white shrink-0"
                      >
                        {copiedId === 'reqRef' ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" aria-hidden="true" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                        )}
                      </button>
                    )}
                  </dd>
                </div>

                <div className="py-2.5 flex justify-between items-center gap-3">
                  <dt className="text-slate-500 dark:text-slate-400 shrink-0">Internal ID</dt>
                  <dd className="flex items-center gap-1.5 font-mono text-[11px] text-slate-700 dark:text-slate-300 min-w-0">
                    <span className="truncate">{selectedTx.id}</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(selectedTx.id, 'txId')}
                      aria-label="Copy internal ID"
                      className="min-h-8 min-w-8 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white shrink-0"
                    >
                      {copiedId === 'txId' ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" aria-hidden="true" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                      )}
                    </button>
                  </dd>
                </div>

                {selectedTx.errorMessage && (
                  <div className="py-2.5 space-y-1">
                    <dt className="text-slate-500 dark:text-slate-400">Error Message</dt>
                    <dd className="text-rose-700 dark:text-rose-300 text-xs bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/60 p-2.5 rounded-lg break-words">
                      {selectedTx.errorMessage}
                    </dd>
                  </div>
                )}
              </dl>

              {/* Upstream Verification & Immediate Visible Output */}
              <div
                ref={requeryResultRef}
                className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#070D18] border border-slate-200 dark:border-slate-800 space-y-3 text-xs"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-900 dark:text-white">
                    Upstream Check ({selectedTx.providerName})
                  </span>
                </div>

                <div className="px-3 py-2 rounded-lg bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                  <span className="text-slate-500 shrink-0">Ref</span>
                  <span className="font-mono text-slate-900 dark:text-slate-100 text-[11px] truncate text-right">
                    {selectedTx.providerReference ||
                      selectedTx.requestReference ||
                      selectedTx.clientReference ||
                      selectedTx.id}
                  </span>
                </div>

                {requeryResult && (
                  <div
                    role="status"
                    aria-live="polite"
                    className={`p-3 rounded-lg border text-xs flex items-start gap-2 ${
                      requeryResult.type === 'success'
                        ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
                        : requeryResult.type === 'error'
                          ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-200'
                          : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200'
                    }`}
                  >
                    {requeryResult.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                    )}
                    <div className="space-y-1 min-w-0">
                      <p className="font-medium break-words">{requeryResult.message}</p>
                      {requeryResult.detail && (
                        <p className="text-[11px] opacity-85 break-words">{requeryResult.detail}</p>
                      )}
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  disabled={isRequerying}
                  onClick={() => void handleRequery(selectedTx.id)}
                  className="w-full h-11 px-4 rounded-lg text-xs font-semibold bg-[#126BEB] hover:bg-[#0E59C9] text-white transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${isRequerying ? 'animate-spin' : ''}`}
                    aria-hidden="true"
                  />
                  <span>{isRequerying ? 'Checking...' : 'Re-query Upstream Status'}</span>
                </button>
              </div>
            </div>

            <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#070D18]/60 flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedReceiptTx(selectedTx);
                  setIsReceiptOpen(true);
                }}
                className="flex-1 h-11 px-4 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center gap-1.5 transition-colors"
              >
                <Receipt className="w-4 h-4" aria-hidden="true" />
                <span>View Receipt</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedTx(null)}
                className="h-11 px-5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </ModalDialog>

      <StaffReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        tx={selectedReceiptTx}
      />
    </div>
  );
}
