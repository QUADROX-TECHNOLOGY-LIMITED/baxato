'use client';

import React, { useCallback, useState, useEffect, useMemo, useRef, useId } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  FileText,
  Loader2,
  Search,
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
    enabled: true,
  },
  {
    id: 'AIRTEL',
    name: 'Airtel',
    logo: '/logos/telecom/airtel.svg',
    fullBleed: false,
    prefixes: ['0802', '0808', '0708', '0812', '0701', '0902', '0901', '0904', '0907', '0912'],
    activeClasses: 'border-red-500 bg-red-50/50 dark:bg-red-500/10 ring-1 ring-red-500/35',
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
    enabled: true,
  },
  {
    id: '9MOBILE',
    name: '9mobile',
    logo: '/logos/telecom/9mobile.svg',
    fullBleed: false,
    prefixes: ['0809', '0817', '0818', '0909', '0908'],
    activeClasses: 'border-teal-500 bg-teal-50/50 dark:bg-teal-500/10 ring-1 ring-teal-500/35',
    enabled: true,
  },
];

function normalizeBeneficiaryNetwork(network?: string | null): string | null {
  if (!network) return null;
  const upper = network.toUpperCase();
  if (upper === 'NINEMOBILE') return '9MOBILE';
  return upper;
}

interface DataPlan {
  id: string;
  network: string;
  networkName: string;
  name: string;
  dataAllowance: string;
  category: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'MEGA' | 'SME';
  dataType?: 'DIRECT' | 'SME';
  validity: string;
  priceNaira: number;
  discountBps?: number;
}

const CATEGORY_ORDER: Array<DataPlan['category']> = [
  'DAILY',
  'WEEKLY',
  'MONTHLY',
  'MEGA',
  'SME',
];

const CATEGORY_LABELS: Record<string, string> = {
  ALL: 'All',
  DAILY: 'Daily',
  WEEKLY: 'Weekly',
  MONTHLY: 'Monthly',
  MEGA: 'Mega',
  SME: 'SME',
};

