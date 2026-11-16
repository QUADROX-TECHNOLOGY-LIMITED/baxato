'use client';

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Check,
  Clock,
  Copy,
  ExternalLink,
  Eye,
  RefreshCw,
  Search,
  X,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import Sidebar from '@/components/dashboard/Sidebar';
import Header from '@/components/dashboard/Header';
import KycBanner from '@/components/dashboard/KycBanner';
import KycModal from '@/components/dashboard/KycModal';
import AccessRestricted from '@/components/dashboard/AccessRestricted';
import ModalDialog from '@/components/ModalDialog';
import BaxatoLoader from '@/components/BaxatoLoader';
import {
  clearSessionAndRedirect,
  getStoredAuthToken,
  getStoredBusiness,
  getStoredUser,
  handleAuthResponse,
} from '@/lib/auth-session';
import { showToast } from '@/lib/toast';

export interface WebhookDeliveryLog {
  id: string;
  eventType: string;
  payload?: unknown;
  status: 'PENDING' | 'SUCCESSFUL' | 'FAILED';
  attempts: number;
  lastAttemptAt?: string | null;
  nextRetryAt?: string | null;
  responseStatus?: number | null;
  responseBody?: string | null;
  createdAt: string;
}

type StatusFilter = 'ALL' | 'SUCCESSFUL' | 'PENDING' | 'FAILED';

const ALLOWED_ROLES = new Set(['BUSINESS_OWNER', 'BUSINESS_ADMIN', 'DEVELOPER']);

function renderDeliveryStatusBadge(item: WebhookDeliveryLog) {
  if (item.status === 'SUCCESSFUL') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>{item.responseStatus || 200} OK</span>
      </span>
    );
  }
  if (item.status === 'PENDING') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400">
        <Clock className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>Pending</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400">
      <XCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>{item.responseStatus ? `HTTP ${item.responseStatus}` : 'Failed'}</span>
    </span>
  );
}

