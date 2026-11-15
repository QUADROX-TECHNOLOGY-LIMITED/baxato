'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Receipt,
  Lock,
  Eye,
  EyeOff,
  Plus,
  Key,
  X,
  Copy,
  Check,
} from 'lucide-react';
import Sidebar from '@/components/dashboard/Sidebar';
import Header from '@/components/dashboard/Header';
import KycBanner from '@/components/dashboard/KycBanner';
import KycModal from '@/components/dashboard/KycModal';
import {
  getStoredAuthToken,
  isTokenExpired,
  getStoredUser,
  getStoredBusiness,
  getStoredHideBalancePreference,
  setStoredHideBalancePreference,
  clearSessionAndRedirect,
  handleAuthResponse,
} from '@/lib/auth-session';
import ModalDialog from '@/components/ModalDialog';
import { useWalletBalance } from '@/lib/use-wallet-balance';

interface ServiceProviderBadge {
  name: string;
  logo: string;
  fullBleed?: boolean;
}

interface QuickServiceItem {
  id: string;
  name: string;
  desc: string;
  route: string;
  logo: string;
  providers: ServiceProviderBadge[];
}

interface RecentTransaction {
  id: string;
  reference: string;
  service: string;
  recipient: string;
  amount: number;
  status: string;
  date: string;
}

interface TodayTelemetry {
  formattedTotalVolume: string;
  totalCount: number;
  successfulCount: number;
}

const QUICK_SERVICES: QuickServiceItem[] = [
  {
    id: 'airtime',
    name: 'Airtime',
    desc: 'Instant mobile top-up',
    route: '/dashboard/airtime',
    logo: '/logos/categories/airtime.svg',
    providers: [
      { name: 'MTN', logo: '/logos/telecom/mtn.svg', fullBleed: true },
      { name: 'Airtel', logo: '/logos/telecom/airtel.svg' },
      { name: 'Glo', logo: '/logos/telecom/glo.svg', fullBleed: true },
      { name: '9mobile', logo: '/logos/telecom/9mobile.svg' },
    ],
  },
  {
    id: 'data',
    name: 'Data Bundles',
    desc: 'Prepaid internet plans',
    route: '/dashboard/data',
    logo: '/logos/categories/data.svg',
    providers: [
      { name: 'MTN', logo: '/logos/telecom/mtn.svg', fullBleed: true },
      { name: 'Airtel', logo: '/logos/telecom/airtel.svg' },
      { name: 'Glo', logo: '/logos/telecom/glo.svg', fullBleed: true },
      { name: '9mobile', logo: '/logos/telecom/9mobile.svg' },
    ],
  },
  {
    id: 'electricity',
    name: 'Electricity',
    desc: 'Prepaid & postpaid tokens',
    route: '/dashboard/electricity',
    logo: '/logos/categories/electricity.svg',
    providers: [
      { name: 'IKEDC', logo: '/logos/electricity/ikedc.png' },
      { name: 'EKEDC', logo: '/logos/electricity/ekedc.png' },
      { name: 'AEDC', logo: '/logos/electricity/aedc.png' },
      { name: 'IBEDC', logo: '/logos/electricity/ibedc.png' },
    ],
  },
  {
    id: 'cable',
    name: 'Cable TV',
    desc: 'TV bouquet renewals',
    route: '/dashboard/cable',
    logo: '/logos/categories/cable.svg',
    providers: [
      { name: 'DStv', logo: '/logos/cable/dstv.svg' },
      { name: 'GOtv', logo: '/logos/cable/gotv.svg', fullBleed: true },
      { name: 'StarTimes', logo: '/logos/cable/startimes.svg' },
      { name: 'Showmax', logo: '/logos/cable/showmax.svg' },
    ],
  },
  {
    id: 'education',
    name: 'Exam PINs',
    desc: 'Result checker tokens',
    route: '/dashboard/education',
    logo: '/logos/categories/education.svg',
    providers: [
      { name: 'WAEC', logo: '/logos/education/waec.png' },
      { name: 'JAMB', logo: '/logos/education/jamb.png' },
      { name: 'NECO', logo: '/logos/education/neco.png' },
      { name: 'NABTEB', logo: '/logos/education/nabteb.png' },
    ],
  },
];

