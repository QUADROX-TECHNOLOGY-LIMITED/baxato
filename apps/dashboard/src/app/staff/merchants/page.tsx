'use client';

import React, { useState, useEffect } from 'react';
import {
  Search,
  RefreshCw,
  X,
  Copy,
  Check,
  Building,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { getStoredAuthToken } from '@/lib/auth-session';

export default function StaffMerchantsPage() {
  const [merchants, setMerchants] = useState<any[]>([]);
  const [merchantSearch, setMerchantSearch] = useState<string>('');
  const [kycFilter, setKycFilter] = useState<string>('ALL');
  const [merchantPage, setMerchantPage] = useState<number>(1);
  const [merchantPagination, setMerchantPagination] = useState<any>(null);
  const [isLoadingMerchants, setIsLoadingMerchants] = useState<boolean>(true);
  const [selectedMerchant, setSelectedMerchant] = useState<any | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const [loadError, setLoadError] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const loadMerchants = async () => {
    try {
      setIsLoadingMerchants(true);
      setLoadError(null);
      const token = getStoredAuthToken();
      if (!token) return;

      const params = new URLSearchParams({
        page: merchantPage.toString(),
        limit: '20',
      });
      if (merchantSearch.trim()) params.append('search', merchantSearch.trim());

      const res = await fetch(`/api/admin/merchants?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        let list = data.data || [];
        if (kycFilter === 'VERIFIED') {
          list = list.filter((m: any) => m.kycStatus === 'VERIFIED');
        } else if (kycFilter === 'UNVERIFIED') {
          list = list.filter((m: any) => m.kycStatus !== 'VERIFIED');
        }
        setMerchants(list);
        setMerchantPagination(data.pagination);
      } else {
        const errorMsg = data?.error?.message || data?.message || 'Failed to retrieve merchants directory.';
        setLoadError(errorMsg);
      }
    } catch (err: unknown) {
      console.error('Failed to load merchants:', err);
      setLoadError(err instanceof Error ? err.message : 'Network error loading merchants.');
    } finally {
      setIsLoadingMerchants(false);
    }
  };

  useEffect(() => {
    loadMerchants();
  }, [merchantPage, kycFilter]);

  const verifiedCount = merchants.filter((m) => m.kycStatus === 'VERIFIED').length;
  const pendingCount = merchants.filter((m) => m.kycStatus !== 'VERIFIED').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Merchants
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Registered merchant accounts, identity records, and business wallets.
          </p>
        </div>

        <button
          onClick={loadMerchants}
          disabled={isLoadingMerchants}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoadingMerchants ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800">
          <span className="text-xs text-slate-500 font-medium">Total Merchants</span>
          <div className="text-xl font-bold mt-1 text-slate-900 dark:text-white font-mono">
            {merchantPagination?.totalCount ?? merchants.length}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">Registered in directory</span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800">
          <span className="text-xs text-slate-500 font-medium">NIN Verified</span>
          <div className="text-xl font-bold mt-1 text-emerald-600 dark:text-emerald-400 font-mono">
            {verifiedCount}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">Confirmed identity</span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800">
          <span className="text-xs text-slate-500 font-medium">Pending Verification</span>
          <div className="text-xl font-bold mt-1 text-amber-600 dark:text-amber-400 font-mono">
            {pendingCount}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">Awaiting NIN completion</span>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by business name, owner name, email, phone, or NIN..."
            value={merchantSearch}
            onChange={(e) => setMerchantSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadMerchants()}
            className="w-full pl-9 pr-4 py-2 rounded-lg text-xs bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={kycFilter}
            onChange={(e) => setKycFilter(e.target.value)}
            className="px-3 py-2 rounded-lg text-xs bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none"
          >
            <option value="ALL">All KYC Statuses</option>
            <option value="VERIFIED">Verified NIN Only</option>
            <option value="UNVERIFIED">Pending NIN Only</option>
          </select>

          <button
            onClick={loadMerchants}
            className="px-4 py-2 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition flex items-center gap-1.5 shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingMerchants ? 'animate-spin' : ''}`} />
            Search
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400">
              <th className="py-2.5 px-4 font-semibold">Owner</th>
              <th className="py-2.5 px-4 font-semibold">Primary Business</th>
              <th className="py-2.5 px-4 font-semibold">Businesses</th>
              <th className="py-2.5 px-4 font-semibold">NIN Status</th>
              <th className="py-2.5 px-4 font-semibold">Main Balance</th>
              <th className="py-2.5 px-4 font-semibold">Commission</th>
              <th className="py-2.5 px-4 font-semibold">Registered</th>
              <th className="py-2.5 px-4 font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {merchants.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-500">
                  {isLoadingMerchants ? (
                    'Loading merchants...'
                  ) : loadError ? (
                    <div className="space-y-2 py-2">
                      <p className="text-red-500 font-medium">{loadError}</p>
                      <button
                        onClick={loadMerchants}
                        className="px-3 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 dark:bg-blue-950 dark:hover:bg-blue-900 text-blue-600 dark:text-blue-400 font-semibold text-xs transition"
                      >
                        Retry
                      </button>
                    </div>
                  ) : merchantSearch.trim() ? (
                    `No merchants matching "${merchantSearch}".`
                  ) : (
                    'No merchants found.'
                  )}
                </td>
              </tr>
            ) : (
              merchants.map((m) => {
                const totalBusinessesCount =
                  m.ownerBusinesses && m.ownerBusinesses.length > 0
                    ? m.ownerBusinesses.length
                    : 1;

                const fullName =
                  [m.ownerFirstName, m.ownerMiddleName, m.ownerLastName]
                    .filter(Boolean)
                    .join(' ') || 'Registered User';

                return (
                  <tr key={m.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition">
                    <td className="py-2.5 px-4">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {fullName}
                      </div>
                      <div className="text-[11px] text-slate-500">{m.ownerEmail}</div>
                      {m.ownerPhone && (
                        <div className="text-[10px] text-slate-400 font-mono">{m.ownerPhone}</div>
                      )}
                    </td>

                    <td className="py-2.5 px-4">
                      <div className="font-medium text-slate-900 dark:text-white">{m.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{m.slug}</div>
                    </td>

                    <td className="py-2.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {totalBusinessesCount} {totalBusinessesCount === 1 ? 'Business' : 'Businesses'}
                      </span>
                    </td>

                    <td className="py-2.5 px-4">
                      {m.kycStatus === 'VERIFIED' ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                          NIN Verified
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400">
                          Pending NIN
                        </span>
                      )}
                    </td>

                    <td className="py-2.5 px-4 font-semibold text-slate-900 dark:text-white font-mono">
                      {m.wallets?.formattedMain || '₦0.00'}
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                      {m.wallets?.formattedCommission || '₦0.00'}
                    </td>

                    <td className="py-2.5 px-4 text-slate-500 text-[11px] whitespace-nowrap">
                      {new Date(m.createdAt).toLocaleDateString('en-NG', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>

                    <td className="py-2.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedMerchant(m)}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white transition"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
        <span className="text-xs text-slate-500 order-2 sm:order-1">
          {merchantPagination
            ? `Page ${merchantPagination.page} of ${merchantPagination.totalPages || 1} (${merchantPagination.totalCount} total merchants)`
            : `Showing ${merchants.length} merchants`}
        </span>
        <div className="flex gap-2 order-1 sm:order-2 w-full sm:w-auto justify-end">
          <button
            disabled={!merchantPagination?.hasPrevPage}
            onClick={() => setMerchantPage((p) => Math.max(1, p - 1))}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            Previous
          </button>
          <button
            disabled={!merchantPagination?.hasNextPage}
            onClick={() => setMerchantPage((p) => p + 1)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            Next
          </button>
        </div>
      </div>

      {/* MERCHANT DETAILS MODAL */}
      {selectedMerchant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full p-4 sm:p-6 space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedMerchant(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Merchant Details & Audit Inspector
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Full unmasked identity audit, registered national identity details, and businesses.
              </p>
            </div>

            {/* SECTION 1: OWNER IDENTITY */}
            <div className="space-y-2 text-xs">
              <h4 className="font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800 pb-1">
                Owner Account Details
              </h4>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <span className="text-slate-500 block">Full Name:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {[selectedMerchant.ownerFirstName, selectedMerchant.ownerMiddleName, selectedMerchant.ownerLastName]
                      .filter(Boolean)
                      .join(' ') || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Account Status:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {selectedMerchant.ownerStatus || 'ACTIVE'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Email Address:</span>
                  <span className="text-slate-800 dark:text-slate-200">
                    {selectedMerchant.ownerEmail || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Account Phone:</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">
                    {selectedMerchant.ownerPhone || 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* SECTION 2: NATIONAL IDENTITY (NIN) - FULL UNMASKED AUDIT */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1">
                <h4 className="font-semibold text-slate-700 dark:text-slate-300">
                  National Identity (NIN) Records
                </h4>
                <span className="text-[10px] px-2 py-0.5 rounded font-mono font-medium bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                  Full Audit Visible
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <span className="text-slate-500 block">National Identity Number (NIN):</span>
                  <div className="flex items-center gap-1.5 font-mono font-bold text-sm text-blue-600 dark:text-blue-400 mt-0.5">
                    <span className="tracking-wider">
                      {selectedMerchant.nin || selectedMerchant.kycRecord?.nin || 'Not submitted'}
                    </span>
                    {(selectedMerchant.nin || selectedMerchant.kycRecord?.nin) && (
                      <button
                        onClick={() => copyToClipboard(selectedMerchant.nin || selectedMerchant.kycRecord?.nin, 'nin')}
                        className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                        title="Copy full NIN"
                      >
                        {copiedKey === 'nin' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-slate-500 block">KYC Verification Status:</span>
                  <span
                    className={`inline-block mt-0.5 px-2 py-0.5 rounded text-[11px] font-semibold ${
                      selectedMerchant.kycStatus === 'VERIFIED'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {selectedMerchant.kycStatus === 'VERIFIED' ? 'Verified by NIMC' : 'Pending Verification'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 block">Date of Birth:</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200 font-medium">
                    {selectedMerchant.kycRecord?.dob || selectedMerchant.dob || 'N/A'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 block">Gender:</span>
                  <span className="text-slate-800 dark:text-slate-200 font-medium">
                    {selectedMerchant.kycRecord?.rawResponse?.responseBody?.gender || 'N/A'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 block">NIMC Linked Phone:</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">
                    {selectedMerchant.kycRecord?.rawResponse?.responseBody?.mobileNumber || selectedMerchant.ownerPhone || 'N/A'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 block">Verification Provider:</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">
                    {selectedMerchant.kycRecord?.providerName || (selectedMerchant.kycStatus === 'VERIFIED' ? 'MONNIFY' : 'N/A')}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 block">Identity Match Score:</span>
                  <span className="text-slate-800 dark:text-slate-200 font-semibold font-mono">
                    {selectedMerchant.kycRecord?.matchScore
                      ? `${selectedMerchant.kycRecord.matchScore}%`
                      : selectedMerchant.kycStatus === 'VERIFIED'
                        ? '100%'
                        : 'N/A'}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 block">Verified Date:</span>
                  <span className="text-slate-800 dark:text-slate-200 text-[11px]">
                    {selectedMerchant.kycRecord?.verifiedAt
                      ? new Date(selectedMerchant.kycRecord.verifiedAt).toLocaleDateString('en-NG', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })
                      : selectedMerchant.kycStatus === 'VERIFIED'
                        ? 'Verified'
                        : 'N/A'}
                  </span>
                </div>
              </div>

              {selectedMerchant.kycRecord?.failureReason && (
                <div className="mt-2 p-2 rounded bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-[11px]">
                  <span className="font-semibold block mb-0.5">Verification Note:</span>
                  {selectedMerchant.kycRecord.failureReason}
                </div>
              )}
            </div>

            {/* SECTION 3: ALL REGISTERED BUSINESSES */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1">
                <h4 className="font-semibold text-slate-700 dark:text-slate-300">
                  Registered Businesses ({selectedMerchant.ownerBusinesses?.length || 1})
                </h4>
              </div>

              <div className="space-y-2 pt-1">
                {(selectedMerchant.ownerBusinesses && selectedMerchant.ownerBusinesses.length > 0
                  ? selectedMerchant.ownerBusinesses
                  : [
                      {
                        id: selectedMerchant.id,
                        name: selectedMerchant.name,
                        slug: selectedMerchant.slug,
                        status: selectedMerchant.status,
                        state: selectedMerchant.state,
                        lga: selectedMerchant.lga,
                        wallets: selectedMerchant.wallets,
                      },
                    ]
                ).map((biz: any, idx: number) => (
                  <div
                    key={biz.id || idx}
                    className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {biz.name}
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {biz.slug}
                      </div>
                      {(biz.state || biz.lga) && (
                        <div className="text-[10px] text-slate-400">
                          {[biz.lga, biz.state].filter(Boolean).join(', ')}
                        </div>
                      )}
                    </div>

                    <div className="text-right">
                      <div className="font-mono font-semibold text-slate-900 dark:text-white">
                        {biz.wallets?.formattedMain || '₦0.00'}
                      </div>
                      <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                        {biz.wallets?.formattedCommission || '₦0.00'} (Comm)
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setSelectedMerchant(null)}
                className="w-full py-2 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
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
