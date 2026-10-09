'use client';

import React, { useState, useEffect } from 'react';
import {
  Search,
  RefreshCw,
  X,
  ShieldCheck,
  Copy,
  Check,
  ArrowRightLeft,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ExternalLink,
} from 'lucide-react';
import { getStoredAuthToken } from '@/lib/auth-session';

export default function StaffTransactionsPage() {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [txSearch, setTxSearch] = useState<string>('');
  const [txServiceFilter, setTxServiceFilter] = useState<string>('ALL');
  const [txStatusFilter, setTxStatusFilter] = useState<string>('ALL');
  const [txPage, setTxPage] = useState<number>(1);
  const [txPagination, setTxPagination] = useState<any>(null);
  const [isLoadingTx, setIsLoadingTx] = useState<boolean>(false);
  const [selectedTx, setSelectedTx] = useState<any | null>(null);
  const [isRequerying, setIsRequerying] = useState<boolean>(false);
  const [requeryFeedback, setRequeryFeedback] = useState<{
    type: 'success' | 'warning' | 'error';
    message: string;
  } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const loadTransactions = async () => {
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
  };

  useEffect(() => {
    loadTransactions();
  }, [txPage, txServiceFilter, txStatusFilter]);

  const handleRequery = async (txId: string) => {
    try {
      setIsRequerying(true);
      setRequeryFeedback(null);
      const token = getStoredAuthToken();
      if (!token) return;

      const res = await fetch(`/api/admin/transactions/${txId}/requery`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data?.success) {
        const syncMsg = data.data.syncMessage || `Upstream Sync Complete: Status is ${data.data.currentStatus}`;
        const currentStatus = data.data.currentStatus;

        setRequeryFeedback({
          type: currentStatus === 'SUCCESSFUL' ? 'success' : currentStatus === 'FAILED' ? 'error' : 'warning',
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
          message: data?.error?.message || 'Failed to re-query upstream provider gateway.',
        });
      }
    } catch (err) {
      setRequeryFeedback({
        type: 'error',
        message: 'An error occurred while contacting the upstream gateway.',
      });
    } finally {
      setIsRequerying(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Page Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Transactions Desk
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Global audit records, provider payload inspection, and upstream status synchronizations.
          </p>
        </div>

        <button
          onClick={loadTransactions}
          disabled={isLoadingTx}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition self-start md:self-auto shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoadingTx ? 'animate-spin text-blue-500' : ''}`} />
          <span>Refresh Desk</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by reference, recipient phone, meter number, smartcard..."
            value={txSearch}
            onChange={(e) => setTxSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadTransactions()}
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            value={txServiceFilter}
            onChange={(e) => {
              setTxServiceFilter(e.target.value);
              setTxPage(1);
            }}
            className="px-3 py-2 rounded-xl text-xs bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none"
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
            className="px-3 py-2 rounded-xl text-xs bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="SUCCESSFUL">Successful</option>
            <option value="FAILED">Failed</option>
            <option value="PENDING">Pending</option>
          </select>

          <button
            onClick={loadTransactions}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition flex items-center gap-1.5 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingTx ? 'animate-spin' : ''}`} />
            Filter
          </button>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="overflow-x-auto rounded-xl bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 shadow-sm">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400">
              <th className="py-3 px-4 font-semibold">Service</th>
              <th className="py-3 px-4 font-semibold">Recipient</th>
              <th className="py-3 px-4 font-semibold">Merchant / Business</th>
              <th className="py-3 px-4 font-semibold">Amount</th>
              <th className="py-3 px-4 font-semibold">Provider & Ref</th>
              <th className="py-3 px-4 font-semibold">Status</th>
              <th className="py-3 px-4 font-semibold">Date</th>
              <th className="py-3 px-4 font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-500">
                  {isLoadingTx ? 'Loading transactions...' : 'No transactions matched the criteria.'}
                </td>
              </tr>
            ) : (
              transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition">
                  <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                    {tx.serviceType}
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-800 dark:text-slate-200">
                    {tx.recipient}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-medium text-slate-900 dark:text-white truncate max-w-[150px]">
                      {tx.businessName || 'Business'}
                    </div>
                    <div className="text-[10px] text-slate-500 truncate max-w-[150px]">{tx.userEmail}</div>
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white font-mono">
                    {tx.formattedAmount}
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {tx.providerName}
                    </span>
                    <div className="text-[10px] text-slate-500 font-mono truncate max-w-[140px] mt-0.5">
                      {tx.providerReference || tx.requestReference || tx.clientReference}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        tx.status === 'SUCCESSFUL'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : tx.status === 'FAILED'
                            ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {tx.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-500 text-[11px] whitespace-nowrap">
                    {new Date(tx.createdAt).toLocaleDateString('en-NG', {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => {
                        setSelectedTx(tx);
                        setRequeryFeedback(null);
                      }}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition"
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {txPagination && txPagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-slate-500">
            Page {txPagination.page} of {txPagination.totalPages} ({txPagination.totalCount} items)
          </span>
          <div className="flex gap-2">
            <button
              disabled={!txPagination.hasPrevPage}
              onClick={() => setTxPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              disabled={!txPagination.hasNextPage}
              onClick={() => setTxPage((p) => p + 1)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* TRANSACTION INSPECT DRAWER / MODAL */}
      {selectedTx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedTx(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-blue-500" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Transaction Inspector</h3>
            </div>

            {requeryFeedback && (
              <div
                className={`p-3 rounded-xl border text-xs font-medium flex items-center gap-2 ${
                  requeryFeedback.type === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
                    : requeryFeedback.type === 'error'
                      ? 'bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400'
                      : 'bg-blue-500/10 border-blue-500/20 text-blue-700 dark:text-blue-400'
                }`}
              >
                {requeryFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                ) : (
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
                )}
                <span>{requeryFeedback.message}</span>
              </div>
            )}

            <div className="space-y-2 text-xs divide-y divide-slate-100 dark:divide-slate-800">
              <div className="py-2 flex justify-between items-center">
                <span className="text-slate-500">Service Category:</span>
                <span className="font-bold text-slate-900 dark:text-white">{selectedTx.serviceType}</span>
              </div>

              <div className="py-2 flex justify-between items-center">
                <span className="text-slate-500">Amount:</span>
                <span className="font-bold text-slate-900 dark:text-white font-mono text-sm">{selectedTx.formattedAmount}</span>
              </div>

              <div className="py-2 flex justify-between items-center">
                <span className="text-slate-500">Recipient / Identifier:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{selectedTx.recipient}</span>
              </div>

              <div className="py-2 flex justify-between items-center">
                <span className="text-slate-500">Execution Status:</span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    selectedTx.status === 'SUCCESSFUL'
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                      : selectedTx.status === 'FAILED'
                        ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                  }`}
                >
                  {selectedTx.status}
                </span>
              </div>

              <div className="py-2 flex justify-between items-center">
                <span className="text-slate-500">Gateway Provider:</span>
                <span className="font-bold text-slate-900 dark:text-white">{selectedTx.providerName}</span>
              </div>

              <div className="py-2 flex justify-between items-center">
                <span className="text-slate-500">Provider Reference:</span>
                <div className="flex items-center gap-1 font-mono text-slate-700 dark:text-slate-300">
                  <span>{selectedTx.providerReference || 'N/A'}</span>
                  {selectedTx.providerReference && (
                    <button onClick={() => copyToClipboard(selectedTx.providerReference, 'pRef')}>
                      {copiedId === 'pRef' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    </button>
                  )}
                </div>
              </div>

              <div className="py-2 flex justify-between items-center">
                <span className="text-slate-500">Request Reference:</span>
                <div className="flex items-center gap-1 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                  <span>{selectedTx.requestReference || selectedTx.clientReference || 'N/A'}</span>
                  {(selectedTx.requestReference || selectedTx.clientReference) && (
                    <button onClick={() => copyToClipboard(selectedTx.requestReference || selectedTx.clientReference, 'reqRef')}>
                      {copiedId === 'reqRef' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                    </button>
                  )}
                </div>
              </div>

              <div className="py-2 flex justify-between items-center">
                <span className="text-slate-500">Internal Audit ID:</span>
                <div className="flex items-center gap-1 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                  <span>{selectedTx.id}</span>
                  <button onClick={() => copyToClipboard(selectedTx.id, 'txId')}>
                    {copiedId === 'txId' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>

              {selectedTx.errorMessage && (
                <div className="py-2">
                  <span className="text-slate-500 block mb-0.5">Error Message:</span>
                  <p className="text-red-600 dark:text-red-400 text-xs font-mono bg-red-50 dark:bg-red-900/20 p-2 rounded">
                    {selectedTx.errorMessage}
                  </p>
                </div>
              )}

              {selectedTx.metadata && (
                <div className="py-2">
                  <span className="text-slate-500 block mb-1">Gateway Payload & Metadata:</span>
                  <pre className="p-2.5 rounded bg-slate-100 dark:bg-slate-900 text-[10px] overflow-x-auto text-slate-700 dark:text-slate-300 font-mono">
                    {JSON.stringify(selectedTx.metadata, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="pt-2 flex gap-3">
              <button
                disabled={isRequerying}
                onClick={() => handleRequery(selectedTx.id)}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-sm"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRequerying ? 'animate-spin' : ''}`} />
                {isRequerying ? 'Syncing with Gateway...' : 'Re-query Upstream Gateway'}
              </button>

              <button
                onClick={() => setSelectedTx(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
