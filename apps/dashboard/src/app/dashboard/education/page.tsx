'use client';

import React, { useCallback, useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  Wallet,
  Search,
  CheckCircle2,
  AlertCircle,
  FileText,
  X,
  RotateCw,
  Loader2,
} from 'lucide-react';
import Sidebar from '@/components/dashboard/Sidebar';
import Header from '@/components/dashboard/Header';
import KycBanner from '@/components/dashboard/KycBanner';
import KycModal from '@/components/dashboard/KycModal';
import AccessRestricted from '@/components/dashboard/AccessRestricted';
import ModalDialog from '@/components/ModalDialog';
import BaxatoLoader from '@/components/BaxatoLoader';
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
import { useWalletBalance } from '@/lib/use-wallet-balance';
import { showToast } from '@/lib/toast';

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
  enabled?: boolean;
}

export interface CandidateValidationState {
  isValid: boolean;
  candidateName?: string;
  responseMessage?: string;
}

export default function EducationPage() {
  // Navigation & User State
  const [merchantName, setMerchantName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const u = getStoredUser();
      if (u?.firstName) return u.firstName;
    }
    return '';
  });
  const [businessName, setBusinessName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const b = getStoredBusiness();
      if (b?.name) return b.name;
    }
    return '';
  });
  const [kycStatus, setKycStatus] = useState<string>('INITIALIZING');
  const [userRole, setUserRole] = useState<string>('BUSINESS_OWNER');
  const [isKycModalOpen, setIsKycModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { walletBalance, isLoadingBalance, hasLoadedBalance, refreshWallets: loadWallets } = useWalletBalance();
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Exam Packages Catalog & View Selection (populated from backend so stale prices never flash)
  const [packagesList, setPackagesList] = useState<ExamPackageItem[]>([]);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [isRetryingCatalog, setIsRetryingCatalog] = useState(false);
  const packagesListRef = useRef<ExamPackageItem[]>([]);
  const [selectedBodyFilter, setSelectedBodyFilter] = useState<'ALL' | 'JAMB' | 'WAEC' | 'NECO' | 'NABTEB'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPackageCode, setSelectedPackageCode] = useState<string | null>(null);

  // Form Inputs
  const [candidateId, setCandidateId] = useState('');
  const [candidateName, setCandidateName] = useState('');
  const [candidateEmail, setCandidateEmail] = useState('');
  const [quantity, setQuantity] = useState<number>(1);

  // JAMB Candidate Profile Code Validation State
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<CandidateValidationState | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const autoVerifyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastVerifiedKeyRef = useRef<string>('');
  const lastAttemptedKeyRef = useRef<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);
  const candidateInputRef = useRef<HTMLInputElement | null>(null);

  // Purchase & Confirmation State
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Receipt Modal State
  const [receiptData, setReceiptData] = useState<ExamPinReceiptData | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // Load Exam Packages from Backend
  const loadPackages = useCallback(async (requestedPackage?: string | null) => {
    try {
      setCatalogError(null);
      const authToken = getStoredAuthToken();
      const res = await fetch('/api/services/education/packages', {
        headers: {
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        cache: 'no-store',
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success || !Array.isArray(data.data)) {
        setCatalogError(data?.error?.message || 'Unable to load exam PINs right now.');
        return;
      }

      const nextPackages: ExamPackageItem[] = data.data.map((pkg: ExamPackageItem) => ({
        ...pkg,
        enabled: pkg.enabled !== false,
      }));
      packagesListRef.current = nextPackages;
      setPackagesList(nextPackages);

      const activeParam =
        requestedPackage ||
        (typeof window !== 'undefined'
          ? new URLSearchParams(window.location.search).get('package') || ''
          : '');

      if (activeParam) {
        const matched = nextPackages.find((p) => p.packageCode === activeParam);
        if (matched) {
          if (matched.enabled === false) {
            setSelectedPackageCode(null);
            if (typeof window !== 'undefined') {
              const url = new URL(window.location.href);
              url.searchParams.delete('package');
              window.history.replaceState({}, '', url.toString());
            }
            showToast({
              type: 'error',
              message: `${matched.name} is currently unavailable.`,
            });
          } else {
            setSelectedPackageCode(matched.packageCode);
          }
        }
      }
    } catch {
      setCatalogError('Unable to load exam PINs right now.');
    }
  }, []);

  // Initialize
  useEffect(() => {
    const authToken = getStoredAuthToken();
    if (!authToken) {
      clearSessionAndRedirect('expired');
      return;
    }

    const user = getStoredUser();
    const biz = getStoredBusiness();
    if (biz?.role) setUserRole(biz.role);
    else if (user?.role) setUserRole(user.role);
    if (user?.firstName) setMerchantName(user.firstName);
    if (user?.kycStatus) setKycStatus(user.kycStatus);
    else setKycStatus('UNVERIFIED');
    if (biz?.name) setBusinessName(biz.name);

    let initialPackage: string | null = null;
    try {
      if (typeof window !== 'undefined') {
        initialPackage = new URLSearchParams(window.location.search).get('package');
      }
    } catch {}

    const syncUserProfile = async () => {
      try {
        const currentToken = getStoredAuthToken();
        if (!currentToken) return;
        const res = await fetch('/api/users/me', {
          headers: { Authorization: `Bearer ${currentToken}` },
        });
        const data = await res.json().catch(() => null);
        if (handleAuthResponse(res, data)) return;
        if (res.ok && data?.success && data.data) {
          const userData = data.data.user || data.data;
          if (userData.kycStatus) setKycStatus(userData.kycStatus);
          if (userData.firstName) setMerchantName(userData.firstName);
        }
      } catch {}
    };

    let isMounted = true;
    const initializePage = async () => {
      try {
        await Promise.all([
          loadPackages(initialPackage),
          syncUserProfile(),
        ]);
      } finally {
        if (isMounted) {
          setIsInitialLoading(false);
        }
      }
    };

    void initializePage();

    const handleBizSwitched = () => {
      const b = getStoredBusiness();
      if (b?.name) setBusinessName(b.name);
      if (b?.role) setUserRole(b.role);
    };

    const handlePopState = () => {
      const nextParam = new URLSearchParams(window.location.search).get('package');
      const matched = packagesListRef.current.find((p) => p.packageCode === nextParam);
      if (matched && matched.enabled !== false) {
        setSelectedPackageCode(matched.packageCode);
      } else {
        setSelectedPackageCode(null);
      }
    };

    window.addEventListener('bx_business_switched', handleBizSwitched);
    window.addEventListener('popstate', handlePopState);
    return () => {
      isMounted = false;
      window.removeEventListener('bx_business_switched', handleBizSwitched);
      window.removeEventListener('popstate', handlePopState);
      if (autoVerifyTimeoutRef.current) {
        clearTimeout(autoVerifyTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [loadPackages]);

  const canExecuteServices =
    userRole === 'BUSINESS_OWNER' ||
    userRole === 'BUSINESS_ADMIN' ||
    userRole === 'DEVELOPER' ||
    userRole === 'SUPPORT';

  const handleRefreshBalance = async () => {
    setIsRefreshing(true);
    try {
      await loadWallets();
    } finally {
      setIsRefreshing(false);
    }
  };

  // Active Selected Package (null => View 1 catalog)
  const currentPackage = useMemo(() => {
    if (!selectedPackageCode) return null;
    return packagesList.find((p) => p.packageCode === selectedPackageCode) || null;
  }, [packagesList, selectedPackageCode]);

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

  const clearPendingVerification = () => {
    if (autoVerifyTimeoutRef.current) {
      clearTimeout(autoVerifyTimeoutRef.current);
      autoVerifyTimeoutRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsValidating(false);
  };

  // Select Package into View 2
  const handleSelectPackage = (pkg: ExamPackageItem) => {
    if (pkg.enabled === false) {
      showToast({
        type: 'error',
        message: `${pkg.name} is currently unavailable.`,
      });
      return;
    }

    clearPendingVerification();
    setSelectedPackageCode(pkg.packageCode);
    setCandidateId('');
    setCandidateName('');
    setCandidateEmail('');
    setQuantity(1);
    setValidationResult(null);
    setValidationError(null);
    lastVerifiedKeyRef.current = '';
    lastAttemptedKeyRef.current = '';

    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('package', pkg.packageCode);
      window.history.pushState({}, '', url.toString());
    }
  };

  const handleBackToCatalog = () => {
    clearPendingVerification();
    setSelectedPackageCode(null);
    setCandidateId('');
    setCandidateName('');
    setCandidateEmail('');
    setQuantity(1);
    setValidationResult(null);
    setValidationError(null);
    lastVerifiedKeyRef.current = '';
    lastAttemptedKeyRef.current = '';

    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('package');
      window.history.pushState({}, '', url.toString());
    }
  };

  // Profile Code Validation (with AbortController)
  const executeCandidateValidation = async (
    rawId: string,
    targetPackage: ExamPackageItem,
  ) => {
    if (targetPackage.enabled === false) {
      showToast({
        type: 'error',
        message: `${targetPackage.name} is currently unavailable.`,
      });
      return;
    }

    const cleanId = rawId.replace(/\D/g, '');
    if (!cleanId) {
      setValidationError('Enter a valid 10-digit profile code.');
      return;
    }

    if (targetPackage.examBody === 'JAMB' && !/^\d{10}$/.test(cleanId)) {
      const msg = 'JAMB Profile Code must be exactly 10 digits.';
      setValidationError(msg);
      return;
    }

    const verificationKey = `${targetPackage.packageCode}:${cleanId}`;
    if (verificationKey === lastVerifiedKeyRef.current && validationResult?.isValid) {
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;
    lastAttemptedKeyRef.current = verificationKey;

    setIsValidating(true);
    setValidationError(null);
    setValidationResult(null);

    try {
      const authToken = getStoredAuthToken();
      const res = await fetch('/api/services/education/validate', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          examBody: targetPackage.examBody,
          candidateId: cleanId,
          packageCode: targetPackage.packageCode,
        }),
      });

      const data = await res.json().catch(() => null);
      if (controller.signal.aborted) {
        return;
      }

      if (handleAuthResponse(res, data)) {
        return;
      }

      if (res.ok && data?.success && data.data?.isValid) {
        setValidationResult({
          isValid: true,
          candidateName: data.data.candidateName || 'Verified Candidate',
          responseMessage: data.data.responseMessage || 'Candidate profile verified.',
        });
        if (data.data.candidateName) {
          setCandidateName(data.data.candidateName);
        }
        lastVerifiedKeyRef.current = verificationKey;
      } else {
        const errorMsg =
          data?.error?.message ||
          data?.data?.responseMessage ||
          'Candidate verification failed. Check the profile code.';
        setValidationError(errorMsg);
        showToast({ type: 'error', title: 'Candidate verification failed', message: errorMsg });
        lastVerifiedKeyRef.current = '';
      }
    } catch (err: any) {
      if (err?.name === 'AbortError' || controller.signal.aborted) {
        return;
      }
      const errMsg = 'Network error while validating candidate. Please try again.';
      setValidationError(errMsg);
      showToast({ type: 'error', title: 'Candidate verification failed', message: errMsg });
      lastVerifiedKeyRef.current = '';
    } finally {
      if (!controller.signal.aborted) {
        setIsValidating(false);
      }
    }
  };

  const handleValidateCandidate = () => {
    if (!currentPackage) return;
    void executeCandidateValidation(candidateId, currentPackage);
  };

  const handleCancelVerification = () => {
    clearPendingVerification();
    lastAttemptedKeyRef.current = '';
    candidateInputRef.current?.focus();
  };

  const handleCandidateIdChange = (val: string) => {
    if (!currentPackage) return;
    const isProfileCode = currentPackage.identifierType === 'PROFILE_CODE';
    const clean = val.replace(/\D/g, '').slice(0, isProfileCode ? 10 : 11);

    setCandidateId(clean);
    setValidationResult(null);
    setValidationError(null);
    lastVerifiedKeyRef.current = '';
    lastAttemptedKeyRef.current = '';

    if (autoVerifyTimeoutRef.current) {
      clearTimeout(autoVerifyTimeoutRef.current);
      autoVerifyTimeoutRef.current = null;
    }

    if (isProfileCode && clean.length === 10) {
      autoVerifyTimeoutRef.current = setTimeout(() => {
        void executeCandidateValidation(clean, currentPackage);
      }, 450);
    }
  };

  const handleCandidateIdBlur = () => {
    if (!currentPackage || currentPackage.identifierType !== 'PROFILE_CODE' || isValidating) {
      return;
    }
    const clean = candidateId.replace(/\D/g, '');
    if (clean.length !== 10) return;

    const key = `${currentPackage.packageCode}:${clean}`;
    if (key === lastVerifiedKeyRef.current || key === lastAttemptedKeyRef.current) {
      return;
    }
    if (autoVerifyTimeoutRef.current) {
      clearTimeout(autoVerifyTimeoutRef.current);
      autoVerifyTimeoutRef.current = null;
    }
    void executeCandidateValidation(clean, currentPackage);
  };

  // Compute Total Cost
  const totalCostNaira = useMemo(() => {
    if (!currentPackage) return 0;
    return currentPackage.baseCostNaira * quantity;
  }, [currentPackage, quantity]);

  const hasSufficientBalance = walletBalance >= totalCostNaira;

  // Validation before opening confirmation
  const handleOpenConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPackage) return;

    if (currentPackage.enabled === false) {
      showToast({
        type: 'error',
        message: `${currentPackage.name} is currently unavailable.`,
      });
      return;
    }

    const cleanId = candidateId.replace(/\D/g, '');
    if (!cleanId) {
      const msg =
        currentPackage.identifierType === 'PROFILE_CODE'
          ? 'Enter the 10-digit candidate profile code.'
          : 'Enter the recipient phone number.';
      setValidationError(msg);
      showToast({ type: 'error', message: msg });
      candidateInputRef.current?.focus();
      return;
    }

    if (currentPackage.examBody === 'JAMB') {
      if (!/^\d{10}$/.test(cleanId)) {
        const msg = 'JAMB Profile Code must be exactly 10 numeric digits.';
        setValidationError(msg);
        showToast({ type: 'error', message: msg });
        candidateInputRef.current?.focus();
        return;
      }
      if (currentPackage.requiresValidation && !validationResult?.isValid) {
        const msg = 'Validate the JAMB profile code before purchasing.';
        setValidationError(msg);
        showToast({ type: 'error', message: msg });
        return;
      }
    } else if (cleanId.length < 10) {
      const msg = 'Recipient phone number must be 10 or 11 digits.';
      setValidationError(msg);
      showToast({ type: 'error', message: msg });
      candidateInputRef.current?.focus();
      return;
    }

    if (!hasSufficientBalance) {
      showToast({
        type: 'error',
        message: `Insufficient wallet balance. Total cost is ₦${totalCostNaira.toLocaleString()}, while balance is ₦${walletBalance.toLocaleString()}.`,
      });
      return;
    }

    setIsConfirmModalOpen(true);
  };

  // Execute Exam PIN Purchase
  const handleExecutePurchase = async () => {
    if (!currentPackage) return;
    setIsSubmitting(true);

    const cleanId = candidateId.replace(/\D/g, '');
    const clientRef = `BX-EDU-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const idempotencyKey =
      typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : clientRef;

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
          candidateName: candidateName.trim() || undefined,
          candidateEmail: candidateEmail.trim() || undefined,
          quantity,
          clientReference: clientRef,
        }),
      });

      const data = await res.json().catch(() => null);
      if (handleAuthResponse(res, data)) {
        return;
      }

      if (res.ok && data?.success) {
        setIsConfirmModalOpen(false);
        const receipt = data.data;

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
        loadWallets();

        setCandidateId('');
        setCandidateName('');
        setCandidateEmail('');
        setQuantity(1);
        setValidationResult(null);
        setValidationError(null);
        lastVerifiedKeyRef.current = '';
        lastAttemptedKeyRef.current = '';
      } else {
        const msg = data?.error?.message || 'Purchase could not be completed. Please try again.';
        setIsConfirmModalOpen(false);
        showToast({ type: 'error', title: 'Exam PIN purchase failed', message: msg });
      }
    } catch {
      setIsConfirmModalOpen(false);
      showToast({
        type: 'error',
        title: 'Exam PIN purchase failed',
        message: 'Network failure occurred. Check transaction history to confirm status.',
      });
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
    return '/logos/categories/education.svg';
  };

  const formatNaira = (val: number) =>
    `₦${val.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const handleRetryCatalog = async () => {
    setIsRetryingCatalog(true);
    try {
      await loadPackages();
    } finally {
      setIsRetryingCatalog(false);
    }
  };

  if (isInitialLoading || !hasLoadedBalance) {
    return <BaxatoLoader variant="fullscreen" />;
  }

  return (
    <div className="min-h-screen bg-[#FFFFFF] dark:bg-[#070D18]">
      {isSubmitting && <BaxatoLoader variant="overlay" />}

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
          businessName={businessName}
          kycStatus={kycStatus}
          isRefreshing={isRefreshing}
          onRefresh={handleRefreshBalance}
          sticky={false}
        />

        <main className="flex-1 px-4 py-5 sm:p-6 lg:p-8 max-w-6xl mx-auto w-full space-y-6">
          {!canExecuteServices ? (
            <AccessRestricted description="Exam PIN purchases are restricted to Workspace Owners, Administrators, Developers, and Operations staff." />
          ) : (
            <>
              <KycBanner
                kycStatus={kycStatus}
                userRole={userRole}
                onOpenKycModal={() => setIsKycModalOpen(true)}
              />

              {/* ======================================================== */}
              {/* VIEW 1: EXAM PIN CATALOG (No package selected)           */}
              {/* ======================================================== */}
              {!currentPackage ? (
                <div className="space-y-6">
                  {/* Top Navigation Row */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <Link
                      href="/dashboard"
                      className="inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
                    >
                      <ArrowLeft className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                      <span>Back to Dashboard</span>
                    </Link>

                    <Link
                      href="/dashboard/ledger?service=EXAM_PIN"
                      className="inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5 text-[#126BEB] dark:text-[#38BDF8]" aria-hidden="true" />
                      <span>Exam PIN History</span>
                    </Link>
                  </div>

                  {/* Page Heading & Compact Wallet Balance */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200/80 dark:border-slate-800/80">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <Image
                        src="/logos/categories/education.svg"
                        alt=""
                        width={40}
                        height={40}
                        className="w-10 h-10 shrink-0 rounded-xl"
                      />
                      <div className="min-w-0">
                        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight text-balance">
                          Exam PINs
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 text-pretty">
                          JAMB, WAEC, NECO, and NABTEB result checkers and registration PINs.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 text-xs font-medium text-slate-600 dark:text-slate-300 w-fit shrink-0">
                      <Wallet className="w-3.5 h-3.5 text-[#126BEB] dark:text-[#38BDF8]" aria-hidden="true" />
                      <span>Balance:</span>
                      {isLoadingBalance ? (
                        <span className="inline-block w-16 h-3.5 bg-slate-300 dark:bg-slate-700 rounded animate-pulse" />
                      ) : (
                        <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                          {formatNaira(walletBalance)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Council Filter Tabs & Search */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-[#0B1528] rounded-lg border border-slate-200 dark:border-slate-800 overflow-x-auto">
                      {(['ALL', 'JAMB', 'WAEC', 'NECO', 'NABTEB'] as const).map((council) => (
                        <button
                          key={council}
                          type="button"
                          onClick={() => setSelectedBodyFilter(council)}
                          className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
                            selectedBodyFilter === council
                              ? 'bg-white dark:bg-[#126BEB] text-slate-900 dark:text-white shadow-xs'
                              : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          {council === 'ALL' ? 'All Exam Bodies' : council}
                        </button>
                      ))}
                    </div>

                    <search className="relative flex-1 sm:max-w-xs">
                      <label htmlFor="education-package-search" className="sr-only">
                        Search exam PIN packages
                      </label>
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" aria-hidden="true" />
                      <input
                        id="education-package-search"
                        type="search"
                        placeholder="Search packages..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full h-10 pl-9 pr-3 text-xs sm:text-sm rounded-lg bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#126BEB]"
                      />
                    </search>
                  </div>

                  {/* PACKAGES GRID */}
                  {catalogError && packagesList.length === 0 ? (
                    <div className="py-12 px-4 text-center bg-white dark:bg-[#0B1528] rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
                      <AlertCircle className="w-6 h-6 text-red-500 mx-auto" aria-hidden="true" />
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {catalogError}
                      </p>
                      <button
                        type="button"
                        onClick={handleRetryCatalog}
                        disabled={isRetryingCatalog}
                        className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-lg bg-[#126BEB] hover:bg-[#0B5CC7] text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {isRetryingCatalog && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />}
                        <span>Retry</span>
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                        {filteredPackages.map((pkg) => {
                          const isUnavailable = pkg.enabled === false;
                          const councilLogo = getCouncilLogo(pkg.examBody);
                          return (
                            <button
                              key={pkg.packageCode}
                              type="button"
                              aria-disabled={isUnavailable || undefined}
                              onClick={() => handleSelectPackage(pkg)}
                              className={`group relative p-4 rounded-xl border text-left transition-colors duration-150 flex flex-col justify-between focus:outline-none focus-visible:ring-2 focus-visible:ring-[#126BEB] ${
                                isUnavailable
                                  ? 'opacity-55 grayscale cursor-not-allowed border-slate-200 dark:border-slate-800/60 bg-slate-50 dark:bg-[#091222]'
                                  : 'border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0B1528] hover:border-[#126BEB] dark:hover:border-[#126BEB] cursor-pointer'
                              }`}
                            >
                              <div>
                                <div className="flex items-center justify-between gap-2 mb-3">
                                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-white border border-slate-200 dark:border-slate-700 flex items-center justify-center p-1 shrink-0">
                                    <Image
                                      src={councilLogo}
                                      alt={pkg.examBody}
                                      width={32}
                                      height={32}
                                      className="object-contain max-h-8"
                                    />
                                  </div>

                                  <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 shrink-0">
                                    {pkg.examBody}
                                  </span>
                                </div>

                                <h2 className={`font-bold text-sm text-slate-900 dark:text-white leading-snug ${isUnavailable ? '' : 'group-hover:text-[#126BEB] transition-colors'}`}>
                                  {pkg.name}
                                </h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                                  {pkg.description}
                                </p>
                              </div>

                              <div className="pt-3 mt-4 border-t border-slate-100 dark:border-slate-800/70 flex items-center justify-between text-xs">
                                <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                                  {formatNaira(pkg.baseCostNaira)}
                                </span>

                                {isUnavailable ? (
                                  <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-[10px] font-semibold text-slate-600 dark:text-slate-400">
                                    Unavailable
                                  </span>
                                ) : (
                                  <span className="font-semibold text-[#126BEB] dark:text-[#38BDF8]">
                                    Buy PIN
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {filteredPackages.length === 0 && (
                        <div className="py-12 text-center text-slate-400 text-xs bg-white dark:bg-[#0B1528] rounded-xl border border-slate-200 dark:border-slate-800">
                          No exam package matches &quot;{searchQuery}&quot;.
                        </div>
                      )}
                    </>
                  )}
                </div>
              ) : (
                /* ======================================================== */
                /* VIEW 2: DEDICATED PACKAGE CHECKOUT                       */
                /* ======================================================== */
                <div className="space-y-6">
                  {/* Top Navigation Row */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={handleBackToCatalog}
                      className="inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                      <span>Back to Packages</span>
                    </button>

                    <Link
                      href="/dashboard/ledger?service=EXAM_PIN"
                      className="inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5 text-[#126BEB] dark:text-[#38BDF8]" aria-hidden="true" />
                      <span>Exam PIN History</span>
                    </Link>
                  </div>

                  {/* Package Header & Compact Balance */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200/80 dark:border-slate-800/80">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-white border border-slate-200 dark:border-slate-700 flex items-center justify-center p-1.5 shrink-0">
                        <Image
                          src={getCouncilLogo(currentPackage.examBody)}
                          alt={currentPackage.examBody}
                          width={36}
                          height={36}
                          className="object-contain max-h-9"
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight text-balance">
                            {currentPackage.name}
                          </h1>
                          <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300 shrink-0">
                            {currentPackage.examBody}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                          {currentPackage.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 text-xs font-medium text-slate-600 dark:text-slate-300 w-fit shrink-0">
                      <Wallet className="w-3.5 h-3.5 text-[#126BEB] dark:text-[#38BDF8]" aria-hidden="true" />
                      <span>Balance:</span>
                      {isLoadingBalance ? (
                        <span className="inline-block w-16 h-3.5 bg-slate-300 dark:bg-slate-700 rounded animate-pulse" />
                      ) : (
                        <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                          {formatNaira(walletBalance)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Centered Checkout Form Card */}
                  <form
                    onSubmit={handleOpenConfirm}
                    noValidate
                    aria-label="Exam PIN purchase form"
                    className="max-w-xl mx-auto w-full bg-white dark:bg-[#0B1528] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-5"
                  >
                    {/* 1. Candidate Profile Code OR Recipient Phone */}
                    <div className="space-y-1.5">
                      <label
                        htmlFor="education-candidate-input"
                        className="text-xs font-semibold text-slate-700 dark:text-slate-300 block"
                      >
                        {currentPackage.identifierType === 'PROFILE_CODE'
                          ? 'Candidate Profile Code'
                          : 'Recipient Phone Number'}{' '}
                        <span aria-hidden="true" className="text-red-500">*</span>
                      </label>

                      <div className="relative">
                        <input
                          ref={candidateInputRef}
                          id="education-candidate-input"
                          name="candidateId"
                          type={currentPackage.identifierType === 'PROFILE_CODE' ? 'text' : 'tel'}
                          inputMode="numeric"
                          autoCorrect="off"
                          autoCapitalize="none"
                          spellCheck={false}
                          maxLength={currentPackage.identifierType === 'PROFILE_CODE' ? 10 : 11}
                          placeholder={
                            currentPackage.identifierType === 'PROFILE_CODE'
                              ? '10-digit JAMB profile code'
                              : '08012345678'
                          }
                          value={candidateId}
                          onChange={(e) => handleCandidateIdChange(e.target.value)}
                          onBlur={handleCandidateIdBlur}
                          readOnly={currentPackage.identifierType === 'PROFILE_CODE' && isValidating}
                          aria-busy={isValidating}
                          aria-invalid={Boolean(validationError && !isValidating && !validationResult?.isValid)}
                          className={`w-full h-11 pl-3.5 ${
                            currentPackage.identifierType === 'PROFILE_CODE'
                              ? isValidating
                                ? 'pr-36'
                                : validationResult?.isValid
                                ? 'pr-28'
                                : 'pr-24'
                              : 'pr-3.5'
                          } rounded-lg border text-slate-900 dark:text-white text-sm sm:text-base font-mono font-semibold placeholder:text-slate-400 placeholder:font-sans placeholder:font-normal focus:outline-none focus:ring-2 transition-colors ${
                            isValidating
                              ? 'bg-slate-50 dark:bg-[#0D1726] border-[#126BEB] focus:ring-[#126BEB]/20'
                              : validationResult?.isValid
                              ? 'bg-white dark:bg-[#070D18] border-emerald-500/70 focus:border-emerald-500 focus:ring-emerald-500/20'
                              : validationError
                              ? 'bg-white dark:bg-[#070D18] border-red-500 focus:border-red-500 focus:ring-red-500/20'
                              : 'bg-white dark:bg-[#070D18] border-slate-200 dark:border-slate-700 focus:border-[#126BEB] focus:ring-[#126BEB]/20'
                          }`}
                          required
                        />

                        {currentPackage.identifierType === 'PROFILE_CODE' && (
                          <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
                            {isValidating ? (
                              <>
                                <span className="h-8 px-2.5 rounded-md bg-blue-500/10 text-[#126BEB] dark:text-[#38BDF8] text-xs font-semibold flex items-center gap-1.5">
                                  <RotateCw className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                                  <span>Verifying</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={handleCancelVerification}
                                  aria-label="Cancel verification and edit profile code"
                                  title="Edit profile code"
                                  className="h-8 w-8 rounded-md text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center justify-center transition-colors cursor-pointer"
                                >
                                  <X className="w-3.5 h-3.5" aria-hidden="true" />
                                </button>
                              </>
                            ) : validationResult?.isValid ? (
                              <span className="h-8 px-2.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                                <span>Verified</span>
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={handleValidateCandidate}
                                disabled={candidateId.replace(/\D/g, '').length !== 10}
                                className="h-8 px-3 rounded-md bg-[#126BEB] hover:bg-[#0B5CC7] text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                Verify
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Verification Error */}
                      {validationError && !isValidating && (
                        <div className="flex items-start justify-between gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                            <span>{validationError}</span>
                          </div>
                          {currentPackage.identifierType === 'PROFILE_CODE' && (
                            <button
                              type="button"
                              onClick={handleValidateCandidate}
                              className="font-semibold underline hover:no-underline shrink-0 cursor-pointer"
                            >
                              Retry
                            </button>
                          )}
                        </div>
                      )}

                      {/* Validated Candidate Information */}
                      {validationResult?.isValid && (
                        <div className="p-3 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-500/30 text-xs flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                          <span className="truncate">{validationResult.candidateName}</span>
                        </div>
                      )}
                    </div>

                    {/* 2. Quantity Selector */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                          Quantity
                        </span>
                        {currentPackage.identifierType === 'PROFILE_CODE' && (
                          <span className="text-[11px] text-slate-400">
                            1 PIN per profile code
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-5 gap-2">
                        {[1, 2, 3, 4, 5].map((num) => {
                          const isDisabled = currentPackage.identifierType === 'PROFILE_CODE' && num > 1;
                          return (
                            <button
                              key={num}
                              type="button"
                              disabled={isDisabled}
                              onClick={() => setQuantity(num)}
                              className={`h-10 text-xs font-semibold rounded-lg border transition-colors ${
                                quantity === num
                                  ? 'bg-[#126BEB] text-white border-[#126BEB]'
                                  : 'bg-white dark:bg-[#070D18] border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                              } ${isDisabled ? 'opacity-35 cursor-not-allowed' : 'cursor-pointer'}`}
                            >
                              {num}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* 3. Candidate Name (Optional) */}
                    <div className="space-y-1.5">
                      <label
                        htmlFor="education-candidate-name"
                        className="text-xs font-semibold text-slate-700 dark:text-slate-300 block"
                      >
                        Candidate Name{' '}
                        <span className="text-slate-400 font-normal">(Optional)</span>
                      </label>
                      <input
                        id="education-candidate-name"
                        name="candidateName"
                        type="text"
                        placeholder="Candidate full name"
                        value={candidateName}
                        onChange={(e) => setCandidateName(e.target.value)}
                        className="w-full h-11 px-3.5 bg-white dark:bg-[#070D18] border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#126BEB]/25 focus:border-[#126BEB] transition-colors"
                      />
                    </div>

                    {/* 4. Candidate Email (Optional) */}
                    <div className="space-y-1.5">
                      <label
                        htmlFor="education-candidate-email"
                        className="text-xs font-semibold text-slate-700 dark:text-slate-300 block"
                      >
                        Candidate Email{' '}
                        <span className="text-slate-400 font-normal">(Optional)</span>
                      </label>
                      <input
                        id="education-candidate-email"
                        name="candidateEmail"
                        type="email"
                        placeholder="candidate@example.com"
                        value={candidateEmail}
                        onChange={(e) => setCandidateEmail(e.target.value)}
                        className="w-full h-11 px-3.5 bg-white dark:bg-[#070D18] border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#126BEB]/25 focus:border-[#126BEB] transition-colors"
                      />
                    </div>

                    {/* Insufficient Balance Notice */}
                    {!hasSufficientBalance && (
                      <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/35 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300 text-xs flex items-center justify-between gap-2">
                        <span>Insufficient balance for {formatNaira(totalCostNaira)}</span>
                        <Link
                          href="/dashboard"
                          className="font-semibold underline hover:no-underline shrink-0"
                        >
                          Fund Wallet
                        </Link>
                      </div>
                    )}

                    {/* Clean Total & Submit CTA */}
                    <div className="pt-1 space-y-3">
                      <div className="flex items-center justify-between text-xs px-0.5">
                        <span className="text-slate-500 dark:text-slate-400">
                          {quantity} × {formatNaira(currentPackage.baseCostNaira)}
                        </span>
                        <span className="font-bold text-sm text-slate-900 dark:text-white tabular-nums">
                          {formatNaira(totalCostNaira)}
                        </span>
                      </div>

                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full h-11 px-4 rounded-lg bg-[#126BEB] hover:bg-[#0B5CC7] active:bg-[#094bb5] text-white font-semibold text-sm transition-colors flex items-center justify-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Buy {currentPackage.examBody} PIN • {formatNaira(totalCostNaira)}
                      </button>
                    </div>
                  </form>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* CONFIRMATION MODAL */}
      <ModalDialog
        isOpen={Boolean(isConfirmModalOpen && currentPackage && !isSubmitting)}
        onClose={() => setIsConfirmModalOpen(false)}
        dismissible={!isSubmitting}
        ariaLabel="Confirm Exam PIN Purchase"
        maxWidthClass="max-w-sm"
        className="dark:bg-[#0B1528] text-slate-900 dark:text-white"
      >
        {currentPackage && (
          <div className="p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Confirm PIN Purchase
              </h2>
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                disabled={isSubmitting}
                aria-label="Close confirmation"
                className="relative text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 after:content-[''] after:absolute after:-inset-2 cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <dl className="space-y-3 py-1 text-xs">
              <div className="flex justify-between items-center gap-3">
                <dt className="text-slate-500 dark:text-slate-400 shrink-0">Package</dt>
                <dd className="font-semibold text-slate-900 dark:text-white flex items-center gap-2 min-w-0">
                  <span className="w-6 h-6 rounded-md bg-white border border-slate-200 dark:border-slate-700 flex items-center justify-center p-0.5 shrink-0">
                    <Image
                      src={getCouncilLogo(currentPackage.examBody)}
                      alt={currentPackage.examBody}
                      width={18}
                      height={18}
                      className="object-contain"
                    />
                  </span>
                  <span className="truncate">{currentPackage.name}</span>
                </dd>
              </div>

              <div className="flex justify-between items-center">
                <dt className="text-slate-500 dark:text-slate-400">
                  {currentPackage.identifierType === 'PROFILE_CODE' ? 'Profile Code' : 'Phone Number'}
                </dt>
                <dd className="font-mono font-semibold text-slate-900 dark:text-white">
                  {candidateId}
                </dd>
              </div>

              {candidateName && (
                <div className="flex justify-between items-center gap-3">
                  <dt className="text-slate-500 dark:text-slate-400 shrink-0">Candidate</dt>
                  <dd className="font-semibold text-slate-900 dark:text-white text-right truncate">
                    {candidateName}
                  </dd>
                </div>
              )}

              <div className="flex justify-between items-center">
                <dt className="text-slate-500 dark:text-slate-400">Quantity</dt>
                <dd className="font-semibold text-slate-900 dark:text-white tabular-nums">
                  {quantity} PIN{quantity > 1 ? 's' : ''}
                </dd>
              </div>

              <div className="flex justify-between items-center pt-2.5 border-t border-slate-100 dark:border-slate-800/80">
                <dt className="font-semibold text-slate-900 dark:text-white">Total Debit</dt>
                <dd className="font-bold text-[#126BEB] dark:text-[#38BDF8] text-base tabular-nums">
                  {formatNaira(totalCostNaira)}
                </dd>
              </div>
            </dl>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                autoFocus
                onClick={() => setIsConfirmModalOpen(false)}
                disabled={isSubmitting}
                className="flex-1 min-h-[44px] px-4 rounded-lg border border-slate-200 dark:border-slate-700/80 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleExecutePurchase}
                className="flex-1 min-h-[44px] px-4 rounded-lg bg-[#126BEB] hover:bg-[#0B5CC7] active:bg-[#094bb5] text-white text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                    <span>Processing</span>
                  </>
                ) : (
                  <span>Confirm</span>
                )}
              </button>
            </div>
          </div>
        )}
      </ModalDialog>

      {/* RECEIPT MODAL */}
      <ExamPinReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        receipt={receiptData}
        onVendAnother={() => {
          setIsReceiptModalOpen(false);
          setCandidateId('');
          setCandidateName('');
          setCandidateEmail('');
          setQuantity(1);
          setValidationResult(null);
          setValidationError(null);
          lastVerifiedKeyRef.current = '';
          lastAttemptedKeyRef.current = '';
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
