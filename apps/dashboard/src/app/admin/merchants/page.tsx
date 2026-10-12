'use client';

import React, { useState, useEffect } from 'react';
import {
  Building2,
  Search,
  CheckCircle2,
  Clock,
  Loader2,
  X,
  UserCheck,
  AlertTriangle,
  Wallet,
  Phone,
  Mail,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import { getStoredAuthToken } from '@/lib/auth-session';

interface MerchantRecord {
  id: string; // User ID
  businessId: string | null;
  name: string;
  slug: string;
  status: string;
  country: string;
  state: string;
  lga: string;
  createdAt: string;
  ownerId: string;
  ownerEmail: string;
  ownerFirstName: string;
  ownerLastName: string;
  ownerPhone: string;
  kycStatus: string;
  nin: string;
  dob: string;
  wallets: {
    mainBalanceKobo?: string;
    mainBalanceNaira?: number;
    formattedMain?: string;
    commissionBalanceKobo?: string;
    commissionBalanceNaira?: number;
    formattedCommission?: string;
  };
  ownerBusinesses?: any[];
}

export default function SuperAdminMerchantsPage() {
  const [merchants, setMerchants] = useState<MerchantRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Selected merchant for KYC override
  const [selectedMerchant, setSelectedMerchant] = useState<MerchantRecord | null>(null);
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [overrideStatus, setOverrideStatus] = useState('VERIFIED');
  const [overrideReason, setOverrideReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchMerchants = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const token = getStoredAuthToken();

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      });
      if (search.trim()) params.set('search', search.trim());

      const res = await fetch(`/api/admin/merchants?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const json = await res.json().catch(() => null);
      if (res.ok && json?.success && Array.isArray(json.data)) {
        setMerchants(json.data);
        if (json.pagination) setPagination(json.pagination);
      } else {
        setErrorMessage(json?.error?.message || 'Failed to load merchants.');
      }
    } catch {
      setErrorMessage('Network connection error fetching merchants.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMerchants();
  }, [page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchMerchants();
  };

  const handleToggleBusinessStatus = async (m: MerchantRecord) => {
    const targetId = m.businessId || m.id;
    const isCurrentlySuspended = m.status === 'SUSPENDED';
    const nextStatus = isCurrentlySuspended ? 'ACTIVE' : 'SUSPENDED';

    if (
      !confirm(
        `Are you sure you want to ${isCurrentlySuspended ? 'activate' : 'freeze/suspend'} workspace "${m.name}"?`
      )
    ) {
      return;
    }

    try {
      setErrorMessage(null);
      setSuccessMessage(null);
      const token = getStoredAuthToken();

      const res = await fetch(`/api/admin/merchants/${targetId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: nextStatus }),
      });

      const json = await res.json().catch(() => null);
      if (res.ok && json?.success) {
        setSuccessMessage(`Workspace "${m.name}" is now ${nextStatus}.`);
        fetchMerchants();
      } else {
        setErrorMessage(json?.error?.message || 'Failed to update status.');
      }
    } catch {
      setErrorMessage('Network error updating workspace status.');
    }
  };

  const handleKycOverride = async () => {
    if (!selectedMerchant) return;
    const userId = selectedMerchant.id;

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
          reason: overrideReason.trim() || 'Administrator compliance verification override',
        }),
      });

      const json = await res.json().catch(() => null);
      if (res.ok && json?.success) {
        setSuccessMessage(`KYC status for ${selectedMerchant.ownerEmail} updated to ${overrideStatus}.`);
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

  const filteredMerchants = merchants.filter((m) => {
    if (statusFilter === 'ALL') return true;
    return m.status === statusFilter;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-[#126BEB]" />
            <span>Merchants &amp; Wallets</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Registered business workspaces, compliance KYC verification, and wallet balances
          </p>
        </div>

        <button
          onClick={fetchMerchants}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#126BEB]' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Notices */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by business name, owner email, or NIN..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-[#126BEB] transition"
          />
        </form>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(['ALL', 'ACTIVE', 'SUSPENDED'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                statusFilter === filter
                  ? 'bg-[#126BEB] text-white shadow-sm'
                  : 'bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {filter === 'ALL' ? 'All Merchants' : filter}
            </button>
          ))}
        </div>
      </div>

      {/* DESKTOP TABLE VIEW */}
      <div className="hidden md:block rounded-xl bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
            <tr>
              <th className="px-5 py-3.5">Merchant Workspace</th>
              <th className="px-5 py-3.5">Owner Contact</th>
              <th className="px-5 py-3.5">KYC Status</th>
              <th className="px-5 py-3.5">Wallet Balance</th>
              <th className="px-5 py-3.5">Status</th>
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
            ) : filteredMerchants.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                  No merchants found matching your query.
                </td>
              </tr>
            ) : (
              filteredMerchants.map((m) => {
                const isSuspended = m.status === 'SUSPENDED';
                const isVerified = m.kycStatus === 'VERIFIED';
                const displayName = m.name || `${m.ownerFirstName || ''} ${m.ownerLastName || ''}`.trim() || 'Workspace';

                return (
                  <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 text-[#126BEB] font-bold flex items-center justify-center shrink-0">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white text-sm">
                            {displayName}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            Registered {new Date(m.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-5 py-3.5">
                      <p className="font-medium text-slate-800 dark:text-slate-200">
                        {m.ownerFirstName} {m.ownerLastName}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {m.ownerEmail}
                      </p>
                      {m.ownerPhone && (
                        <p className="text-[10px] text-slate-400">
                          {m.ownerPhone}
                        </p>
                      )}
                    </td>

                    <td className="px-5 py-3.5">
                      {isVerified ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 font-semibold text-[10px]">
                          <CheckCircle2 className="w-3 h-3" />
                          VERIFIED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800 font-semibold text-[10px]">
                          <Clock className="w-3 h-3" />
                          {m.kycStatus || 'UNVERIFIED'}
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-3.5 font-bold text-slate-900 dark:text-white text-sm">
                      {m.wallets?.formattedMain ||
                        `₦${(m.wallets?.mainBalanceNaira || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`}
                    </td>

                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                          !isSuspended
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                            : 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800'
                        }`}
                      >
                        {m.status || 'ACTIVE'}
                      </span>
                    </td>

                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedMerchant(m);
                            setOverrideStatus(m.kycStatus || 'VERIFIED');
                            setOverrideReason('');
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
                          {!isSuspended ? 'Suspend' : 'Activate'}
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

      {/* MOBILE CARD VIEW */}
      <div className="block md:hidden space-y-3">
        {isLoading ? (
          <div className="p-8 text-center text-slate-400 bg-white dark:bg-[#0D1726] rounded-xl border border-slate-200 dark:border-slate-800">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#126BEB] mb-2" />
            <span>Loading merchant records...</span>
          </div>
        ) : filteredMerchants.length === 0 ? (
          <div className="p-8 text-center text-slate-400 bg-white dark:bg-[#0D1726] rounded-xl border border-slate-200 dark:border-slate-800">
            No merchants found matching your query.
          </div>
        ) : (
          filteredMerchants.map((m) => {
            const isSuspended = m.status === 'SUSPENDED';
            const isVerified = m.kycStatus === 'VERIFIED';
            const displayName = m.name || `${m.ownerFirstName || ''} ${m.ownerLastName || ''}`.trim() || 'Workspace';

            return (
              <div
                key={m.id}
                className="p-4 rounded-xl bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 text-[#126BEB] flex items-center justify-center shrink-0">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
                        {displayName}
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        {m.ownerFirstName} {m.ownerLastName}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                      !isSuspended
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                        : 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800'
                    }`}
                  >
                    {m.status || 'ACTIVE'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Wallet Balance</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {m.wallets?.formattedMain ||
                        `₦${(m.wallets?.mainBalanceNaira || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 block">KYC Verification</span>
                    {isVerified ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold text-xs">
                        <CheckCircle2 className="w-3 h-3" /> VERIFIED
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold text-xs">
                        <Clock className="w-3 h-3" /> {m.kycStatus || 'UNVERIFIED'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <button
                    onClick={() => {
                      setSelectedMerchant(m);
                      setOverrideStatus(m.kycStatus || 'VERIFIED');
                      setOverrideReason('');
                      setIsOverrideModalOpen(true);
                    }}
                    className="flex-1 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold text-center transition"
                  >
                    KYC Override
                  </button>

                  <button
                    onClick={() => handleToggleBusinessStatus(m)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold text-center transition ${
                      !isSuspended
                        ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50'
                        : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50'
                    }`}
                  >
                    {!isSuspended ? 'Suspend' : 'Activate'}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
          <span>
            Page {pagination.page} of {pagination.totalPages} ({pagination.totalCount} total)
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={!pagination.hasPrevPage}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0D1726] text-slate-700 dark:text-slate-300 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              disabled={!pagination.hasNextPage}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0D1726] text-slate-700 dark:text-slate-300 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* KYC OVERRIDE MODAL */}
      {isOverrideModalOpen && selectedMerchant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-[#126BEB] border border-blue-200 dark:border-blue-900/50">
                  <UserCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                    Compliance KYC Override
                  </h3>
                  <p className="text-xs text-slate-500">
                    {selectedMerchant.name || selectedMerchant.ownerEmail}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOverrideModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Target KYC Status
                </label>
                <select
                  value={overrideStatus}
                  onChange={(e) => setOverrideStatus(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#080E1A] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-[#126BEB]"
                >
                  <option value="VERIFIED">VERIFIED (Full access granted)</option>
                  <option value="UNVERIFIED">UNVERIFIED (Pending documents)</option>
                  <option value="PENDING">PENDING (In compliance review)</option>
                  <option value="REJECTED">REJECTED (Failed identity check)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-semibold mb-1">
                  Reason for Override
                </label>
                <textarea
                  rows={3}
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  placeholder="Provide audit justification for manual compliance override..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#080E1A] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#126BEB]"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsOverrideModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleKycOverride}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#126BEB] hover:bg-[#0E58C4] text-white transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Apply Override</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
