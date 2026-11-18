'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Search,
  X,
  Copy,
  Check,
  ArrowUpRight,
} from 'lucide-react';
import BaxatoLoader from '@/components/BaxatoLoader';
import ModalDialog from '@/components/ModalDialog';
import StaffFilterSelect, { type SelectOption } from '@/components/admin/StaffFilterSelect';
import {
  clearSessionAndRedirect,
  getStoredAuthToken,
  handleAuthResponse,
  isTokenExpired,
} from '@/lib/auth-session';

type MerchantsTab = 'merchants' | 'kyc';

const KYC_MERCHANT_FILTER_OPTIONS: SelectOption[] = [
  { value: 'ALL', label: 'All KYC Statuses', dotColor: 'bg-slate-400' },
  { value: 'VERIFIED', label: 'Verified', dotColor: 'bg-emerald-500' },
  { value: 'UNVERIFIED', label: 'Pending / Unverified', dotColor: 'bg-amber-500' },
];

const KYC_RECORD_FILTER_OPTIONS: SelectOption[] = [
  { value: 'ALL', label: 'All Outcomes', dotColor: 'bg-slate-400' },
  { value: 'VERIFIED', label: 'Verified', dotColor: 'bg-emerald-500' },
  { value: 'PENDING', label: 'Pending', dotColor: 'bg-amber-500' },
  { value: 'FAILED', label: 'Failed', dotColor: 'bg-rose-500' },
];

function renderStatusDot(status: string) {
  if (status === 'VERIFIED' || status === 'ACTIVE') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/60">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
        <span>{status === 'ACTIVE' ? 'Active' : 'Verified'}</span>
      </span>
    );
  }
  if (status === 'FAILED' || status === 'REJECTED' || status === 'SUSPENDED') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200/80 dark:border-rose-800/60">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" aria-hidden="true" />
        <span>{status === 'SUSPENDED' ? 'Suspended' : status === 'REJECTED' ? 'Rejected' : 'Failed'}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200/80 dark:border-amber-800/60">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-500" aria-hidden="true" />
      <span>Pending</span>
    </span>
  );
}

