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
  UserCheck,
  Lock,
  ChevronDown,
  Check,
  FileText,
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

export type CableOperatorCode = 'DSTV' | 'GOTV' | 'STARTIMES';

export interface CableOperatorOption {
  code: CableOperatorCode;
  name: string;
  shortName: string;
  logo: string;
  customerField: string;
  minDigits: number;
  maxDigits: number;
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
}

export interface VerifiedDecoder {
  smartcard: string;
  customerName?: string;
  accountStatus?: string;
  outstandingBalanceNaira?: number;
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
    description: 'Direct-to-home satellite television subscription',
  },
  {
    code: 'GOTV',
    name: 'GOtv (MultiChoice)',
    shortName: 'GOtv',
    logo: '/logos/cable/gotv.png',
    customerField: 'IUC / Decoder Number',
    minDigits: 10,
    maxDigits: 11,
    description: 'Digital terrestrial pay television service',
  },
  {
    code: 'STARTIMES',
    name: 'StarTimes Nigeria',
    shortName: 'StarTimes',
    logo: '/logos/cable/startimes.svg',
    customerField: 'Smartcard / e-Wallet Number',
    minDigits: 11,
    maxDigits: 11,
    description: 'Digital terrestrial and satellite television service',
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
  },
  {
    id: 'dstv-yanga',
    operator: 'DSTV',
    operatorName: 'DStv',
    name: 'DStv Yanga',
    code: 'DStv Yanga Bouquet E36',
    validity: '30 Days',
    priceNaira: 6000,
  },
  {
    id: 'dstv-confam',
    operator: 'DSTV',
    operatorName: 'DStv',
    name: 'DStv Confam',
    code: 'DStv Confam Bouquet E36',
    validity: '30 Days',
    priceNaira: 11000,
  },
  {
    id: 'dstv-compact',
    operator: 'DSTV',
    operatorName: 'DStv',
    name: 'DStv Compact',
    code: 'Compact',
    validity: '30 Days',
    priceNaira: 19000,
  },
  {
    id: 'dstv-compact-plus',
    operator: 'DSTV',
    operatorName: 'DStv',
    name: 'DStv Compact Plus',
    code: 'Compact Plus',
    validity: '30 Days',
    priceNaira: 30000,
  },
  {
    id: 'dstv-premium',
    operator: 'DSTV',
    operatorName: 'DStv',
    name: 'DStv Premium',
    code: 'Premium',
    validity: '30 Days',
    priceNaira: 44500,
  },
  {
    id: 'dstv-extraview',
    operator: 'DSTV',
    operatorName: 'DStv',
    name: 'DStv ExtraView Add-on',
    code: 'HDPVR Access/Extraview',
    validity: '30 Days',
    priceNaira: 6000,
  },

  // --- GOTV ---
  {
    id: 'gotv-smallie',
    operator: 'GOTV',
    operatorName: 'GOtv',
    name: 'GOtv Smallie',
    code: 'GOtv Smallie',
    validity: '30 Days',
    priceNaira: 1900,
  },
  {
    id: 'gotv-jinja',
    operator: 'GOTV',
    operatorName: 'GOtv',
    name: 'GOtv Jinja',
    code: 'GOtv Jinja Bouquet',
    validity: '30 Days',
    priceNaira: 3900,
  },
  {
    id: 'gotv-jolli',
    operator: 'GOTV',
    operatorName: 'GOtv',
    name: 'GOtv Jolli',
    code: 'GOtv Jolli Bouquet',
    validity: '30 Days',
    priceNaira: 5800,
  },
  {
    id: 'gotv-max',
    operator: 'GOTV',
    operatorName: 'GOtv',
    name: 'GOtv Max',
    code: 'GOtv Max',
    validity: '30 Days',
    priceNaira: 8500,
  },
  {
    id: 'gotv-supa',
    operator: 'GOTV',
    operatorName: 'GOtv',
    name: 'GOtv Supa',
    code: 'SUPA',
    validity: '30 Days',
    priceNaira: 11400,
  },
  {
    id: 'gotv-supa-plus',
    operator: 'GOTV',
    operatorName: 'GOtv',
    name: 'GOtv Supa Plus',
    code: 'GOTV Supa Plus',
    validity: '30 Days',
    priceNaira: 16800,
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
  },
  {
    id: 'startimes-basic',
    operator: 'STARTIMES',
    operatorName: 'StarTimes',
    name: 'StarTimes Basic',
    code: 'DTT_Basic Monthly',
    validity: '30 Days',
    priceNaira: 4000,
  },
  {
    id: 'startimes-classic',
    operator: 'STARTIMES',
    operatorName: 'StarTimes',
    name: 'StarTimes Classic',
    code: 'DTT_Classic Monthly',
    validity: '30 Days',
    priceNaira: 6000,
  },
  {
    id: 'startimes-super',
    operator: 'STARTIMES',
    operatorName: 'StarTimes',
    name: 'StarTimes Super',
    code: 'DTT_Super Monthly',
    validity: '30 Days',
    priceNaira: 9500,
  },
];

