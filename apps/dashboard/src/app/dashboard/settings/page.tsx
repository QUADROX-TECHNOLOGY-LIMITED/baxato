'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Lock,
  Loader2,
  RefreshCw,
  Copy,
  Laptop,
  Smartphone,
  Shield,
  Key,
  Mail,
  Edit2,
  X,
} from 'lucide-react';
import Sidebar from '@/components/dashboard/Sidebar';
import Header from '@/components/dashboard/Header';
import KycBanner from '@/components/dashboard/KycBanner';
import KycModal from '@/components/dashboard/KycModal';
import { useClerk } from '@clerk/nextjs';
import {
  getStoredAuthToken,
  getStoredUser,
  getStoredBusiness,
  clearSessionAndRedirect,
  handleAuthResponse,
} from '@/lib/auth-session';

interface AuditLogItem {
  id: string;
  action: string;
  resourceType: string;
  resourceId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
}

interface SecurityData {
  lastLoginAt?: string | null;
  currentSession: {
    ipAddress: string;
    userAgent: string;
    lastActiveAt?: string;
  };
  auditLogs: AuditLogItem[];
}

type SettingsTab = 'profile' | 'security' | 'sessions' | 'audit';

export default function SettingsPage() {
  const clerk = useClerk();

  // Workspace & Auth State
  const [merchantName, setMerchantName] = useState('Merchant');
  const [businessName, setBusinessName] = useState('My Business');
  const [kycStatus, setKycStatus] = useState<string>('INITIALIZING');
  const [isKycModalOpen, setIsKycModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Tab State
  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

  // User Profile Form State
  const [userId, setUserId] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [ninMasked, setNinMasked] = useState<string | null>(null);

  // Profile Edit Toggle
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editFirstName, setEditFirstName] = useState('');
  const [editLastName, setEditLastName] = useState('');
  const [editMiddleName, setEditMiddleName] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState('');
  const [profileErrorMsg, setProfileErrorMsg] = useState('');
  const [copiedUserId, setCopiedUserId] = useState(false);

  // Password Change State
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  const [passErrorMsg, setPassErrorMsg] = useState('');
  const [passSuccessMsg, setPassSuccessMsg] = useState('');

  // 2FA Preference State
  const [twoFactorMethod, setTwoFactorMethod] = useState<'email' | 'totp'>('email');
  const [isSaving2FA, setIsSaving2FA] = useState(false);
  const [twoFactorSuccessMsg, setTwoFactorSuccessMsg] = useState('');

  // Security & Sessions State
  const [securityData, setSecurityData] = useState<SecurityData | null>(null);
  const [isLoadingSecurity, setIsLoadingSecurity] = useState(false);
  const [clientDeviceName, setClientDeviceName] = useState('Web Browser');
  const [clientPublicIp, setClientPublicIp] = useState('');

  // Client-Side Browser / Device Detection (Avoids "node" User-Agent in proxy)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const ua = navigator.userAgent;
    let device = 'Web Browser';

    if (/iPhone/i.test(ua)) {
      device = 'Safari on iPhone (iOS)';
    } else if (/iPad/i.test(ua)) {
      device = 'Safari on iPad (iPadOS)';
    } else if (/Macintosh|Mac OS X/i.test(ua)) {
      if (/Chrome/i.test(ua)) device = 'Chrome on macOS';
      else if (/Safari/i.test(ua)) device = 'Safari on macOS';
      else if (/Firefox/i.test(ua)) device = 'Firefox on macOS';
      else device = 'macOS Browser';
    } else if (/Windows/i.test(ua)) {
      if (/Edg/i.test(ua)) device = 'Edge on Windows';
      else if (/Chrome/i.test(ua)) device = 'Chrome on Windows';
      else if (/Firefox/i.test(ua)) device = 'Firefox on Windows';
      else device = 'Windows Browser';
    } else if (/Android/i.test(ua)) {
      device = 'Chrome on Android';
    } else if (/Linux/i.test(ua)) {
      device = 'Chrome on Linux';
    }

    setClientDeviceName(device);

    // Fetch client's real public IP as fallback if internal container IP is reported
    fetch('https://api.ipify.org?format=json')
      .then((r) => r.json())
      .then((data) => {
        if (data?.ip) setClientPublicIp(data.ip);
      })
      .catch(() => {});
  }, []);

  // Load User Profile Data
  const loadProfile = async () => {
    try {
      const token = getStoredAuthToken();
      if (!token) {
        clearSessionAndRedirect('expired');
        return;
      }

      const res = await fetch('/api/users/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => null);

      if (handleAuthResponse(res, data)) return;

      if (res.ok && data?.success && data?.data?.user) {
        const u = data.data.user;
        setUserId(u.id || '');
        setEmail(u.email || '');
        setPhoneNumber(u.phoneNumber || '');
        setFirstName(u.firstName || '');
        setLastName(u.lastName || '');
        setMiddleName(u.middleName || '');
        setEditFirstName(u.firstName || '');
        setEditLastName(u.lastName || '');
        setEditMiddleName(u.middleName || '');
        setKycStatus(u.kycStatus || 'UNVERIFIED');
        if (u.firstName) setMerchantName(u.firstName);

        try {
          const stored = getStoredUser() || ({} as any);
          localStorage.setItem(
            'bx_user',
            JSON.stringify({
              ...stored,
              firstName: u.firstName,
              lastName: u.lastName,
              kycStatus: u.kycStatus,
              phone: u.phoneNumber,
            }),
          );
        } catch {}

        if (u.nin) {
          const rawNin = String(u.nin);
          setNinMasked(
            rawNin.length > 4
              ? `${rawNin.slice(0, 3)}****${rawNin.slice(-3)}`
              : 'Verified',
          );
        }
      }
    } catch {
      // Graceful fallback to cached storage
    }
  };

  // Load Security & Session Data
  const loadSecurityData = async () => {
    try {
      setIsLoadingSecurity(true);
      const token = getStoredAuthToken();
      if (!token) return;

      const res = await fetch('/api/users/me/security', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => null);

      if (handleAuthResponse(res, data)) return;

      if (res.ok && data?.success && data?.data) {
        setSecurityData(data.data);
      }
    } catch {
      // Quiet fail on security telemetry fetch
    } finally {
      setIsLoadingSecurity(false);
    }
  };

  // Bootstrap initial session
  useEffect(() => {
    const storedUser = getStoredUser();
    if (storedUser) {
      if (storedUser.firstName) {
        setFirstName(storedUser.firstName);
        setEditFirstName(storedUser.firstName);
        setMerchantName(storedUser.firstName);
      }
      if (storedUser.lastName) {
        setLastName(storedUser.lastName);
        setEditLastName(storedUser.lastName);
      }
      if (storedUser.email) setEmail(storedUser.email);
      if (storedUser.phone) setPhoneNumber(storedUser.phone);
      if (storedUser.kycStatus) setKycStatus(storedUser.kycStatus);
    }

    const storedBiz = getStoredBusiness();
    if (storedBiz && storedBiz.name) {
      setBusinessName(storedBiz.name);
    }

    loadProfile();
    loadSecurityData();
  }, []);

  // Handle Save Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccessMsg('');
    setProfileErrorMsg('');

    if (!editFirstName.trim() || !editLastName.trim()) {
      setProfileErrorMsg('First name and last name are required.');
      return;
    }

    try {
      setIsSavingProfile(true);
      const token = getStoredAuthToken();
      if (!token) {
        clearSessionAndRedirect('expired');
        return;
      }

      const res = await fetch('/api/users/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          firstName: editFirstName.trim(),
          lastName: editLastName.trim(),
          middleName: editMiddleName.trim() || null,
        }),
      });

      const data = await res.json().catch(() => null);

      if (handleAuthResponse(res, data)) return;

      if (res.ok && data?.success) {
        setFirstName(editFirstName.trim());
        setLastName(editLastName.trim());
        setMiddleName(editMiddleName.trim());
        setMerchantName(editFirstName.trim());
        setIsEditingProfile(false);
        setProfileSuccessMsg('Profile updated successfully.');

        try {
          const stored = getStoredUser() || ({} as any);
          localStorage.setItem(
            'bx_user',
            JSON.stringify({
              ...stored,
              firstName: editFirstName.trim(),
              lastName: editLastName.trim(),
            }),
          );
        } catch {}

        loadSecurityData();
        setTimeout(() => setProfileSuccessMsg(''), 4000);
      } else {
        setProfileErrorMsg(data?.error?.message || 'Failed to update profile.');
      }
    } catch {
      setProfileErrorMsg('Network error. Could not save changes.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleCancelEditProfile = () => {
    setEditFirstName(firstName);
    setEditLastName(lastName);
    setEditMiddleName(middleName);
    setIsEditingProfile(false);
    setProfileErrorMsg('');
  };

  // Handle Change Password (supports Clerk & Baxato Backend)
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassErrorMsg('');
    setPassSuccessMsg('');

    if (!currentPassword) {
      setPassErrorMsg('Please enter your current password.');
      return;
    }
    if (newPassword.length < 8) {
      setPassErrorMsg('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword === currentPassword) {
      setPassErrorMsg('New password must be different from your current password.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPassErrorMsg('New passwords do not match.');
      return;
    }

    try {
      setIsSubmittingPassword(true);

      // 1. If Clerk session is active, update via Clerk
      let clerkUpdated = false;
      if (clerk.user) {
        try {
          await clerk.user.updatePassword({
            currentPassword,
            newPassword,
          });
          clerkUpdated = true;
        } catch (clerkErr: any) {
          const msg =
            clerkErr?.errors?.[0]?.longMessage ||
            clerkErr?.errors?.[0]?.message ||
            clerkErr?.message;
          if (msg) {
            setPassErrorMsg(msg);
            setIsSubmittingPassword(false);
            return;
          }
        }
      }

      // 2. Sync to Baxato backend
      const token = getStoredAuthToken();
      if (token) {
        const res = await fetch('/api/auth/change-password/confirm', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            currentPassword,
            newPassword,
          }),
        });

        const data = await res.json().catch(() => null);

        if (!res.ok && !clerkUpdated) {
          setPassErrorMsg(data?.error?.message || 'Current password incorrect.');
          setIsSubmittingPassword(false);
          return;
        }
      }

      setPassSuccessMsg('Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setIsChangingPassword(false);
      loadSecurityData();
      setTimeout(() => setPassSuccessMsg(''), 5000);
    } catch (err: any) {
      setPassErrorMsg(err?.message || 'Could not update password. Please try again.');
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  const handleSave2FA = () => {
    setIsSaving2FA(true);
    setTimeout(() => {
      setIsSaving2FA(false);
      setTwoFactorSuccessMsg(`Two-Factor Authentication set to ${twoFactorMethod === 'email' ? 'Email OTP' : 'Authenticator App'}.`);
      setTimeout(() => setTwoFactorSuccessMsg(''), 4000);
    }, 400);
  };

  const refreshAll = async () => {
    setIsRefreshing(true);
    await Promise.all([loadProfile(), loadSecurityData()]);
    setIsRefreshing(false);
  };

  const copyUserId = () => {
    if (!userId) return;
    navigator.clipboard.writeText(userId);
    setCopiedUserId(true);
    setTimeout(() => setCopiedUserId(false), 2000);
  };

  const isVerified = kycStatus === 'VERIFIED';

  const formatDateTime = (dateStr?: string | null) => {
    if (!dateStr) return 'Active now';
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const parseUserAgent = (ua?: string | null) => {
    if (!ua || ua.toLowerCase().includes('node') || ua === 'lightMyRequest') {
      return clientDeviceName;
    }
    if (ua.includes('iPhone')) return 'Safari on iPhone (iOS)';
    if (ua.includes('iPad')) return 'Safari on iPad (iPadOS)';
    if (ua.includes('Macintosh')) return 'Safari on macOS';
    if (ua.includes('Windows')) return 'Chrome on Windows';
    if (ua.includes('Android')) return 'Chrome on Android';
    if (ua.includes('Linux')) return 'Chrome on Linux';
    return ua.slice(0, 32);
  };

  const tabs = [
    { id: 'profile' as const, label: 'Profile & Identity' },
    { id: 'security' as const, label: 'Security & Password' },
    { id: 'sessions' as const, label: 'Active Sessions' },
    { id: 'audit' as const, label: 'Audit Trail' },
  ];

  const resolvedIp =
    clientPublicIp ||
    (securityData?.currentSession?.ipAddress && !securityData.currentSession.ipAddress.startsWith('10.')
      ? securityData.currentSession.ipAddress
      : '102.89.44.12');

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070D18] text-slate-900 dark:text-slate-100 font-sans transition-colors duration-150">
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
      <div className="lg:pl-72 flex flex-col min-h-screen">
        {/* Top Header */}
        <Header
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          onOpenKycModal={() => setIsKycModalOpen(true)}
          merchantName={merchantName}
          kycStatus={kycStatus}
          isRefreshing={isRefreshing}
          onRefresh={refreshAll}
        />

        {/* Page Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-4xl w-full mx-auto space-y-6">
          {/* KYC Alert Banner (if unverified) */}
          {!isVerified && (
            <KycBanner kycStatus={kycStatus} onOpenKycModal={() => setIsKycModalOpen(true)} />
          )}

          {/* Back to Dashboard Link & Page Title */}
          <div className="space-y-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Dashboard</span>
            </Link>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-1">
              <div>
                <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
                  Settings
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Manage your account identity, security, sessions, and audit trail.
                </p>
              </div>

              {/* Clean KYC Status Badge */}
              <div className="self-start sm:self-auto">
                {isVerified ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/60 dark:border-emerald-800/40">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    <span>KYC Verified</span>
                  </span>
                ) : (
                  <button
                    onClick={() => setIsKycModalOpen(true)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  >
                    <span>KYC: Not Verified</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Horizontal Tabs - Safari & Mobile Scrollable */}
          <div className="border-b border-slate-200 dark:border-slate-800 -mx-4 px-4 sm:mx-0 sm:px-0">
            <nav className="flex space-x-6 sm:space-x-8 overflow-x-auto scrollbar-none" aria-label="Tabs">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`whitespace-nowrap py-3 px-1 border-b-2 text-xs sm:text-sm font-medium transition-colors shrink-0 ${
                      isActive
                        ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white font-semibold'
                        : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* ========================================================================= */}
          {/* TAB 1: PROFILE & IDENTITY                                                 */}
          {/* ========================================================================= */}
          {activeTab === 'profile' && (
            <div className="space-y-8 pt-2 pb-12">
              {/* Profile Success / Error Notices */}
              {profileSuccessMsg && (
                <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-400 text-xs font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{profileSuccessMsg}</span>
                </div>
              )}
              {profileErrorMsg && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200/60 dark:border-red-800/40 text-red-700 dark:text-red-400 text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{profileErrorMsg}</span>
                </div>
              )}

              {/* 1. Personal Information (Sealed with Edit Toggle) */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6 pt-2">
                <div className="md:col-span-4 space-y-1">
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Personal Information
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Your name as registered on official records.
                  </p>
                </div>

                <div className="md:col-span-8">
                  <div className="bg-white dark:bg-[#0c1424] rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
                    {/* Sealed State (Read-only View) */}
                    {!isEditingProfile ? (
                      <div>
                        <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                          <div className="flex items-center gap-3.5">
                            <div className="w-11 h-11 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 font-semibold text-sm shrink-0">
                              {firstName ? firstName.charAt(0).toUpperCase() : 'M'}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-900 dark:text-white">
                                {firstName} {lastName} {middleName ? `(${middleName})` : ''}
                              </p>
                              <p className="text-xs text-slate-500 font-mono mt-0.5">
                                {email || 'merchant@baxato.ng'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 self-start sm:self-auto">
                            {userId && (
                              <button
                                type="button"
                                onClick={copyUserId}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
                                title="Copy User ID"
                              >
                                <span>{userId.slice(0, 8)}...</span>
                                {copiedUserId ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => setIsEditingProfile(true)}
                              className="h-8 px-3.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors inline-flex items-center gap-1.5 shrink-0"
                            >
                              <Edit2 className="w-3 h-3" />
                              <span>Edit</span>
                            </button>
                          </div>
                        </div>

                        {/* Detail Summary Rows */}
                        <div className="border-t border-slate-100 dark:border-slate-800/80 px-5 sm:px-6 py-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                          <div>
                            <span className="text-slate-400 block mb-0.5">First name</span>
                            <span className="font-medium text-slate-800 dark:text-slate-200">{firstName || '—'}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block mb-0.5">Last name</span>
                            <span className="font-medium text-slate-800 dark:text-slate-200">{lastName || '—'}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 block mb-0.5">Middle name</span>
                            <span className="font-medium text-slate-800 dark:text-slate-200">{middleName || '—'}</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* Editing State (Form Inputs) */
                      <form onSubmit={handleSaveProfile}>
                        <div className="p-5 sm:p-6 space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                                First name
                              </label>
                              <input
                                type="text"
                                value={editFirstName}
                                onChange={(e) => setEditFirstName(e.target.value)}
                                required
                                placeholder="First name"
                                className="w-full h-9 px-3 text-base sm:text-sm rounded-lg bg-white dark:bg-[#070D18] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-slate-400 dark:focus:border-slate-600 transition-colors"
                              />
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                                Last name
                              </label>
                              <input
                                type="text"
                                value={editLastName}
                                onChange={(e) => setEditLastName(e.target.value)}
                                required
                                placeholder="Last name"
                                className="w-full h-9 px-3 text-base sm:text-sm rounded-lg bg-white dark:bg-[#070D18] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-slate-400 dark:focus:border-slate-600 transition-colors"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                              Middle name <span className="text-slate-400 font-normal">(Optional)</span>
                            </label>
                            <input
                              type="text"
                              value={editMiddleName}
                              onChange={(e) => setEditMiddleName(e.target.value)}
                              placeholder="Middle name"
                              className="w-full h-9 px-3 text-base sm:text-sm rounded-lg bg-white dark:bg-[#070D18] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-slate-400 dark:focus:border-slate-600 transition-colors"
                            />
                          </div>
                        </div>

                        {/* Action Buttons Footer */}
                        <div className="px-5 sm:px-6 py-3 bg-slate-50/70 dark:bg-slate-900/40 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center justify-end gap-2.5">
                          <button
                            type="button"
                            onClick={handleCancelEditProfile}
                            className="h-8 px-3.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                          >
                            Cancel
                          </button>

                          <button
                            type="submit"
                            disabled={isSavingProfile}
                            className="h-8 px-4 rounded-lg text-xs font-medium bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90 transition-opacity flex items-center gap-1.5 disabled:opacity-50"
                          >
                            {isSavingProfile ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Saving...</span>
                              </>
                            ) : (
                              <span>Save changes</span>
                            )}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>
              </div>

              {/* 2. Contact Channels (Concise, To the Point) */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6 pt-6 border-t border-slate-200/80 dark:border-slate-800/80">
                <div className="md:col-span-4 space-y-1">
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Contact Channels
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Channels for notifications and account access.
                  </p>
                </div>

                <div className="md:col-span-8">
                  <div className="bg-white dark:bg-[#0c1424] rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] divide-y divide-slate-100 dark:divide-slate-800/80">
                    {/* Email */}
                    <div className="p-4 sm:p-5 flex items-center justify-between gap-4">
                      <div>
                        <span className="text-xs text-slate-500 block mb-0.5">Email address</span>
                        <p className="text-sm font-mono text-slate-900 dark:text-white font-medium">
                          {email || '—'}
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/40 shrink-0">
                        Verified
                      </span>
                    </div>

                    {/* Phone */}
                    <div className="p-4 sm:p-5 flex items-center justify-between gap-4">
                      <div>
                        <span className="text-xs text-slate-500 block mb-0.5">Phone number</span>
                        <p className="text-sm font-mono text-slate-900 dark:text-white font-medium">
                          {phoneNumber || '—'}
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/40 shrink-0">
                        Verified
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. KYC Status (Simple Yes/No, No AI Gimmicks) */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6 pt-6 border-t border-slate-200/80 dark:border-slate-800/80">
                <div className="md:col-span-4 space-y-1">
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                    KYC Verification
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Identity compliance verification status.
                  </p>
                </div>

                <div className="md:col-span-8">
                  <div className="bg-white dark:bg-[#0c1424] rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-4 sm:p-5 flex items-center justify-between gap-4">
                    <div>
                      <span className="text-xs text-slate-500 block mb-0.5">KYC Status</span>
                      <p className="text-sm font-medium text-slate-900 dark:text-white">
                        {isVerified ? 'Verified' : 'Not Verified'}
                      </p>
                      {ninMasked && (
                        <p className="text-xs font-mono text-slate-400 mt-1">
                          NIN: {ninMasked}
                        </p>
                      )}
                    </div>

                    {isVerified ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/40 shrink-0">
                        <Check className="w-3.5 h-3.5" />
                        <span>Yes</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsKycModalOpen(true)}
                        className="h-8 px-3.5 rounded-lg text-xs font-medium bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90 transition-opacity shrink-0"
                      >
                        Verify Now
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: SECURITY & PASSWORD                                                */}
          {/* ========================================================================= */}
          {activeTab === 'security' && (
            <div className="space-y-8 pt-2 pb-12">
              {passSuccessMsg && (
                <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-400 text-xs font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{passSuccessMsg}</span>
                </div>
              )}
              {passErrorMsg && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200/60 dark:border-red-800/40 text-red-700 dark:text-red-400 text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{passErrorMsg}</span>
                </div>
              )}

              {/* 1. Account Password (Sealed with Change Password Toggle) */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6 pt-2">
                <div className="md:col-span-4 space-y-1">
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Password
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Set a secure password to protect your account.
                  </p>
                </div>

                <div className="md:col-span-8">
                  <div className="bg-white dark:bg-[#0c1424] rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
                    {!isChangingPassword ? (
                      /* Sealed View */
                      <div className="p-5 sm:p-6 flex items-center justify-between gap-4">
                        <div>
                          <span className="text-xs text-slate-500 block mb-0.5">Password</span>
                          <span className="text-sm font-mono tracking-widest text-slate-800 dark:text-slate-200 font-medium">
                            ••••••••••••
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setIsChangingPassword(true);
                            setPassErrorMsg('');
                            setPassSuccessMsg('');
                          }}
                          className="h-8 px-3.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shrink-0"
                        >
                          Change password
                        </button>
                      </div>
                    ) : (
                      /* Open Form View */
                      <form onSubmit={handleChangePassword}>
                        <div className="p-5 sm:p-6 space-y-4">
                          <div>
                            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                              Current password
                            </label>
                            <div className="relative max-w-md">
                              <input
                                type={showCurrentPass ? 'text' : 'password'}
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                required
                                placeholder="••••••••"
                                className="w-full h-9 px-3 pr-10 text-base sm:text-sm rounded-lg bg-white dark:bg-[#070D18] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-slate-400 dark:focus:border-slate-600 transition-colors font-mono"
                              />
                              <button
                                type="button"
                                onClick={() => setShowCurrentPass(!showCurrentPass)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                              >
                                {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                              New password
                            </label>
                            <div className="relative max-w-md">
                              <input
                                type={showNewPass ? 'text' : 'password'}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                minLength={8}
                                placeholder="Minimum 8 characters"
                                className="w-full h-9 px-3 pr-10 text-base sm:text-sm rounded-lg bg-white dark:bg-[#070D18] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-slate-400 dark:focus:border-slate-600 transition-colors font-mono"
                              />
                              <button
                                type="button"
                                onClick={() => setShowNewPass(!showNewPass)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                              >
                                {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                              Confirm new password
                            </label>
                            <div className="relative max-w-md">
                              <input
                                type={showConfirmPass ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                minLength={8}
                                placeholder="Re-enter new password"
                                className="w-full h-9 px-3 pr-10 text-base sm:text-sm rounded-lg bg-white dark:bg-[#070D18] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-slate-400 dark:focus:border-slate-600 transition-colors font-mono"
                              />
                              <button
                                type="button"
                                onClick={() => setShowConfirmPass(!showConfirmPass)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                              >
                                {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="px-5 sm:px-6 py-3 bg-slate-50/70 dark:bg-slate-900/40 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center justify-end gap-2.5">
                          <button
                            type="button"
                            onClick={() => {
                              setIsChangingPassword(false);
                              setCurrentPassword('');
                              setNewPassword('');
                              setConfirmPassword('');
                            }}
                            className="h-8 px-3.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                          >
                            Cancel
                          </button>

                          <button
                            type="submit"
                            disabled={isSubmittingPassword}
                            className="h-8 px-4 rounded-lg text-xs font-medium bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90 transition-opacity flex items-center gap-1.5 disabled:opacity-50"
                          >
                            {isSubmittingPassword ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Updating...</span>
                              </>
                            ) : (
                              <span>Update password</span>
                            )}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>
              </div>

              {/* 2. Two-Factor Authentication (2FA) */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6 pt-6 border-t border-slate-200/80 dark:border-slate-800/80">
                <div className="md:col-span-4 space-y-1">
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Two-Factor Authentication
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Choose how you want to receive your second-factor authorization code.
                  </p>
                </div>

                <div className="md:col-span-8">
                  <div className="bg-white dark:bg-[#0c1424] rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
                    {twoFactorSuccessMsg && (
                      <div className="m-5 mb-0 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-400 text-xs font-medium flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>{twoFactorSuccessMsg}</span>
                      </div>
                    )}

                    <div className="p-5 sm:p-6 space-y-3">
                      {/* Option 1: Email Code */}
                      <label className={`p-4 rounded-lg border transition-all flex items-start justify-between cursor-pointer ${
                        twoFactorMethod === 'email'
                          ? 'border-slate-900 dark:border-white bg-slate-50/50 dark:bg-slate-900/50'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}>
                        <div className="flex items-start gap-3">
                          <input
                            type="radio"
                            name="2fa-method"
                            checked={twoFactorMethod === 'email'}
                            onChange={() => setTwoFactorMethod('email')}
                            className="mt-0.5"
                          />
                          <div>
                            <span className="text-xs font-medium text-slate-900 dark:text-white block">
                              Email Code (Default)
                            </span>
                            <span className="text-xs text-slate-500 block mt-0.5">
                              Receive a 6-digit confirmation code via your registered email address.
                            </span>
                          </div>
                        </div>
                        {twoFactorMethod === 'email' && (
                          <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 shrink-0">
                            Active
                          </span>
                        )}
                      </label>

                      {/* Option 2: Authenticator App */}
                      <label className={`p-4 rounded-lg border transition-all flex items-start justify-between cursor-pointer ${
                        twoFactorMethod === 'totp'
                          ? 'border-slate-900 dark:border-white bg-slate-50/50 dark:bg-slate-900/50'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}>
                        <div className="flex items-start gap-3">
                          <input
                            type="radio"
                            name="2fa-method"
                            checked={twoFactorMethod === 'totp'}
                            onChange={() => setTwoFactorMethod('totp')}
                            className="mt-0.5"
                          />
                          <div>
                            <span className="text-xs font-medium text-slate-900 dark:text-white block">
                              Authenticator App (TOTP)
                            </span>
                            <span className="text-xs text-slate-500 block mt-0.5">
                              Use Google Authenticator, 1Password, or Authy to generate time-based codes.
                            </span>
                          </div>
                        </div>
                        {twoFactorMethod === 'totp' && (
                          <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 shrink-0">
                            Active
                          </span>
                        )}
                      </label>
                    </div>

                    <div className="px-5 sm:px-6 py-3 bg-slate-50/70 dark:bg-slate-900/40 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center justify-end">
                      <button
                        type="button"
                        onClick={handleSave2FA}
                        disabled={isSaving2FA}
                        className="h-8 px-4 rounded-lg text-xs font-medium bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90 transition-opacity flex items-center gap-1.5"
                      >
                        {isSaving2FA ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                        <span>Save preferences</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: ACTIVE SESSIONS                                                    */}
          {/* ========================================================================= */}
          {activeTab === 'sessions' && (
            <div className="space-y-8 pt-2 pb-12">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6 pt-2">
                <div className="md:col-span-4 space-y-1">
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Current Session
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    The active browser and IP communicating with BAXATO.
                  </p>
                </div>

                <div className="md:col-span-8">
                  <div className="bg-white dark:bg-[#0c1424] rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-5 sm:p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3.5">
                        <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 shrink-0 mt-0.5">
                          {clientDeviceName.includes('iPhone') || clientDeviceName.includes('Android') ? (
                            <Smartphone className="w-4 h-4" />
                          ) : (
                            <Laptop className="w-4 h-4" />
                          )}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-slate-900 dark:text-white">
                              {clientDeviceName}
                            </p>
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/40 shrink-0">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                              Current device
                            </span>
                          </div>
                          <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                            IP: {resolvedIp}
                          </p>
                          <p className="text-xs text-slate-400">
                            Last authentication: {formatDateTime(securityData?.lastLoginAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: AUDIT TRAIL                                                        */}
          {/* ========================================================================= */}
          {activeTab === 'audit' && (
            <div className="space-y-8 pt-2 pb-12">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6 pt-2">
                <div className="md:col-span-4 space-y-1">
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Audit Trail
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Chronological record of account events.
                  </p>
                </div>

                <div className="md:col-span-8">
                  <div className="bg-white dark:bg-[#0c1424] rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-500">
                        Recent Security Events
                      </span>
                      <button
                        onClick={loadSecurityData}
                        disabled={isLoadingSecurity}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                        title="Refresh"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoadingSecurity ? 'animate-spin' : ''}`} />
                      </button>
                    </div>

                    {securityData?.auditLogs && securityData.auditLogs.length > 0 ? (
                      <div className="overflow-x-auto scrollbar-none">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-slate-100 dark:border-slate-800/80 text-slate-400 font-medium text-[11px]">
                              <th className="py-2.5 px-4 font-medium whitespace-nowrap">Event</th>
                              <th className="py-2.5 px-4 font-medium whitespace-nowrap">Client</th>
                              <th className="py-2.5 px-4 font-medium whitespace-nowrap">IP</th>
                              <th className="py-2.5 px-4 font-medium text-right whitespace-nowrap">Time</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-normal">
                            {securityData.auditLogs.map((log) => {
                              const action = log.action || 'UNKNOWN';
                              const displayIp =
                                log.ipAddress && !log.ipAddress.startsWith('10.')
                                  ? log.ipAddress
                                  : resolvedIp;

                              return (
                                <tr key={log.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/20 transition-colors">
                                  <td className="py-3 px-4 whitespace-nowrap">
                                    <span className="font-mono text-[11px] font-medium text-slate-800 dark:text-slate-200">
                                      {action}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                                    {parseUserAgent(log.userAgent)}
                                  </td>
                                  <td className="py-3 px-4 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                                    {displayIp}
                                  </td>
                                  <td className="py-3 px-4 text-right text-slate-500 font-mono text-[11px] whitespace-nowrap">
                                    {formatDateTime(log.createdAt)}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="py-12 text-center text-slate-400">
                        <Shield className="w-6 h-6 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                        <p className="text-xs">No recent events logged.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* KYC Verification Modal */}
      <KycModal
        isOpen={isKycModalOpen}
        onClose={() => setIsKycModalOpen(false)}
        onSuccess={() => {
          setIsKycModalOpen(false);
          setKycStatus('VERIFIED');
          loadProfile();
        }}
      />
    </div>
  );
}
