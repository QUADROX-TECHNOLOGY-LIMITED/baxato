'use client';

import React, { useCallback, useEffect, useId, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Building2,
  Check,
  History,
  Lock,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';
import Sidebar from '@/components/dashboard/Sidebar';
import Header from '@/components/dashboard/Header';
import KycBanner from '@/components/dashboard/KycBanner';
import KycModal from '@/components/dashboard/KycModal';
import AccessRestricted from '@/components/dashboard/AccessRestricted';
import BusinessLogsView from '@/components/dashboard/BusinessLogsView';
import BaxatoLoader from '@/components/BaxatoLoader';
import {
  clearSessionAndRedirect,
  getStoredAuthToken,
  getStoredBusiness,
  getStoredUser,
  handleAuthResponse,
  setActiveBusiness,
  type StoredBusiness,
} from '@/lib/auth-session';
import { showToast } from '@/lib/toast';

type BusinessSettingsTab = 'general' | 'logs';

interface NameHistoryEntry {
  previousName: string;
  newName: string;
  changedByUserId: string;
  changedByEmail?: string | null;
  changedAt: string;
}

interface BusinessDetailDto {
  id: string;
  name: string;
  initialName: string;
  nameChangeCount: number;
  maxNameChanges: number;
  remainingNameChanges: number;
  nameHistory: NameHistoryEntry[];
  slug: string;
  email: string | null;
  phoneNumber: string | null;
  websiteUrl: string | null;
  country: string;
  state: string;
  lga: string;
  status: string;
  ownerKycStatus: string;
  isOwner?: boolean;
  role?: string;
}

function formatHistoryDate(dateStr?: string): string {
  if (!dateStr) return '—';
  const dt = new Date(dateStr);
  if (Number.isNaN(dt.getTime())) return '—';
  return dt.toLocaleDateString('en-NG', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function BusinessSettingsPage() {
  const [isHydrated, setIsHydrated] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isKycModalOpen, setIsKycModalOpen] = useState(false);

  const [merchantName, setMerchantName] = useState('');
  const [userFirstName, setUserFirstName] = useState('');
  const [userLastName, setUserLastName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessId, setBusinessId] = useState('');
  const [kycStatus, setKycStatus] = useState('UNVERIFIED');
  const [userRole, setUserRole] = useState('');

  const [activeTab, setActiveTab] = useState<BusinessSettingsTab>('general');
  const [detail, setDetail] = useState<BusinessDetailDto | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Editable form state
  const [nameInput, setNameInput] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [websiteInput, setWebsiteInput] = useState('');

  const generalTabId = useId();
  const logsTabId = useId();
  const nameFieldId = useId();
  const emailFieldId = useId();
  const phoneFieldId = useId();
  const websiteFieldId = useId();
  const formHeadingId = useId();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('tab') === 'logs') {
      setActiveTab('logs');
    }
  }, []);

  const syncSessionContext = useCallback(() => {
    const token = getStoredAuthToken();
    const user = getStoredUser();
    const biz = getStoredBusiness();
    if (!token || !user) {
      clearSessionAndRedirect('expired');
      return null;
    }

    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    const role = (biz?.role || user.role || 'VIEWER').toUpperCase();
    setMerchantName(fullName || user.email || 'Merchant');
    setUserFirstName(user.firstName || '');
    setUserLastName(user.lastName || '');
    setBusinessName(biz?.name || 'Workspace');
    setBusinessId(biz?.id || '');
    setKycStatus((user.kycStatus || 'UNVERIFIED').toUpperCase());
    setUserRole(role);
    setIsHydrated(true);
    return { token, bizId: biz?.id || '', role };
  }, []);

  const loadBusinessDetail = useCallback(
    async (opts?: { silent?: boolean; targetBizId?: string; targetRole?: string }) => {
      const token = getStoredAuthToken();
      const biz = getStoredBusiness();
      const user = getStoredUser();
      const resolvedBizId = opts?.targetBizId ?? biz?.id ?? businessId;
      const resolvedRole = (opts?.targetRole ?? biz?.role ?? user?.role ?? userRole ?? '').toUpperCase();

      if (!token) {
        clearSessionAndRedirect('expired');
        return;
      }

      if (!['BUSINESS_OWNER', 'BUSINESS_ADMIN', 'SUPER_ADMIN'].includes(resolvedRole) || !resolvedBizId) {
        setDetail(null);
        setIsLoadingDetail(false);
        setIsRefreshing(false);
        return;
      }

      if (opts?.silent) {
        setIsRefreshing(true);
      } else {
        setIsLoadingDetail(true);
      }

      try {
        const res = await fetch(`/api/businesses/${encodeURIComponent(resolvedBizId)}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'x-business-id': resolvedBizId,
          },
          cache: 'no-store',
        });

        const json = await res.json().catch(() => null);
        if (handleAuthResponse(res, json)) return;

        if (!res.ok || !json?.success || !json.data) {
          throw new Error(json?.error?.message || 'Unable to load business settings.');
        }

        const bizData = json.data as BusinessDetailDto;
        setDetail(bizData);
        setBusinessName(bizData.name);
        setNameInput(bizData.name || '');
        setPhoneInput(bizData.phoneNumber || '');
        setWebsiteInput(bizData.websiteUrl || '');
      } catch (err) {
        showToast({
          type: 'error',
          title: 'Failed to load business settings',
          message: err instanceof Error ? err.message : 'Please try again.',
        });
      } finally {
        setIsLoadingDetail(false);
        setIsRefreshing(false);
      }
    },
    [businessId, userRole],
  );

  useEffect(() => {
    const ctx = syncSessionContext();
    if (!ctx) return;

    const handleBusinessSwitch = () => {
      const updated = syncSessionContext();
      if (updated) {
        loadBusinessDetail({
          silent: false,
          targetBizId: updated.bizId,
          targetRole: updated.role,
        });
      }
    };

    window.addEventListener('bx_business_switched', handleBusinessSwitch);
    return () => {
      window.removeEventListener('bx_business_switched', handleBusinessSwitch);
    };
  }, [loadBusinessDetail, syncSessionContext]);

  useEffect(() => {
    if (!isHydrated) return;
    loadBusinessDetail();
  }, [isHydrated, loadBusinessDetail]);

  const handleTabSelect = (tab: BusinessSettingsTab) => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (tab === 'logs') {
        url.searchParams.set('tab', 'logs');
      } else {
        url.searchParams.delete('tab');
      }
      window.history.replaceState({}, '', url.toString());
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detail || isSaving) return;

    const token = getStoredAuthToken();
    if (!token) {
      clearSessionAndRedirect('expired');
      return;
    }

    const trimmedName = nameInput.trim();
    if (trimmedName.length < 2) {
      showToast({
        type: 'error',
        title: 'Invalid business name',
        message: 'Business name must be at least 2 characters.',
      });
      return;
    }

    const isRenaming = trimmedName !== detail.name;
    if (isRenaming && detail.remainingNameChanges <= 0) {
      showToast({
        type: 'error',
        title: 'Name change limit reached',
        message: `Business name can only be changed up to ${detail.maxNameChanges} times.`,
      });
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(`/api/businesses/${encodeURIComponent(detail.id)}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'x-business-id': detail.id,
        },
        body: JSON.stringify({
          name: trimmedName,
          phoneNumber: phoneInput.trim(),
          websiteUrl: websiteInput.trim(),
        }),
      });

      const json = await res.json().catch(() => null);
      if (handleAuthResponse(res, json)) return;

      if (!res.ok || !json?.success) {
        throw new Error(json?.error?.message || 'Unable to save business settings.');
      }

      const updated = json.data?.business as Partial<BusinessDetailDto> | undefined;
      if (updated) {
        const merged: BusinessDetailDto = {
          ...detail,
          ...updated,
        };
        setDetail(merged);
        setBusinessName(merged.name);
        setNameInput(merged.name);
        setPhoneInput(merged.phoneNumber || '');
        setWebsiteInput(merged.websiteUrl || '');

        const currentStored = getStoredBusiness();
        if (currentStored && currentStored.id === merged.id) {
          const nextStored: StoredBusiness = {
            ...currentStored,
            name: merged.name,
            phoneNumber: merged.phoneNumber || undefined,
          };
          setActiveBusiness(nextStored);
        }
      }

      showToast({
        type: 'success',
        title: 'Business settings saved',
        message: isRenaming
          ? 'Your business details and name history have been updated.'
          : 'Your business contact details have been updated.',
      });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Save failed',
        message: err instanceof Error ? err.message : 'Unable to save business settings.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleKycSuccess = (updatedUser: { firstName?: string; lastName?: string }) => {
    setKycStatus('VERIFIED');
    if (updatedUser?.firstName) {
      setUserFirstName(updatedUser.firstName);
      setMerchantName(
        `${updatedUser.firstName} ${updatedUser.lastName || userLastName || ''}`.trim(),
      );
    }
    if (updatedUser?.lastName) {
      setUserLastName(updatedUser.lastName);
    }
    setIsKycModalOpen(false);
    loadBusinessDetail({ silent: true });
    showToast({
      type: 'success',
      title: 'Identity verified',
      message: 'Business settings are now unlocked.',
    });
  };

  if (!isHydrated) {
    return <BaxatoLoader variant="fullscreen" />;
  }

  const canManageBusiness = ['BUSINESS_OWNER', 'BUSINESS_ADMIN', 'SUPER_ADMIN'].includes(
    userRole,
  );
  const effectiveOwnerKyc = (detail?.ownerKycStatus || kycStatus).toUpperCase();
  const isWorkspaceVerified = effectiveOwnerKyc === 'VERIFIED';

  const hasChanges = detail
    ? nameInput.trim() !== detail.name ||
      phoneInput.trim() !== (detail.phoneNumber || '') ||
      websiteInput.trim() !== (detail.websiteUrl || '')
    : false;

  const canEditName = (detail?.remainingNameChanges ?? 3) > 0;

  return (
    <div className="min-h-screen bg-[#FFFFFF] dark:bg-[#070D18] text-slate-900 dark:text-slate-100 flex flex-col lg:flex-row transition-colors duration-150">
      <Sidebar
        businessName={businessName}
        merchantName={merchantName}
        kycStatus={kycStatus}
        userRole={userRole}
        onOpenKycModal={() => setIsKycModalOpen(true)}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 lg:pl-72">
        <Header
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onOpenKycModal={() => setIsKycModalOpen(true)}
          merchantName={merchantName}
          businessName={businessName}
          kycStatus={kycStatus}
          userRole={userRole}
          isRefreshing={isRefreshing}
          onRefresh={() => loadBusinessDetail({ silent: true })}
          sticky={false}
        />

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full space-y-6 min-w-0">
          <KycBanner
            kycStatus={kycStatus}
            userRole={userRole}
            onOpenKycModal={() => setIsKycModalOpen(true)}
          />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
              <span>Back to Dashboard</span>
            </Link>

            {canManageBusiness && isWorkspaceVerified && (
              <button
                type="button"
                onClick={() => loadBusinessDetail({ silent: true })}
                disabled={isRefreshing || isLoadingDetail}
                aria-label="Refresh business settings"
                className="inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1528] text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#126BEB]' : 'text-slate-400'}`}
                  aria-hidden="true"
                />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            )}
          </div>

          {!canManageBusiness ? (
            <AccessRestricted
              title="Access Restricted"
              description="Only Workspace Owners and Administrators can manage business settings and workspace logs."
            />
          ) : isLoadingDetail && !detail ? (
            <div className="space-y-4">
              <div className="h-8 w-56 rounded-lg bg-slate-100 dark:bg-slate-800/60 animate-pulse" />
              <div className="h-64 rounded-2xl bg-slate-100 dark:bg-slate-800/60 animate-pulse" />
            </div>
          ) : !isWorkspaceVerified ? (
            <section className="bg-[#FFFFFF] dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800 rounded-2xl p-8 max-w-lg mx-auto text-center space-y-4 mt-8">
              <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center text-amber-600 dark:text-amber-400 mx-auto">
                <ShieldAlert className="w-6 h-6" aria-hidden="true" />
              </div>
              <div className="space-y-1.5">
                <h1 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Identity Verification Required
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                  {detail?.isOwner !== false
                    ? 'Complete your NIN verification before viewing or updating Business Settings for this workspace.'
                    : 'The workspace owner must complete NIN verification before Business Settings can be accessed.'}
                </p>
              </div>
              {detail?.isOwner !== false && (
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setIsKycModalOpen(true)}
                    className="h-11 px-5 rounded-lg bg-[#126BEB] hover:bg-[#0B5CC7] text-white text-sm font-medium transition-colors cursor-pointer"
                  >
                    Verify Identity
                  </button>
                </div>
              )}
            </section>
          ) : (
            <>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Business Settings
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Manage details and workspace activity for{' '}
                  <span className="font-medium text-slate-800 dark:text-slate-200">
                    {detail?.name || businessName}
                  </span>
                  .
                </p>
              </div>

              {/* Tablist following modern-web-guidance tabs pattern */}
              <div className="border-b border-slate-200 dark:border-slate-800">
                <div
                  role="tablist"
                  aria-label="Business settings sections"
                  {...({ focusgroup: 'tablist nomemory' } as Record<string, string>)}
                  className="flex items-center gap-6 overflow-x-auto flex-nowrap"
                >
                  <button
                    type="button"
                    role="tab"
                    id={generalTabId}
                    aria-selected={activeTab === 'general'}
                    {...(activeTab === 'general' ? { focusgroupstart: '' } : {})}
                    onClick={() => handleTabSelect('general')}
                    className={`relative shrink-0 py-3 text-sm font-medium whitespace-nowrap cursor-pointer transition-colors ${
                      activeTab === 'general'
                        ? 'text-[#126BEB] dark:text-[#38BDF8] after:content-[""] after:absolute after:inset-x-0 after:bottom-0 after:border-b-2 after:border-[#126BEB] dark:after:border-[#38BDF8]'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    General
                  </button>

                  <button
                    type="button"
                    role="tab"
                    id={logsTabId}
                    aria-selected={activeTab === 'logs'}
                    {...(activeTab === 'logs' ? { focusgroupstart: '' } : {})}
                    onClick={() => handleTabSelect('logs')}
                    className={`relative shrink-0 py-3 text-sm font-medium whitespace-nowrap cursor-pointer transition-colors ${
                      activeTab === 'logs'
                        ? 'text-[#126BEB] dark:text-[#38BDF8] after:content-[""] after:absolute after:inset-x-0 after:bottom-0 after:border-b-2 after:border-[#126BEB] dark:after:border-[#38BDF8]'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    Logs
                  </button>
                </div>
              </div>

              {/* TAB 1: GENERAL BUSINESS PROFILE */}
              <div
                role="tabpanel"
                aria-labelledby={generalTabId}
                hidden={activeTab !== 'general'}
              >
                <div className="space-y-6 pt-1 pb-10">
                  <form
                    onSubmit={handleSaveSettings}
                    aria-labelledby={formHeadingId}
                    className="bg-[#FFFFFF] dark:bg-[#0B1528] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 space-y-5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-[#126BEB]/10 dark:bg-[#126BEB]/20 text-[#126BEB] dark:text-[#38BDF8] flex items-center justify-center shrink-0">
                          <Building2 className="w-4 h-4" aria-hidden="true" />
                        </div>
                        <div>
                          <h2
                            id={formHeadingId}
                            className="text-sm font-semibold text-slate-900 dark:text-white"
                          >
                            Business Profile
                          </h2>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Details for the active workspace
                          </p>
                        </div>
                      </div>

                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 w-fit tabular-nums">
                        {canEditName
                          ? `${detail?.remainingNameChanges ?? 3} of ${detail?.maxNameChanges ?? 3} name edits remaining`
                          : `Name limit reached (${detail?.maxNameChanges ?? 3}/${detail?.maxNameChanges ?? 3})`}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label
                          htmlFor={nameFieldId}
                          className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                        >
                          Business Name
                        </label>
                        <input
                          id={nameFieldId}
                          name="name"
                          type="text"
                          value={nameInput}
                          onChange={(e) => setNameInput(e.target.value)}
                          disabled={!canEditName}
                          required
                          minLength={2}
                          maxLength={120}
                          className={`w-full h-11 px-3.5 text-base sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#070D18] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#126BEB] focus:border-transparent ${
                            !canEditName ? 'opacity-60 cursor-not-allowed' : ''
                          }`}
                        />
                        {!canEditName && (
                          <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                            Maximum of 3 business name changes reached for this workspace.
                          </p>
                        )}
                      </div>

                      <div>
                        <label
                          htmlFor={emailFieldId}
                          className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                        >
                          Business Email
                        </label>
                        <div className="relative">
                          <input
                            id={emailFieldId}
                            name="email"
                            type="email"
                            value={detail?.email || '—'}
                            readOnly
                            disabled
                            className="w-full h-11 pl-3.5 pr-9 text-base sm:text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#070D18]/70 text-slate-600 dark:text-slate-400 cursor-not-allowed"
                          />
                          <Lock
                            className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                            aria-hidden="true"
                          />
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                          Workspace notification email cannot be changed.
                        </p>
                      </div>

                      <div>
                        <label
                          htmlFor={phoneFieldId}
                          className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                        >
                          Support Phone Number
                        </label>
                        <input
                          id={phoneFieldId}
                          name="phoneNumber"
                          type="tel"
                          autoComplete="tel"
                          value={phoneInput}
                          onChange={(e) => setPhoneInput(e.target.value)}
                          placeholder="+234 800 000 0000"
                          className="w-full h-11 px-3.5 text-base sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#070D18] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#126BEB] focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor={websiteFieldId}
                          className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                        >
                          Website URL
                        </label>
                        <input
                          id={websiteFieldId}
                          name="websiteUrl"
                          type="url"
                          autoComplete="url"
                          value={websiteInput}
                          onChange={(e) => setWebsiteInput(e.target.value)}
                          placeholder="https://yourbusiness.com"
                          className="w-full h-11 px-3.5 text-base sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#070D18] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#126BEB] focus:border-transparent"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                      <div className="p-3 rounded-xl bg-slate-50/70 dark:bg-[#070D18] border border-slate-200/60 dark:border-slate-800">
                        <span className="text-[11px] text-slate-400 block">Location</span>
                        <span className="font-medium text-slate-800 dark:text-slate-200 mt-0.5 block">
                          {[detail?.lga, detail?.state, detail?.country].filter(Boolean).join(', ') || '—'}
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-50/70 dark:bg-[#070D18] border border-slate-200/60 dark:border-slate-800">
                        <span className="text-[11px] text-slate-400 block">Workspace ID</span>
                        <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300 mt-0.5 block truncate">
                          {detail?.id || '—'}
                        </span>
                      </div>
                      <div className="p-3 rounded-xl bg-slate-50/70 dark:bg-[#070D18] border border-slate-200/60 dark:border-slate-800">
                        <span className="text-[11px] text-slate-400 block">Initial Registered Name</span>
                        <span className="font-medium text-slate-800 dark:text-slate-200 mt-0.5 block truncate">
                          {detail?.initialName || detail?.name || '—'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end pt-2">
                      <button
                        type="submit"
                        disabled={!hasChanges || isSaving}
                        className="h-11 px-5 rounded-lg bg-[#126BEB] hover:bg-[#0B5CC7] text-white text-sm font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                      >
                        {!isSaving && <Check className="w-4 h-4" aria-hidden="true" />}
                        <span>{isSaving ? 'Saving...' : 'Save'}</span>
                      </button>
                    </div>
                  </form>

                  {detail && detail.nameHistory && detail.nameHistory.length > 0 && (
                    <section className="bg-[#FFFFFF] dark:bg-[#0B1528] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 space-y-3">
                      <div className="flex items-center gap-2">
                        <History className="w-4 h-4 text-slate-400" aria-hidden="true" />
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                          Previous Business Names
                        </h3>
                      </div>
                      <ul className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                        {detail.nameHistory.map((item, idx) => (
                          <li
                            key={`${item.changedAt}-${idx}`}
                            className="py-2.5 flex flex-wrap items-center justify-between gap-2"
                          >
                            <div className="text-slate-700 dark:text-slate-300">
                              <span className="line-through text-slate-400 dark:text-slate-500">
                                {item.previousName}
                              </span>
                              <span className="mx-2 text-slate-400">&rarr;</span>
                              <span className="font-medium text-slate-900 dark:text-white">
                                {item.newName}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-400 tabular-nums">
                              {formatHistoryDate(item.changedAt)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}
                </div>
              </div>

              {/* TAB 2: WORKSPACE LOGS */}
              <div
                role="tabpanel"
                aria-labelledby={logsTabId}
                hidden={activeTab !== 'logs'}
              >
                <div className="pt-1 pb-10">
                  <BusinessLogsView
                    businessId={detail?.id || businessId}
                    enabled={isWorkspaceVerified && activeTab === 'logs'}
                  />
                </div>
              </div>
            </>
          )}
        </main>
      </div>

      <KycModal
        isOpen={isKycModalOpen}
        onClose={() => setIsKycModalOpen(false)}
        onSuccess={handleKycSuccess}
        userFirstName={userFirstName}
        userLastName={userLastName}
      />
    </div>
  );
}

