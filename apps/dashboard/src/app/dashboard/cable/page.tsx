'use client';

import React, { useCallback, useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Tv,
  ArrowLeft,
  Wallet,
  Search,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  Check,
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
import { useWalletBalance } from '@/lib/use-wallet-balance';
import {
  useSavedBeneficiaries,
  type CableOperatorCode,
  type SavedCableBeneficiary,
} from '@/lib/use-saved-beneficiaries';
import {
  SavedCableQuickStrip,
  SavedCableLabelRow,
} from '@/components/dashboard/SavedCableSmartcards';
import { showToast } from '@/lib/toast';

export type { CableOperatorCode };

export interface CableOperatorOption {
  code: CableOperatorCode;
  name: string;
  shortName: string;
  logo: string;
  customerField: string;
  minDigits: number;
  maxDigits: number;
  description: string;
  enabled?: boolean;
  discountBps?: number;
}

export interface CableBouquetOption {
  id: string;
  operator: CableOperatorCode;
  operatorName: string;
  name: string;
  code: string;
  validity: string;
  priceNaira: number;
  enabled?: boolean;
  discountBps?: number;
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
    description: 'Satellite television packages and renewals',
    enabled: true,
  },
  {
    code: 'GOTV',
    name: 'GOtv (MultiChoice)',
    shortName: 'GOtv',
    logo: '/logos/cable/gotv.svg',
    customerField: 'IUC / Decoder Number',
    minDigits: 10,
    maxDigits: 11,
    description: 'Digital terrestrial television subscriptions',
    enabled: true,
  },
  {
    code: 'STARTIMES',
    name: 'StarTimes Nigeria',
    shortName: 'StarTimes',
    logo: '/logos/cable/startimes.svg',
    customerField: 'Smartcard / e-Wallet Number',
    minDigits: 11,
    maxDigits: 11,
    description: 'Digital terrestrial and satellite TV bouquets',
    enabled: true,
  },
];

