'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowLeft,
  Wallet,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RotateCw,
  ArrowRightLeft,
  FileText,
  X,
} from 'lucide-react';
import Sidebar from '@/components/dashboard/Sidebar';
import Header from '@/components/dashboard/Header';
import KycBanner from '@/components/dashboard/KycBanner';
import KycModal from '@/components/dashboard/KycModal';
import AccessRestricted from '@/components/dashboard/AccessRestricted';
import ModalDialog from '@/components/ModalDialog';
import BaxatoLoader from '@/components/BaxatoLoader';
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
import { useWalletBalance } from '@/lib/use-wallet-balance';
import { showToast } from '@/lib/toast';

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
    logo: '/logos/electricity/phed.svg',
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
    logo: '/logos/electricity/phed.svg',
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
    logo: '/logos/electricity/aple.png',
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
    logo: '/logos/electricity/aple.png',
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
  const [userFirstName, setUserFirstName] = useState<string>('');
  const [userLastName, setUserLastName] = useState<string>('');
  const [isKycModalOpen, setIsKycModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { walletBalance, isLoadingBalance, refreshWallets: loadWallets } = useWalletBalance();
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Dynamic DISCO catalog with admin-configured discount margins
  const [discosList, setDiscosList] = useState<DiscoOption[]>(ALL_DISCOS);

  // Filters & Selection
  const [filterType, setFilterType] = useState<'ALL' | 'PREPAID' | 'POSTPAID'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);

  // Form State - amount starts empty, never auto-selected
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
  const [receiptData, setReceiptData] = useState<ElectricityReceiptData | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  const isVerified = kycStatus === 'VERIFIED';

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
        if (storedUser.firstName) {
          setMerchantName(storedUser.firstName);
          setUserFirstName(storedUser.firstName);
        }
        if (storedUser.lastName) {
          setUserLastName(storedUser.lastName);
        }
        if (storedUser.phone) setCustomerPhone(storedUser.phone);
        if (storedUser.kycStatus) setKycStatus(storedUser.kycStatus);
        else setKycStatus('UNVERIFIED');
      } else {
        setKycStatus('UNVERIFIED');
      }

      if (storedBiz?.name) setBusinessName(storedBiz.name);
    } catch {}
    setIsInitialLoading(false);

    const handleBizSwitched = () => {
      const b = getStoredBusiness();
      if (b?.name) setBusinessName(b.name);
      if (b?.role) setUserRole(b.role);
    };

    window.addEventListener('bx_business_switched', handleBizSwitched);

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
          if (userData.firstName) {
            setMerchantName(userData.firstName);
            setUserFirstName(userData.firstName);
          }
          if (userData.lastName) {
            setUserLastName(userData.lastName);
          }
          try {
            const raw = localStorage.getItem('bx_user');
            if (raw) {
              const parsed = JSON.parse(raw);
              localStorage.setItem(
                'bx_user',
                JSON.stringify({
                  ...parsed,
                  kycStatus: userData.kycStatus ?? parsed.kycStatus,
                  firstName: userData.firstName ?? parsed.firstName,
                  lastName: userData.lastName ?? parsed.lastName,
                }),
              );
            }
          } catch {}
        }
      } catch {}
    };

    void syncUserProfile();

    // Fetch dynamic DISCO directory with admin-configured discount rates and minimum amounts
    const loadDiscosCatalog = async () => {
      try {
        const res = await fetch('/api/services/electricity/discos', { cache: 'no-store' });
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
      window.removeEventListener('bx_business_switched', handleBizSwitched);
      if (autoVerifyTimeoutRef.current) {
        clearTimeout(autoVerifyTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const canExecuteServices =
    userRole === 'BUSINESS_OWNER' ||
    userRole === 'BUSINESS_ADMIN' ||
    userRole === 'DEVELOPER' ||
    userRole === 'SUPPORT';

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
      const msg = 'Enter a valid meter number (minimum 8 digits).';
      setVerificationError(msg);
      showToast({ type: 'error', title: 'Invalid meter number', message: msg });
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
      const msg = err?.message || 'Unable to verify meter with electricity provider.';
      setVerificationError(msg);
      showToast({ type: 'error', title: 'Meter verification failed', message: msg });
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

    if (!isVerified) {
      setIsKycModalOpen(true);
      return;
    }

    if (!selectedDisco) {
      showToast({ type: 'error', message: 'Select an electricity distribution company.' });
      return;
    }

    if (!meterNumber || meterNumber.length < 8) {
      const msg = 'Enter a valid meter number (minimum 8 digits).';
      setVerificationError(msg);
      showToast({ type: 'error', message: msg });
      return;
    }

    if (meterMismatch) {
      showToast({
        type: 'error',
        message: `Switch meter type to ${meterMismatch.detectedMeterType} to continue.`,
      });
      return;
    }

    if (!verifiedMeter) {
      showToast({ type: 'error', message: 'Verify your meter number first.' });
      return;
    }

    if (!numericAmount || numericAmount <= 0) {
      showToast({ type: 'error', message: 'Enter an amount to pay.' });
      return;
    }

    if (numericAmount < effectiveMinAmount) {
      showToast({
        type: 'error',
        message: `Minimum amount is ₦${effectiveMinAmount.toLocaleString()}.`,
      });
      return;
    }

    if (numericAmount > 100000) {
      showToast({
        type: 'error',
        message: 'Maximum amount per transaction is ₦100,000.',
      });
      return;
    }

    if (amountToDebit > walletBalance) {
      showToast({
        type: 'error',
        message: `Insufficient wallet balance. You need ₦${(amountToDebit - walletBalance).toLocaleString('en-NG', { minimumFractionDigits: 2 })} more.`,
      });
      return;
    }

    setIsConfirmModalOpen(true);
  };

  // Execute Purchase
  const handleExecutePurchase = async () => {
    if (!selectedDisco) return;
    setIsSubmitting(true);

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
        discoLogo: selectedDisco.logo,
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
      const msg = err?.message || 'Payment failed. Please try again.';
      setIsConfirmModalOpen(false);
      showToast({ type: 'error', title: 'Electricity payment failed', message: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isInitialLoading) {
    return <BaxatoLoader variant="fullscreen" />;
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#070D18] text-slate-800 dark:text-slate-100 flex flex-col lg:flex-row transition-colors duration-150">
      {isSubmitting && <BaxatoLoader variant="overlay" />}
      {/* Sidebar Navigation */}
      <Sidebar
        businessName={businessName}
        merchantName={merchantName}
        kycStatus={kycStatus}
        userRole={userRole}
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
          userRole={userRole}
          isRefreshing={isRefreshing}
          onRefresh={handleRefreshBalance}
          sticky={false}
        />

        <main className="flex-1 px-4 py-5 sm:p-6 lg:p-8 max-w-6xl mx-auto w-full space-y-6">
          {!canExecuteServices ? (
            <AccessRestricted description="Electricity bill payments and token purchases are restricted to Workspace Owners, Administrators, Developers, and Operations staff." />
          ) : (
            <>
              {/* Identity Verification Warning Banner */}
              <KycBanner
                kycStatus={kycStatus}
                userRole={userRole}
                onOpenKycModal={() => setIsKycModalOpen(true)}
              />

          {/* ======================================================== */}
          {/* VIEW 1: ALL BILLERS CATALOG (Displayed when no DISCO is selected) */}
          {/* ======================================================== */}
          {!selectedDisco ? (
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
                  href="/dashboard/ledger?service=ELECTRICITY"
                  className="inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
                >
                  <FileText className="w-3.5 h-3.5 text-[#126BEB] dark:text-[#38BDF8]" aria-hidden="true" />
                  <span>Electricity History</span>
                </Link>
              </div>

              {/* Page Heading & Compact Wallet Balance */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200/80 dark:border-slate-800/80">
                <div className="flex items-center gap-3.5 min-w-0">
                  <Image
                    src="/logos/categories/electricity.svg"
                    alt=""
                    width={40}
                    height={40}
                    className="w-10 h-10 shrink-0 rounded-xl"
                  />
                  <div className="min-w-0">
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight text-balance">
                      Electricity
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 text-pretty">
                      Prepaid meter tokens and postpaid bills across Nigerian DisCos.
                    </p>
                  </div>
                </div>

                {/* Compact Balance Indicator */}
                <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 text-xs font-medium text-slate-600 dark:text-slate-300 w-fit shrink-0">
                  <Wallet className="w-3.5 h-3.5 text-[#126BEB] dark:text-[#38BDF8]" aria-hidden="true" />
                  <span>Balance:</span>
                  {isLoadingBalance ? (
                    <span className="inline-block w-16 h-3.5 bg-slate-300 dark:bg-slate-700 rounded animate-pulse" />
                  ) : (
                    <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                      ₦{walletBalance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                    </span>
                  )}
                </div>
              </div>

              {/* Filters & Search Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-[#0B1528] p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                {/* Tabs */}
                <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-[#070D18] rounded-lg border border-slate-200 dark:border-slate-800">
                  {(['ALL', 'PREPAID', 'POSTPAID'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setFilterType(t)}
                      className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${
                        filterType === t
                          ? 'bg-white dark:bg-[#126BEB] text-slate-900 dark:text-white shadow-xs'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {t === 'ALL' && 'All'}
                      {t === 'PREPAID' && 'Prepaid'}
                      {t === 'POSTPAID' && 'Postpaid'}
                    </button>
                  ))}
                </div>

                {/* Search DISCO */}
                <div className="relative flex-1 sm:max-w-xs">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                  <input
                    type="text"
                    placeholder="Search company or state..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-10 pl-8 pr-3 text-xs sm:text-sm rounded-lg bg-white dark:bg-[#070D18] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#126BEB] focus:ring-2 focus:ring-[#126BEB]/20 transition-colors"
                  />
                </div>
              </div>

              {/* BILLERS GRID */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {filteredDiscos.map((opt) => {
                  const isPrepaid = opt.meterType === 'PREPAID';
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleSelectBiller(opt)}
                      className="group relative p-3 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0B1528] hover:border-[#126BEB] dark:hover:border-[#126BEB] text-left transition-colors duration-150 cursor-pointer flex flex-col justify-between focus:outline-none focus:ring-2 focus:ring-[#126BEB]"
                    >
                      <div>
                        {/* Top: Crisp White-Backed Logo & Meter Tag */}
                        <div className="flex items-center justify-between gap-1.5 mb-2.5">
                          <div className="w-9 h-9 rounded-lg overflow-hidden bg-white border border-slate-200 dark:border-slate-700 flex items-center justify-center p-1 shrink-0">
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
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider shrink-0 ${
                              isPrepaid
                                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                                : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                            }`}
                          >
                            {opt.meterType}
                          </span>
                        </div>

                        {/* Title & Coverage */}
                        <h3 className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-[#126BEB] transition-colors truncate">
                          {opt.shortName}
                        </h3>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">
                          {opt.coverage}
                        </p>
                      </div>

                      {/* Footer: Discount (if set) & Action */}
                      <div className="pt-2 mt-2.5 border-t border-slate-100 dark:border-slate-800/70 flex items-center justify-between text-[11px]">
                        {opt.discountBps > 0 ? (
                          <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                            {(opt.discountBps / 100).toFixed(1)}% off
                          </span>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-500">Meter</span>
                        )}

                        <span className="font-semibold text-[#126BEB] dark:text-[#38BDF8]">
                          Pay
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>

              {filteredDiscos.length === 0 && (
                <div className="py-12 text-center text-slate-400 text-xs bg-white dark:bg-[#0B1528] rounded-xl border border-slate-200 dark:border-slate-800">
                  No electricity provider matches &quot;{searchQuery}&quot;.
                </div>
              )}
            </div>
          ) : (
            /* ======================================================== */
            /* VIEW 2: DEDICATED BILLER PAGE                            */
            /* ======================================================== */
            <div className="space-y-6">
              {/* Clean Top Navigation Row */}
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
                  href="/dashboard/ledger?service=ELECTRICITY"
                  className="inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
                >
                  <FileText className="w-3.5 h-3.5 text-[#126BEB] dark:text-[#38BDF8]" aria-hidden="true" />
                  <span>Electricity History</span>
                </Link>
              </div>

              {/* Biller Heading & Compact Wallet Balance */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200/80 dark:border-slate-800/80">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-white border border-slate-200 dark:border-slate-700 flex items-center justify-center p-1.5 shrink-0">
                    <Image
                      src={selectedDisco.logo}
                      alt={selectedDisco.shortName}
                      width={36}
                      height={36}
                      className="object-contain"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight text-balance">
                        {selectedDisco.name}
                      </h1>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                          selectedDisco.meterType === 'PREPAID'
                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                            : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                        }`}
                      >
                        {selectedDisco.meterType}
                      </span>
                      {selectedDisco.discountBps > 0 && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                          {(selectedDisco.discountBps / 100).toFixed(1)}% off
                        </span>
                      )}
                    </div>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                      {selectedDisco.coverage}
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
                      ₦{walletBalance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                    </span>
                  )}
                </div>
              </div>

              {/* Centered Electricity Payment Form */}
              <form
                onSubmit={handleOpenConfirm}
                noValidate
                aria-label="Electricity payment form"
                className="max-w-xl mx-auto w-full bg-white dark:bg-[#0B1528] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-5"
              >
                  {/* 1. Meter / Account Number */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="electricity-meter-input"
                      className="text-xs font-semibold text-slate-700 dark:text-slate-300 block"
                    >
                      {selectedDisco.meterType === 'PREPAID' ? 'Prepaid Meter Number' : 'Postpaid Account Number'}{' '}
                      <span aria-hidden="true" className="text-red-500">*</span>
                    </label>

                    <div className="relative">
                      <input
                        id="electricity-meter-input"
                        type="text"
                        inputMode="numeric"
                        placeholder="Enter meter number"
                        value={meterNumber}
                        onChange={(e) => handleMeterChange(e.target.value)}
                        maxLength={13}
                        className={`w-full h-11 pl-3.5 pr-24 rounded-lg bg-white dark:bg-[#070D18] border text-slate-900 dark:text-white text-sm sm:text-base font-mono font-semibold placeholder:text-slate-400 placeholder:font-sans placeholder:font-normal focus:outline-none focus:ring-2 transition-colors ${
                          verifiedMeter
                            ? 'border-emerald-500/70 focus:border-emerald-500 focus:ring-emerald-500/20'
                            : isVerifying
                            ? 'border-[#126BEB] focus:ring-[#126BEB]/20'
                            : verificationError
                            ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                            : 'border-slate-200 dark:border-slate-700 focus:border-[#126BEB] focus:ring-[#126BEB]/20'
                        }`}
                        required
                      />

                      <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center">
                        {isVerifying ? (
                          <span className="h-8 px-2.5 rounded-md bg-blue-500/10 text-[#126BEB] dark:text-[#38BDF8] text-xs font-semibold flex items-center gap-1.5">
                            <RotateCw className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                            <span>Verifying</span>
                          </span>
                        ) : verifiedMeter ? (
                          <span className="h-8 px-2.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                            <span>Verified</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={handleVerifyMeter}
                            disabled={meterNumber.length < 8}
                            className="h-8 px-3 rounded-md bg-[#126BEB] hover:bg-[#0B5CC7] text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            Verify
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Concise inline verification retry state (detail also surfaces via toast) */}
                    {verificationError && !isVerifying && !verifiedMeter && (
                      <div className="flex items-center justify-between gap-2 text-xs text-red-600 dark:text-red-400 pt-0.5">
                        <span className="flex items-center gap-1.5 truncate">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                          <span className="truncate">{verificationError}</span>
                        </span>
                        <button
                          type="button"
                          onClick={handleVerifyMeter}
                          className="font-semibold underline hover:no-underline shrink-0 cursor-pointer"
                        >
                          Retry
                        </button>
                      </div>
                    )}

                    {/* Meter Type Mismatch Notice & Switch */}
                    {meterMismatch && selectedDisco && (
                      <div className="p-3.5 rounded-lg bg-amber-500/10 dark:bg-amber-950/35 border border-amber-500/30 text-xs space-y-2.5">
                        <div className="flex items-start gap-2.5">
                          <ArrowRightLeft className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" aria-hidden="true" />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-amber-900 dark:text-amber-200">
                              Meter registered as {meterMismatch.detectedMeterType}
                            </p>
                            <p className="text-[11px] text-amber-800/90 dark:text-amber-300/90 mt-0.5">
                              {meterMismatch.customerName
                                ? `#${meterMismatch.meterNumber} (${meterMismatch.customerName}) belongs to ${selectedDisco.shortName} ${meterMismatch.detectedMeterType}.`
                                : meterMismatch.responseMessage}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleSwitchMeterType(meterMismatch)}
                          className="w-full h-9 px-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition-colors cursor-pointer"
                        >
                          Switch to {selectedDisco.shortName} {meterMismatch.detectedMeterType}
                        </button>
                      </div>
                    )}

                    {/* Verified Customer Information */}
                    {verifiedMeter && (
                      <div className="p-3 rounded-lg bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-500/30 text-xs space-y-1">
                        <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>{verifiedMeter.customerName || 'Verified Meter'}</span>
                        </div>
                        {verifiedMeter.customerAddress && (
                          <p className="text-slate-600 dark:text-slate-300 text-[11px] line-clamp-2">
                            {verifiedMeter.customerAddress}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 2. Amount */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <label
                        htmlFor="electricity-amount-input"
                        className="text-xs font-semibold text-slate-700 dark:text-slate-300"
                      >
                        Amount (₦) <span aria-hidden="true" className="text-red-500">*</span>
                      </label>
                      <span className="text-[11px] text-slate-400 dark:text-slate-500">
                        ₦{effectiveMinAmount.toLocaleString()} – ₦100,000
                      </span>
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {dynamicPresetAmounts.map((val) => {
                        const isActive = numericAmount === val;
                        return (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setAmount(val.toString())}
                            aria-pressed={isActive}
                            className={`min-h-[44px] px-2 rounded-lg text-xs sm:text-sm font-semibold tabular-nums border transition-colors cursor-pointer ${
                              isActive
                                ? 'bg-[#126BEB] text-white border-[#126BEB]'
                                : 'bg-slate-50/70 dark:bg-[#070D18] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                            }`}
                          >
                            ₦{val >= 1000 ? `${val / 1000}k` : val}
                          </button>
                        );
                      })}
                    </div>

                    <div className="relative">
                      <span
                        aria-hidden="true"
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-slate-400 select-none"
                      >
                        ₦
                      </span>
                      <input
                        id="electricity-amount-input"
                        type="number"
                        inputMode="decimal"
                        placeholder="Enter amount"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        min={effectiveMinAmount}
                        max={100000}
                        className="w-full h-11 pl-8 pr-3.5 rounded-lg bg-white dark:bg-[#070D18] border border-slate-200 dark:border-slate-700 focus:border-[#126BEB] focus:ring-2 focus:ring-[#126BEB]/20 text-slate-900 dark:text-white text-sm sm:text-base font-semibold tabular-nums placeholder:text-slate-400 placeholder:font-normal focus:outline-none transition-colors"
                        required
                      />
                    </div>

                    {numericAmount > 0 && amountToDebit > walletBalance && (
                      <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 rounded-lg px-3 py-2">
                        Amount exceeds your current wallet balance.
                      </p>
                    )}
                  </div>

                  {/* 3. Customer Phone (Optional) */}
                  <div className="space-y-1.5">
                    <label
                      htmlFor="electricity-phone-input"
                      className="text-xs font-semibold text-slate-700 dark:text-slate-300 block"
                    >
                      Phone Number <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <input
                      id="electricity-phone-input"
                      type="tel"
                      inputMode="tel"
                      placeholder="e.g. 08012345678"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full h-11 px-3.5 rounded-lg bg-white dark:bg-[#070D18] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm font-mono placeholder:text-slate-400 placeholder:font-sans focus:outline-none focus:border-[#126BEB] focus:ring-2 focus:ring-[#126BEB]/20 transition-colors"
                    />
                  </div>

                  {/* 4. Payment Summary */}
                  <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-[#070D18] border border-slate-200 dark:border-slate-800 text-xs space-y-2">
                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                      <span>Amount</span>
                      <span className="font-semibold text-slate-900 dark:text-white tabular-nums">
                        {numericAmount > 0 ? `₦${numericAmount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}` : '₦0.00'}
                      </span>
                    </div>

                    {discountAmount > 0 && selectedDisco.discountBps > 0 && (
                      <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                        <span>Discount ({(selectedDisco.discountBps / 100).toFixed(1)}%)</span>
                        <span className="font-semibold tabular-nums">
                          -₦{discountAmount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}

                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-slate-900 dark:text-white font-semibold">
                      <span>Total Debit</span>
                      <span className="font-bold text-[#126BEB] dark:text-[#38BDF8] tabular-nums">
                        {numericAmount > 0 ? `₦${amountToDebit.toLocaleString('en-NG', { minimumFractionDigits: 2 })}` : '—'}
                      </span>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-11 px-4 rounded-lg bg-[#126BEB] hover:bg-[#0B5CC7] active:bg-[#094bb5] text-white font-semibold text-sm transition-colors flex items-center justify-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {selectedDisco.meterType === 'PREPAID'
                      ? numericAmount > 0
                        ? `Buy ₦${numericAmount.toLocaleString()} Token`
                        : 'Buy Token'
                      : numericAmount > 0
                      ? `Pay ₦${numericAmount.toLocaleString()} Bill`
                      : 'Pay Bill'}
                  </button>
              </form>
            </div>
          )}
        </>
      )}
    </main>
      </div>

      {/* CONFIRMATION MODAL */}
      <ModalDialog
        isOpen={Boolean(isConfirmModalOpen && selectedDisco && !isSubmitting)}
        onClose={() => setIsConfirmModalOpen(false)}
        dismissible={!isSubmitting}
        ariaLabel="Confirm Electricity Purchase"
        maxWidthClass="max-w-sm"
        className="dark:bg-[#0B1528] text-slate-900 dark:text-white"
      >
        {selectedDisco && (
          <div className="p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Confirm Electricity Purchase
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
                      src={selectedDisco.logo}
                      alt={selectedDisco.shortName}
                      width={18}
                      height={18}
                      className="object-contain"
                    />
                  </span>
                  <span>{selectedDisco.shortName} ({selectedDisco.meterType})</span>
                </dd>
              </div>
              <div className="flex justify-between items-center">
                <dt className="text-slate-500 dark:text-slate-400">Meter Number</dt>
                <dd className="font-mono font-semibold text-slate-900 dark:text-white">
                  {meterNumber}
                </dd>
              </div>
              <div className="flex justify-between items-center gap-3">
                <dt className="text-slate-500 dark:text-slate-400 shrink-0">Customer</dt>
                <dd className="font-semibold text-slate-900 dark:text-white uppercase text-right truncate">
                  {verifiedMeter?.customerName || 'Verified Meter'}
                </dd>
              </div>
              <div className="flex justify-between items-center">
                <dt className="text-slate-500 dark:text-slate-400">Amount</dt>
                <dd className="font-semibold text-slate-900 dark:text-white tabular-nums">
                  ₦{numericAmount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                </dd>
              </div>
              {selectedDisco.discountBps > 0 && discountAmount > 0 && (
                <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400">
                  <dt>Discount ({(selectedDisco.discountBps / 100).toFixed(1)}%)</dt>
                  <dd className="font-semibold tabular-nums">
                    -₦{discountAmount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                  </dd>
                </div>
              )}
              <div className="flex justify-between items-center pt-2.5 border-t border-slate-100 dark:border-slate-800/80">
                <dt className="font-semibold text-slate-900 dark:text-white">Total Debit</dt>
                <dd className="font-bold text-[#126BEB] dark:text-[#38BDF8] text-base tabular-nums">
                  ₦{amountToDebit.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
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
                onClick={handleExecutePurchase}
                disabled={isSubmitting}
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

      {/* ELECTRICITY RECEIPT & TOKEN MODAL */}
      <ElectricityReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        receipt={receiptData}
        onVendAnother={() => {
          setIsReceiptModalOpen(false);
          setMeterNumber('');
          setAmount('');
          setVerifiedMeter(null);
          setMeterMismatch(null);
          setVerificationError(null);
          lastVerifiedKeyRef.current = '';
          void loadWallets();
        }}
        onStatusUpdated={(updated) => {
          setReceiptData(updated);
          void loadWallets();
        }}
      />

      {/* KYC UPGRADE MODAL */}
      <KycModal
        isOpen={isKycModalOpen}
        onClose={() => setIsKycModalOpen(false)}
        onSuccess={() => {
          setKycStatus('VERIFIED');
          setIsKycModalOpen(false);
          try {
            const raw = localStorage.getItem('bx_user');
            if (raw) {
              localStorage.setItem(
                'bx_user',
                JSON.stringify({ ...JSON.parse(raw), kycStatus: 'VERIFIED' }),
              );
            }
          } catch {}
        }}
        userFirstName={userFirstName}
        userLastName={userLastName}
      />
    </div>
  );
}
