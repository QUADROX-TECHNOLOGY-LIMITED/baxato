'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Wifi,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Wallet,
  X,
  FileText,
  Search,
  Filter,
} from 'lucide-react';
import Sidebar from '@/components/dashboard/Sidebar';
import Header from '@/components/dashboard/Header';
import KycBanner from '@/components/dashboard/KycBanner';
import KycModal from '@/components/dashboard/KycModal';
import AccessRestricted from '@/components/dashboard/AccessRestricted';
import TransactionReceiptModal, {
  TransactionReceiptData,
} from '@/components/dashboard/TransactionReceiptModal';
import {
  getStoredAuthToken,
  getStoredUser,
  getStoredBusiness,
  clearSessionAndRedirect,
  handleAuthResponse,
} from '@/lib/auth-session';

interface NetworkOption {
  id: string;
  name: string;
  logo: string;
  prefixes: string[];
  borderActive: string;
  bgActive: string;
}

const NETWORKS: NetworkOption[] = [
  {
    id: 'MTN',
    name: 'MTN',
    logo: '/logos/telecom/mtn.svg',
    prefixes: ['0803', '0806', '0703', '0706', '0813', '0816', '0810', '0814', '0903', '0906', '0913', '0916'],
    borderActive: 'border-amber-400 ring-2 ring-amber-400/20',
    bgActive: 'bg-amber-400/5',
  },
  {
    id: 'AIRTEL',
    name: 'Airtel',
    logo: '/logos/telecom/airtel.svg',
    prefixes: ['0802', '0808', '0708', '0812', '0701', '0902', '0901', '0904', '0907', '0912'],
    borderActive: 'border-red-500 ring-2 ring-red-500/20',
    bgActive: 'bg-red-500/5',
  },
  {
    id: 'GLO',
    name: 'Glo',
    logo: '/logos/telecom/glo.svg',
    prefixes: ['0805', '0807', '0705', '0815', '0811', '0905', '0915'],
    borderActive: 'border-emerald-500 ring-2 ring-emerald-500/20',
    bgActive: 'bg-emerald-500/5',
  },
  {
    id: '9MOBILE',
    name: '9mobile',
    logo: '/logos/telecom/9mobile.svg',
    prefixes: ['0809', '0817', '0818', '0909', '0908'],
    borderActive: 'border-teal-500 ring-2 ring-teal-500/20',
    bgActive: 'bg-teal-500/5',
  },
];

interface DataPlan {
  id: string;
  network: string;
  networkName: string;
  name: string;
  dataAllowance: string;
  category: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'MEGA';
  validity: string;
  priceNaira: number;
}

