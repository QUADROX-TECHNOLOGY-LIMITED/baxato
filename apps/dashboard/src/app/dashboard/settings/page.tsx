'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  User,
  Shield,
  Key,
  Mail,
  Smartphone,
  Laptop,
  Globe,
  Clock,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Lock,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Loader2,
  Calendar,
  Check,
  History,
  Copy,
  ExternalLink,
} from 'lucide-react';
import Sidebar from '@/components/dashboard/Sidebar';
import Header from '@/components/dashboard/Header';
import KycBanner from '@/components/dashboard/KycBanner';
import KycModal from '@/components/dashboard/KycModal';
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
  lastLoginAt: string;
  currentSession: {
    ipAddress: string;
    userAgent: string;
    lastActiveAt?: string;
  };
  auditLogs: AuditLogItem[];
}

type SettingsTab = 'profile' | 'security' | 'sessions' | 'audit';

export default function SettingsPage() {
  const router = useRouter();

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
  const [dob, setDob] = useState<string | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState('');
  const [profileErrorMsg, setProfileErrorMsg] = useState('');
  const [copiedUserId, setCopiedUserId] = useState(false);

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [isRequestingOtp, setIsRequestingOtp] = useState(false);
  const [isConfirmingOtp, setIsConfirmingOtp] = useState(false);
  const [passwordStep, setPasswordStep] = useState<'form' | 'verify'>('form');
  const [emailOtp, setEmailOtp] = useState('');
  const [otpCountdown, setOtpCountdown] = useState(600); // 10 minutes in seconds
  const [passErrorMsg, setPassErrorMsg] = useState('');
  const [passSuccessMsg, setPassSuccessMsg] = useState('');

  // Security & Sessions State
  const [securityData, setSecurityData] = useState<SecurityData | null>(null);
  const [isLoadingSecurity, setIsLoadingSecurity] = useState(false);

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
              : '***Verified***',
          );
        }
        if (u.dateOfBirth) {
          setDob(u.dateOfBirth);
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
      if (storedUser.firstName) setFirstName(storedUser.firstName);
      if (storedUser.lastName) setLastName(storedUser.lastName);
      if (storedUser.email) setEmail(storedUser.email);
      if (storedUser.phone) setPhoneNumber(storedUser.phone);
      if (storedUser.kycStatus) setKycStatus(storedUser.kycStatus);
      if (storedUser.firstName) setMerchantName(storedUser.firstName);
    }

    const storedBiz = getStoredBusiness();
    if (storedBiz && storedBiz.name) {
      setBusinessName(storedBiz.name);
    }

    loadProfile();
    loadSecurityData();
  }, []);

  // OTP Countdown Timer
  useEffect(() => {
    if (passwordStep !== 'verify' || otpCountdown <= 0) return;

    const timer = setInterval(() => {
      setOtpCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [passwordStep, otpCountdown]);

  // Handle Save Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSuccessMsg('');
    setProfileErrorMsg('');

    if (!firstName.trim() || !lastName.trim()) {
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
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          middleName: middleName.trim() || null,
        }),
      });

      const data = await res.json().catch(() => null);

      if (handleAuthResponse(res, data)) return;

      if (res.ok && data?.success) {
        setProfileSuccessMsg('Profile updated successfully.');
        setMerchantName(firstName.trim());
        try {
          const stored = getStoredUser() || ({} as any);
          localStorage.setItem(
            'bx_user',
            JSON.stringify({
              ...stored,
              firstName: firstName.trim(),
              lastName: lastName.trim(),
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

  // Step 1: Request Password Change Confirmation Code
  const handleRequestPasswordOtp = async (e: React.FormEvent) => {
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
      setPassErrorMsg('New passwords do not match. Please verify both fields.');
      return;
    }

    try {
      setIsRequestingOtp(true);
      const token = getStoredAuthToken();
      if (!token) {
        clearSessionAndRedirect('expired');
        return;
      }

      const res = await fetch('/api/auth/change-password/request', {
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

      if (handleAuthResponse(res, data)) return;

      if (res.ok && data?.success) {
        setPasswordStep('verify');
        setOtpCountdown(600);
        setPassSuccessMsg(
          'Confirmation code sent to your email. Enter the 6-digit code below to finalize.',
        );
      } else {
        setPassErrorMsg(data?.error?.message || 'Failed to initiate password change.');
      }
    } catch {
      setPassErrorMsg('Network error. Could not request confirmation code.');
    } finally {
      setIsRequestingOtp(false);
    }
  };

  // Step 2: Confirm Password Change with Email Code
  const handleConfirmPasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassErrorMsg('');
    setPassSuccessMsg('');

    if (!emailOtp.trim() || emailOtp.trim().length !== 6) {
      setPassErrorMsg('Please enter the exact 6-digit confirmation code from your email.');
      return;
    }

    try {
      setIsConfirmingOtp(true);
      const token = getStoredAuthToken();
      if (!token) {
        clearSessionAndRedirect('expired');
        return;
      }

      const res = await fetch('/api/auth/change-password/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          otp: emailOtp.trim(),
        }),
      });

      const data = await res.json().catch(() => null);

      if (handleAuthResponse(res, data)) return;

      if (res.ok && data?.success) {
        setPassSuccessMsg('Your password has been updated successfully.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setEmailOtp('');
        setPasswordStep('form');
        loadSecurityData();
        setTimeout(() => setPassSuccessMsg(''), 5000);
      } else {
        setPassErrorMsg(data?.error?.message || 'Invalid or expired confirmation code.');
      }
    } catch {
      setPassErrorMsg('Network error. Could not confirm password change.');
    } finally {
      setIsConfirmingOtp(false);
    }
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

  const formatDateTime = (dateStr: string) => {
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

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const parseUserAgent = (ua?: string | null) => {
    if (!ua) return 'Web Browser';
    if (ua.includes('Windows')) return 'Chrome on Windows';
    if (ua.includes('Macintosh')) return 'Safari on macOS';
    if (ua.includes('iPhone') || ua.includes('iPad')) return 'Mobile Safari (iOS)';
    if (ua.includes('Android')) return 'Mobile Chrome (Android)';
    if (ua.includes('Linux')) return 'Chrome on Linux';
    if (ua === 'lightMyRequest') return 'BAXATO Security Engine';
    return ua.slice(0, 28);
  };

  const tabs = [
    { id: 'profile' as const, label: 'Profile & Identity' },
    { id: 'security' as const, label: 'Security & Password' },
    { id: 'sessions' as const, label: 'Active Sessions' },
    { id: 'audit' as const, label: 'Audit Trail' },
  ];

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
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-5xl w-full mx-auto space-y-6">
          {/* KYC Alert Banner (if unverified) */}
          {!isVerified && (
            <KycBanner kycStatus={kycStatus} onOpenKycModal={() => setIsKycModalOpen(true)} />
          )}

          {/* Page Header */}
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <Link href="/dashboard" className="hover:text-slate-800 dark:hover:text-slate-200 transition-colors">
                Dashboard
              </Link>
              <span>/</span>
              <span className="text-slate-900 dark:text-slate-300 font-medium">Settings</span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
                  Account Settings
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Manage your personal identity, contact credentials, password, and security audit logs.
                </p>
              </div>

              {/* Verified Pill */}
              {isVerified ? (
                <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span>KYC Verified</span>
                </div>
              ) : (
                <button
                  onClick={() => setIsKycModalOpen(true)}
                  className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 hover:bg-amber-100 transition-colors"
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Verify Identity</span>
                </button>
              )}
            </div>
          </div>

          {/* Stripe-Style Sub-Navigation Tabs */}
          <div className="border-b border-slate-200 dark:border-slate-800">
            <nav className="flex space-x-8" aria-label="Tabs">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`whitespace-nowrap py-3 px-1 border-b-2 text-xs sm:text-sm font-medium transition-colors ${
                      isActive
                        ? 'border-slate-900 dark:border-white text-slate-900 dark:text-white font-semibold'
                        : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
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
            <div className="space-y-10 pt-2 pb-12">
              {/* Section 1: Personal Details */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-4">
                <div className="md:col-span-4 space-y-1">
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Personal Information
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Update your legal name as registered on official government identification.
                  </p>
                </div>

                <div className="md:col-span-8">
                  <div className="bg-white dark:bg-[#0c1424] rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
                    <form onSubmit={handleSaveProfile}>
                      <div className="p-6 space-y-5">
                        {/* Avatar & User ID Row */}
                        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800/80">
                          <div className="flex items-center gap-3.5">
                            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 font-semibold text-base">
                              {firstName ? firstName.charAt(0).toUpperCase() : 'M'}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-900 dark:text-white">
                                {firstName} {lastName}
                              </p>
                              <p className="text-xs text-slate-400 font-mono">
                                {email || 'merchant@baxato.ng'}
                              </p>
                            </div>
                          </div>

                          {userId && (
                            <button
                              type="button"
                              onClick={copyUserId}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-mono text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors"
                              title="Click to copy User ID"
                            >
                              <span>{userId.slice(0, 10)}...</span>
                              {copiedUserId ? (
                                <Check className="w-3 h-3 text-emerald-500" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          )}
                        </div>

                        {profileSuccessMsg && (
                          <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-400 text-xs font-medium flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                            <span>{profileSuccessMsg}</span>
                          </div>
                        )}

                        {profileErrorMsg && (
                          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 text-red-700 dark:text-red-400 text-xs font-medium flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{profileErrorMsg}</span>
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                              First Name
                            </label>
                            <input
                              type="text"
                              value={firstName}
                              onChange={(e) => setFirstName(e.target.value)}
                              required
                              placeholder="First name"
                              className="w-full h-9 px-3 text-sm rounded-lg bg-white dark:bg-[#070D18] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-slate-400 dark:focus:border-slate-600 focus:ring-1 focus:ring-slate-400/20 transition-all"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                              Last Name
                            </label>
                            <input
                              type="text"
                              value={lastName}
                              onChange={(e) => setLastName(e.target.value)}
                              required
                              placeholder="Last name"
                              className="w-full h-9 px-3 text-sm rounded-lg bg-white dark:bg-[#070D18] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-slate-400 dark:focus:border-slate-600 focus:ring-1 focus:ring-slate-400/20 transition-all"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                            Middle Name <span className="text-slate-400 font-normal">(Optional)</span>
                          </label>
                          <input
                            type="text"
                            value={middleName}
                            onChange={(e) => setMiddleName(e.target.value)}
                            placeholder="Middle name"
                            className="w-full h-9 px-3 text-sm rounded-lg bg-white dark:bg-[#070D18] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-slate-400 dark:focus:border-slate-600 focus:ring-1 focus:ring-slate-400/20 transition-all"
                          />
                        </div>
                      </div>

                      {/* Card Action Footer */}
                      <div className="px-6 py-3 bg-slate-50/70 dark:bg-slate-900/40 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between">
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Changes are logged to your security audit trail.
                        </p>
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
                  </div>
                </div>
              </div>

              {/* Section 2: Contact Channels */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-8 border-t border-slate-200/80 dark:border-slate-800/80">
                <div className="md:col-span-4 space-y-1">
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Contact Channels
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Verified channels used for password recovery, two-factor authentication, and security notifications.
                  </p>
                </div>

                <div className="md:col-span-8">
                  <div className="bg-white dark:bg-[#0c1424] rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] divide-y divide-slate-100 dark:divide-slate-800/80">
                    {/* Row 1: Email */}
                    <div className="p-5 flex items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-slate-900 dark:text-white">
                            Email address
                          </span>
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/40">
                            Verified
                          </span>
                        </div>
                        <p className="text-sm font-mono text-slate-600 dark:text-slate-300">
                          {email || 'Loading...'}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Used to receive 6-digit confirmation codes for password changes.
                        </p>
                      </div>

                      <span className="p-1.5 text-slate-400" title="Contact email is locked for security">
                        <Lock className="w-4 h-4" />
                      </span>
                    </div>

                    {/* Row 2: Phone / WhatsApp */}
                    <div className="p-5 flex items-center justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-slate-900 dark:text-white">
                            Phone number
                          </span>
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/40">
                            WhatsApp Verified
                          </span>
                        </div>
                        <p className="text-sm font-mono text-slate-600 dark:text-slate-300">
                          {phoneNumber || 'Loading...'}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Verified via WhatsApp Cloud OTP during registration.
                        </p>
                      </div>

                      <span className="p-1.5 text-slate-400" title="Verified phone is locked for security">
                        <Lock className="w-4 h-4" />
                      </span>
                    </div>

                    {/* Card Footer */}
                    <div className="px-6 py-3 bg-slate-50/70 dark:bg-slate-900/40">
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        To update verified email or phone credentials, please submit an identity verification ticket to compliance.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 3: National Identity (KYC) */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-8 border-t border-slate-200/80 dark:border-slate-800/80">
                <div className="md:col-span-4 space-y-1">
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                    National Identity & KYC
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Identity authentication status connected to the National Identity Management Commission (NIMC).
                  </p>
                </div>

                <div className="md:col-span-8">
                  <div className="bg-white dark:bg-[#0c1424] rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
                    {isVerified ? (
                      <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                        <div className="p-5 flex items-center justify-between gap-4">
                          <div>
                            <span className="text-xs font-medium text-slate-500 block mb-1">
                              National Identity Number (NIN)
                            </span>
                            <span className="text-sm font-mono font-semibold text-slate-900 dark:text-white">
                              {ninMasked || 'Verified in Vault'}
                            </span>
                          </div>
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/40">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Tier 1 Verified</span>
                          </span>
                        </div>

                        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <span className="text-xs font-medium text-slate-500 block mb-1">
                              Date of Birth
                            </span>
                            <span className="text-sm text-slate-900 dark:text-white font-medium">
                              {dob ? formatDateTime(dob).split(',')[0] : 'Verified on Record'}
                            </span>
                          </div>

                          <div>
                            <span className="text-xs font-medium text-slate-500 block mb-1">
                              Verification Authority
                            </span>
                            <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                              NIMC Database Authenticated
                            </span>
                          </div>
                        </div>

                        <div className="px-6 py-3 bg-slate-50/70 dark:bg-slate-900/40">
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            Your identity is securely bound to your merchant account.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-6 space-y-4">
                        <div className="flex items-start gap-3">
                          <div className="w-9 h-9 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                            <AlertCircle className="w-4 h-4" />
                          </div>
                          <div>
                            <h3 className="text-sm font-medium text-slate-900 dark:text-white">
                              Identity Verification Required
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                              In compliance with Nigerian regulatory guidelines, verify your 11-digit NIN before performing prepaid wallet funding and utility top-ups.
                            </p>
                          </div>
                        </div>

                        <div className="pt-2 flex justify-end">
                          <button
                            type="button"
                            onClick={() => setIsKycModalOpen(true)}
                            className="h-8 px-4 rounded-lg text-xs font-medium bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90 transition-opacity"
                          >
                            Verify Identity Now
                          </button>
                        </div>
                      </div>
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
            <div className="space-y-10 pt-2 pb-12">
              {/* Section 1: Change Password */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-4">
                <div className="md:col-span-4 space-y-1">
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Account Password
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Ensure your account is protected with a strong password. Changes require two-step email confirmation.
                  </p>
                </div>

                <div className="md:col-span-8">
                  <div className="bg-white dark:bg-[#0c1424] rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
                    {passSuccessMsg && (
                      <div className="m-6 mb-0 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-400 text-xs font-medium flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>{passSuccessMsg}</span>
                      </div>
                    )}

                    {passErrorMsg && (
                      <div className="m-6 mb-0 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/40 text-red-700 dark:text-red-400 text-xs font-medium flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{passErrorMsg}</span>
                      </div>
                    )}

                    {passwordStep === 'form' ? (
                      /* Step 1: Input Current and New Passwords */
                      <form onSubmit={handleRequestPasswordOtp}>
                        <div className="p-6 space-y-4">
                          <div>
                            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                              Current Password
                            </label>
                            <div className="relative max-w-md">
                              <input
                                type={showCurrentPass ? 'text' : 'password'}
                                value={currentPassword}
                                onChange={(e) => setCurrentPassword(e.target.value)}
                                required
                                placeholder="••••••••••••"
                                className="w-full h-9 px-3 pr-10 text-sm rounded-lg bg-white dark:bg-[#070D18] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-slate-400 dark:focus:border-slate-600 focus:ring-1 focus:ring-slate-400/20 transition-all font-mono"
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
                              New Password
                            </label>
                            <div className="relative max-w-md">
                              <input
                                type={showNewPass ? 'text' : 'password'}
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                                minLength={8}
                                placeholder="Minimum 8 characters"
                                className="w-full h-9 px-3 pr-10 text-sm rounded-lg bg-white dark:bg-[#070D18] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-slate-400 dark:focus:border-slate-600 focus:ring-1 focus:ring-slate-400/20 transition-all font-mono"
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
                              Confirm New Password
                            </label>
                            <div className="relative max-w-md">
                              <input
                                type={showConfirmPass ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                minLength={8}
                                placeholder="Re-enter new password"
                                className="w-full h-9 px-3 pr-10 text-sm rounded-lg bg-white dark:bg-[#070D18] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-slate-400 dark:focus:border-slate-600 focus:ring-1 focus:ring-slate-400/20 transition-all font-mono"
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

                        <div className="px-6 py-3 bg-slate-50/70 dark:bg-slate-900/40 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between">
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            A 6-digit confirmation code will be dispatched to your email.
                          </p>
                          <button
                            type="submit"
                            disabled={isRequestingOtp}
                            className="h-8 px-4 rounded-lg text-xs font-medium bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90 transition-opacity flex items-center gap-1.5 disabled:opacity-50"
                          >
                            {isRequestingOtp ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Verifying...</span>
                              </>
                            ) : (
                              <span>Send confirmation code</span>
                            )}
                          </button>
                        </div>
                      </form>
                    ) : (
                      /* Step 2: Confirmation OTP Input */
                      <form onSubmit={handleConfirmPasswordChange}>
                        <div className="p-6 space-y-4">
                          <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 max-w-md">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                6-Digit Email Code
                              </span>
                              <span className="text-xs font-mono text-slate-500">
                                Expires in {formatCountdown(otpCountdown)}
                              </span>
                            </div>
                            <input
                              type="text"
                              maxLength={6}
                              value={emailOtp}
                              onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, ''))}
                              autoFocus
                              placeholder="••••••"
                              className="w-full h-11 text-center text-xl font-mono font-bold tracking-[0.4em] rounded-lg bg-white dark:bg-[#070D18] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-slate-500 transition-all"
                            />
                            <p className="text-[11px] text-slate-400 mt-2">
                              Enter code sent to <strong className="text-slate-600 dark:text-slate-300">{email}</strong>.
                            </p>
                          </div>
                        </div>

                        <div className="px-6 py-3 bg-slate-50/70 dark:bg-slate-900/40 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => setPasswordStep('form')}
                            className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-medium"
                          >
                            Cancel
                          </button>

                          <button
                            type="submit"
                            disabled={isConfirmingOtp || emailOtp.length !== 6}
                            className="h-8 px-4 rounded-lg text-xs font-medium bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90 transition-opacity flex items-center gap-1.5 disabled:opacity-50"
                          >
                            {isConfirmingOtp ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Updating...</span>
                              </>
                            ) : (
                              <span>Confirm & update password</span>
                            )}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>
              </div>

              {/* Section 2: Two-Factor & Login Policies */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-8 border-t border-slate-200/80 dark:border-slate-800/80">
                <div className="md:col-span-4 space-y-1">
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Login Protection
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Multi-factor security policies applied to your merchant console sessions.
                  </p>
                </div>

                <div className="md:col-span-8">
                  <div className="bg-white dark:bg-[#0c1424] rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] divide-y divide-slate-100 dark:divide-slate-800/80">
                    <div className="p-5 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-medium text-slate-900 dark:text-white">
                          Email OTP Verification
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Requires 6-digit one-time code for sensitive account actions and password changes.
                        </p>
                      </div>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/40">
                        Always On
                      </span>
                    </div>

                    <div className="p-5 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-medium text-slate-900 dark:text-white">
                          Session Inactivity Timeout
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Automatically locks your workspace after 15 minutes of inactivity.
                        </p>
                      </div>
                      <span className="text-xs font-mono text-slate-500">
                        15 minutes
                      </span>
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
            <div className="space-y-10 pt-2 pb-12">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-4">
                <div className="md:col-span-4 space-y-1">
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Current Device & Session
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    The active client session currently communicating with the BAXATO gateway.
                  </p>
                </div>

                <div className="md:col-span-8">
                  <div className="bg-white dark:bg-[#0c1424] rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
                    <div className="p-6 space-y-4">
                      {/* Active device card */}
                      <div className="p-4 rounded-lg bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/80 dark:border-slate-800 flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3.5">
                          <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 shrink-0 mt-0.5">
                            <Laptop className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-medium text-slate-900 dark:text-white">
                                {parseUserAgent(securityData?.currentSession?.userAgent)}
                              </p>
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/40">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                Current device
                              </span>
                            </div>
                            <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-1">
                              IP: {securityData?.currentSession?.ipAddress || '127.0.0.1'}
                            </p>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              Last login: {securityData?.lastLoginAt ? formatDateTime(securityData.lastLoginAt) : 'Active now'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="px-6 py-3 bg-slate-50/70 dark:bg-slate-900/40 border-t border-slate-200/80 dark:border-slate-800/80">
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        If you notice an unrecognized session, change your password immediately to terminate access.
                      </p>
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
            <div className="space-y-10 pt-2 pb-12">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 pt-4">
                <div className="md:col-span-4 space-y-1">
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Security Audit Trail
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Immutable security log of authentication events and account profile modifications.
                  </p>
                </div>

                <div className="md:col-span-8">
                  <div className="bg-white dark:bg-[#0c1424] rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
                    <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-500">
                        Recent 10 Security Events
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
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="border-b border-slate-100 dark:border-slate-800/80 text-slate-400 font-medium text-[11px]">
                              <th className="py-2.5 px-4 font-medium">Event</th>
                              <th className="py-2.5 px-4 font-medium">Client</th>
                              <th className="py-2.5 px-4 font-medium">IP Address</th>
                              <th className="py-2.5 px-4 font-medium text-right">Time</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-normal">
                            {securityData.auditLogs.map((log) => {
                              const action = log.action || 'UNKNOWN';
                              return (
                                <tr key={log.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/20 transition-colors">
                                  <td className="py-3 px-4">
                                    <span className="font-mono text-[11px] font-medium text-slate-800 dark:text-slate-200">
                                      {action}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                                    {parseUserAgent(log.userAgent)}
                                  </td>
                                  <td className="py-3 px-4 text-slate-400 font-mono text-[11px]">
                                    {log.ipAddress || '—'}
                                  </td>
                                  <td className="py-3 px-4 text-right text-slate-500 font-mono text-[11px]">
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
                        <p className="text-xs">No recent security events logged.</p>
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
