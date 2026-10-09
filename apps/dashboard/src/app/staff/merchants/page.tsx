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
  Mail,
  Phone,
  ShieldCheck,
  ShieldAlert,
  Wallet,
  Calendar,
  Layers,
  ExternalLink,
  ChevronRight,
  Info,
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
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Merchants & Identity Audit
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Merchant profile directory, National Identity (NIN) KYC records, and multi-business wallet balances.
          </p>
        </div>

        <button
          onClick={loadMerchants}
          disabled={isLoadingMerchants}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition self-start md:self-auto shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoadingMerchants ? 'animate-spin text-blue-500' : ''}`} />
          <span>Refresh Directory</span>
        </button>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Total Directory</span>
          <div className="text-xl md:text-2xl font-bold mt-1 text-slate-900 dark:text-white">
            {merchantPagination?.totalCount ?? merchants.length}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">Registered merchants</span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">NIN Verified</span>
          <div className="text-xl md:text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
            {verifiedCount}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">Confirmed NIMC identity</span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Pending Verification</span>
          <div className="text-xl md:text-2xl font-bold mt-1 text-amber-600 dark:text-amber-400">
            {pendingCount}
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">Awaiting NIN completion</span>
        </div>

        <div className="p-4 rounded-xl bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 shadow-sm">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Staff Governance</span>
          <div className="text-sm font-bold mt-2 text-slate-700 dark:text-slate-300">
            Read & Audit Only
          </div>
          <span className="text-[11px] text-slate-500 block">Super Admin reserves suspension</span>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by business name, owner name, email, phone number, or 11-digit NIN..."
            value={merchantSearch}
            onChange={(e) => setMerchantSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadMerchants()}
            className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-2">
          <select
            value={kycFilter}
            onChange={(e) => setKycFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none"
          >
            <option value="ALL">All KYC Statuses</option>
            <option value="VERIFIED">Verified NIN Only</option>
            <option value="UNVERIFIED">Pending NIN Only</option>
          </select>

          <button
            onClick={loadMerchants}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition flex items-center gap-1.5 shadow-sm shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingMerchants ? 'animate-spin' : ''}`} />
            Search
          </button>
        </div>
      </div>

      {/* Merchants Table */}
      <div className="overflow-x-auto rounded-xl bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 shadow-sm">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400">
              <th className="py-3 px-4 font-semibold">Merchant / Owner</th>
              <th className="py-3 px-4 font-semibold">Primary Business</th>
              <th className="py-3 px-4 font-semibold">Businesses</th>
              <th className="py-3 px-4 font-semibold">NIN & Identity</th>
              <th className="py-3 px-4 font-semibold">Main Balance</th>
              <th className="py-3 px-4 font-semibold">Commission</th>
              <th className="py-3 px-4 font-semibold">Member Since</th>
              <th className="py-3 px-4 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {merchants.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-10 text-center text-slate-500">
                  {isLoadingMerchants ? 'Loading merchants...' : 'No merchants matched your search.'}
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
                    {/* Owner Contact */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white">
                          {fullName}
                        </span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                            m.ownerStatus === 'ACTIVE'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : 'bg-red-500/10 text-red-600 dark:text-red-400'
                          }`}
                        >
                          {m.ownerStatus || 'ACTIVE'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500">{m.ownerEmail}</div>
                      {m.ownerPhone && (
                        <div className="text-[10px] text-slate-400 font-mono">{m.ownerPhone}</div>
                      )}
                    </td>

                    {/* Primary Business */}
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 dark:text-white">{m.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{m.slug}</div>
                      {(m.state || m.country) && (
                        <div className="text-[10px] text-slate-400">
                          {[m.lga, m.state, m.country].filter(Boolean).join(', ')}
                        </div>
                      )}
                    </td>

                    {/* Total Owned Businesses */}
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                        {totalBusinessesCount} {totalBusinessesCount === 1 ? 'Business' : 'Businesses'}
                      </span>
                    </td>

                    {/* NIN & KYC */}
                    <td className="py-3 px-4">
                      {m.kycStatus === 'VERIFIED' ? (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" /> NIN VERIFIED
                          </span>
                          {m.nin && (
                            <div className="font-mono text-[10px] text-slate-600 dark:text-slate-300">
                              NIN: ••••••{m.nin.slice(-4)}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                          <AlertCircle className="w-3 h-3" /> PENDING NIN
                        </span>
                      )}
                    </td>

                    {/* Wallets */}
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                      {m.wallets?.formattedMain || '₦0.00'}
                    </td>
                    <td className="py-3 px-4 font-semibold text-emerald-600 dark:text-emerald-400">
                      {m.wallets?.formattedCommission || '₦0.00'}
                    </td>

                    {/* Registered Date */}
                    <td className="py-3 px-4 text-slate-500 text-[11px] whitespace-nowrap">
                      {new Date(m.createdAt).toLocaleDateString('en-NG', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedMerchant(m)}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white transition"
                      >
                        Inspect Profile
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

      {/* COMPREHENSIVE MERCHANT & MULTI-BUSINESS INSPECTION DRAWER */}
      {selectedMerchant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            {/* Modal Close Button */}
            <button
              onClick={() => setSelectedMerchant(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Modal Header */}
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Merchant Identity & Business Audit
                </h3>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Full user-submitted identity, National Identity (NIN) credentials, and associated businesses.
              </p>
            </div>

            {/* Staff Governance Notice */}
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-400">
              <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
              <span>
                Staff operational console has read-only audit permissions. Account suspension and administrative modifications are restricted to Super Admin governance.
              </span>
            </div>

            {/* SECTION 1: USER IDENTITY & CONTACT PROFILE */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-1 flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-blue-500" />
                1. Owner Identity Profile
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80">
                  <span className="text-[11px] text-slate-500 block">Full Legal Name</span>
                  <span className="font-bold text-slate-900 dark:text-white text-sm">
                    {[selectedMerchant.ownerFirstName, selectedMerchant.ownerMiddleName, selectedMerchant.ownerLastName]
                      .filter(Boolean)
                      .join(' ') || 'N/A'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80">
                  <span className="text-[11px] text-slate-500 block">Account Status</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        selectedMerchant.ownerStatus === 'ACTIVE'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                      }`}
                    >
                      {selectedMerchant.ownerStatus || 'ACTIVE'}
                    </span>
                    <span className="text-[10px] text-slate-400">Role: MERCHANT</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80">
                  <span className="text-[11px] text-slate-500 block">Email Address</span>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {selectedMerchant.ownerEmail || 'N/A'}
                    </span>
                    {selectedMerchant.isEmailVerified && (
                      <span className="text-[9px] font-bold text-emerald-500 px-1.5 py-0.5 rounded bg-emerald-500/10 shrink-0">
                        VERIFIED
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80">
                  <span className="text-[11px] text-slate-500 block">Phone Number</span>
                  <div className="flex items-center justify-between mt-0.5">
                    <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                      {selectedMerchant.ownerPhone || 'N/A'}
                    </span>
                    {selectedMerchant.isPhoneVerified && (
                      <span className="text-[9px] font-bold text-emerald-500 px-1.5 py-0.5 rounded bg-emerald-500/10 shrink-0">
                        VERIFIED
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* SECTION 2: NATIONAL IDENTITY (NIN) AUDIT */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 pb-1 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                2. National Identity (NIN) Audit Record
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80 md:col-span-2">
                  <span className="text-[11px] text-slate-500 block">11-Digit National Identity Number (NIN)</span>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-mono text-base font-bold text-blue-600 dark:text-blue-400">
                      {selectedMerchant.nin || 'Not Submitted'}
                    </span>
                    {selectedMerchant.nin && (
                      <button
                        onClick={() => copyToClipboard(selectedMerchant.nin, 'modalNin')}
                        className="px-2 py-1 rounded-md text-[10px] font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-1 text-slate-700 dark:text-slate-300 hover:bg-slate-50 transition"
                      >
                        {copiedKey === 'modalNin' ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-500" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" /> Copy NIN
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80">
                  <span className="text-[11px] text-slate-500 block">NIMC Status</span>
                  <div className="mt-1">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        selectedMerchant.kycStatus === 'VERIFIED'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                      }`}
                    >
                      {selectedMerchant.kycStatus === 'VERIFIED' ? 'NIMC VERIFIED' : 'UNVERIFIED'}
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80">
                  <span className="text-[11px] text-slate-500 block">Date of Birth (DOB)</span>
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-200 block mt-1">
                    {selectedMerchant.dob || 'N/A'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80">
                  <span className="text-[11px] text-slate-500 block">Verification Provider</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 block mt-1">
                    {selectedMerchant.kycRecord?.providerName || 'SEAMFIX / NIMC'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80">
                  <span className="text-[11px] text-slate-500 block">Name Match Confidence</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 block mt-1">
                    {selectedMerchant.kycRecord?.matchScore
                      ? `${selectedMerchant.kycRecord.matchScore}% Match`
                      : selectedMerchant.kycStatus === 'VERIFIED'
                        ? '100% Match'
                        : 'N/A'}
                  </span>
                </div>
              </div>

              {/* Extracted NIMC Raw Data (if available) */}
              {selectedMerchant.ninData && Object.keys(selectedMerchant.ninData).length > 0 && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                  <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block mb-1.5">
                    Extracted NIMC Verification Record:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px]">
                    {selectedMerchant.ninData.firstname && (
                      <div>
                        <span className="text-slate-500 block">NIMC First Name:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {selectedMerchant.ninData.firstname}
                        </span>
                      </div>
                    )}
                    {selectedMerchant.ninData.surname && (
                      <div>
                        <span className="text-slate-500 block">NIMC Surname:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {selectedMerchant.ninData.surname}
                        </span>
                      </div>
                    )}
                    {selectedMerchant.ninData.gender && (
                      <div>
                        <span className="text-slate-500 block">Gender:</span>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          {selectedMerchant.ninData.gender}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 3: ALL BUSINESSES OWNED BY THIS USER */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-1">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Building className="w-3.5 h-3.5 text-blue-500" />
                  3. Registered Businesses Owned by Merchant ({selectedMerchant.ownerBusinesses?.length || 1})
                </h4>
                <span className="text-[11px] text-slate-500">
                  Multi-Tenant Portfolio
                </span>
              </div>

              <div className="space-y-2.5">
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
                        createdAt: selectedMerchant.createdAt,
                        wallets: selectedMerchant.wallets,
                      },
                    ]
                ).map((biz: any, idx: number) => (
                  <div
                    key={biz.id || idx}
                    className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 dark:text-white text-sm">
                          {biz.name}
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-mono font-semibold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {biz.slug}
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                          {biz.status || 'ACTIVE'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {[biz.lga, biz.state, biz.country].filter(Boolean).join(', ') || 'Nigeria'}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-200 dark:border-slate-800">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 block">Main Wallet</span>
                        <span className="font-bold text-slate-900 dark:text-white">
                          {biz.wallets?.formattedMain || '₦0.00'}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-500 block">Commission</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {biz.wallets?.formattedCommission || '₦0.00'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="pt-2">
              <button
                onClick={() => setSelectedMerchant(null)}
                className="w-full py-2.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
              >
                Close Audit Inspection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
