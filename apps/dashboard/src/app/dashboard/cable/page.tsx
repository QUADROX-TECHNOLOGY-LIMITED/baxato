'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Tv,
  ArrowLeft,
  Wallet,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Check,
  Clock,
  AlertTriangle,
  Receipt,
  UserCheck,
  Lock,
} from 'lucide-react';
import Sidebar from '@/components/dashboard/Sidebar';
import Header from '@/components/dashboard/Header';
import KycBanner from '@/components/dashboard/KycBanner';
import KycModal from '@/components/dashboard/KycModal';
import CableReceiptModal, {
  CableReceiptData,
} from '@/components/dashboard/CableReceiptModal';
import {
  getStoredAuthToken,
  getStoredUser,
  getStoredBusiness,
  clearSessionAndRedirect,
  handleAuthResponse,
} from '@/lib/auth-session';

export type CableOperatorCode = 'DSTV' | 'GOTV' | 'STARTIMES' | 'SHOWMAX';

export interface CableOperatorOption {
  code: CableOperatorCode;
  name: string;
  shortName: string;
  logo: string;
  customerField: string;
  minDigits: number;
  maxDigits: number;
  discountBps: number; // 150 = 1.5%
  description: string;
}

export interface CableBouquetOption {
  id: string;
  operator: CableOperatorCode;
  operatorName: string;
  name: string;
  code: string;
  validity: string;
  priceNaira: number;
  discountBps: number;
  description: string;
}

export interface VerifiedDecoder {
  smartcard: string;
  customerName?: string;
  accountStatus?: string;
  outstandingBalanceNaira?: number;
}

export interface CableHistoryItem {
  id: string;
  reference: string;
  clientReference?: string;
  providerReference?: string;
  type: string;
  status: 'SUCCESSFUL' | 'PROCESSING' | 'PENDING' | 'FAILED' | 'REVERSED';
  amountNaira: number;
  feeNaira: number;
  currency: string;
  recipient: string;
  metadata?: {
    operator?: string;
    operatorName?: string;
    smartcard?: string;
    customerName?: string;
    bouquetId?: string;
    bouquetName?: string;
    validity?: string;
  };
  createdAt: string;
}

const CABLE_OPERATORS: CableOperatorOption[] = [
  {
    code: 'DSTV',
    name: 'DStv (MultiChoice)',
    shortName: 'DStv',
    logo: '/logos/cable/dstv.svg',
    customerField: 'Smartcard Number',
    minDigits: 10,
    maxDigits: 11,
    discountBps: 150,
    description: 'Premium sports, blockbuster movies, kids and news channels',
  },
  {
    code: 'GOTV',
    name: 'GOtv (MultiChoice)',
    shortName: 'GOtv',
    logo: '/logos/cable/gotv.png',
    customerField: 'IUC / Decoder Number',
    minDigits: 10,
    maxDigits: 11,
    discountBps: 150,
    description: 'Digital terrestrial TV with football, movies, and family shows',
  },
  {
    code: 'STARTIMES',
    name: 'StarTimes Nigeria',
    shortName: 'StarTimes',
    logo: '/logos/cable/startimes.svg',
    customerField: 'Smartcard / e-Wallet Number',
    minDigits: 11,
    maxDigits: 11,
    discountBps: 200,
    description: 'Affordable digital entertainment and live Bundesliga football',
  },
];

