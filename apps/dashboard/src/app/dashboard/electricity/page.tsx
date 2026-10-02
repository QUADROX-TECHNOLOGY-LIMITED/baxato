'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Zap,
  ArrowLeft,
  Wallet,
  RefreshCw,
  Search,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  RotateCw,
  ArrowRightLeft,
} from 'lucide-react';
import Sidebar from '@/components/dashboard/Sidebar';
import Header from '@/components/dashboard/Header';
import KycBanner from '@/components/dashboard/KycBanner';
import KycModal from '@/components/dashboard/KycModal';
import ElectricityReceiptModal, {
  ElectricityReceiptData,
} from '@/components/dashboard/ElectricityReceiptModal';
import {
  getStoredAuthToken,
  getStoredUser,
  getStoredBusiness,
  clearSessionAndRedirect,
  handleAuthResponse,
} from '@/lib/auth-session';

export type MeterType = 'PREPAID' | 'POSTPAID';

export interface DiscoOption {
  id: string; // e.g. 'IBEDC_PREPAID'
  code: string; // e.g. 'IBEDC'
  name: string;
  shortName: string;
  meterType: MeterType;
  logo: string;
  coverage: string;
  discountBps: number; // 120 = 1.2%
  minAmountNaira: number;
}

const ALL_DISCOS: DiscoOption[] = [
  // 1. IBEDC
  {
    id: 'IBEDC_PREPAID',
    code: 'IBEDC',
    name: 'Ibadan Electricity Distribution Co.',
    shortName: 'IBEDC',
    meterType: 'PREPAID',
    logo: '/logos/electricity/ibedc.png',
    coverage: 'Oyo, Ogun, Osun, Kwara, Niger, Kogi',
    discountBps: 0,
    minAmountNaira: 100,
  },
  {
    id: 'IBEDC_POSTPAID',
    code: 'IBEDC',
    name: 'Ibadan Electricity Distribution Co.',
    shortName: 'IBEDC',
    meterType: 'POSTPAID',
    logo: '/logos/electricity/ibedc.png',
    coverage: 'Oyo, Ogun, Osun, Kwara, Niger, Kogi',
    discountBps: 0,
    minAmountNaira: 100,
  },

  // 2. IKEDC
  {
    id: 'IKEDC_PREPAID',
    code: 'IKEDC',
    name: 'Ikeja Electric',
    shortName: 'IKEDC',
    meterType: 'PREPAID',
    logo: '/logos/electricity/ikedc.png',
    coverage: 'Lagos Mainland, Ikorodu, Ikeja, Oshodi',
    discountBps: 0,
    minAmountNaira: 100,
  },
  {
    id: 'IKEDC_POSTPAID',
    code: 'IKEDC',
    name: 'Ikeja Electric',
    shortName: 'IKEDC',
    meterType: 'POSTPAID',
    logo: '/logos/electricity/ikedc.png',
    coverage: 'Lagos Mainland, Ikorodu, Ikeja, Oshodi',
    discountBps: 0,
    minAmountNaira: 100,
  },

  // 3. EKEDC
  {
    id: 'EKEDC_PREPAID',
    code: 'EKEDC',
    name: 'Eko Electricity Distribution Co.',
    shortName: 'EKEDC',
    meterType: 'PREPAID',
    logo: '/logos/electricity/ekedc.png',
    coverage: 'Lagos Island, Lekki, VI, Apapa, Festac',
    discountBps: 0,
    minAmountNaira: 100,
  },
  {
    id: 'EKEDC_POSTPAID',
    code: 'EKEDC',
    name: 'Eko Electricity Distribution Co.',
    shortName: 'EKEDC',
    meterType: 'POSTPAID',
    logo: '/logos/electricity/ekedc.png',
    coverage: 'Lagos Island, Lekki, VI, Apapa, Festac',
    discountBps: 0,
    minAmountNaira: 100,
  },

  // 4. AEDC
  {
    id: 'AEDC_PREPAID',
    code: 'AEDC',
    name: 'Abuja Electricity Distribution Co.',
    shortName: 'AEDC',
    meterType: 'PREPAID',
    logo: '/logos/electricity/aedc.png',
    coverage: 'FCT Abuja, Nasarawa, Kogi, Niger',
    discountBps: 0,
    minAmountNaira: 100,
  },
  {
    id: 'AEDC_POSTPAID',
    code: 'AEDC',
    name: 'Abuja Electricity Distribution Co.',
    shortName: 'AEDC',
    meterType: 'POSTPAID',
    logo: '/logos/electricity/aedc.png',
    coverage: 'FCT Abuja, Nasarawa, Kogi, Niger',
    discountBps: 0,
    minAmountNaira: 100,
  },

  // 5. EEDC
  {
    id: 'EEDC_PREPAID',
    code: 'EEDC',
    name: 'Enugu Electricity Distribution Co.',
    shortName: 'EEDC',
    meterType: 'PREPAID',
    logo: '/logos/electricity/eedc.png',
    coverage: 'Enugu, Abia, Imo, Anambra, Ebonyi',
    discountBps: 0,
    minAmountNaira: 100,
  },
  {
    id: 'EEDC_POSTPAID',
    code: 'EEDC',
    name: 'Enugu Electricity Distribution Co.',
    shortName: 'EEDC',
    meterType: 'POSTPAID',
    logo: '/logos/electricity/eedc.png',
    coverage: 'Enugu, Abia, Imo, Anambra, Ebonyi',
    discountBps: 0,
    minAmountNaira: 100,
  },

  // 6. PHED
  {
    id: 'PHED_PREPAID',
    code: 'PHED',
    name: 'Port Harcourt Electricity Distribution',
    shortName: 'PHED',
    meterType: 'PREPAID',
    logo: '/logos/electricity/phed.png',
    coverage: 'Rivers, Bayelsa, Cross River, Akwa Ibom',
    discountBps: 0,
    minAmountNaira: 100,
  },
  {
    id: 'PHED_POSTPAID',
    code: 'PHED',
    name: 'Port Harcourt Electricity Distribution',
    shortName: 'PHED',
    meterType: 'POSTPAID',
    logo: '/logos/electricity/phed.png',
    coverage: 'Rivers, Bayelsa, Cross River, Akwa Ibom',
    discountBps: 0,
    minAmountNaira: 100,
  },

  // 7. KEDCO
  {
    id: 'KEDCO_PREPAID',
    code: 'KEDCO',
    name: 'Kano Electricity Distribution Co.',
    shortName: 'KEDCO',
    meterType: 'PREPAID',
    logo: '/logos/electricity/kedco.png',
    coverage: 'Kano, Katsina, Jigawa',
    discountBps: 0,
    minAmountNaira: 100,
  },
  {
    id: 'KEDCO_POSTPAID',
    code: 'KEDCO',
    name: 'Kano Electricity Distribution Co.',
    shortName: 'KEDCO',
    meterType: 'POSTPAID',
    logo: '/logos/electricity/kedco.png',
    coverage: 'Kano, Katsina, Jigawa',
    discountBps: 0,
    minAmountNaira: 100,
  },

  // 8. KAEDCO
  {
    id: 'KAEDCO_PREPAID',
    code: 'KAEDCO',
    name: 'Kaduna Electric',
    shortName: 'KAEDCO',
    meterType: 'PREPAID',
    logo: '/logos/electricity/kaedco.png',
    coverage: 'Kaduna, Kebbi, Sokoto, Zamfara',
    discountBps: 0,
    minAmountNaira: 100,
  },
  {
    id: 'KAEDCO_POSTPAID',
    code: 'KAEDCO',
    name: 'Kaduna Electric',
    shortName: 'KAEDCO',
    meterType: 'POSTPAID',
    logo: '/logos/electricity/kaedco.png',
    coverage: 'Kaduna, Kebbi, Sokoto, Zamfara',
    discountBps: 0,
    minAmountNaira: 100,
  },

  // 9. JED
  {
    id: 'JED_PREPAID',
    code: 'JED',
    name: 'Jos Electricity Distribution Co.',
    shortName: 'JED',
    meterType: 'PREPAID',
    logo: '/logos/electricity/jed.png',
    coverage: 'Plateau, Bauchi, Benue, Gombe',
    discountBps: 0,
    minAmountNaira: 100,
  },
  {
    id: 'JED_POSTPAID',
    code: 'JED',
    name: 'Jos Electricity Distribution Co.',
    shortName: 'JED',
    meterType: 'POSTPAID',
    logo: '/logos/electricity/jed.png',
    coverage: 'Plateau, Bauchi, Benue, Gombe',
    discountBps: 0,
    minAmountNaira: 100,
  },

  // 10. BEDC
  {
    id: 'BEDC_PREPAID',
    code: 'BEDC',
    name: 'Benin Electricity Distribution Co.',
    shortName: 'BEDC',
    meterType: 'PREPAID',
    logo: '/logos/electricity/bedc.png',
    coverage: 'Edo, Delta, Ondo, Ekiti',
    discountBps: 0,
    minAmountNaira: 100,
  },
  {
    id: 'BEDC_POSTPAID',
    code: 'BEDC',
    name: 'Benin Electricity Distribution Co.',
    shortName: 'BEDC',
    meterType: 'POSTPAID',
    logo: '/logos/electricity/bedc.png',
    coverage: 'Edo, Delta, Ondo, Ekiti',
    discountBps: 0,
    minAmountNaira: 100,
  },

  // 11. YEDC
  {
    id: 'YEDC_PREPAID',
    code: 'YEDC',
    name: 'Yola Electricity Distribution Co.',
    shortName: 'YEDC',
    meterType: 'PREPAID',
    logo: '/logos/electricity/yedc.png',
    coverage: 'Adamawa, Borno, Taraba, Yobe',
    discountBps: 0,
    minAmountNaira: 100,
  },
  {
    id: 'YEDC_POSTPAID',
    code: 'YEDC',
    name: 'Yola Electricity Distribution Co.',
    shortName: 'YEDC',
    meterType: 'POSTPAID',
    logo: '/logos/electricity/yedc.png',
    coverage: 'Adamawa, Borno, Taraba, Yobe',
    discountBps: 0,
    minAmountNaira: 100,
  },

  // 12. ABA
  {
    id: 'ABA_PREPAID',
    code: 'APLE',
    name: 'Aba Power Electric (APLE)',
    shortName: 'ABA Power',
    meterType: 'PREPAID',
    logo: '/logos/electricity/aba.png',
    coverage: 'Aba Ringfenced Area, Abia State',
    discountBps: 0,
    minAmountNaira: 100,
  },
  {
    id: 'ABA_POSTPAID',
    code: 'APLE',
    name: 'Aba Power Electric (APLE)',
    shortName: 'ABA Power',
    meterType: 'POSTPAID',
    logo: '/logos/electricity/aba.png',
    coverage: 'Aba Ringfenced Area, Abia State',
    discountBps: 0,
    minAmountNaira: 100,
  },
];

