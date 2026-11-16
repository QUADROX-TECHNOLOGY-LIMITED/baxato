'use client';

import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  KeyRound,
  RefreshCw,
  ScrollText,
  Search,
  User as UserIcon,
  X,
} from 'lucide-react';
import Sidebar from '@/components/dashboard/Sidebar';
import Header from '@/components/dashboard/Header';
import KycBanner from '@/components/dashboard/KycBanner';
import KycModal from '@/components/dashboard/KycModal';
import AccessRestricted from '@/components/dashboard/AccessRestricted';
import BaxatoLoader from '@/components/BaxatoLoader';
import {
  clearSessionAndRedirect,
  getStoredAuthToken,
  getStoredBusiness,
  getStoredUser,
  handleAuthResponse,
} from '@/lib/auth-session';
import { showToast } from '@/lib/toast';

type LogCategory = 'transaction' | 'team' | 'developer' | 'business' | 'system';

interface BusinessLogActor {
  type: 'USER' | 'API_KEY';
  id: string | null;
  name: string;
  email: string | null;
  detail: string;
}

interface BusinessAuditLogEntry {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string;
  ipAddress: string | null;
  userAgent: string | null;
  deviceName: string | null;
  source: 'DASHBOARD' | 'API_KEY';
  actor: BusinessLogActor;
  title: string;
  description: string;
  category: LogCategory | string;
  createdAt: string;
}

const PAGE_LIMIT = 25;

const CATEGORY_LABELS: Record<string, string> = {
  transaction: 'Transactions',
  team: 'Team',
  developer: 'Developer',
  business: 'Workspace',
  system: 'System',
};

function formatDisplayIp(ip?: string | null): string {
  if (!ip) return '—';
  const trimmed = ip.trim().replace(/^::ffff:/i, '');
  if (trimmed === '::1' || trimmed === '127.0.0.1') return 'Localhost (127.0.0.1)';
  return trimmed;
}