const DEFAULT_BOUQUETS: CableBouquetOption[] = [
  // --- DSTV ---
  {
    id: 'dstv-padi',
    operator: 'DSTV',
    operatorName: 'DStv',
    name: 'DStv Padi',
    code: 'DStv Padi Bouquet E36',
    validity: '30 Days',
    priceNaira: 4400,
    discountBps: 150,
    description: 'Entry-level local entertainment, news, and kids channels',
  },
  {
    id: 'dstv-yanga',
    operator: 'DSTV',
    operatorName: 'DStv',
    name: 'DStv Yanga',
    code: 'DStv Yanga Bouquet E36',
    validity: '30 Days',
    priceNaira: 6000,
    discountBps: 150,
    description: 'Expanded movie, family entertainment, and music bouquet',
  },
  {
    id: 'dstv-confam',
    operator: 'DSTV',
    operatorName: 'DStv',
    name: 'DStv Confam',
    code: 'DStv Confam Bouquet E36',
    validity: '30 Days',
    priceNaira: 11000,
    discountBps: 150,
    description: 'Over 120 channels including sports, movies, and documentary',
  },
  {
    id: 'dstv-compact',
    operator: 'DSTV',
    operatorName: 'DStv',
    name: 'DStv Compact',
    code: 'Compact',
    validity: '30 Days',
    priceNaira: 19000,
    discountBps: 150,
    description: 'Premier League football, international movies, and drama series',
  },
  {
    id: 'dstv-compact-plus',
    operator: 'DSTV',
    operatorName: 'DStv',
    name: 'DStv Compact Plus',
    code: 'Compact Plus',
    validity: '30 Days',
    priceNaira: 30000,
    discountBps: 150,
    description: 'Champions League, UFC, motorsport, and premium entertainment',
  },
  {
    id: 'dstv-premium',
    operator: 'DSTV',
    operatorName: 'DStv',
    name: 'DStv Premium',
    code: 'Premium',
    validity: '30 Days',
    priceNaira: 44500,
    discountBps: 150,
    description: 'All DStv channels, all sports, Showmax included and 4K Ultra HD',
  },
  {
    id: 'dstv-extraview',
    operator: 'DSTV',
    operatorName: 'DStv',
    name: 'DStv ExtraView Add-on',
    code: 'HDPVR Access/Extraview',
    validity: '30 Days',
    priceNaira: 6000,
    discountBps: 150,
    description: 'Link up to 3 decoders under one primary subscription',
  },

  // --- GOTV ---
  {
    id: 'gotv-smallie',
    operator: 'GOTV',
    operatorName: 'GOtv',
    name: 'GOtv Smallie Monthly',
    code: 'GOtv Smallie - Monthly',
    validity: '30 Days',
    priceNaira: 1900,
    discountBps: 150,
    description: 'Budget-friendly local entertainment, news, and religious channels',
  },
  {
    id: 'gotv-jinja',
    operator: 'GOTV',
    operatorName: 'GOtv',
    name: 'GOtv Jinja',
    code: 'JINJA',
    validity: '30 Days',
    priceNaira: 3900,
    discountBps: 150,
    description: '45+ channels with Africa Magic, Real Time, and kids favorites',
  },
  {
    id: 'gotv-jolli',
    operator: 'GOTV',
    operatorName: 'GOtv',
    name: 'GOtv Jolli',
    code: 'JOLLI',
    validity: '30 Days',
    priceNaira: 5800,
    discountBps: 150,
    description: '65+ channels with SuperSport, movie action, and telenovelas',
  },
  {
    id: 'gotv-max',
    operator: 'GOTV',
    operatorName: 'GOtv',
    name: 'GOtv Max',
    code: 'GOTV MAX',
    validity: '30 Days',
    priceNaira: 8500,
    discountBps: 150,
    description: 'La Liga, Serie A, WWE, international movies, and kids TV',
  },
  {
    id: 'gotv-supa',
    operator: 'GOTV',
    operatorName: 'GOtv',
    name: 'GOtv Supa',
    code: 'SUPA',
    validity: '30 Days',
    priceNaira: 11400,
    discountBps: 150,
    description: 'Over 80 channels including Nick Jr, Africa Magic Urban, and sports',
  },
  {
    id: 'gotv-supa-plus',
    operator: 'GOTV',
    operatorName: 'GOtv',
    name: 'GOtv Supa Plus',
    code: 'GOTV Supa Plus',
    validity: '30 Days',
    priceNaira: 16800,
    discountBps: 150,
    description: 'All Premier League football matches and complete GOtv package',
  },

  // --- STARTIMES ---
  {
    id: 'startimes-nova',
    operator: 'STARTIMES',
    operatorName: 'StarTimes',
    name: 'StarTimes Nova',
    code: 'DTT_Nova Monthly',
    validity: '30 Days',
    priceNaira: 2100,
    discountBps: 200,
    description: 'Affordable digital TV package with 30+ local channels',
  },
  {
    id: 'startimes-basic',
    operator: 'STARTIMES',
    operatorName: 'StarTimes',
    name: 'StarTimes Basic',
    code: 'DTT_Basic Monthly',
    validity: '30 Days',
    priceNaira: 4000,
    discountBps: 200,
    description: 'Over 45 digital channels including movies, kids, and news',
  },
  {
    id: 'startimes-classic',
    operator: 'STARTIMES',
    operatorName: 'StarTimes',
    name: 'StarTimes Classic',
    code: 'DTT_Classic Monthly',
    validity: '30 Days',
    priceNaira: 6000,
    discountBps: 200,
    description: 'Comprehensive bouquet with Bundesliga football and entertainment',
  },
  {
    id: 'startimes-super',
    operator: 'STARTIMES',
    operatorName: 'StarTimes',
    name: 'StarTimes Super',
    code: 'DTT_Super Monthly',
    validity: '30 Days',
    priceNaira: 9000,
    discountBps: 200,
    description: 'Complete StarTimes digital package with all premium channels',
  },
];