function getStatusBadgeClass(status: string): string {
  switch (status?.toUpperCase()) {
    case 'SUCCESSFUL':
      return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800/60';
    case 'FAILED':
      return 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200/80 dark:border-rose-800/60';
    case 'PROCESSING':
    case 'PENDING':
      return 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200/80 dark:border-amber-800/60';
    case 'REVERSED':
      return 'bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-400 border border-purple-200/80 dark:border-purple-800/60';
    default:
      return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700';
  }
}

function formatStatusLabel(status: string): string {
  const norm = (status || '').trim().toLowerCase();
  return norm ? norm.charAt(0).toUpperCase() + norm.slice(1) : 'Unknown';
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardOverviewPage() {
  const router = useRouter();
  const [merchantName, setMerchantName] = useState<string>('');
  const [userFirstName, setUserFirstName] = useState<string>('');
  const [userLastName, setUserLastName] = useState<string>('');
  const [businessName, setBusinessName] = useState<string>('');
  const [businessId, setBusinessId] = useState<string>('');
  const [userRole, setUserRole] = useState<string>('BUSINESS_OWNER');
  const [kycStatus, setKycStatus] = useState<string>('INITIALIZING');
  const [greeting, setGreeting] = useState<string>('Welcome');

  const [isKycModalOpen, setIsKycModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Synced with DB users.hide_balance and cached locally; skeleton shows until hydrated + loaded
  const [isHydrated, setIsHydrated] = useState<boolean>(false);
  const [hideBalance, setHideBalance] = useState<boolean>(true);

  const {
    walletBalance: mainBalanceNaira,
    commissionBalance: commBalanceNaira,
    isLoadingBalance,
    refreshWallets: loadWallets,
  } = useWalletBalance();

  const walletBalance = `₦${mainBalanceNaira.toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
  const commissionBalance = `₦${commBalanceNaira.toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  const [todayTelemetry, setTodayTelemetry] = useState<TodayTelemetry>({
    formattedTotalVolume: '₦0.00',
    totalCount: 0,
    successfulCount: 0,
  });
  const [isLoadingTelemetry, setIsLoadingTelemetry] = useState<boolean>(true);

  const [transactions, setTransactions] = useState<RecentTransaction[]>([]);
  const [isFundModalOpen, setIsFundModalOpen] = useState(false);
  const [copiedWorkspaceRef, setCopiedWorkspaceRef] = useState(false);

  const getRequestHeaders = useCallback(() => {
    const authToken = getStoredAuthToken();
    if (!authToken || isTokenExpired(authToken)) {
      clearSessionAndRedirect('expired');
      return null;
    }
    const storedBiz = getStoredBusiness();
    return {
      Authorization: `Bearer ${authToken}`,
      ...(storedBiz?.id ? { 'x-business-id': storedBiz.id } : {}),
    };
  }, []);

  const syncUserPreferences = useCallback(async () => {
    const headers = getRequestHeaders();
    if (!headers) return;

    try {
      const res = await fetch('/api/users/me', { headers: { Authorization: headers.Authorization } });
      const data = await res.json().catch(() => null);
      if (handleAuthResponse(res, data)) return;

      const u = data?.data?.user;
      if (res.ok && u) {
        if (u.firstName) {
          setMerchantName(u.firstName);
          setUserFirstName(u.firstName);
        }
        if (u.lastName) setUserLastName(u.lastName);
        if (u.kycStatus) setKycStatus(u.kycStatus);
        if (typeof u.hideBalance === 'boolean') {
          setHideBalance(u.hideBalance);
          setStoredHideBalancePreference(u.hideBalance);
        }
      }
    } catch {}
  }, [getRequestHeaders]);

  const loadTodayAnalytics = useCallback(async () => {
    const headers = getRequestHeaders();
    if (!headers) return;

    try {
      setIsLoadingTelemetry(true);
      const res = await fetch('/api/analytics?timeframe=today', { headers });
      const data = await res.json().catch(() => null);
      if (handleAuthResponse(res, data)) return;

      const summary = data?.data?.summary;
      if (res.ok && summary) {
        setTodayTelemetry({
          formattedTotalVolume:
            summary.formattedSuccessfulVolume ||
            `₦${Number(summary.successfulVolumeNaira || 0).toLocaleString('en-NG', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`,
          totalCount: Number(summary.totalCount || 0),
          successfulCount: Number(summary.successfulCount || 0),
        });
      }
    } catch {
    } finally {
      setIsLoadingTelemetry(false);
    }
  }, [getRequestHeaders]);

  const loadRecentTransactions = useCallback(async () => {
    const headers = getRequestHeaders();
    if (!headers) return;

    try {
      const res = await fetch('/api/transactions?limit=6', { headers });
      const data = await res.json().catch(() => null);
      if (handleAuthResponse(res, data)) return;

      if (res.ok && data?.success && Array.isArray(data.data?.transactions)) {
        setTransactions(
          data.data.transactions.map((t: any) => ({
            id: t.id,
            reference: t.reference,
            service:
              t.metadata?.packageName ||
              t.metadata?.operatorName ||
              t.metadata?.disco ||
              t.metadata?.network ||
              t.serviceType,
            recipient: t.recipient,
            amount: t.amountNaira || 0,
            status: t.status,
            date: new Date(t.createdAt).toLocaleDateString('en-NG', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            }),
          })),
        );
      }
    } catch {}
  }, [getRequestHeaders]);

  useEffect(() => {
    const token = getStoredAuthToken();
    if (!token) {
      clearSessionAndRedirect('expired');
      return;
    }

    const storedUser = getStoredUser();
    const storedBiz = getStoredBusiness();

    if (storedUser?.role === 'SUPER_ADMIN') {
      router.replace('/admin');
      return;
    }
    if (storedUser?.role === 'STAFF') {
      router.replace('/staff/overview');
      return;
    }

    if (storedBiz?.id) setBusinessId(storedBiz.id);
    if (storedBiz?.name) setBusinessName(storedBiz.name);
    if (storedBiz?.role) {
      setUserRole(storedBiz.role);
    } else if (storedUser?.role) {
      setUserRole(storedUser.role);
    }
    if (storedUser?.firstName) {
      setMerchantName(storedUser.firstName);
      setUserFirstName(storedUser.firstName);
    }
    if (storedUser?.lastName) setUserLastName(storedUser.lastName);
    if (storedUser?.kycStatus) {
      setKycStatus(storedUser.kycStatus);
    } else {
      setKycStatus('UNVERIFIED');
    }

    setGreeting(getGreeting());
    setHideBalance(getStoredHideBalancePreference());
    setIsHydrated(true);

    void syncUserPreferences();
    void loadTodayAnalytics();
    void loadRecentTransactions();

    const handleBizSwitched = () => {
      const updatedBiz = getStoredBusiness();
      if (updatedBiz?.id) setBusinessId(updatedBiz.id);
      if (updatedBiz?.name) setBusinessName(updatedBiz.name);
      if (updatedBiz?.role) setUserRole(updatedBiz.role);
      void loadTodayAnalytics();
      void loadRecentTransactions();
    };

    window.addEventListener('bx_business_switched', handleBizSwitched);
    return () => window.removeEventListener('bx_business_switched', handleBizSwitched);
  }, [router, syncUserPreferences, loadTodayAnalytics, loadRecentTransactions]);

  const handleToggleHideBalance = async () => {
    const nextValue = !hideBalance;
    setHideBalance(nextValue);
    setStoredHideBalancePreference(nextValue);

    const headers = getRequestHeaders();
    if (!headers) return;

    try {
      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ hideBalance: nextValue }),
      });
      const data = await res.json().catch(() => null);
      handleAuthResponse(res, data);
    } catch {}
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([loadWallets(), loadTodayAnalytics(), loadRecentTransactions()]);
    setIsRefreshing(false);
  };

  const handleKycSuccess = (updatedUser: any) => {
    setKycStatus('VERIFIED');
    if (updatedUser?.firstName) {
      setMerchantName(updatedUser.firstName);
      setUserFirstName(updatedUser.firstName);
    }
    if (updatedUser?.lastName) setUserLastName(updatedUser.lastName);
  };

  const isOwnerOrAdmin = userRole === 'BUSINESS_OWNER' || userRole === 'BUSINESS_ADMIN';
  const canFundWallet = isOwnerOrAdmin || userRole === 'FINANCE';
  const canViewApiKeys = isOwnerOrAdmin || userRole === 'DEVELOPER';
  const canExecuteServices = isOwnerOrAdmin || userRole === 'DEVELOPER' || userRole === 'SUPPORT';
  const isVerified = kycStatus === 'VERIFIED';

  const handleServiceClick = (serviceRoute: string) => {
    if (isOwnerOrAdmin && !isVerified) {
      setIsKycModalOpen(true);
      return;
    }
    router.push(serviceRoute);
  };

  const handleFundWalletClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (isOwnerOrAdmin && !isVerified) {
      setIsKycModalOpen(true);
      return;
    }
    setIsFundModalOpen(true);
  };

  const todayCountLabel =
    todayTelemetry.successfulCount === 1
      ? '1 successful today'
      : `${todayTelemetry.successfulCount} successful today`;

  return (
    <div className="min-h-screen bg-white dark:bg-[#070D18] text-slate-900 dark:text-slate-100 flex flex-col lg:flex-row transition-colors duration-150">
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
        />

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full space-y-8">
          <KycBanner
            kycStatus={kycStatus}
            userRole={userRole}
            onOpenKycModal={() => setIsKycModalOpen(true)}
          />

          {/* Greeting */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              {greeting}
              {merchantName ? `, ${merchantName}` : ''}
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              {businessName || 'Workspace'}
            </p>
          </div>

          {/* Wallet & Daily Volume */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-stretch">
            {/* Primary Wallet Card */}
            <div className="lg:col-span-7 rounded-2xl p-5 bg-gradient-to-br from-[#0F1E36] via-[#0A1527] to-[#060D1A] border border-slate-800/90 text-white flex flex-col justify-between gap-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span>Available Balance</span>
                    <button
                      type="button"
                      onClick={handleToggleHideBalance}
                      className="text-slate-400 hover:text-white transition-colors p-0.5 rounded"
                      aria-label={hideBalance ? 'Show balance' : 'Hide balance'}
                      title={hideBalance ? 'Show balance' : 'Hide balance'}
                    >
                      {hideBalance ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <div className="text-2xl sm:text-3xl font-bold tracking-tight tabular-nums text-white mt-1.5 min-h-[36px] flex items-center">
                    {!isHydrated || isLoadingBalance ? (
                      <div className="h-8 w-44 bg-white/15 rounded-lg animate-pulse" />
                    ) : hideBalance ? (
                      '••••••••'
                    ) : (
                      walletBalance
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xs text-slate-400 block">Commission</span>
                  <span className="text-sm font-semibold tabular-nums text-slate-200 mt-1 inline-block">
                    {!isHydrated || isLoadingBalance ? (
                      <span className="inline-block h-4 w-16 bg-white/10 rounded animate-pulse align-middle" />
                    ) : hideBalance ? (
                      '••••••'
                    ) : (
                      commissionBalance
                    )}
                  </span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3.5 border-t border-white/10">
                <span className="text-xs text-slate-300 truncate max-w-[260px]">
                  {[merchantName, businessName].filter(Boolean).join(' • ') || 'BAXATO Wallet'}
                </span>

                <div className="flex items-center gap-2 shrink-0">
                  {canFundWallet && (
                    <button
                      type="button"
                      onClick={handleFundWalletClick}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#126BEB] hover:bg-[#0D58C8] text-white inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Fund Wallet</span>
                    </button>
                  )}
                  {canViewApiKeys && (
                    <Link
                      href="/dashboard/developer"
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/15 text-slate-100 inline-flex items-center gap-1.5 border border-white/10 transition-colors whitespace-nowrap shrink-0"
                    >
                      <Key className="w-3.5 h-3.5 text-[#38BDF8]" />
                      <span>API Keys</span>
                    </Link>
                  )}
                  {(userRole === 'FINANCE' || userRole === 'VIEWER') && (
                    <Link
                      href="/dashboard/ledger"
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/15 text-slate-100 inline-flex items-center gap-1.5 border border-white/10 transition-colors whitespace-nowrap shrink-0"
                    >
                      <Receipt className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Statements</span>
                    </Link>
                  )}
                </div>
              </div>
            </div>

            {/* Today's Telemetry Card */}
            <div className="lg:col-span-5 p-5 rounded-2xl bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800 flex flex-col justify-between gap-4">
              <div>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Today&apos;s Volume
                </span>
                <div className="mt-1.5">
                  {isLoadingTelemetry ? (
                    <div className="h-8 w-36 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
                  ) : (
                    <div className="text-2xl sm:text-3xl font-bold tracking-tight tabular-nums text-slate-900 dark:text-white">
                      {todayTelemetry.formattedTotalVolume}
                    </div>
                  )}
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 tabular-nums">
                    {isLoadingTelemetry ? 'Loading activity...' : todayCountLabel}
                  </p>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">Daily summary</span>
                <Link
                  href="/dashboard/analytics"
                  className="inline-flex items-center justify-center px-3 py-1 rounded-lg border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap shrink-0 transition-colors"
                >
                  View analytics
                </Link>
              </div>
            </div>
          </div>

          {/* Quick Services Grid */}
          {canExecuteServices && (
            <section className="space-y-3.5">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                  Services
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Airtime, mobile data, electricity, cable TV, and exam PINs
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                {QUICK_SERVICES.map((svc) => (
                  <button
                    key={svc.id}
                    type="button"
                    onClick={() => handleServiceClick(svc.route)}
                    className="p-4 rounded-xl bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800 text-left transition-colors duration-150 group relative flex flex-col justify-between gap-4 hover:border-[#126BEB]/50 dark:hover:border-[#38BDF8]/40 cursor-pointer"
                  >
                    {!isVerified && (
                      <div
                        className="absolute top-3 right-3 p-1 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                        title="Identity verification required"
                      >
                        <Lock className="w-3 h-3" />
                      </div>
                    )}

                    <div className="space-y-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-[#0E1A30] border border-slate-200/80 dark:border-slate-800 p-2 relative shrink-0">
                        <Image
                          src={svc.logo}
                          alt={svc.name}
                          fill
                          sizes="40px"
                          className="object-contain p-1.5"
                        />
                      </div>

                      <div>
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white group-hover:text-[#126BEB] dark:group-hover:text-[#38BDF8] transition-colors leading-tight">
                          {svc.name}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                          {svc.desc}
                        </p>
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center -space-x-1.5">
                      {svc.providers.map((p) => (
                        <div
                          key={p.name}
                          title={p.name}
                          className={`w-5 h-5 rounded-full relative shrink-0 overflow-hidden ring-1 ring-slate-200/90 dark:ring-slate-700/80 ${
                            p.fullBleed ? 'bg-transparent' : 'bg-white p-0.5'
                          }`}
                        >
                          <Image
                            src={p.logo}
                            alt={p.name}
                            fill
                            sizes="20px"
                            className={p.fullBleed ? 'object-cover' : 'object-contain'}
                          />
                        </div>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Unboxed Recent Transactions */}
          <section className="space-y-3 pt-1">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                  Recent Transactions
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Latest workspace transactions
                </p>
              </div>

              <Link
                href="/dashboard/ledger"
                className="inline-flex items-center justify-center px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap shrink-0 transition-colors"
              >
                Full history
              </Link>
            </div>

            {transactions.length === 0 ? (
              <div className="py-10 border-t border-b border-slate-200/80 dark:border-slate-800/80 text-center text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                No transactions yet. Completed purchases will appear here.
              </div>
            ) : (
              <div className="overflow-x-auto border-t border-b border-slate-200 dark:border-slate-800">
                <table className="w-full text-left border-collapse text-xs sm:text-[13px] whitespace-nowrap">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-xs font-medium text-slate-500 dark:text-slate-400">
                      <th className="py-3 pr-4">Reference</th>
                      <th className="py-3 px-4">Service</th>
                      <th className="py-3 px-4">Recipient</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 pl-4 text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/70">
                    {transactions.map((txn) => (
                      <tr
                        key={txn.id}
                        className="hover:bg-slate-50/70 dark:hover:bg-slate-900/40 transition-colors"
                      >
                        <td className="py-3 pr-4 font-medium text-slate-900 dark:text-white">
                          {txn.reference}
                        </td>
                        <td className="py-3 px-4 text-slate-700 dark:text-slate-300">
                          {txn.service}
                        </td>
                        <td className="py-3 px-4 text-slate-600 dark:text-slate-300 tabular-nums">
                          {txn.recipient}
                        </td>
                        <td className="py-3 px-4 font-semibold tabular-nums text-slate-900 dark:text-white">
                          ₦{txn.amount.toLocaleString()}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${getStatusBadgeClass(
                              txn.status,
                            )}`}
                          >
                            {formatStatusLabel(txn.status)}
                          </span>
                        </td>
                        <td className="py-3 pl-4 text-right text-slate-500 dark:text-slate-400 tabular-nums">
                          {txn.date}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </main>
      </div>

      {/* Identity Verification Modal */}
      <KycModal
        isOpen={isKycModalOpen}
        onClose={() => setIsKycModalOpen(false)}
        onSuccess={handleKycSuccess}
        userFirstName={userFirstName}
        userLastName={userLastName}
      />

      {/* Native Top-Layer Fund Wallet Modal */}
      <ModalDialog
        isOpen={isFundModalOpen}
        onClose={() => setIsFundModalOpen(false)}
        ariaLabel="Fund Wallet"
        maxWidthClass="max-w-md"
        className="dark:bg-[#0B1528]"
      >
        <div className="p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#126BEB]/10 dark:bg-[#126BEB]/20 text-[#126BEB] dark:text-[#38BDF8] flex items-center justify-center font-bold">
                  ₦
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 dark:text-white text-sm">
                    Fund Wallet
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Workspace balance replenishment
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFundModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#070D18] border border-slate-200/80 dark:border-slate-800 space-y-3 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500 dark:text-slate-400">Workspace</span>
                <span className="font-medium text-slate-900 dark:text-white truncate max-w-[220px]">
                  {businessName || 'BAXATO Workspace'}
                </span>
              </div>
              {businessId && (
                <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-slate-200/60 dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400">Workspace Reference</span>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-medium text-slate-900 dark:text-white truncate max-w-[160px]">
                      {businessId}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(businessId);
                        setCopiedWorkspaceRef(true);
                        setTimeout(() => setCopiedWorkspaceRef(false), 2000);
                      }}
                      className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white shrink-0"
                      title="Copy workspace reference"
                    >
                      {copiedWorkspaceRef ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
              Dedicated transfer accounts are provisioned after merchant onboarding. Contact{' '}
              <a
                href="mailto:support@baxato.com"
                className="font-medium text-[#126BEB] dark:text-[#38BDF8] hover:underline"
              >
                support@baxato.com
              </a>{' '}
              with your workspace reference for wallet funding assistance.
            </p>

            <button
              type="button"
              onClick={() => setIsFundModalOpen(false)}
              className="w-full py-2.5 rounded-lg bg-[#126BEB] hover:bg-[#0D58C8] text-white font-semibold text-xs transition-colors"
            >
              Done
            </button>
        </div>
      </ModalDialog>
    </div>
  );
}