export default function CableVendingPage() {
  // Session & User State
  const [merchantName, setMerchantName] = useState('Merchant');
  const [businessName, setBusinessName] = useState('My Business');
  const [kycStatus, setKycStatus] = useState<string>('VERIFIED');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isKycModalOpen, setIsKycModalOpen] = useState(false);

  // Settlement Balance
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [isLoadingBalance, setIsLoadingBalance] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Operator Catalog & View State
  const [selectedOperator, setSelectedOperator] = useState<CableOperatorOption | null>(null);
  const [filterType, setFilterType] = useState<'ALL' | 'DSTV' | 'GOTV' | 'STARTIMES'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Vending Form Inputs
  const [smartcard, setSmartcard] = useState('');
  const [selectedBouquetId, setSelectedBouquetId] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [isBouquetDropdownOpen, setIsBouquetDropdownOpen] = useState(false);

  // Decoder Real-time Validation State
  const [isValidating, setIsValidating] = useState(false);
  const [verifiedDecoder, setVerifiedDecoder] = useState<VerifiedDecoder | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const autoVerifyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const bouquetDropdownRef = useRef<HTMLDivElement | null>(null);

  // Dynamic Bouquets List
  const [bouquetsList, setBouquetsList] = useState<CableBouquetOption[]>(DEFAULT_BOUQUETS);

  // Checkout & Submission State
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Receipt Modal State
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<CableReceiptData | null>(null);

  // Close custom dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        bouquetDropdownRef.current &&
        !bouquetDropdownRef.current.contains(event.target as Node)
      ) {
        setIsBouquetDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch Business Wallets - Fixed to inspect wallets array and find type === 'MAIN'
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

      if (res.ok && data?.success && Array.isArray(data.data?.wallets)) {
        const main = data.data.wallets.find((w: any) => w.type === 'MAIN');
        if (main) {
          setWalletBalance(main.balanceNaira || Number(main.balanceKobo || '0') / 100);
        }
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
  }, []);

  // Filtered Operators for Catalog
  const filteredOperators = useMemo(() => {
    return CABLE_OPERATORS.filter((op) => {
      const matchesFilter = filterType === 'ALL' || op.code === filterType;
      const matchesSearch =
        searchQuery.trim() === '' ||
        op.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        op.shortName.toLowerCase().includes(searchQuery.toLowerCase());
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

  const currentBouquet = useMemo(() => {
    return operatorBouquets.find((b) => b.id === selectedBouquetId) || operatorBouquets[0];
  }, [operatorBouquets, selectedBouquetId]);

  // Face amount & debit calculations directly from provider pricing
  const faceAmountNaira = currentBouquet?.priceNaira || 0;
  const amountToDebitNaira = faceAmountNaira;
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
    setIsBouquetDropdownOpen(false);
  };

  const handleBackToCatalog = () => {
    setSelectedOperator(null);
    setSmartcard('');
    setCustomerMobile('');
    setVerifiedDecoder(null);
    setValidationError(null);
    setSubmitError(null);
    setIsBouquetDropdownOpen(false);
  };

  // Open Confirmation Modal
  const handleOpenConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!selectedOperator || !currentBouquet) return;

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
          discountNaira: receipt.discountNaira || 0,
          amountDebitedNaira: receipt.amountDebitedNaira || amountToDebitNaira,
          date: receipt.createdAt
            ? new Date(receipt.createdAt).toISOString()
            : new Date().toISOString(),
        });

        setIsReceiptModalOpen(true);
        setWalletBalance((prev) => Math.max(0, prev - amountToDebitNaira));
        loadWallets();

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
          <KycBanner
            kycStatus={kycStatus}
            onOpenKycModal={() => setIsKycModalOpen(true)}
          />

          {/* ======================================================== */}
          {/* VIEW 1: OPERATOR CATALOG (Displayed when no provider selected) */}
          {/* ======================================================== */}
          {!selectedOperator ? (
            <div className="space-y-4">
              {/* Back to Dashboard & Actions */}
              <div className="flex items-center justify-between">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1528] text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors shadow-xs w-fit"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-slate-400" />
                  <span>Back to Dashboard</span>
                </Link>

                <div className="flex items-center gap-2">
                  {/* Link to Unified Ledger History */}
                  <Link
                    href="/dashboard/ledger?service=CABLE_TV"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1528] text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors shadow-xs"
                  >
                    <FileText className="w-3.5 h-3.5 text-blue-500" />
                    <span>Cable History</span>
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

              {/* Filters & Search Bar */}
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
                    placeholder="Search provider..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-8 pl-8 pr-3 text-xs rounded-lg bg-slate-50 dark:bg-[#070D18] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#126BEB]"
                  />
                </div>
              </div>

              {/* OPERATORS GRID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                {filteredOperators.map((op) => (
                  <div
                    key={op.code}
                    onClick={() => handleSelectOperator(op)}
                    className="group relative p-4 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0B1528] hover:border-[#126BEB] dark:hover:border-[#126BEB] hover:shadow-md transition-all duration-150 cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      {/* Top: Logo */}
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

                <div className="flex items-center gap-2">
                  <Link
                    href="/dashboard/ledger?service=CABLE_TV"
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    <FileText className="w-3 h-3 text-blue-500" />
                    <span>History</span>
                  </Link>

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

                  {/* 2. CUSTOM BOUQUET DROPDOWN (Zero native browser select) */}
                  <div className="space-y-1.5" ref={bouquetDropdownRef}>
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                      Select Subscription Package
                    </label>

                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setIsBouquetDropdownOpen(!isBouquetDropdownOpen)}
                        className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-[#070D18] border border-slate-200 dark:border-slate-700 rounded-xl text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-[#126BEB] transition-colors cursor-pointer"
                      >
                        {currentBouquet ? (
                          <div className="flex items-center justify-between w-full mr-2">
                            <div className="truncate">
                              <span className="font-bold text-sm text-slate-900 dark:text-white">
                                {currentBouquet.name}
                              </span>
                              <span className="ml-2 text-[11px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                                {currentBouquet.validity}
                              </span>
                            </div>
                            <span className="font-extrabold text-sm text-[#126BEB] ml-2 shrink-0">
                              {formatNaira(currentBouquet.priceNaira)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400">Select a bouquet package...</span>
                        )}
                        <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${isBouquetDropdownOpen ? 'rotate-180' : ''}`} />
                      </button>

                      {/* Dropdown Menu */}
                      {isBouquetDropdownOpen && (
                        <div className="absolute z-30 left-0 right-0 top-full mt-1.5 bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-700/80 rounded-xl shadow-xl overflow-hidden py-1 max-h-64 overflow-y-auto">
                          {operatorBouquets.map((b) => {
                            const isSelected = b.id === currentBouquet?.id;
                            return (
                              <button
                                key={b.id}
                                type="button"
                                onClick={() => {
                                  setSelectedBouquetId(b.id);
                                  setIsBouquetDropdownOpen(false);
                                }}
                                className={`w-full px-3.5 py-2.5 text-xs flex items-center justify-between text-left transition-colors cursor-pointer ${
                                  isSelected
                                    ? 'bg-blue-50 dark:bg-[#126BEB]/15 text-[#126BEB] dark:text-blue-400'
                                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                                }`}
                              >
                                <div className="flex items-center gap-2 truncate mr-2">
                                  <div className="w-4 h-4 flex items-center justify-center shrink-0">
                                    {isSelected && <Check className="w-3.5 h-3.5 text-[#126BEB]" />}
                                  </div>
                                  <div className="truncate">
                                    <span className="font-bold text-slate-900 dark:text-white">
                                      {b.name}
                                    </span>
                                    <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 font-medium">
                                      {b.validity}
                                    </span>
                                  </div>
                                </div>
                                <span className="font-extrabold text-slate-900 dark:text-white shrink-0">
                                  {formatNaira(b.priceNaira)}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
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

                  {/* 4. TOTAL & SUBMIT BUTTON */}
                  <div className="pt-2">
                    {submitError && (
                      <div className="p-3 mb-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{submitError}</span>
                      </div>
                    )}

                    <div className="flex items-center justify-between mb-3 text-xs">
                      <span className="text-slate-500 dark:text-slate-400">Total Subscription Cost</span>
                      <span className="font-extrabold text-base text-slate-900 dark:text-white">
                        {formatNaira(amountToDebitNaira)}
                      </span>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting || !smartcard || !currentBouquet}
                      className="w-full py-3 px-4 rounded-xl bg-[#126BEB] hover:bg-[#0B5CC7] text-white font-bold text-sm shadow-md transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span>Proceed to Payment</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
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