export default function CableVendingPage() {
  // Session & User State
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isKycModalOpen, setIsKycModalOpen] = useState(false);

  // Settlement Balance
  const { walletBalance, isLoadingBalance, hasLoadedBalance, refreshWallets: loadWallets } = useWalletBalance();
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Operator Catalog & View State (populated from backend so stale discounts/states never flash)
  const [operatorsList, setOperatorsList] = useState<CableOperatorOption[]>([]);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [isRetryingCatalog, setIsRetryingCatalog] = useState(false);
  const operatorsListRef = useRef<CableOperatorOption[]>([]);
  const [selectedOperatorCode, setSelectedOperatorCode] = useState<CableOperatorCode | null>(null);
  const [filterType, setFilterType] = useState<'ALL' | 'DSTV' | 'GOTV' | 'STARTIMES'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Form Inputs
  const [smartcard, setSmartcard] = useState('');
  const [selectedBouquetId, setSelectedBouquetId] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [isBouquetDropdownOpen, setIsBouquetDropdownOpen] = useState(false);
  const [bouquetSearchQuery, setBouquetSearchQuery] = useState('');

  // Decoder Verification State
  const [isValidating, setIsValidating] = useState(false);
  const [verifiedDecoder, setVerifiedDecoder] = useState<VerifiedDecoder | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const autoVerifyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastVerifiedKeyRef = useRef<string>('');
  const lastAttemptedKeyRef = useRef<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);
  const smartcardInputRef = useRef<HTMLInputElement | null>(null);
  const bouquetDropdownRef = useRef<HTMLDivElement | null>(null);
  const bouquetSearchInputRef = useRef<HTMLInputElement | null>(null);

  // Saved Cable Beneficiaries State
  const {
    beneficiaries: savedSmartcards,
    hasLoadedBeneficiaries,
    fetchBeneficiaries: refreshSavedSmartcards,
    saveBeneficiary: saveCableBeneficiary,
    deleteBeneficiary: deleteCableBeneficiary,
  } = useSavedBeneficiaries('CABLE_TV');
  const [saveBeneficiaryChecked, setSaveBeneficiaryChecked] = useState(false);

  // Dynamic Bouquets List
  const [bouquetsList, setBouquetsList] = useState<CableBouquetOption[]>([]);

  // Checkout & Submission State
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Receipt Modal State
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<CableReceiptData | null>(null);

  const bouquetListboxId = 'cable-bouquet-listbox';

  const selectedOperator = useMemo(() => {
    if (!selectedOperatorCode) return null;
    return operatorsList.find((op) => op.code === selectedOperatorCode) || null;
  }, [operatorsList, selectedOperatorCode]);

  // Close custom bouquet dropdown when clicking outside or pressing Escape
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        bouquetDropdownRef.current &&
        !bouquetDropdownRef.current.contains(event.target as Node)
      ) {
        setIsBouquetDropdownOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsBouquetDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (isBouquetDropdownOpen) {
      setBouquetSearchQuery('');
      requestAnimationFrame(() => {
        bouquetSearchInputRef.current?.focus();
      });
    }
  }, [isBouquetDropdownOpen]);

  // Load Cable Operators & Bouquets from Backend
  const loadCatalogData = useCallback(async (requestedProvider?: string | null) => {
    const authToken = getStoredAuthToken();
    const headers: Record<string, string> = authToken ? { Authorization: `Bearer ${authToken}` } : {};

    try {
      setCatalogError(null);
      const [opsRes, bouquetsRes] = await Promise.all([
        fetch('/api/services/cable/operators', { headers, cache: 'no-store' }),
        fetch('/api/services/cable/bouquets', { headers, cache: 'no-store' }),
      ]);

      const [opsData, bouquetsData] = await Promise.all([
        opsRes.json().catch(() => null),
        bouquetsRes.json().catch(() => null),
      ]);

      if (!opsRes.ok || !opsData?.success || !Array.isArray(opsData.data)) {
        setCatalogError(opsData?.error?.message || 'Unable to load Cable TV providers right now.');
        return;
      }

      const mergedOperators = CABLE_OPERATORS.map((baseOp) => {
        const matched = opsData.data.find((d: any) => d.code === baseOp.code);
        if (!matched) return baseOp;
        const discountBps =
          typeof matched.discountBps === 'number'
            ? matched.discountBps
            : typeof matched.defaultDiscountBps === 'number'
              ? matched.defaultDiscountBps
              : baseOp.discountBps;
        return {
          ...baseOp,
          name: matched.name || baseOp.name,
          shortName: matched.shortName || baseOp.shortName,
          customerField: matched.customerField || baseOp.customerField,
          enabled: matched.enabled !== false,
          discountBps,
        };
      });
      operatorsListRef.current = mergedOperators;
      setOperatorsList(mergedOperators);

      if (bouquetsRes.ok && bouquetsData?.success && Array.isArray(bouquetsData.data)) {
        setBouquetsList(bouquetsData.data);
      } else {
        setCatalogError(bouquetsData?.error?.message || 'Unable to load Cable TV bouquets right now.');
        return;
      }

      const activeProviderParam =
        requestedProvider?.toUpperCase() ||
        (typeof window !== 'undefined'
          ? (new URLSearchParams(window.location.search).get('provider') || '').toUpperCase()
          : '');

      if (activeProviderParam) {
        const matchedSelected = mergedOperators.find((op) => op.code === activeProviderParam);
        if (matchedSelected) {
          if (matchedSelected.enabled === false) {
            setSelectedOperatorCode(null);
            if (typeof window !== 'undefined') {
              const url = new URL(window.location.href);
              url.searchParams.delete('provider');
              window.history.replaceState({}, '', url.toString());
            }
            showToast({
              type: 'error',
              message: `${matchedSelected.shortName} Cable TV is currently unavailable.`,
            });
          } else {
            setSelectedOperatorCode(matchedSelected.code);
          }
        }
      }
    } catch {
      setCatalogError('Unable to load Cable TV providers right now.');
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

    let initialProvider: string | null = null;
    try {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const rawParam = params.get('provider')?.toUpperCase();
        if (rawParam && CABLE_OPERATORS.some((op) => op.code === rawParam)) {
          initialProvider = rawParam;
        }
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
          loadCatalogData(initialProvider),
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
      void refreshSavedSmartcards();
    };

    const handlePopState = () => {
      const nextParam = new URLSearchParams(window.location.search).get('provider')?.toUpperCase();
      const candidate = operatorsListRef.current.find((op) => op.code === nextParam);
      if (candidate && candidate.enabled !== false) {
        setSelectedOperatorCode(candidate.code);
      } else {
        setSelectedOperatorCode(null);
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
  }, [loadCatalogData, refreshSavedSmartcards]);

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

  // Filtered Operators for Catalog
  const filteredOperators = useMemo(() => {
    return operatorsList.filter((op) => {
      const matchesFilter = filterType === 'ALL' || op.code === filterType;
      const matchesSearch =
        searchQuery.trim() === '' ||
        op.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        op.shortName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        op.customerField.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [operatorsList, filterType, searchQuery]);

  // Bouquets for selected operator
  const operatorBouquets = useMemo(() => {
    if (!selectedOperator) return [];
    return bouquetsList.filter((b) => b.operator === selectedOperator.code);
  }, [bouquetsList, selectedOperator]);

  const filteredBouquets = useMemo(() => {
    const q = bouquetSearchQuery.trim().toLowerCase();
    if (!q) return operatorBouquets;
    return operatorBouquets.filter((b) =>
      `${b.name} ${b.validity} ${b.priceNaira}`.toLowerCase().includes(q),
    );
  }, [operatorBouquets, bouquetSearchQuery]);

  // Default select first bouquet when operator changes
  useEffect(() => {
    if (operatorBouquets.length > 0) {
      setSelectedBouquetId((prev) =>
        operatorBouquets.some((b) => b.id === prev) ? prev : operatorBouquets[0].id,
      );
    } else {
      setSelectedBouquetId('');
    }
  }, [operatorBouquets]);

  const currentBouquet = useMemo(() => {
    return operatorBouquets.find((b) => b.id === selectedBouquetId) || operatorBouquets[0];
  }, [operatorBouquets, selectedBouquetId]);

  // Face amount, discount & net debit calculations
  const faceAmountNaira = currentBouquet?.priceNaira || 0;
  const activeDiscountBps = currentBouquet?.discountBps ?? selectedOperator?.discountBps ?? 0;
  const discountAmountNaira =
    activeDiscountBps > 0 ? Math.floor((faceAmountNaira * activeDiscountBps) / 10000) : 0;
  const amountToDebitNaira = Math.max(0, faceAmountNaira - discountAmountNaira);
  const hasSufficientBalance = walletBalance >= amountToDebitNaira;

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

  // Real-time Decoder Validation
  const executeDecoderValidation = async (
    rawNum: string,
    targetOperator: CableOperatorOption,
  ) => {
    if (targetOperator.enabled === false) {
      showToast({
        type: 'error',
        message: `${targetOperator.shortName} Cable TV is currently unavailable.`,
      });
      return;
    }

    const cleanNum = rawNum.replace(/[\s\-()]/g, '');
    if (cleanNum.length < targetOperator.minDigits) {
      const msg = `${targetOperator.shortName} requires at least ${targetOperator.minDigits} digits.`;
      setValidationError(msg);
      return;
    }

    const verificationKey = `${targetOperator.code}:${cleanNum}`;
    if (verificationKey === lastVerifiedKeyRef.current && verifiedDecoder) {
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
    setVerifiedDecoder(null);

    try {
      const authToken = getStoredAuthToken();
      const res = await fetch('/api/services/cable/validate', {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          operator: targetOperator.code,
          smartcard: cleanNum,
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
        setVerifiedDecoder({
          smartcard: cleanNum,
          customerName: data.data.customerName || undefined,
          accountStatus: data.data.accountStatus || 'ACTIVE',
          outstandingBalanceNaira: data.data.outstandingBalanceNaira,
        });
        lastVerifiedKeyRef.current = verificationKey;
      } else {
        const errorMsg =
          data?.error?.message ||
          data?.data?.responseMessage ||
          'Decoder validation failed. Check the smartcard number.';
        setValidationError(errorMsg);
        showToast({ type: 'error', title: 'Decoder verification failed', message: errorMsg });
        lastVerifiedKeyRef.current = '';
      }
    } catch (err: any) {
      if (err?.name === 'AbortError' || controller.signal.aborted) {
        return;
      }
      const errMsg = 'Network error while validating decoder. Please try again.';
      setValidationError(errMsg);
      showToast({ type: 'error', title: 'Decoder verification failed', message: errMsg });
      lastVerifiedKeyRef.current = '';
    } finally {
      if (!controller.signal.aborted) {
        setIsValidating(false);
      }
    }
  };

  const handleValidateDecoder = (numToValidate?: string) => {
    if (!selectedOperator) return;
    const raw = numToValidate !== undefined ? numToValidate : smartcard;
    void executeDecoderValidation(raw, selectedOperator);
  };

  const handleCancelVerification = () => {
    clearPendingVerification();
    lastAttemptedKeyRef.current = '';
    smartcardInputRef.current?.focus();
  };

  // Auto-trigger validation when required digits reached
  const handleSmartcardChange = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, selectedOperator?.maxDigits || 11);
    setSmartcard(clean);
    setVerifiedDecoder(null);
    setValidationError(null);
    lastVerifiedKeyRef.current = '';
    lastAttemptedKeyRef.current = '';

    if (autoVerifyTimeoutRef.current) {
      clearTimeout(autoVerifyTimeoutRef.current);
      autoVerifyTimeoutRef.current = null;
    }

    if (!selectedOperator) return;

    if (clean.length >= selectedOperator.minDigits && clean.length <= selectedOperator.maxDigits) {
      autoVerifyTimeoutRef.current = setTimeout(() => {
        void executeDecoderValidation(clean, selectedOperator);
      }, 450);
    }
  };

  const handleSmartcardBlur = () => {
    if (!selectedOperator || isValidating) return;
    const clean = smartcard.replace(/\D/g, '');
    if (clean.length < selectedOperator.minDigits) return;
    const key = `${selectedOperator.code}:${clean}`;
    if (key === lastVerifiedKeyRef.current || key === lastAttemptedKeyRef.current) {
      return;
    }
    if (autoVerifyTimeoutRef.current) {
      clearTimeout(autoVerifyTimeoutRef.current);
      autoVerifyTimeoutRef.current = null;
    }
    void executeDecoderValidation(clean, selectedOperator);
  };

  const handleSelectOperator = (op: CableOperatorOption) => {
    if (op.enabled === false) {
      showToast({
        type: 'error',
        message: `${op.shortName} Cable TV is currently unavailable.`,
      });
      return;
    }

    clearPendingVerification();
    setSelectedOperatorCode(op.code);
    setSmartcard('');
    setCustomerMobile('');
    setVerifiedDecoder(null);
    setValidationError(null);
    setIsBouquetDropdownOpen(false);
    setSaveBeneficiaryChecked(false);
    lastVerifiedKeyRef.current = '';
    lastAttemptedKeyRef.current = '';

    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('provider', op.code);
      window.history.pushState({}, '', url.toString());
    }
  };

  const handleSelectSavedSmartcard = (ben: SavedCableBeneficiary) => {
    const targetOp = operatorsList.find((op) => op.code === ben.operator);
    if (!targetOp || targetOp.enabled === false) {
      showToast({
        type: 'error',
        message: `${ben.operator} Cable TV is currently unavailable.`,
      });
      return;
    }

    clearPendingVerification();
    const cleanNum = ben.smartcardNumber.replace(/\D/g, '').slice(0, targetOp.maxDigits);
    setSelectedOperatorCode(targetOp.code);
    setSmartcard(cleanNum);
    setVerifiedDecoder(null);
    setValidationError(null);
    setIsBouquetDropdownOpen(false);
    setSaveBeneficiaryChecked(false);
    lastVerifiedKeyRef.current = '';
    lastAttemptedKeyRef.current = '';

    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('provider', targetOp.code);
      window.history.pushState({}, '', url.toString());
    }

    if (cleanNum.length >= targetOp.minDigits) {
      void executeDecoderValidation(cleanNum, targetOp);
    }
  };

  const handleBackToCatalog = () => {
    clearPendingVerification();
    setSelectedOperatorCode(null);
    setSmartcard('');
    setCustomerMobile('');
    setVerifiedDecoder(null);
    setValidationError(null);
    setIsBouquetDropdownOpen(false);
    setSaveBeneficiaryChecked(false);
    lastVerifiedKeyRef.current = '';
    lastAttemptedKeyRef.current = '';

    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('provider');
      window.history.pushState({}, '', url.toString());
    }
  };

  // Open Confirmation Modal
  const handleOpenConfirm = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedOperator || !currentBouquet) return;

    if (selectedOperator.enabled === false || currentBouquet.enabled === false) {
      showToast({
        type: 'error',
        message: `${selectedOperator.shortName} Cable TV is currently unavailable.`,
      });
      return;
    }

    const clean = smartcard.replace(/[\s\-()]/g, '');
    if (clean.length < selectedOperator.minDigits) {
      const msg = `Please enter a valid ${selectedOperator.shortName} ${selectedOperator.customerField}.`;
      setValidationError(msg);
      showToast({ type: 'error', message: msg });
      smartcardInputRef.current?.focus();
      return;
    }

    if (!hasSufficientBalance) {
      showToast({
        type: 'error',
        message: `Insufficient wallet balance. Total cost is ₦${amountToDebitNaira.toLocaleString()}, while balance is ₦${walletBalance.toLocaleString()}.`,
      });
      return;
    }

    setIsConfirmModalOpen(true);
  };

  // Execute Purchase
  const handleExecutePurchase = async () => {
    if (!selectedOperator || !currentBouquet) return;

    setIsSubmitting(true);

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
      if (handleAuthResponse(res, data)) {
        return;
      }

      if (res.ok && data?.success) {
        setIsConfirmModalOpen(false);
        const receipt = data.data;

        if (saveBeneficiaryChecked) {
          void saveCableBeneficiary({
            serviceType: 'CABLE_TV',
            smartcardNumber: clean,
            operator: selectedOperator.code,
            ...(verifiedDecoder?.customerName ? { label: verifiedDecoder.customerName } : {}),
          });
        }

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
          discountNaira: receipt.discountNaira || discountAmountNaira,
          amountDebitedNaira: receipt.amountDebitedNaira || amountToDebitNaira,
          date: receipt.createdAt
            ? new Date(receipt.createdAt).toISOString()
            : new Date().toISOString(),
        });

        setIsReceiptModalOpen(true);
        loadWallets();

        setSmartcard('');
        setCustomerMobile('');
        setVerifiedDecoder(null);
        setSaveBeneficiaryChecked(false);
        lastVerifiedKeyRef.current = '';
        lastAttemptedKeyRef.current = '';
      } else {
        const msg = data?.error?.message || 'Subscription failed. Please verify smartcard.';
        setIsConfirmModalOpen(false);
        showToast({ type: 'error', title: 'Cable subscription failed', message: msg });
      }
    } catch {
      setIsConfirmModalOpen(false);
      showToast({
        type: 'error',
        title: 'Cable subscription failed',
        message: 'Network failure occurred. Check transaction history to confirm status.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatNaira = (val: number) =>
    `₦${val.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const handleRetryCatalog = async () => {
    setIsRetryingCatalog(true);
    try {
      await loadCatalogData();
    } finally {
      setIsRetryingCatalog(false);
    }
  };

  if (isInitialLoading || !hasLoadedBeneficiaries || !hasLoadedBalance) {
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
            <AccessRestricted description="Cable TV subscriptions and decoder renewals are restricted to Workspace Owners, Administrators, Developers, and Operations staff." />
          ) : (
            <>
              <KycBanner
                kycStatus={kycStatus}
                userRole={userRole}
                onOpenKycModal={() => setIsKycModalOpen(true)}
              />

          {/* ======================================================== */}
          {/* VIEW 1: OPERATOR CATALOG (Displayed when no provider selected) */}
          {/* ======================================================== */}
          {!selectedOperator ? (
            <div className="space-y-6">
              {/* Navigation Row */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                  <span>Back to Dashboard</span>
                </Link>

                <Link
                  href="/dashboard/ledger?service=CABLE_TV"
                  className="inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
                >
                  <FileText className="w-3.5 h-3.5 text-[#126BEB] dark:text-[#38BDF8]" aria-hidden="true" />
                  <span>Cable History</span>
                </Link>
              </div>

              {/* Page Heading & Compact Wallet Balance */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200/80 dark:border-slate-800/80">
                <div className="flex items-center gap-3.5 min-w-0">
                  <Image
                    src="/logos/categories/cable.svg"
                    alt=""
                    width={40}
                    height={40}
                    className="w-10 h-10 shrink-0 rounded-xl"
                  />
                  <div className="min-w-0">
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight text-balance">
                      Cable TV
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 text-pretty">
                      DStv, GOtv, and StarTimes decoder subscriptions.
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

              {/* Saved Smartcards Quick-Pick Strip */}
              <SavedCableQuickStrip
                beneficiaries={savedSmartcards}
                onSelectBeneficiary={handleSelectSavedSmartcard}
              />

              {/* Filters & Search Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-[#0B1528] rounded-lg border border-slate-200 dark:border-slate-800 overflow-x-auto">
                  {(['ALL', 'DSTV', 'GOTV', 'STARTIMES'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setFilterType(t)}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
                        filterType === t
                          ? 'bg-white dark:bg-[#126BEB] text-slate-900 dark:text-white shadow-xs'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {t === 'ALL' && 'All Providers'}
                      {t === 'DSTV' && 'DStv'}
                      {t === 'GOTV' && 'GOtv'}
                      {t === 'STARTIMES' && 'StarTimes'}
                    </button>
                  ))}
                </div>

                <search className="relative flex-1 sm:max-w-xs">
                  <label htmlFor="cable-operator-search" className="sr-only">
                    Search Cable TV provider
                  </label>
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" aria-hidden="true" />
                  <input
                    id="cable-operator-search"
                    type="search"
                    placeholder="Search provider..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-10 pl-9 pr-3 text-xs sm:text-sm rounded-lg bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#126BEB]"
                  />
                </search>
              </div>

              {/* OPERATORS GRID */}
              {catalogError && operatorsList.length === 0 ? (
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
                    {filteredOperators.map((op) => {
                      const isUnavailable = op.enabled === false;
                      return (
                        <button
                          key={op.code}
                          type="button"
                          aria-disabled={isUnavailable || undefined}
                          onClick={() => handleSelectOperator(op)}
                          className={`group relative p-4 rounded-xl border text-left transition-colors duration-150 flex flex-col justify-between focus:outline-none focus-visible:ring-2 focus-visible:ring-[#126BEB] ${
                            isUnavailable
                              ? 'opacity-55 grayscale cursor-not-allowed border-slate-200 dark:border-slate-800/60 bg-slate-50 dark:bg-[#091222]'
                              : 'border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0B1528] hover:border-[#126BEB] dark:hover:border-[#126BEB] cursor-pointer'
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-3">
                              <div className="w-11 h-11 rounded-lg overflow-hidden bg-white border border-slate-200 dark:border-slate-700 flex items-center justify-center p-1.5 shrink-0">
                                <Image
                                  src={op.logo}
                                  alt={op.shortName}
                                  width={36}
                                  height={36}
                                  className="object-contain"
                                />
                              </div>

                              <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold text-slate-600 dark:text-slate-300 shrink-0">
                                {op.shortName}
                              </span>
                            </div>

                            <h2 className={`font-bold text-sm text-slate-900 dark:text-white ${isUnavailable ? '' : 'group-hover:text-[#126BEB] transition-colors'}`}>
                              {op.name}
                            </h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                              {op.description}
                            </p>
                          </div>

                          <div className="pt-3 mt-4 border-t border-slate-100 dark:border-slate-800/70 flex items-center justify-between text-xs">
                            {isUnavailable ? (
                              <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-[10px] font-semibold text-slate-600 dark:text-slate-400">
                                Unavailable
                              </span>
                            ) : op.discountBps && op.discountBps > 0 ? (
                              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                {(op.discountBps / 100).toFixed(1)}% off
                              </span>
                            ) : (
                              <span className="text-slate-400 dark:text-slate-500">{op.customerField}</span>
                            )}

                            {!isUnavailable && (
                              <span className="font-semibold text-[#126BEB] dark:text-[#38BDF8]">
                                Subscribe
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {filteredOperators.length === 0 && (
                    <div className="py-12 text-center text-slate-400 text-xs bg-white dark:bg-[#0B1528] rounded-xl border border-slate-200 dark:border-slate-800">
                      No provider matches &quot;{searchQuery}&quot;.
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            /* ======================================================== */
            /* VIEW 2: DEDICATED OPERATOR CHECKOUT                      */
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
                  <span>Back to Providers</span>
                </button>

                <Link
                  href="/dashboard/ledger?service=CABLE_TV"
                  className="inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
                >
                  <FileText className="w-3.5 h-3.5 text-[#126BEB] dark:text-[#38BDF8]" aria-hidden="true" />
                  <span>Cable History</span>
                </Link>
              </div>

              {/* Operator Heading & Compact Wallet Balance */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200/80 dark:border-slate-800/80">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-white border border-slate-200 dark:border-slate-700 flex items-center justify-center p-1.5 shrink-0">
                    <Image
                      src={selectedOperator.logo}
                      alt={selectedOperator.shortName}
                      width={36}
                      height={36}
                      className="object-contain"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight text-balance">
                        {selectedOperator.name}
                      </h1>
                      {activeDiscountBps > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                          {(activeDiscountBps / 100).toFixed(1)}% off
                        </span>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                      {selectedOperator.description}
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

              {/* Centered Subscription Form */}
              <form
                onSubmit={handleOpenConfirm}
                noValidate
                aria-label="Cable TV subscription form"
                className="max-w-xl mx-auto w-full bg-white dark:bg-[#0B1528] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-5"
              >
                {/* 1. SMARTCARD / IUC NUMBER WITH LIVE VERIFICATION */}
                <div className="space-y-1.5">
                  <SavedCableLabelRow
                    label={
                      <label
                        htmlFor="cable-smartcard-input"
                        className="text-xs font-semibold text-slate-700 dark:text-slate-300"
                      >
                        {selectedOperator.customerField}{' '}
                        <span aria-hidden="true" className="text-red-500">*</span>
                      </label>
                    }
                    beneficiaries={savedSmartcards}
                    currentSmartcard={smartcard}
                    currentOperator={selectedOperator.code}
                    onSelectBeneficiary={handleSelectSavedSmartcard}
                    onDeleteBeneficiary={deleteCableBeneficiary}
                  />

                  <div className="relative">
                    <input
                      ref={smartcardInputRef}
                      id="cable-smartcard-input"
                      name="smartcard"
                      type="text"
                      inputMode="numeric"
                      autoCorrect="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      enterKeyHint="next"
                      maxLength={selectedOperator.maxDigits}
                      placeholder={`Enter ${selectedOperator.shortName} ${selectedOperator.customerField.toLowerCase()}`}
                      value={smartcard}
                      onChange={(e) => handleSmartcardChange(e.target.value)}
                      onBlur={handleSmartcardBlur}
                      readOnly={isValidating}
                      aria-busy={isValidating}
                      aria-invalid={Boolean(validationError && !isValidating && !verifiedDecoder)}
                      className={`w-full h-11 pl-3.5 ${
                        isValidating ? 'pr-36' : verifiedDecoder ? 'pr-28' : 'pr-24'
                      } rounded-lg border text-slate-900 dark:text-white text-sm sm:text-base font-mono font-semibold placeholder:text-slate-400 placeholder:font-sans placeholder:font-normal focus:outline-none focus:ring-2 transition-colors ${
                        isValidating
                          ? 'bg-slate-50 dark:bg-[#0D1726] border-[#126BEB] focus:ring-[#126BEB]/20'
                          : verifiedDecoder
                          ? 'bg-white dark:bg-[#070D18] border-emerald-500/70 focus:border-emerald-500 focus:ring-emerald-500/20'
                          : validationError
                          ? 'bg-white dark:bg-[#070D18] border-red-500 focus:border-red-500 focus:ring-red-500/20'
                          : 'bg-white dark:bg-[#070D18] border-slate-200 dark:border-slate-700 focus:border-[#126BEB] focus:ring-[#126BEB]/20'
                      }`}
                      required
                    />

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
                            aria-label="Cancel verification and edit smartcard number"
                            title="Edit number"
                            className="h-8 w-8 rounded-md text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center justify-center transition-colors cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>
                        </>
                      ) : verifiedDecoder ? (
                        <span className="h-8 px-2.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Verified</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleValidateDecoder()}
                          disabled={smartcard.replace(/\D/g, '').length < selectedOperator.minDigits}
                          className="h-8 px-3 rounded-md bg-[#126BEB] hover:bg-[#0B5CC7] text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          Verify
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Verification Error */}
                  {validationError && !isValidating && (
                    <div className="flex items-start justify-between gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                        <span>{validationError}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleValidateDecoder()}
                        className="font-semibold underline hover:no-underline shrink-0 cursor-pointer"
                      >
                        Retry
                      </button>
                    </div>
                  )}

                  {/* Verified Subscriber Card */}
                  {verifiedDecoder && (
                    <div className="p-3 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-500/30 text-xs space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold min-w-0">
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                          <span className="truncate">
                            {verifiedDecoder.customerName || 'Verified Subscriber'}
                          </span>
                        </div>
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 uppercase shrink-0">
                          {verifiedDecoder.accountStatus || 'ACTIVE'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. CUSTOM SEARCHABLE BOUQUET DROPDOWN */}
                <div className="space-y-1.5" ref={bouquetDropdownRef}>
                  <label
                    id="cable-bouquet-label"
                    htmlFor="cable-bouquet-trigger"
                    className="text-xs font-semibold text-slate-700 dark:text-slate-300 block"
                  >
                    Bouquet Package <span aria-hidden="true" className="text-red-500">*</span>
                  </label>

                  <div className="relative">
                    <button
                      id="cable-bouquet-trigger"
                      type="button"
                      aria-haspopup="listbox"
                      aria-expanded={isBouquetDropdownOpen}
                      aria-controls={bouquetListboxId}
                      aria-labelledby="cable-bouquet-label cable-bouquet-trigger"
                      onClick={() => setIsBouquetDropdownOpen((prev) => !prev)}
                      className="w-full h-11 px-3.5 bg-white dark:bg-[#070D18] border border-slate-200 dark:border-slate-700 rounded-lg text-left flex items-center justify-between gap-2 focus:outline-none focus:ring-2 focus:ring-[#126BEB]/25 focus:border-[#126BEB] transition-colors cursor-pointer"
                    >
                      {currentBouquet ? (
                        <div className="flex items-center justify-between w-full min-w-0 gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                              {currentBouquet.name}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium shrink-0">
                              {currentBouquet.validity}
                            </span>
                          </div>
                          <span className="font-bold text-sm text-[#126BEB] dark:text-[#38BDF8] tabular-nums shrink-0">
                            {formatNaira(currentBouquet.priceNaira)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400">Select bouquet package</span>
                      )}
                      <ChevronDown
                        className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${
                          isBouquetDropdownOpen ? 'rotate-180' : ''
                        }`}
                        aria-hidden="true"
                      />
                    </button>

                    {isBouquetDropdownOpen && (
                      <div className="absolute z-30 left-0 right-0 top-full mt-1.5 bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden">
                        <div className="p-2 border-b border-slate-100 dark:border-slate-800">
                          <div className="relative">
                            <Search
                              className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                              aria-hidden="true"
                            />
                            <input
                              ref={bouquetSearchInputRef}
                              type="search"
                              value={bouquetSearchQuery}
                              onChange={(e) => setBouquetSearchQuery(e.target.value)}
                              placeholder="Search bouquets..."
                              aria-label="Search bouquets"
                              className="w-full h-9 pl-8 pr-2.5 rounded-lg bg-slate-50 dark:bg-[#070D18] border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#126BEB]"
                            />
                          </div>
                        </div>

                        <div
                          id={bouquetListboxId}
                          role="listbox"
                          aria-labelledby="cable-bouquet-label"
                          className="max-h-64 overflow-y-auto overscroll-contain py-1"
                        >
                          {filteredBouquets.length === 0 ? (
                            <div className="px-3.5 py-4 text-xs text-slate-400 text-center">
                              No bouquets found.
                            </div>
                          ) : (
                            filteredBouquets.map((b) => {
                              const isSelected = b.id === currentBouquet?.id;
                              return (
                                <button
                                  key={b.id}
                                  type="button"
                                  role="option"
                                  aria-selected={isSelected}
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
                                      {isSelected && <Check className="w-3.5 h-3.5 text-[#126BEB]" aria-hidden="true" />}
                                    </div>
                                    <div className="truncate">
                                      <span className="font-semibold text-slate-900 dark:text-white">
                                        {b.name}
                                      </span>
                                      <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium">
                                        {b.validity}
                                      </span>
                                    </div>
                                  </div>
                                  <span className="font-bold text-slate-900 dark:text-white tabular-nums shrink-0">
                                    {formatNaira(b.priceNaira)}
                                  </span>
                                </button>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 3. CUSTOMER PHONE NUMBER (OPTIONAL) */}
                <div className="space-y-1.5">
                  <label
                    htmlFor="cable-customer-mobile"
                    className="text-xs font-semibold text-slate-700 dark:text-slate-300 block"
                  >
                    Customer Phone Number{' '}
                    <span className="text-slate-400 font-normal">(Optional)</span>
                  </label>
                  <input
                    id="cable-customer-mobile"
                    name="customerMobile"
                    type="tel"
                    inputMode="numeric"
                    placeholder="08012345678"
                    value={customerMobile}
                    onChange={(e) => setCustomerMobile(e.target.value)}
                    className="w-full h-11 px-3.5 bg-white dark:bg-[#070D18] border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#126BEB]/25 focus:border-[#126BEB] transition-colors"
                  />
                </div>

                {/* Save Beneficiary Checkbox */}
                <label
                  htmlFor="cable-save-beneficiary"
                  className="inline-flex items-center gap-2 cursor-pointer select-none pt-0.5"
                >
                  <input
                    id="cable-save-beneficiary"
                    type="checkbox"
                    checked={saveBeneficiaryChecked}
                    onChange={(e) => setSaveBeneficiaryChecked(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-[#126BEB] focus:ring-[#126BEB]/30 bg-white dark:bg-[#070D18]"
                  />
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                    Save beneficiary
                  </span>
                </label>

                {/* Balance Warning */}
                {!hasSufficientBalance && currentBouquet && (
                  <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/35 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-300 text-xs flex items-center justify-between gap-2">
                    <span>Insufficient balance for {formatNaira(amountToDebitNaira)}</span>
                    <Link
                      href="/dashboard"
                      className="font-semibold underline hover:no-underline shrink-0"
                    >
                      Fund Wallet
                    </Link>
                  </div>
                )}

                {/* Total & Submit CTA */}
                <div className="pt-1 space-y-3">
                  <div className="flex items-center justify-between text-xs px-0.5">
                    <span className="text-slate-500 dark:text-slate-400">Total Debit</span>
                    <span className="font-bold text-sm text-slate-900 dark:text-white tabular-nums">
                      {formatNaira(amountToDebitNaira)}
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || !currentBouquet}
                    className="w-full h-11 px-4 rounded-lg bg-[#126BEB] hover:bg-[#0B5CC7] active:bg-[#094bb5] text-white font-semibold text-sm transition-colors flex items-center justify-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {currentBouquet
                      ? `Subscribe • ${formatNaira(amountToDebitNaira)}`
                      : 'Subscribe'}
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
        isOpen={Boolean(isConfirmModalOpen && selectedOperator && currentBouquet && !isSubmitting)}
        onClose={() => setIsConfirmModalOpen(false)}
        dismissible={!isSubmitting}
        ariaLabel="Confirm Cable TV Subscription"
        maxWidthClass="max-w-sm"
        className="dark:bg-[#0B1528] text-slate-900 dark:text-white"
      >
        {selectedOperator && currentBouquet && (
          <div className="p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Confirm Subscription
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
              <div className="flex justify-between items-center">
                <dt className="text-slate-500 dark:text-slate-400">Provider</dt>
                <dd className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-white border border-slate-200 dark:border-slate-700 flex items-center justify-center p-0.5 shrink-0">
                    <Image
                      src={selectedOperator.logo}
                      alt={selectedOperator.shortName}
                      width={18}
                      height={18}
                      className="object-contain"
                    />
                  </span>
                  <span>{selectedOperator.shortName}</span>
                </dd>
              </div>

              <div className="flex justify-between items-center">
                <dt className="text-slate-500 dark:text-slate-400">{selectedOperator.customerField}</dt>
                <dd className="font-mono font-semibold text-slate-900 dark:text-white">
                  {smartcard}
                </dd>
              </div>

              {verifiedDecoder?.customerName && (
                <div className="flex justify-between items-center gap-3">
                  <dt className="text-slate-500 dark:text-slate-400 shrink-0">Subscriber</dt>
                  <dd className="font-semibold text-slate-900 dark:text-white uppercase text-right truncate">
                    {verifiedDecoder.customerName}
                  </dd>
                </div>
              )}

              <div className="flex justify-between items-center gap-3">
                <dt className="text-slate-500 dark:text-slate-400 shrink-0">Bouquet</dt>
                <dd className="font-semibold text-slate-900 dark:text-white text-right truncate">
                  {currentBouquet.name}
                </dd>
              </div>

              <div className="flex justify-between items-center">
                <dt className="text-slate-500 dark:text-slate-400">Bouquet Price</dt>
                <dd className="font-semibold text-slate-900 dark:text-white tabular-nums">
                  {formatNaira(faceAmountNaira)}
                </dd>
              </div>

              {discountAmountNaira > 0 && (
                <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400">
                  <dt>Discount ({(activeDiscountBps / 100).toFixed(1)}%)</dt>
                  <dd className="font-semibold tabular-nums">
                    -{formatNaira(discountAmountNaira)}
                  </dd>
                </div>
              )}

              <div className="flex justify-between items-center pt-2.5 border-t border-slate-100 dark:border-slate-800/80">
                <dt className="font-semibold text-slate-900 dark:text-white">Total Debit</dt>
                <dd className="font-bold text-[#126BEB] dark:text-[#38BDF8] text-base tabular-nums">
                  {formatNaira(amountToDebitNaira)}
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
      <CableReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        receipt={receiptData}
        onSubscribeAnother={() => {
          setIsReceiptModalOpen(false);
          setSmartcard('');
          setCustomerMobile('');
          setVerifiedDecoder(null);
          setSaveBeneficiaryChecked(false);
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
