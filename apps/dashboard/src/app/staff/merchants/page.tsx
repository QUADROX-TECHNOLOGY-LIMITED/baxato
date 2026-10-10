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

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const loadMerchants = async () => {
    try {
      setIsLoadingMerchants(true);
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
      const data = await res.json();
      if (res.ok && data?.success) {
        let list = data.data || [];
        if (kycFilter === 'VERIFIED') {
          list = list.filter((m: any) => m.kycStatus === 'VERIFIED');
        } else if (kycFilter === 'UNVERIFIED') {
          list = list.filter((m: any) => m.kycStatus !== 'VERIFIED');
        }
        setMerchants(list);
        setMerchantPagination(data.pagination);
      }
    } catch (err) {
      console.error('Failed to load merchants:', err);
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
                  {isLoadingMerchants ? 'Loading...' : 'No merchants found.'}
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
      {merchantPagination && merchantPagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-slate-500">
            Page {merchantPagination.page} of {merchantPagination.totalPages} ({merchantPagination.totalCount} items)
          </span>
          <div className="flex gap-2">
            <button
              disabled={!merchantPagination.hasPrevPage}
              onClick={() => setMerchantPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              disabled={!merchantPagination.hasNextPage}
              onClick={() => setMerchantPage((p) => p + 1)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* MERCHANT DETAILS MODAL */}
      {selectedMerchant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 rounded-2xl max-w-xl w-full p-6 space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedMerchant(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Merchant Details
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Owner identity, verified NIN, and associated businesses.
              </p>
            </div>

            {/* SECTION 1: OWNER IDENTITY */}
            <div className="space-y-2 text-xs">
              <h4 className="font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800 pb-1">
                Owner Profile
              </h4>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <span className="text-slate-500 block">Name:</span>
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
                  <span className="text-slate-500 block">Email:</span>
                  <span className="text-slate-800 dark:text-slate-200">
                    {selectedMerchant.ownerEmail || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Phone:</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">
                    {selectedMerchant.ownerPhone || 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* SECTION 2: NATIONAL IDENTITY (NIN) */}
            <div className="space-y-2 text-xs">
              <h4 className="font-semibold text-slate-700 dark:text-slate-300 border-b border-slate-100 dark:border-slate-800 pb-1">
                National Identity (NIN)
              </h4>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <span className="text-slate-500 block">NIN:</span>
                  <div className="flex items-center gap-1 font-mono font-bold text-blue-600 dark:text-blue-400">
                    <span>{selectedMerchant.nin || 'Not submitted'}</span>
                    {selectedMerchant.nin && (
                      <button
                        onClick={() => copyToClipboard(selectedMerchant.nin, 'nin')}
                        className="text-slate-400 hover:text-slate-600"
                      >
                        {copiedKey === 'nin' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500 block">Status:</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                      selectedMerchant.kycStatus === 'VERIFIED'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    }`}
                  >
                    {selectedMerchant.kycStatus === 'VERIFIED' ? 'Verified' : 'Pending'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Date of Birth:</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">
                    {selectedMerchant.dob || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Match Score:</span>
                  <span className="text-slate-800 dark:text-slate-200 font-semibold">
                    {selectedMerchant.kycRecord?.matchScore
                      ? `${selectedMerchant.kycRecord.matchScore}%`
                      : selectedMerchant.kycStatus === 'VERIFIED'
                        ? '100%'
                        : 'N/A'}
                  </span>
                </div>
              </div>
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
