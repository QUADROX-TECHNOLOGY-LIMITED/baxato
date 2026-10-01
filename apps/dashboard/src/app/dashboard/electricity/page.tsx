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
  Copy,
  Check,
  ArrowRight,
  ShieldCheck,
  RotateCw,
  Sparkles,
} from 'lucide-react';
import Sidebar from '@/components/dashboard/Sidebar';
import Header from '@/components/dashboard/Header';
import KycBanner from '@/components/dashboard/KycBanner';
import KycModal from '@/components/dashboard/KycModal';
import ElectricityReceiptModal, {
  ElectricityReceiptData,
} from '@/components/dashboard/ElectricityReceiptModal';

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
    discountBps: 120,
    minAmountNaira: 1000,
  },
  {
    id: 'IBEDC_POSTPAID',
    code: 'IBEDC',
    name: 'Ibadan Electricity Distribution Co.',
    shortName: 'IBEDC',
    meterType: 'POSTPAID',
    logo: '/logos/electricity/ibedc.png',
    coverage: 'Oyo, Ogun, Osun, Kwara, Niger, Kogi',
    discountBps: 120,
    minAmountNaira: 1000,
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
    discountBps: 120,
    minAmountNaira: 1000,
  },
  {
    id: 'IKEDC_POSTPAID',
    code: 'IKEDC',
    name: 'Ikeja Electric',
    shortName: 'IKEDC',
    meterType: 'POSTPAID',
    logo: '/logos/electricity/ikedc.png',
    coverage: 'Lagos Mainland, Ikorodu, Ikeja, Oshodi',
    discountBps: 120,
    minAmountNaira: 1000,
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
    discountBps: 120,
    minAmountNaira: 1000,
  },
  {
    id: 'EKEDC_POSTPAID',
    code: 'EKEDC',
    name: 'Eko Electricity Distribution Co.',
    shortName: 'EKEDC',
    meterType: 'POSTPAID',
    logo: '/logos/electricity/ekedc.png',
    coverage: 'Lagos Island, Lekki, VI, Apapa, Festac',
    discountBps: 120,
    minAmountNaira: 1000,
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
    discountBps: 120,
    minAmountNaira: 1000,
  },
  {
    id: 'AEDC_POSTPAID',
    code: 'AEDC',
    name: 'Abuja Electricity Distribution Co.',
    shortName: 'AEDC',
    meterType: 'POSTPAID',
    logo: '/logos/electricity/aedc.png',
    coverage: 'FCT Abuja, Nasarawa, Kogi, Niger',
    discountBps: 120,
    minAmountNaira: 1000,
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
    discountBps: 120,
    minAmountNaira: 1000,
  },
  {
    id: 'EEDC_POSTPAID',
    code: 'EEDC',
    name: 'Enugu Electricity Distribution Co.',
    shortName: 'EEDC',
    meterType: 'POSTPAID',
    logo: '/logos/electricity/eedc.png',
    coverage: 'Enugu, Abia, Imo, Anambra, Ebonyi',
    discountBps: 120,
    minAmountNaira: 1000,
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
    discountBps: 120,
    minAmountNaira: 1000,
  },
  {
    id: 'PHED_POSTPAID',
    code: 'PHED',
    name: 'Port Harcourt Electricity Distribution',
    shortName: 'PHED',
    meterType: 'POSTPAID',
    logo: '/logos/electricity/phed.png',
    coverage: 'Rivers, Bayelsa, Cross River, Akwa Ibom',
    discountBps: 120,
    minAmountNaira: 1000,
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
    discountBps: 120,
    minAmountNaira: 1000,
  },
  {
    id: 'KEDCO_POSTPAID',
    code: 'KEDCO',
    name: 'Kano Electricity Distribution Co.',
    shortName: 'KEDCO',
    meterType: 'POSTPAID',
    logo: '/logos/electricity/kedco.png',
    coverage: 'Kano, Katsina, Jigawa',
    discountBps: 120,
    minAmountNaira: 1000,
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
    discountBps: 120,
    minAmountNaira: 1000,
  },
  {
    id: 'KAEDCO_POSTPAID',
    code: 'KAEDCO',
    name: 'Kaduna Electric',
    shortName: 'KAEDCO',
    meterType: 'POSTPAID',
    logo: '/logos/electricity/kaedco.png',
    coverage: 'Kaduna, Kebbi, Sokoto, Zamfara',
    discountBps: 120,
    minAmountNaira: 1000,
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
    discountBps: 120,
    minAmountNaira: 1000,
  },
  {
    id: 'JED_POSTPAID',
    code: 'JED',
    name: 'Jos Electricity Distribution Co.',
    shortName: 'JED',
    meterType: 'POSTPAID',
    logo: '/logos/electricity/jed.png',
    coverage: 'Plateau, Bauchi, Benue, Gombe',
    discountBps: 120,
    minAmountNaira: 1000,
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
    discountBps: 120,
    minAmountNaira: 1000,
  },
  {
    id: 'BEDC_POSTPAID',
    code: 'BEDC',
    name: 'Benin Electricity Distribution Co.',
    shortName: 'BEDC',
    meterType: 'POSTPAID',
    logo: '/logos/electricity/bedc.png',
    coverage: 'Edo, Delta, Ondo, Ekiti',
    discountBps: 120,
    minAmountNaira: 1000,
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
    discountBps: 120,
    minAmountNaira: 1000,
  },
  {
    id: 'YEDC_POSTPAID',
    code: 'YEDC',
    name: 'Yola Electricity Distribution Co.',
    shortName: 'YEDC',
    meterType: 'POSTPAID',
    logo: '/logos/electricity/yedc.png',
    coverage: 'Adamawa, Borno, Taraba, Yobe',
    discountBps: 120,
    minAmountNaira: 1000,
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
    discountBps: 120,
    minAmountNaira: 1000,
  },
  {
    id: 'ABA_POSTPAID',
    code: 'APLE',
    name: 'Aba Power Electric (APLE)',
    shortName: 'ABA Power',
    meterType: 'POSTPAID',
    logo: '/logos/electricity/aba.png',
    coverage: 'Aba Ringfenced Area, Abia State',
    discountBps: 120,
    minAmountNaira: 1000,
  },
];

