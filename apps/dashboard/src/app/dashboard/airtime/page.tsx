'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Smartphone,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Wallet,
  X,
} from 'lucide-react';
import Sidebar from '@/components/dashboard/Sidebar';
import Header from '@/components/dashboard/Header';
import KycBanner from '@/components/dashboard/KycBanner';
import KycModal from '@/components/dashboard/KycModal';
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
  discountBps: number;
}

const NETWORKS: NetworkOption[] = [
  {
    id: 'MTN',
    name: 'MTN',
    logo: '/logos/telecom/mtn.svg',
    prefixes: ['0803', '0806', '0703', '0706', '0813', '0816', '0810', '0814', '0903', '0906', '0913', '0916'],
    borderActive: 'border-amber-400 ring-2 ring-amber-400/20',
    bgActive: 'bg-amber-400/5',
    discountBps: 0,
  },
  {
    id: 'AIRTEL',
    name: 'Airtel',
    logo: '/logos/telecom/airtel.svg',
    prefixes: ['0802', '0808', '0708', '0812', '0701', '0902', '0901', '0904', '0907', '0912'],
    borderActive: 'border-red-500 ring-2 ring-red-500/20',
    bgActive: 'bg-red-500/5',
    discountBps: 0,
  },
  {
    id: 'GLO',
    name: 'Glo',
    logo: '/logos/telecom/glo.svg',
    prefixes: ['0805', '0807', '0705', '0815', '0811', '0905', '0915'],
    borderActive: 'border-emerald-500 ring-2 ring-emerald-500/20',
    bgActive: 'bg-emerald-500/5',
    discountBps: 0,
  },
  {
    id: '9MOBILE',
    name: '9mobile',
    logo: '/logos/telecom/9mobile.svg',
    prefixes: ['0809', '0817', '0818', '0909', '0908'],
    borderActive: 'border-teal-500 ring-2 ring-teal-500/20',
    bgActive: 'bg-teal-500/5',
    discountBps: 0,
  },
];

const PRESET_AMOUNTS = [100, 200, 500, 1000, 2000, 5000];

