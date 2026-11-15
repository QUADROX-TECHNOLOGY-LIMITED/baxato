'use client';

import React, { useState, useEffect, useMemo, useRef, useId } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  FileText,
  Loader2,
  Wallet,
  X,
} from 'lucide-react';
import Sidebar from '@/components/dashboard/Sidebar';
import Header from '@/components/dashboard/Header';
import KycBanner from '@/components/dashboard/KycBanner';
import KycModal from '@/components/dashboard/KycModal';
import AccessRestricted from '@/components/dashboard/AccessRestricted';
import ModalDialog from '@/components/ModalDialog';
import BaxatoLoader from '@/components/BaxatoLoader';
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
import { useWalletBalance } from '@/lib/use-wallet-balance';
import { showToast } from '@/lib/toast';
import PhoneFieldWithBeneficiaries, {
  SavedBeneficiary,
  useSavedBeneficiaries,
} from '@/components/dashboard/PhoneFieldWithBeneficiaries';

interface NetworkOption {
  id: string;
  name: string;
  logo: string;
  fullBleed?: boolean;
  logoScaleClass?: string;
  prefixes: string[];
  activeClasses: string;
  discountBps: number;
  enabled: boolean;
}

const NETWORKS: NetworkOption[] = [
  {
    id: 'MTN',
    name: 'MTN',
    logo: '/logos/telecom/mtn.svg',
    fullBleed: true,
    prefixes: ['0803', '0806', '0703', '0706', '0813', '0816', '0810', '0814', '0903', '0906', '0913', '0916'],
    activeClasses: 'border-amber-400 bg-amber-50/60 dark:bg-amber-400/10 ring-1 ring-amber-400/40',
    discountBps: 0,
    enabled: true,
  },
  {
    id: 'AIRTEL',
    name: 'Airtel',
    logo: '/logos/telecom/airtel.svg',
    fullBleed: false,
    prefixes: ['0802', '0808', '0708', '0812', '0701', '0902', '0901', '0904', '0907', '0912'],
    activeClasses: 'border-red-500 bg-red-50/50 dark:bg-red-500/10 ring-1 ring-red-500/35',
    discountBps: 0,
    enabled: true,
  },
  {
    id: 'GLO',
    name: 'Glo',
    logo: '/logos/telecom/glo.svg',
    fullBleed: true,
    logoScaleClass: 'scale-[1.09]',
    prefixes: ['0805', '0807', '0705', '0815', '0811', '0905', '0915'],
    activeClasses: 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-500/10 ring-1 ring-emerald-500/35',
    discountBps: 0,
    enabled: true,
  },
  {
    id: '9MOBILE',
    name: '9mobile',
    logo: '/logos/telecom/9mobile.svg',
    fullBleed: false,
    prefixes: ['0809', '0817', '0818', '0909', '0908'],
    activeClasses: 'border-teal-500 bg-teal-50/50 dark:bg-teal-500/10 ring-1 ring-teal-500/35',
    discountBps: 0,
    enabled: true,
  },
];

function normalizeBeneficiaryNetwork(network?: string | null): string | null {
  if (!network) return null;
  const upper = network.toUpperCase();
  if (upper === 'NINEMOBILE') return '9MOBILE';
  return upper;
}

const PRESET_AMOUNTS = [100, 200, 500, 1000, 2000, 5000];

/**
 * Normalizes Nigerian numbers including pasted +234 / 234 prefixes into local 11-digit format.
 */
function normalizeNigerianPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.startsWith('2340') && digits.length >= 14) {
    return digits.slice(3, 14);
  }
  if (digits.startsWith('234') && digits.length >= 13) {
    return `0${digits.slice(3, 13)}`;
  }
  return digits.slice(0, 11);
}

/**
 * Sanitizes Naira amount input to digits with an optional 2-decimal fractional suffix.
 */
function sanitizeAmountInput(raw: string): string {
  const cleaned = raw.replace(/[^\d.]/g, '');
  const dotIndex = cleaned.indexOf('.');
  if (dotIndex === -1) {
    return cleaned.slice(0, 7);
  }
  const intPart = cleaned.slice(0, dotIndex).slice(0, 5);
  const decPart = cleaned
    .slice(dotIndex + 1)
    .replace(/\./g, '')
    .slice(0, 2);
  return `${intPart}.${decPart}`;
}

