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
  Receipt,
  RotateCw,
  ChevronRight,
  Clock,
  Sparkles,
  Info,
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
    name: 'Port Harcourt Electricity Distribution Co.',
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
    name: 'Port Harcourt Electricity Distribution Co.',
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
    coverage: 'Kaduna, Sokoto, Kebbi, Zamfara',
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
    coverage: 'Kaduna, Sokoto, Kebbi, Zamfara',
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

  // 12. APLE
  {
    id: 'APLE_PREPAID',
    code: 'APLE',
    name: 'Aba Power Electric',
    shortName: 'APLE',
    meterType: 'PREPAID',
    logo: '/logos/electricity/aple.png',
    coverage: 'Aba, Abia State Ring-fence',
    discountBps: 120,
    minAmountNaira: 1000,
  },
  {
    id: 'APLE_POSTPAID',
    code: 'APLE',
    name: 'Aba Power Electric',
    shortName: 'APLE',
    meterType: 'POSTPAID',
    logo: '/logos/electricity/aple.png',
    coverage: 'Aba, Abia State Ring-fence',
    discountBps: 120,
    minAmountNaira: 1000,
  },
];

const PRESET_AMOUNTS = [1000, 2000, 3000, 5000, 10000, 20000];

interface VerifiedMeter {
  meterNumber: string;
  customerName: string;
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
  const [selectedOptionId, setSelectedOptionId] = useState<string>('IBEDC_PREPAID');

  // Vending Form State
  const [meterNumber, setMeterNumber] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [amount, setAmount] = useState('2000');

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

