'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Search,
  RefreshCw,
  X,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  Smartphone,
  Wifi,
  Zap,
  Tv,
  GraduationCap,
  Clock,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { getStoredAuthToken } from '@/lib/auth-session';
import StaffReceiptModal from '@/components/admin/StaffReceiptModal';

const SERVICE_CONFIG: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  AIRTIME: { label: 'Airtime', icon: Smartphone, color: '#126BEB' },
  DATA: { label: 'Data Bundles', icon: Wifi, color: '#10B981' },
  ELECTRICITY: { label: 'Electricity', icon: Zap, color: '#F59E0B' },
  CABLE_TV: { label: 'Cable TV', icon: Tv, color: '#8B5CF6' },
  EXAM_PIN: { label: 'Exam PINs', icon: GraduationCap, color: '#EC4899' },
};

export default function AdminTransactionsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [txSearch, setTxSearch] = useState<string>('');
  const [txServiceFilter, setTxServiceFilter] = useState<string>('ALL');
  const [txStatusFilter, setTxStatusFilter] = useState<string>('ALL');
  const [txPage, setTxPage] = useState<number>(1);
  const [txPagination, setTxPagination] = useState<any>(null);
  const [isLoadingTx, setIsLoadingTx] = useState<boolean>(true);
  const [selectedTx, setSelectedTx] = useState<any | null>(null);
  const [isRequerying, setIsRequerying] = useState<boolean>(false);
  const [requeryFeedback, setRequeryFeedback] = useState<{
    type: 'success' | 'warning' | 'error';
    message: string;
  } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedReceiptTx, setSelectedReceiptTx] = useState<any | null>(null);
  const [isReceiptOpen, setIsReceiptOpen] = useState<boolean>(false);

  const copyToClipboard = (text: string, id: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const loadTransactions = useCallback(async () => {
    try {
      setIsLoadingTx(true);
      const token = getStoredAuthToken();
      if (!token) return;

      const params = new URLSearchParams({
        page: txPage.toString(),
        limit: '20',
      });
      if (txSearch.trim()) params.append('search', txSearch.trim());
      if (txServiceFilter !== 'ALL') params.append('serviceType', txServiceFilter);
      if (txStatusFilter !== 'ALL') params.append('status', txStatusFilter);

      const res = await fetch(`/api/admin/transactions?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data?.success) {
        setTransactions(data.data || []);
        setTxPagination(data.pagination);
      }
    } catch (err) {
      console.error('Failed to load transactions:', err);
    } finally {
      setIsLoadingTx(false);
    }
  }, [txPage, txSearch, txServiceFilter, txStatusFilter]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const handleOpenInspect = (tx: any) => {
    setSelectedTx(tx);
    setRequeryFeedback(null);
  };

  const handleRequery = async (txId: string) => {
    try {
      setIsRequerying(true);
      setRequeryFeedback(null);
      const token = getStoredAuthToken();
      if (!token) return;

      const res = await fetch(`/api/admin/transactions/${txId}/requery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok && data?.success) {
        const syncMsg = data.data.syncMessage || `Status: ${data.data.currentStatus}`;
        const currentStatus = data.data.currentStatus;

        setRequeryFeedback({
          type:
            currentStatus === 'SUCCESSFUL'
              ? 'success'
              : currentStatus === 'FAILED'
              ? 'error'
              : 'warning',
          message: syncMsg,
        });

        loadTransactions();

        if (selectedTx && selectedTx.id === txId) {
          setSelectedTx((prev: any) => ({
            ...prev,
            status: currentStatus,
            providerReference: data.data.providerReference || prev.providerReference,
            errorMessage: data.data.errorMessage || prev.errorMessage,
          }));
        }
      } else {
        setRequeryFeedback({
          type: 'error',
          message: data?.error?.message || 'Failed to re-query provider gateway.',
        });
      }
    } catch {
      setRequeryFeedback({
        type: 'error',
        message: 'An error occurred while contacting the upstream provider.',
      });
    } finally {
      setIsRequerying(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Transactions
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Audit logs, provider references, and live upstream gateway verification
          </p>
        </div>

        <button
          onClick={loadTransactions}
          disabled={isLoadingTx}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition disabled:opacity-50 self-start sm:self-auto shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoadingTx ? 'animate-spin text-[#126BEB]' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by reference, recipient phone, meter number, or merchant..."
            value={txSearch}
            onChange={(e) => setTxSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadTransactions()}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-xs bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#126BEB]"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            value={txServiceFilter}
            onChange={(e) => {
              setTxServiceFilter(e.target.value);
              setTxPage(1);
            }}
            className="px-3 py-2.5 rounded-xl text-xs bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-[#126BEB]"
          >
            <option value="ALL">All Services</option>
            <option value="AIRTIME">Airtime</option>
            <option value="DATA">Data</option>
            <option value="ELECTRICITY">Electricity</option>
            <option value="CABLE_TV">Cable TV</option>
            <option value="EXAM_PIN">Exam PINs</option>
          </select>

          <select
            value={txStatusFilter}
            onChange={(e) => {
              setTxStatusFilter(e.target.value);
              setTxPage(1);
            }}
            className="px-3 py-2.5 rounded-xl text-xs bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-[#126BEB]"
          >
            <option value="ALL">All Statuses</option>
            <option value="SUCCESSFUL">Successful</option>
            <option value="FAILED">Failed</option>
            <option value="PENDING">Pending</option>
          </select>

          <button
            onClick={loadTransactions}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-[#126BEB] text-white hover:bg-[#0B5CC7] transition flex items-center gap-1.5 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingTx ? 'animate-spin' : ''}`} />
            <span>Apply</span>
          </button>
        </div>
      </div>

      {/* Responsive Table Container */}
      <div className="overflow-x-auto rounded-2xl bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 shadow-sm">
        <table className="w-full text-left border-collapse text-xs whitespace-nowrap">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-slate-400 text-[11px]">
              <th className="py-3 px-4 font-medium">Service</th>
              <th className="py-3 px-4 font-medium">Recipient</th>
              <th className="py-3 px-4 font-medium">Merchant</th>
              <th className="py-3 px-4 font-medium text-right">Amount</th>
              <th className="py-3 px-4 font-medium">Reference</th>
              <th className="py-3 px-4 font-medium text-center">Status</th>
              <th className="py-3 px-4 font-medium">Date &amp; Time</th>
              <th className="py-3 px-4 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {isLoadingTx ? (
              [1, 2, 3, 4, 5].map((i) => (
                <tr key={i}>
                  <td className="py-3.5 px-4">
                    <div className="h-4 w-20 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="h-4 w-28 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded animate-pulse ml-auto" />
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="h-4 w-28 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <div className="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded-full animate-pulse mx-auto" />
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="h-4 w-12 bg-slate-200 dark:bg-slate-800 rounded animate-pulse ml-auto" />
                  </td>
                </tr>
              ))
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-12 text-center text-slate-400 text-xs">
                  No transactions found matching your criteria.
                </td>
              </tr>
            ) : (
              transactions.map((tx) => {
                const svc = SERVICE_CONFIG[tx.serviceType] || {
                  label: tx.serviceType,
                  icon: Smartphone,
                  color: '#126BEB',
                };
                const Icon = svc.icon;

                return (
                  <tr
                    key={tx.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-3 px-4">
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        <Icon className="w-3 h-3 text-[#126BEB]" />
                        <span>{svc.label}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4 font-mono text-slate-700 dark:text-slate-300">
                      {tx.recipient}
                    </td>

                    <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">
                      <div className="truncate max-w-[150px]">
                        {tx.businessName || 'Direct Merchant'}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-right font-semibold text-slate-900 dark:text-white tabular-nums">
                      {tx.formattedAmount || `₦${(tx.amountNaira || 0).toLocaleString('en-NG')}`}
                    </td>

                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                      <div className="flex items-center gap-1.5">
                        <span>{(tx.requestReference || tx.clientReference || tx.id).slice(0, 14)}...</span>
                        <button
                          onClick={() =>
                            copyToClipboard(tx.requestReference || tx.clientReference || tx.id, tx.id)
                          }
                          title="Copy Reference"
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                        >
                          {copiedId === tx.id ? (
                            <Check className="w-3 h-3 text-emerald-500" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-center">
                      {tx.status === 'SUCCESSFUL' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          <span>Success</span>
                        </span>
                      ) : tx.status === 'FAILED' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/60">
                          <AlertTriangle className="w-2.5 h-2.5" />
                          <span>Failed</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60">
                          <Clock className="w-2.5 h-2.5" />
                          <span>Pending</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                      {new Date(tx.createdAt).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>

                    <td className="py-3 px-4 text-right space-x-1.5">
                      <button
                        onClick={() => handleOpenInspect(tx)}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                      >
                        Inspect
                      </button>

                      {tx.status === 'SUCCESSFUL' && (
                        <button
                          onClick={() => {
                            setSelectedReceiptTx(tx);
                            setIsReceiptOpen(true);
                          }}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition"
                        >
                          Receipt
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination Footer */}
        {txPagination && txPagination.totalPages > 1 && (
          <div className="p-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing {transactions.length} of {txPagination.total} transactions
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={txPage <= 1}
                onClick={() => setTxPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="font-mono">
                {txPage} / {txPagination.totalPages}
              </span>
              <button
                disabled={txPage >= txPagination.totalPages}
                onClick={() => setTxPage((p) => Math.min(txPagination.totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* INSPECT MODAL */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-[#126BEB] flex items-center justify-center">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Transaction Audit Inspector
                  </h3>
                  <div className="font-mono text-[10px] text-slate-400">
                    {selectedTx.id}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedTx(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {requeryFeedback && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
                  requeryFeedback.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                    : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/60'
                }`}
              >
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{requeryFeedback.message}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400">Service</span>
                <div className="font-semibold text-slate-900 dark:text-white">
                  {selectedTx.serviceType}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400">Amount</span>
                <div className="font-bold text-slate-900 dark:text-white font-mono">
                  {selectedTx.formattedAmount || `₦${(selectedTx.amountNaira || 0).toLocaleString('en-NG')}`}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400">Recipient</span>
                <div className="font-mono text-slate-900 dark:text-white">
                  {selectedTx.recipient}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 space-y-1">
                <span className="text-[10px] text-slate-400">Status</span>
                <div className="font-semibold">
                  {selectedTx.status}
                </div>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Request Ref:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">
                  {selectedTx.requestReference || '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Provider Ref:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">
                  {selectedTx.providerReference || '—'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Merchant Workspace:</span>
                <span className="font-medium text-slate-900 dark:text-white">
                  {selectedTx.businessName || 'Direct'}
                </span>
              </div>
              {selectedTx.errorMessage && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 text-red-500 text-[11px]">
                  Error: {selectedTx.errorMessage}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                onClick={() => setSelectedTx(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                Close
              </button>

              <button
                onClick={() => handleRequery(selectedTx.id)}
                disabled={isRequerying}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#126BEB] text-white hover:bg-[#0B5CC7] transition flex items-center gap-1.5 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRequerying ? 'animate-spin' : ''}`} />
                <span>Re-query Upstream</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DIGITAL RECEIPT MODAL */}
      <StaffReceiptModal
        isOpen={isReceiptOpen}
        onClose={() => setIsReceiptOpen(false)}
        tx={selectedReceiptTx}
      />
    </div>
  );
}