/**
 * Normalizes Nigerian phone numbers including pasted +234 / 234 prefixes to 11-digit local format.
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

export default function DataBundlesPage() {
  const phoneId = useId();
  const phoneErrorId = useId();
  const searchInputId = useId();
  const planErrorId = useId();
  const tabsPrefixId = useId();
  const confirmTitleId = useId();

  const phoneInputRef = useRef<HTMLInputElement>(null);
  const firstPlanInputRef = useRef<HTMLInputElement>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const announceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // User & Business State
  const [merchantName, setMerchantName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return getStoredUser()?.firstName || '';
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
      return getStoredBusiness()?.name || '';
    }
    return '';
  });
  const [kycStatus, setKycStatus] = useState<string>('INITIALIZING');
  const [userRole, setUserRole] = useState<string>('BUSINESS_OWNER');
  const [isKycModalOpen, setIsKycModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { walletBalance, isLoadingBalance, hasLoadedBalance, refreshWallets } = useWalletBalance();
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);

  const {
    beneficiaries,
    hasLoadedBeneficiaries,
    saveBeneficiary,
    deleteBeneficiary,
  } = useSavedBeneficiaries();

  // Form & Catalog State
  const [phone, setPhone] = useState<string>('');
  const [selectedNetwork, setSelectedNetwork] = useState<string>('MTN');
  const [networksList, setNetworksList] = useState<NetworkOption[]>([]);
  const [saveBeneficiaryChecked, setSaveBeneficiaryChecked] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [planSearch, setPlanSearch] = useState<string>('');
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [plans, setPlans] = useState<DataPlan[]>([]);
  const [isLoadingPlans, setIsLoadingPlans] = useState<boolean>(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [isRetryingCatalog, setIsRetryingCatalog] = useState<boolean>(false);

  // Validation & Announcements
  const [phoneEdited, setPhoneEdited] = useState<boolean>(false);
  const [phoneBlurred, setPhoneBlurred] = useState<boolean>(false);
  const [submitAttempted, setSubmitAttempted] = useState<boolean>(false);
  const [liveAnnouncement, setLiveAnnouncement] = useState<string>('');

  // Modals & Request State
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [receiptData, setReceiptData] = useState<TransactionReceiptData | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState<boolean>(false);

  const fetchCatalog = useCallback(async () => {
    try {
      setCatalogError(null);
      setIsLoadingPlans(true);
      const [plansRes, netsRes] = await Promise.all([
        fetch('/api/services/data/plans', { cache: 'no-store' }),
        fetch('/api/services/data/networks', { cache: 'no-store' }),
      ]);

      const [plansJson, netsJson] = await Promise.all([
        plansRes.json().catch(() => null),
        netsRes.json().catch(() => null),
      ]);

      if (
        !plansRes.ok ||
        !plansJson?.success ||
        !Array.isArray(plansJson.data) ||
        !netsRes.ok ||
        !netsJson?.success ||
        !Array.isArray(netsJson.data)
      ) {
        setCatalogError(
          plansJson?.error?.message ||
            netsJson?.error?.message ||
            'Unable to load data plans right now.',
        );
        return;
      }

      setPlans(plansJson.data);

      const mergedNets = NETWORKS.map((net) => {
        const matched = netsJson.data.find((n: any) => n.network === net.id);
        if (!matched) return net;
        return {
          ...net,
          enabled: matched.enabled !== false,
        };
      });
      setNetworksList(mergedNets);
      setSelectedNetwork((prev) => {
        const current = mergedNets.find((n) => n.id === prev);
        if (current && current.enabled !== false) return prev;
        return mergedNets.find((n) => n.enabled !== false)?.id || prev;
      });
    } catch {
      setCatalogError('Unable to load data plans right now.');
    } finally {
      setIsLoadingPlans(false);
    }
  }, []);

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

    const handleBizSwitched = () => {
      const b = getStoredBusiness();
      if (b?.name) setBusinessName(b.name);
      if (b?.role) setUserRole(b.role);
    };

    window.addEventListener('bx_business_switched', handleBizSwitched);

    let isMounted = true;
    const initializePage = async () => {
      try {
        await Promise.all([
          fetchCatalog(),
          syncUserProfile(),
        ]);
      } finally {
        if (isMounted) {
          setIsInitialLoading(false);
        }
      }
    };

    void initializePage();

    return () => {
      isMounted = false;
      window.removeEventListener('bx_business_switched', handleBizSwitched);
      if (announceTimerRef.current) clearTimeout(announceTimerRef.current);
    };
  }, [fetchCatalog]);

  useEffect(() => {
    const current = networksList.find((n) => n.id === selectedNetwork);
    if (current && current.enabled === false) {
      const firstEnabled = networksList.find((n) => n.enabled !== false);
      if (firstEnabled) {
        setSelectedNetwork(firstEnabled.id);
        setSelectedPlanId('');
      }
    }
  }, [networksList, selectedNetwork]);

  useEffect(() => {
    if (!isLoadingPlans && selectedPlanId && !plans.some((p) => p.id === selectedPlanId)) {
      setSelectedPlanId('');
    }
  }, [isLoadingPlans, plans, selectedPlanId]);

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

  const allNetworksDisabled = useMemo(
    () => networksList.length > 0 && networksList.every((n) => n.enabled === false),
    [networksList],
  );

  const availableCategories = useMemo(() => {
    const networkPlans = plans.filter(
      (p) => p.network.toUpperCase() === selectedNetwork.toUpperCase(),
    );
    const present = new Set(networkPlans.map((p) => p.category));
    return ['ALL', ...CATEGORY_ORDER.filter((cat) => present.has(cat))];
  }, [plans, selectedNetwork]);

  useEffect(() => {
    if (selectedCategory !== 'ALL' && !availableCategories.includes(selectedCategory)) {
      setSelectedCategory('ALL');
    }
  }, [availableCategories, selectedCategory]);

  const filteredPlans = useMemo(() => {
    const query = planSearch.trim().toLowerCase();
    return plans.filter((p) => {
      if (p.network.toUpperCase() !== selectedNetwork.toUpperCase()) return false;
      if (selectedCategory !== 'ALL' && p.category !== selectedCategory) return false;
      if (!query) return true;
      const haystack = `${p.name} ${p.dataAllowance} ${p.validity} ${p.priceNaira}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [plans, selectedNetwork, selectedCategory, planSearch]);

  const activePlan = useMemo(() => {
    return plans.find((p) => p.id === selectedPlanId) || null;
  }, [plans, selectedPlanId]);

  const activeNetworkConfig = useMemo(() => {
    return networksList.find((n) => n.id === selectedNetwork) || networksList[0] || NETWORKS[0];
  }, [selectedNetwork, networksList]);

  const planDiscountBps = activePlan?.discountBps || 0;
  const estimatedDiscountNaira = activePlan
    ? (activePlan.priceNaira * planDiscountBps) / 10000
    : 0;
  const estimatedDebitNaira = activePlan
    ? Math.max(0, activePlan.priceNaira - estimatedDiscountNaira)
    : 0;
  const exceedsBalance =
    !isLoadingBalance && Boolean(activePlan) && estimatedDebitNaira > walletBalance;

  const phoneValidationError =
    phone.length === 0
      ? 'Enter a recipient phone number.'
      : phone.length !== 11
        ? 'Enter a valid 11-digit Nigerian mobile number.'
        : null;

  const planValidationError = !activePlan ? 'Select a data plan to continue.' : null;

  const showPhoneError =
    Boolean(phoneValidationError) && (submitAttempted || (phoneBlurred && phoneEdited));
  const showPlanError = Boolean(planValidationError) && submitAttempted;

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
      if (match && match.enabled !== false && match.id !== selectedNetwork) {
        setSelectedNetwork(match.id);
        setSelectedPlanId('');
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
          message: `${candidate.name} data bundles are currently unavailable.`,
        });
      } else if (candidate.id !== selectedNetwork) {
        setSelectedNetwork(candidate.id);
        setSelectedPlanId('');
        setPlanSearch('');
      }
    }
  };

  const handlePhoneBlur = () => {
    setPhoneBlurred(true);
    if (phoneEdited && phoneValidationError) {
      scheduleBlurAnnouncement(`Phone number error: ${phoneValidationError}`);
    }
  };

  const handleSelectNetwork = (networkId: string) => {
    const target = networksList.find((n) => n.id === networkId);
    if (target?.enabled === false) return;
    if (networkId !== selectedNetwork) {
      setSelectedNetwork(networkId);
      setSelectedPlanId('');
      setPlanSearch('');
    }
  };

  const selectCategoryTab = (cat: string, focusTab = false) => {
    setSelectedCategory(cat);
    const el = tabRefs.current[cat];
    if (el) {
      el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      if (focusTab) el.focus();
    }
  };

  const handleTabKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const count = availableCategories.length;
    if (count === 0) return;

    let nextIndex: number | null = null;
    if (e.key === 'ArrowRight') nextIndex = (index + 1) % count;
    else if (e.key === 'ArrowLeft') nextIndex = (index - 1 + count) % count;
    else if (e.key === 'Home') nextIndex = 0;
    else if (e.key === 'End') nextIndex = count - 1;

    if (nextIndex !== null) {
      e.preventDefault();
      selectCategoryTab(availableCategories[nextIndex], true);
    }
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
        message: 'Data bundle service is temporarily unavailable across all networks.',
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
        message: `${activeNetworkConfig.name} data bundles are currently unavailable.`,
      });
      return;
    }

    if (!activePlan) {
      clearBlurAnnouncement();
      setLiveAnnouncement('Select a data plan to continue.');
      showToast({ type: 'error', message: 'Select a data plan to continue.' });
      firstPlanInputRef.current?.focus();
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

  const handlePurchase = async () => {
    if (!activePlan) return;

    try {
      setIsSubmitting(true);
      const token = getStoredAuthToken();
      if (!token) {
        clearSessionAndRedirect('expired');
        return;
      }

      const activeBiz = getStoredBusiness();

      const res = await fetch('/api/services/data/purchase', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...(activeBiz?.id ? { 'x-business-id': activeBiz.id } : {}),
        },
        body: JSON.stringify({
          phone,
          planId: activePlan.id,
          network: selectedNetwork,
          clientReference: `BXT-DAT-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        }),
      });

      const data = await res.json().catch(() => null);

      if (handleAuthResponse(res, data)) {
        return;
      }

      if (!res.ok || !data?.success) {
        const msg =
          data?.error?.message ||
          data?.message ||
          'Data purchase failed. Please try again.';
        setIsConfirmModalOpen(false);
        showToast({ type: 'error', title: 'Data purchase failed', message: msg });
        void fetchCatalog();
        return;
      }

      const payload = data.data;
      const faceVal = payload?.faceAmountNaira ?? activePlan.priceNaira;
      const discountVal =
        payload?.discountNaira !== undefined
          ? payload.discountNaira
          : estimatedDiscountNaira;
      const debitedVal =
        payload?.amountDebitedNaira ?? Math.max(0, faceVal - discountVal);

      const receiptItem: TransactionReceiptData = {
        transactionId: payload?.transactionId || payload?.id || `DAT-${Date.now()}`,
        reference: payload?.reference || `DAT-${Date.now()}`,
        clientReference: payload?.clientReference,
        serviceType: 'DATA',
        status: payload?.status || 'SUCCESSFUL',
        recipient: phone,
        network: selectedNetwork,
        networkName: activeNetworkConfig.name,
        networkLogo: activeNetworkConfig.logo,
        planName: payload?.planName || activePlan.name,
        dataAllowance: payload?.dataAllowance || activePlan.dataAllowance,
        validity: payload?.validity || activePlan.validity,
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

      setIsConfirmModalOpen(false);
      setReceiptData(receiptItem);
      setIsReceiptModalOpen(true);
      void refreshWallets();

      if (saveBeneficiaryChecked) {
        void saveBeneficiary({
          phoneNumber: phone,
          network: selectedNetwork,
          serviceType: 'DATA',
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Network error. Please try again.';
      setIsConfirmModalOpen(false);
      showToast({ type: 'error', title: 'Data purchase failed', message: msg });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([refreshWallets(), fetchCatalog()]);
    setTimeout(() => setIsRefreshing(false), 350);
  };

  const handleRetryCatalog = async () => {
    setIsRetryingCatalog(true);
    try {
      await fetchCatalog();
    } finally {
      setIsRetryingCatalog(false);
    }
  };

  if (isInitialLoading || !hasLoadedBeneficiaries || !hasLoadedBalance) {
    return <BaxatoLoader variant="fullscreen" />;
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#070D18] text-slate-800 dark:text-slate-100 flex flex-col lg:flex-row transition-colors duration-150">
      {isSubmitting && <BaxatoLoader variant="overlay" />}

      {/* Polite screen-reader announcer */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {liveAnnouncement}
      </div>

      {/* Sidebar */}
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
            <AccessRestricted description="Mobile data purchases are restricted to Workspace Owners, Administrators, Developers, and Support staff." />
          ) : (
            <>
              <KycBanner
                kycStatus={kycStatus}
                userRole={userRole}
                onOpenKycModal={() => setIsKycModalOpen(true)}
              />

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
                  href="/dashboard/ledger?service=DATA"
                  className="inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
                >
                  <FileText className="w-3.5 h-3.5 text-[#126BEB] dark:text-[#38BDF8]" aria-hidden="true" />
                  <span>Data History</span>
                </Link>
              </div>

              {/* Page Heading & Compact Wallet Balance */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-200/80 dark:border-slate-800/80">
                <div className="flex items-center gap-3.5 min-w-0">
                  <Image
                    src="/logos/categories/data.svg"
                    alt=""
                    width={40}
                    height={40}
                    className="w-10 h-10 shrink-0 rounded-xl"
                  />
                  <div className="min-w-0">
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight text-balance">
                      Data Bundles
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 text-pretty">
                      Instant mobile data plans across Nigerian networks.
                    </p>
                  </div>
                </div>

                {/* Compact Wallet Balance Indicator */}
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

              {/* Unified Data Bundle Purchase Form */}
              {catalogError && networksList.length === 0 ? (
                <div className="max-w-3xl mx-auto w-full py-12 px-4 text-center bg-white dark:bg-[#0B1528] rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
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
                <form
                  onSubmit={handleOpenConfirm}
                  noValidate
                  aria-label="Data bundle purchase form"
                  className="max-w-3xl mx-auto w-full bg-white dark:bg-[#0B1528] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 sm:p-6 space-y-6"
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

                {/* 2. Network Selection */}
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
                            onChange={() => handleSelectNetwork(network.id)}
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
                      <p className="text-xs text-amber-600 dark:text-amber-400">
                        Number prefix matches {detectedNetwork.name}. Data plans must match the recipient&apos;s network.
                      </p>
                    )}
                </fieldset>

                {/* 3. Data Bundle Catalog */}
                <fieldset className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <legend className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Select Plan <span aria-hidden="true" className="text-red-500">*</span>
                    </legend>

                    {/* Quick Filter Input */}
                    <div className="relative sm:w-60">
                      <label htmlFor={searchInputId} className="sr-only">
                        Filter data plans
                      </label>
                      <Search
                        className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                        aria-hidden="true"
                      />
                      <input
                        id={searchInputId}
                        type="search"
                        value={planSearch}
                        onChange={(e) => setPlanSearch(e.target.value)}
                        placeholder="Filter (e.g. 2GB, 30 days)"
                        className="w-full h-10 sm:h-9 pl-8 pr-8 rounded-lg bg-white dark:bg-[#070D18] border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#126BEB] focus:ring-2 focus:ring-[#126BEB]/20 transition-colors [&::-webkit-search-cancel-button]:hidden"
                      />
                      {planSearch && (
                        <button
                          type="button"
                          onClick={() => setPlanSearch('')}
                          aria-label="Clear filter"
                          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 after:content-[''] after:absolute after:-inset-2 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Single-Row Scrollable WAI-ARIA Category Tabs */}
                  <div
                    role="tablist"
                    aria-label="Data plan categories"
                    className="flex items-center flex-nowrap overflow-x-auto gap-1 border-b border-slate-200 dark:border-slate-800 scrollbar-none"
                  >
                    {availableCategories.map((cat, idx) => {
                      const isActive = selectedCategory === cat;
                      const tabId = `${tabsPrefixId}-tab-${cat}`;
                      return (
                        <button
                          key={cat}
                          ref={(el) => {
                            tabRefs.current[cat] = el;
                          }}
                          id={tabId}
                          type="button"
                          role="tab"
                          aria-selected={isActive}
                          tabIndex={isActive ? 0 : -1}
                          onClick={() => selectCategoryTab(cat)}
                          onKeyDown={(e) => handleTabKeyDown(e, idx)}
                          className={`relative shrink-0 min-h-[40px] px-3.5 py-2 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#126BEB] ${
                            isActive
                              ? 'text-[#126BEB] dark:text-[#38BDF8] after:content-[""] after:absolute after:inset-x-0 after:bottom-0 after:border-b-2 after:border-[#126BEB] dark:after:border-[#38BDF8]'
                              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                          }`}
                        >
                          {CATEGORY_LABELS[cat] || cat}
                        </button>
                      );
                    })}
                  </div>

                  {/* Plan Selection Grid */}
                  <div
                    role="tabpanel"
                    aria-labelledby={`${tabsPrefixId}-tab-${selectedCategory}`}
                  >
                    {isLoadingPlans && plans.length === 0 ? (
                      <div className="grid grid-cols-2 gap-2">
                        {Array.from({ length: 6 }).map((_, idx) => (
                          <div
                            key={idx}
                            aria-hidden="true"
                            className="p-2.5 sm:p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-[#070D18] space-y-2 animate-pulse"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="h-3.5 w-12 bg-slate-200 dark:bg-slate-800 rounded" />
                              <div className="h-3.5 w-10 bg-slate-200 dark:bg-slate-800 rounded" />
                            </div>
                            <div className="h-3 w-3/4 bg-slate-200/70 dark:bg-slate-800/70 rounded" />
                            <div className="pt-1.5 border-t border-slate-200/60 dark:border-slate-800">
                              <div className="h-3.5 w-14 bg-slate-200 dark:bg-slate-800 rounded" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : filteredPlans.length === 0 ? (
                      <div className="py-10 px-4 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 space-y-2">
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                          No data plans match your current filter.
                        </p>
                        {(planSearch || selectedCategory !== 'ALL') && (
                          <button
                            type="button"
                            onClick={() => {
                              setPlanSearch('');
                              setSelectedCategory('ALL');
                            }}
                            className="text-xs font-semibold text-[#126BEB] dark:text-[#38BDF8] hover:underline cursor-pointer"
                          >
                            Show all {activeNetworkConfig.name} plans
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="max-h-[340px] sm:max-h-[380px] overflow-y-auto overscroll-contain p-1 -m-1">
                        <div className="grid grid-cols-2 gap-2">
                          {filteredPlans.map((plan, index) => {
                            const isSelected = selectedPlanId === plan.id;
                            return (
                              <label
                                key={plan.id}
                                className={`relative min-h-[76px] p-2.5 sm:p-3 rounded-xl border text-left transition-colors flex flex-col justify-between gap-1.5 cursor-pointer has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[#126BEB] ${
                                  isSelected
                                    ? 'border-[#126BEB] ring-2 ring-[#126BEB]/25 bg-blue-50/40 dark:bg-blue-950/25'
                                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-[#070D18]/70 hover:border-slate-300 dark:hover:border-slate-700'
                                }`}
                              >
                                <input
                                  ref={index === 0 ? firstPlanInputRef : undefined}
                                  type="radio"
                                  name="dataPlan"
                                  value={plan.id}
                                  checked={isSelected}
                                  aria-describedby={showPlanError ? planErrorId : undefined}
                                  onChange={() => {
                                    setSelectedPlanId(plan.id);
                                    clearBlurAnnouncement();
                                  }}
                                  className="sr-only"
                                />

                                <div className="space-y-0.5 min-w-0">
                                  <div className="flex items-start justify-between gap-1.5">
                                    <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white tracking-tight truncate">
                                      {plan.dataAllowance}
                                    </span>

                                    <div className="flex items-center gap-1 shrink-0">
                                      {(plan.dataType === 'SME' || plan.category === 'SME') && (
                                        <span className="text-[9px] sm:text-[10px] px-1 py-0.5 rounded bg-blue-500/10 text-[#126BEB] dark:text-[#38BDF8] font-semibold">
                                          SME
                                        </span>
                                      )}
                                      <span className="text-[9px] sm:text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                                        {plan.validity}
                                      </span>
                                    </div>
                                  </div>

                                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                    {plan.name}
                                  </p>
                                </div>

                                <div className="pt-1.5 border-t border-slate-200/70 dark:border-slate-800/80 flex items-center justify-between gap-2">
                                  <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white tabular-nums">
                                    ₦{plan.priceNaira.toLocaleString()}
                                  </span>

                                  <span
                                    aria-hidden="true"
                                    className={`w-4 h-4 rounded-full flex items-center justify-center transition-opacity ${
                                      isSelected
                                        ? 'bg-[#126BEB] text-white opacity-100'
                                        : 'opacity-0'
                                    }`}
                                  >
                                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                                  </span>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {showPlanError && (
                    <p
                      id={planErrorId}
                      className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1.5"
                    >
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                      <span>{planValidationError}</span>
                    </p>
                  )}
                </fieldset>

                {exceedsBalance && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 rounded-lg px-3 py-2">
                    Selected bundle exceeds your current wallet balance.
                  </p>
                )}

                <div className="pt-1">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-11 px-4 rounded-lg bg-[#126BEB] hover:bg-[#0B5CC7] active:bg-[#094bb5] text-white font-semibold text-sm transition-colors flex items-center justify-center cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Buy Data
                  </button>
                </div>
              </form>
              )}
            </>
          )}
        </main>
      </div>

      {/* Native Confirmation Modal */}
      <ModalDialog
        isOpen={Boolean(isConfirmModalOpen && activePlan && !isSubmitting)}
        onClose={() => setIsConfirmModalOpen(false)}
        dismissible={!isSubmitting}
        ariaLabelledBy={confirmTitleId}
        maxWidthClass="max-w-sm"
        className="dark:bg-[#0B1528] text-slate-900 dark:text-white"
      >
        {activePlan && (
          <div className="p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <h2 id={confirmTitleId} className="text-sm font-semibold text-slate-900 dark:text-white">
                Confirm Data Purchase
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
              <div className="flex justify-between items-center gap-4">
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

              <div className="flex justify-between items-center gap-4">
                <dt className="text-slate-500 dark:text-slate-400">Phone Number</dt>
                <dd className="font-semibold text-slate-900 dark:text-white text-sm tabular-nums">
                  {phone}
                </dd>
              </div>

              <div className="flex justify-between items-center gap-4">
                <dt className="text-slate-500 dark:text-slate-400">Plan</dt>
                <dd className="font-semibold text-slate-900 dark:text-white text-right">
                  {activePlan.name}
                </dd>
              </div>

              <div className="flex justify-between items-center gap-4">
                <dt className="text-slate-500 dark:text-slate-400">Validity</dt>
                <dd className="font-medium text-slate-800 dark:text-slate-200">
                  {activePlan.validity}
                </dd>
              </div>

              <div className="flex justify-between items-center gap-4">
                <dt className="text-slate-500 dark:text-slate-400">Bundle Price</dt>
                <dd className="font-semibold text-slate-900 dark:text-white text-sm tabular-nums">
                  ₦{activePlan.priceNaira.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                </dd>
              </div>

              {planDiscountBps > 0 && estimatedDiscountNaira > 0 && (
                <div className="flex justify-between items-center gap-4 text-emerald-600 dark:text-emerald-400 font-medium">
                  <dt>Discount ({(planDiscountBps / 100).toFixed(1)}%)</dt>
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
                onClick={handlePurchase}
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
          setSelectedPlanId('');
          setSubmitAttempted(false);
          clearBlurAnnouncement();
          void refreshWallets();
        }}
        onStatusUpdated={(updated) => {
          setReceiptData(updated);
          void refreshWallets();
        }}
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