const PRESET_AMOUNTS = [500, 1000, 2000, 5000, 10000, 20000];

interface VerifiedMeter {
  meterNumber: string;
  customerName?: string;
  customerAddress?: string;
  outstandingBalanceNaira?: number;
  minimumAmountNaira?: number;
  disco: string;
  meterType: MeterType;
}

export interface MeterMismatch {
  isMismatch: boolean;
  meterNumber: string;
  requestedMeterType: MeterType;
  detectedMeterType: MeterType;
  suggestionDiscoId?: string;
  customerName?: string;
  customerAddress?: string;
  minimumAmountNaira?: number;
  responseMessage: string;
}

export default function ElectricityPage() {
  // Navigation & User State
  const [merchantName, setMerchantName] = useState('Merchant');
  const [businessName, setBusinessName] = useState('My Business');
  const [kycStatus, setKycStatus] = useState<string>('INITIALIZING');
  const [isKycModalOpen, setIsKycModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [isLoadingBalance, setIsLoadingBalance] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Dynamic DISCO catalog with admin-configured discount margins
  const [discosList, setDiscosList] = useState<DiscoOption[]>(ALL_DISCOS);

  // Filters & Selection
  const [filterType, setFilterType] = useState<'ALL' | 'PREPAID' | 'POSTPAID'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);

  // Vending Form State - amount starts COMPLETELY EMPTY, never auto-selected
  const [meterNumber, setMeterNumber] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [amount, setAmount] = useState('');

  // Verification State
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifiedMeter, setVerifiedMeter] = useState<VerifiedMeter | null>(null);
  const [meterMismatch, setMeterMismatch] = useState<MeterMismatch | null>(null);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const autoVerifyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastVerifiedKeyRef = useRef<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);

  // Purchase & Modals State
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [receiptData, setReceiptData] = useState<ElectricityReceiptData | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  const isVerified = kycStatus === 'VERIFIED';

  // Load Balance & Profile
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
        if (storedUser.firstName) setMerchantName(storedUser.firstName);
        if (storedUser.phone) setCustomerPhone(storedUser.phone);
        if (storedUser.kycStatus) setKycStatus(storedUser.kycStatus);
        else setKycStatus('UNVERIFIED');
      } else {
        setKycStatus('UNVERIFIED');
      }

      if (storedBiz?.name) setBusinessName(storedBiz.name);
    } catch {}

    loadWallets();

    // Fetch dynamic DISCO directory with admin-configured discount rates and minimum amounts
    const loadDiscosCatalog = async () => {
      try {
        const res = await fetch('/api/services/electricity/discos');
        const data = await res.json().catch(() => null);
        if (res.ok && data?.success && Array.isArray(data.data)) {
          setDiscosList((prev) =>
            prev.map((disco) => {
              const matched = data.data.find((d: any) => d.code === disco.code);
              if (matched) {
                return {
                  ...disco,
                  discountBps: typeof matched.discountBps === 'number' ? matched.discountBps : disco.discountBps,
                  minAmountNaira: typeof matched.minimumAmountNaira === 'number' ? matched.minimumAmountNaira : disco.minAmountNaira,
                };
              }
              return disco;
            }),
          );
        }
      } catch {}
    };
    loadDiscosCatalog();

    // Sync provider from URL if present
    try {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        const providerParam = params.get('provider');
        if (providerParam && ALL_DISCOS.some((d) => d.id === providerParam)) {
          setSelectedOptionId(providerParam);
        }
      }
    } catch {}

    return () => {
      if (autoVerifyTimeoutRef.current) {
        clearTimeout(autoVerifyTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const handleRefreshBalance = async () => {
    setIsRefreshing(true);
    await loadWallets();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Selected Option Object (null when viewing all billers catalog)
  const selectedDisco = useMemo(() => {
    if (!selectedOptionId) return null;
    return discosList.find((d) => d.id === selectedOptionId) || null;
  }, [selectedOptionId, discosList]);

  // Filtered DISCOs for Catalog View
  const filteredDiscos = useMemo(() => {
    return discosList.filter((d) => {
      if (filterType !== 'ALL' && d.meterType !== filterType) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          d.name.toLowerCase().includes(q) ||
          d.shortName.toLowerCase().includes(q) ||
          d.coverage.toLowerCase().includes(q) ||
          d.meterType.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [filterType, searchQuery, discosList]);

  // Core Meter Verification Executor
  const executeMeterVerification = async (targetMeter: string, targetDisco: DiscoOption) => {
    const cleanMeter = targetMeter.replace(/\D/g, '');
    if (!cleanMeter || cleanMeter.length < 8) {
      setVerificationError('Please enter a valid meter number (minimum 8 digits).');
      return;
    }

    const verificationKey = `${targetDisco.id}:${cleanMeter}`;
    if (lastVerifiedKeyRef.current === verificationKey && verifiedMeter) {
      return;
    }

    // Cancel any previous in-flight verification request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsVerifying(true);
    setVerificationError(null);
    setMeterMismatch(null);
    setSubmitError(null);

    try {
      const authToken = getStoredAuthToken();
      if (!authToken) {
        clearSessionAndRedirect('expired');
        return;
      }

      const res = await fetch('/api/services/electricity/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          disco: targetDisco.code,
          meterNumber: cleanMeter,
          meterType: targetDisco.meterType,
        }),
        signal: controller.signal,
      });

      const data = await res.json().catch(() => null);

      if (controller.signal.aborted) {
        return;
      }

      if (handleAuthResponse(res, data)) {
        return;
      }

      if (!res.ok || !data?.success) {
        throw new Error(
          data?.error?.message ||
          'Meter verification failed. Please check the meter number with the selected provider.'
        );
      }

      const info = data.data;

      // Handle Meter Type Mismatch (e.g. user entered a Postpaid meter on Prepaid page, or vice versa)
      if (info?.isMismatch && info?.detectedMeterType) {
        setMeterMismatch({
          isMismatch: true,
          meterNumber: info.meterNumber || cleanMeter,
          requestedMeterType: info.requestedMeterType || targetDisco.meterType,
          detectedMeterType: info.detectedMeterType,
          suggestionDiscoId: info.suggestionDiscoId,
          customerName: info.customerName,
          customerAddress: info.customerAddress,
          minimumAmountNaira: typeof info.minimumAmountNaira === 'number' && info.minimumAmountNaira > 1 ? info.minimumAmountNaira : undefined,
          responseMessage: info.responseMessage || `This meter is registered as ${info.detectedMeterType}.`,
        });
        setVerifiedMeter(null);
        setVerificationError(null);
        return;
      }

      if (!info?.isValid) {
        throw new Error(
          info?.responseMessage ||
          'Meter verification failed. Please check the meter number with the selected provider.'
        );
      }

      setMeterMismatch(null);
      setVerifiedMeter({
        meterNumber: info.meterNumber || cleanMeter,
        customerName: info.customerName || undefined,
        customerAddress: info.customerAddress || undefined,
        outstandingBalanceNaira: info.outstandingBalanceNaira || 0,
        minimumAmountNaira: typeof info.minimumAmountNaira === 'number' && info.minimumAmountNaira > 1 ? info.minimumAmountNaira : undefined,
        disco: targetDisco.shortName,
        meterType: targetDisco.meterType,
      });
      lastVerifiedKeyRef.current = verificationKey;
    } catch (err: any) {
      if (err?.name === 'AbortError' || controller.signal.aborted) {
        return;
      }
      setVerificationError(err.message || 'Unable to verify meter with electricity company.');
      setVerifiedMeter(null);
      setMeterMismatch(null);
      lastVerifiedKeyRef.current = '';
    } finally {
      if (!controller.signal.aborted) {
        setIsVerifying(false);
      }
    }
  };

  // Switch to the detected meter type when mismatch is identified
  const handleSwitchMeterType = (mismatch: MeterMismatch) => {
    const targetDisco = discosList.find(
      (d) => d.code === selectedDisco?.code && d.meterType === mismatch.detectedMeterType,
    );

    if (!targetDisco) return;

    setSelectedOptionId(targetDisco.id);
    setMeterNumber(mismatch.meterNumber);
    setMeterMismatch(null);
    setVerificationError(null);
    setSubmitError(null);

    setVerifiedMeter({
      meterNumber: mismatch.meterNumber,
      customerName: mismatch.customerName,
      customerAddress: mismatch.customerAddress,
      outstandingBalanceNaira: 0,
      minimumAmountNaira: mismatch.minimumAmountNaira && mismatch.minimumAmountNaira > 1 ? mismatch.minimumAmountNaira : undefined,
      disco: targetDisco.shortName,
      meterType: mismatch.detectedMeterType,
    });

    lastVerifiedKeyRef.current = `${targetDisco.id}:${mismatch.meterNumber}`;

    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('provider', targetDisco.id);
      window.history.pushState({}, '', url.toString());
    }
  };

  // Navigate into Dedicated Biller Page
  const handleSelectBiller = (option: DiscoOption) => {
    setSelectedOptionId(option.id);
    setMeterNumber('');
    setAmount('');
    setVerifiedMeter(null);
    setMeterMismatch(null);
    setVerificationError(null);
    setSubmitError(null);
    lastVerifiedKeyRef.current = '';

    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.set('provider', option.id);
      window.history.pushState({}, '', url.toString());
    }
  };

  // Navigate back to All Billers Catalog
  const handleBackToCatalog = () => {
    setSelectedOptionId(null);
    setMeterNumber('');
    setAmount('');
    setVerifiedMeter(null);
    setMeterMismatch(null);
    setVerificationError(null);
    setSubmitError(null);
    lastVerifiedKeyRef.current = '';

    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('provider');
      window.history.pushState({}, '', url.toString());
    }
  };

  // Handle Meter Number Change: automatically verify as soon as the meter number reaches 11 digits
  const handleMeterChange = (val: string) => {
    const clean = val.replace(/\D/g, '').slice(0, 13);
    setMeterNumber(clean);
    setVerifiedMeter(null);
    setMeterMismatch(null);
    setVerificationError(null);
    setSubmitError(null);
    lastVerifiedKeyRef.current = '';

    // Cancel in-flight validation on typing
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsVerifying(false);

    if (autoVerifyTimeoutRef.current) {
      clearTimeout(autoVerifyTimeoutRef.current);
      autoVerifyTimeoutRef.current = null;
    }

    // Auto-verify triggered upon reaching standard Nigerian STS meter limit (11 digits) with 600ms debounce
    if (selectedDisco && clean.length === 11) {
      autoVerifyTimeoutRef.current = setTimeout(() => {
        executeMeterVerification(clean, selectedDisco);
      }, 600);
    }
  };

  // Manual Verify Meter Action (or Retry)
  const handleVerifyMeter = () => {
    if (!selectedDisco) return;
    if (autoVerifyTimeoutRef.current) {
      clearTimeout(autoVerifyTimeoutRef.current);
      autoVerifyTimeoutRef.current = null;
    }
    executeMeterVerification(meterNumber, selectedDisco);
  };

  // Confirmed minimum amount ONLY when returned and verified from provider (> ₦1)
  const confirmedMinAmount = useMemo(() => {
    if (verifiedMeter?.minimumAmountNaira && verifiedMeter.minimumAmountNaira > 1) {
      return verifiedMeter.minimumAmountNaira;
    }
    return null;
  }, [verifiedMeter]);

  const effectiveMinAmount = useMemo(() => {
    return confirmedMinAmount && confirmedMinAmount > 1 ? confirmedMinAmount : 100;
  }, [confirmedMinAmount]);

  // Dynamic preset chips respecting confirmed minimum amount (if any)
  const dynamicPresetAmounts = useMemo(() => {
    const base = [500, 1000, 2000, 5000, 10000, 20000];
    if (confirmedMinAmount && confirmedMinAmount > 1) {
      const combined = [confirmedMinAmount, ...base.filter((v) => v >= confirmedMinAmount)];
      return Array.from(new Set(combined)).sort((a, b) => a - b).slice(0, 6);
    }
    return base;
  }, [confirmedMinAmount]);

  // Calculations
  const numericAmount = parseFloat(amount) || 0;
  const discountAmount = selectedDisco ? (numericAmount * selectedDisco.discountBps) / 10000 : 0;
  const amountToDebit = Math.max(0, numericAmount - discountAmount);

  // Validate and Open Confirm Modal
  const handleOpenConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!isVerified) {
      setIsKycModalOpen(true);
      return;
    }

    if (!selectedDisco) {
      setSubmitError('Please select an electricity distribution company.');
      return;
    }

    if (!meterNumber || meterNumber.length < 8) {
      setVerificationError('Please enter a valid meter number.');
      return;
    }

    if (!numericAmount || numericAmount <= 0) {
      setSubmitError('Please enter a recharge amount.');
      return;
    }

    if (numericAmount < effectiveMinAmount) {
      setSubmitError(`Minimum purchase amount is ₦${effectiveMinAmount.toLocaleString()}.`);
      return;
    }

    if (numericAmount > 100000) {
      setSubmitError('Maximum purchase amount is ₦100,000 per transaction.');
      return;
    }

    if (amountToDebit > walletBalance) {
      setSubmitError('Insufficient wallet balance. Please fund your settlement wallet.');
      return;
    }

    setIsConfirmModalOpen(true);
  };

  // Execute Purchase
  const handleExecutePurchase = async () => {
    if (!selectedDisco) return;
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const authToken = getStoredAuthToken();
      if (!authToken) {
        clearSessionAndRedirect('expired');
        return;
      }

      const clientReference = `BXT-ELEC-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      const res = await fetch('/api/services/electricity/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          disco: selectedDisco.code,
          meterNumber,
          meterType: selectedDisco.meterType,
          amount: numericAmount,
          customerMobile: customerPhone || undefined,
          customerName: verifiedMeter?.customerName || undefined,
          clientReference,
        }),
      });

      const data = await res.json().catch(() => null);

      if (handleAuthResponse(res, data)) {
        return;
      }

      if (!res.ok || !data?.success) {
        throw new Error(data?.error?.message || 'Transaction could not be completed.');
      }

      const payload = data.data;

      setReceiptData({
        transactionId: payload.transactionId || payload.reference || clientReference,
        reference: payload.reference || clientReference,
        clientReference: payload.clientReference || clientReference,
        status: payload.status,
        disco: selectedDisco.code,
        discoName: selectedDisco.name,
        meterNumber,
        meterType: selectedDisco.meterType,
        customerName: verifiedMeter?.customerName || payload.customerName,
        customerAddress: verifiedMeter?.customerAddress || payload.customerAddress,
        token: payload.token,
        units: payload.units,
        tariff: payload.tariff,
        feeder: payload.feeder,
        faceAmountNaira: payload.faceAmountNaira || numericAmount,
        discountNaira: payload.discountNaira || discountAmount,
        amountDebitedNaira: payload.amountDebitedNaira || amountToDebit,
        date: new Date().toLocaleString('en-NG'),
      });

      setIsConfirmModalOpen(false);
      setIsReceiptModalOpen(true);

      loadWallets();
    } catch (err: any) {
      setSubmitError(err.message || 'Payment failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-[#070E1C]">
      {/* Sidebar Navigation */}
      <Sidebar
        businessName={businessName}
        merchantName={merchantName}
        kycStatus={kycStatus}
        onOpenKycModal={() => setIsKycModalOpen(true)}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Content Area - normal document scrolling on mobile */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-72">
        <Header
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onOpenKycModal={() => setIsKycModalOpen(true)}
          merchantName={merchantName}
          kycStatus={kycStatus}
          isRefreshing={isRefreshing}
          onRefresh={handleRefreshBalance}
          sticky={false}
        />

        <main className="flex-1 p-3 sm:p-5 lg:p-7 max-w-7xl mx-auto w-full space-y-4">
          {/* Identity Verification Warning Banner */}
          <KycBanner
            kycStatus={kycStatus}
            onOpenKycModal={() => setIsKycModalOpen(true)}
          />

          {/* ======================================================== */}
          {/* VIEW 1: ALL BILLERS CATALOG (Displayed when no DISCO is selected) */}
          {/* ======================================================== */}
          {!selectedDisco ? (
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
                  onClick={handleRefreshBalance}
                  disabled={isRefreshing}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1528] text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors shadow-xs cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-slate-400 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span>Refresh</span>
                </button>
              </div>

              {/* Page Heading & Settlement Balance */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-amber-500/10 text-amber-500 dark:bg-amber-500/15 dark:text-amber-400 border border-amber-500/20">
                      <Zap className="w-4 h-4" />
                    </div>
                    <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                      Electricity Bill Payment & Tokens
                    </h1>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Select your electricity distribution company to vend prepaid STS tokens or settle postpaid bills
                  </p>
                </div>

                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 text-xs font-medium text-slate-600 dark:text-slate-300 w-fit">
                  <Wallet className="w-3.5 h-3.5 text-amber-500" />
                  <span>Settlement Balance:</span>
                  {isLoadingBalance ? (
                    <span className="inline-block w-14 h-3 bg-slate-300 dark:bg-slate-700 rounded animate-pulse" />
                  ) : (
                    <span className="font-extrabold text-slate-900 dark:text-white">
                      ₦{walletBalance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                    </span>
                  )}
                </div>
              </div>

              {/* Compact Filters & Search Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-white dark:bg-[#0B1528] p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
                {/* Tabs */}
                <div className="flex items-center gap-1 p-0.5 bg-slate-100 dark:bg-[#070D18] rounded-lg border border-slate-200 dark:border-slate-800">
                  {(['ALL', 'PREPAID', 'POSTPAID'] as const).map((t) => (
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
                      {t === 'ALL' && 'All Providers (24)'}
                      {t === 'PREPAID' && 'Prepaid Tokens (12)'}
                      {t === 'POSTPAID' && 'Postpaid Bills (12)'}
                    </button>
                  ))}
                </div>

                {/* Search DISCO */}
                <div className="relative flex-1 sm:max-w-xs">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search company or state..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-8 pl-8 pr-3 text-xs rounded-lg bg-slate-50 dark:bg-[#070D18] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#126BEB]"
                  />
                </div>
              </div>

              {/* COMPACT BILLERS GRID: Sleek, high-density tiles */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2.5">
                {filteredDiscos.map((opt) => {
                  const isPrepaid = opt.meterType === 'PREPAID';
                  return (
                    <div
                      key={opt.id}
                      onClick={() => handleSelectBiller(opt)}
                      className="group relative p-2.5 sm:p-3 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0B1528] hover:border-[#126BEB] dark:hover:border-[#126BEB] hover:shadow-sm transition-all duration-150 cursor-pointer flex flex-col justify-between"
                    >
                      <div>
                        {/* Top: Logo & Meter Tag */}
                        <div className="flex items-center justify-between gap-1.5 mb-2">
                          <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-center p-1 shrink-0 group-hover:scale-105 transition-transform">
                            <Image
                              src={opt.logo}
                              alt={opt.shortName}
                              width={28}
                              height={28}
                              className="object-contain"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          </div>

                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider shrink-0 ${
                              isPrepaid
                                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                                : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                            }`}
                          >
                            {opt.meterType}
                          </span>
                        </div>

                        {/* Title & Coverage */}
                        <h3 className="font-extrabold text-xs text-slate-900 dark:text-white group-hover:text-[#126BEB] transition-colors truncate">
                          {opt.shortName}
                        </h3>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {opt.coverage}
                        </p>
                      </div>

                      {/* Footer: Discount (if set by admin) & Arrow leading to page */}
                      <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[10px]">
                        {opt.discountBps > 0 ? (
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">
                            {(opt.discountBps / 100).toFixed(1)}% off
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                            Instant Token
                          </span>
                        )}

                        <span className="inline-flex items-center gap-0.5 font-bold text-[#126BEB] group-hover:translate-x-0.5 transition-transform">
                          <span>Pay</span>
                          <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredDiscos.length === 0 && (
                <div className="py-12 text-center text-slate-400 text-xs bg-white dark:bg-[#0B1528] rounded-xl border border-slate-200 dark:border-slate-800">
                  No electricity distribution company matches &quot;{searchQuery}&quot;.
                </div>
              )}
            </div>
          ) : (
            /* ======================================================== */
            /* VIEW 2: DEDICATED BILLER PAGE (e.g. IBEDC Prepaid Page) */
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
                  <Wallet className="w-3 h-3 text-amber-500" />
                  <span>Balance:</span>
                  {isLoadingBalance ? (
                    <span className="inline-block w-14 h-3 bg-slate-300 dark:bg-slate-700 rounded animate-pulse" />
                  ) : (
                    <span className="font-extrabold text-slate-900 dark:text-white">
                      ₦{walletBalance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                    </span>
                  )}
                </div>
              </div>

              {/* Compact Dedicated Biller Hero Banner */}
              <div className="p-4 rounded-xl bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center p-1.5 shrink-0">
                    <Image
                      src={selectedDisco.logo}
                      alt={selectedDisco.shortName}
                      width={36}
                      height={36}
                      className="object-contain"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h1 className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                        {selectedDisco.name}
                      </h1>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider shrink-0 ${
                          selectedDisco.meterType === 'PREPAID'
                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                            : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                        }`}
                      >
                        {selectedDisco.meterType}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                      {selectedDisco.coverage}
                    </p>
                  </div>
                </div>

                {selectedDisco.discountBps > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                    {(selectedDisco.discountBps / 100).toFixed(1)}% Cashback
                  </span>
                )}
              </div>

              {/* Dedicated Focused Vending Form Card */}
              <div className="bg-white dark:bg-[#0B1528] rounded-xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
                <form onSubmit={handleOpenConfirm} className="space-y-4">
                  
                  {/* 1. METER NUMBER INPUT WITH AUTO-VERIFICATION ON 11 DIGITS */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                        {selectedDisco.meterType === 'PREPAID' ? 'Prepaid Meter Number' : 'Postpaid Account Number'}
                      </label>
                      <span className="text-[10px] text-slate-400 font-medium">Standard 11 digits</span>
                    </div>

                    <div className="relative">
                      <input
                        type="text"
                        placeholder="e.g. 04218392193"
                        value={meterNumber}
                        onChange={(e) => handleMeterChange(e.target.value)}
                        maxLength={13}
                        className={`w-full h-11 pl-3.5 pr-28 rounded-xl bg-slate-50 dark:bg-[#070D18] border text-slate-900 dark:text-white text-sm font-mono font-bold placeholder:text-slate-400 placeholder:font-sans focus:outline-none transition-all shadow-xs ${
                          verifiedMeter
                            ? 'border-emerald-500/60 ring-2 ring-emerald-500/15 bg-emerald-50/10'
                            : isVerifying
                            ? 'border-[#126BEB] ring-2 ring-[#126BEB]/20'
                            : verificationError
                            ? 'border-rose-400 focus:border-rose-500'
                            : 'border-slate-200 dark:border-slate-700 focus:border-[#126BEB] focus:ring-2 focus:ring-[#126BEB]/20'
                        }`}
                        required
                      />

                      {/* State indicator / action inside input */}
                      <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center">
                        {isVerifying ? (
                          <div className="h-8 px-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-[#126BEB] dark:text-blue-400 text-xs font-bold flex items-center gap-1 shadow-xs">
                            <RotateCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Verifying...</span>
                          </div>
                        ) : verifiedMeter ? (
                          <div className="h-8 px-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-1 shadow-xs">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Verified</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={handleVerifyMeter}
                            disabled={meterNumber.length < 8}
                            className="h-8 px-3 rounded-lg bg-[#126BEB] hover:bg-[#0B5CC7] text-white text-xs font-bold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
                          >
                            <ShieldCheck className="w-3 h-3" />
                            <span>Verify</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Typing digit counter & verification feedback */}
                    {meterNumber.length > 0 && !verifiedMeter && !isVerifying && !verificationError && (
                      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-1 pt-0.5">
                        <span>{meterNumber.length}/11 digits entered</span>
                        {meterNumber.length === 11 ? (
                          <span className="text-[#126BEB] dark:text-blue-400 font-semibold flex items-center gap-1">
                            <RotateCw className="w-3 h-3 animate-spin" /> Verifying meter...
                          </span>
                        ) : (
                          <span className="text-slate-400">Enter 11 digits to verify</span>
                        )}
                      </div>
                    )}

                    {/* Verification Error Alert */}
                    {verificationError && (
                      <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-xs flex items-center justify-between gap-2 animate-in fade-in duration-150">
                        <div className="flex items-center gap-2 min-w-0">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{verificationError}</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleVerifyMeter}
                          className="text-xs font-bold underline hover:no-underline shrink-0 cursor-pointer"
                        >
                          Retry
                        </button>
                      </div>
                    )}

                    {/* METER TYPE MISMATCH NOTICE & 1-CLICK SWITCH BUTTON */}
                    {meterMismatch && selectedDisco && (
                      <div className="p-3.5 rounded-xl bg-amber-500/10 dark:bg-amber-950/40 border border-amber-500/30 text-xs space-y-2.5 animate-in fade-in duration-200 shadow-xs">
                        <div className="flex items-start gap-2.5">
                          <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0">
                            <ArrowRightLeft className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-extrabold text-amber-900 dark:text-amber-300 text-xs flex items-center gap-1.5">
                              <span>Meter Type Mismatch</span>
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-800 dark:text-amber-300">
                                {meterMismatch.detectedMeterType}
                              </span>
                            </h4>
                            <p className="text-[11px] text-amber-800/90 dark:text-amber-400/90 mt-0.5 leading-relaxed">
                              {meterMismatch.customerName ? (
                                <>
                                  Meter <span className="font-mono font-bold">#{meterMismatch.meterNumber}</span> is registered as a{' '}
                                  <strong className="underline">{meterMismatch.detectedMeterType}</strong> account under{' '}
                                  {selectedDisco.shortName} ({meterMismatch.customerName}).
                                </>
                              ) : (
                                meterMismatch.responseMessage
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="pt-1 flex items-center justify-between gap-2 border-t border-amber-500/20">
                          <span className="text-[10px] text-amber-700/80 dark:text-amber-400/70">
                            Switching preserves your meter number & customer verification
                          </span>
                          <button
                            type="button"
                            onClick={() => handleSwitchMeterType(meterMismatch)}
                            className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs transition-all flex items-center gap-1.5 shadow-xs cursor-pointer shrink-0"
                          >
                            <span>Switch to {selectedDisco.shortName} {meterMismatch.detectedMeterType}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}

                    {/* VERIFIED ACCOUNT INFORMATION CARD (Real customer name returned from DISCO) */}
                    {verifiedMeter && (
                      <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-500/30 text-xs space-y-1.5 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-extrabold text-[10px] uppercase tracking-wider">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Verified Account Information</span>
                        </div>

                        <div className="pt-0.5">
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-semibold uppercase">
                            Customer Account
                          </span>
                          <span className="font-extrabold text-slate-900 dark:text-white uppercase text-xs block">
                            {verifiedMeter.customerName || 'Validated & Active Meter'}
                          </span>
                        </div>

                        {verifiedMeter.customerAddress && (
                          <div>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-semibold uppercase">
                              Service Address
                            </span>
                            <span className="text-slate-700 dark:text-slate-300 text-[11px] line-clamp-2">
                              {verifiedMeter.customerAddress}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 2. RECHARGE AMOUNT (EMPTY BY DEFAULT - NEVER AUTO-SELECTED) */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                        Recharge Amount (₦)
                      </label>
                      {confirmedMinAmount && confirmedMinAmount > 1 ? (
                        <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold">
                          Min: ₦{confirmedMinAmount.toLocaleString()}
                        </span>
                      ) : null}
                    </div>

                    <input
                      type="number"
                      placeholder={
                        confirmedMinAmount && confirmedMinAmount > 1
                          ? `Enter amount in ₦ (Min: ₦${confirmedMinAmount.toLocaleString()})`
                          : 'Enter recharge amount in ₦'
                      }
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      min={confirmedMinAmount && confirmedMinAmount > 1 ? confirmedMinAmount : 100}
                      max={100000}
                      className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-[#070D18] border border-slate-200 dark:border-slate-700 focus:border-[#126BEB] focus:ring-2 focus:ring-[#126BEB]/20 text-slate-900 dark:text-white text-sm font-extrabold placeholder:text-slate-400 placeholder:font-normal focus:outline-none transition-all shadow-xs"
                      required
                    />

                    {/* Preset Chips (Purely optional shortcuts - NONE auto-selected on load) */}
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 pt-0.5">
                      {dynamicPresetAmounts.map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setAmount(val.toString())}
                          className={`py-1.5 px-1 rounded-lg text-xs font-bold border transition-all cursor-pointer text-center ${
                            numericAmount === val
                              ? 'bg-[#126BEB] text-white border-[#126BEB] shadow-xs'
                              : 'bg-slate-50 dark:bg-[#070D18] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                        >
                          ₦{val >= 1000 ? `${val / 1000}k` : val}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 3. CUSTOMER PHONE (OPTIONAL) */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                      Customer phone number (Optional)
                    </label>
                    <input
                      type="tel"
                      placeholder="e.g. 08012345678"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full h-10 px-3.5 rounded-xl bg-slate-50 dark:bg-[#070D18] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-mono font-bold placeholder:text-slate-400 placeholder:font-sans focus:outline-none focus:border-[#126BEB] focus:ring-2 focus:ring-[#126BEB]/20 transition-all shadow-xs"
                    />
                  </div>

                  {/* 4. FINANCIAL SUMMARY */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#070D18] border border-slate-200 dark:border-slate-800 text-xs space-y-1.5">
                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                      <span>Recharge Face Value</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {numericAmount > 0 ? `₦${numericAmount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}` : '₦0.00'}
                      </span>
                    </div>

                    {discountAmount > 0 && selectedDisco && selectedDisco.discountBps > 0 && (
                      <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                        <span className="flex items-center gap-1.5 font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span>Discount ({(selectedDisco.discountBps / 100).toFixed(1)}%)</span>
                        </span>
                        <span className="font-bold">
                          {numericAmount > 0 ? `-₦${discountAmount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}` : '—'}
                        </span>
                      </div>
                    )}

                    <div className="pt-1.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-slate-900 dark:text-white font-black text-xs">
                      <span>Amount to Debit Wallet</span>
                      <span className="text-[#126BEB] dark:text-[#38BDF8]">
                        {numericAmount > 0 ? `₦${amountToDebit.toLocaleString('en-NG', { minimumFractionDigits: 2 })}` : '—'}
                      </span>
                    </div>
                  </div>

                  {/* SUBMIT BUTTON */}
                  <button
                    type="submit"
                    disabled={isSubmitting || !verifiedMeter || !numericAmount || numericAmount < effectiveMinAmount || amountToDebit > walletBalance}
                    className="w-full h-11 rounded-xl bg-[#126BEB] hover:bg-[#0B5CC7] active:bg-[#094bb5] text-white font-extrabold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-blue-500/20"
                  >
                    {isSubmitting ? (
                      <>
                        <RotateCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Processing Transaction...</span>
                      </>
                    ) : !verifiedMeter ? (
                      <span>Verify Meter Number to Proceed</span>
                    ) : !numericAmount ? (
                      <span>Enter Recharge Amount to Proceed</span>
                    ) : (
                      <>
                        <Zap className="w-3.5 h-3.5" />
                        <span>
                          {selectedDisco.meterType === 'PREPAID'
                            ? `Vend ₦${numericAmount.toLocaleString()} Prepaid Token`
                            : `Pay ₦${numericAmount.toLocaleString()} Postpaid Bill`}
                        </span>
                      </>
                    )}
                  </button>

                  {/* Submit Error Alert */}
                  {submitError && (
                    <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{submitError}</span>
                    </div>
                  )}
                </form>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* CONFIRMATION SUMMARY MODAL */}
      {isConfirmModalOpen && selectedDisco && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white dark:bg-[#0B1528] rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center gap-2.5 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Confirm Electricity Purchase
                </h3>
                <p className="text-[11px] text-slate-400">
                  Please review the vending parameters before dispatch
                </p>
              </div>
            </div>

            <div className="space-y-2 text-xs py-2">
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                <span className="text-slate-400">DISCO Operator:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{selectedDisco.name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                <span className="text-slate-400">Account Type:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{selectedDisco.meterType}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                <span className="text-slate-400">Meter / Account No:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">{meterNumber}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                <span className="text-slate-400">Customer Name:</span>
                <span className="font-bold text-slate-900 dark:text-white uppercase">
                  {verifiedMeter?.customerName || 'Validated & Active Meter'}
                </span>
              </div>
              {verifiedMeter?.customerAddress && (
                <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                  <span className="text-slate-400">Service Address:</span>
                  <span className="text-slate-700 dark:text-slate-300 text-right max-w-[200px] truncate">
                    {verifiedMeter.customerAddress}
                  </span>
                </div>
              )}
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
                <span className="text-slate-400">Recharge Amount:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  ₦{numericAmount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60 text-emerald-600 dark:text-emerald-400">
                <span>1.2% Merchant Cashback:</span>
                <span className="font-bold">
                  -₦{discountAmount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between py-1.5 text-sm font-extrabold text-slate-900 dark:text-white">
                <span>Total to Debit Wallet:</span>
                <span className="text-[#126BEB] dark:text-[#38BDF8]">
                  ₦{amountToDebit.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                disabled={isSubmitting}
                className="flex-1 h-10 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecutePurchase}
                disabled={isSubmitting}
                className="flex-1 h-10 rounded-xl bg-[#126BEB] hover:bg-[#0B5CC7] active:bg-[#094bb5] text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-blue-500/20"
              >
                {isSubmitting ? (
                  <>
                    <RotateCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Vending...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-3.5 h-3.5" />
                    <span>Confirm & Pay</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ELECTRICITY RECEIPT & TOKEN MODAL */}
      <ElectricityReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        receipt={receiptData}
      />

      {/* KYC UPGRADE MODAL */}
      <KycModal
        isOpen={isKycModalOpen}
        onClose={() => setIsKycModalOpen(false)}
        onSuccess={() => {
          setKycStatus('VERIFIED');
          setIsKycModalOpen(false);
        }}
      />
    </div>
  );
}
