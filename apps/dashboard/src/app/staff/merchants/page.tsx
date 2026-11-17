'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Search,
  RefreshCw,
  X,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  Building2,
  ShieldCheck,
} from 'lucide-react';
import BaxatoLoader from '@/components/BaxatoLoader';
import ModalDialog from '@/components/ModalDialog';
import {
  clearSessionAndRedirect,
  getStoredAuthToken,
  handleAuthResponse,
  isTokenExpired,
} from '@/lib/auth-session';

type MerchantsTab = 'merchants' | 'kyc';

export default function StaffMerchantsPage() {
  const [activeTab, setActiveTab] = useState<MerchantsTab>('merchants');

  // Merchants Directory state
  const [merchants, setMerchants] = useState<any[]>([]);
  const [merchantSearch, setMerchantSearch] = useState<string>('');
  const [kycFilter, setKycFilter] = useState<string>('ALL');
  const [merchantPage, setMerchantPage] = useState<number>(1);
  const [merchantPagination, setMerchantPagination] = useState<any>(null);
  const [isLoadingMerchants, setIsLoadingMerchants] = useState<boolean>(true);
  const [merchantsError, setMerchantsError] = useState<string | null>(null);
  const [selectedMerchant, setSelectedMerchant] = useState<any | null>(null);

  // KYC Records state
  const [kycRecords, setKycRecords] = useState<any[]>([]);
  const [kycSearch, setKycSearch] = useState<string>('');
  const [kycStatusFilter, setKycStatusFilter] = useState<string>('ALL');
  const [kycPage, setKycPage] = useState<number>(1);
  const [kycPagination, setKycPagination] = useState<any>(null);
  const [isLoadingKyc, setIsLoadingKyc] = useState<boolean>(false);
  const [kycError, setKycError] = useState<string | null>(null);

  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const loadMerchants = useCallback(
    async (overrideSearch?: string) => {
      try {
        setIsLoadingMerchants(true);
        setMerchantsError(null);
        const token = getStoredAuthToken();
        if (!token || isTokenExpired(token)) {
          clearSessionAndRedirect('expired');
          return;
        }

        const effectiveSearch = overrideSearch !== undefined ? overrideSearch : merchantSearch;
        const params = new URLSearchParams({
          page: merchantPage.toString(),
          limit: '20',
        });
        if (effectiveSearch.trim()) params.append('search', effectiveSearch.trim());

        const res = await fetch(`/api/admin/merchants?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json().catch(() => null);
        if (handleAuthResponse(res, data)) {
          return;
        }

        if (res.ok && data?.success) {
          let list = data.data || [];
          if (kycFilter === 'VERIFIED') {
            list = list.filter((m: any) => m.kycStatus === 'VERIFIED');
          } else if (kycFilter === 'UNVERIFIED') {
            list = list.filter((m: any) => m.kycStatus !== 'VERIFIED');
          }
          setMerchants(list);
          setMerchantPagination(data.pagination || null);
        } else {
          setMerchantsError(
            data?.error?.message || data?.message || 'Unable to load merchants directory.',
          );
        }
      } catch {
        setMerchantsError('Network error loading merchants directory.');
      } finally {
        setIsLoadingMerchants(false);
      }
    },
    [merchantPage, merchantSearch, kycFilter],
  );

  const loadKycRecords = useCallback(
    async (overrideSearch?: string) => {
      try {
        setIsLoadingKyc(true);
        setKycError(null);
        const token = getStoredAuthToken();
        if (!token || isTokenExpired(token)) {
          clearSessionAndRedirect('expired');
          return;
        }

        const effectiveSearch = overrideSearch !== undefined ? overrideSearch : kycSearch;
        const params = new URLSearchParams({
          page: kycPage.toString(),
          limit: '20',
        });
        if (effectiveSearch.trim()) params.append('search', effectiveSearch.trim());
        if (kycStatusFilter !== 'ALL') params.append('status', kycStatusFilter);

        const res = await fetch(`/api/admin/kyc/records?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json().catch(() => null);
        if (handleAuthResponse(res, data)) {
          return;
        }

        if (res.ok && data?.success) {
          setKycRecords(data.data || []);
          setKycPagination(data.pagination || null);
        } else {
          setKycError(data?.error?.message || 'Unable to load verification records.');
        }
      } catch {
        setKycError('Network error loading verification records.');
      } finally {
        setIsLoadingKyc(false);
      }
    },
    [kycPage, kycSearch, kycStatusFilter],
  );

  useEffect(() => {
    if (activeTab === 'merchants') {
      void loadMerchants();
    } else {
      void loadKycRecords();
    }
  }, [activeTab, merchantPage, kycFilter, kycPage, kycStatusFilter]);

  useEffect(() => {
    const handleRefreshEvent = () => {
      if (activeTab === 'merchants') {
        void loadMerchants();
      } else {
        void loadKycRecords();
      }
    };
    window.addEventListener('bx_staff_refresh', handleRefreshEvent);
    return () => window.removeEventListener('bx_staff_refresh', handleRefreshEvent);
  }, [activeTab, loadMerchants, loadKycRecords]);

  const handleMerchantSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (merchantPage !== 1) {
      setMerchantPage(1);
    } else {
      void loadMerchants();
    }
  };

  const handleKycSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (kycPage !== 1) {
      setKycPage(1);
    } else {
      void loadKycRecords();
    }
  };

  const verifiedOnPage = merchants.filter((m) => m.kycStatus === 'VERIFIED').length;
  const pendingOnPage = merchants.filter((m) => m.kycStatus !== 'VERIFIED').length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white [text-wrap:balance]">
            Merchants & KYC
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Inspect merchant accounts, registered businesses, wallet balances, and NIN verification records.
          </p>
        </div>

        <button
          type="button"
          onClick={() => (activeTab === 'merchants' ? void loadMerchants() : void loadKycRecords())}
          disabled={activeTab === 'merchants' ? isLoadingMerchants : isLoadingKyc}
          className="self-start sm:self-auto h-11 sm:h-10 px-3.5 rounded-lg text-xs font-medium bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${(activeTab === 'merchants' ? isLoadingMerchants : isLoadingKyc) ? 'animate-spin' : ''}`}
            aria-hidden="true"
          />
          <span>Refresh</span>
        </button>
      </div>

      {/* Section Tabs */}
      <div
        role="tablist"
        aria-label="Merchant operations sections"
        className="inline-flex w-full sm:w-auto p-1 rounded-xl bg-slate-100 dark:bg-[#0B1528] border border-slate-200/80 dark:border-slate-800 gap-1"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'merchants'}
          onClick={() => setActiveTab('merchants')}
          className={`flex-1 sm:flex-initial min-h-10 px-4 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
            activeTab === 'merchants'
              ? 'bg-white dark:bg-[#126BEB] text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Merchants</span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'kyc'}
          onClick={() => setActiveTab('kyc')}
          className={`flex-1 sm:flex-initial min-h-10 px-4 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
            activeTab === 'kyc'
              ? 'bg-white dark:bg-[#126BEB] text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
          <span>KYC Verifications</span>
        </button>
      </div>

      {activeTab === 'merchants' ? (
        <div className="space-y-5">
          {/* Summary Strip */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            <div className="col-span-2 md:col-span-1 p-4 rounded-xl bg-white dark:bg-[#0B1528] border border-slate-200/80 dark:border-slate-800">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Registered Merchants
              </span>
              <div className="text-xl font-bold mt-1 text-slate-900 dark:text-white font-mono tabular-nums">
                {merchantPagination?.totalCount ?? merchants.length}
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">
                Accounts in directory
              </span>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-[#0B1528] border border-slate-200/80 dark:border-slate-800">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Verified (this view)
              </span>
              <div className="text-xl font-bold mt-1 text-emerald-600 dark:text-emerald-400 font-mono tabular-nums">
                {verifiedOnPage}
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">
                NIN confirmed
              </span>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-[#0B1528] border border-slate-200/80 dark:border-slate-800">
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Pending (this view)
              </span>
              <div className="text-xl font-bold mt-1 text-amber-600 dark:text-amber-400 font-mono tabular-nums">
                {pendingOnPage}
              </div>
              <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 block">
                Awaiting verification
              </span>
            </div>
          </div>

          {/* Search & Filters */}
          <search>
            <form
              onSubmit={handleMerchantSearchSubmit}
              className="flex flex-col md:flex-row gap-2.5 sm:gap-3"
            >
              <div className="relative flex-1">
                <Search
                  className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  aria-label="Search merchants"
                  placeholder="Business name, owner, email, phone, or NIN..."
                  value={merchantSearch}
                  onChange={(e) => setMerchantSearch(e.target.value)}
                  className="w-full h-11 pl-10 pr-4 rounded-lg text-base sm:text-sm bg-white dark:bg-[#0B1528] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#126BEB] focus:ring-2 focus:ring-[#126BEB]/15 dark:focus:border-[#38BDF8] dark:focus:ring-[#38BDF8]/15"
                />
              </div>

              <div className="flex flex-wrap sm:flex-nowrap gap-2">
                <select
                  aria-label="Filter by KYC status"
                  value={kycFilter}
                  onChange={(e) => {
                    setKycFilter(e.target.value);
                    setMerchantPage(1);
                  }}
                  className="flex-1 sm:flex-initial h-11 px-3 rounded-lg text-base sm:text-sm bg-white dark:bg-[#0B1528] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-[#126BEB] dark:focus:border-[#38BDF8]"
                >
                  <option value="ALL">All KYC Statuses</option>
                  <option value="VERIFIED">Verified NIN</option>
                  <option value="UNVERIFIED">Pending Verification</option>
                </select>

                <button
                  type="submit"
                  className="h-11 px-4 rounded-lg text-xs font-semibold bg-[#126BEB] hover:bg-[#0E59C9] text-white transition-colors shrink-0"
                >
                  Search
                </button>

                {(merchantSearch.trim() || kycFilter !== 'ALL') && (
                  <button
                    type="button"
                    onClick={() => {
                      setMerchantSearch('');
                      setKycFilter('ALL');
                      setMerchantPage(1);
                      void loadMerchants('');
                    }}
                    className="h-11 px-3 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    Reset
                  </button>
                )}
              </div>
            </form>
          </search>

          {merchantsError && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-700 dark:text-rose-300 flex items-center justify-between gap-2">
              <span>{merchantsError}</span>
              <button
                type="button"
                onClick={() => void loadMerchants()}
                className="min-h-9 px-2.5 rounded-md font-semibold hover:bg-rose-100 dark:hover:bg-rose-900/40"
              >
                Retry
              </button>
            </div>
          )}

          {isLoadingMerchants && merchants.length === 0 ? (
            <div className="rounded-xl bg-white dark:bg-[#0B1528] border border-slate-200/80 dark:border-slate-800">
              <BaxatoLoader variant="inline" />
            </div>
          ) : merchants.length === 0 ? (
            <div className="rounded-xl bg-white dark:bg-[#0B1528] border border-slate-200/80 dark:border-slate-800 p-10 text-center text-xs text-slate-500">
              No merchants match your search criteria.
            </div>
          ) : (
            <>
              {/* Mobile Merchant Cards */}
              <div className="md:hidden space-y-3">
                {merchants.map((m) => {
                  const fullName =
                    [m.ownerFirstName, m.ownerLastName].filter(Boolean).join(' ') || 'Merchant';
                  const primaryBiz = m.primaryBusiness || m.ownerBusinesses?.[0];
                  const isVerified = m.kycStatus === 'VERIFIED';
                  const isRenamed =
                    primaryBiz?.initialName && primaryBiz.initialName !== primaryBiz.name;
                  return (
                    <article
                      key={m.id}
                      className="p-4 rounded-xl bg-white dark:bg-[#0B1528] border border-slate-200/80 dark:border-slate-800 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                            {fullName}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                            {m.ownerEmail}
                          </div>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${
                            isVerified
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                              : 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                          }`}
                        >
                          {isVerified ? 'NIN Verified' : 'Pending KYC'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                        <div className="min-w-0">
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                            Primary Business
                          </span>
                          <span className="font-medium text-slate-900 dark:text-white truncate block">
                            {primaryBiz?.name || m.name || 'No business'}
                          </span>
                          {isRenamed && (
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 truncate block">
                              Was: {primaryBiz.initialName}
                            </span>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                            Wallet Total
                          </span>
                          <span className="font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                            {m.wallets?.formattedMain || '₦0.00'}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedMerchant(m)}
                        className="w-full h-11 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                      >
                        Inspect Account
                      </button>
                    </article>
                  );
                })}
              </div>

              {/* Laptop Table */}
              <div
                tabIndex={0}
                role="region"
                aria-label="Merchants directory table"
                className="hidden md:block overflow-auto max-h-[68dvh] rounded-xl bg-white dark:bg-[#0B1528] border border-slate-200/80 dark:border-slate-800 focus:outline-none"
              >
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-[#070D18] border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                    <tr>
                      <th className="py-3 px-4 font-semibold">Owner</th>
                      <th className="py-3 px-4 font-semibold">Primary Business</th>
                      <th className="py-3 px-4 font-semibold">Contact</th>
                      <th className="py-3 px-4 font-semibold">KYC Status</th>
                      <th className="py-3 px-4 font-semibold">Total Main Balance</th>
                      <th className="py-3 px-4 font-semibold">Registered</th>
                      <th className="py-3 px-4 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                    {merchants.map((m) => {
                      const fullName =
                        [m.ownerFirstName, m.ownerLastName].filter(Boolean).join(' ') || 'Merchant';
                      const primaryBiz = m.primaryBusiness || m.ownerBusinesses?.[0];
                      const isVerified = m.kycStatus === 'VERIFIED';
                      const isRenamed =
                        primaryBiz?.initialName && primaryBiz.initialName !== primaryBiz.name;
                      return (
                        <tr
                          key={m.id}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition-colors"
                        >
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-900 dark:text-white">
                              {fullName}
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                              {m.ownerBusinesses?.length || 1} business(es)
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-medium text-slate-900 dark:text-white truncate max-w-[180px]">
                              {primaryBiz?.name || m.name || 'N/A'}
                            </div>
                            {isRenamed && (
                              <div className="text-[10px] text-amber-600 dark:text-amber-400 truncate max-w-[180px]">
                                Initial: {primaryBiz.initialName}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-slate-800 dark:text-slate-200 truncate max-w-[180px]">
                              {m.ownerEmail}
                            </div>
                            {m.ownerPhone && (
                              <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                                {m.ownerPhone}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                                isVerified
                                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                                  : 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                              }`}
                            >
                              {isVerified ? 'VERIFIED' : 'PENDING'}
                            </span>
                          </td>
                          <td className="py-3 px-4 font-semibold font-mono tabular-nums text-slate-900 dark:text-white">
                            {m.wallets?.formattedMain || '₦0.00'}
                          </td>
                          <td className="py-3 px-4 text-slate-500 dark:text-slate-400 text-[11px] whitespace-nowrap">
                            {new Date(m.createdAt).toLocaleDateString('en-NG', {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => setSelectedMerchant(m)}
                              className="h-8 px-3 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white transition-colors"
                            >
                              Inspect
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Merchants Pagination */}
          {merchantPagination && merchantPagination.totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Page {merchantPagination.page} of {merchantPagination.totalPages} (
                {merchantPagination.totalCount} total)
              </span>
              <div className="flex gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  disabled={!merchantPagination.hasPrevPage}
                  onClick={() => setMerchantPage((p) => Math.max(1, p - 1))}
                  className="flex-1 sm:flex-initial h-11 sm:h-9 px-4 rounded-lg text-xs font-medium bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={!merchantPagination.hasNextPage}
                  onClick={() => setMerchantPage((p) => p + 1)}
                  className="flex-1 sm:flex-initial h-11 sm:h-9 px-4 rounded-lg text-xs font-medium bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {/* KYC Records Search & Filters */}
          <search>
            <form
              onSubmit={handleKycSearchSubmit}
              className="flex flex-col md:flex-row gap-2.5 sm:gap-3"
            >
              <div className="relative flex-1">
                <Search
                  className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  aria-label="Search verification records by NIN"
                  placeholder="Search verification attempts by NIN..."
                  value={kycSearch}
                  onChange={(e) => setKycSearch(e.target.value)}
                  className="w-full h-11 pl-10 pr-4 rounded-lg text-base sm:text-sm bg-white dark:bg-[#0B1528] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#126BEB] focus:ring-2 focus:ring-[#126BEB]/15 dark:focus:border-[#38BDF8] dark:focus:ring-[#38BDF8]/15"
                />
              </div>

              <div className="flex flex-wrap sm:flex-nowrap gap-2">
                <select
                  aria-label="Filter KYC records by status"
                  value={kycStatusFilter}
                  onChange={(e) => {
                    setKycStatusFilter(e.target.value);
                    setKycPage(1);
                  }}
                  className="flex-1 sm:flex-initial h-11 px-3 rounded-lg text-base sm:text-sm bg-white dark:bg-[#0B1528] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-[#126BEB] dark:focus:border-[#38BDF8]"
                >
                  <option value="ALL">All Outcomes</option>
                  <option value="VERIFIED">Verified</option>
                  <option value="PENDING">Pending</option>
                  <option value="FAILED">Failed</option>
                </select>

                <button
                  type="submit"
                  className="h-11 px-4 rounded-lg text-xs font-semibold bg-[#126BEB] hover:bg-[#0E59C9] text-white transition-colors shrink-0"
                >
                  Search
                </button>
              </div>
            </form>
          </search>

          {kycError && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-700 dark:text-rose-300 flex items-center justify-between gap-2">
              <span>{kycError}</span>
              <button
                type="button"
                onClick={() => void loadKycRecords()}
                className="min-h-9 px-2.5 rounded-md font-semibold hover:bg-rose-100 dark:hover:bg-rose-900/40"
              >
                Retry
              </button>
            </div>
          )}

          {isLoadingKyc && kycRecords.length === 0 ? (
            <div className="rounded-xl bg-white dark:bg-[#0B1528] border border-slate-200/80 dark:border-slate-800">
              <BaxatoLoader variant="inline" />
            </div>
          ) : kycRecords.length === 0 ? (
            <div className="rounded-xl bg-white dark:bg-[#0B1528] border border-slate-200/80 dark:border-slate-800 p-10 text-center text-xs text-slate-500">
              No identity verification attempts found.
            </div>
          ) : (
            <>
              {/* Mobile KYC Cards */}
              <div className="md:hidden space-y-3">
                {kycRecords.map((rec) => (
                  <article
                    key={rec.id}
                    className="p-4 rounded-xl bg-white dark:bg-[#0B1528] border border-slate-200/80 dark:border-slate-800 space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                          {rec.userName || 'Applicant'}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {rec.userEmail || rec.userPhone || 'N/A'}
                        </div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${
                          rec.status === 'VERIFIED'
                            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                            : rec.status === 'FAILED'
                              ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400'
                              : 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                        }`}
                      >
                        {rec.status}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-800/80">
                      <span className="font-mono text-slate-800 dark:text-slate-200">
                        NIN: {rec.nin || 'N/A'}
                      </span>
                      <span className="font-mono text-slate-500 dark:text-slate-400">
                        {rec.matchScore ? `${rec.matchScore}% match` : rec.dob || '—'}
                      </span>
                    </div>

                    {rec.failureReason && (
                      <p className="text-[11px] text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20 p-2 rounded-lg">
                        {rec.failureReason}
                      </p>
                    )}
                  </article>
                ))}
              </div>

              {/* Laptop KYC Table */}
              <div
                tabIndex={0}
                role="region"
                aria-label="KYC verification attempts table"
                className="hidden md:block overflow-auto max-h-[68dvh] rounded-xl bg-white dark:bg-[#0B1528] border border-slate-200/80 dark:border-slate-800 focus:outline-none"
              >
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-[#070D18] border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                    <tr>
                      <th className="py-3 px-4 font-semibold">Applicant</th>
                      <th className="py-3 px-4 font-semibold">NIN</th>
                      <th className="py-3 px-4 font-semibold">DOB</th>
                      <th className="py-3 px-4 font-semibold">Match</th>
                      <th className="py-3 px-4 font-semibold">Status</th>
                      <th className="py-3 px-4 font-semibold">Notes</th>
                      <th className="py-3 px-4 font-semibold text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                    {kycRecords.map((rec) => (
                      <tr
                        key={rec.id}
                        className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {rec.userName || 'Applicant'}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {rec.userEmail || rec.userPhone || 'N/A'}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-800 dark:text-slate-200">
                          <div className="inline-flex items-center gap-1.5">
                            <span>{rec.nin || 'N/A'}</span>
                            {rec.nin && (
                              <button
                                type="button"
                                onClick={() => copyToClipboard(rec.nin, `kyc-${rec.id}`)}
                                aria-label="Copy NIN"
                                className="min-h-7 min-w-7 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white"
                              >
                                {copiedKey === `kyc-${rec.id}` ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-500" aria-hidden="true" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                                )}
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-300">
                          {rec.dob || '—'}
                        </td>
                        <td className="py-3 px-4 font-mono tabular-nums text-slate-800 dark:text-slate-200">
                          {rec.matchScore ? `${rec.matchScore}%` : '—'}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              rec.status === 'VERIFIED'
                                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                                : rec.status === 'FAILED'
                                  ? 'bg-rose-500/10 text-rose-700 dark:text-rose-400'
                                  : 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                            }`}
                          >
                            {rec.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500 dark:text-slate-400 max-w-[220px] truncate">
                          {rec.failureReason || '—'}
                        </td>
                        <td className="py-3 px-4 text-slate-500 dark:text-slate-400 text-[11px] text-right whitespace-nowrap">
                          {new Date(rec.verifiedAt || rec.createdAt).toLocaleDateString('en-NG', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {kycPagination && kycPagination.totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Page {kycPagination.page} of {kycPagination.totalPages} ({kycPagination.totalCount}{' '}
                records)
              </span>
              <div className="flex gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  disabled={!kycPagination.hasPrevPage}
                  onClick={() => setKycPage((p) => Math.max(1, p - 1))}
                  className="flex-1 sm:flex-initial h-11 sm:h-9 px-4 rounded-lg text-xs font-medium bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={!kycPagination.hasNextPage}
                  onClick={() => setKycPage((p) => p + 1)}
                  className="flex-1 sm:flex-initial h-11 sm:h-9 px-4 rounded-lg text-xs font-medium bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MERCHANT DETAILS DIALOG */}
      <ModalDialog
        isOpen={Boolean(selectedMerchant)}
        onClose={() => setSelectedMerchant(null)}
        ariaLabelledBy="merchant-inspector-title"
        maxWidthClass="max-w-2xl"
        className="bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
      >
        {selectedMerchant && (
          <div className="flex flex-col max-h-[85dvh]">
            <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-200/80 dark:border-slate-800">
              <div>
                <h2
                  id="merchant-inspector-title"
                  className="text-base font-bold text-slate-900 dark:text-white"
                >
                  Merchant Audit Inspector
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Owner profile, identity record, and registered workspaces.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMerchant(null)}
                aria-label="Close merchant details"
                className="min-h-10 min-w-10 -mr-2 -mt-1 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <div className="p-5 space-y-6 overflow-y-auto text-xs">
              {/* Owner Profile */}
              <section className="space-y-3">
                <h3 className="font-semibold text-slate-900 dark:text-white border-b border-slate-200/80 dark:border-slate-800 pb-1.5">
                  Owner Account
                </h3>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">Full Name</dt>
                    <dd className="font-semibold text-slate-900 dark:text-white mt-0.5">
                      {[
                        selectedMerchant.ownerFirstName,
                        selectedMerchant.ownerMiddleName,
                        selectedMerchant.ownerLastName,
                      ]
                        .filter(Boolean)
                        .join(' ') || 'N/A'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">Account Status</dt>
                    <dd className="font-semibold text-slate-900 dark:text-white mt-0.5">
                      {selectedMerchant.ownerStatus || 'ACTIVE'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">Email</dt>
                    <dd className="text-slate-800 dark:text-slate-200 mt-0.5 break-all">
                      {selectedMerchant.ownerEmail || 'N/A'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">Phone</dt>
                    <dd className="font-mono text-slate-800 dark:text-slate-200 mt-0.5">
                      {selectedMerchant.ownerPhone || 'N/A'}
                    </dd>
                  </div>
                </dl>
              </section>

              {/* National Identity */}
              <section className="space-y-3">
                <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 dark:border-slate-800 pb-1.5">
                  <h3 className="font-semibold text-slate-900 dark:text-white">
                    Identity Verification (NIN)
                  </h3>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold inline-flex items-center gap-1 ${
                      selectedMerchant.kycStatus === 'VERIFIED'
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                        : 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                    }`}
                  >
                    {selectedMerchant.kycStatus === 'VERIFIED' ? (
                      <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                    ) : (
                      <AlertCircle className="w-3 h-3" aria-hidden="true" />
                    )}
                    <span>
                      {selectedMerchant.kycStatus === 'VERIFIED' ? 'Verified' : 'Pending'}
                    </span>
                  </span>
                </div>

                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">NIN</dt>
                    <dd className="flex items-center gap-1.5 font-mono font-bold text-sm text-[#126BEB] dark:text-[#38BDF8] mt-0.5">
                      <span>
                        {selectedMerchant.nin || selectedMerchant.kycRecord?.nin || 'Not submitted'}
                      </span>
                      {(selectedMerchant.nin || selectedMerchant.kycRecord?.nin) && (
                        <button
                          type="button"
                          onClick={() =>
                            copyToClipboard(
                              selectedMerchant.nin || selectedMerchant.kycRecord?.nin,
                              'modal-nin',
                            )
                          }
                          aria-label="Copy NIN"
                          className="min-h-8 min-w-8 flex items-center justify-center rounded text-slate-400 hover:text-slate-700 dark:hover:text-white"
                        >
                          {copiedKey === 'modal-nin' ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500" aria-hidden="true" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                          )}
                        </button>
                      )}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">Date of Birth</dt>
                    <dd className="font-mono text-slate-800 dark:text-slate-200 mt-0.5">
                      {selectedMerchant.kycRecord?.dob || selectedMerchant.dob || 'N/A'}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">Match Score</dt>
                    <dd className="font-mono font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                      {selectedMerchant.kycRecord?.matchScore
                        ? `${selectedMerchant.kycRecord.matchScore}%`
                        : selectedMerchant.kycStatus === 'VERIFIED'
                          ? 'Verified'
                          : 'N/A'}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">Verified Date</dt>
                    <dd className="text-slate-800 dark:text-slate-200 mt-0.5">
                      {selectedMerchant.kycRecord?.verifiedAt
                        ? new Date(selectedMerchant.kycRecord.verifiedAt).toLocaleDateString(
                            'en-NG',
                            {
                              day: '2-digit',
                              month: 'short',
                              year: 'numeric',
                            },
                          )
                        : 'N/A'}
                    </dd>
                  </div>
                </dl>

                {selectedMerchant.kycRecord?.failureReason && (
                  <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs">
                    <span className="font-semibold block mb-0.5">Note</span>
                    <span>{selectedMerchant.kycRecord.failureReason}</span>
                  </div>
                )}
              </section>

              {/* Businesses */}
              <section className="space-y-3">
                <h3 className="font-semibold text-slate-900 dark:text-white border-b border-slate-200/80 dark:border-slate-800 pb-1.5">
                  Registered Businesses ({selectedMerchant.ownerBusinesses?.length || 1})
                </h3>

                <div className="space-y-2.5">
                  {(selectedMerchant.ownerBusinesses && selectedMerchant.ownerBusinesses.length > 0
                    ? selectedMerchant.ownerBusinesses
                    : [
                        {
                          id: selectedMerchant.businessId || selectedMerchant.id,
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
                      className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-[#070D18]/70 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="font-semibold text-slate-900 dark:text-white">
                          {biz.name}
                        </div>
                        {biz.initialName && biz.initialName !== biz.name && (
                          <div className="text-[11px] text-amber-600 dark:text-amber-400">
                            Initial name: {biz.initialName}
                          </div>
                        )}
                        {Array.isArray(biz.nameHistory) && biz.nameHistory.length > 0 && (
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            Previous: {biz.nameHistory.map((h: any) => h.previousName).join(' -> ')}
                          </div>
                        )}
                        <div className="text-[11px] text-slate-500 font-mono truncate">
                          {biz.slug || biz.id}
                          {(biz.state || biz.lga) &&
                            ` · ${[biz.lga, biz.state].filter(Boolean).join(', ')}`}
                        </div>
                      </div>

                      <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0">
                        <div className="font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                          {biz.wallets?.formattedMain || '₦0.00'}
                        </div>
                        {biz.id && (
                          <Link
                            href={`/staff/transactions?businessId=${encodeURIComponent(biz.id)}`}
                            onClick={() => setSelectedMerchant(null)}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#126BEB] dark:text-[#38BDF8] hover:underline"
                          >
                            <span>Transactions</span>
                            <ArrowUpRight className="w-3 h-3" aria-hidden="true" />
                          </Link>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <div className="px-5 py-3.5 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-[#070D18]/60 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedMerchant(null)}
                className="w-full sm:w-auto h-11 px-6 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </ModalDialog>
    </div>
  );
}
