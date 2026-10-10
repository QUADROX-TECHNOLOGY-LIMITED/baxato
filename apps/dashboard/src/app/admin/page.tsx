'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  XCircle,
  Copy,
  Check,
  Tv,
  Zap,
  Smartphone,
  Wifi,
  ArrowRightLeft,
  UserCheck,
  Lock,
  X,
} from 'lucide-react';
import StaffSidebar, { StaffTab } from '@/components/admin/StaffSidebar';
import StaffHeader from '@/components/admin/StaffHeader';
import {
  getStoredAuthToken,
  getStoredUser,
  getStoredBusiness,
  clearSessionAndRedirect,
} from '@/lib/auth-session';

type ActiveTab = 'overview' | 'transactions' | 'routing' | 'merchants' | 'security';

export default function AdminStaffBackofficePage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');

  // Authorization state: null = verifying auth, false = denied, true = authorized
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  // Session & User State
  const [userRole, setUserRole] = useState<string>('');
  const [merchantName, setMerchantName] = useState<string>('Staff User');
  const [businessName, setBusinessName] = useState<string>('Baxato Platform');
  const [kycStatus, setKycStatus] = useState<string>('VERIFIED');
  const [isKycModalOpen, setIsKycModalOpen] = useState<boolean>(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);

  // Operational Overview State
  const [overviewData, setOverviewData] = useState<any>(null);
  const [isLoadingOverview, setIsLoadingOverview] = useState<boolean>(false);

  // Transactions Desk State
  const [transactions, setTransactions] = useState<any[]>([]);
  const [txSearch, setTxSearch] = useState<string>('');
  const [txServiceFilter, setTxServiceFilter] = useState<string>('ALL');
  const [txStatusFilter, setTxStatusFilter] = useState<string>('ALL');
  const [txPage, setTxPage] = useState<number>(1);
  const [txPagination, setTxPagination] = useState<any>(null);
  const [isLoadingTx, setIsLoadingTx] = useState<boolean>(false);
  const [selectedTx, setSelectedTx] = useState<any | null>(null);
  const [isRequerying, setIsRequerying] = useState<boolean>(false);
  const [requeryMessage, setRequeryMessage] = useState<string | null>(null);

  // Providers & Routing State
  const [providersHealth, setProvidersHealth] = useState<any[]>([]);
  const [routingConfig, setRoutingConfig] = useState<any[]>([]);
  const [isLoadingHealth, setIsLoadingHealth] = useState<boolean>(false);
  const [isSwitchingRouting, setIsSwitchingRouting] = useState<string | null>(null);
  const [routingSuccessMessage, setRoutingSuccessMessage] = useState<string | null>(null);

  // Merchants & NIN Directory State
  const [merchants, setMerchants] = useState<any[]>([]);
  const [merchantSearch, setMerchantSearch] = useState<string>('');
  const [merchantPage, setMerchantPage] = useState<number>(1);
  const [merchantPagination, setMerchantPagination] = useState<any>(null);
  const [isLoadingMerchants, setIsLoadingMerchants] = useState<boolean>(false);
  const [selectedMerchant, setSelectedMerchant] = useState<any | null>(null);

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // 1. Strict Auth Verification (Runs immediately on client mount)
  useEffect(() => {
    const token = getStoredAuthToken();
    if (!token) {
      setIsAuthorized(false);
      clearSessionAndRedirect('expired');
      return;
    }

    const user = getStoredUser();
    const biz = getStoredBusiness();

    if (user && (user.role === 'STAFF' || user.role === 'SUPER_ADMIN')) {
      setUserRole(user.role);
      setMerchantName(`${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Staff');
      if (biz?.name) setBusinessName(biz.name);
      setIsAuthorized(true);
    } else {
      // Immediate lock out — user is regular merchant or unauthenticated
      setIsAuthorized(false);
    }
  }, []);

  // 2. Fetch Overview Data
  const loadOverview = async () => {
    try {
      setIsLoadingOverview(true);
      const token = getStoredAuthToken();
      if (!token) return;

      const res = await fetch('/api/admin/overview', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data?.success) {
        setOverviewData(data.data);
        if (data.data?.providers?.health) setProvidersHealth(data.data.providers.health);
        if (data.data?.providers?.routing) setRoutingConfig(data.data.providers.routing);
      }
    } catch (err) {
      console.error('Failed to load admin overview:', err);
    } finally {
      setIsLoadingOverview(false);
    }
  };

  // 3. Fetch Transactions
  const loadTransactions = async () => {
    try {
      setIsLoadingTx(true);
      const token = getStoredAuthToken();
      if (!token) return;

      const params = new URLSearchParams();
      params.set('page', String(txPage));
      params.set('limit', '15');
      if (txServiceFilter !== 'ALL') params.set('serviceType', txServiceFilter);
      if (txStatusFilter !== 'ALL') params.set('status', txStatusFilter);
      if (txSearch.trim()) params.set('search', txSearch.trim());

      const res = await fetch(`/api/admin/transactions?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data?.success) {
        setTransactions(data.data || []);
        setTxPagination(data.pagination);
      }
    } catch (err) {
      console.error('Failed to load admin transactions:', err);
    } finally {
      setIsLoadingTx(false);
    }
  };

  // 4. Fetch Provider Health & Routing
  const loadProviderHealth = async () => {
    try {
      setIsLoadingHealth(true);
      const token = getStoredAuthToken();
      if (!token) return;

      const res = await fetch('/api/admin/providers/health', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data?.success) {
        setProvidersHealth(data.data.providerStatuses || []);
        setRoutingConfig(data.data.routingTable || []);
      }
    } catch (err) {
      console.error('Failed to load provider health:', err);
    } finally {
      setIsLoadingHealth(false);
    }
  };

  // 5. Fetch Merchants Directory
  const loadMerchants = async () => {
    try {
      setIsLoadingMerchants(true);
      const token = getStoredAuthToken();
      if (!token) return;

      const params = new URLSearchParams();
      params.set('page', String(merchantPage));
      params.set('limit', '15');
      if (merchantSearch.trim()) params.set('search', merchantSearch.trim());

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

  // Trigger loads when tab changes, but ONLY if authorized
  useEffect(() => {
    if (isAuthorized === true) {
      if (activeTab === 'overview') loadOverview();
      if (activeTab === 'transactions') loadTransactions();
      if (activeTab === 'routing') loadProviderHealth();
      if (activeTab === 'merchants') loadMerchants();
    }
  }, [activeTab, isAuthorized, txPage, txServiceFilter, txStatusFilter, merchantPage]);

  // Handle Transaction Re-query
  const handleRequery = async (txId: string) => {
    try {
      setIsRequerying(true);
      setRequeryMessage(null);
      const token = getStoredAuthToken();
      if (!token) return;

      const res = await fetch(`/api/admin/transactions/${txId}/requery`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data?.success) {
        setRequeryMessage(`Upstream Sync Complete: Status is ${data.data.currentStatus}`);
        loadTransactions();
        if (selectedTx && selectedTx.id === txId) {
          setSelectedTx((prev: any) => ({
            ...prev,
            status: data.data.currentStatus,
          }));
        }
      } else {
        setRequeryMessage(data?.error?.message || 'Failed to re-query upstream provider.');
      }
    } catch (err) {
      setRequeryMessage('An error occurred while contacting the upstream provider.');
    } finally {
      setIsRequerying(false);
    }
  };

  // Handle Provider Failover Switching
  const handleSwitchRouting = async (serviceType: string, currentPrimary: string) => {
    try {
      setIsSwitchingRouting(serviceType);
      setRoutingSuccessMessage(null);
      const token = getStoredAuthToken();
      if (!token) return;

      const newStrategy =
        currentPrimary === 'MONNIFY'
          ? 'INTERSWITCH_PRIMARY_MONNIFY_FALLBACK'
          : 'MONNIFY_PRIMARY_INTERSWITCH_FALLBACK';

      const res = await fetch('/api/admin/providers/routing', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          serviceType,
          strategy: newStrategy,
          allowFailover: true,
        }),
      });

      const data = await res.json();
      if (res.ok && data?.success) {
        setRoutingSuccessMessage(`Successfully switched ${serviceType} routing to ${newStrategy}.`);
        loadProviderHealth();
      } else {
        alert(data?.error?.message || 'Failed to switch provider routing.');
      }
    } catch (err) {
      console.error('Error switching provider routing:', err);
    } finally {
      setIsSwitchingRouting(null);
    }
  };

  // 1. Silent loading state while evaluating auth — ABSOLUTELY ZERO CONTENT FLASH
  if (isAuthorized === null) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#070D18] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#126BEB] border-t-transparent animate-spin" />
      </div>
    );
  }

  // 2. Unauthorized Screen for non-staff accounts
  if (isAuthorized === false) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#070D18] flex items-center justify-center p-6 text-slate-900 dark:text-white">
        <div className="max-w-md w-full bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center shadow-xl">
          <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <Lock className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold mb-2">Restricted Staff Area</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
            This console is strictly reserved for authorized Baxato Staff and Platform Administrators.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center px-6 py-2.5 rounded-xl font-medium bg-[#126BEB] text-white hover:bg-[#0E58C4] transition shadow-md shadow-blue-500/20 text-xs"
          >
            Return to Merchant Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // 3. Authorized View: Rendered ONLY when isAuthorized === true
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070D18] text-slate-900 dark:text-white">
      {/* Dedicated Staff Operations Navigation Sidebar */}
      <StaffSidebar
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        userRole={userRole}
        staffName={merchantName}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className="lg:pl-72 flex flex-col min-h-screen">
        {/* Dedicated Staff Header */}
        <StaffHeader
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          staffName={merchantName}
          userRole={userRole}
          isRefreshing={isLoadingOverview || isLoadingTx || isLoadingHealth || isLoadingMerchants}
          onRefresh={() => {
            if (activeTab === 'overview') loadOverview();
            if (activeTab === 'transactions') loadTransactions();
            if (activeTab === 'routing') loadProviderHealth();
            if (activeTab === 'merchants') loadMerchants();
          }}
          activeTabTitle={
            activeTab === 'overview'
              ? 'Platform Overview'
              : activeTab === 'transactions'
              ? 'Transaction Desk'
              : activeTab === 'routing'
              ? 'Provider Failover'
              : 'Merchants & NIN Directory'
          }
        />

        <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto space-y-6">
          {/* Top Banner & Title */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  Staff Operations
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Role: <strong className="text-slate-700 dark:text-slate-200">{userRole}</strong>
                </span>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                Operations & Provider Control Desk
              </h1>
            </div>

            {/* Quick Tab Switcher */}
            <div className="flex items-center p-1 bg-slate-200/60 dark:bg-slate-900/80 rounded-xl border border-slate-200 dark:border-slate-800 self-start md:self-auto">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === 'overview'
                    ? 'bg-white dark:bg-[#126BEB] text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('transactions')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === 'transactions'
                    ? 'bg-white dark:bg-[#126BEB] text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Transactions
              </button>
              <button
                onClick={() => setActiveTab('routing')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === 'routing'
                    ? 'bg-white dark:bg-[#126BEB] text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Provider Failover
              </button>
              <button
                onClick={() => setActiveTab('merchants')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  activeTab === 'merchants'
                    ? 'bg-white dark:bg-[#126BEB] text-slate-900 dark:text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Merchants & NIN
              </button>
            </div>
          </div>

          {/* TAB 1: OPERATIONAL OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Telemetry Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Today's Volume</span>
                  <div className="text-xl md:text-2xl font-bold mt-1 text-slate-900 dark:text-white">
                    ₦{Number(overviewData?.today?.totalVolumeNaira || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    {overviewData?.today?.totalTransactions || 0} Total transactions
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Success Rate</span>
                  <div className="text-xl md:text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400">
                    {overviewData?.today?.successRatePercent ?? 100}%
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    {overviewData?.today?.successTransactions || 0} successful / {overviewData?.today?.failedTransactions || 0} failed
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Registered Businesses</span>
                  <div className="text-xl md:text-2xl font-bold mt-1 text-slate-900 dark:text-white">
                    {overviewData?.merchants?.totalBusinesses || 0}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Active merchant accounts
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800">
                  <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">Verified NIN Identities</span>
                  <div className="text-xl md:text-2xl font-bold mt-1 text-blue-600 dark:text-blue-400">
                    {overviewData?.merchants?.verifiedUsers || 0}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Verified through NIMC
                  </div>
                </div>
              </div>

              {/* Provider Health Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-5 rounded-xl bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold text-xs">
                        ISW
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Interswitch Orion Gateway</h3>
                        <p className="text-[11px] text-slate-500">SVA v5 Enterprise Provider</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      Circuit: CLOSED (Normal)
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
                    Active for JAMB PIN vending, Cable TV, and backup routes for Airtime, Data, and Electricity.
                  </p>
                  <button
                    onClick={() => setActiveTab('routing')}
                    className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    View Routing & Failover Switches <ArrowRightLeft className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="p-5 rounded-xl bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold text-xs">
                        MNF
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Monnify VAS Aggregator</h3>
                        <p className="text-[11px] text-slate-500">Direct Telecom & DisCo Gateway</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      Circuit: CLOSED (Normal)
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
                    Primary gateway for instant Airtime, Data top-ups, DisCo tokens, and backup Cable TV vending.
                  </p>
                  <button
                    onClick={() => setActiveTab('routing')}
                    className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                  >
                    View Routing & Failover Switches <ArrowRightLeft className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TRANSACTIONS DESK */}
          {activeTab === 'transactions' && (
            <div className="space-y-4">
              {/* Search & Filter Bar */}
              <div className="flex flex-col md:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by reference, recipient phone, meter number, smartcard..."
                    value={txSearch}
                    onChange={(e) => setTxSearch(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && loadTransactions()}
                    className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="flex gap-2">
                  <select
                    value={txServiceFilter}
                    onChange={(e) => setTxServiceFilter(e.target.value)}
                    className="px-3 py-2 rounded-xl text-xs bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none"
                  >
                    <option value="ALL">All Services</option>
                    <option value="AIRTIME">Airtime</option>
                    <option value="DATA">Data</option>
                    <option value="ELECTRICITY">Electricity</option>
                    <option value="CABLE_TV">Cable TV</option>
                    <option value="EXAM_PIN">Exam PINs</option>
                  </select>

                  <select
                    value={txStatusFilter}
                    onChange={(e) => setTxStatusFilter(e.target.value)}
                    className="px-3 py-2 rounded-xl text-xs bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="SUCCESSFUL">Successful</option>
                    <option value="FAILED">Failed</option>
                    <option value="PENDING">Pending</option>
                  </select>

                  <button
                    onClick={loadTransactions}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition flex items-center gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingTx ? 'animate-spin' : ''}`} />
                    Filter
                  </button>
                </div>
              </div>

              {/* Transactions Table */}
              <div className="overflow-x-auto rounded-xl bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400">
                      <th className="py-3 px-4 font-semibold">Service</th>
                      <th className="py-3 px-4 font-semibold">Recipient</th>
                      <th className="py-3 px-4 font-semibold">Merchant / Business</th>
                      <th className="py-3 px-4 font-semibold">Amount</th>
                      <th className="py-3 px-4 font-semibold">Provider & Ref</th>
                      <th className="py-3 px-4 font-semibold">Status</th>
                      <th className="py-3 px-4 font-semibold">Date</th>
                      <th className="py-3 px-4 font-semibold text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {transactions.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-slate-500">
                          {isLoadingTx ? 'Loading transactions...' : 'No transactions matched the criteria.'}
                        </td>
                      </tr>
                    ) : (
                      transactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-900/40 transition">
                          <td className="py-3 px-4">
                            <span className="font-semibold text-slate-900 dark:text-white">{tx.serviceType}</span>
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-slate-800 dark:text-slate-200">
                            {tx.recipient}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-medium text-slate-900 dark:text-white truncate max-w-[150px]">
                              {tx.businessName || 'Business'}
                            </div>
                            <div className="text-[10px] text-slate-500 truncate max-w-[150px]">{tx.userEmail}</div>
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                            {tx.formattedAmount}
                          </td>
                          <td className="py-3 px-4">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {tx.providerName}
                            </span>
                            <div className="text-[10px] text-slate-500 font-mono truncate max-w-[120px]">
                              {tx.providerReference || tx.requestReference || tx.clientReference}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                tx.status === 'SUCCESSFUL'
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                                  : tx.status === 'FAILED'
                                    ? 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                                    : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20'
                              }`}
                            >
                              {tx.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-500 text-[11px] whitespace-nowrap">
                            {new Date(tx.createdAt).toLocaleDateString('en-NG', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => {
                                setSelectedTx(tx);
                                setRequeryMessage(null);
                              }}
                              className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition"
                            >
                              Inspect
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {txPagination && txPagination.totalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-slate-500">
                    Page {txPagination.page} of {txPagination.totalPages} ({txPagination.totalCount} items)
                  </span>
                  <div className="flex gap-2">
                    <button
                      disabled={!txPagination.hasPrevPage}
                      onClick={() => setTxPage((p) => Math.max(1, p - 1))}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 disabled:opacity-40"
                    >
                      Previous
                    </button>
                    <button
                      disabled={!txPagination.hasNextPage}
                      onClick={() => setTxPage((p) => p + 1)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PROVIDER FAILOVER & ROUTING */}
          {activeTab === 'routing' && (
            <div className="space-y-6">
              {routingSuccessMessage && (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium flex items-center justify-between">
                  <span>{routingSuccessMessage}</span>
                  <button onClick={() => setRoutingSuccessMessage(null)}>
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 text-xs leading-relaxed">
                <span className="font-bold">Staff Failover Switch:</span> As an operations staff member, you can trigger instant provider failover switches if an upstream route experiences latency or downtime. Changes apply dynamically across all merchant vending requests.
              </div>

              {/* Service Failover Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  {
                    type: 'AIRTIME',
                    title: 'Airtime Top-up',
                    desc: 'MTN, Airtel, Glo, 9mobile VTU',
                    icon: Smartphone,
                    config: routingConfig.find((r) => r.serviceType === 'AIRTIME'),
                  },
                  {
                    type: 'DATA',
                    title: 'Data Bundles',
                    desc: 'SME, Direct & Corporate Data Plans',
                    icon: Wifi,
                    config: routingConfig.find((r) => r.serviceType === 'DATA'),
                  },
                  {
                    type: 'CABLE_TV',
                    title: 'Cable TV (PayTV)',
                    desc: 'DStv, GOtv, StarTimes Bouquets',
                    icon: Tv,
                    config: routingConfig.find((r) => r.serviceType === 'CABLE_TV'),
                  },
                  {
                    type: 'ELECTRICITY',
                    title: 'Electricity Tokens',
                    desc: '12 DisCos Prepaid STS & Postpaid Bills',
                    icon: Zap,
                    config: routingConfig.find((r) => r.serviceType === 'ELECTRICITY'),
                  },
                ].map((item) => {
                  const Icon = item.icon;
                  const primary = item.config?.primaryProvider || 'MONNIFY';
                  const fallback = item.config?.fallbackProvider || 'INTERSWITCH';
                  const isSwitching = isSwitchingRouting === item.type;

                  return (
                    <div
                      key={item.type}
                      className="p-5 rounded-xl bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                            <Icon className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white">{item.title}</h3>
                            <p className="text-[11px] text-slate-500">{item.desc}</p>
                          </div>
                        </div>

                        <div className="my-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Primary Provider:</span>
                            <span className="font-bold text-slate-900 dark:text-white px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                              {primary}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">Failover Backup:</span>
                            <span className="font-semibold text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800">
                              {fallback}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        disabled={isSwitching}
                        onClick={() => handleSwitchRouting(item.type, primary)}
                        className="w-full py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 bg-[#126BEB] text-white hover:bg-[#0E58C4] disabled:opacity-50 shadow-sm"
                      >
                        <ArrowRightLeft className={`w-3.5 h-3.5 ${isSwitching ? 'animate-spin' : ''}`} />
                        {isSwitching
                          ? 'Switching Routing...'
                          : `Failover Switch (Make ${primary === 'MONNIFY' ? 'Interswitch' : 'Monnify'} Primary)`}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: MERCHANTS & NIN DIRECTORY */}
          {activeTab === 'merchants' && (
            <div className="space-y-4">
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
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 transition flex items-center gap-1.5"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoadingMerchants ? 'animate-spin' : ''}`} />
                  Search
                </button>
              </div>

              {/* Merchants Table */}
              <div className="overflow-x-auto rounded-xl bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800">
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
            </div>
          )}

          {/* TRANSACTION INSPECT DRAWER / MODAL */}
          {selectedTx && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
              <div className="bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto">
                <button
                  onClick={() => setSelectedTx(null)}
                  className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-blue-500" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Transaction Inspector</h3>
                </div>

                {requeryMessage && (
                  <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-medium">
                    {requeryMessage}
                  </div>
                )}

                <div className="space-y-2 text-xs divide-y divide-slate-100 dark:divide-slate-800">
                  <div className="py-2 flex justify-between items-center">
                    <span className="text-slate-500">Service:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{selectedTx.serviceType}</span>
                  </div>

                  <div className="py-2 flex justify-between items-center">
                    <span className="text-slate-500">Amount:</span>
                    <span className="font-bold text-slate-900 dark:text-white">{selectedTx.formattedAmount}</span>
                  </div>

                  <div className="py-2 flex justify-between items-center">
                    <span className="text-slate-500">Recipient:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">{selectedTx.recipient}</span>
                  </div>

                  <div className="py-2 flex justify-between items-center">
                    <span className="text-slate-500">Status:</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        selectedTx.status === 'SUCCESSFUL'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : selectedTx.status === 'FAILED'
                            ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {selectedTx.status}
                    </span>
                  </div>

                  <div className="py-2 flex justify-between items-center">
                    <span className="text-slate-500">Provider:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedTx.providerName}</span>
                  </div>

                  <div className="py-2 flex justify-between items-center">
                    <span className="text-slate-500">Client Reference:</span>
                    <div className="flex items-center gap-1 font-mono text-[11px]">
                      <span>{selectedTx.clientReference || 'None'}</span>
                      {selectedTx.clientReference && (
                        <button onClick={() => copyToClipboard(selectedTx.clientReference, 'cliref')}>
                          {copiedId === 'cliref' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-slate-400" />}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="py-2 flex justify-between items-center">
                    <span className="text-slate-500">Request Reference:</span>
                    <div className="flex items-center gap-1 font-mono text-[11px]">
                      <span>{selectedTx.requestReference || selectedTx.id}</span>
                      <button onClick={() => copyToClipboard(selectedTx.requestReference || selectedTx.id, 'reqref')}>
                        {copiedId === 'reqref' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-slate-400" />}
                      </button>
                    </div>
                  </div>

                  {selectedTx.providerReference && (
                    <div className="py-2 flex justify-between items-center">
                      <span className="text-slate-500">Provider Reference:</span>
                      <span className="font-mono text-[11px] text-slate-800 dark:text-slate-200">{selectedTx.providerReference}</span>
                    </div>
                  )}

                  {selectedTx.errorMessage && (
                    <div className="py-2 space-y-1">
                      <span className="text-slate-500">Error Details:</span>
                      <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 font-mono text-[11px]">
                        {selectedTx.errorMessage}
                      </div>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="pt-2 flex gap-3">
                  <button
                    disabled={isRequerying}
                    onClick={() => handleRequery(selectedTx.id)}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-[#126BEB] text-white hover:bg-[#0E58C4] disabled:opacity-50 transition flex items-center justify-center gap-2"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRequerying ? 'animate-spin' : ''}`} />
                    {isRequerying ? 'Syncing...' : 'Re-query Upstream Status'}
                  </button>

                  <button
                    onClick={() => setSelectedTx(null)}
                    className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                  >
                    Close
                  </button>
                </div>
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
                    <span className="font-mono font-bold text-blue-600 dark:text-blue-400 text-sm">
                      {selectedMerchant.nin ? selectedMerchant.nin : 'Pending submission'}
                    </span>
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
        </main>
      </div>
    </div>
  );
}
