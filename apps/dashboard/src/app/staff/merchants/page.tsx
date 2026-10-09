'use client';

import React, { useState, useEffect } from 'react';
import {
  Search,
  RefreshCw,
  UserCheck,
  X,
  Copy,
  Check,
  Building,
} from 'lucide-react';
import { getStoredAuthToken } from '@/lib/auth-session';

export default function StaffMerchantsPage() {
  const [merchants, setMerchants] = useState<any[]>([]);
  const [merchantSearch, setMerchantSearch] = useState<string>('');
  const [merchantPage, setMerchantPage] = useState<number>(1);
  const [merchantPagination, setMerchantPagination] = useState<any>(null);
  const [isLoadingMerchants, setIsLoadingMerchants] = useState<boolean>(true);
  const [selectedMerchant, setSelectedMerchant] = useState<any | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
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
      if (merchantSearch) params.append('search', merchantSearch);

      const res = await fetch(`/api/admin/merchants?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data?.success) {
        setMerchants(data.data || []);
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
  }, [merchantPage]);

  return (
    <div className="space-y-4">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Merchants & NIN Directory
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Merchant accounts, NIN verification audit, and wallet balances.
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search merchants by business name, owner email, phone, or NIN..."
            value={merchantSearch}
            onChange={(e) => setMerchantSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadMerchants()}
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none"
          />
        </div>
        <button
          onClick={loadMerchants}
          className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition flex items-center gap-1.5 shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoadingMerchants ? 'animate-spin' : ''}`} />
          Search
        </button>
      </div>

      {/* Merchants Table */}
      <div className="overflow-x-auto rounded-xl bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 shadow-sm">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400">
              <th className="py-3 px-4 font-semibold">Business</th>
              <th className="py-3 px-4 font-semibold">Owner Contact</th>
              <th className="py-3 px-4 font-semibold">Main Wallet</th>
              <th className="py-3 px-4 font-semibold">Commission</th>
              <th className="py-3 px-4 font-semibold">NIN KYC Status</th>
              <th className="py-3 px-4 font-semibold">Registered</th>
              <th className="py-3 px-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {merchants.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500">
                  {isLoadingMerchants ? 'Loading merchants...' : 'No merchants found.'}
                </td>
              </tr>
            ) : (
              merchants.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition">
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900 dark:text-white">{m.name}</div>
                    <div className="text-[11px] text-slate-500 font-mono">{m.slug}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-medium text-slate-900 dark:text-white">
                      {m.ownerFirstName} {m.ownerLastName}
                    </div>
                    <div className="text-[11px] text-slate-500">{m.ownerEmail}</div>
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                    {m.wallets?.formattedMain || '₦0.00'}
                  </td>
                  <td className="py-3 px-4 font-semibold text-emerald-600 dark:text-emerald-400">
                    {m.wallets?.formattedCommission || '₦0.00'}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        m.kycStatus === 'VERIFIED'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {m.kycStatus === 'VERIFIED' ? 'NIN VERIFIED' : 'UNVERIFIED'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-500 text-[11px] whitespace-nowrap">
                    {new Date(m.createdAt).toLocaleDateString('en-NG', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => setSelectedMerchant(m)}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition"
                    >
                      NIN Details
                    </button>
                  </td>
                </tr>
              ))
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

      {/* MERCHANT NIN DETAILS MODAL */}
      {selectedMerchant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setSelectedMerchant(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-500" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Merchant NIN Verification Desk</h3>
            </div>

            <div className="space-y-3 text-xs divide-y divide-slate-100 dark:divide-slate-800">
              <div className="pt-2 flex justify-between items-center">
                <span className="text-slate-500">Business Name:</span>
                <span className="font-bold text-slate-900 dark:text-white">{selectedMerchant.name}</span>
              </div>

              <div className="pt-2 flex justify-between items-center">
                <span className="text-slate-500">Owner Name:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {selectedMerchant.ownerFirstName} {selectedMerchant.ownerLastName}
                </span>
              </div>

              <div className="pt-2 flex justify-between items-center">
                <span className="text-slate-500">Contact Email:</span>
                <span className="text-slate-700 dark:text-slate-300">{selectedMerchant.ownerEmail}</span>
              </div>

              <div className="pt-2 flex justify-between items-center">
                <span className="text-slate-500">Phone Number:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">{selectedMerchant.ownerPhone || 'N/A'}</span>
              </div>

              <div className="pt-2 flex justify-between items-center">
                <span className="text-slate-500">National ID (NIN):</span>
                <div className="flex items-center gap-1 font-mono font-bold text-blue-600 dark:text-blue-400 text-sm">
                  <span>{selectedMerchant.nin ? selectedMerchant.nin : 'Pending submission'}</span>
                  {selectedMerchant.nin && (
                    <button onClick={() => copyToClipboard(selectedMerchant.nin, 'nin')}>
                      {copiedId === 'nin' ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>

              <div className="pt-2 flex justify-between items-center">
                <span className="text-slate-500">Date of Birth (DOB):</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">{selectedMerchant.dob || 'N/A'}</span>
              </div>

              <div className="pt-2 flex justify-between items-center">
                <span className="text-slate-500">NIMC Status:</span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    selectedMerchant.kycStatus === 'VERIFIED'
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                      : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                  }`}
                >
                  {selectedMerchant.kycStatus === 'VERIFIED' ? 'VERIFIED IDENTITY' : 'UNVERIFIED'}
                </span>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setSelectedMerchant(null)}
                className="w-full py-2.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
