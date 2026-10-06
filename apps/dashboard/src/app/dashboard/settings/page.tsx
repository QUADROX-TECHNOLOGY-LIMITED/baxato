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
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'sessions'>('profile');

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

        // Update local session storage
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
            rawNin.length >= 6
              ? `${rawNin.slice(0, 3)}*****${rawNin.slice(-3)}`
              : 'Verified',
          );
        }
        if (u.dob) setDob(u.dob);
      }
    } catch {
      // Fallback to cached profile if network fails
    }
  };

  // Load Security & Audit Logs Data
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
    } finally {
      setIsLoadingSecurity(false);
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
        if (storedUser.firstName) {
          setMerchantName(storedUser.firstName);
          setFirstName(storedUser.firstName);
        }
        if (storedUser.lastName) setLastName(storedUser.lastName);
        if (storedUser.kycStatus) setKycStatus(storedUser.kycStatus);
        if (storedUser.phone) setPhoneNumber(storedUser.phone);
        if (storedUser.email) setEmail(storedUser.email);
      }
      if (storedBiz?.name) setBusinessName(storedBiz.name);
    } catch {}

    loadProfile();
    loadSecurityData();
  }, []);

  // OTP Countdown Timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (passwordStep === 'verify' && otpCountdown > 0) {
      timer = setInterval(() => {
        setOtpCountdown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [passwordStep, otpCountdown]);

  // Handle Profile Update
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileErrorMsg('');
    setProfileSuccessMsg('');

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
        setProfileSuccessMsg('Profile details updated successfully.');
        setMerchantName(firstName.trim());
        // Update local storage
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
          'Confirmation code sent to your registered email. Enter the 6-digit code below to finalize.',
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
        // Reset state
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setEmailOtp('');
        setPasswordStep('form');
        loadSecurityData();
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

  const isVerified = kycStatus === 'VERIFIED';

  // Format Helper for Audit Dates
  const formatDateTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleString('en-NG', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
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

  // User-Agent Display Parser
  const parseUserAgent = (ua?: string | null) => {
    if (!ua) return 'Web Browser';
    if (ua.includes('Windows')) return 'Chrome on Windows';
    if (ua.includes('Macintosh')) return 'Safari on macOS';
    if (ua.includes('iPhone') || ua.includes('iPad')) return 'Mobile Safari (iOS)';
    if (ua.includes('Android')) return 'Mobile Chrome (Android)';
    if (ua.includes('Linux')) return 'Chrome on Linux';
    if (ua === 'lightMyRequest') return 'BAXATO Security Engine';
    return ua.slice(0, 32);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#040810] text-slate-900 dark:text-slate-100 font-sans transition-colors duration-150">
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
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-6xl w-full mx-auto space-y-6">
          {/* KYC Alert Banner (if unverified) */}
          {!isVerified && (
            <KycBanner kycStatus={kycStatus} onOpenKycModal={() => setIsKycModalOpen(true)} />
          )}

          {/* Page Title & Breadcrumb Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800/80">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                <Link href="/dashboard" className="hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
                  Dashboard
                </Link>
                <span>/</span>
                <span className="text-[#126BEB] dark:text-[#38BDF8]">Account Settings</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                Settings & Security
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                Manage your personal identity, credentials, active sessions, and security audit trail.
              </p>
            </div>

            {/* Quick Session Status Indicator */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 self-start sm:self-auto">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Session Authenticated</span>
            </div>
          </div>

          {/* Navigation Segment Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 dark:bg-[#071120] rounded-xl border border-slate-200 dark:border-slate-800/80 w-full sm:w-fit">
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'profile'
                  ? 'bg-white dark:bg-[#0E1B31] text-[#126BEB] dark:text-[#38BDF8] shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Profile & Identity</span>
            </button>

            <button
              onClick={() => setActiveTab('security')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'security'
                  ? 'bg-white dark:bg-[#0E1B31] text-[#126BEB] dark:text-[#38BDF8] shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              <span>Security & Password</span>
            </button>

            <button
              onClick={() => setActiveTab('sessions')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'sessions'
                  ? 'bg-white dark:bg-[#0E1B31] text-[#126BEB] dark:text-[#38BDF8] shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Sessions & Activity Trail</span>
            </button>
          </div>

          {/* TAB 1: PROFILE & IDENTITY */}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              {/* Profile Details Card */}
              <div className="bg-white dark:bg-[#070D18] rounded-2xl border border-slate-200 dark:border-slate-800/80 p-5 sm:p-6 shadow-sm">
                <div className="flex items-center gap-3 pb-4 border-b border-slate-200 dark:border-slate-800/80">
                  <div className="w-10 h-10 rounded-xl bg-[#126BEB]/10 text-[#126BEB] dark:text-[#38BDF8] flex items-center justify-center">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                      Personal Details
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Update your account name and identity information.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSaveProfile} className="mt-5 space-y-4">
                  {profileSuccessMsg && (
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{profileSuccessMsg}</span>
                    </div>
                  )}

                  {profileErrorMsg && (
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{profileErrorMsg}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                        First Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                        placeholder="e.g. Mukhtar"
                        className="w-full h-10 px-3 text-sm rounded-xl bg-slate-50 dark:bg-[#0E1828] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#126BEB] focus:border-[#126BEB] transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                        Last Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required
                        placeholder="e.g. Aliyu"
                        className="w-full h-10 px-3 text-sm rounded-xl bg-slate-50 dark:bg-[#0E1828] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#126BEB] focus:border-[#126BEB] transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                        Middle Name <span className="text-slate-400 font-normal lowercase">(optional)</span>
                      </label>
                      <input
                        type="text"
                        value={middleName}
                        onChange={(e) => setMiddleName(e.target.value)}
                        placeholder="e.g. Babangida"
                        className="w-full h-10 px-3 text-sm rounded-xl bg-slate-50 dark:bg-[#0E1828] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#126BEB] focus:border-[#126BEB] transition-all"
                      />
                    </div>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={isSavingProfile}
                      className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#126BEB] text-white hover:bg-[#0F59C7] transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
                    >
                      {isSavingProfile ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Saving Changes...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Save Changes</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Verified Contact Credentials */}
              <div className="bg-white dark:bg-[#070D18] rounded-2xl border border-slate-200 dark:border-slate-800/80 p-5 sm:p-6 shadow-sm">
                <div className="flex items-center gap-3 pb-4 border-b border-slate-200 dark:border-slate-800/80">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                      Verified Contact Credentials
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Primary channels used for transaction alerts, password confirmations, and two-factor verifications.
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Registered Email */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0A1322] border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-[#126BEB]/10 text-[#126BEB] dark:text-[#38BDF8] flex items-center justify-center mt-0.5">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Registered Email
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" />
                            Verified
                          </span>
                        </div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white mt-1 break-all">
                          {email || 'Loading...'}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Primary email for receiving security confirmation codes.
                        </p>
                      </div>
                    </div>
                    <span title="Protected identity field">
                      <Lock className="w-4 h-4 text-slate-400 shrink-0 mt-1" />
                    </span>
                  </div>

                  {/* Registered Phone */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0A1322] border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center mt-0.5">
                        <Smartphone className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                            Phone Number
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            <CheckCircle2 className="w-3 h-3" />
                            WhatsApp Verified
                          </span>
                        </div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white mt-1">
                          {phoneNumber || 'Loading...'}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-1">
                          Verified via WhatsApp Cloud OTP during registration.
                        </p>
                      </div>
                    </div>
                    <span title="Protected identity field">
                      <Lock className="w-4 h-4 text-slate-400 shrink-0 mt-1" />
                    </span>
                  </div>
                </div>
              </div>

              {/* National Identity & KYC Card */}
              <div className="bg-white dark:bg-[#070D18] rounded-2xl border border-slate-200 dark:border-slate-800/80 p-5 sm:p-6 shadow-sm">
                <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800/80 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#126BEB]/10 text-[#126BEB] dark:text-[#38BDF8] flex items-center justify-center">
                      <Shield className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900 dark:text-white">
                        National Identity & KYC Verification
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Government-issued identity status with the National Identity Management Commission (NIMC).
                      </p>
                    </div>
                  </div>

                  {isVerified ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Tier 1: Identity Verified
                    </span>
                  ) : (
                    <button
                      onClick={() => setIsKycModalOpen(true)}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-amber-500 text-white hover:bg-amber-600 transition-colors flex items-center gap-1.5"
                    >
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Verify Identity Now</span>
                    </button>
                  )}
                </div>

                <div className="mt-5">
                  {isVerified ? (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0A1322] border border-slate-200 dark:border-slate-800">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                          National ID (NIN)
                        </span>
                        <span className="text-sm font-mono font-bold text-slate-900 dark:text-white mt-1 block">
                          {ninMasked || 'Verified in Vault'}
                        </span>
                      </div>

                      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0A1322] border border-slate-200 dark:border-slate-800">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                          Date of Birth
                        </span>
                        <span className="text-sm font-semibold text-slate-900 dark:text-white mt-1 block">
                          {dob ? formatDateTime(dob).split(',')[0] : 'Verified on Record'}
                        </span>
                      </div>

                      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#0A1322] border border-slate-200 dark:border-slate-800">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">
                          Verification Authority
                        </span>
                        <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mt-1 block">
                          NIMC Database Authenticated
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-500/5 border border-amber-200 dark:border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between gap-4 flex-wrap">
                      <div className="space-y-1">
                        <p className="font-bold">Identity Verification Pending</p>
                        <p className="text-amber-700 dark:text-amber-400">
                          To protect against financial fraud and comply with regulations, identity verification is required before initiating wallet funding and top-up settlements.
                        </p>
                      </div>
                      <button
                        onClick={() => setIsKycModalOpen(true)}
                        className="px-4 py-2 rounded-xl text-xs font-bold bg-[#126BEB] text-white hover:bg-[#0F59C7] transition-all shrink-0"
                      >
                        Launch Verification
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SECURITY & PASSWORD */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-[#070D18] rounded-2xl border border-slate-200 dark:border-slate-800/80 p-5 sm:p-6 shadow-sm">
                <div className="flex items-center gap-3 pb-4 border-b border-slate-200 dark:border-slate-800/80">
                  <div className="w-10 h-10 rounded-xl bg-[#126BEB]/10 text-[#126BEB] dark:text-[#38BDF8] flex items-center justify-center">
                    <Key className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                      Change Account Password
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Two-step authorization: Verify your current password and confirm with a 6-digit code sent to your email.
                    </p>
                  </div>
                </div>

                {passSuccessMsg && (
                  <div className="mt-4 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{passSuccessMsg}</span>
                  </div>
                )}

                {passErrorMsg && (
                  <div className="mt-4 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{passErrorMsg}</span>
                  </div>
                )}

                {passwordStep === 'form' ? (
                  /* Step 1: Input Passwords */
                  <form onSubmit={handleRequestPasswordOtp} className="mt-5 space-y-4 max-w-xl">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                        Current Password <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showCurrentPass ? 'text' : 'password'}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          required
                          placeholder="Enter your current password"
                          className="w-full h-10 px-3 pr-10 text-sm rounded-xl bg-slate-50 dark:bg-[#0E1828] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#126BEB] focus:border-[#126BEB] transition-all"
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
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                        New Password <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPass ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          required
                          minLength={8}
                          placeholder="Minimum 8 characters"
                          className="w-full h-10 px-3 pr-10 text-sm rounded-xl bg-slate-50 dark:bg-[#0E1828] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#126BEB] focus:border-[#126BEB] transition-all"
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
                      <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                        Confirm New Password <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPass ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          minLength={8}
                          placeholder="Re-enter your new password"
                          className="w-full h-10 px-3 pr-10 text-sm rounded-xl bg-slate-50 dark:bg-[#0E1828] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#126BEB] focus:border-[#126BEB] transition-all"
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

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={isRequestingOtp}
                        className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#126BEB] text-white hover:bg-[#0F59C7] transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
                      >
                        {isRequestingOtp ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Verifying & Sending Code...</span>
                          </>
                        ) : (
                          <>
                            <Mail className="w-3.5 h-3.5" />
                            <span>Send Email Confirmation Code</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                ) : (
                  /* Step 2: Enter Email Confirmation OTP */
                  <form onSubmit={handleConfirmPasswordChange} className="mt-5 space-y-4 max-w-xl">
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0A1322] border border-slate-200 dark:border-slate-800">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                          Enter 6-Digit Email Code
                        </span>
                        <span className="text-xs font-mono font-bold text-slate-500">
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
                        className="w-full h-12 text-center text-2xl font-mono font-black tracking-[0.5em] rounded-xl bg-white dark:bg-[#0E1828] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#126BEB] transition-all"
                      />
                      <p className="text-[11px] text-slate-400 mt-2">
                        Check your inbox at <strong className="text-slate-600 dark:text-slate-300">{email}</strong> for the confirmation code.
                      </p>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      <button
                        type="submit"
                        disabled={isConfirmingOtp || emailOtp.length !== 6}
                        className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#126BEB] text-white hover:bg-[#0F59C7] transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
                      >
                        {isConfirmingOtp ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Updating Password...</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Confirm & Update Password</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setPasswordStep('form')}
                        className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        Back
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: SESSIONS & ACTIVITY TRAIL */}
          {activeTab === 'sessions' && (
            <div className="space-y-6">
              {/* Active Session & Device Telemetry Card */}
              <div className="bg-white dark:bg-[#070D18] rounded-2xl border border-slate-200 dark:border-slate-800/80 p-5 sm:p-6 shadow-sm">
                <div className="flex items-center gap-3 pb-4 border-b border-slate-200 dark:border-slate-800/80">
                  <div className="w-10 h-10 rounded-xl bg-[#126BEB]/10 text-[#126BEB] dark:text-[#38BDF8] flex items-center justify-center">
                    <Laptop className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                      Current Active Session
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Telemetry for the browser device currently communicating with BAXATO.
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Current Device */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0A1322] border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Device / Client
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Active Now
                      </span>
                    </div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      {parseUserAgent(securityData?.currentSession?.userAgent)}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1 truncate" title={securityData?.currentSession?.userAgent}>
                      {securityData?.currentSession?.userAgent || 'Browser Client'}
                    </p>
                  </div>

                  {/* Client IP Address */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0A1322] border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">
                      Client IP Address
                    </span>
                    <p className="text-sm font-mono font-bold text-slate-900 dark:text-white">
                      {securityData?.currentSession?.ipAddress || '127.0.0.1'}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Direct TCP connection to BAXATO edge gateway.
                    </p>
                  </div>

                  {/* Last Login Date */}
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0A1322] border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">
                      Last Authentication
                    </span>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      {securityData?.lastLoginAt
                        ? formatDateTime(securityData.lastLoginAt)
                        : 'Current Active Session'}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Time of most recent credentials verification.
                    </p>
                  </div>
                </div>
              </div>

              {/* Security Audit Trail Table */}
              <div className="bg-white dark:bg-[#070D18] rounded-2xl border border-slate-200 dark:border-slate-800/80 p-5 sm:p-6 shadow-sm">
                <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800/80">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 flex items-center justify-center">
                      <History className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-slate-900 dark:text-white">
                        Security Audit Trail
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Immutable record of account actions, logins, and identity modifications.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={loadSecurityData}
                    disabled={isLoadingSecurity}
                    className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    title="Refresh Audit Trail"
                  >
                    <RefreshCw className={`w-4 h-4 ${isLoadingSecurity ? 'animate-spin text-[#126BEB]' : ''}`} />
                  </button>
                </div>

                <div className="mt-5 overflow-x-auto">
                  {securityData?.auditLogs && securityData.auditLogs.length > 0 ? (
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800/80 text-slate-400 uppercase tracking-wider text-[10px]">
                          <th className="py-2.5 px-3">Event Action</th>
                          <th className="py-2.5 px-3">Device / Client</th>
                          <th className="py-2.5 px-3">IP Address</th>
                          <th className="py-2.5 px-3 text-right">Timestamp</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                        {securityData.auditLogs.map((log) => {
                          const action = log.action || 'UNKNOWN';
                          let badgeClass = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';

                          if (action.includes('LOGIN')) {
                            badgeClass = 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20';
                          } else if (action.includes('PASSWORD')) {
                            badgeClass = 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20';
                          } else if (action.includes('REGISTER')) {
                            badgeClass = 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20';
                          } else if (action.includes('PROFILE')) {
                            badgeClass = 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20';
                          }

                          return (
                            <tr key={log.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                              <td className="py-3 px-3">
                                <span className={`inline-block px-2.5 py-1 rounded-lg text-[10px] font-bold ${badgeClass}`}>
                                  {action.replace(/_/g, ' ')}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-slate-600 dark:text-slate-300 font-mono text-[11px]">
                                {parseUserAgent(log.userAgent)}
                              </td>
                              <td className="py-3 px-3 text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                                {log.ipAddress || '—'}
                              </td>
                              <td className="py-3 px-3 text-right text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                                {formatDateTime(log.createdAt)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  ) : (
                    <div className="py-12 text-center text-slate-400">
                      <Shield className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                      <p className="text-xs font-semibold">No recent security events logged yet.</p>
                    </div>
                  )}
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