export default function AirtimeVendingPage() {
  const router = useRouter();

  // User & Business State
  const [merchantName, setMerchantName] = useState('Merchant');
  const [businessName, setBusinessName] = useState('My Business');
  const [kycStatus, setKycStatus] = useState<string>('INITIALIZING');
  const [isKycModalOpen, setIsKycModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [isLoadingBalance, setIsLoadingBalance] = useState<boolean>(true);

  // Form State
  const [phone, setPhone] = useState<string>('');
  const [selectedNetwork, setSelectedNetwork] = useState<string>('MTN');
  const [amount, setAmount] = useState<string>('500');
  const [networksList, setNetworksList] = useState<NetworkOption[]>(NETWORKS);

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

  // Load user details & wallet balance
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

    loadWallets();

    // Fetch dynamic network directory with admin-configured discount rates
    const loadNetworksCatalog = async () => {
      try {
        const res = await fetch('/api/services/airtime/networks');
        const data = await res.json().catch(() => null);
        if (res.ok && data?.success && Array.isArray(data.data)) {
          setNetworksList((prev) =>
            prev.map((net) => {
              const matched = data.data.find((n: any) => n.network === net.id);
              if (matched && typeof matched.discountBps === 'number') {
                return { ...net, discountBps: matched.discountBps };
              }
              return net;
            }),
          );
        }
      } catch {}
    };
    loadNetworksCatalog();
  }, []);

  const isVerified = kycStatus === 'VERIFIED';

  // Detect network from prefix
  const detectedNetwork = useMemo(() => {
    if (phone.length >= 4) {
      const prefix = phone.slice(0, 4);
      return networksList.find((net) => net.prefixes.includes(prefix)) || null;
    }
    return null;
  }, [phone, networksList]);

  // Auto-detect network silently as user types
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 11);
    setPhone(raw);
    setErrorMessage(null);

    if (raw.length >= 4) {
      const prefix = raw.slice(0, 4);
      const match = networksList.find((net) => net.prefixes.includes(prefix));
      if (match) {
        setSelectedNetwork(match.id);
      }
    }
  };

  const activeNetworkConfig = useMemo(() => {
    return networksList.find((n) => n.id === selectedNetwork) || networksList[0] || NETWORKS[0];
  }, [selectedNetwork, networksList]);

  const numericAmount = parseFloat(amount) || 0;

  const handleOpenConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!isVerified) {
      setIsKycModalOpen(true);
      return;
    }

    if (phone.length !== 11) {
      setErrorMessage('Please enter a valid 11-digit Nigerian phone number.');
      return;
    }

    if (numericAmount < 100 || numericAmount > 50000) {
      setErrorMessage('Airtime recharge amount must be between ₦100 and ₦50,000.');
      return;
    }

    setIsConfirmModalOpen(true);
  };

  const handleExecutePurchase = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const authToken = getStoredAuthToken();
      if (!authToken) {
        clearSessionAndRedirect('expired');
        return;
      }

      const amountKobo = Math.round(numericAmount * 100);

      const response = await fetch('/api/services/airtime/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          phone,
          amountKobo,
          network: selectedNetwork,
          clientReference: `BXT-AIR-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        }),
      });

      const responseText = await response.text();
      let result: any = null;
      try {
        result = JSON.parse(responseText);
      } catch {
        result = {
          success: false,
          error: {
            message: `Server returned an unexpected response (${response.status}: ${response.statusText || 'Error'}). Please try again.`,
          },
        };
      }

      if (handleAuthResponse(response, result)) {
        return;
      }

      if (!response.ok || !result?.success) {
        const msg = result?.error?.message || result?.message || 'Airtime vending failed. Please try again.';
        throw new Error(msg);
      }

      const data = result.data;
      const faceVal = data?.faceAmountNaira ?? numericAmount;
      const discountVal =
        data?.discountNaira !== undefined
          ? data.discountNaira
          : (numericAmount * (activeNetworkConfig.discountBps || 250)) / 10000;
      const debitedVal = data?.amountDebitedNaira ?? (faceVal - discountVal);

      const receiptItem: TransactionReceiptData = {
        transactionId: data?.transactionId || data?.id || `txn_${Date.now()}`,
        reference: data?.reference || data?.clientReference || `BXT-AIR-${Date.now().toString().slice(-8)}`,
        clientReference: data?.clientReference,
        serviceType: 'AIRTIME',
        status: data?.status || 'SUCCESSFUL',
        recipient: phone,
        network: selectedNetwork,
        networkName: activeNetworkConfig.name,
        networkLogo: activeNetworkConfig.logo,
        faceAmountNaira: faceVal,
        discountNaira: discountVal,
        amountDebitedNaira: debitedVal,
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
      setIsConfirmModalOpen(false);
      setIsReceiptModalOpen(true);
      loadWallets();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Transaction could not be completed.';
      setErrorMessage(msg);
      setIsConfirmModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadWallets();
    setTimeout(() => setIsRefreshing(false), 600);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070D18] text-slate-800 dark:text-slate-100 flex flex-col lg:flex-row transition-colors duration-150">
      {/* Sidebar Navigation */}
      <Sidebar
        businessName={businessName}
        merchantName={merchantName}
        kycStatus={kycStatus}
        onOpenKycModal={() => setIsKycModalOpen(true)}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-72">
        <Header
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onOpenKycModal={() => setIsKycModalOpen(true)}
          merchantName={merchantName}
          kycStatus={kycStatus}
          isRefreshing={isRefreshing}
          onRefresh={handleRefresh}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full space-y-5">
          {/* Identity Verification Warning Banner */}
          <KycBanner
            kycStatus={kycStatus}
            onOpenKycModal={() => setIsKycModalOpen(true)}
          />

          {/* Navigation Action: Back to Dashboard */}
          <div>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1528] text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors shadow-xs w-fit"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-slate-400" />
              <span>Back to Dashboard</span>
            </Link>
          </div>

          {/* Page Heading & Compact Balance */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-500/10 text-[#126BEB] dark:bg-blue-500/15 dark:text-[#38BDF8] border border-blue-500/20">
                  <Smartphone className="w-4 h-4" />
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  Airtime Recharge
                </h1>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Top up any Nigerian mobile number with instant value delivery
              </p>
            </div>

            {/* Compact Balance Indicator */}
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 text-xs font-medium text-slate-600 dark:text-slate-300 w-fit">
              <Wallet className="w-3.5 h-3.5 text-[#126BEB] dark:text-[#38BDF8]" />
              <span>Balance:</span>
              {isLoadingBalance ? (
                <span className="inline-block w-16 h-3.5 bg-slate-300 dark:bg-slate-700 rounded animate-pulse" />
              ) : (
                <span className="font-bold text-slate-900 dark:text-white">
                  ₦{walletBalance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                </span>
              )}
            </div>
          </div>

          {/* Error Alert Message */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs flex items-center gap-2.5 shadow-xs">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Centered, Well-Proportioned Airtime Purchase Card */}
          <div className="max-w-lg mx-auto w-full pt-1">
            <div className="bg-white dark:bg-[#0B1528] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 sm:p-6 shadow-xs">
              <form onSubmit={handleOpenConfirm} noValidate className="space-y-4">
                {/* 1. Recipient Phone Number */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={11}
                    placeholder="08012345678"
                    value={phone}
                    onChange={handlePhoneChange}
                    className="w-full h-12 px-4 rounded-xl bg-slate-50 dark:bg-[#070D18] border border-slate-200 dark:border-slate-700 focus:border-[#126BEB] focus:ring-2 focus:ring-[#126BEB]/20 text-slate-900 dark:text-white text-base font-semibold placeholder:text-slate-400 placeholder:font-normal focus:outline-none transition-all shadow-xs"
                    required
                  />
                </div>

                {/* 2. Mobile Network Operator Selection */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    Select Network
                  </label>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {networksList.map((network) => {
                      const isSelected = selectedNetwork === network.id;
                      return (
                        <button
                          key={network.id}
                          type="button"
                          onClick={() => setSelectedNetwork(network.id)}
                          className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                            isSelected
                              ? `${network.borderActive} ${network.bgActive}`
                              : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#070E1C]/50 hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                        >
                          <div className="h-8 w-full flex items-center justify-center relative">
                            <Image
                              src={network.logo}
                              alt={network.name}
                              width={44}
                              height={28}
                              className="object-contain max-h-7 max-w-full"
                            />
                          </div>
                          <span className="text-xs font-bold text-slate-900 dark:text-white">
                            {network.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Clean, short, neutral mismatch note */}
                  {detectedNetwork && selectedNetwork !== detectedNetwork.id && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 pt-1">
                      Prefix matches <span className="font-semibold text-slate-800 dark:text-slate-200">{detectedNetwork.name}</span>, but <span className="font-semibold text-slate-800 dark:text-slate-200">{activeNetworkConfig.name}</span> is selected.
                    </p>
                  )}
                </div>

                {/* 3. Recharge Amount */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    Amount (₦)
                  </label>

                  {/* Preset Amount Chips */}
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                    {PRESET_AMOUNTS.map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setAmount(val.toString())}
                        className={`py-2 px-2 rounded-xl text-xs sm:text-sm font-semibold border transition-all cursor-pointer ${
                          numericAmount === val
                            ? 'bg-[#126BEB] text-white border-[#126BEB] shadow-xs'
                            : 'bg-slate-50 dark:bg-[#070E1C] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        ₦{val.toLocaleString()}
                      </button>
                    ))}
                  </div>

                  {/* Custom Amount Input */}
                  <div className="relative mt-2">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base font-bold text-slate-400 select-none">
                      ₦
                    </span>
                    <input
                      type="number"
                      min={100}
                      max={50000}
                      step="any"
                      placeholder="Enter custom amount"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full h-12 pl-9 pr-4 rounded-xl bg-slate-50 dark:bg-[#070D18] border border-slate-200 dark:border-slate-700 focus:border-[#126BEB] focus:ring-2 focus:ring-[#126BEB]/20 text-slate-900 dark:text-white text-base font-semibold placeholder:text-slate-400 placeholder:font-normal focus:outline-none transition-all shadow-xs"
                      required
                    />
                  </div>
                </div>

                {/* Proceed Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={!phone || !numericAmount}
                    className="w-full py-3.5 px-4 rounded-xl bg-[#126BEB] hover:bg-[#0B5CC7] active:bg-[#094bb5] text-white font-bold text-sm shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span>Proceed to Recharge</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>
          </div>
        </main>
      </div>

      {/* Clean Unified Confirmation Modal */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white dark:bg-[#0B1528] rounded-2xl border border-slate-200/90 dark:border-slate-800 p-5 sm:p-6 shadow-2xl space-y-4 text-slate-900 dark:text-white">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Confirm Airtime Recharge
              </h3>
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                disabled={isSubmitting}
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Clean, unified detail rows with seamless styling */}
            <div className="space-y-3 py-1 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">Network</span>
                <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Image
                    src={activeNetworkConfig.logo}
                    alt={activeNetworkConfig.name}
                    width={20}
                    height={14}
                    className="object-contain"
                  />
                  {activeNetworkConfig.name}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">Recipient Phone</span>
                <span className="font-semibold text-slate-900 dark:text-white text-sm">{phone}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">Airtime Face Value</span>
                <span className="font-semibold text-slate-900 dark:text-white text-sm">
                  ₦{numericAmount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                </span>
              </div>
              {activeNetworkConfig.discountBps > 0 && ((numericAmount * activeNetworkConfig.discountBps) / 10000) > 0 && (
                <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400 font-medium">
                  <span>Merchant Discount ({((activeNetworkConfig.discountBps) / 100).toFixed(1)}%)</span>
                  <span>
                    -₦{((numericAmount * activeNetworkConfig.discountBps) / 10000).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2.5 border-t border-slate-100 dark:border-slate-800/80">
                <div>
                  <span className="font-bold text-slate-900 dark:text-white block">Amount to Debit</span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">From Main Wallet</span>
                </div>
                <span className="font-bold text-[#126BEB] dark:text-[#38BDF8] text-base">
                  ₦{(numericAmount - ((numericAmount * (activeNetworkConfig.discountBps || 0)) / 10000)).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Short Mismatch Notice in Modal */}
            {detectedNetwork && selectedNetwork !== detectedNetwork.id && (
              <p className="text-[11.5px] text-slate-500 dark:text-slate-400 text-center">
                Note: Prefix matches {detectedNetwork.name}, recharging via {activeNetworkConfig.name}.
              </p>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                disabled={isSubmitting}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecutePurchase}
                disabled={isSubmitting}
                className="flex-1 py-2.5 rounded-xl bg-[#126BEB] hover:bg-[#0B5CC7] active:bg-[#094bb5] text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <span>Confirm & Pay</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sleek Enterprise BAXATO Transaction Receipt Modal with Live Auto-Pinging & PDF Export */}
      <TransactionReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        receipt={receiptData}
        onRechargeAnother={() => {
          setIsReceiptModalOpen(false);
          setPhone('');
          loadWallets();
        }}
        onStatusUpdated={(updated) => {
          setReceiptData(updated);
          loadWallets();
        }}
        pollingEndpoint="/api/services/airtime/status/"
      />

      {/* KYC Verification Modal */}
      <KycModal
        isOpen={isKycModalOpen}
        onClose={() => setIsKycModalOpen(false)}
        onSuccess={() => setKycStatus('VERIFIED')}
      />
    </div>
  );
}