      const res = await fetch('/api/services/electricity/history?limit=15', {
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

  // Selected Option Object
  const selectedDisco = useMemo(() => {
    return ALL_DISCOS.find((d) => d.id === selectedOptionId) || ALL_DISCOS[0];
  }, [selectedOptionId]);

  // Filtered DISCOs
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
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Meter verification failed. Please verify the meter number.');
      }

      const info = data.data;
      setVerifiedMeter({
        meterNumber: info.meterNumber || cleanMeter,
        customerName: info.customerName || 'VERIFIED CONSUMER',
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

  // Handle DISCO Card Selection: auto-reverify if valid meter number is already typed
  const handleSelectDisco = (option: DiscoOption) => {
    setSelectedOptionId(option.id);
    setVerifiedMeter(null);
    setVerificationError(null);
    setSubmitError(null);
    lastVerifiedKeyRef.current = '';

    if (autoVerifyTimeoutRef.current) {
      clearTimeout(autoVerifyTimeoutRef.current);
      autoVerifyTimeoutRef.current = null;
    }

    // If meter number is already typed to standard length (11 digits or 10-13 digits), auto-verify with newly chosen DISCO
    const clean = meterNumber.replace(/\D/g, '');
    if (clean.length === 11 || (clean.length >= 10 && clean.length <= 13)) {
      autoVerifyTimeoutRef.current = setTimeout(() => {
        executeMeterVerification(clean, option);
      }, 300);
    }
  };

  // Handle Meter Number Change: automatically verify as soon as the meter number reaches the standard limit
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

    // Auto-verify triggered immediately upon reaching standard Nigerian STS meter limit (11 digits or 10-13 digits)
    if (clean.length === 11 || (clean.length >= 10 && clean.length <= 13)) {
      autoVerifyTimeoutRef.current = setTimeout(() => {
        executeMeterVerification(clean, selectedDisco);
      }, 350);
    }
  };

  // Manual Verify Meter Action (or Retry)
  const handleVerifyMeter = () => {
    if (autoVerifyTimeoutRef.current) {
      clearTimeout(autoVerifyTimeoutRef.current);
      autoVerifyTimeoutRef.current = null;
    }
    executeMeterVerification(meterNumber, selectedDisco);
  };

  // Calculations
  const numericAmount = parseFloat(amount) || 0;
  const discountAmount = (numericAmount * selectedDisco.discountBps) / 10000;
  const amountToDebit = Math.max(0, numericAmount - discountAmount);

  // Validate and Open Confirm Modal
  const handleOpenConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!isVerified) {
      setIsKycModalOpen(true);
      return;
    }

    if (!meterNumber || meterNumber.length < 8) {
      setVerificationError('Please enter a valid meter number.');
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
          'x-idempotency-key': clientReference,
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

      const responseText = await res.text();
      let result: any = null;
      try {
        result = JSON.parse(responseText);
      } catch {
        result = {
          success: false,
          error: {
            message: `Server returned an unexpected response (${res.status}: ${res.statusText || 'Error'}). Please try again.`,
          },
        };
      }

      if (!res.ok || !result?.success) {
        const msg = result?.error?.message || result?.message || 'Electricity vending failed. Please try again.';
        throw new Error(msg);
      }

      const data = result.data;
      const receipt: ElectricityReceiptData = {
        transactionId: data.transactionId || clientReference,
        reference: data.reference || data.clientReference || clientReference,
        clientReference,
        status: data.status || 'PROCESSING',
        disco: selectedDisco.code,
        discoName: selectedDisco.name,
        discoLogo: selectedDisco.logo,
        meterNumber: data.meterNumber || meterNumber,
        meterType: selectedDisco.meterType,
        customerName: data.customerName || verifiedMeter?.customerName,
        customerAddress: data.customerAddress || verifiedMeter?.customerAddress,
        token: data.token || undefined,
        units: data.units || undefined,
        unitsCostNaira: data.unitsCostNaira,
        vatNaira: data.vatNaira,
        faceAmountNaira: data.faceAmountNaira || numericAmount,
        discountNaira: data.discountNaira || discountAmount,
        amountDebitedNaira: data.amountDebitedNaira || amountToDebit,
        date: new Date().toLocaleString('en-NG', {
          dateStyle: 'medium',
          timeStyle: 'short',
        }),
      };

      setReceiptData(receipt);
      setIsConfirmModalOpen(false);
      setIsReceiptModalOpen(true);

      // Refresh balance and history in background
      loadWallets();
      loadHistory();
    } catch (err: any) {
      setSubmitError(err.message || 'Transaction could not be completed.');
      setIsConfirmModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyHistoryToken = (token: string, ref: string) => {
    const clean = token.replace(/\s+/g, '');
    navigator.clipboard.writeText(clean);
    setCopiedTokenRef(ref);
    setTimeout(() => setCopiedTokenRef(null), 2000);
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] dark:bg-[#030816] text-slate-900 dark:text-slate-100 overflow-hidden font-sans">
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
          
          {/* Back Navigation Bar */}
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

          {/* Page Heading & Compact Balance */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-amber-500/10 text-amber-500 dark:bg-amber-500/15 dark:text-amber-400 border border-amber-500/20">
                  <Zap className="w-4 h-4" />
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                  Electricity Token Vending
                </h1>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Instant STS meter token generation & postpaid billing across all 12 Nigerian DISCOs
              </p>
            </div>

            {/* Compact Balance Indicator */}
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700/80 text-xs font-medium text-slate-600 dark:text-slate-300 w-fit">
              <Wallet className="w-3.5 h-3.5 text-amber-500" />
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

          {/* TWO-COLUMN GRID: DISCO SELECTOR & PURCHASE FORM */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* LEFT COLUMN: DISCO COMPANY CARDS (7 Cols) */}
            <div className="lg:col-span-7 bg-white dark:bg-[#0B1528] rounded-2xl p-5 border border-slate-200 dark:border-slate-800/80 shadow-xs space-y-4">
              
              {/* DISCO Controls & Filter Tabs */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                {/* Filter Tabs: ALL, PREPAID, POSTPAID */}
                <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-[#070D18] rounded-xl border border-slate-200 dark:border-slate-800">
                  {(['ALL', 'PREPAID', 'POSTPAID'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setFilterType(t)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        filterType === t
                          ? 'bg-white dark:bg-[#126BEB] text-slate-900 dark:text-white shadow-xs'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {t === 'ALL' && 'All Companies'}
                      {t === 'PREPAID' && 'Prepaid Tokens'}
                      {t === 'POSTPAID' && 'Postpaid Bills'}
                    </button>
                  ))}
                </div>

                {/* Search DISCO */}
                <div className="relative flex-1 sm:max-w-xs">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by DISCO or State..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-9 pl-8 pr-3 text-xs rounded-xl bg-slate-50 dark:bg-[#070D18] border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#126BEB]"
                  />
                </div>
              </div>

              {/* DISCO Listing Grid (Prepaid & Postpaid Listed as Individual Cards) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[520px] overflow-y-auto pr-1">
                {filteredDiscos.map((opt) => {
                  const isSelected = selectedOptionId === opt.id;
                  const isPrepaid = opt.meterType === 'PREPAID';

                  return (
                    <div
                      key={opt.id}
                      onClick={() => handleSelectDisco(opt)}
                      className={`relative p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 text-left ${
                        isSelected
                          ? 'border-[#126BEB] ring-2 ring-[#126BEB]/20 bg-blue-50/50 dark:bg-[#126BEB]/10'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#070E1C] hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      {/* Logo Icon */}
                      <div className="w-10 h-10 rounded-lg overflow-hidden shrink-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center p-1">
                        <Image
                          src={opt.logo}
                          alt={opt.shortName}
                          width={36}
                          height={36}
                          className="object-contain"
                          onError={(e) => {
                            // Fallback to text icon if image fails
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      </div>

                      {/* Text Details */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-extrabold text-xs text-slate-900 dark:text-white truncate">
                            {opt.shortName}
                          </span>
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

                        <p className="text-[11px] text-slate-600 dark:text-slate-300 truncate mt-0.5">
                          {opt.name}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">
                          {opt.coverage}
                        </p>
                      </div>

                      {/* Selected Radio Dot */}
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                          isSelected
                            ? 'border-[#126BEB] bg-[#126BEB]'
                            : 'border-slate-300 dark:border-slate-600'
                        }`}
                      >
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </div>
                  );
                })}
              </div>

              {filteredDiscos.length === 0 && (
                <div className="py-12 text-center text-slate-400 text-xs">
                  No electricity distribution company matches &quot;{searchQuery}&quot;.
                </div>
              )}
            </div>

            {/* RIGHT COLUMN: VENDING & VERIFICATION FORM (5 Cols) */}
            <div className="lg:col-span-5 bg-white dark:bg-[#0B1528] rounded-2xl p-5 border border-slate-200 dark:border-slate-800/80 shadow-xs space-y-5">
              
              {/* Selected DISCO Pill Header */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#070D18] border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center p-1 shrink-0">
                    <Image
                      src={selectedDisco.logo}
                      alt={selectedDisco.shortName}
                      width={28}
                      height={28}
                      className="object-contain"
                    />
                  </div>
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-slate-900 dark:text-white block truncate">
                      {selectedDisco.name}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <span>Instant 1.2% Merchant Cashback</span>
                    </span>
                  </div>
                </div>

                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase shrink-0 ${
                    selectedDisco.meterType === 'PREPAID'
                      ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                      : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                  }`}
                >
                  {selectedDisco.meterType}
                </span>
              </div>

              {/* Form Start */}
              <form onSubmit={handleOpenConfirm} className="space-y-4">
                
                {/* 1. METER NUMBER INPUT WITH INTEGRATED AUTO-VERIFICATION */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                      {selectedDisco.meterType === 'PREPAID' ? 'Prepaid Meter Number' : 'Postpaid Account Number'}
                    </label>
                    <span className="text-[10px] text-slate-400 font-medium">
                      Standard: 11 digits
                    </span>
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

                    {/* Integrated State Action / Button inside Input */}
                    <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center">
                      {isVerifying ? (
                        <div className="h-8 px-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-[#126BEB] dark:text-blue-400 text-xs font-bold flex items-center gap-1.5 shadow-xs">
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
                          className="h-8 px-3 rounded-lg bg-[#126BEB] hover:bg-[#0B5CC7] active:bg-[#094bb5] text-white text-xs font-bold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-xs"
                        >
                          <ShieldCheck className="w-3 h-3" />
                          <span>Verify</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Typing Counter & Auto-Verify Feedback */}
                  {meterNumber.length > 0 && !verifiedMeter && !isVerifying && !verificationError && (
                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 px-1 pt-0.5">
                      <span>
                        {meterNumber.length < 11
                          ? `${meterNumber.length}/11 digits entered`
                          : `${meterNumber.length} digits entered`}
                      </span>
                      {meterNumber.length === 11 ? (
                        <span className="text-[#126BEB] dark:text-blue-400 font-semibold flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> Auto-verifying meter...
                        </span>
                      ) : (
                        <span className="text-slate-400">Auto-verifies when limit reached (11 digits)</span>
                      )}
                    </div>
                  )}

                  {/* Verification Error Alert */}
                  {verificationError && (
                    <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-xs flex items-center justify-between gap-2 animate-in fade-in duration-150">
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

                  {/* VERIFIED CONSUMER DETAILS CARD */}
                  {verifiedMeter && (
                    <div className="p-3.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-500/30 text-xs space-y-1.5 animate-in zoom-in-95 duration-200">
                      <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-extrabold text-[11px] uppercase tracking-wider">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Verified Account Information</span>
                      </div>

                      <div className="pt-1">
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-semibold">
                          Customer Name
                        </span>
                        <span className="font-extrabold text-slate-900 dark:text-white uppercase text-sm block">
                          {verifiedMeter.customerName}
                        </span>
                      </div>

                      {verifiedMeter.customerAddress && (
                        <div>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-semibold">
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

                {/* 2. RECHARGE AMOUNT */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                      Recharge Amount (₦)
                    </label>
                    <span className="text-[10px] text-slate-400">Min: ₦{selectedDisco.minAmountNaira.toLocaleString()}</span>
                  </div>

                  {/* Preset Amount Chips */}
                  <div className="grid grid-cols-3 gap-1.5">
                    {PRESET_AMOUNTS.map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setAmount(val.toString())}
                        className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all cursor-pointer text-center ${
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
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400 select-none">
                      ₦
                    </span>
                    <input
                      type="number"
                      min={selectedDisco.minAmountNaira}
                      max={100000}
                      step="any"
                      placeholder="Enter custom amount"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full h-11 pl-8 pr-4 rounded-xl bg-slate-50 dark:bg-[#070D18] border border-slate-200 dark:border-slate-700 focus:border-[#126BEB] focus:ring-2 focus:ring-[#126BEB]/20 text-slate-900 dark:text-white text-sm font-bold placeholder:text-slate-400 placeholder:font-normal focus:outline-none transition-all shadow-xs"
                      required
                    />
                  </div>

                  {/* Pricing Breakdown Summary */}
                  {numericAmount > 0 && (
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#070D18] border border-slate-200 dark:border-slate-800 text-xs space-y-1">
                      <div className="flex justify-between text-slate-500 dark:text-slate-400">
                        <span>Face Value:</span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300">
                          ₦{numericAmount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                      <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                        <span>Merchant Cashback (1.2%):</span>
                        <span className="font-semibold">-₦{discountAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-slate-900 dark:text-white font-extrabold pt-1 border-t border-slate-200 dark:border-slate-800">
                        <span>Net Debit:</span>
                        <span className="text-sm text-[#126BEB] dark:text-[#38BDF8]">
                          ₦{amountToDebit.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. PHONE NUMBER (FOR SMS NOTIFICATION) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                    Recipient Phone Number (For SMS Token Delivery)
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. 08161437292"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
                    className="w-full h-11 px-3.5 rounded-xl bg-slate-50 dark:bg-[#070D18] border border-slate-200 dark:border-slate-700 focus:border-[#126BEB] focus:ring-2 focus:ring-[#126BEB]/20 text-slate-900 dark:text-white text-sm font-semibold placeholder:text-slate-400 focus:outline-none transition-all shadow-xs"
                  />
                </div>

                {/* Error Banner */}
                {submitError && (
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{submitError}</span>
                  </div>
                )}

                {/* Submit Action */}
                <button
                  type="submit"
                  disabled={!meterNumber || numericAmount < selectedDisco.minAmountNaira}
                  className="w-full py-3.5 px-4 rounded-xl bg-[#126BEB] hover:bg-[#0B5CC7] active:bg-[#094bb5] text-white font-bold text-sm shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span>Review & Pay ₦{numericAmount > 0 ? numericAmount.toLocaleString() : '0'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>

          {/* RECENT ELECTRICITY TRANSACTIONS HISTORY TABLE */}
          <div className="bg-white dark:bg-[#0B1528] rounded-2xl p-5 border border-slate-200 dark:border-slate-800/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-amber-500" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white tracking-tight">
                  Recent Electricity Vending Transactions
                </h2>
              </div>
              <span className="text-xs text-slate-400">
                {historyList.length} recorded
              </span>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
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
                                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
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
      {isConfirmModalOpen && (
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
                <span className="text-[11px] text-slate-400">
                  Please review the meter & payment details
                </span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#070D18] border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">DISCO:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  {selectedDisco.name} ({selectedDisco.meterType})
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Meter Number:</span>
                <span className="font-mono font-bold text-slate-900 dark:text-white">
                  {meterNumber}
                </span>
              </div>
              {verifiedMeter?.customerName && (
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Consumer:</span>
                  <span className="font-bold text-slate-900 dark:text-white uppercase truncate max-w-[200px]">
                    {verifiedMeter.customerName}
                  </span>
                </div>
              )}
              <div className="flex justify-between pt-1 border-t border-slate-200 dark:border-slate-800">
                <span className="text-slate-500 dark:text-slate-400">Face Amount:</span>
                <span className="font-bold text-slate-900 dark:text-white">
                  ₦{numericAmount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                <span>Discount / Cashback:</span>
                <span className="font-bold">-₦{discountAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-extrabold text-sm text-slate-900 dark:text-white pt-1 border-t border-slate-200 dark:border-slate-800">
                <span>Total to Debit:</span>
                <span className="text-[#126BEB] dark:text-[#38BDF8]">
                  ₦{amountToDebit.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                disabled={isSubmitting}
                className="w-1/2 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecutePurchase}
                disabled={isSubmitting}
                className="w-1/2 py-2.5 rounded-xl bg-[#126BEB] hover:bg-[#0B5CC7] text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RotateCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
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
        onVendAnother={() => {
          setIsReceiptModalOpen(false);
          setMeterNumber('');
          setVerifiedMeter(null);
        }}
        onStatusUpdated={(updated) => {
          setReceiptData(updated);
          loadHistory();
          loadWallets();
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