export default function AirtimePage() {
  const phoneId = useId();
  const phoneErrorId = useId();
  const amountId = useId();
  const amountErrorId = useId();
  const confirmTitleId = useId();

  const phoneInputRef = useRef<HTMLInputElement>(null);
  const amountInputRef = useRef<HTMLInputElement>(null);
  const announceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // User & Business State
  const [merchantName, setMerchantName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const u = getStoredUser();
      if (u?.firstName) return u.firstName;
    }
    return '';
  });
  const [userFirstName, setUserFirstName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return getStoredUser()?.firstName || '';
    }
    return '';
  });
  const [userLastName, setUserLastName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return getStoredUser()?.lastName || '';
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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { walletBalance, isLoadingBalance, refreshWallets } = useWalletBalance();
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);

  const {
    beneficiaries,
    saveBeneficiary,
    deleteBeneficiary,
  } = useSavedBeneficiaries();

  // Form State (₦100 default amount)
  const [phone, setPhone] = useState<string>('');
  const [selectedNetwork, setSelectedNetwork] = useState<string>('MTN');
  const [amount, setAmount] = useState<string>('100');
  const [networksList, setNetworksList] = useState<NetworkOption[]>(NETWORKS);
  const [saveBeneficiaryChecked, setSaveBeneficiaryChecked] = useState<boolean>(false);

  // After-interaction validation tracking
  const [phoneEdited, setPhoneEdited] = useState<boolean>(false);
  const [phoneBlurred, setPhoneBlurred] = useState<boolean>(false);
  const [amountEdited, setAmountEdited] = useState<boolean>(false);
  const [amountBlurred, setAmountBlurred] = useState<boolean>(false);
  const [submitAttempted, setSubmitAttempted] = useState<boolean>(false);
  const [liveAnnouncement, setLiveAnnouncement] = useState<string>('');

  // Modal & Request State
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [receiptData, setReceiptData] = useState<TransactionReceiptData | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState<boolean>(false);

  useEffect(() => {
    const token = getStoredAuthToken();
    if (!token) {
      clearSessionAndRedirect('expired');
      return;
    }
    setIsInitialLoading(false);

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
        if (storedUser.kycStatus) setKycStatus(storedUser.kycStatus);
        else setKycStatus('UNVERIFIED');
      } else {
        setKycStatus('UNVERIFIED');
      }

      if (storedBiz?.name) {
        setBusinessName(storedBiz.name);
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

    const loadNetworksCatalog = async () => {
      try {
        const res = await fetch('/api/services/airtime/networks', { cache: 'no-store' });
        const data = await res.json().catch(() => null);
        if (res.ok && data?.success && Array.isArray(data.data)) {
          setNetworksList((prev) =>
            prev.map((net) => {
              const matched = data.data.find((n: any) => n.network === net.id);
              if (!matched) return net;
              return {
                ...net,
                discountBps:
                  typeof matched.discountBps === 'number' ? matched.discountBps : net.discountBps,
                enabled: matched.enabled !== false,
              };
            }),
          );
        }
      } catch {}
    };

    const handleBizSwitched = () => {
      const b = getStoredBusiness();
      if (b?.name) setBusinessName(b.name);
      if (b?.role) setUserRole(b.role);
    };

    window.addEventListener('bx_business_switched', handleBizSwitched);

    void syncUserProfile();
    void loadNetworksCatalog();

    return () => {
      window.removeEventListener('bx_business_switched', handleBizSwitched);
      if (announceTimerRef.current) clearTimeout(announceTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const current = networksList.find((n) => n.id === selectedNetwork);
    if (current && current.enabled === false) {
      const firstEnabled = networksList.find((n) => n.enabled !== false);
      if (firstEnabled) {
        setSelectedNetwork(firstEnabled.id);
      }
    }
  }, [networksList, selectedNetwork]);

  const canExecuteServices =
    userRole === 'BUSINESS_OWNER' ||
    userRole === 'BUSINESS_ADMIN' ||
    userRole === 'DEVELOPER' ||
    userRole === 'SUPPORT';

  const isVerified = kycStatus === 'VERIFIED';

  const detectedNetwork = useMemo(() => {
    if (phone.length >= 4) {
      const prefix = phone.slice(0, 4);
      return networksList.find((net) => net.prefixes.includes(prefix)) || null;
    }
    return null;
  }, [phone, networksList]);

  const activeNetworkConfig = useMemo(() => {
    return networksList.find((n) => n.id === selectedNetwork) || networksList[0] || NETWORKS[0];
  }, [selectedNetwork, networksList]);

  const parsedAmount = parseFloat(amount);
  const numericAmount = Number.isFinite(parsedAmount) ? parsedAmount : 0;
  const discountBps = activeNetworkConfig.discountBps || 0;
  const estimatedDiscountNaira = (numericAmount * discountBps) / 10000;
  const estimatedDebitNaira = Math.max(0, numericAmount - estimatedDiscountNaira);
  const exceedsBalance =
    !isLoadingBalance && numericAmount >= 100 && estimatedDebitNaira > walletBalance;

  const phoneValidationError =
    phone.length === 0
      ? 'Enter a recipient phone number.'
      : phone.length !== 11
        ? 'Enter a valid 11-digit Nigerian mobile number.'
        : null;

  const amountValidationError =
    amount.trim().length === 0 || !Number.isFinite(parsedAmount)
      ? 'Enter an airtime amount.'
      : numericAmount < 100 || numericAmount > 50000
        ? 'Enter an amount between ₦100 and ₦50,000.'
        : null;

  const showPhoneError = Boolean(phoneValidationError) && (submitAttempted || (phoneBlurred && phoneEdited));
  const showAmountError = Boolean(amountValidationError) && (submitAttempted || (amountBlurred && amountEdited));

  const scheduleBlurAnnouncement = (message: string) => {
    if (announceTimerRef.current) clearTimeout(announceTimerRef.current);
    setLiveAnnouncement('');
    announceTimerRef.current = setTimeout(() => {
      setLiveAnnouncement(message);
    }, 450);
  };

  const clearBlurAnnouncement = () => {
    if (announceTimerRef.current) {
      clearTimeout(announceTimerRef.current);
      announceTimerRef.current = null;
    }
    setLiveAnnouncement('');
  };

  const allNetworksDisabled = useMemo(
    () => networksList.length > 0 && networksList.every((n) => n.enabled === false),
    [networksList],
  );

  const handlePhoneValueChange = (raw: string) => {
    const normalized = normalizeNigerianPhone(raw);
    setPhone(normalized);
    setPhoneEdited(true);
    if (normalized.length === 11) {
      clearBlurAnnouncement();
    }

    if (normalized.length >= 4) {
      const prefix = normalized.slice(0, 4);
      const match = networksList.find((net) => net.prefixes.includes(prefix));
      if (match && match.enabled !== false) {
        setSelectedNetwork(match.id);
      }
    }
  };

  const handleSelectBeneficiary = (ben: SavedBeneficiary) => {
    const normalized = normalizeNigerianPhone(ben.phoneNumber);
    setPhone(normalized);
    setPhoneEdited(true);
    clearBlurAnnouncement();

    const mappedNetwork = normalizeBeneficiaryNetwork(ben.network);
    const matchedBySaved = mappedNetwork
      ? networksList.find((n) => n.id === mappedNetwork)
      : undefined;
    const matchedByPrefix =
      normalized.length >= 4
        ? networksList.find((n) => n.prefixes.includes(normalized.slice(0, 4)))
        : undefined;
    const candidate = matchedBySaved || matchedByPrefix;

    if (candidate) {
      if (candidate.enabled === false) {
        showToast({
          type: 'warning',
          message: `${candidate.name} airtime is currently unavailable.`,
        });
      } else {
        setSelectedNetwork(candidate.id);
      }
    }
  };

  const handlePhoneBlur = () => {
    setPhoneBlurred(true);
    if (phoneEdited && phoneValidationError) {
      scheduleBlurAnnouncement(`Phone number error: ${phoneValidationError}`);
    }
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const sanitized = sanitizeAmountInput(e.target.value);
    setAmount(sanitized);
    setAmountEdited(true);
    const val = parseFloat(sanitized);
    if (Number.isFinite(val) && val >= 100 && val <= 50000) {
      clearBlurAnnouncement();
    }
  };

  const handleAmountBlur = () => {
    setAmountBlurred(true);
    if (amountEdited && amountValidationError) {
      scheduleBlurAnnouncement(`Amount error: ${amountValidationError}`);
    }
  };

  const handleSelectPreset = (val: number) => {
    setAmount(val.toString());
    setAmountEdited(true);
    clearBlurAnnouncement();
  };

  const handleOpenConfirm = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isVerified) {
      setIsKycModalOpen(true);
      return;
    }

    setSubmitAttempted(true);

    if (allNetworksDisabled) {
      showToast({
        type: 'error',
        message: 'Airtime service is temporarily unavailable across all networks.',
      });
      return;
    }

    if (phoneValidationError) {
      clearBlurAnnouncement();
      showToast({ type: 'error', message: phoneValidationError });
      phoneInputRef.current?.focus();
      return;
    }

    if (activeNetworkConfig.enabled === false) {
      showToast({
        type: 'error',
        message: `${activeNetworkConfig.name} airtime is currently unavailable.`,
      });
      return;
    }

    if (amountValidationError) {
      clearBlurAnnouncement();
      showToast({ type: 'error', message: amountValidationError });
      amountInputRef.current?.focus();
      return;
    }

    if (exceedsBalance) {
      showToast({
        type: 'error',
        message: `Insufficient wallet balance. You need ₦${(estimatedDebitNaira - walletBalance).toLocaleString('en-NG', { minimumFractionDigits: 2 })} more.`,
      });
      return;
    }

    setIsConfirmModalOpen(true);
  };

  const handleExecutePurchase = async () => {
    setIsSubmitting(true);

    try {
      const authToken = getStoredAuthToken();
      if (!authToken) {
        clearSessionAndRedirect('expired');
        return;
      }

      const activeBiz = getStoredBusiness();
      const amountKobo = Math.round(numericAmount * 100);

      const response = await fetch('/api/services/airtime/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
          ...(activeBiz?.id ? { 'x-business-id': activeBiz.id } : {}),
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
        const msg = result?.error?.message || result?.message || 'Airtime purchase failed. Please try again.';
        throw new Error(msg);
      }

      const data = result.data;
      const faceVal = data?.faceAmountNaira ?? numericAmount;
      const discountVal =
        data?.discountNaira !== undefined
          ? data.discountNaira
          : (numericAmount * discountBps) / 10000;
      const debitedVal = data?.amountDebitedNaira ?? Math.max(0, faceVal - discountVal);

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
      void refreshWallets();

      if (saveBeneficiaryChecked) {
        void saveBeneficiary({
          phoneNumber: phone,
          network: selectedNetwork,
          serviceType: 'AIRTIME',
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Transaction could not be completed.';
      setIsConfirmModalOpen(false);
      showToast({ type: 'error', title: 'Airtime purchase failed', message: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshWallets();
    setTimeout(() => setIsRefreshing(false), 350);
  };

  if (isInitialLoading) {
    return <BaxatoLoader variant="fullscreen" />;
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#070D18] text-slate-800 dark:text-slate-100 flex flex-col lg:flex-row transition-colors duration-150">
      {isSubmitting && <BaxatoLoader variant="overlay" />}

      {/* Polite screen-reader announcer for blur validation */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {liveAnnouncement}
      </div>

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

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-72">
        <Header
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onOpenKycModal={() => setIsKycModalOpen(true)}
          merchantName={merchantName}
          businessName={businessName}
          kycStatus={kycStatus}
          userRole={userRole}
          isRefreshing={isRefreshing}
          onRefresh={handleRefresh}
          sticky={false}
        />

        <main className="flex-1 px-4 py-5 sm:p-6 lg:p-8 max-w-6xl mx-auto w-full space-y-6">
          {!canExecuteServices ? (
            <AccessRestricted description="Airtime purchases are restricted to Workspace Owners, Administrators, Developers, and Support staff." />
          ) : (
            <>
              <KycBanner
                kycStatus={kycStatus}
                userRole={userRole}
                onOpenKycModal={() => setIsKycModalOpen(true)}
              />

              {/* Navigation Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                  <span>Back to Dashboard</span>
                </Link>

                <Link
                  href="/dashboard/ledger?service=AIRTIME"
                  className="inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
                >
                  <FileText className="w-3.5 h-3.5 text-[#126BEB] dark:text-[#38BDF8]" aria-hidden="true" />
                  <span>Airtime History</span>
                </Link>
              </div>

              {/* Page Heading & Compact Wallet Balance */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200/80 dark:border-slate-800/80">
                <div className="flex items-center gap-3.5 min-w-0">
                  <Image
                    src="/logos/categories/airtime.svg"
                    alt=""
                    width={40}
                    height={40}
                    className="w-10 h-10 shrink-0 rounded-xl"
                  />
                  <div className="min-w-0">
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight text-balance">
                      Airtime
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 text-pretty">
                      Instant mobile top-ups across Nigerian networks.
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

              {/* Airtime Purchase Form */}
              <form
                onSubmit={handleOpenConfirm}
                noValidate
                aria-label="Airtime purchase form"
                className="max-w-xl mx-auto w-full bg-white dark:bg-[#0B1528] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-5"
              >
                  {/* 1. Recipient Phone Number & Saved Beneficiaries */}
                  <PhoneFieldWithBeneficiaries
                    id={phoneId}
                    label={
                      <>
                        Phone Number <span aria-hidden="true" className="text-red-500">*</span>
                      </>
                    }
                    value={phone}
                    onChange={handlePhoneValueChange}
                    onBlur={handlePhoneBlur}
                    inputRef={phoneInputRef}
                    placeholder="08012345678"
                    required
                    errorId={phoneErrorId}
                    errorText={showPhoneError ? phoneValidationError : null}
                    beneficiaries={beneficiaries}
                    onSelectBeneficiary={handleSelectBeneficiary}
                    onDeleteBeneficiary={deleteBeneficiary}
                    saveChecked={saveBeneficiaryChecked}
                    onSaveCheckedChange={setSaveBeneficiaryChecked}
                    rightBadge={
                      detectedNetwork ? (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                          <span
                            className={`w-4 h-4 rounded-full overflow-hidden inline-flex items-center justify-center shrink-0 ${
                              detectedNetwork.fullBleed
                                ? ''
                                : 'bg-white border border-slate-200 dark:border-slate-700 p-0.5'
                            }`}
                          >
                            <Image
                              src={detectedNetwork.logo}
                              alt=""
                              width={16}
                              height={16}
                              className={`w-full h-full ${
                                detectedNetwork.fullBleed ? 'object-cover' : 'object-contain'
                              } ${detectedNetwork.logoScaleClass || ''}`}
                            />
                          </span>
                          <span>
                            {detectedNetwork.name}
                            {detectedNetwork.enabled === false ? ' (Unavailable)' : ' prefix'}
                          </span>
                        </span>
                      ) : undefined
                    }
                  />

                  {/* 2. Network Radio Selection */}
                  <fieldset className="space-y-2.5">
                    <legend className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Network <span aria-hidden="true" className="text-red-500">*</span>
                    </legend>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {networksList.map((network) => {
                        const isDisabled = network.enabled === false;
                        const isSelected = selectedNetwork === network.id && !isDisabled;
                        return (
                          <label
                            key={network.id}
                            aria-disabled={isDisabled}
                            className={`relative min-h-[72px] p-3 rounded-xl border transition-colors flex flex-col items-center justify-center gap-1.5 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[#126BEB] ${
                              isDisabled
                                ? 'border-slate-200 dark:border-slate-800/80 bg-slate-100/80 dark:bg-slate-900/40 opacity-55 grayscale cursor-not-allowed'
                                : isSelected
                                  ? `${network.activeClasses} cursor-pointer`
                                  : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-[#070D18]/70 hover:border-slate-300 dark:hover:border-slate-700 cursor-pointer'
                            }`}
                          >
                            <input
                              type="radio"
                              name="network"
                              value={network.id}
                              checked={isSelected}
                              disabled={isDisabled}
                              onChange={() => {
                                if (isDisabled) return;
                                setSelectedNetwork(network.id);
                              }}
                              className="sr-only"
                            />
                            {isSelected && (
                              <span
                                aria-hidden="true"
                                className="absolute top-2 right-2 w-4 h-4 rounded-full bg-[#126BEB] text-white flex items-center justify-center"
                              >
                                <Check className="w-2.5 h-2.5 stroke-[3]" />
                              </span>
                            )}
                            <span
                              className={`w-9 h-9 rounded-full overflow-hidden flex items-center justify-center shrink-0 ${
                                network.fullBleed
                                  ? ''
                                  : 'bg-white border border-slate-200/80 dark:border-slate-700 p-1.5'
                              }`}
                            >
                              <Image
                                src={network.logo}
                                alt=""
                                width={36}
                                height={36}
                                className={`w-full h-full ${
                                  network.fullBleed ? 'object-cover' : 'object-contain'
                                } ${network.logoScaleClass || ''}`}
                              />
                            </span>
                            <span className="text-xs font-semibold text-slate-900 dark:text-white">
                              {network.name}
                            </span>
                            {isDisabled && (
                              <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                                Unavailable
                              </span>
                            )}
                          </label>
                        );
                      })}
                    </div>

                    {detectedNetwork &&
                      detectedNetwork.enabled !== false &&
                      selectedNetwork !== detectedNetwork.id && (
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Prefix matches{' '}
                          <span className="font-medium text-slate-700 dark:text-slate-200">
                            {detectedNetwork.name}
                          </span>
                          ; {activeNetworkConfig.name} will be recharged.
                        </p>
                      )}
                  </fieldset>

                  {/* 3. Amount Selection */}
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <label
                        htmlFor={amountId}
                        className="text-xs font-semibold text-slate-700 dark:text-slate-300"
                      >
                        Amount (₦) <span aria-hidden="true" className="text-red-500">*</span>
                      </label>
                      <span className="text-[11px] text-slate-400 dark:text-slate-500">
                        ₦100 – ₦50,000
                      </span>
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {PRESET_AMOUNTS.map((val) => {
                        const isActive = numericAmount === val;
                        return (
                          <button
                            key={val}
                            type="button"
                            onClick={() => handleSelectPreset(val)}
                            aria-pressed={isActive}
                            className={`min-h-[44px] px-2 rounded-lg text-xs sm:text-sm font-semibold tabular-nums border transition-colors cursor-pointer ${
                              isActive
                                ? 'bg-[#126BEB] text-white border-[#126BEB]'
                                : 'bg-slate-50/70 dark:bg-[#070D18] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                            }`}
                          >
                            ₦{val.toLocaleString()}
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
                        ref={amountInputRef}
                        id={amountId}
                        name="amount"
                        type="text"
                        inputMode="decimal"
                        enterKeyHint="done"
                        placeholder="Enter amount"
                        value={amount}
                        onChange={handleAmountChange}
                        onBlur={handleAmountBlur}
                        aria-invalid={showAmountError ? 'true' : 'false'}
                        aria-describedby={showAmountError ? amountErrorId : undefined}
                        required
                        className={`w-full h-11 pl-8 pr-3.5 rounded-lg bg-white dark:bg-[#070D18] border text-slate-900 dark:text-white text-sm sm:text-base font-semibold tabular-nums placeholder:text-slate-400 placeholder:font-normal focus:outline-none focus:ring-2 transition-colors ${
                          showAmountError
                            ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                            : 'border-slate-200 dark:border-slate-700 focus:border-[#126BEB] focus:ring-[#126BEB]/20'
                        }`}
                      />
                    </div>

                    {showAmountError && (
                      <p
                        id={amountErrorId}
                        className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1.5"
                      >
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                        <span>{amountValidationError}</span>
                      </p>
                    )}
                  </div>

                  {exceedsBalance && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 rounded-lg px-3 py-2">
                      Amount exceeds your current wallet balance.
                    </p>
                  )}

                  <div className="pt-1">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full h-11 px-4 rounded-lg bg-[#126BEB] hover:bg-[#0B5CC7] active:bg-[#094bb5] text-white font-semibold text-sm transition-colors flex items-center justify-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Buy Airtime
                    </button>
                  </div>
              </form>
            </>
          )}
        </main>
      </div>

      {/* Native Confirmation Modal */}
      <ModalDialog
        isOpen={isConfirmModalOpen && !isSubmitting}
        onClose={() => setIsConfirmModalOpen(false)}
        dismissible={!isSubmitting}
        ariaLabelledBy={confirmTitleId}
        maxWidthClass="max-w-sm"
        className="dark:bg-[#0B1528] text-slate-900 dark:text-white"
      >
        <div className="p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
            <h2 id={confirmTitleId} className="text-sm font-semibold text-slate-900 dark:text-white">
              Confirm Airtime Purchase
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
              <dt className="text-slate-500 dark:text-slate-400">Network</dt>
              <dd className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span
                  className={`w-5 h-5 rounded-full overflow-hidden flex items-center justify-center shrink-0 ${
                    activeNetworkConfig.fullBleed
                      ? ''
                      : 'bg-white border border-slate-200 dark:border-slate-700 p-0.5'
                  }`}
                >
                  <Image
                    src={activeNetworkConfig.logo}
                    alt=""
                    width={20}
                    height={20}
                    className={`w-full h-full ${
                      activeNetworkConfig.fullBleed ? 'object-cover' : 'object-contain'
                    } ${activeNetworkConfig.logoScaleClass || ''}`}
                  />
                </span>
                <span>{activeNetworkConfig.name}</span>
              </dd>
            </div>
            <div className="flex justify-between items-center">
              <dt className="text-slate-500 dark:text-slate-400">Phone Number</dt>
              <dd className="font-semibold text-slate-900 dark:text-white text-sm tabular-nums">{phone}</dd>
            </div>
            <div className="flex justify-between items-center">
              <dt className="text-slate-500 dark:text-slate-400">Airtime Value</dt>
              <dd className="font-semibold text-slate-900 dark:text-white text-sm tabular-nums">
                ₦{numericAmount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
              </dd>
            </div>
            {discountBps > 0 && estimatedDiscountNaira > 0 && (
              <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400 font-medium">
                <dt>Discount ({(discountBps / 100).toFixed(1)}%)</dt>
                <dd className="tabular-nums">
                  -₦{estimatedDiscountNaira.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                </dd>
              </div>
            )}
            <div className="flex justify-between items-center pt-2.5 border-t border-slate-100 dark:border-slate-800/80">
              <dt className="font-semibold text-slate-900 dark:text-white">
                Total Debit
                <span className="block text-[11px] font-normal text-slate-400 dark:text-slate-500">
                  Main Wallet
                </span>
              </dt>
              <dd className="font-bold text-[#126BEB] dark:text-[#38BDF8] text-base tabular-nums">
                ₦{estimatedDebitNaira.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
              </dd>
            </div>
          </dl>

          {detectedNetwork && selectedNetwork !== detectedNetwork.id && (
            <p className="text-[11.5px] text-slate-500 dark:text-slate-400 text-center">
              Prefix matches {detectedNetwork.name}; recharging via {activeNetworkConfig.name}.
            </p>
          )}

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
      </ModalDialog>

      {/* Transaction Receipt Modal */}
      <TransactionReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        receipt={receiptData}
        onRechargeAnother={() => {
          setIsReceiptModalOpen(false);
          setPhone('');
          setPhoneEdited(false);
          setPhoneBlurred(false);
          setSubmitAttempted(false);
          setLiveAnnouncement('');
          void refreshWallets();
        }}
        onStatusUpdated={(updated) => {
          setReceiptData(updated);
          void refreshWallets();
        }}
        pollingEndpoint="/api/services/airtime/status/"
      />

      {/* KYC Verification Modal */}
      <KycModal
        isOpen={isKycModalOpen}
        onClose={() => setIsKycModalOpen(false)}
        onSuccess={() => {
          setKycStatus('VERIFIED');
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