const FALLBACK_PLANS: DataPlan[] = [
  // MTN
  { id: 'mtn_daily_100mb', network: 'MTN', networkName: 'MTN Nigeria', name: 'MTN 100MB Daily', dataAllowance: '100MB', category: 'DAILY', validity: '1 Day', priceNaira: 100 },
  { id: 'mtn_daily_1gb', network: 'MTN', networkName: 'MTN Nigeria', name: 'MTN 1GB Daily', dataAllowance: '1GB', category: 'DAILY', validity: '1 Day', priceNaira: 350 },
  { id: 'mtn_weekly_6gb', network: 'MTN', networkName: 'MTN Nigeria', name: 'MTN 6GB Weekly', dataAllowance: '6GB', category: 'WEEKLY', validity: '7 Days', priceNaira: 1500 },
  { id: 'mtn_monthly_1_5gb', network: 'MTN', networkName: 'MTN Nigeria', name: 'MTN 1.5GB Monthly', dataAllowance: '1.5GB', category: 'MONTHLY', validity: '30 Days', priceNaira: 1000 },
  { id: 'mtn_monthly_4_5gb', network: 'MTN', networkName: 'MTN Nigeria', name: 'MTN 4.5GB Monthly', dataAllowance: '4.5GB', category: 'MONTHLY', validity: '30 Days', priceNaira: 2000 },
  { id: 'mtn_monthly_12gb', network: 'MTN', networkName: 'MTN Nigeria', name: 'MTN 12GB Monthly', dataAllowance: '12GB', category: 'MONTHLY', validity: '30 Days', priceNaira: 3500 },
  { id: 'mtn_mega_40gb', network: 'MTN', networkName: 'MTN Nigeria', name: 'MTN 40GB Mega', dataAllowance: '40GB', category: 'MEGA', validity: '30 Days', priceNaira: 10000 },

  // Airtel
  { id: 'airtel_daily_100mb', network: 'AIRTEL', networkName: 'Airtel Nigeria', name: 'Airtel 100MB Daily', dataAllowance: '100MB', category: 'DAILY', validity: '1 Day', priceNaira: 100 },
  { id: 'airtel_weekly_1_5gb', network: 'AIRTEL', networkName: 'Airtel Nigeria', name: 'Airtel 1.5GB Weekly', dataAllowance: '1.5GB', category: 'WEEKLY', validity: '7 Days', priceNaira: 500 },
  { id: 'airtel_monthly_3gb', network: 'AIRTEL', networkName: 'Airtel Nigeria', name: 'Airtel 3GB Monthly', dataAllowance: '3GB', category: 'MONTHLY', validity: '30 Days', priceNaira: 1500 },
  { id: 'airtel_monthly_10gb', network: 'AIRTEL', networkName: 'Airtel Nigeria', name: 'Airtel 10GB Monthly', dataAllowance: '10GB', category: 'MONTHLY', validity: '30 Days', priceNaira: 3000 },
  { id: 'airtel_mega_50gb', network: 'AIRTEL', networkName: 'Airtel Nigeria', name: 'Airtel 50GB Mega', dataAllowance: '50GB', category: 'MEGA', validity: '30 Days', priceNaira: 11000 },

  // Glo
  { id: 'glo_daily_1gb', network: 'GLO', networkName: 'Glo Nigeria', name: 'Glo 1GB Special', dataAllowance: '1GB', category: 'DAILY', validity: '1 Day', priceNaira: 300 },
  { id: 'glo_weekly_2_5gb', network: 'GLO', networkName: 'Glo Nigeria', name: 'Glo 2.5GB Weekly', dataAllowance: '2.5GB', category: 'WEEKLY', validity: '7 Days', priceNaira: 500 },
  { id: 'glo_monthly_5_8gb', network: 'GLO', networkName: 'Glo Nigeria', name: 'Glo 5.8GB Monthly', dataAllowance: '5.8GB', category: 'MONTHLY', validity: '30 Days', priceNaira: 2000 },
  { id: 'glo_monthly_14gb', network: 'GLO', networkName: 'Glo Nigeria', name: 'Glo 14GB Monthly', dataAllowance: '14GB', category: 'MONTHLY', validity: '30 Days', priceNaira: 4000 },

  // 9mobile
  { id: '9mobile_daily_1gb', network: '9MOBILE', networkName: '9mobile Nigeria', name: '9mobile 1GB Daily', dataAllowance: '1GB', category: 'DAILY', validity: '1 Day', priceNaira: 350 },
  { id: '9mobile_weekly_2gb', network: '9MOBILE', networkName: '9mobile Nigeria', name: '9mobile 2GB Weekly', dataAllowance: '2GB', category: 'WEEKLY', validity: '7 Days', priceNaira: 1000 },
  { id: '9mobile_monthly_4_5gb', network: '9MOBILE', networkName: '9mobile Nigeria', name: '9mobile 4.5GB Monthly', dataAllowance: '4.5GB', category: 'MONTHLY', validity: '30 Days', priceNaira: 2000 },
  { id: '9mobile_monthly_11gb', network: '9MOBILE', networkName: '9mobile Nigeria', name: '9mobile 11GB Monthly', dataAllowance: '11GB', category: 'MONTHLY', validity: '30 Days', priceNaira: 4000 },
];