function getSafeExternalUrl(rawUrl?: string | null): string | null {
  if (!rawUrl) return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;
  try {
    const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const parsed = new URL(candidate);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}

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
        if (handleAuthResponse(res, data)) return;

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
        if (handleAuthResponse(res, data)) return;

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

  return (
    <div className="space-y-5">
      <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight [text-wrap:balance]">
        Merchants &amp; KYC
      </h1>

      {/* Section Tabs */}
      <div
        role="tablist"
        aria-label="Merchant operations tabs"
        className="inline-flex w-full sm:w-auto p-1 rounded-xl bg-slate-100 dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800 gap-1"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'merchants'}
          onClick={() => setActiveTab('merchants')}
          className={`flex-1 sm:flex-initial h-9 px-4 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === 'merchants'
              ? 'bg-white dark:bg-[#126BEB] text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Merchants
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'kyc'}
          onClick={() => setActiveTab('kyc')}
          className={`flex-1 sm:flex-initial h-9 px-4 rounded-lg text-xs font-semibold transition-colors ${
            activeTab === 'kyc'
              ? 'bg-white dark:bg-[#126BEB] text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          KYC Records
        </button>
      </div>

      {activeTab === 'merchants' ? (
        <div className="space-y-4">
          {/* Search & Filters */}
          <search>
            <form
              onSubmit={handleMerchantSearchSubmit}
              className="grid grid-cols-1 sm:grid-cols-12 gap-2.5"
            >
              <div className="sm:col-span-6 relative">
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
                  className="w-full h-11 sm:h-10 pl-10 pr-3.5 text-sm sm:text-xs rounded-lg bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#126BEB] dark:focus:border-[#38BDF8] focus:ring-2 focus:ring-[#126BEB]/15"
                />
              </div>

              <StaffFilterSelect
                className="sm:col-span-4"
                ariaLabel="Filter by KYC status"
                options={KYC_MERCHANT_FILTER_OPTIONS}
                value={kycFilter}
                onChange={(val) => {
                  setKycFilter(val);
                  setMerchantPage(1);
                }}
              />

              <div className="sm:col-span-2 flex gap-2">
                <button
                  type="submit"
                  className="flex-1 h-11 sm:h-10 px-4 rounded-lg text-xs font-semibold bg-[#126BEB] hover:bg-[#0E59C9] text-white transition-colors"
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
                    className="h-11 sm:h-10 px-3 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors shrink-0"
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
            <div className="rounded-xl bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800">
              <BaxatoLoader variant="inline" />
            </div>
          ) : merchants.length === 0 ? (
            <div className="rounded-xl bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800 p-10 text-center text-xs text-slate-500">
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
                  return (
                    <article
                      key={m.id}
                      className="p-4 rounded-xl bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800 space-y-3"
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
                        {renderStatusDot(m.kycStatus)}
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                        <div className="min-w-0">
                          <span className="text-slate-500 dark:text-slate-400 block">Business</span>
                          <span className="font-medium text-slate-900 dark:text-white truncate block">
                            {primaryBiz?.name || m.name || 'No business'}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-slate-500 dark:text-slate-400 block">
                            Wallet Balance
                          </span>
                          <span className="font-semibold tabular-nums text-slate-900 dark:text-white">
                            {m.wallets?.formattedMain || '₦0.00'}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedMerchant(m)}
                        className="w-full h-11 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                      >
                        View
                      </button>
                    </article>
                  );
                })}
              </div>

              {/* Desktop Table */}
              <div className="hidden md:block rounded-xl bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div
                  tabIndex={0}
                  role="region"
                  aria-label="Merchants directory table"
                  className="overflow-auto max-h-[68dvh] focus:outline-none"
                >
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-medium">
                      <tr>
                        <th className="py-3 px-4">Owner</th>
                        <th className="py-3 px-4">Primary Business</th>
                        <th className="py-3 px-4">Contact</th>
                        <th className="py-3 px-4">KYC Status</th>
                        <th className="py-3 px-4">Wallet Balance</th>
                        <th className="py-3 px-4">Registered</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                      {merchants.map((m) => {
                        const fullName =
                          [m.ownerFirstName, m.ownerLastName].filter(Boolean).join(' ') ||
                          'Merchant';
                        const primaryBiz = m.primaryBusiness || m.ownerBusinesses?.[0];
                        return (
                          <tr
                            key={m.id}
                            className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition-colors"
                          >
                            <td className="py-3 px-4">
                              <div className="font-medium text-slate-900 dark:text-white">
                                {fullName}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                {m.ownerBusinesses?.length || 1} business
                                {(m.ownerBusinesses?.length || 1) === 1 ? '' : 'es'}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-medium text-slate-900 dark:text-white truncate max-w-[180px]">
                                {primaryBiz?.name || m.name || 'N/A'}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="text-slate-800 dark:text-slate-200 truncate max-w-[190px]">
                                {m.ownerEmail}
                              </div>
                              {m.ownerPhone && (
                                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                  {m.ownerPhone}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-4">{renderStatusDot(m.kycStatus)}</td>
                            <td className="py-3 px-4 font-semibold tabular-nums text-slate-900 dark:text-white">
                              {m.wallets?.formattedMain || '₦0.00'}
                            </td>
                            <td className="py-3 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                              {new Date(m.createdAt).toLocaleDateString('en-NG', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                type="button"
                                onClick={() => setSelectedMerchant(m)}
                                className="px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700/80 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-medium text-slate-900 dark:text-white transition-colors"
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {merchantPagination && merchantPagination.totalPages > 1 && (
                  <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-slate-200 dark:border-slate-800 text-xs">
                    <span className="text-slate-500 dark:text-slate-400">
                      Page <span className="font-medium text-slate-900 dark:text-white">{merchantPagination.page}</span> of{' '}
                      <span className="font-medium text-slate-900 dark:text-white">{merchantPagination.totalPages}</span> ({merchantPagination.totalCount} total)
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={!merchantPagination.hasPrevPage}
                        onClick={() => setMerchantPage((p) => Math.max(1, p - 1))}
                        className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        disabled={!merchantPagination.hasNextPage}
                        onClick={() => setMerchantPage((p) => p + 1)}
                        className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {merchantPagination && merchantPagination.totalPages > 1 && (
                <div className="md:hidden flex items-center justify-between gap-3 pt-1 text-xs">
                  <span className="text-slate-500 dark:text-slate-400">
                    Page {merchantPagination.page} of {merchantPagination.totalPages}
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={!merchantPagination.hasPrevPage}
                      onClick={() => setMerchantPage((p) => Math.max(1, p - 1))}
                      className="h-11 px-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1528] disabled:opacity-40"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      disabled={!merchantPagination.hasNextPage}
                      onClick={() => setMerchantPage((p) => p + 1)}
                      className="h-11 px-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1528] disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* KYC Records Search & Filters */}
          <search>
            <form
              onSubmit={handleKycSearchSubmit}
              className="grid grid-cols-1 sm:grid-cols-12 gap-2.5"
            >
              <div className="sm:col-span-6 relative">
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
                  className="w-full h-11 sm:h-10 pl-10 pr-3.5 text-sm sm:text-xs rounded-lg bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#126BEB] dark:focus:border-[#38BDF8] focus:ring-2 focus:ring-[#126BEB]/15"
                />
              </div>

              <StaffFilterSelect
                className="sm:col-span-4"
                ariaLabel="Filter KYC records by outcome"
                options={KYC_RECORD_FILTER_OPTIONS}
                value={kycStatusFilter}
                onChange={(val) => {
                  setKycStatusFilter(val);
                  setKycPage(1);
                }}
              />

              <div className="sm:col-span-2 flex gap-2">
                <button
                  type="submit"
                  className="flex-1 h-11 sm:h-10 px-4 rounded-lg text-xs font-semibold bg-[#126BEB] hover:bg-[#0E59C9] text-white transition-colors"
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
            <div className="rounded-xl bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800">
              <BaxatoLoader variant="inline" />
            </div>
          ) : kycRecords.length === 0 ? (
            <div className="rounded-xl bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800 p-10 text-center text-xs text-slate-500">
              No verification attempts found.
            </div>
          ) : (
            <>
              {/* Mobile KYC Cards */}
              <div className="md:hidden space-y-3">
                {kycRecords.map((rec) => (
                  <article
                    key={rec.id}
                    className="p-4 rounded-xl bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800 space-y-2.5"
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
                      {renderStatusDot(rec.status)}
                    </div>

                    <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-800/80">
                      <span className="font-mono text-slate-800 dark:text-slate-200">
                        {rec.nin || 'N/A'}
                      </span>
                      <span className="text-slate-500 dark:text-slate-400">
                        {rec.matchScore ? `${rec.matchScore}% match` : rec.dob || '—'}
                      </span>
                    </div>

                    {rec.failureReason && (
                      <p className="text-xs text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/30 p-2.5 rounded-lg">
                        {rec.failureReason}
                      </p>
                    )}
                  </article>
                ))}
              </div>

              {/* Desktop KYC Table */}
              <div className="hidden md:block rounded-xl bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div
                  tabIndex={0}
                  role="region"
                  aria-label="KYC verification records table"
                  className="overflow-auto max-h-[68dvh] focus:outline-none"
                >
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-medium">
                      <tr>
                        <th className="py-3 px-4">Applicant</th>
                        <th className="py-3 px-4">NIN</th>
                        <th className="py-3 px-4">DOB</th>
                        <th className="py-3 px-4">Match</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4">Notes</th>
                        <th className="py-3 px-4 text-right">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                      {kycRecords.map((rec) => (
                        <tr
                          key={rec.id}
                          className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition-colors"
                        >
                          <td className="py-3 px-4">
                            <div className="font-medium text-slate-900 dark:text-white">
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
                          <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                            {rec.dob || '—'}
                          </td>
                          <td className="py-3 px-4 tabular-nums text-slate-800 dark:text-slate-200">
                            {rec.matchScore ? `${rec.matchScore}%` : '—'}
                          </td>
                          <td className="py-3 px-4">{renderStatusDot(rec.status)}</td>
                          <td className="py-3 px-4 text-slate-500 dark:text-slate-400 max-w-[220px] truncate">
                            {rec.failureReason || '—'}
                          </td>
                          <td className="py-3 px-4 text-slate-500 dark:text-slate-400 text-right whitespace-nowrap">
                            {new Date(rec.verifiedAt || rec.createdAt).toLocaleDateString('en-NG', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {kycPagination && kycPagination.totalPages > 1 && (
                  <div className="flex items-center justify-between gap-3 px-4 py-3 border-t border-slate-200 dark:border-slate-800 text-xs">
                    <span className="text-slate-500 dark:text-slate-400">
                      Page <span className="font-medium text-slate-900 dark:text-white">{kycPagination.page}</span> of{' '}
                      <span className="font-medium text-slate-900 dark:text-white">{kycPagination.totalPages}</span> ({kycPagination.totalCount} total)
                    </span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={!kycPagination.hasPrevPage}
                        onClick={() => setKycPage((p) => Math.max(1, p - 1))}
                        className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                      >
                        Previous
                      </button>
                      <button
                        type="button"
                        disabled={!kycPagination.hasNextPage}
                        onClick={() => setKycPage((p) => p + 1)}
                        className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* MERCHANT & BUSINESS SUBMISSION INSPECTOR */}
      <ModalDialog
        isOpen={Boolean(selectedMerchant)}
        onClose={() => setSelectedMerchant(null)}
        ariaLabelledBy="merchant-inspector-title"
        maxWidthClass="max-w-2xl"
        className="bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
      >
        {selectedMerchant && (
          <div className="flex flex-col max-h-[85dvh]">
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-200 dark:border-slate-800">
              <h2
                id="merchant-inspector-title"
                className="text-base font-semibold text-slate-900 dark:text-white"
              >
                Merchant Details
              </h2>
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
              {/* Section 1: Owner Account Details */}
              <section className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Account Details
                  </h3>
                  {renderStatusDot(selectedMerchant.ownerStatus || 'ACTIVE')}
                </div>

                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">Full Name</dt>
                    <dd className="font-medium text-slate-900 dark:text-white mt-0.5">
                      {[
                        selectedMerchant.ownerFirstName,
                        selectedMerchant.ownerMiddleName,
                        selectedMerchant.ownerLastName,
                      ]
                        .filter(Boolean)
                        .join(' ') || '—'}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">Email</dt>
                    <dd className="text-slate-900 dark:text-white mt-0.5 break-all">
                      {selectedMerchant.ownerEmail || '—'}{' '}
                      {selectedMerchant.isEmailVerified ? (
                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400">
                          (Verified)
                        </span>
                      ) : null}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">Phone Number</dt>
                    <dd className="text-slate-900 dark:text-white mt-0.5">
                      {selectedMerchant.ownerPhone || '—'}{' '}
                      {selectedMerchant.isPhoneVerified ? (
                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400">
                          (Verified)
                        </span>
                      ) : null}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">Account Created</dt>
                    <dd className="text-slate-900 dark:text-white mt-0.5">
                      {selectedMerchant.ownerCreatedAt || selectedMerchant.createdAt
                        ? new Date(
                            selectedMerchant.ownerCreatedAt || selectedMerchant.createdAt,
                          ).toLocaleDateString('en-NG', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        : '—'}
                    </dd>
                  </div>
                </dl>
              </section>

              {/* Section 2: Identity Verification */}
              <section className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Identity Verification (NIN)
                  </h3>
                  {renderStatusDot(selectedMerchant.kycStatus)}
                </div>

                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">NIN</dt>
                    <dd className="flex items-center gap-1.5 font-mono font-semibold text-sm text-slate-900 dark:text-white mt-0.5">
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
                    <dd className="text-slate-900 dark:text-white mt-0.5">
                      {selectedMerchant.kycRecord?.dob || selectedMerchant.dob || '—'}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">Gender</dt>
                    <dd className="text-slate-900 dark:text-white mt-0.5">
                      {selectedMerchant.kycRecord?.rawResponse?.responseBody?.gender ||
                        selectedMerchant.ninData?.gender ||
                        '—'}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">NIMC Phone</dt>
                    <dd className="text-slate-900 dark:text-white mt-0.5">
                      {selectedMerchant.kycRecord?.rawResponse?.responseBody?.mobileNumber ||
                        selectedMerchant.ninData?.mobileNumber ||
                        '—'}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">Match Score</dt>
                    <dd className="tabular-nums text-slate-900 dark:text-white mt-0.5">
                      {selectedMerchant.kycRecord?.matchScore
                        ? `${selectedMerchant.kycRecord.matchScore}%`
                        : '—'}
                    </dd>
                  </div>

                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">Verified Date</dt>
                    <dd className="text-slate-900 dark:text-white mt-0.5">
                      {selectedMerchant.kycRecord?.verifiedAt
                        ? new Date(selectedMerchant.kycRecord.verifiedAt).toLocaleDateString(
                            'en-NG',
                            {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            },
                          )
                        : '—'}
                    </dd>
                  </div>
                </dl>

                {selectedMerchant.kycRecord?.failureReason && (
                  <div className="p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs">
                    {selectedMerchant.kycRecord.failureReason}
                  </div>
                )}
              </section>

              {/* Section 3: Submitted Business Details */}
              <section className="space-y-3">
                <div className="border-b border-slate-200 dark:border-slate-800 pb-2">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Businesses ({selectedMerchant.ownerBusinesses?.length || 1})
                  </h3>
                </div>

                <div className="space-y-3">
                  {(selectedMerchant.ownerBusinesses && selectedMerchant.ownerBusinesses.length > 0
                    ? selectedMerchant.ownerBusinesses
                    : [
                        {
                          id: selectedMerchant.businessId || selectedMerchant.id,
                          name: selectedMerchant.name,
                          slug: selectedMerchant.slug,
                          email: selectedMerchant.ownerEmail,
                          phoneNumber: selectedMerchant.ownerPhone,
                          websiteUrl: '',
                          status: selectedMerchant.status,
                          country: selectedMerchant.country,
                          state: selectedMerchant.state,
                          lga: selectedMerchant.lga,
                          createdAt: selectedMerchant.createdAt,
                          wallets: selectedMerchant.wallets,
                        },
                      ]
                  ).map((biz: any, idx: number) => {
                    const safeWebsite = getSafeExternalUrl(biz.websiteUrl);
                    return (
                      <div
                        key={biz.id || idx}
                        className="p-4 rounded-xl bg-slate-50/70 dark:bg-[#070D18] border border-slate-200 dark:border-slate-800 space-y-3"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-200/70 dark:border-slate-800">
                          <div>
                            <div className="text-sm font-semibold text-slate-900 dark:text-white">
                              {biz.name}
                            </div>
                            <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                              {biz.slug || biz.id}
                            </div>
                          </div>

                          <div className="flex items-center gap-2.5">
                            {renderStatusDot(biz.status || 'ACTIVE')}
                            <span className="font-semibold tabular-nums text-slate-900 dark:text-white">
                              {biz.wallets?.formattedMain || '₦0.00'}
                            </span>
                          </div>
                        </div>

                        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          <div>
                            <dt className="text-slate-500 dark:text-slate-400">Business Email</dt>
                            <dd className="text-slate-900 dark:text-white mt-0.5 break-all">
                              {biz.email || '—'}
                            </dd>
                          </div>

                          <div>
                            <dt className="text-slate-500 dark:text-slate-400">Business Phone</dt>
                            <dd className="text-slate-900 dark:text-white mt-0.5">
                              {biz.phoneNumber || '—'}
                            </dd>
                          </div>

                          <div>
                            <dt className="text-slate-500 dark:text-slate-400">Website</dt>
                            <dd className="mt-0.5 truncate">
                              {safeWebsite ? (
                                <a
                                  href={safeWebsite}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[#126BEB] dark:text-[#38BDF8] hover:underline"
                                >
                                  {biz.websiteUrl}
                                </a>
                              ) : (
                                <span className="text-slate-900 dark:text-white">
                                  {biz.websiteUrl || '—'}
                                </span>
                              )}
                            </dd>
                          </div>

                          <div>
                            <dt className="text-slate-500 dark:text-slate-400">Location</dt>
                            <dd className="text-slate-900 dark:text-white mt-0.5">
                              {[biz.lga, biz.state, biz.country].filter(Boolean).join(', ') || '—'}
                            </dd>
                          </div>

                          {biz.initialName && biz.initialName !== biz.name && (
                            <div className="sm:col-span-2">
                              <dt className="text-slate-500 dark:text-slate-400">Initial Name</dt>
                              <dd className="text-slate-900 dark:text-white mt-0.5">
                                {biz.initialName}
                                {Array.isArray(biz.nameHistory) && biz.nameHistory.length > 0 && (
                                  <span className="text-slate-500 dark:text-slate-400 ml-2">
                                    (Renames: {biz.nameHistory.length}/3)
                                  </span>
                                )}
                              </dd>
                            </div>
                          )}

                          <div>
                            <dt className="text-slate-500 dark:text-slate-400">Registered Date</dt>
                            <dd className="text-slate-900 dark:text-white mt-0.5">
                              {biz.createdAt
                                ? new Date(biz.createdAt).toLocaleDateString('en-NG', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                  })
                                : '—'}
                            </dd>
                          </div>

                          {biz.id && (
                            <div className="flex items-end sm:justify-end">
                              <Link
                                href={`/staff/transactions?businessId=${encodeURIComponent(biz.id)}`}
                                onClick={() => setSelectedMerchant(null)}
                                className="inline-flex items-center gap-1 font-medium text-[#126BEB] dark:text-[#38BDF8] hover:underline"
                              >
                                <span>View transactions</span>
                                <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                              </Link>
                            </div>
                          )}
                        </dl>
                      </div>
                    );
                  })}
                </div>
              </section>
            </div>

            <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#070D18]/60 flex justify-end">
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
