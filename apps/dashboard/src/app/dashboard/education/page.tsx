'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  GraduationCap,
  ArrowLeft,
  Wallet,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Check,
  Copy,
  ExternalLink,
  Lock,
  Layers,
  Sparkles,
  Info,
  Building,
  UserCheck,
  Receipt,
  Eye,
  EyeOff,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import Sidebar from '@/components/dashboard/Sidebar';
import Header from '@/components/dashboard/Header';
import KycBanner from '@/components/dashboard/KycBanner';
import KycModal from '@/components/dashboard/KycModal';
import ExamPinReceiptModal, {
  ExamPinReceiptData,
} from '@/components/dashboard/ExamPinReceiptModal';
import {
  getStoredAuthToken,
  getStoredUser,
  getStoredBusiness,
  clearSessionAndRedirect,
  handleAuthResponse,
} from '@/lib/auth-session';

export interface ExamPackageItem {
  packageCode: string;
  examBody: 'JAMB' | 'WAEC' | 'NECO' | 'NABTEB' | string;
  serviceType: string;
  name: string;
  description: string;
  billerId: string;
  paymentCode: string;
  baseCostKobo: string;
  baseCostNaira: number;
  formattedBaseCost: string;
  suggestedPriceKobo: string;
  suggestedPriceNaira: number;
  formattedSuggestedPrice: string;
  merchantMarkupKobo: string;
  merchantMarkupNaira: number;
  formattedMerchantMarkup: string;
  sellingPriceKobo: string;
  sellingPriceNaira: number;
  formattedSellingPrice: string;
  requiresValidation: boolean;
  identifierType: 'PROFILE_CODE' | 'PHONE';
  instructions: string;
  portalUrl: string;
}

export interface CandidateValidationState {
  isValid: boolean;
  candidateName?: string;
  responseMessage?: string;
}

export interface HistoryItem {
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
    packageCode?: string;
    packageName?: string;
    examBody?: string;
    candidateId?: string;
    candidateName?: string;
    instructions?: string;
    portalUrl?: string;
    quantity?: number;
    pins?: Array<{ pin: string; serialNumber?: string }>;
  };
  pins?: Array<{ pin: string; serialNumber?: string }>;
  createdAt: string;
}