export default function DataVendingPage() {
  const router = useRouter();

  // User & Business State
  const [merchantName, setMerchantName] = useState<string>('');
  const [businessName, setBusinessName] = useState<string>('');
  const [kycStatus, setKycStatus] = useState<string>('INITIALIZING');
  const [userRole, setUserRole] = useState<string>('BUSINESS_OWNER');
  const [isKycModalOpen, setIsKycModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [isLoadingBalance, setIsLoadingBalance] = useState<boolean>(true);

  // Form State
  const [phone, setPhone] = useState<string>('');
  const [selectedNetwork, setSelectedNetwork] = useState<string>('MTN');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [plans, setPlans] = useState<DataPlan[]>(FALLBACK_PLANS);
  const [isLoadingPlans, setIsLoadingPlans] = useState<boolean>(false);

  // UI Flow & Modals
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [receiptData, setReceiptData] = useState<TransactionReceiptData | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState<boolean>(false);

  const loadWallets = async () => {
    try {
      setIsLoadingBalance(true);
      const authToken = getStoredAuthToken();
      if (!authToken) {
        clearSessionAndRedirect('expired');
        return;
      }

      const res = await fetch('/api/wallets', {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });
      const data = await res.json().catch(() => null);

      if (handleAuthResponse(res, data)) {
        return;
      }

      if (res.ok && data?.success && Array.isArray(data.data?.wallets)) {
        const main = data.data.wallets.find((w: any) => w.type === 'MAIN');
        if (main) {
          setWalletBalance(main.balanceNaira || 0);
        }
      }
    } catch {
    } finally {
      setIsLoadingBalance(false);
    }
  };

  useEffect(() => {
    const token = getStoredAuthToken();
    if (!token) {
      clearSessionAndRedirect('expired');
      return;
    }

    try {
      const storedUser = getStoredUser();
      const storedBiz = getStoredBusiness();

      if (storedUser) {
        if (storedBiz?.role) setUserRole(storedBiz.role);
        else if (storedUser.role) setUserRole(storedUser.role);
        if (storedUser.firstName) setMerchantName(storedUser.firstName);
        if (storedUser.kycStatus) setKycStatus(storedUser.kycStatus);
        else setKycStatus('UNVERIFIED');
      } else {
        setKycStatus('UNVERIFIED');
      }

      if (storedBiz?.name) {
        setBusinessName(storedBiz.name);
      }
    } catch {}

    const handleBizSwitched = () => {
      const b = getStoredBusiness();
      if (b?.name) setBusinessName(b.name);
      if (b?.role) setUserRole(b.role);
      loadWallets();
    };

    window.addEventListener('bx_business_switched', handleBizSwitched);
    loadWallets();

    // Fetch dynamic catalog
    const fetchPlans = async () => {
      try {
        setIsLoadingPlans(true);
        const res = await fetch('/api/services/data/plans');
        const data = await res.json().catch(() => null);
        if (res.ok && data?.success && Array.isArray(data.data) && data.data.length > 0) {
          setPlans(data.data);
        }
      } catch {
      } finally {
        setIsLoadingPlans(false);
      }
    };
    fetchPlans();

    return () => window.removeEventListener('bx_business_switched', handleBizSwitched);
  }, []);

  const canExecuteServices =
    userRole === 'BUSINESS_OWNER' ||
    userRole === 'BUSINESS_ADMIN' ||
    userRole === 'DEVELOPER' ||
    userRole === 'SUPPORT';

  const isVerified = kycStatus === 'VERIFIED';

  // Handle phone changes and auto-detect network
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 11);
    setPhone(raw);
    setErrorMessage(null);

    if (raw.length >= 4) {
      const prefix = raw.slice(0, 4);
      const match = NETWORKS.find((net) => net.prefixes.includes(prefix));
      if (match && match.id !== selectedNetwork) {
        setSelectedNetwork(match.id);
        setSelectedPlanId('');
      }
    }
  };

  // Filter plans based on active network and category
  const filteredPlans = useMemo(() => {
    return plans.filter((p) => {
      const matchNetwork = p.network.toUpperCase() === selectedNetwork.toUpperCase();
      const matchCategory = selectedCategory === 'ALL' || p.category === selectedCategory;
      return matchNetwork && matchCategory;
    });
  }, [plans, selectedNetwork, selectedCategory]);

  const activePlan = useMemo(() => {
    return plans.find((p) => p.id === selectedPlanId) || null;
  }, [plans, selectedPlanId]);

  const activeNetworkConfig = useMemo(() => {
    return NETWORKS.find((n) => n.id === selectedNetwork) || NETWORKS[0];
  }, [selectedNetwork]);

  const handlePurchase = async () => {
    if (!activePlan) {
      setErrorMessage('Please select a data bundle.');
      return;
    }
    if (phone.length !== 11) {
      setErrorMessage('Please enter a valid 11-digit mobile phone number.');
      return;
    }
    if (walletBalance < activePlan.priceNaira) {
      setErrorMessage('Insufficient balance in your Main Wallet to complete this purchase.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      const token = getStoredAuthToken();

      const res = await fetch('/api/services/data/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          phone,
          planId: activePlan.id,
          network: selectedNetwork,
        }),
      });

      const data = await res.json().catch(() => null);

      if (handleAuthResponse(res, data)) {
        return;
      }

      if (!res.ok || !data?.success) {
        setErrorMessage(data?.message || 'Data bundle vending failed. Please try again.');
        setIsSubmitting(false);
        setIsConfirmModalOpen(false);
        return;
      }

      setIsConfirmModalOpen(false);
      const receiptItem: TransactionReceiptData = {
        transactionId: data.data?.transactionId || data.data?.id || `DAT-${Date.now()}`,
        reference: data.data?.reference || `DAT-${Date.now()}`,
        clientReference: data.data?.clientReference,
        serviceType: 'DATA',
        status: data.data?.status || 'SUCCESSFUL',
        recipient: phone,
        network: selectedNetwork,
        networkName: activeNetworkConfig.name,
        networkLogo: activeNetworkConfig.logo,
        faceAmountNaira: activePlan.priceNaira,
        amountDebitedNaira: activePlan.priceNaira,
        date: new Date().toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        }),
        businessName,
      };
      setReceiptData(receiptItem);
      setIsReceiptModalOpen(true);
      loadWallets();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Network communication error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col antialiased selection:bg-indigo-500 selection:text-white">
      <Sidebar
        businessName={businessName}
        merchantName={merchantName}
        kycStatus={kycStatus}
        userRole={userRole}
        onOpenKycModal={() => setIsKycModalOpen(true)}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className="lg:pl-72 flex flex-col min-h-screen">
        <Header
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onOpenKycModal={() => setIsKycModalOpen(true)}
          merchantName={merchantName}
          businessName={businessName}
          kycStatus={kycStatus}
          userRole={userRole}
          isRefreshing={false}
          onRefresh={loadWallets}
        />

        <main className="flex-1 p-3 sm:p-5 lg:p-7 max-w-7xl mx-auto w-full space-y-5">
          {!canExecuteServices ? (
            <AccessRestricted description="Mobile data bundle vending and utility top-ups are restricted to Workspace Owners, Administrators, Developers, and Support operations." />
          ) : (
            <>
              <KycBanner kycStatus={kycStatus} onOpenKycModal={() => setIsKycModalOpen(true)} />

              {/* Breadcrumb Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800/80">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Wifi className="w-5 h-5" />
                  </div>
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
                      Data Bundles
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                        Instant Delivery
                      </span>
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-400">
                      SME, Direct, and Corporate broadband data recharge across Nigerian telcos
                    </p>
                  </div>
                </div>

                {/* Main Wallet Indicator */}
                <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 self-start sm:self-auto">
                  <Wallet className="w-4 h-4 text-emerald-400" />
                  <span>Wallet Balance:</span>
                  <span className="font-semibold text-white">
                    {isLoadingBalance ? (
                      <span className="text-slate-500">Loading...</span>
                    ) : (
                      `₦${walletBalance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`
                    )}
                  </span>
                </div>
              </div>

              {errorMessage && (
                <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 text-red-300 text-sm">
                  <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium text-red-200">Transaction Notice</p>
                    <p className="text-xs text-red-300/90 mt-0.5">{errorMessage}</p>
                  </div>
                  <button onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-red-300">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* LEFT COLUMN: Controls & Plans */}
                <div className="lg:col-span-8 space-y-5">
                  {/* Step 1: Telco Selector */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      1. Select Network Provider
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {NETWORKS.map((net) => {
                        const isSelected = selectedNetwork === net.id;
                        return (
                          <button
                            key={net.id}
                            type="button"
                            onClick={() => {
                              setSelectedNetwork(net.id);
                              setSelectedPlanId('');
                            }}
                            className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                              isSelected
                                ? `${net.borderActive} ${net.bgActive} shadow-lg shadow-black/20`
                                : 'border-slate-800 bg-slate-950 hover:bg-slate-800/60 text-slate-300'
                            }`}
                          >
                            <div className="w-9 h-9 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center shrink-0 p-1.5 overflow-hidden">
                              <Image
                                src={net.logo}
                                alt={net.name}
                                width={28}
                                height={28}
                                className="object-contain"
                              />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-white truncate">{net.name}</p>
                              <p className="text-[10px] text-slate-400">Mobile Data</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Step 2: Recipient Input */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                      2. Recipient Phone Number
                    </label>
                    <div className="relative">
                      <input
                        type="tel"
                        value={phone}
                        onChange={handlePhoneChange}
                        placeholder="e.g. 0801 234 5678"
                        maxLength={11}
                        className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-mono text-base tracking-wide"
                      />
                      {phone.length === 11 && (
                        <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-xs text-emerald-400 font-medium">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Valid</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Step 3: Plan Category Filter & Grid */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <label className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                        3. Choose Bundle Plan
                      </label>
                      {/* Category Pills */}
                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                        {(['ALL', 'DAILY', 'WEEKLY', 'MONTHLY', 'MEGA'] as const).map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all shrink-0 ${
                              selectedCategory === cat
                                ? 'bg-emerald-500 text-white shadow-sm'
                                : 'bg-slate-950 border border-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            {cat === 'ALL' ? 'All Plans' : cat.charAt(0) + cat.slice(1).toLowerCase()}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Plans Grid */}
                    {isLoadingPlans ? (
                      <div className="py-12 flex flex-col items-center justify-center text-slate-400 text-sm gap-2">
                        <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
                        <span>Fetching latest bundle plans...</span>
                      </div>
                    ) : filteredPlans.length === 0 ? (
                      <div className="py-12 text-center text-slate-400 text-sm">
                        No bundles found for the selected category.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {filteredPlans.map((p) => {
                          const isSelected = selectedPlanId === p.id;
                          return (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => setSelectedPlanId(p.id)}
                              className={`p-3.5 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                                isSelected
                                  ? 'border-emerald-500 bg-emerald-500/10 ring-2 ring-emerald-500/20'
                                  : 'border-slate-800 bg-slate-950 hover:border-slate-700 text-slate-300'
                              }`}
                            >
                              <div className="space-y-1">
                                <div className="flex items-center justify-between gap-1">
                                  <span className="text-xs font-bold text-white tracking-wide">
                                    {p.dataAllowance}
                                  </span>
                                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 font-medium">
                                    {p.validity}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-400 truncate">{p.name}</p>
                              </div>
                              <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between">
                                <span className="text-xs font-semibold text-emerald-400 font-mono">
                                  ₦{p.priceNaira.toLocaleString()}
                                </span>
                                {isSelected && (
                                  <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1">
                                    <CheckCircle2 className="w-3 h-3" /> Selected
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* RIGHT COLUMN: Order Summary & Execution */}
                <div className="lg:col-span-4 space-y-4">
                  <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 sticky top-20">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 pb-2 border-b border-slate-800">
                      Order Summary
                    </h3>

                    <div className="space-y-3 text-xs">
                      <div className="flex justify-between py-1 border-b border-slate-800/60">
                        <span className="text-slate-400">Network</span>
                        <span className="font-semibold text-white">{selectedNetwork}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-800/60">
                        <span className="text-slate-400">Recipient Phone</span>
                        <span className="font-mono font-medium text-white">{phone || '—'}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-800/60">
                        <span className="text-slate-400">Data Allowance</span>
                        <span className="font-semibold text-emerald-400">
                          {activePlan?.dataAllowance || '—'}
                        </span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-800/60">
                        <span className="text-slate-400">Validity</span>
                        <span className="font-medium text-slate-200">{activePlan?.validity || '—'}</span>
                      </div>
                      <div className="flex justify-between py-1.5 border-b border-slate-800/60 text-sm">
                        <span className="text-slate-300 font-medium">Total Charge</span>
                        <span className="font-mono font-bold text-white">
                          ₦{activePlan ? activePlan.priceNaira.toLocaleString() : '0.00'}
                        </span>
                      </div>
                    </div>

                    {/* Insufficient Balance Notice */}
                    {activePlan && walletBalance < activePlan.priceNaira && (
                      <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <span>Insufficient balance. You need ₦{(activePlan.priceNaira - walletBalance).toLocaleString()} more.</span>
                        </div>
                      </div>
                    )}

                    {/* Submit Button */}
                    <button
                      type="button"
                      disabled={!activePlan || phone.length !== 11 || isSubmitting}
                      onClick={() => setIsConfirmModalOpen(true)}
                      className="w-full py-3.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Processing Vending...</span>
                        </>
                      ) : (
                        <>
                          <span>Purchase Data Bundle</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>

                    <p className="text-[11px] text-center text-slate-500">
                      Automated high-throughput delivery with instant confirmation receipt.
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
      </div>

      {/* Confirmation Modal */}
      {isConfirmModalOpen && activePlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-semibold text-white flex items-center gap-2">
                <Wifi className="w-4 h-4 text-emerald-400" />
                Confirm Data Recharge
              </h3>
              <button
                onClick={() => setIsConfirmModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Telco:</span>
                <span className="font-bold text-white">{selectedNetwork}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Recipient:</span>
                <span className="font-mono font-medium text-white">{phone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Plan:</span>
                <span className="font-medium text-white">{activePlan.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Allowance:</span>
                <span className="font-bold text-emerald-400">{activePlan.dataAllowance}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-800 text-sm">
                <span className="text-slate-300 font-medium">Debit Amount:</span>
                <span className="font-mono font-bold text-white">
                  ₦{activePlan.priceNaira.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-700 bg-slate-800/60 hover:bg-slate-800 text-slate-300 text-sm font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handlePurchase}
                className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm & Vend'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transaction Receipt Modal */}
      {isReceiptModalOpen && receiptData && (
        <TransactionReceiptModal
          isOpen={isReceiptModalOpen}
          onClose={() => setIsReceiptModalOpen(false)}
          receipt={receiptData}
        />
      )}

      {/* KYC Modal */}
      <KycModal
        isOpen={isKycModalOpen}
        onClose={() => setIsKycModalOpen(false)}
        onSuccess={() => setKycStatus('VERIFIED')}
      />
    </div>
  );
}