export default function CableTvPage() {
  // Navigation & User State
  const [merchantName, setMerchantName] = useState('Merchant');
  const [businessName, setBusinessName] = useState('My Business');
  const [kycStatus, setKycStatus] = useState<string>('INITIALIZING');
  const [isKycModalOpen, setIsKycModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [isLoadingBalance, setIsLoadingBalance] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Operator Selection & Catalog State
  const [selectedOperator, setSelectedOperator] = useState<CableOperatorOption | null>(null);
  const [filterType, setFilterType] = useState<'ALL' | 'DSTV' | 'GOTV' | 'STARTIMES'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Bouquets Catalog State
  const [bouquetsList, setBouquetsList] = useState<CableBouquetOption[]>(DEFAULT_BOUQUETS);
  const [selectedBouquetId, setSelectedBouquetId] = useState<string>('');

  // Vending Form State
  const [smartcard, setSmartcard] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');

  // Smartcard Validation State
  const [isValidating, setIsValidating] = useState(false);
  const [verifiedDecoder, setVerifiedDecoder] = useState<VerifiedDecoder | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const autoVerifyTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Purchase & Confirmation State
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Receipt Modal State
  const [receiptData, setReceiptData] = useState<CableReceiptData | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // History State
  const [historyItems, setHistoryItems] = useState<CableHistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
  const [historySearch, setHistorySearch] = useState('');

  const isVerified = kycStatus === 'VERIFIED';

  // Load Wallets
  const loadWallets = async () => {
    try {
      setIsLoadingBalance(true);
      const authToken = getStoredAuthToken();
      if (!authToken) {
        clearSessionAndRedirect('expired');
        return;
      }

      const res = await fetch('/api/wallets', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json().catch(() => null);

      if (handleAuthResponse(res, data)) return;

      if (res.ok && data?.success && Array.isArray(data.data)) {
        const primary = data.data.find(
          (w: { walletType: string; isPrimary: boolean }) =>
            w.walletType === 'COLLECTION_ACCOUNT' || w.isPrimary,
        );
        const balKobo = primary ? BigInt(primary.balanceKobo || '0') : 0n;
        setWalletBalance(Number(balKobo) / 100);
      }
    } catch {
      // Fallback
    } finally {
      setIsLoadingBalance(false);
      setIsRefreshing(false);
    }
  };

  // Load Bouquets from Backend
  const loadBouquets = async () => {
    try {
      const authToken = getStoredAuthToken();
      const res = await fetch('/api/services/cable/bouquets', {
        headers: {
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success && Array.isArray(data.data) && data.data.length > 0) {
        setBouquetsList(data.data);
      }
    } catch {
      // Fallback to default bouquets
    }
  };

  // Load Transaction History
  const loadHistory = async () => {
    try {
      setIsLoadingHistory(true);
      const authToken = getStoredAuthToken();
      if (!authToken) return;

      const res = await fetch('/api/services/cable/history?limit=25&offset=0', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success && data.data?.transactions) {
        setHistoryItems(data.data.transactions);
      }
    } catch {
      // History fallback
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Initialize
  useEffect(() => {
    const user = getStoredUser();
    const biz = getStoredBusiness();
    if (user?.firstName) setMerchantName(user.firstName);
    if (user?.kycStatus) setKycStatus(user.kycStatus);
    else setKycStatus('UNVERIFIED');
    if (biz?.name) setBusinessName(biz.name);

    loadWallets();
    loadBouquets();
    loadHistory();
  }, []);

  // Filtered Operators
  const filteredOperators = useMemo(() => {
    return CABLE_OPERATORS.filter((op) => {
      const matchesFilter = filterType === 'ALL' || op.code === filterType;
      const matchesSearch =
        searchQuery.trim() === '' ||
        op.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        op.shortName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        op.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [filterType, searchQuery]);

  // Bouquets for selected operator
  const operatorBouquets = useMemo(() => {
    if (!selectedOperator) return [];
    return bouquetsList.filter((b) => b.operator === selectedOperator.code);
  }, [bouquetsList, selectedOperator]);

  // Default select first bouquet when operator changes
  useEffect(() => {
    if (operatorBouquets.length > 0) {
      setSelectedBouquetId(operatorBouquets[0].id);
    } else {
      setSelectedBouquetId('');
    }
  }, [selectedOperator, operatorBouquets]);

  // Selected Bouquet
  const currentBouquet = useMemo(() => {
    return operatorBouquets.find((b) => b.id === selectedBouquetId) || operatorBouquets[0];
  }, [operatorBouquets, selectedBouquetId]);

  // Pricing & Discount
  const faceAmountNaira = currentBouquet ? currentBouquet.priceNaira : 0;
  const discountBps = selectedOperator ? selectedOperator.discountBps : 0;
  const discountNaira = Math.floor((faceAmountNaira * discountBps) / 10000);
  const amountToDebitNaira = Math.max(0, faceAmountNaira - discountNaira);
  const hasSufficientBalance = walletBalance >= amountToDebitNaira;

  // Real-time Decoder Validation
  const handleValidateDecoder = async (numToValidate?: string) => {
    if (!selectedOperator) return;

    const raw = numToValidate !== undefined ? numToValidate : smartcard;
    const cleanNum = raw.replace(/[\s\-()]/g, '');

    if (cleanNum.length < selectedOperator.minDigits) {
      setValidationError(
        `${selectedOperator.shortName} requires at least ${selectedOperator.minDigits} digits.`,
      );
      return;
    }

    setIsValidating(true);
    setValidationError(null);
    setVerifiedDecoder(null);

    try {
      const authToken = getStoredAuthToken();
      const res = await fetch('/api/services/cable/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          operator: selectedOperator.code,
          smartcard: cleanNum,
        }),
      });

      const data = await res.json().catch(() => null);

      if (res.ok && data?.success && data.data?.isValid) {
        setVerifiedDecoder({
          smartcard: cleanNum,
          customerName: data.data.customerName || undefined,
          accountStatus: data.data.accountStatus || 'ACTIVE',
          outstandingBalanceNaira: data.data.outstandingBalanceNaira,
        });
      } else {
        const errorMsg =
          data?.error?.message ||
          data?.data?.responseMessage ||
          'Decoder validation failed. Please check the smartcard number.';
        setValidationError(errorMsg);
      }
    } catch {
      setValidationError('Network error while validating decoder. Please try again.');
    } finally {
      setIsValidating(false);
    }
  };

  // Auto-trigger validation when required digits reached
  const handleSmartcardChange = (val: string) => {
    setSmartcard(val);
    setVerifiedDecoder(null);
    setValidationError(null);
    setSubmitError(null);

    if (autoVerifyTimeoutRef.current) {
      clearTimeout(autoVerifyTimeoutRef.current);
    }

    if (!selectedOperator) return;
    const clean = val.replace(/[\s\-()]/g, '');

    if (clean.length >= selectedOperator.minDigits && clean.length <= selectedOperator.maxDigits) {
      autoVerifyTimeoutRef.current = setTimeout(() => {
        handleValidateDecoder(clean);
      }, 500);
    }
  };

  const handleSelectOperator = (op: CableOperatorOption) => {
    setSelectedOperator(op);
    setSmartcard('');
    setCustomerMobile('');
    setVerifiedDecoder(null);
    setValidationError(null);
    setSubmitError(null);
  };

  const handleBackToCatalog = () => {
    setSelectedOperator(null);
    setSmartcard('');
    setCustomerMobile('');
    setVerifiedDecoder(null);
    setValidationError(null);
    setSubmitError(null);
  };

  const handleOpenConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!selectedOperator || !currentBouquet) {
      setSubmitError('Please select a Cable TV bouquet.');
      return;
    }

    const clean = smartcard.replace(/[\s\-()]/g, '');
    if (clean.length < selectedOperator.minDigits) {
      setSubmitError(
        `Please enter a valid ${selectedOperator.shortName} ${selectedOperator.customerField}.`,
      );
      return;
    }

    if (!hasSufficientBalance) {
      setSubmitError(
        `Insufficient wallet balance. Total cost is ₦${amountToDebitNaira.toLocaleString()}, but your balance is ₦${walletBalance.toLocaleString()}. Please fund your wallet.`,
      );
      return;
    }

    setIsConfirmModalOpen(true);
  };

  // Execute Purchase
  const handleExecutePurchase = async () => {
    if (!selectedOperator || !currentBouquet) return;

    setIsSubmitting(true);
    setSubmitError(null);

    const clean = smartcard.replace(/[\s\-()]/g, '');
    const clientRef = `BX-CAB-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const idempotencyKey =
      typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : clientRef;

    try {
      const authToken = getStoredAuthToken();
      if (!authToken) {
        clearSessionAndRedirect('expired');
        return;
      }

      const res = await fetch('/api/services/cable/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
          'x-idempotency-key': idempotencyKey,
        },
        body: JSON.stringify({
          operator: selectedOperator.code,
          smartcard: clean,
          bouquetId: currentBouquet.id,
          customerMobile: customerMobile.trim() || undefined,
          customerName: verifiedDecoder?.customerName || undefined,
          clientReference: clientRef,
        }),
      });

      const data = await res.json().catch(() => null);

      if (res.ok && data?.success) {
        setIsConfirmModalOpen(false);
        const receipt = data.data;

        setReceiptData({
          transactionId: receipt.transactionId,
          reference: receipt.reference,
          clientReference: receipt.clientReference,
          status: receipt.status || 'SUCCESSFUL',
          operator: receipt.operator || selectedOperator.code,
          operatorName: receipt.operatorName || selectedOperator.name,
          operatorLogo: selectedOperator.logo,
          smartcard: receipt.smartcard || clean,
          customerName: receipt.customerName || verifiedDecoder?.customerName,
          bouquetName: receipt.bouquetName || currentBouquet.name,
          validity: receipt.validity || currentBouquet.validity,
          faceAmountNaira: receipt.faceAmountNaira || faceAmountNaira,
          discountNaira: receipt.discountNaira || discountNaira,
          amountDebitedNaira: receipt.amountDebitedNaira || amountToDebitNaira,
          date: receipt.createdAt
            ? new Date(receipt.createdAt).toISOString()
            : new Date().toISOString(),
        });

        setIsReceiptModalOpen(true);

        setWalletBalance((prev) => Math.max(0, prev - amountToDebitNaira));
        loadWallets();
        loadHistory();

        setSmartcard('');
        setCustomerMobile('');
        setVerifiedDecoder(null);
      } else {
        const msg = data?.error?.message || 'Subscription failed. Please verify smartcard.';
        setSubmitError(msg);
      }
    } catch {
      setSubmitError('Network failure occurred. Please check history to verify status.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatNaira = (val: number) =>
    `₦${val.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#070D18]">
      {/* Sidebar */}
      <Sidebar
        businessName={businessName}
        merchantName={merchantName}
        kycStatus={kycStatus}
        onOpenKycModal={() => setIsKycModalOpen(true)}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-72">
        <Header
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onOpenKycModal={() => setIsKycModalOpen(true)}
          merchantName={merchantName}
          kycStatus={kycStatus}
          isRefreshing={isRefreshing}
          onRefresh={() => {
            setIsRefreshing(true);
            loadWallets();
          }}
          sticky={false}
        />

        <main className="flex-1 p-3 sm:p-5 lg:p-7 max-w-7xl mx-auto w-full space-y-5">
          {/* Identity Verification Warning Banner */}
          <KycBanner
            kycStatus={kycStatus}
            onOpenKycModal={() => setIsKycModalOpen(true)}
          />

          {/* ======================================================== */}
          {/* VIEW 1: OPERATOR CATALOG (Displayed when no provider selected) */}
          {/* ======================================================== */}
          {!selectedOperator ? (
            <div className="space-y-4">
              {/* Back to Dashboard & Refresh */}
              <div className="flex items-center justify-between">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1528] text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors shadow-xs w-fit"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-slate-400" />
                  <span>Back to Dashboard</span>
                </Link>

                <button
                  onClick={() => {
                    setIsRefreshing(true);
                    loadWallets();
                  }}
                  disabled={isRefreshing}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1528] text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors shadow-xs cursor-pointer"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 text-slate-400 ${isRefreshing ? 'animate-spin' : ''}`}
                  />
                  <span>Refresh</span>
                </button>
              </div>

              {/* Page Heading & Settlement Balance */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-blue-500/10 text-blue-500 dark:bg-blue-500/15 dark:text-blue-400 border border-blue-500/20">
                      <Tv className="w-4 h-4" />
                    </div>
                    <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                      Cable TV (PayTV) Subscription
                    </h1>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Instant renewal and bouquet upgrades for DStv, GOtv, and StarTimes decoders
                  </p>
                </div>

                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 text-xs font-medium text-slate-600 dark:text-slate-300 w-fit">
                  <Wallet className="w-3.5 h-3.5 text-blue-500" />
                  <span>Settlement Balance:</span>
                  {isLoadingBalance ? (
                    <span className="inline-block w-14 h-3 bg-slate-300 dark:bg-slate-700 rounded animate-pulse" />
                  ) : (
                    <span className="font-extrabold text-slate-900 dark:text-white">
                      {formatNaira(walletBalance)}
                    </span>
                  )}
                </div>
              </div>

              {/* Compact Filters & Search Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-white dark:bg-[#0B1528] p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
                {/* Tabs */}
                <div className="flex items-center gap-1 p-0.5 bg-slate-100 dark:bg-[#070D18] rounded-lg border border-slate-200 dark:border-slate-800">
                  {(['ALL', 'DSTV', 'GOTV', 'STARTIMES'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setFilterType(t)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all cursor-pointer ${
                        filterType === t
                          ? 'bg-white dark:bg-[#126BEB] text-slate-900 dark:text-white shadow-xs'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {t === 'ALL' && 'All Providers (3)'}
                      {t === 'DSTV' && 'DStv'}
                      {t === 'GOTV' && 'GOtv'}
                      {t === 'STARTIMES' && 'StarTimes'}
                    </button>
                  ))}
                </div>

                {/* Search Operator */}
                <div className="relative flex-1 sm:max-w-xs">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search provider or package..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-8 pl-8 pr-3 text-xs rounded-lg bg-slate-50 dark:bg-[#070D18] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#126BEB]"
                  />
                </div>
              </div>

              {/* COMPACT OPERATORS TILES GRID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                {filteredOperators.map((op) => (
                  <div
                    key={op.code}
                    onClick={() => handleSelectOperator(op)}
                    className="group relative p-4 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0B1528] hover:border-[#126BEB] dark:hover:border-[#126BEB] hover:shadow-md transition-all duration-150 cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      {/* Top: Logo & Cashback Tag */}
                      <div className="flex items-center justify-between gap-1.5 mb-3">
                        <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-center p-1.5 shrink-0 group-hover:scale-105 transition-transform">
                          <Image
                            src={op.logo}
                            alt={op.shortName}
                            width={40}
                            height={40}
                            className="object-contain"
                          />
                        </div>

                        {op.discountBps > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                            {(op.discountBps / 100).toFixed(1)}% Cashback
                          </span>
                        )}
                      </div>

                      {/* Title & Description */}
                      <h3 className="font-extrabold text-sm text-slate-900 dark:text-white group-hover:text-[#126BEB] transition-colors">
                        {op.name}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                        {op.description}
                      </p>
                    </div>

                    {/* Footer: Pay Action */}
                    <div className="pt-3 mt-4 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium">Instant Activation</span>
                      <span className="inline-flex items-center gap-1 font-bold text-[#126BEB] group-hover:translate-x-0.5 transition-transform">
                        <span>Subscribe</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* ======================================================== */
            /* VIEW 2: DEDICATED BILLER PAGE (e.g. DStv Subscription) */
            /* ======================================================== */
            <div className="space-y-4 max-w-xl mx-auto">
              {/* Back to All Providers Navigation Bar */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleBackToCatalog}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-[#126BEB] hover:text-[#126BEB] dark:hover:text-[#126BEB] transition-all shadow-xs cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
                  <span>Back to Providers</span>
                </button>

                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 text-[11px] font-medium text-slate-600 dark:text-slate-300">
                  <Wallet className="w-3 h-3 text-blue-500" />
                  <span>Balance:</span>
                  {isLoadingBalance ? (
                    <span className="inline-block w-14 h-3 bg-slate-300 dark:bg-slate-700 rounded animate-pulse" />
                  ) : (
                    <span className="font-extrabold text-slate-900 dark:text-white">
                      {formatNaira(walletBalance)}
                    </span>
                  )}
                </div>
              </div>

              {/* Dedicated Biller Hero Banner */}
              <div className="p-4 rounded-xl bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center p-1.5 shrink-0">
                    <Image
                      src={selectedOperator.logo}
                      alt={selectedOperator.shortName}
                      width={36}
                      height={36}
                      className="object-contain"
                    />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                      {selectedOperator.name}
                    </h1>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {selectedOperator.description}
                    </p>
                  </div>
                </div>

                {selectedOperator.discountBps > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                    {(selectedOperator.discountBps / 100).toFixed(1)}% Cashback
                  </span>
                )}
              </div>

              {/* Focused Vending Form Card */}
              <div className="bg-white dark:bg-[#0B1528] rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
                <form onSubmit={handleOpenConfirm} className="space-y-4">
                  {/* 1. SMARTCARD / IUC INPUT WITH AUTO-VERIFICATION */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                        {selectedOperator.customerField}
                      </label>
                      <span className="text-[10px] text-slate-400 font-medium">
                        {selectedOperator.minDigits}–{selectedOperator.maxDigits} digits
                      </span>
                    </div>

                    <div className="relative flex gap-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={selectedOperator.maxDigits + 2}
                        placeholder={`Enter ${selectedOperator.shortName} ${selectedOperator.customerField}`}
                        value={smartcard}
                        onChange={(e) => handleSmartcardChange(e.target.value)}
                        className="flex-1 px-3.5 py-2.5 bg-slate-50 dark:bg-[#070D18] border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#126BEB]"
                      />

                      <button
                        type="button"
                        onClick={() => handleValidateDecoder()}
                        disabled={isValidating || smartcard.replace(/[\s\-()]/g, '').length < selectedOperator.minDigits}
                        className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs rounded-xl border border-slate-300 dark:border-slate-700 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 shrink-0"
                      >
                        {isValidating ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            Validating...
                          </>
                        ) : (
                          <>
                            <UserCheck className="w-3.5 h-3.5" />
                            Verify
                          </>
                        )}
                      </button>
                    </div>

                    {/* Verification Error */}
                    {validationError && (
                      <div className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 mt-1">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        <span>{validationError}</span>
                      </div>
                    )}

                    {/* Verified Customer Card */}
                    {verifiedDecoder && (
                      <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                            Verified Subscriber
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 uppercase">
                            {verifiedDecoder.accountStatus || 'ACTIVE'}
                          </span>
                        </div>
                        {verifiedDecoder.customerName && (
                          <div className="font-bold text-slate-900 dark:text-white text-sm pt-0.5">
                            {verifiedDecoder.customerName}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 2. SELECT BOUQUET */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                      Select Subscription Package
                    </label>

                    <div className="relative">
                      <select
                        value={selectedBouquetId}
                        onChange={(e) => setSelectedBouquetId(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#070D18] border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#126BEB]"
                      >
                        {operatorBouquets.map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.name} — {formatNaira(b.priceNaira)} ({b.validity})
                          </option>
                        ))}
                      </select>
                    </div>

                    {currentBouquet && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                        {currentBouquet.description}
                      </p>
                    )}
                  </div>

                  {/* 3. CUSTOMER PHONE (OPTIONAL) */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                      Customer Phone Number <span className="text-slate-400 font-normal">(Optional SMS update)</span>
                    </label>
                    <input
                      type="tel"
                      placeholder="e.g. 08012345678"
                      value={customerMobile}
                      onChange={(e) => setCustomerMobile(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#070D18] border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#126BEB]"
                    />
                  </div>

                  {/* 4. FINANCIAL SUMMARY */}
                  <div className="bg-slate-50 dark:bg-[#070D18] border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2 text-xs">
                    <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                      <span>Bouquet Price</span>
                      <span className="font-mono">{formatNaira(faceAmountNaira)}</span>
                    </div>

                    {discountNaira > 0 && (
                      <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400 font-semibold">
                        <span>Merchant Cashback ({(discountBps / 100).toFixed(1)}%)</span>
                        <span className="font-mono">-{formatNaira(discountNaira)}</span>
                      </div>
                    )}

                    <div className="flex justify-between items-center text-sm font-bold text-slate-900 dark:text-white pt-1 border-t border-slate-200 dark:border-slate-800">
                      <span>Amount to Debit</span>
                      <span className="font-mono text-base">{formatNaira(amountToDebitNaira)}</span>
                    </div>
                  </div>

                  {/* Submit Error */}
                  {submitError && (
                    <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{submitError}</span>
                    </div>
                  )}

                  {/* Insufficient Balance Notice */}
                  {!hasSufficientBalance && (
                    <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-amber-700 dark:text-amber-300 text-xs flex items-center justify-between">
                      <span>Insufficient wallet balance (Need {formatNaira(amountToDebitNaira)})</span>
                      <Link
                        href="/dashboard/wallets"
                        className="font-bold underline text-amber-800 dark:text-amber-200 hover:text-amber-900"
                      >
                        Fund Wallet
                      </Link>
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={
                      !hasSufficientBalance ||
                      smartcard.replace(/[\s\-()]/g, '').length < selectedOperator.minDigits
                    }
                    className="w-full py-3.5 px-4 bg-[#126BEB] hover:bg-[#0B5CC7] text-white font-bold text-sm rounded-xl shadow-md transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Lock className="w-4 h-4" />
                    <span>Confirm & Pay {formatNaira(amountToDebitNaira)}</span>
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* CABLE TRANSACTION HISTORY */}
          {/* ======================================================== */}
          <div className="bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-[#126BEB]" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Cable TV Subscription History
                </h3>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter by ref, decoder or provider..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-[#070D18] border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-[#126BEB]"
                />
              </div>
            </div>

            {isLoadingHistory ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#126BEB]" />
                Loading subscriptions...
              </div>
            ) : historyItems.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs space-y-1">
                <Tv className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700" />
                <p className="font-semibold text-slate-700 dark:text-slate-300">
                  No Cable TV subscriptions yet
                </p>
                <p>Recharged DStv, GOtv, and StarTimes decoders will appear here.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-medium">
                      <th className="py-3 px-3">Date</th>
                      <th className="py-3 px-3">Provider / Bouquet</th>
                      <th className="py-3 px-3">Decoder / Smartcard</th>
                      <th className="py-3 px-3">Subscriber</th>
                      <th className="py-3 px-3">Amount</th>
                      <th className="py-3 px-3">Status</th>
                      <th className="py-3 px-3 text-right">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono">
                    {historyItems
                      .filter((item) => {
                        if (!historySearch.trim()) return true;
                        const s = historySearch.toLowerCase();
                        return (
                          item.reference?.toLowerCase().includes(s) ||
                          item.recipient?.toLowerCase().includes(s) ||
                          item.metadata?.operatorName?.toLowerCase().includes(s) ||
                          item.metadata?.bouquetName?.toLowerCase().includes(s)
                        );
                      })
                      .map((item) => (
                        <tr
                          key={item.id}
                          className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition"
                        >
                          <td className="py-3 px-3 text-slate-500 font-sans whitespace-nowrap">
                            {new Date(item.createdAt).toLocaleDateString('en-NG', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>

                          <td className="py-3 px-3 font-sans">
                            <span className="font-bold text-slate-800 dark:text-slate-200 block">
                              {item.metadata?.bouquetName || item.metadata?.operatorName || item.type}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              Ref: {item.reference}
                            </span>
                          </td>

                          <td className="py-3 px-3 font-mono font-semibold text-slate-700 dark:text-slate-300">
                            {item.recipient}
                          </td>

                          <td className="py-3 px-3 font-sans text-slate-700 dark:text-slate-300">
                            {item.metadata?.customerName || '—'}
                          </td>

                          <td className="py-3 px-3 font-mono font-bold text-slate-900 dark:text-white">
                            {formatNaira(item.amountNaira)}
                          </td>

                          <td className="py-3 px-3 font-sans">
                            {item.status === 'SUCCESSFUL' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                <CheckCircle2 className="w-3 h-3" /> Success
                              </span>
                            ) : item.status === 'PROCESSING' || item.status === 'PENDING' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                <Clock className="w-3 h-3" /> Pending
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                                <AlertTriangle className="w-3 h-3" /> Failed
                              </span>
                            )}
                          </td>

                          <td className="py-3 px-3 text-right font-sans">
                            <button
                              type="button"
                              onClick={() => {
                                setReceiptData({
                                  transactionId: item.id,
                                  reference: item.reference,
                                  clientReference: item.clientReference,
                                  status: item.status,
                                  operator: item.metadata?.operator || 'CABLE',
                                  operatorName: item.metadata?.operatorName || 'Cable TV',
                                  smartcard: item.recipient,
                                  customerName: item.metadata?.customerName,
                                  bouquetName: item.metadata?.bouquetName || item.type,
                                  validity: item.metadata?.validity || '30 Days',
                                  faceAmountNaira: item.amountNaira,
                                  discountNaira: item.feeNaira || 0,
                                  amountDebitedNaira: item.amountNaira,
                                  date: item.createdAt,
                                });
                                setIsReceiptModalOpen(true);
                              }}
                              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition"
                            >
                              View Slip
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* CONFIRMATION MODAL */}
      {isConfirmModalOpen && selectedOperator && currentBouquet && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => !isSubmitting && setIsConfirmModalOpen(false)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-blue-500/10 text-blue-500 dark:text-blue-400">
                <Tv className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                  Confirm Subscription
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Please review decoder and bouquet details before confirming.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-[#070D18] border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">Provider</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {selectedOperator.name}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">{selectedOperator.customerField}</span>
                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                  {smartcard}
                </span>
              </div>

              {verifiedDecoder?.customerName && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">Subscriber Name</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {verifiedDecoder.customerName}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">Bouquet Package</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {currentBouquet.name}
                </span>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-800 font-bold text-sm">
                <span className="text-slate-900 dark:text-white">Amount to Debit</span>
                <span className="font-mono text-[#126BEB] text-base">
                  {formatNaira(amountToDebitNaira)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => setIsConfirmModalOpen(false)}
                className="flex-1 py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleExecutePurchase}
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#126BEB] hover:bg-[#0B5CC7] text-white font-bold text-xs shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Subscribing...
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    Confirm & Debit
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RECEIPT MODAL */}
      <CableReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        receipt={receiptData}
        onSubscribeAnother={() => {
          setIsReceiptModalOpen(false);
          setSmartcard('');
          setCustomerMobile('');
          setVerifiedDecoder(null);
        }}
      />

      {/* KYC MODAL */}
      <KycModal
        isOpen={isKycModalOpen}
        onClose={() => setIsKycModalOpen(false)}
        onSuccess={() => setKycStatus('VERIFIED')}
      />
    </div>
  );
}