// Fallback catalog in case backend connection is loading
const INITIAL_PACKAGES: ExamPackageItem[] = [
  {
    packageCode: 'JAMB_UTME_NO_MOCK',
    examBody: 'JAMB',
    serviceType: 'UTME_NO_MOCK',
    name: 'JAMB 2026 UTME PIN (Without Mock)',
    description: '10-digit profile code required. Standard UTME registration PIN without Mock examination.',
    billerId: '3573',
    paymentCode: '04357305',
    baseCostKobo: '720000',
    baseCostNaira: 7200,
    formattedBaseCost: '₦7,200.00',
    suggestedPriceKobo: '750000',
    suggestedPriceNaira: 7500,
    formattedSuggestedPrice: '₦7,500.00',
    merchantMarkupKobo: '30000',
    merchantMarkupNaira: 300,
    formattedMerchantMarkup: '₦300.00',
    sellingPriceKobo: '750000',
    sellingPriceNaira: 7500,
    formattedSellingPrice: '₦7,500.00',
    requiresValidation: true,
    identifierType: 'PROFILE_CODE',
    instructions: 'Proceed to any accredited JAMB CBT centre to complete registration & biometric capture.',
    portalUrl: 'https://www.jamb.gov.ng',
  },
  {
    packageCode: 'JAMB_DIRECT_ENTRY',
    examBody: 'JAMB',
    serviceType: 'DIRECT_ENTRY',
    name: 'JAMB 2026 Direct Entry PIN',
    description: '10-digit profile code required. Direct Entry candidate pin vending for 2026 admissions.',
    billerId: '3588',
    paymentCode: '04358802',
    baseCostKobo: '570000',
    baseCostNaira: 5700,
    formattedBaseCost: '₦5,700.00',
    suggestedPriceKobo: '600000',
    suggestedPriceNaira: 6000,
    formattedSuggestedPrice: '₦6,000.00',
    merchantMarkupKobo: '30000',
    merchantMarkupNaira: 300,
    formattedMerchantMarkup: '₦300.00',
    sellingPriceKobo: '600000',
    sellingPriceNaira: 6000,
    formattedSellingPrice: '₦6,000.00',
    requiresValidation: true,
    identifierType: 'PROFILE_CODE',
    instructions: 'Candidate should present profile code at any accredited CBT centre for registration.',
    portalUrl: 'https://www.jamb.gov.ng',
  },
  {
    packageCode: 'JAMB_UTME_WITH_MOCK',
    examBody: 'JAMB',
    serviceType: 'UTME_WITH_MOCK',
    name: 'JAMB 2026 UTME PIN (With Mock)',
    description: '10-digit profile code required. Comprehensive UTME registration PIN with Mock exam.',
    billerId: '3588',
    paymentCode: '04358803',
    baseCostKobo: '920000',
    baseCostNaira: 9200,
    formattedBaseCost: '₦9,200.00',
    suggestedPriceKobo: '950000',
    suggestedPriceNaira: 9500,
    formattedSuggestedPrice: '₦9,500.00',
    merchantMarkupKobo: '30000',
    merchantMarkupNaira: 300,
    formattedMerchantMarkup: '₦300.00',
    sellingPriceKobo: '950000',
    sellingPriceNaira: 9500,
    formattedSellingPrice: '₦9,500.00',
    requiresValidation: true,
    identifierType: 'PROFILE_CODE',
    instructions: 'Includes access to the official JAMB Mock examination at designated CBT centre.',
    portalUrl: 'https://www.jamb.gov.ng',
  },
  {
    packageCode: 'WAEC_RESULT_CHECKER',
    examBody: 'WAEC',
    serviceType: 'RESULT_CHECKER',
    name: 'WAEC Result Checker e-PIN',
    description: 'Valid for checking WASSCE / GCE exam results up to 5 times on the WAEC Direct portal.',
    billerId: '4307',
    paymentCode: '04307601',
    baseCostKobo: '350000',
    baseCostNaira: 3500,
    formattedBaseCost: '₦3,500.00',
    suggestedPriceKobo: '380000',
    suggestedPriceNaira: 3800,
    formattedSuggestedPrice: '₦3,800.00',
    merchantMarkupKobo: '30000',
    merchantMarkupNaira: 300,
    formattedMerchantMarkup: '₦300.00',
    sellingPriceKobo: '380000',
    sellingPriceNaira: 3800,
    formattedSellingPrice: '₦3,800.00',
    requiresValidation: false,
    identifierType: 'PHONE',
    instructions: 'Visit www.waecdirect.org and enter your 10-digit Examination Number, Year, Serial and PIN.',
    portalUrl: 'https://www.waecdirect.org',
  },
  {
    packageCode: 'WAEC_REGISTRATION',
    examBody: 'WAEC',
    serviceType: 'REGISTRATION',
    name: 'WAEC WASSCE Registration e-PIN',
    description: 'Official registration token for WASSCE Private / External candidates.',
    billerId: '4307',
    paymentCode: '04307602',
    baseCostKobo: '2700000',
    baseCostNaira: 27000,
    formattedBaseCost: '₦27,000.00',
    suggestedPriceKobo: '2800000',
    suggestedPriceNaira: 28000,
    formattedSuggestedPrice: '₦28,000.00',
    merchantMarkupKobo: '100000',
    merchantMarkupNaira: 1000,
    formattedMerchantMarkup: '₦1,000.00',
    sellingPriceKobo: '2800000',
    sellingPriceNaira: 28000,
    formattedSellingPrice: '₦28,000.00',
    requiresValidation: false,
    identifierType: 'PHONE',
    instructions: 'Visit registration.waecdirect.org to capture biometrics and register examination subjects.',
    portalUrl: 'https://registration.waecdirect.org',
  },
  {
    packageCode: 'NECO_RESULT_TOKEN',
    examBody: 'NECO',
    serviceType: 'RESULT_CHECKER',
    name: 'NECO Result Token (5 Views)',
    description: 'Official 12-digit token for checking SSCE, BECE and NCEE examination results.',
    billerId: '4312',
    paymentCode: '04312001',
    baseCostKobo: '120000',
    baseCostNaira: 1200,
    formattedBaseCost: '₦1,200.00',
    suggestedPriceKobo: '140000',
    suggestedPriceNaira: 1400,
    formattedSuggestedPrice: '₦1,400.00',
    merchantMarkupKobo: '20000',
    merchantMarkupNaira: 200,
    formattedMerchantMarkup: '₦200.00',
    sellingPriceKobo: '140000',
    sellingPriceNaira: 1400,
    formattedSellingPrice: '₦1,400.00',
    requiresValidation: false,
    identifierType: 'PHONE',
    instructions: 'Visit result.neco.gov.ng, select exam year and type, enter registration number and Token.',
    portalUrl: 'https://result.neco.gov.ng',
  },
  {
    packageCode: 'NECO_REGISTRATION',
    examBody: 'NECO',
    serviceType: 'REGISTRATION',
    name: 'NECO SSCE (External) Registration',
    description: 'Official token for NECO Senior Secondary Certificate Examination registration.',
    billerId: '4312',
    paymentCode: '04312002',
    baseCostKobo: '1950000',
    baseCostNaira: 19500,
    formattedBaseCost: '₦19,500.00',
    suggestedPriceKobo: '2050000',
    suggestedPriceNaira: 20500,
    formattedSuggestedPrice: '₦20,500.00',
    merchantMarkupKobo: '100000',
    merchantMarkupNaira: 1000,
    formattedMerchantMarkup: '₦1,000.00',
    sellingPriceKobo: '2050000',
    sellingPriceNaira: 20500,
    formattedSellingPrice: '₦20,500.00',
    requiresValidation: false,
    identifierType: 'PHONE',
    instructions: 'Visit neco.gov.ng/ssce-external to complete registration.',
    portalUrl: 'https://neco.gov.ng',
  },
  {
    packageCode: 'NABTEB_RESULT_CHECKER',
    examBody: 'NABTEB',
    serviceType: 'RESULT_CHECKER',
    name: 'NABTEB Result Checker e-PIN',
    description: 'Scratch card e-PIN for checking NBC / NTC and modular examination results.',
    billerId: '4313',
    paymentCode: '04313001',
    baseCostKobo: '150000',
    baseCostNaira: 1500,
    formattedBaseCost: '₦1,500.00',
    suggestedPriceKobo: '170000',
    suggestedPriceNaira: 1700,
    formattedSuggestedPrice: '₦1,700.00',
    merchantMarkupKobo: '20000',
    merchantMarkupNaira: 200,
    formattedMerchantMarkup: '₦200.00',
    sellingPriceKobo: '170000',
    sellingPriceNaira: 1700,
    formattedSellingPrice: '₦1,700.00',
    requiresValidation: false,
    identifierType: 'PHONE',
    instructions: 'Visit eworld.nabteb.gov.ng and enter Candidate ID, Exam Type, Year, Serial and PIN.',
    portalUrl: 'https://eworld.nabteb.gov.ng',
  },
];