function formatTimestamp(dateStr?: string | null): string {
  if (!dateStr) return '—';
  const dt = new Date(dateStr);
  if (Number.isNaN(dt.getTime())) return '—';
  return dt.toLocaleString('en-NG', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatFallbackTitle(action: string): string {
  return action
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((w, idx) => (idx === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ');
}

export default function BusinessLogsPage() {
  const [isHydrated, setIsHydrated] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isKycModalOpen, setIsKycModalOpen] = useState(false);

  const [merchantName, setMerchantName] = useState('');
  const [userFirstName, setUserFirstName] = useState('');
  const [userLastName, setUserLastName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [kycStatus, setKycStatus] = useState('UNVERIFIED');
  const [userRole, setUserRole] = useState('');
  const [businessId, setBusinessId] = useState('');

  const [logs, setLogs] = useState<BusinessAuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sourceFilter, setSourceFilter] = useState('ALL');

  const searchFieldId = useId();
  const categoryFieldId = useId();
  const sourceFieldId = useId();
  const tableTitleId = useId();
  const latestFetchIdRef = useRef(0);

  const syncSessionContext = useCallback(() => {
    const token = getStoredAuthToken();
    const user = getStoredUser();
    const biz = getStoredBusiness();
    if (!token || !user) {
      clearSessionAndRedirect('expired');
      return null;
    }

    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    const role = (biz?.role || user.role || 'VIEWER').toUpperCase();
    setMerchantName(fullName || user.email || 'Merchant');
    setUserFirstName(user.firstName || '');
    setUserLastName(user.lastName || '');
    setBusinessName(biz?.name || 'Workspace');
    setBusinessId(biz?.id || '');
    setKycStatus((user.kycStatus || 'UNVERIFIED').toUpperCase());
    setUserRole(role);
    setIsHydrated(true);
    return { token, bizId: biz?.id || '', role };
  }, []);

  const fetchBusinessLogs = useCallback(
    async (opts?: { silent?: boolean; targetOffset?: number; targetBizId?: string; targetRole?: string }) => {
      const token = getStoredAuthToken();
      const biz = getStoredBusiness();
      const user = getStoredUser();
      const resolvedBizId = opts?.targetBizId ?? biz?.id ?? businessId;
      const resolvedRole = (opts?.targetRole ?? biz?.role ?? user?.role ?? userRole ?? '').toUpperCase();

      if (!token) {
        clearSessionAndRedirect('expired');
        return;
      }

      if (!['BUSINESS_OWNER', 'BUSINESS_ADMIN', 'SUPER_ADMIN'].includes(resolvedRole)) {
        setLogs([]);
        setTotal(0);
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      if (!resolvedBizId) {
        setLogs([]);
        setTotal(0);
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      const fetchId = ++latestFetchIdRef.current;
      const effectiveOffset = opts?.targetOffset ?? offset;

      if (opts?.silent) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        const params = new URLSearchParams({
          limit: String(PAGE_LIMIT),
          offset: String(effectiveOffset),
          category: categoryFilter,
          source: sourceFilter,
        });
        if (debouncedSearch.trim()) {
          params.set('search', debouncedSearch.trim());
        }

        const res = await fetch(`/api/audit-logs/business?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'x-business-id': resolvedBizId,
          },
          cache: 'no-store',
        });

        const json = await res.json().catch(() => null);
        if (handleAuthResponse(res, json)) return;
        if (fetchId !== latestFetchIdRef.current) return;

        if (!res.ok || !json?.success) {
          throw new Error(json?.error?.message || 'Unable to load workspace logs.');
        }

        setLogs(Array.isArray(json.data?.logs) ? json.data.logs : []);
        setTotal(typeof json.data?.total === 'number' ? json.data.total : 0);
      } catch (err) {
        if (fetchId === latestFetchIdRef.current) {
          showToast({
            type: 'error',
            title: 'Unable to load logs',
            message: err instanceof Error ? err.message : 'Please try again.',
          });
        }
      } finally {
        if (fetchId === latestFetchIdRef.current) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    },
    [businessId, categoryFilter, debouncedSearch, offset, sourceFilter, userRole],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setOffset(0);
      setDebouncedSearch(searchInput);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const ctx = syncSessionContext();
    if (!ctx) return;

    const handleBusinessSwitch = () => {
      const updated = syncSessionContext();
      setOffset(0);
      if (updated) {
        fetchBusinessLogs({
          silent: true,
          targetOffset: 0,
          targetBizId: updated.bizId,
          targetRole: updated.role,
        });
      }
    };

    window.addEventListener('bx_business_switched', handleBusinessSwitch);
    return () => {
      window.removeEventListener('bx_business_switched', handleBusinessSwitch);
    };
  }, [fetchBusinessLogs, syncSessionContext]);

  useEffect(() => {
    if (!isHydrated) return;
    fetchBusinessLogs();
  }, [fetchBusinessLogs, isHydrated]);

  const handleKycSuccess = (updatedUser: any) => {
    setKycStatus('VERIFIED');
    if (updatedUser?.firstName) {
      setUserFirstName(updatedUser.firstName);
      setMerchantName(
        `${updatedUser.firstName} ${updatedUser.lastName || userLastName || ''}`.trim(),
      );
    }
    if (updatedUser?.lastName) {
      setUserLastName(updatedUser.lastName);
    }
    setIsKycModalOpen(false);
    showToast({
      type: 'success',
      title: 'Identity verified',
      message: 'Your account verification is complete.',
    });
  };

  if (!isHydrated) {
    return <BaxatoLoader variant="fullscreen" />;
  }

  const canViewBusinessLogs = ['BUSINESS_OWNER', 'BUSINESS_ADMIN', 'SUPER_ADMIN'].includes(
    userRole,
  );
  const startCount = total === 0 ? 0 : offset + 1;
  const endCount = Math.min(offset + logs.length, total);

  return (
    <div className="min-h-screen bg-[#FFFFFF] dark:bg-[#070D18] text-slate-900 dark:text-slate-100 flex flex-col lg:flex-row transition-colors duration-150">
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
          onRefresh={() => fetchBusinessLogs({ silent: true })}
          sticky={false}
        />

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-6">
          <KycBanner
            kycStatus={kycStatus}
            userRole={userRole}
            onOpenKycModal={() => setIsKycModalOpen(true)}
          />

          {!canViewBusinessLogs ? (
            <AccessRestricted
              title="Access Restricted"
              description="Only Workspace Owners and Administrators can view business audit logs."
            />
          ) : (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                    Business Logs
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Workspace activity across team members, API keys, webhooks, and transactions for{' '}
                    {businessName || 'your workspace'}.
                  </p>
                </div>
              </div>

              <search>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    setOffset(0);
                    setDebouncedSearch(searchInput);
                  }}
                  className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
                >
                  <div className="relative flex-1 sm:max-w-sm">
                    <label htmlFor={searchFieldId} className="sr-only">
                      Search workspace audit logs
                    </label>
                    <Search
                      className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                      aria-hidden="true"
                    />
                    <input
                      id={searchFieldId}
                      name="q"
                      type="search"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      placeholder="Search activity, member, API key, or IP..."
                      autoCorrect="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      className="w-full h-11 pl-10 pr-9 text-base sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#126BEB] focus:border-transparent"
                    />
                    {searchInput && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearchInput('');
                          setDebouncedSearch('');
                          setOffset(0);
                        }}
                        aria-label="Clear search"
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="relative sm:w-44">
                    <label htmlFor={categoryFieldId} className="sr-only">
                      Filter logs by category
                    </label>
                    <select
                      id={categoryFieldId}
                      name="category"
                      value={categoryFilter}
                      onChange={(e) => {
                        setCategoryFilter(e.target.value);
                        setOffset(0);
                      }}
                      className="w-full h-11 appearance-none pl-3.5 pr-9 text-base sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#126BEB] focus:border-transparent cursor-pointer"
                    >
                      <option value="all">All categories</option>
                      <option value="transaction">Transactions</option>
                      <option value="team">Team</option>
                      <option value="developer">Developer</option>
                      <option value="business">Workspace</option>
                    </select>
                    <ChevronDown
                      className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                      aria-hidden="true"
                    />
                  </div>

                  <div className="relative sm:w-40">
                    <label htmlFor={sourceFieldId} className="sr-only">
                      Filter logs by source
                    </label>
                    <select
                      id={sourceFieldId}
                      name="source"
                      value={sourceFilter}
                      onChange={(e) => {
                        setSourceFilter(e.target.value);
                        setOffset(0);
                      }}
                      className="w-full h-11 appearance-none pl-3.5 pr-9 text-base sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#126BEB] focus:border-transparent cursor-pointer"
                    >
                      <option value="ALL">All sources</option>
                      <option value="DASHBOARD">Dashboard</option>
                      <option value="API_KEY">API Key</option>
                    </select>
                    <ChevronDown
                      className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                      aria-hidden="true"
                    />
                  </div>
                </form>
              </search>

              <section className="bg-[#FFFFFF] dark:bg-[#0B1528] rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <h2
                      id={tableTitleId}
                      className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                    >
                      Workspace Activity
                    </h2>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 tabular-nums">
                      {total}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => fetchBusinessLogs({ silent: true })}
                    disabled={isLoading || isRefreshing}
                    aria-label="Refresh business logs"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw
                      className={`w-4 h-4 ${isLoading || isRefreshing ? 'animate-spin text-[#126BEB]' : ''}`}
                      aria-hidden="true"
                    />
                  </button>
                </div>

                {isLoading ? (
                  <div className="p-5 space-y-3">
                    {Array.from({ length: 6 }).map((_, idx) => (
                      <div
                        key={idx}
                        className="h-12 rounded-xl bg-slate-100 dark:bg-slate-800/50 animate-pulse"
                      />
                    ))}
                  </div>
                ) : logs.length === 0 ? (
                  <div className="py-14 px-4 text-center space-y-2 text-slate-500 dark:text-slate-400">
                    <ScrollText
                      className="w-7 h-7 mx-auto text-slate-300 dark:text-slate-600"
                      aria-hidden="true"
                    />
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                      {debouncedSearch || categoryFilter !== 'all' || sourceFilter !== 'ALL'
                        ? 'No matching workspace events found'
                        : 'No workspace activity recorded yet'}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Team changes, API key events, webhooks, and transactions will appear here.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Desktop Scrollable Table with Sticky Header */}
                    <div
                      tabIndex={0}
                      role="region"
                      aria-labelledby={tableTitleId}
                      className="hidden md:block overflow-x-auto max-h-[620px]"
                    >
                      <table className="w-full text-left border-collapse text-xs sm:text-sm">
                        <thead className="sticky top-0 z-10 bg-slate-50/95 dark:bg-[#081020]/95 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
                          <tr>
                            <th scope="col" className="py-3 px-5">
                              Activity
                            </th>
                            <th scope="col" className="py-3 px-4">
                              Actor
                            </th>
                            <th scope="col" className="py-3 px-4">
                              Source
                            </th>
                            <th scope="col" className="py-3 px-4">
                              Category
                            </th>
                            <th scope="col" className="py-3 px-4">
                              Device &amp; IP
                            </th>
                            <th scope="col" className="py-3 px-5 text-right">
                              Time
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                          {logs.map((log) => {
                            const title = log.title || formatFallbackTitle(log.action);
                            const isApiKey = log.source === 'API_KEY' || log.actor.type === 'API_KEY';

                            return (
                              <tr
                                key={log.id}
                                className="hover:bg-slate-50/60 dark:hover:bg-slate-800/20 transition-colors"
                              >
                                <th scope="row" className="py-3.5 px-5 font-normal text-left">
                                  <p className="font-medium text-slate-900 dark:text-white text-xs sm:text-sm">
                                    {title}
                                  </p>
                                  {log.description && (
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                      {log.description}
                                    </p>
                                  )}
                                </th>
                                <td className="py-3.5 px-4 whitespace-nowrap">
                                  <div className="flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0">
                                      {isApiKey ? (
                                        <KeyRound className="w-3.5 h-3.5" aria-hidden="true" />
                                      ) : (
                                        <UserIcon className="w-3.5 h-3.5" aria-hidden="true" />
                                      )}
                                    </span>
                                    <div className="min-w-0">
                                      <p className="text-xs font-medium text-slate-900 dark:text-white truncate max-w-[180px]">
                                        {log.actor.name}
                                      </p>
                                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[180px]">
                                        {log.actor.detail}
                                      </p>
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3.5 px-4 whitespace-nowrap">
                                  <span
                                    className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${
                                      isApiKey
                                        ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-200/80 dark:border-sky-800/60'
                                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-700'
                                    }`}
                                  >
                                    {isApiKey ? 'API Key' : 'Dashboard'}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 whitespace-nowrap">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
                                    {CATEGORY_LABELS[log.category] || 'Workspace'}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 whitespace-nowrap">
                                  <p className="text-xs text-slate-700 dark:text-slate-300">
                                    {log.deviceName || '—'}
                                  </p>
                                  <p className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                                    {formatDisplayIp(log.ipAddress)}
                                  </p>
                                </td>
                                <td className="py-3.5 px-5 text-right text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap tabular-nums">
                                  {formatTimestamp(log.createdAt)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Stacked Cards */}
                    <ul className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
                      {logs.map((log) => {
                        const title = log.title || formatFallbackTitle(log.action);
                        const isApiKey = log.source === 'API_KEY' || log.actor.type === 'API_KEY';

                        return (
                          <li key={log.id} className="p-4 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-slate-900 dark:text-white">
                                  {title}
                                </p>
                                {log.description && (
                                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    {log.description}
                                  </p>
                                )}
                              </div>
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium shrink-0 border ${
                                  isApiKey
                                    ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-200/80 dark:border-sky-800/60'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-slate-700'
                                }`}
                              >
                                {isApiKey ? 'API Key' : 'Dashboard'}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-300">
                              <span>
                                {log.actor.name}{' '}
                                <span className="text-slate-400 dark:text-slate-500">
                                  ({log.actor.detail})
                                </span>
                              </span>
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                {CATEGORY_LABELS[log.category] || 'Workspace'}
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                              <span>
                                {log.deviceName || '—'} ·{' '}
                                <span className="font-mono">{formatDisplayIp(log.ipAddress)}</span>
                              </span>
                              <span className="tabular-nums">{formatTimestamp(log.createdAt)}</span>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </>
                )}

                {total > 0 && (
                  <div className="px-5 py-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
                    <span className="tabular-nums">
                      Showing {startCount}–{endCount} of {total}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setOffset(Math.max(0, offset - PAGE_LIMIT))}
                        disabled={offset === 0 || isLoading}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#070D18] text-slate-700 dark:text-slate-200 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Previous</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setOffset(offset + PAGE_LIMIT)}
                        disabled={endCount >= total || isLoading}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#070D18] text-slate-700 dark:text-slate-200 font-medium hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                      >
                        <span>Next</span>
                        <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                )}
              </section>
            </>
          )}
        </main>
      </div>

      <KycModal
        isOpen={isKycModalOpen}
        onClose={() => setIsKycModalOpen(false)}
        onSuccess={handleKycSuccess}
        userFirstName={userFirstName}
        userLastName={userLastName}
      />
    </div>
  );
}
