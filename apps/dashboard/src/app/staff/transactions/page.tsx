'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Search,
  RefreshCw,
  X,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  SlidersHorizontal,
} from 'lucide-react';
import BaxatoLoader from '@/components/BaxatoLoader';
import ModalDialog from '@/components/ModalDialog';
import StaffReceiptModal from '@/components/admin/StaffReceiptModal';
import {
  clearSessionAndRedirect,
  getStoredAuthToken,
  handleAuthResponse,
  isTokenExpired,
} from '@/lib/auth-session';
import { showToast } from '@/lib/toast';

function formatStatusBadge(status: string) {
  if (status === 'SUCCESSFUL') {
    return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400';
  }
  if (status === 'FAILED') {
    return 'bg-rose-500/10 text-rose-700 dark:text-rose-400';
  }
  return 'bg-amber-500/10 text-amber-700 dark:text-amber-400';
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
  const [requeryFeedback, setRequeryFeedback] = useState<{
    type: 'success' | 'warning' | 'error';
    message: string;
  } | null>(null);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedReceiptTx, setSelectedReceiptTx] = useState<any | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState<boolean>(false);

  // Read URL filters cleanly on mount
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
    setRequeryFeedback(null);
  };

  const handleRequery = async (txId: string) => {
    try {
      setIsRequerying(true);
      setRequeryFeedback(null);
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
        const currentStatus = data.data.currentStatus;
        const syncMsg = data.data.syncMessage || `Status verified: ${currentStatus}`;
        const feedbackType =
          currentStatus === 'SUCCESSFUL'
            ? 'success'
            : currentStatus === 'FAILED'
              ? 'error'
              : 'warning';

        setRequeryFeedback({
          type: feedbackType,
          message: syncMsg,
        });

        showToast({
          type: feedbackType,
          title: 'Status Checked',
          message: syncMsg,
        });

        void loadTransactions();

        if (selectedTx && selectedTx.id === txId) {
          setSelectedTx((prev: any) =>
            prev
              ? {
                  ...prev,
                  status: currentStatus,
                  providerReference: data.data.providerReference || prev.providerReference,
                  errorMessage: data.data.errorMessage || prev.errorMessage,
                }
              : null,
          );
        }
      } else {
        const msg = data?.error?.message || 'Unable to verify status with upstream gateway.';
        setRequeryFeedback({ type: 'error', message: msg });
        showToast({ type: 'error', message: msg });
      }
    } catch {
      const msg = 'Network error verifying transaction status.';
      setRequeryFeedback({ type: 'error', message: msg });
      showToast({ type: 'error', message: msg });
    } finally {
      setIsRequerying(false);
    }
  };

  const hasActiveFilters =
    Boolean(txSearch.trim()) ||
    txServiceFilter !== 'ALL' ||
    txStatusFilter !== 'ALL' ||
    Boolean(businessIdFilter);

  const pageSuccessfulCount = transactions.filter((t) => t.status === 'SUCCESSFUL').length;
  const pagePendingCount = transactions.filter(
    (t) => t.status === 'PENDING' || t.status === 'PROCESSING',
  ).length;
  const pageFailedCount = transactions.filter((t) => t.status === 'FAILED').length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white [text-wrap:balance]">
            Transactions
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Inspect references, issue receipts, and re-verify upstream gateway status.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadTransactions()}
          disabled={isLoadingTx}
          className="self-start sm:self-auto h-11 sm:h-10 px-3.5 rounded-lg text-xs font-medium bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoadingTx ? 'animate-spin' : ''}`} aria-hidden="true" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Search & Filters */}
      <search>
        <form onSubmit={handleSearchSubmit} className="flex flex-col lg:flex-row gap-2.5 sm:gap-3">
          <div className="relative flex-1">
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
              className="w-full h-11 pl-10 pr-4 rounded-lg text-base sm:text-sm bg-white dark:bg-[#0B1528] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#126BEB] focus:ring-2 focus:ring-[#126BEB]/15 dark:focus:border-[#38BDF8] dark:focus:ring-[#38BDF8]/15"
            />
          </div>

          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
            <select
              aria-label="Filter by service"
              value={txServiceFilter}
              onChange={(e) => {
                setTxServiceFilter(e.target.value);
                setTxPage(1);
              }}
              className="h-11 px-3 rounded-lg text-base sm:text-sm bg-white dark:bg-[#0B1528] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-[#126BEB] dark:focus:border-[#38BDF8]"
            >
              <option value="ALL">All Services</option>
              <option value="AIRTIME">Airtime</option>
              <option value="DATA">Data</option>
              <option value="ELECTRICITY">Electricity</option>
              <option value="CABLE_TV">Cable TV</option>
              <option value="EXAM_PIN">Exam PINs</option>
            </select>

            <select
              aria-label="Filter by status"
              value={txStatusFilter}
              onChange={(e) => {
                setTxStatusFilter(e.target.value);
                setTxPage(1);
              }}
              className="h-11 px-3 rounded-lg text-base sm:text-sm bg-white dark:bg-[#0B1528] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-[#126BEB] dark:focus:border-[#38BDF8]"
            >
              <option value="ALL">All Statuses</option>
              <option value="SUCCESSFUL">Successful</option>
              <option value="PENDING">Pending</option>
              <option value="PROCESSING">Processing</option>
              <option value="FAILED">Failed</option>
            </select>

            <button
              type="submit"
              className="col-span-2 sm:col-span-1 h-11 px-4 rounded-lg text-xs font-semibold bg-[#126BEB] hover:bg-[#0E59C9] text-white transition-colors flex items-center justify-center gap-1.5"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Apply</span>
            </button>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="col-span-2 sm:col-span-1 h-11 px-3 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                Reset
              </button>
            )}
          </div>
        </form>
      </search>

      {/* Active Business Filter + Page Telemetry Summary */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
        <div className="flex flex-wrap items-center gap-2">
          <span>
            {txPagination
              ? `${txPagination.totalCount} total · Page ${txPagination.page} of ${txPagination.totalPages}`
              : `${transactions.length} transactions`}
          </span>
          {businessIdFilter && (
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/50 text-[#126BEB] dark:text-[#38BDF8] font-medium">
              <span>Business filter active</span>
              <button
                type="button"
                onClick={() => {
                  setBusinessIdFilter('');
                  setTxPage(1);
                }}
                aria-label="Clear business filter"
                className="hover:text-slate-900 dark:hover:text-white"
              >
                <X className="w-3 h-3" aria-hidden="true" />
              </button>
            </span>
          )}
        </div>

        {transactions.length > 0 && (
          <div className="flex items-center gap-3 text-[11px]">
            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
              {pageSuccessfulCount} ok
            </span>
            {pagePendingCount > 0 && (
              <span className="text-amber-600 dark:text-amber-400 font-medium">
                {pagePendingCount} pending
              </span>
            )}
            {pageFailedCount > 0 && (
              <span className="text-rose-600 dark:text-rose-400 font-medium">
                {pageFailedCount} failed
              </span>
            )}
          </div>
        )}
      </div>

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

      {/* Results Area */}
      {isLoadingTx && transactions.length === 0 ? (
        <div className="rounded-xl bg-white dark:bg-[#0B1528] border border-slate-200/80 dark:border-slate-800">
          <BaxatoLoader variant="inline" />
        </div>
      ) : transactions.length === 0 ? (
        <div className="rounded-xl bg-white dark:bg-[#0B1528] border border-slate-200/80 dark:border-slate-800 p-10 text-center space-y-2">
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
            No matching transactions found
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Try adjusting your search reference or clearing active filters.
          </p>
        </div>
      ) : (
        <>
          {/* Mobile Stacked Cards */}
          <div className="md:hidden space-y-3">
            {transactions.map((tx) => {
              const refCode = tx.providerReference || tx.requestReference || tx.clientReference || tx.id;
              return (
                <article
                  key={tx.id}
                  className="p-4 rounded-xl bg-white dark:bg-[#0B1528] border border-slate-200/80 dark:border-slate-800 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-slate-900 dark:text-white">
                          {tx.serviceType?.replace(/_/g, ' ')}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${formatStatusBadge(
                            tx.status,
                          )}`}
                        >
                          {tx.status}
                        </span>
                      </div>
                      <p className="text-sm font-mono font-semibold text-slate-800 dark:text-slate-200">
                        {tx.recipient}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-base font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                        {tx.formattedAmount}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                        {tx.providerName}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-slate-100 dark:border-slate-800/80">
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
                      <span className="font-mono text-slate-700 dark:text-slate-300 truncate block">
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
                      className="h-11 rounded-lg text-xs font-semibold bg-blue-50 dark:bg-blue-950/40 text-[#126BEB] dark:text-[#38BDF8] hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Receipt className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Receipt</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenInspect(tx)}
                      className="h-11 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                      Inspect
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Laptop Sticky Table */}
          <div
            tabIndex={0}
            role="region"
            aria-label="Platform transactions table"
            className="hidden md:block overflow-auto max-h-[68dvh] rounded-xl bg-white dark:bg-[#0B1528] border border-slate-200/80 dark:border-slate-800 focus:outline-none"
          >
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-[#070D18] border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                <tr>
                  <th className="py-3 px-4 font-semibold">Service</th>
                  <th className="py-3 px-4 font-semibold">Recipient</th>
                  <th className="py-3 px-4 font-semibold">Merchant</th>
                  <th className="py-3 px-4 font-semibold">Amount</th>
                  <th className="py-3 px-4 font-semibold">Provider & Reference</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">Date</th>
                  <th className="py-3 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                {transactions.map((tx) => {
                  const refText =
                    tx.providerReference || tx.requestReference || tx.clientReference || tx.id;
                  return (
                    <tr
                      key={tx.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition-colors"
                    >
                      <td className="py-3 px-4 font-medium text-slate-900 dark:text-white whitespace-nowrap">
                        {tx.serviceType?.replace(/_/g, ' ')}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-700 dark:text-slate-300">
                        {tx.recipient}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-900 dark:text-white truncate max-w-[160px]">
                          {tx.businessName || 'Business'}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white font-mono tabular-nums">
                        {tx.formattedAmount}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-mono text-slate-700 dark:text-slate-300">
                          {tx.providerName}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono truncate max-w-[170px]">
                          {refText}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${formatStatusBadge(
                            tx.status,
                          )}`}
                        >
                          {tx.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 dark:text-slate-400 text-[11px] whitespace-nowrap">
                        {new Date(tx.createdAt).toLocaleDateString('en-NG', {
                          day: '2-digit',
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
                            className="h-8 px-2.5 rounded-lg text-xs font-semibold bg-blue-50 dark:bg-blue-950/40 text-[#126BEB] dark:text-[#38BDF8] hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors inline-flex items-center gap-1"
                          >
                            <Receipt className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Receipt</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenInspect(tx)}
                            className="h-8 px-2.5 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors"
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
        </>
      )}

      {/* Pagination */}
      {txPagination && txPagination.totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Page {txPagination.page} of {txPagination.totalPages} ({txPagination.totalCount} records)
          </span>
          <div className="flex gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              disabled={!txPagination.hasPrevPage}
              onClick={() => setTxPage((p) => Math.max(1, p - 1))}
              className="flex-1 sm:flex-initial h-11 sm:h-9 px-4 rounded-lg text-xs font-medium bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={!txPagination.hasNextPage}
              onClick={() => setTxPage((p) => p + 1)}
              className="flex-1 sm:flex-initial h-11 sm:h-9 px-4 rounded-lg text-xs font-medium bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
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
            <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-200/80 dark:border-slate-800">
              <div>
                <h2
                  id="tx-inspector-title"
                  className="text-base font-bold text-slate-900 dark:text-white"
                >
                  Transaction Details
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Audit references and check live upstream status.
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
              {requeryFeedback && (
                <div
                  className={`p-3 rounded-lg border text-xs font-medium flex items-center gap-2 ${
                    requeryFeedback.type === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                      : requeryFeedback.type === 'error'
                        ? 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                        : 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300'
                  }`}
                >
                  {requeryFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
                  )}
                  <span>{requeryFeedback.message}</span>
                </div>
              )}

              <dl className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                <div className="py-2.5 flex justify-between items-center gap-3">
                  <dt className="text-slate-500 dark:text-slate-400">Service</dt>
                  <dd className="font-semibold text-slate-900 dark:text-white">
                    {selectedTx.serviceType?.replace(/_/g, ' ')}
                  </dd>
                </div>

                <div className="py-2.5 flex justify-between items-center gap-3">
                  <dt className="text-slate-500 dark:text-slate-400">Amount</dt>
                  <dd className="font-bold text-slate-900 dark:text-white font-mono tabular-nums text-sm">
                    {selectedTx.formattedAmount}
                  </dd>
                </div>

                <div className="py-2.5 flex justify-between items-center gap-3">
                  <dt className="text-slate-500 dark:text-slate-400">Recipient</dt>
                  <dd className="font-mono font-semibold text-slate-900 dark:text-white">
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
                  <dd>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${formatStatusBadge(
                        selectedTx.status,
                      )}`}
                    >
                      {selectedTx.status}
                    </span>
                  </dd>
                </div>

                <div className="py-2.5 flex justify-between items-center gap-3">
                  <dt className="text-slate-500 dark:text-slate-400">Provider</dt>
                  <dd className="font-semibold text-slate-900 dark:text-white">
                    {selectedTx.providerName}
                  </dd>
                </div>

                <div className="py-2.5 flex justify-between items-center gap-3">
                  <dt className="text-slate-500 dark:text-slate-400 shrink-0">Provider Ref</dt>
                  <dd className="flex items-center gap-1.5 font-mono text-slate-700 dark:text-slate-300 min-w-0">
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
                    <dd className="text-rose-600 dark:text-rose-400 text-xs font-mono bg-rose-50 dark:bg-rose-950/20 p-2.5 rounded-lg break-words">
                      {selectedTx.errorMessage}
                    </dd>
                  </div>
                )}
              </dl>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#070D18]/70 border border-slate-200/80 dark:border-slate-800 space-y-2.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    Upstream Verification ({selectedTx.providerName})
                  </span>
                </div>

                <div className="px-3 py-2 rounded-lg bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
                  <span className="text-slate-500 text-[11px] shrink-0">Ref</span>
                  <span className="font-mono text-slate-900 dark:text-slate-100 font-semibold text-[11px] truncate text-right">
                    {selectedTx.providerReference ||
                      selectedTx.requestReference ||
                      selectedTx.clientReference ||
                      selectedTx.id}
                  </span>
                </div>

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
                  <span>{isRequerying ? 'Checking Gateway...' : 'Re-query Upstream Status'}</span>
                </button>
              </div>
            </div>

            <div className="px-5 py-3.5 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-[#070D18]/60 flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedReceiptTx(selectedTx);
                  setIsReceiptOpen(true);
                }}
                className="flex-1 h-11 px-4 rounded-lg text-xs font-semibold bg-blue-50 dark:bg-blue-950/40 text-[#126BEB] dark:text-[#38BDF8] hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-200/70 dark:border-blue-800/70 flex items-center justify-center gap-1.5 transition-colors"
              >
                <Receipt className="w-4 h-4" aria-hidden="true" />
                <span>View Receipt</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedTx(null)}
                className="h-11 px-5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
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