export default function EducationPage() {
  // Navigation & User State
  const [merchantName, setMerchantName] = useState('Merchant');
  const [businessName, setBusinessName] = useState('My Business');
  const [kycStatus, setKycStatus] = useState<string>('INITIALIZING');
  const [isKycModalOpen, setIsKycModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [isLoadingBalance, setIsLoadingBalance] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Exam Packages Catalog
  const [packagesList, setPackagesList] = useState<ExamPackageItem[]>(INITIAL_PACKAGES);
  const [isLoadingPackages, setIsLoadingPackages] = useState<boolean>(false);
  const [selectedBodyFilter, setSelectedBodyFilter] = useState<'ALL' | 'JAMB' | 'WAEC' | 'NECO' | 'NABTEB'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPackageCode, setSelectedPackageCode] = useState<string>('JAMB_UTME_NO_MOCK');

  // Vending Form State
  const [candidateId, setCandidateId] = useState('');
  const [candidateName, setCandidateName] = useState('');
  const [candidateEmail, setCandidateEmail] = useState('');
  const [quantity, setQuantity] = useState<number>(1);

  // Validation State (for JAMB 10-digit profile code)
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<CandidateValidationState | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Purchase & Confirmation State
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Receipt Modal State
  const [receiptData, setReceiptData] = useState<ExamPinReceiptData | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // History State
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState<boolean>(false);
  const [historySearch, setHistorySearch] = useState('');
  const [visiblePinsMap, setVisiblePinsMap] = useState<Record<string, boolean>>({});

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

  // Load Exam Packages from Backend
  const loadPackages = async () => {
    try {
      setIsLoadingPackages(true);
      const authToken = getStoredAuthToken();
      const res = await fetch('/api/services/education/packages', {
        headers: {
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success && Array.isArray(data.data) && data.data.length > 0) {
        setPackagesList(data.data);
      }
    } catch {
      // Keep initial catalog
    } finally {
      setIsLoadingPackages(false);
    }
  };

  // Load Transaction History
  const loadHistory = async () => {
    try {
      setIsLoadingHistory(true);
      const authToken = getStoredAuthToken();
      if (!authToken) return;

      const res = await fetch('/api/services/education/history?limit=25&offset=0', {
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
    loadPackages();
    loadHistory();
  }, []);

  // Active Selected Package
  const currentPackage = useMemo(() => {
    return (
      packagesList.find((p) => p.packageCode === selectedPackageCode) ||
      packagesList[0] ||
      INITIAL_PACKAGES[0]
    );
  }, [packagesList, selectedPackageCode]);

  // Reset form and validation when changing package
  const handleSelectPackage = (pkg: ExamPackageItem) => {
    setSelectedPackageCode(pkg.packageCode);
    setCandidateId('');
    setCandidateName('');
    setCandidateEmail('');
    setQuantity(1);
    setValidationResult(null);
    setValidationError(null);
    setSubmitError(null);
  };

  // Filtered packages
  const filteredPackages = useMemo(() => {
    return packagesList.filter((p) => {
      const matchesFilter =
        selectedBodyFilter === 'ALL' || p.examBody.toUpperCase() === selectedBodyFilter;
      const matchesSearch =
        searchQuery.trim() === '' ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.examBody.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [packagesList, selectedBodyFilter, searchQuery]);

  // Profile Code / Candidate Validation
  const handleValidateCandidate = async () => {
    const cleanId = candidateId.replace(/[\s\-]/g, '');
    if (!cleanId) {
      setValidationError('Please enter a Candidate Profile Code or Phone number.');
      return;
    }

    if (currentPackage.examBody === 'JAMB' && !/^\d{10}$/.test(cleanId)) {
      setValidationError('JAMB Profile Code must be exactly 10 numeric digits.');
      return;
    }

    setIsValidating(true);
    setValidationError(null);
    setValidationResult(null);

    try {
      const authToken = getStoredAuthToken();
      const res = await fetch('/api/services/education/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          examBody: currentPackage.examBody,
          candidateId: cleanId,
          packageCode: currentPackage.packageCode,
        }),
      });

      const data = await res.json().catch(() => null);

      if (res.ok && data?.success) {
        setValidationResult({
          isValid: true,
          candidateName: data.data.candidateName || 'Verified Candidate',
          responseMessage: data.data.responseMessage || 'Candidate profile validated.',
        });
        if (data.data.candidateName) {
          setCandidateName(data.data.candidateName);
        }
      } else {
        const errorMsg = data?.error?.message || 'Candidate validation failed. Verify profile code.';
        setValidationError(errorMsg);
      }
    } catch {
      setValidationError('Network error while validating candidate. Please try again.');
    } finally {
      setIsValidating(false);
    }
  };

  // Compute Total Cost
  const totalCostNaira = useMemo(() => {
    return currentPackage.baseCostNaira * quantity;
  }, [currentPackage, quantity]);

  const totalRetailNaira = useMemo(() => {
    return currentPackage.suggestedPriceNaira * quantity;
  }, [currentPackage, quantity]);

  const totalEstimatedProfit = useMemo(() => {
    return Math.max(0, totalRetailNaira - totalCostNaira);
  }, [totalRetailNaira, totalCostNaira]);

  const hasSufficientBalance = walletBalance >= totalCostNaira;

  // Validation before opening confirmation
  const handleOpenConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const cleanId = candidateId.replace(/[\s\-]/g, '');
    if (!cleanId) {
      setSubmitError('Candidate Profile Code or Phone is required.');
      return;
    }

    if (currentPackage.examBody === 'JAMB') {
      if (!/^\d{10}$/.test(cleanId)) {
        setSubmitError('JAMB Profile Code must be exactly 10 numeric digits.');
        return;
      }
      if (currentPackage.requiresValidation && !validationResult?.isValid) {
        setSubmitError('Please validate the JAMB profile code first before purchasing.');
        return;
      }
    } else {
      if (cleanId.length < 10) {
        setSubmitError('Recipient phone number must be at least 10 or 11 digits.');
        return;
      }
    }

    if (!hasSufficientBalance) {
      setSubmitError(
        `Insufficient wallet balance. Total cost is ₦${totalCostNaira.toLocaleString()}, but your balance is ₦${walletBalance.toLocaleString()}. Please fund your settlement wallet.`,
      );
      return;
    }

    setIsConfirmModalOpen(true);
  };

  // Execute Exam PIN Purchase
  const handleExecutePurchase = async () => {
    setIsSubmitting(true);
    setSubmitError(null);

    const cleanId = candidateId.replace(/[\s\-]/g, '');
    const clientRef = `BX-EDU-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const idempotencyKey = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : clientRef;

    try {
      const authToken = getStoredAuthToken();
      if (!authToken) {
        clearSessionAndRedirect('expired');
        return;
      }

      const res = await fetch('/api/services/education/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
          'x-idempotency-key': idempotencyKey,
        },
        body: JSON.stringify({
          packageCode: currentPackage.packageCode,
          candidateId: cleanId,
          candidateName: candidateName || undefined,
          candidateEmail: candidateEmail || undefined,
          quantity,
          clientReference: clientRef,
        }),
      });

      const data = await res.json().catch(() => null);

      if (res.ok && data?.success) {
        setIsConfirmModalOpen(false);
        const receipt = data.data;

        // Set receipt modal data
        setReceiptData({
          transactionId: receipt.transactionId,
          reference: receipt.reference,
          clientReference: receipt.clientReference,
          providerReference: receipt.providerReference,
          providerName: receipt.providerName,
          status: receipt.status || 'SUCCESSFUL',
          packageCode: receipt.packageCode,
          packageName: receipt.packageName,
          examBody: receipt.examBody,
          councilLogo: getCouncilLogo(receipt.examBody),
          portalUrl: receipt.portalUrl,
          instructions: receipt.instructions,
          candidateId: receipt.candidateId,
          candidateName: receipt.candidateName,
          pins: receipt.pins || [],
          quantity: receipt.quantity || quantity,
          baseCostNaira: receipt.baseCostNaira || currentPackage.baseCostNaira,
          merchantMarkupNaira: receipt.merchantMarkupNaira || currentPackage.merchantMarkupNaira,
          amountDebitedNaira: receipt.amountDebitedNaira || totalCostNaira,
          date: receipt.createdAt ? new Date(receipt.createdAt).toISOString() : new Date().toISOString(),
          source: receipt.source,
        });

        setIsReceiptModalOpen(true);

        // Update local wallet balance and reload history
        setWalletBalance((prev) => Math.max(0, prev - totalCostNaira));
        loadWallets();
        loadHistory();

        // Reset inputs
        setCandidateId('');
        setCandidateName('');
        setCandidateEmail('');
        setValidationResult(null);
      } else {
        const msg = data?.error?.message || 'Transaction could not be completed. Please try again.';
        setSubmitError(msg);
      }
    } catch {
      setSubmitError('Network failure occurred. Please check transaction history to verify if debited.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCouncilLogo = (body: string) => {
    const b = body.toLowerCase();
    if (b.includes('jamb')) return '/logos/education/jamb.png';
    if (b.includes('waec')) return '/logos/education/waec.png';
    if (b.includes('neco')) return '/logos/education/neco.png';
    if (b.includes('nabteb')) return '/logos/education/nabteb.png';
    return '/favicon.ico';
  };

  const formatNaira = (val: number) =>
    `₦${val.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const togglePinVisibility = (id: string) => {
    setVisiblePinsMap((prev) => ({ ...prev, [id]: !prev[id] }));
  };

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

        <main className="flex-1 p-3 sm:p-5 lg:p-7 max-w-7xl mx-auto w-full space-y-6">
          {/* KYC Banner */}
          <KycBanner
            kycStatus={kycStatus}
            onOpenKycModal={() => setIsKycModalOpen(true)}
          />

          {/* Page Top Header with Balance & Stats */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-white dark:bg-[#0A1220] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Link
                  href="/dashboard"
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Link>
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    <GraduationCap className="w-6 h-6" />
                  </div>
                  <div>
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
                      Examination PINs & Scratch Cards
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                      Direct automated vending for JAMB 2026 (UTME & Direct Entry), WAEC, NECO, and NABTEB.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Wallet Balance Widget */}
            <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 px-4 py-3 rounded-xl self-start md:self-auto">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Wallet className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                  Settlement Balance
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-base sm:text-lg text-slate-900 dark:text-white">
                    {isLoadingBalance ? 'Loading...' : formatNaira(walletBalance)}
                  </span>
                  <button
                    onClick={() => {
                      setIsRefreshing(true);
                      loadWallets();
                    }}
                    disabled={isRefreshing}
                    title="Refresh Balance"
                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Stats Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-[#0A1220] border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Live Gateway
                </h4>
                <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                  Interswitch SVA v5 & Vault
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-[#0A1220] border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Merchant Margins
                </h4>
                <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                  Dynamic Wholesale Pricing
                </p>
              </div>
            </div>

            <div className="bg-white dark:bg-[#0A1220] border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Fulfillment Speed
                </h4>
                <p className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                  &lt; 1.5s Instant Decryption
                </p>
              </div>
            </div>
          </div>

          {/* Council Filter Tabs & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white dark:bg-[#0A1220] border border-slate-200 dark:border-slate-800 rounded-xl p-3">
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {(['ALL', 'JAMB', 'WAEC', 'NECO', 'NABTEB'] as const).map((council) => (
                <button
                  key={council}
                  type="button"
                  onClick={() => setSelectedBodyFilter(council)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${
                    selectedBodyFilter === council
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {council === 'ALL' ? 'All Examination Councils' : council}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search packages..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* MAIN INTERACTIVE SECTION: CATALOG (LEFT) + VENDING TERMINAL (RIGHT) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT: Examination Package Cards Grid (7 Cols) */}
            <div className="lg:col-span-7 space-y-3">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Select Examination Package ({filteredPackages.length})
                </span>
                <span className="text-xs text-slate-400">Click a card to vend</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {filteredPackages.map((pkg) => {
                  const isSelected = selectedPackageCode === pkg.packageCode;
                  const councilLogo = getCouncilLogo(pkg.examBody);
                  const marginNaira = pkg.suggestedPriceNaira - pkg.baseCostNaira;

                  return (
                    <div
                      key={pkg.packageCode}
                      onClick={() => handleSelectPackage(pkg)}
                      className={`relative flex flex-col justify-between p-4 rounded-2xl border cursor-pointer transition-all duration-200 ${
                        isSelected
                          ? 'bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500 shadow-md ring-1 ring-emerald-500/30'
                          : 'bg-white dark:bg-[#0A1220] border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-sm'
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute top-3 right-3 p-1 rounded-full bg-emerald-600 text-white">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}

                      <div className="space-y-3">
                        {/* Council Badge & Logo */}
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1 flex items-center justify-center shrink-0">
                            <Image
                              src={councilLogo}
                              alt={pkg.examBody}
                              width={32}
                              height={32}
                              className="object-contain max-h-8"
                            />
                          </div>
                          <div>
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                              {pkg.examBody}
                            </span>
                            <h3 className="font-bold text-sm text-slate-900 dark:text-white leading-tight mt-0.5">
                              {pkg.name}
                            </h3>
                          </div>
                        </div>

                        {/* Description */}
                        <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                          {pkg.description}
                        </p>
                      </div>

                      {/* Financial Footer */}
                      <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                        <div>
                          <span className="text-[10px] uppercase text-slate-400 block font-medium">
                            Wholesale Cost
                          </span>
                          <span className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                            {formatNaira(pkg.baseCostNaira)}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] uppercase text-slate-400 block font-medium">
                            Retail Margin
                          </span>
                          <span className="font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                            +{formatNaira(marginNaira)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* RIGHT: Vending Terminal & Checkout Form (5 Cols) */}
            <div className="lg:col-span-5 bg-white dark:bg-[#0A1220] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
              {/* Selected Package Summary Header */}
              <div className="flex items-center gap-3.5 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-1 flex items-center justify-center shrink-0">
                  <Image
                    src={getCouncilLogo(currentPackage.examBody)}
                    alt={currentPackage.examBody}
                    width={40}
                    height={40}
                    className="object-contain max-h-10"
                  />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                      {currentPackage.examBody} Vending Terminal
                    </span>
                  </div>
                  <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white truncate">
                    {currentPackage.name}
                  </h3>
                </div>
              </div>

              {/* Form Form */}
              <form onSubmit={handleOpenConfirm} className="space-y-4">
                {/* Identifier Input (Profile Code or Phone) */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {currentPackage.identifierType === 'PROFILE_CODE'
                        ? 'Candidate Profile Code (10 Digits)'
                        : 'Candidate / Recipient Phone (11 Digits)'}
                    </label>
                    {currentPackage.requiresValidation && (
                      <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                        Verification Required
                      </span>
                    )}
                  </div>

                  <div className="relative flex gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={currentPackage.identifierType === 'PROFILE_CODE' ? 10 : 14}
                      placeholder={
                        currentPackage.identifierType === 'PROFILE_CODE'
                          ? 'e.g. 1234567890'
                          : 'e.g. 08012345678'
                      }
                      value={candidateId}
                      onChange={(e) => {
                        setCandidateId(e.target.value);
                        setValidationResult(null);
                        setValidationError(null);
                      }}
                      className="flex-1 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-mono text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />

                    {/* Validate Button for JAMB */}
                    {currentPackage.identifierType === 'PROFILE_CODE' && (
                      <button
                        type="button"
                        onClick={handleValidateCandidate}
                        disabled={isValidating || candidateId.replace(/[\s\-]/g, '').length !== 10}
                        className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs rounded-xl border border-slate-300 dark:border-slate-700 transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 shrink-0"
                      >
                        {isValidating ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            Validating...
                          </>
                        ) : (
                          <>
                            <UserCheck className="w-3.5 h-3.5" />
                            Validate
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Validation Error Message */}
                  {validationError && (
                    <div className="flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 mt-1">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{validationError}</span>
                    </div>
                  )}

                  {/* Candidate Validated Badge */}
                  {validationResult?.isValid && (
                    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs">
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      <div className="truncate">
                        <span className="font-semibold block truncate">
                          {validationResult.candidateName}
                        </span>
                        <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80">
                          {validationResult.responseMessage}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Candidate Name (Optional if phone, confirmed if profile) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Candidate Full Name <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Candidate name for receipt"
                    value={candidateName}
                    onChange={(e) => setCandidateName(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Candidate Email (Optional) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Candidate Email <span className="text-slate-400 font-normal">(Optional notification)</span>
                  </label>
                  <input
                    type="email"
                    placeholder="candidate@example.com"
                    value={candidateEmail}
                    onChange={(e) => setCandidateEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                {/* Quantity Selector (1-5 for scratch cards, 1 for profile code) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Quantity of Tokens / PINs
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {[1, 2, 3, 4, 5].map((num) => {
                      const isDisabled = currentPackage.identifierType === 'PROFILE_CODE' && num > 1;
                      return (
                        <button
                          key={num}
                          type="button"
                          disabled={isDisabled}
                          onClick={() => setQuantity(num)}
                          className={`py-2 text-xs font-bold rounded-xl border transition ${
                            quantity === num
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                              : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                          } ${isDisabled ? 'opacity-30 cursor-not-allowed' : ''}`}
                        >
                          {num}
                        </button>
                      );
                    })}
                  </div>
                  {currentPackage.identifierType === 'PROFILE_CODE' && (
                    <span className="text-[10px] text-slate-400 block">
                      JAMB profile codes can only vend 1 registration PIN per profile.
                    </span>
                  )}
                </div>

                {/* Financial Summary Box */}
                <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2.5 text-xs">
                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                    <span>Wholesale Unit Cost</span>
                    <span className="font-mono">{formatNaira(currentPackage.baseCostNaira)}</span>
                  </div>

                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                    <span>Recommended Retail</span>
                    <span className="font-mono">{formatNaira(currentPackage.suggestedPriceNaira)}</span>
                  </div>

                  <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                    <span>Units to Vend</span>
                    <span className="font-semibold">{quantity} PIN{quantity > 1 ? 's' : ''}</span>
                  </div>

                  <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400 font-semibold pt-1 border-t border-slate-200 dark:border-slate-800">
                    <span>Estimated Merchant Profit</span>
                    <span className="font-mono">+{formatNaira(totalEstimatedProfit)}</span>
                  </div>

                  <div className="flex justify-between items-center text-sm font-bold text-slate-900 dark:text-white pt-1">
                    <span>Total Amount Debited</span>
                    <span className="font-mono text-base">{formatNaira(totalCostNaira)}</span>
                  </div>
                </div>

                {/* Error Banner */}
                {submitError && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{submitError}</span>
                  </div>
                )}

                {/* Insufficient Balance Notice */}
                {!hasSufficientBalance && (
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-amber-700 dark:text-amber-300 text-xs flex items-center justify-between">
                    <span>Balance too low (Need {formatNaira(totalCostNaira)})</span>
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
                    !candidateId.trim() ||
                    (currentPackage.requiresValidation && !validationResult?.isValid)
                  }
                  className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl shadow-md transition disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <Lock className="w-4 h-4" />
                  <span>Vend Exam PIN • {formatNaira(totalCostNaira)}</span>
                </button>
              </form>
            </div>
          </div>

          {/* VENDED PINS & TRANSACTION AUDIT HISTORY */}
          <div className="bg-white dark:bg-[#0A1220] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Receipt className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Exam PIN Vending History
                </h3>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter by ref, phone or profile..."
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            {isLoadingHistory ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-500" />
                Loading exam vending history...
              </div>
            ) : historyItems.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs space-y-1">
                <GraduationCap className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700" />
                <p className="font-semibold text-slate-700 dark:text-slate-300">No Exam PINs vended yet</p>
                <p>Purchased JAMB, WAEC, NECO, and NABTEB PINs will appear here with serials.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-medium">
                      <th className="py-3 px-3">Date</th>
                      <th className="py-3 px-3">Package / Council</th>
                      <th className="py-3 px-3">Candidate ID</th>
                      <th className="py-3 px-3">Vended e-PIN</th>
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
                          item.metadata?.packageName?.toLowerCase().includes(s) ||
                          item.metadata?.examBody?.toLowerCase().includes(s)
                        );
                      })
                      .map((item) => {
                        const isVisible = visiblePinsMap[item.id];
                        const pins = item.pins || item.metadata?.pins || [];
                        const primaryPin = pins[0]?.pin || 'ENCRYPTED';
                        const serialNum = pins[0]?.serialNumber;

                        return (
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
                                {item.metadata?.packageName || item.type}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                Ref: {item.reference}
                              </span>
                            </td>

                            <td className="py-3 px-3 font-mono font-semibold text-slate-700 dark:text-slate-300">
                              {item.recipient}
                            </td>

                            <td className="py-3 px-3">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                  {isVisible ? primaryPin : '•••• •••• ••••'}
                                </span>
                                {pins.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => togglePinVisibility(item.id)}
                                    className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
                                    title={isVisible ? 'Hide PIN' : 'Reveal PIN'}
                                  >
                                    {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                  </button>
                                )}
                              </div>
                              {serialNum && (
                                <span className="text-[10px] text-slate-400 block font-mono">
                                  SN: {serialNum}
                                </span>
                              )}
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
                                    providerReference: item.providerReference,
                                    status: item.status,
                                    packageCode: item.metadata?.packageCode || 'EXAM_PIN',
                                    packageName: item.metadata?.packageName || item.type,
                                    examBody: item.metadata?.examBody || 'EXAM',
                                    councilLogo: getCouncilLogo(item.metadata?.examBody || ''),
                                    portalUrl: item.metadata?.portalUrl,
                                    instructions: item.metadata?.instructions,
                                    candidateId: item.recipient,
                                    candidateName: item.metadata?.candidateName,
                                    pins: pins,
                                    quantity: item.metadata?.quantity || 1,
                                    baseCostNaira: item.amountNaira,
                                    merchantMarkupNaira: item.feeNaira || 0,
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
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* CONFIRMATION MODAL */}
      {isConfirmModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => !isSubmitting && setIsConfirmModalOpen(false)}
        >
          <div
            className="w-full max-w-md bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <GraduationCap className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                  Confirm PIN Purchase
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Please review candidate details before confirming.
                </p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">Examination Package</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {currentPackage.name}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">Candidate / Recipient</span>
                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                  {candidateId}
                </span>
              </div>

              {candidateName && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 dark:text-slate-400">Candidate Name</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {candidateName}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">Quantity</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {quantity} PIN{quantity > 1 ? 's' : ''}
                </span>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-slate-200 dark:border-slate-800 font-bold text-sm">
                <span className="text-slate-900 dark:text-white">Amount to Debit</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 text-base">
                  {formatNaira(totalCostNaira)}
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
                className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Vending PIN...
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
      <ExamPinReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        receipt={receiptData}
        onVendAnother={() => {
          setIsReceiptModalOpen(false);
          setCandidateId('');
          setCandidateName('');
          setValidationResult(null);
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