export default function WebhookEventsPage() {
  const payloadTitleId = useId();
  const searchInputId = useId();

  const tabRefs = useRef<Record<StatusFilter, HTMLButtonElement | null>>({
    ALL: null,
    SUCCESSFUL: null,
    PENDING: null,
    FAILED: null,
  });

  const [businessName, setBusinessName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return getStoredBusiness()?.name || '';
    }
    return '';
  });
  const [merchantName, setMerchantName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return getStoredUser()?.firstName || '';
    }
    return '';
  });
  const [kycStatus, setKycStatus] = useState<string>('INITIALIZING');
  const [userRole, setUserRole] = useState<string>('BUSINESS_OWNER');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isKycModalOpen, setIsKycModalOpen] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [deliveries, setDeliveries] = useState<WebhookDeliveryLog[]>([]);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [selectedDelivery, setSelectedDelivery] = useState<WebhookDeliveryLog | null>(null);
  const [copiedPayload, setCopiedPayload] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const canAccessWebhooks = ALLOWED_ROLES.has(userRole);

  const getAuthHeaders = useCallback((): Record<string, string> => {
    const authToken = getStoredAuthToken();
    const storedBiz = getStoredBusiness();
    return {
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(storedBiz?.id ? { 'x-business-id': storedBiz.id } : {}),
    };
  }, []);

  const loadDeliveries = useCallback(async () => {
    try {
      const res = await fetch('/api/developer/webhooks/deliveries?limit=50', {
        headers: getAuthHeaders(),
        cache: 'no-store',
      });
      const data = await res.json().catch(() => null);
      if (handleAuthResponse(res, data)) return;
      if (res.ok && data?.success && Array.isArray(data.data?.deliveries)) {
        setDeliveries(data.data.deliveries);
      } else {
        setDeliveries([]);
      }
    } catch {
      setDeliveries([]);
    }
  }, [getAuthHeaders]);

  const syncUserProfile = useCallback(async () => {
    try {
      const currentToken = getStoredAuthToken();
      if (!currentToken) return;
      const res = await fetch('/api/users/me', {
        headers: { Authorization: `Bearer ${currentToken}` },
        cache: 'no-store',
      });
      const data = await res.json().catch(() => null);
      if (handleAuthResponse(res, data)) return;
      if (res.ok && data?.success && data.data) {
        const userData = data.data.user || data.data;
        if (userData.kycStatus) setKycStatus(userData.kycStatus);
        if (userData.firstName) setMerchantName(userData.firstName);
      }
    } catch {}
  }, []);

  useEffect(() => {
    const token = getStoredAuthToken();
    if (!token) {
      clearSessionAndRedirect('expired');
      return;
    }

    let role = 'BUSINESS_OWNER';
    try {
      const storedUser = getStoredUser();
      const storedBiz = getStoredBusiness();

      if (storedBiz?.role) {
        role = storedBiz.role;
        setUserRole(storedBiz.role);
      } else if (storedUser?.role) {
        role = storedUser.role;
        setUserRole(storedUser.role);
      }
      if (storedUser?.firstName) setMerchantName(storedUser.firstName);
      if (storedUser?.kycStatus) setKycStatus(storedUser.kycStatus);
      else setKycStatus('UNVERIFIED');
      if (storedBiz?.name) setBusinessName(storedBiz.name);
    } catch {}

    let isMounted = true;
    const initializePage = async () => {
      try {
        if (ALLOWED_ROLES.has(role)) {
          await Promise.all([loadDeliveries(), syncUserProfile()]);
        } else {
          await syncUserProfile();
        }
      } finally {
        if (isMounted) {
          setIsInitialLoading(false);
        }
      }
    };

    void initializePage();

    const handleBizSwitched = () => {
      let switchedRole = 'BUSINESS_OWNER';
      try {
        const b = getStoredBusiness();
        if (b?.name) setBusinessName(b.name);
        if (b?.role) {
          switchedRole = b.role;
          setUserRole(b.role);
        }
      } catch {}
      if (ALLOWED_ROLES.has(switchedRole)) {
        void loadDeliveries();
      }
    };

    window.addEventListener('bx_business_switched', handleBizSwitched);
    return () => {
      isMounted = false;
      window.removeEventListener('bx_business_switched', handleBizSwitched);
    };
  }, [loadDeliveries, syncUserProfile]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadDeliveries();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleRetry = async (deliveryId: string) => {
    setRetryingId(deliveryId);
    try {
      const res = await fetch(`/api/developer/webhooks/deliveries/${deliveryId}/retry`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      const data = await res.json().catch(() => null);
      if (handleAuthResponse(res, data)) return;
      if (res.ok && data?.success) {
        showToast({ type: 'success', message: 'Webhook delivery sent' });
        void loadDeliveries();
      } else {
        showToast({ type: 'error', message: data?.error?.message || 'Unable to retry delivery.' });
      }
    } catch {
      showToast({ type: 'error', message: 'Network error retrying delivery.' });
    } finally {
      setRetryingId(null);
    }
  };

  const filteredDeliveries = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return deliveries.filter((d) => {
      if (statusFilter !== 'ALL' && d.status !== statusFilter) return false;
      if (!query) return true;
      return `${d.eventType} ${d.responseStatus ?? ''} ${d.status}`.toLowerCase().includes(query);
    });
  }, [deliveries, statusFilter, searchQuery]);

  const handleTabKeyDown = (e: React.KeyboardEvent, idx: number) => {
    const order: StatusFilter[] = ['ALL', 'SUCCESSFUL', 'PENDING', 'FAILED'];
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      const next = order[(idx + 1) % order.length]!;
      setStatusFilter(next);
      tabRefs.current[next]?.focus();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      const prev = order[(idx - 1 + order.length) % order.length]!;
      setStatusFilter(prev);
      tabRefs.current[prev]?.focus();
    }
  };

  if (isInitialLoading) {
    return <BaxatoLoader variant="fullscreen" />;
  }

  return (
    <div className="min-h-screen bg-[#FFFFFF] dark:bg-[#070D18] text-slate-800 dark:text-slate-100 flex flex-col lg:flex-row transition-colors duration-150">
      <Sidebar
        businessName={businessName}
        merchantName={merchantName}
        kycStatus={kycStatus}
        userRole={userRole}
        onOpenKycModal={() => setIsKycModalOpen(true)}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 lg:pl-72">
        <Header
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onOpenKycModal={() => setIsKycModalOpen(true)}
          merchantName={merchantName}
          businessName={businessName}
          kycStatus={kycStatus}
          userRole={userRole}
          isRefreshing={isRefreshing}
          onRefresh={handleRefresh}
          sticky={false}
        />

        <main className="flex-1 px-4 py-5 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full space-y-6">
          {!canAccessWebhooks ? (
            <AccessRestricted description="Webhook configuration and delivery logs are restricted to Workspace Owners, Administrators, and Developers." />
          ) : (
            <>
              <KycBanner
                kycStatus={kycStatus}
                userRole={userRole}
                onOpenKycModal={() => setIsKycModalOpen(true)}
              />

              {/* Top Navigation */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                  <span>Back to Dashboard</span>
                </Link>

                <div className="flex items-center gap-2">
                  <Link
                    href="/dashboard/developer"
                    className="inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
                  >
                    <span>API Keys</span>
                    <ExternalLink className="w-3.5 h-3.5 text-[#126BEB] dark:text-[#38BDF8]" aria-hidden="true" />
                  </Link>

                  <button
                    type="button"
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    aria-label="Refresh webhook deliveries"
                    className="inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1528] text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#126BEB]' : 'text-slate-400'}`}
                      aria-hidden="true"
                    />
                    <span className="hidden sm:inline">Refresh</span>
                  </button>
                </div>
              </div>

              {/* Page Heading */}
              <div className="pb-5 border-b border-slate-200/80 dark:border-slate-800/80">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                  Webhooks
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  Delivery attempts, HTTP response codes, and payload logs.
                </p>
              </div>

              {/* Filter & Search Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div
                  role="tablist"
                  aria-label="Filter webhook deliveries by status"
                  className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-[#0B1528] rounded-lg border border-slate-200 dark:border-slate-800 overflow-x-auto"
                >
                  {([
                    { id: 'ALL' as const, label: 'All' },
                    { id: 'SUCCESSFUL' as const, label: 'Successful' },
                    { id: 'PENDING' as const, label: 'Pending' },
                    { id: 'FAILED' as const, label: 'Failed' },
                  ]).map((tab, idx) => {
                    const isSelected = statusFilter === tab.id;
                    return (
                      <button
                        key={tab.id}
                        ref={(el) => {
                          tabRefs.current[tab.id] = el;
                        }}
                        type="button"
                        role="tab"
                        aria-selected={isSelected}
                        tabIndex={isSelected ? 0 : -1}
                        onClick={() => setStatusFilter(tab.id)}
                        onKeyDown={(e) => handleTabKeyDown(e, idx)}
                        className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
                          isSelected
                            ? 'bg-white dark:bg-[#126BEB] text-slate-900 dark:text-white shadow-xs'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        {tab.label}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-3">
                  <search className="relative flex-1 sm:w-64">
                    <label htmlFor={searchInputId} className="sr-only">
                      Filter webhook deliveries
                    </label>
                    <Search
                      className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                      aria-hidden="true"
                    />
                    <input
                      id={searchInputId}
                      type="search"
                      autoCorrect="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      placeholder="Filter event or HTTP code..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full h-10 pl-9 pr-3 text-xs sm:text-sm rounded-lg bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#126BEB]"
                    />
                  </search>
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap tabular-nums shrink-0">
                    {filteredDeliveries.length} {filteredDeliveries.length === 1 ? 'record' : 'records'}
                  </span>
                </div>
              </div>

              {/* Delivery List / Responsive Table */}
              <div className="rounded-2xl bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800 overflow-hidden">
                {filteredDeliveries.length === 0 ? (
                  <div className="py-12 px-4 text-center space-y-2">
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                      No webhook deliveries found.
                    </p>
                    {(statusFilter !== 'ALL' || searchQuery) && (
                      <button
                        type="button"
                        onClick={() => {
                          setStatusFilter('ALL');
                          setSearchQuery('');
                        }}
                        className="text-xs font-semibold text-[#126BEB] dark:text-[#38BDF8] hover:underline cursor-pointer"
                      >
                        Reset filters
                      </button>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Desktop Table */}
                    <div
                      tabIndex={0}
                      role="region"
                      aria-label="Webhook delivery logs"
                      className="hidden md:block overflow-x-auto focus:outline-none"
                    >
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-semibold bg-slate-50/70 dark:bg-[#070D18]/70">
                            <th scope="col" className="py-3 px-4">
                              Event
                            </th>
                            <th scope="col" className="py-3 px-4">
                              Status
                            </th>
                            <th scope="col" className="py-3 px-4">
                              Attempts
                            </th>
                            <th scope="col" className="py-3 px-4">
                              Date
                            </th>
                            <th scope="col" className="py-3 px-4 text-right">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                          {filteredDeliveries.map((item) => (
                            <tr
                              key={item.id}
                              className="hover:bg-slate-50/70 dark:hover:bg-[#0E1930]/60 transition-colors"
                            >
                              <th scope="row" className="py-3 px-4 font-mono font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                                {item.eventType}
                              </th>
                              <td className="py-3 px-4 whitespace-nowrap">
                                {renderDeliveryStatusBadge(item)}
                              </td>
                              <td className="py-3 px-4 text-slate-600 dark:text-slate-300 tabular-nums whitespace-nowrap">
                                {item.attempts}
                              </td>
                              <td className="py-3 px-4 text-slate-500 dark:text-slate-400 tabular-nums whitespace-nowrap">
                                {new Date(item.createdAt).toLocaleString('en-NG', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </td>
                              <td className="py-3 px-4 text-right whitespace-nowrap">
                                <div className="inline-flex items-center justify-end gap-2">
                                  {Boolean(item.payload) && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setCopiedPayload(false);
                                        setSelectedDelivery(item);
                                      }}
                                      className="h-8 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1 transition-colors cursor-pointer"
                                    >
                                      <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                                      <span>Payload</span>
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => handleRetry(item.id)}
                                    disabled={retryingId === item.id}
                                    className="h-8 px-3 rounded-lg bg-[#126BEB] hover:bg-[#0B5CC7] text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                                  >
                                    {retryingId === item.id ? 'Sending...' : 'Re-send'}
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Stacked List */}
                    <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800/80">
                      {filteredDeliveries.map((item) => (
                        <div key={item.id} className="p-4 space-y-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-mono text-xs font-semibold text-slate-900 dark:text-white break-all">
                              {item.eventType}
                            </span>
                            {renderDeliveryStatusBadge(item)}
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                            <span className="tabular-nums">
                              {item.attempts} {item.attempts === 1 ? 'attempt' : 'attempts'}
                            </span>
                            <span className="tabular-nums">
                              {new Date(item.createdAt).toLocaleString('en-NG', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 pt-1">
                            {Boolean(item.payload) && (
                              <button
                                type="button"
                                onClick={() => {
                                  setCopiedPayload(false);
                                  setSelectedDelivery(item);
                                }}
                                className="flex-1 h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 inline-flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>Payload</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRetry(item.id)}
                              disabled={retryingId === item.id}
                              className="flex-1 h-9 px-3 rounded-lg bg-[#126BEB] hover:bg-[#0B5CC7] text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                            >
                              {retryingId === item.id ? 'Sending...' : 'Re-send'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </main>
      </div>

      {/* Native Payload Viewer Dialog */}
      <ModalDialog
        isOpen={Boolean(selectedDelivery)}
        onClose={() => setSelectedDelivery(null)}
        ariaLabelledBy={payloadTitleId}
        maxWidthClass="max-w-lg"
        className="dark:bg-[#0B1528] text-slate-900 dark:text-white"
      >
        {selectedDelivery && (
          <div className="p-5 sm:p-6 space-y-4">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <div className="min-w-0">
                <h2 id={payloadTitleId} className="text-sm font-semibold text-slate-900 dark:text-white truncate font-mono">
                  {selectedDelivery.eventType}
                </h2>
                <div className="mt-1">{renderDeliveryStatusBadge(selectedDelivery)}</div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDelivery(null)}
                aria-label="Close payload dialog"
                className="relative p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 after:content-[''] after:absolute after:-inset-2 cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900 dark:bg-[#060D18] border border-slate-800 max-h-72 overflow-auto min-w-0">
              <pre className="text-xs font-mono text-emerald-400 whitespace-pre-wrap break-all leading-relaxed">
                {JSON.stringify(selectedDelivery.payload, null, 2)}
              </pre>
            </div>

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => {
                  const raw = JSON.stringify(selectedDelivery.payload, null, 2);
                  if (typeof navigator !== 'undefined' && navigator.clipboard) {
                    void navigator.clipboard.writeText(raw);
                  }
                  setCopiedPayload(true);
                  showToast({ type: 'success', message: 'Payload copied' });
                  setTimeout(() => setCopiedPayload(false), 1800);
                }}
                className="flex-1 h-11 rounded-lg border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                {copiedPayload ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" aria-hidden="true" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Copy JSON</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setSelectedDelivery(null)}
                className="flex-1 h-11 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs sm:text-sm font-semibold hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </ModalDialog>

      <KycModal
        isOpen={isKycModalOpen}
        onClose={() => setIsKycModalOpen(false)}
        onSuccess={() => setKycStatus('VERIFIED')}
      />
    </div>
  );
}