const PRESET_AMOUNTS = [1000, 2000, 5000, 10000, 20000, 50000];

interface VerifiedMeter {
  meterNumber: string;
  customerName?: string;
  customerAddress?: string;
  outstandingBalanceNaira?: number;
  disco: string;
  meterType: MeterType;
}

export default function ElectricityPage() {
  // Navigation & User State
  const [merchantName, setMerchantName] = useState('Merchant');
  const [businessName, setBusinessName] = useState('My Business');
  const [kycStatus, setKycStatus] = useState('UNVERIFIED');
  const [isKycModalOpen, setIsKycModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [isLoadingBalance, setIsLoadingBalance] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

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
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const autoVerifyTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastVerifiedKeyRef = useRef<string>('');

  // Purchase & Modals State
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [receiptData, setReceiptData] = useState<ElectricityReceiptData | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // History State
  const [historyList, setHistoryList] = useState<any[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [copiedTokenRef, setCopiedTokenRef] = useState<string | null>(null);

  const isVerified = kycStatus === 'VERIFIED';

  // Load Balance & Profile
  const loadWallets = async () => {
    try {
      setIsLoadingBalance(true);
      const authToken = localStorage.getItem('bx_auth_token') || '';
      if (!authToken) {
        setIsLoadingBalance(false);
        return;
      }

      const res = await fetch('/api/wallets', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.data?.wallets)) {
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

  // Load Electricity History
  const loadHistory = async () => {
    try {
      setIsLoadingHistory(true);
      const authToken = localStorage.getItem('bx_auth_token') || '';
      if (!authToken) return;

      const res = await fetch('/api/services/electricity/history?limit=25', {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.data?.transactions)) {
        setHistoryList(data.data.transactions);
      }
    } catch {
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadWallets();
    loadHistory();

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

    try {
      const storedUser = localStorage.getItem('bx_user');
      const storedBiz = localStorage.getItem('bx_business');

      if (storedUser) {
        const u = JSON.parse(storedUser);
        if (u.firstName) setMerchantName(u.firstName);
        if (u.phone) setCustomerPhone(u.phone);
        if (u.kycStatus) setKycStatus(u.kycStatus);
      }

      if (storedBiz) {
        const b = JSON.parse(storedBiz);
        if (b.name) setBusinessName(b.name);
      }
    } catch {}

    return () => {
      if (autoVerifyTimeoutRef.current) {
        clearTimeout(autoVerifyTimeoutRef.current);
      }
    };
  }, []);

  const handleRefreshBalance = async () => {
    setIsRefreshing(true);
    await Promise.all([loadWallets(), loadHistory()]);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  // Selected Option Object (null when viewing all billers catalog)
  const selectedDisco = useMemo(() => {
    if (!selectedOptionId) return null;
    return ALL_DISCOS.find((d) => d.id === selectedOptionId) || null;
  }, [selectedOptionId]);

  // Filtered DISCOs for Catalog View
  const filteredDiscos = useMemo(() => {
    return ALL_DISCOS.filter((d) => {
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
  }, [filterType, searchQuery]);

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

    setIsVerifying(true);
    setVerificationError(null);
    setSubmitError(null);

    try {
      const authToken = localStorage.getItem('bx_auth_token') || '';
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
      });

      const data = await res.json();
      if (!res.ok || !data.success || !data.data?.isValid) {
        throw new Error(
          data.data?.responseMessage ||
          data.error?.message ||
          'Meter verification failed. Please verify the meter number with the selected provider.'
        );
      }

      const info = data.data;
      setVerifiedMeter({
        meterNumber: info.meterNumber || cleanMeter,
        customerName: info.customerName || undefined,
        customerAddress: info.customerAddress || undefined,
        outstandingBalanceNaira: info.outstandingBalanceNaira || 0,
        disco: targetDisco.shortName,
        meterType: targetDisco.meterType,
      });
      lastVerifiedKeyRef.current = verificationKey;
    } catch (err: any) {
      setVerificationError(err.message || 'Unable to verify meter with electricity company.');
      setVerifiedMeter(null);
      lastVerifiedKeyRef.current = '';
    } finally {
      setIsVerifying(false);
    }
  };

  // Navigate into Dedicated Biller Page
  const handleSelectBiller = (option: DiscoOption) => {
    setSelectedOptionId(option.id);
    setMeterNumber('');
    setAmount('');
    setVerifiedMeter(null);
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
    setVerificationError(null);
    setSubmitError(null);
    lastVerifiedKeyRef.current = '';

    if (autoVerifyTimeoutRef.current) {
      clearTimeout(autoVerifyTimeoutRef.current);
      autoVerifyTimeoutRef.current = null;
    }

    // Auto-verify triggered upon reaching standard Nigerian STS meter limit (11 digits, or 10-13)
    if (selectedDisco && (clean.length === 11 || (clean.length >= 10 && clean.length <= 13))) {
      autoVerifyTimeoutRef.current = setTimeout(() => {
        executeMeterVerification(clean, selectedDisco);
      }, 350);
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

    if (numericAmount < selectedDisco.minAmountNaira) {
      setSubmitError(`Minimum purchase amount for ${selectedDisco.shortName} is ₦${selectedDisco.minAmountNaira.toLocaleString()}.`);
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
      const authToken = localStorage.getItem('bx_auth_token') || '';
      if (!authToken) {
        throw new Error('Your session has expired. Please sign in again.');
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

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Transaction could not be completed.');
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
      loadHistory();
    } catch (err: any) {
      setSubmitError(err.message || 'Payment failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyHistoryToken = (token: string, ref: string) => {
    navigator.clipboard.writeText(token);
    setCopiedTokenRef(ref);
    setTimeout(() => setCopiedTokenRef(null), 2500);
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-[#070E1C] overflow-hidden">
      {/* Sidebar Navigation */}
      <Sidebar
        businessName={businessName}
        merchantName={merchantName}
        kycStatus={kycStatus}
        onOpenKycModal={() => setIsKycModalOpen(true)}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-72 overflow-y-auto">
        <Header
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onOpenKycModal={() => setIsKycModalOpen(true)}
          merchantName={merchantName}
          kycStatus={kycStatus}
          isRefreshing={isRefreshing}
          onRefresh={handleRefreshBalance}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6">
          {/* Identity Verification Warning Banner */}
          <KycBanner
            kycStatus={kycStatus}
            onOpenKycModal={() => setIsKycModalOpen(true)}
          />

          {/* ======================================================== */}
          {/* VIEW 1: ALL BILLERS CATALOG (Displayed when no DISCO is selected) */}
          {/* ======================================================== */}
          {!selectedDisco ? (
            <div className="space-y-6">
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-amber-500/10 text-amber-500 dark:bg-amber-500/15 dark:text-amber-400 border border-amber-500/20">
                      <Zap className="w-5 h-5" />
                    </div>
                    <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                      Electricity Bill Payment & Tokens
                    </h1>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Select your electricity distribution company to vend prepaid STS tokens or settle postpaid bills
                  </p>
                </div>

                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 text-xs font-medium text-slate-600 dark:text-slate-300 w-fit">
                  <Wallet className="w-4 h-4 text-amber-500" />
                  <span>Settlement Balance:</span>
                  {isLoadingBalance ? (
                    <span className="inline-block w-16 h-3.5 bg-slate-300 dark:bg-slate-700 rounded animate-pulse" />
                  ) : (
                    <span className="font-extrabold text-slate-900 dark:text-white">
                      ₦{walletBalance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                    </span>
                  )}
                </div>
              </div>

              {/* Filters & Search Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-[#0B1528] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
                {/* Tabs */}
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-[#070D18] rounded-xl border border-slate-200 dark:border-slate-800">
                  {(['ALL', 'PREPAID', 'POSTPAID'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setFilterType(t)}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
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
                <div className="relative flex-1 sm:max-w-md">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by DISCO name, acronym or state..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-10 pl-9 pr-4 text-xs rounded-xl bg-slate-50 dark:bg-[#070D18] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#126BEB]"
                  />
                </div>
              </div>

              {/* All Billers Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredDiscos.map((opt) => {
                  const isPrepaid = opt.meterType === 'PREPAID';
                  return (
                    <div
                      key={opt.id}
                      onClick={() => handleSelectBiller(opt)}
                      className="group relative p-4 rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#0B1528] hover:border-[#126BEB] dark:hover:border-[#126BEB] hover:shadow-lg transition-all duration-200 cursor-pointer flex flex-col justify-between"
                    >
                      <div>
                        {/* Top: Logo & Badge */}
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-center justify-center p-1.5 shrink-0 group-hover:scale-105 transition-transform">
                            <Image
                              src={opt.logo}
                              alt={opt.shortName}
                              width={42}
                              height={42}
                              className="object-contain"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          </div>

                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0 ${
                              isPrepaid
                                ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                                : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                            }`}
                          >
                            {opt.meterType}
                          </span>
                        </div>

                        {/* Title & Coverage */}
                        <h3 className="font-extrabold text-sm text-slate-900 dark:text-white group-hover:text-[#126BEB] transition-colors">
                          {opt.shortName}
                        </h3>
                        <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 line-clamp-1">
                          {opt.name}
                        </p>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-2 line-clamp-1">
                          {opt.coverage}
                        </p>
                      </div>

                      {/* Bottom Footer: Cashback & Arrow leading to biller page */}
                      <div className="pt-4 mt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between">
                        <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          1.2% Cashback
                        </span>

                        <span className="inline-flex items-center gap-1 text-xs font-extrabold text-[#126BEB] group-hover:translate-x-1 transition-transform">
                          <span>{isPrepaid ? 'Vend Token' : 'Pay Bill'}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredDiscos.length === 0 && (
                <div className="py-16 text-center text-slate-400 text-sm bg-white dark:bg-[#0B1528] rounded-2xl border border-slate-200 dark:border-slate-800">
                  No electricity distribution company matches &quot;{searchQuery}&quot;.
                </div>
              )}
            </div>
          ) : (
            /* ======================================================== */
            /* VIEW 2: DEDICATED BILLER PAGE (e.g. IBEDC Prepaid Page) */
            /* ======================================================== */
            <div className="space-y-6 max-w-4xl mx-auto">
              {/* Back to All Providers Navigation Bar */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={handleBackToCatalog}
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-[#126BEB] hover:text-[#126BEB] dark:hover:text-[#126BEB] transition-all shadow-xs cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4 text-slate-500" />
                  <span>Back to All Electricity Providers</span>
                </button>

                <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 text-xs font-medium text-slate-600 dark:text-slate-300">
                  <Wallet className="w-3.5 h-3.5 text-amber-500" />
                  <span>Balance:</span>
                  <span className="font-extrabold text-slate-900 dark:text-white">
                    ₦{walletBalance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Dedicated Biller Hero Banner */}
              <div className="p-6 rounded-2xl bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center p-2 shrink-0">
                    <Image
                      src={selectedDisco.logo}
                      alt={selectedDisco.shortName}
                      width={48}
                      height={48}
                      className="object-contain"
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                        {selectedDisco.name}
                      </h1>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                          selectedDisco.meterType === 'PREPAID'
                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                            : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                        }`}
                      >
                        {selectedDisco.meterType}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Coverage: {selectedDisco.coverage}
                    </p>
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100 dark:border-slate-800">
                  <span className="px-2.5 py-1 rounded-full text-xs font-extrabold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    1.2% Merchant Cashback
                  </span>
                  <span className="text-[11px] text-slate-400">Instant Settlement</span>
                </div>
              </div>

              {/* Dedicated Focused Vending Form Card */}
              <div className="bg-white dark:bg-[#0B1528] rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm">
                <form onSubmit={handleOpenConfirm} className="space-y-6">
                  
                  {/* 1. METER NUMBER INPUT WITH AUTO-VERIFICATION ON 11 DIGITS */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                        {selectedDisco.meterType === 'PREPAID' ? 'Prepaid Meter Number' : 'Postpaid Account Number'}
                      </label>
                      <span className="text-[11px] text-slate-400 font-medium">Standard 11 digits</span>
                    </div>

                    <div className="relative">
                      <input
                        type="text"
                        placeholder="e.g. 04218392193"
                        value={meterNumber}
                        onChange={(e) => handleMeterChange(e.target.value)}
                        maxLength={13}
                        className={`w-full h-12 pl-4 pr-32 rounded-xl bg-slate-50 dark:bg-[#070D18] border text-slate-900 dark:text-white text-base font-mono font-bold placeholder:text-slate-400 placeholder:font-sans focus:outline-none transition-all shadow-xs ${
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
                      <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center">
                        {isVerifying ? (
                          <div className="h-8 px-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-[#126BEB] dark:text-blue-400 text-xs font-bold flex items-center gap-1.5 shadow-xs">
                            <RotateCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Verifying...</span>
                          </div>
                        ) : verifiedMeter ? (
                          <div className="h-8 px-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-1.5 shadow-xs">
                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            <span>Verified</span>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={handleVerifyMeter}
                            disabled={meterNumber.length < 8}
                            className="h-8 px-3.5 rounded-lg bg-[#126BEB] hover:bg-[#0B5CC7] text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Verify</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Typing digit counter & auto-verify feedback */}
                    {meterNumber.length > 0 && !verifiedMeter && !isVerifying && !verificationError && (
                      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1 pt-0.5">
                        <span>{meterNumber.length}/11 digits entered</span>
                        {meterNumber.length === 11 ? (
                          <span className="text-[#126BEB] dark:text-blue-400 font-semibold flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5" /> Auto-verifying meter with {selectedDisco.shortName}...
                          </span>
                        ) : (
                          <span className="text-slate-400">Auto-verifies upon 11 digits</span>
                        )}
                      </div>
                    )}

                    {/* Verification Error Alert */}
                    {verificationError && (
                      <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-xs flex items-center justify-between gap-2 animate-in fade-in duration-150">
                        <div className="flex items-center gap-2 min-w-0">
                          <AlertCircle className="w-4 h-4 shrink-0" />
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

                    {/* VERIFIED ACCOUNT INFORMATION CARD (Real customer name returned from DISCO) */}
                    {verifiedMeter && (
                      <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-500/30 text-xs space-y-2 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-extrabold text-[11px] uppercase tracking-wider">
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                          <span>Verified Account Information</span>
                        </div>

                        <div className="pt-1">
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-semibold uppercase">
                            Customer Account
                          </span>
                          <span className="font-extrabold text-slate-900 dark:text-white uppercase text-sm block">
                            {verifiedMeter.customerName || 'Validated & Active Meter'}
                          </span>
                        </div>

                        {verifiedMeter.customerAddress && (
                          <div>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-semibold uppercase">
                              Service Address
                            </span>
                            <span className="text-slate-700 dark:text-slate-300 text-xs">
                              {verifiedMeter.customerAddress}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 2. RECHARGE AMOUNT (EMPTY BY DEFAULT - NEVER AUTO-SELECTED) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                        Recharge Amount (₦)
                      </label>
                      <span className="text-[11px] text-slate-400">Min: ₦{selectedDisco.minAmountNaira.toLocaleString()}</span>
                    </div>

                    <input
                      type="number"
                      placeholder={`Enter amount in ₦ (Min: ₦${selectedDisco.minAmountNaira.toLocaleString()})`}
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      min={selectedDisco.minAmountNaira}
                      max={100000}
                      className="w-full h-12 px-4 rounded-xl bg-slate-50 dark:bg-[#070D18] border border-slate-200 dark:border-slate-700 focus:border-[#126BEB] focus:ring-2 focus:ring-[#126BEB]/20 text-slate-900 dark:text-white text-base font-extrabold placeholder:text-slate-400 placeholder:font-normal focus:outline-none transition-all shadow-xs"
                      required
                    />

                    {/* Preset Chips (Purely optional shortcuts - NONE auto-selected on load) */}
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-1">
                      {PRESET_AMOUNTS.map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setAmount(val.toString())}
                          className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
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

                  {/* 3. CUSTOMER PHONE (OPTIONAL - CONTACT FOR RECEIPT RECORDS) */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                        Customer Mobile Number (Optional)
                      </label>
                      <span className="text-[10px] text-slate-400">For transaction receipt</span>
                    </div>
                    <input
                      type="tel"
                      placeholder="e.g. 08012345678"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full h-11 px-4 rounded-xl bg-slate-50 dark:bg-[#070D18] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-mono font-bold placeholder:text-slate-400 placeholder:font-sans focus:outline-none focus:border-[#126BEB] focus:ring-2 focus:ring-[#126BEB]/20 transition-all shadow-xs"
                    />
                    <p className="text-[11px] text-slate-400">
                      Optional contact number for receipt generation and provider records.
                    </p>
                  </div>

                  {/* 4. FINANCIAL SUMMARY */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#070D18] border border-slate-200 dark:border-slate-800 text-xs space-y-2">
                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                      <span>Recharge Face Value</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        {numericAmount > 0 ? `₦${numericAmount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}` : '₦0.00'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400">
                      <span className="flex items-center gap-1 font-semibold">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Merchant Cashback (1.2%)</span>
                      </span>
                      <span className="font-bold">
                        {numericAmount > 0 ? `-₦${discountAmount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}` : '—'}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-slate-900 dark:text-white font-black text-sm">
                      <span>Amount to Debit Wallet</span>
                      <span className="text-[#126BEB] dark:text-[#38BDF8]">
                        {numericAmount > 0 ? `₦${amountToDebit.toLocaleString('en-NG', { minimumFractionDigits: 2 })}` : '—'}
                      </span>
                    </div>
                  </div>

                  {/* SUBMIT BUTTON */}
                  <button
                    type="submit"
                    disabled={isSubmitting || !verifiedMeter || !numericAmount || numericAmount < selectedDisco.minAmountNaira || amountToDebit > walletBalance}
                    className="w-full h-13 rounded-xl bg-[#126BEB] hover:bg-[#0B5CC7] active:bg-[#094bb5] text-white font-extrabold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-blue-500/20"
                  >
                    {isSubmitting ? (
                      <>
                        <RotateCw className="w-4 h-4 animate-spin" />
                        <span>Processing Transaction...</span>
                      </>
                    ) : !verifiedMeter ? (
                      <span>Verify Meter Number to Proceed</span>
                    ) : !numericAmount ? (
                      <span>Enter Recharge Amount to Proceed</span>
                    ) : (
                      <>
                        <Zap className="w-4 h-4" />
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
                    <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{submitError}</span>
                    </div>
                  )}
                </form>
              </div>
            </div>
          )}

          {/* ======================================================== */}
          {/* ELECTRICITY TRANSACTION HISTORY (Always accessible) */}
          {/* ======================================================== */}
          <div className="bg-white dark:bg-[#0B1528] rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-black text-slate-900 dark:text-white">
                  Recent Electricity Transactions
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Audit log of STS prepaid tokens generated & postpaid bill payments
                </p>
              </div>

              <button
                type="button"
                onClick={loadHistory}
                disabled={isLoadingHistory}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                title="Refresh History"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingHistory ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                    <th className="pb-2.5">Date</th>
                    <th className="pb-2.5">DISCO</th>
                    <th className="pb-2.5">Meter Number</th>
                    <th className="pb-2.5">Consumer</th>
                    <th className="pb-2.5">Amount</th>
                    <th className="pb-2.5">Token Generated</th>
                    <th className="pb-2.5">Status</th>
                    <th className="pb-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {historyList.map((tx) => {
                    const isSuccess = tx.status === 'SUCCESSFUL';
                    const isProcessing = tx.status === 'PROCESSING' || tx.status === 'PENDING';
                    const cleanToken = tx.token?.replace(/\D/g, '') || '';
                    const isCopied = copiedTokenRef === tx.reference;

                    return (
                      <tr key={tx.transactionId || tx.reference} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                        <td className="py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          {tx.createdAt ? new Date(tx.createdAt).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}
                        </td>
                        <td className="py-3 font-semibold text-slate-800 dark:text-slate-200">
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-bold mr-1.5 text-[10px]">
                            {tx.disco}
                          </span>
                          <span className="text-[10px] text-slate-400">{tx.meterType}</span>
                        </td>
                        <td className="py-3 font-mono font-bold text-slate-900 dark:text-white">
                          {tx.meterNumber}
                        </td>
                        <td className="py-3 text-slate-700 dark:text-slate-300 max-w-[140px] truncate">
                          {tx.customerName || 'Consumer'}
                        </td>
                        <td className="py-3 font-bold text-slate-900 dark:text-white">
                          ₦{parseFloat(tx.faceAmountNaira || 0).toLocaleString()}
                        </td>
                        <td className="py-3">
                          {cleanToken ? (
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-extrabold text-amber-600 dark:text-amber-400 tracking-wider">
                                {cleanToken.slice(0, 4)}••••{cleanToken.slice(-4)}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopyHistoryToken(cleanToken, tx.reference)}
                                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                                title="Copy Full Token"
                              >
                                {isCopied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                              </button>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">
                              {isProcessing ? 'Generating...' : 'None'}
                            </span>
                          )}
                        </td>
                        <td className="py-3">
                          {isSuccess && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] border border-emerald-500/20">
                              SUCCESS
                            </span>
                          )}
                          {isProcessing && (
                            <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-[10px] border border-amber-500/20 animate-pulse">
                              PROCESSING
                            </span>
                          )}
                          {!isSuccess && !isProcessing && (
                            <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 font-bold text-[10px] border border-rose-500/20">
                              {tx.status}
                            </span>
                          )}
                        </td>
                        <td className="py-3 text-right">
                          <button
                            type="button"
                            onClick={() => {
                              setReceiptData({
                                transactionId: tx.transactionId || tx.reference,
                                reference: tx.reference,
                                clientReference: tx.clientReference,
                                status: tx.status,
                                disco: tx.disco,
                                discoName: tx.discoName || tx.disco,
                                meterNumber: tx.meterNumber,
                                meterType: tx.meterType,
                                customerName: tx.customerName,
                                customerAddress: tx.customerAddress,
                                token: tx.token,
                                units: tx.units,
                                faceAmountNaira: parseFloat(tx.faceAmountNaira || 0),
                                discountNaira: parseFloat(tx.discountNaira || 0),
                                amountDebitedNaira: parseFloat(tx.amountDebitedNaira || 0),
                                date: tx.createdAt ? new Date(tx.createdAt).toLocaleString('en-NG') : new Date().toLocaleString(),
                              });
                              setIsReceiptModalOpen(true);
                            }}
                            className="text-[11px] font-bold text-[#126BEB] dark:text-[#38BDF8] hover:underline cursor-pointer"
                          >
                            View Slip
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {historyList.length === 0 && !isLoadingHistory && (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No electricity transactions recorded yet.
                </div>
              )}
            </div>
          </div>
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
