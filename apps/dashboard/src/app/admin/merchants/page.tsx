'use client';

import React, { useState, useEffect } from 'react';
import {
  Building2,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  ShieldAlert,
  Wallet,
  Clock,
  ExternalLink,
  Loader2,
  X,
  UserCheck,
  Lock,
  Unlock,
  AlertTriangle,
} from 'lucide-react';
import { getStoredAuthToken } from '@/lib/auth-session';

export default function SuperAdminMerchantsPage() {
  const [merchants, setMerchants] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Selected merchant for inspection or action
  const [selectedMerchant, setSelectedMerchant] = useState<any | null>(null);
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [overrideStatus, setOverrideStatus] = useState('VERIFIED');
  const [overrideReason, setOverrideReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchMerchants = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const token = getStoredAuthToken();

      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '15');
      if (search.trim()) params.set('search', search.trim());

      const res = await fetch(`/api/admin/merchants?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const json = await res.json().catch(() => null);
      if (res.ok && json?.success) {
        setMerchants(json.data || []);
        setPagination(json.pagination);
      } else {
        setErrorMessage(json?.error?.message || 'Failed to fetch merchants directory.');
      }
    } catch {
      setErrorMessage('Network error loading merchants.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMerchants();
  }, [page, search]);

  const handleToggleBusinessStatus = async (merchant: any) => {
    const newStatus = merchant.business?.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    const bizId = merchant.business?.id;
    if (!bizId) return;

    try {
      setErrorMessage(null);
      const token = getStoredAuthToken();

      const res = await fetch(`/api/admin/merchants/${bizId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      const json = await res.json().catch(() => null);
      if (res.ok && json?.success) {
        setSuccessMessage(`Business workspace "${merchant.business?.name}" is now ${newStatus}.`);
        fetchMerchants();
      } else {
        setErrorMessage(json?.error?.message || 'Failed to update business status.');
      }
    } catch {
      setErrorMessage('Network error updating business status.');
    }
  };

  const handleKycOverride = async () => {
    if (!selectedMerchant) return;
    const userId = selectedMerchant.user?.id;
    if (!userId) return;

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      const token = getStoredAuthToken();

      const res = await fetch(`/api/admin/merchants/${userId}/kyc-override`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          kycStatus: overrideStatus,
          reason: overrideReason.trim() || 'Super Admin manual compliance verification override',
        }),
      });

      const json = await res.json().catch(() => null);
      if (res.ok && json?.success) {
        setSuccessMessage(`KYC status for ${selectedMerchant.user?.email} updated to ${overrideStatus}.`);
        setIsOverrideModalOpen(false);
        fetchMerchants();
      } else {
        setErrorMessage(json?.error?.message || 'Failed to override KYC status.');
      }
    } catch {
      setErrorMessage('Network error updating KYC status.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#126BEB]" />
            <span>Merchant Workspaces</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Inspect registered businesses, manage compliance status, and control wallet activity.
          </p>
        </div>
      </div>

      {/* Notices */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Search Bar */}
      <div className="p-4 rounded-xl bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search business name, email, or merchant name..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-[#0A1324] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-[#126BEB]"
          />
        </div>

        <div className="flex items-center gap-2">
          {(['ALL', 'ACTIVE', 'SUSPENDED'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                statusFilter === s
                  ? 'bg-[#126BEB] text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Merchants Table */}
      <div className="rounded-xl bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-5 py-3.5">Business &amp; Owner</th>
                <th className="px-5 py-3.5">KYC / Compliance</th>
                <th className="px-5 py-3.5">Main Wallet Balance</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Registered</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#126BEB] mb-2" />
                    <span>Loading merchant records...</span>
                  </td>
                </tr>
              ) : merchants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                    No merchants found matching your query.
                  </td>
                </tr>
              ) : (
                merchants
                  .filter((m) => statusFilter === 'ALL' || m.business?.status === statusFilter)
                  .map((m) => {
                    const isSuspended = m.business?.status === 'SUSPENDED';
                    const isVerified = m.user?.kycStatus === 'VERIFIED';

                    return (
                      <tr key={m.business?.id || m.user?.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[#126BEB] font-bold flex items-center justify-center shrink-0">
                              <Building2 className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="font-semibold text-slate-900 dark:text-white">
                                {m.business?.name || 'Unnamed Workspace'}
                              </p>
                              <p className="text-[11px] text-slate-500 font-mono">
                                {m.user?.firstName} {m.user?.lastName} ({m.user?.email})
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-3.5">
                          {isVerified ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 font-bold text-[10px]">
                              <CheckCircle2 className="w-3 h-3" />
                              VERIFIED NIN
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 font-medium text-[10px]">
                              <Clock className="w-3 h-3" />
                              {m.user?.kycStatus || 'UNVERIFIED'}
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-3.5 font-mono font-bold text-slate-900 dark:text-white">
                          ₦{(m.wallet?.balanceNaira || 0).toLocaleString('en-NG', {
                            minimumFractionDigits: 2,
                          })}
                        </td>

                        <td className="px-5 py-3.5">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              !isSuspended
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                                : 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800'
                            }`}
                          >
                            {m.business?.status || 'ACTIVE'}
                          </span>
                        </td>

                        <td className="px-5 py-3.5 text-slate-500 font-mono text-[11px]">
                          {m.business?.createdAt
                            ? new Date(m.business.createdAt).toLocaleDateString('en-GB', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })
                            : '—'}
                        </td>

                        <td className="px-5 py-3.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setSelectedMerchant(m);
                                setOverrideStatus(m.user?.kycStatus || 'VERIFIED');
                                setIsOverrideModalOpen(true);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-[11px] font-semibold transition"
                            >
                              KYC Override
                            </button>

                            <button
                              onClick={() => handleToggleBusinessStatus(m)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition ${
                                !isSuspended
                                  ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50 hover:bg-amber-100'
                                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50 hover:bg-emerald-100'
                              }`}
                            >
                              {!isSuspended ? 'Freeze / Suspend' : 'Activate Workspace'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {pagination && pagination.totalPages > 1 && (
          <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>
              Page {pagination.page} of {pagination.totalPages} ({pagination.totalCount} merchants)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={!pagination.hasPrevPage}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={!pagination.hasNextPage}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* KYC OVERRIDE MODAL */}
      {isOverrideModalOpen && selectedMerchant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#126BEB]" />
                <span>Manual Compliance Override</span>
              </h3>
              <button onClick={() => setIsOverrideModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400">
              Force-update KYC compliance status for{' '}
              <span className="font-semibold text-slate-900 dark:text-white">{selectedMerchant.user?.email}</span> ({selectedMerchant.business?.name}):
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Target Compliance Tier
              </label>
              <select
                value={overrideStatus}
                onChange={(e) => setOverrideStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0A1324] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#126BEB]"
              >
                <option value="VERIFIED">VERIFIED (Full access to all utility limits)</option>
                <option value="REJECTED">REJECTED (Failed compliance match)</option>
                <option value="UNVERIFIED">UNVERIFIED (Reset to initial state)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Administrative Justification / Reason
              </label>
              <textarea
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="Reason for manual override..."
                rows={2}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0A1324] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:outline-none focus:ring-2 focus:ring-[#126BEB]"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsOverrideModalOpen(false)}
                className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleKycOverride}
                className="flex-1 py-2 rounded-xl bg-[#126BEB] hover:bg-[#0E58C4] text-white text-xs font-semibold transition flex items-center justify-center gap-1.5"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm Override'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
