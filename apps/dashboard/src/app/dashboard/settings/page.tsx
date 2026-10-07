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
  QrCode,
  ShieldAlert,
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

interface LoginSessionItem {
  id: string;
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
  activeSessions?: LoginSessionItem[];
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

  // 2FA Interactive Setup State (Live Real-Time Integration)
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [active2FAMethod, setActive2FAMethod] = useState<'EMAIL' | 'TOTP' | null>(null);
  const [isConfiguring2FA, setIsConfiguring2FA] = useState(false);
  const [selected2FAMethod, setSelected2FAMethod] = useState<'EMAIL' | 'TOTP'>('TOTP');
  const [totpSecret, setTotpSecret] = useState('');
  const [totpQrCodeUrl, setTotpQrCodeUrl] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [emailOtpCode, setEmailOtpCode] = useState('');
  const [isRequestingEmailOtp, setIsRequestingEmailOtp] = useState(false);
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [copiedTotpSecret, setCopiedTotpSecret] = useState(false);
  const [copiedBackupCodes, setCopiedBackupCodes] = useState(false);
  const [twoFactorNotice, setTwoFactorNotice] = useState('');
  const [twoFactorError, setTwoFactorError] = useState('');
  const [isLoading2FASetup, setIsLoading2FASetup] = useState(false);
  const [isSubmitting2FA, setIsSubmitting2FA] = useState(false);

  // Disable 2FA State (Requires Password Confirmation)
  const [isDisabling2FA, setIsDisabling2FA] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [showDisablePassword, setShowDisablePassword] = useState(false);
  const [isSubmittingDisable2FA, setIsSubmittingDisable2FA] = useState(false);

  // Security & Sessions State
  const [securityData, setSecurityData] = useState<SecurityData | null>(null);
  const [isLoadingSecurity, setIsLoadingSecurity] = useState(false);
  const [clientDeviceName, setClientDeviceName] = useState('Web Browser');
  const [clientPublicIp, setClientPublicIp] = useState('');

  // Client-Side Browser / Device Detection (for current browser session only)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const ua = navigator.userAgent;
    let device = 'Web Browser';

    if (/iPhone/i.test(ua)) {
      device = 'Safari on iPhone';
    } else if (/iPad/i.test(ua)) {
      device = 'Safari on iPad';
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
      // Graceful fallback
    }
  };

  // Load Security & Session Data
  const loadSecurityData = async () => {
    try {
      setIsLoadingSecurity(true);
      const token = getStoredAuthToken();
      if (!token) return;

      const [res, twoFaRes] = await Promise.all([
        fetch('/api/users/me/security', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/auth/2fa/status', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const data = await res.json().catch(() => null);
      const twoFaData = await twoFaRes.json().catch(() => null);

      if (handleAuthResponse(res, data)) return;

      if (res.ok && data?.success && data?.data) {
        setSecurityData(data.data);
      }

      if (twoFaRes.ok && twoFaData?.success && twoFaData?.data) {
        setIs2FAEnabled(Boolean(twoFaData.data.enabled));
        setActive2FAMethod(twoFaData.data.method || null);
      }
    } catch {
      // Quiet fail
    } finally {
      setIsLoadingSecurity(false);
    }
  };

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
      setPassErrorMsg('New password must be at least 8 characters.');
      return;
    }
    if (newPassword === currentPassword) {
      setPassErrorMsg('New password must be different from current password.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPassErrorMsg('New passwords do not match.');
      return;
    }

    try {
      setIsSubmittingPassword(true);

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
      setPassErrorMsg(err?.message || 'Could not update password.');
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  // Fetch real TOTP secret & QR code data URL from backend
  const fetchTotpSetup = async () => {
    try {
      setIsLoading2FASetup(true);
      setTwoFactorError('');
      const token = getStoredAuthToken();
      if (!token) return;

      const res = await fetch('/api/auth/2fa/totp/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json().catch(() => null);
      if (res.ok && data?.success && data?.data) {
        setTotpSecret(data.data.secret || '');
        setTotpQrCodeUrl(data.data.qrCodeDataUrl || '');
        if (Array.isArray(data.data.backupCodes)) {
          setBackupCodes(data.data.backupCodes);
        }
      } else {
        setTwoFactorError(data?.error?.message || 'Failed to initialize authenticator setup.');
      }
    } catch {
      setTwoFactorError('Network error initializing authenticator setup.');
    } finally {
      setIsLoading2FASetup(false);
    }
  };

  const handleStart2FASetup = async () => {
    setIsConfiguring2FA(true);
    setIsDisabling2FA(false);
    setTwoFactorError('');
    setTwoFactorNotice('');
    setTotpCode('');
    setEmailOtpCode('');
    setEmailOtpSent(false);

    if (selected2FAMethod === 'TOTP') {
      await fetchTotpSetup();
    }
  };

  const handleSelect2FAMethod = (method: 'EMAIL' | 'TOTP') => {
    setSelected2FAMethod(method);
    setTwoFactorError('');
    if (method === 'TOTP' && !totpSecret) {
      fetchTotpSetup();
    }
  };

  const handleRequestEmailOtp = async () => {
    try {
      setIsRequestingEmailOtp(true);
      setTwoFactorError('');
      const token = getStoredAuthToken();
      if (!token) return;

      const res = await fetch('/api/auth/2fa/email/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        setEmailOtpSent(true);
        setTwoFactorNotice(`A 6-digit verification code has been dispatched to ${email || 'your email'}.`);
        setTimeout(() => setTwoFactorNotice(''), 6000);
      } else {
        setTwoFactorError(data?.error?.message || 'Failed to dispatch verification email.');
      }
    } catch {
      setTwoFactorError('Network error requesting verification code.');
    } finally {
      setIsRequestingEmailOtp(false);
    }
  };

  const handleActivate2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setTwoFactorError('');
    const token = getStoredAuthToken();
    if (!token) return;

    if (selected2FAMethod === 'TOTP') {
      if (totpCode.trim().length !== 6) {
        setTwoFactorError('Please enter the 6-digit code shown in your authenticator app.');
        return;
      }

      try {
        setIsSubmitting2FA(true);
        const res = await fetch('/api/auth/2fa/totp/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            secret: totpSecret,
            token: totpCode.trim(),
            backupCodes,
          }),
        });

        const data = await res.json().catch(() => null);
        if (res.ok && data?.success) {
          setIs2FAEnabled(true);
          setActive2FAMethod('TOTP');
          setIsConfiguring2FA(false);
          setTotpCode('');
          setTwoFactorNotice('Two-Factor Authentication via Authenticator App is now active.');
          loadSecurityData();
          setTimeout(() => setTwoFactorNotice(''), 6000);
        } else {
          setTwoFactorError(data?.error?.message || 'Invalid authenticator code. Please try again.');
        }
      } catch {
        setTwoFactorError('Network error verifying authenticator code.');
      } finally {
        setIsSubmitting2FA(false);
      }
    } else {
      if (emailOtpCode.trim().length !== 6) {
        setTwoFactorError('Please enter the 6-digit verification code sent to your email.');
        return;
      }

      try {
        setIsSubmitting2FA(true);
        const res = await fetch('/api/auth/2fa/email/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            otp: emailOtpCode.trim(),
          }),
        });

        const data = await res.json().catch(() => null);
        if (res.ok && data?.success) {
          setIs2FAEnabled(true);
          setActive2FAMethod('EMAIL');
          setIsConfiguring2FA(false);
          setEmailOtpCode('');
          setEmailOtpSent(false);
          setTwoFactorNotice('Two-Factor Authentication via Email is now active.');
          loadSecurityData();
          setTimeout(() => setTwoFactorNotice(''), 6000);
        } else {
          setTwoFactorError(data?.error?.message || 'Invalid or expired verification code.');
        }
      } catch {
        setTwoFactorError('Network error verifying email code.');
      } finally {
        setIsSubmitting2FA(false);
      }
    }
  };

  const handleConfirmDisable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setTwoFactorError('');
    if (!disablePassword) {
      setTwoFactorError('Please enter your account password to confirm.');
      return;
    }

    try {
      setIsSubmittingDisable2FA(true);
      const token = getStoredAuthToken();
      if (!token) return;

      const res = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          password: disablePassword,
        }),
      });

      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        setIs2FAEnabled(false);
        setActive2FAMethod(null);
        setIsDisabling2FA(false);
        setDisablePassword('');
        setTwoFactorNotice('Two-Factor Authentication has been safely disabled.');
        loadSecurityData();
        setTimeout(() => setTwoFactorNotice(''), 6000);
      } else {
        setTwoFactorError(data?.error?.message || 'Incorrect password.');
      }
    } catch {
      setTwoFactorError('Network error while disabling Two-Factor Authentication.');
    } finally {
      setIsSubmittingDisable2FA(false);
    }
  };

  const copyTotpKey = () => {
    navigator.clipboard.writeText(totpSecret);
    setCopiedTotpSecret(true);
    setTimeout(() => setCopiedTotpSecret(false), 2000);
  };

  const copyRecoveryCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'));
    setCopiedBackupCodes(true);
    setTimeout(() => setCopiedBackupCodes(false), 2000);
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

  // Parse User Agent strictly for each historical log entry (no current device fallback)
  const parseLogUserAgent = (ua?: string | null) => {
    if (!ua) return 'Web Browser';
    if (ua.includes('iPhone')) return 'Safari on iPhone';
    if (ua.includes('iPad')) return 'Safari on iPad';
    if (ua.includes('Macintosh') || ua.includes('Mac OS')) {
      if (ua.includes('Chrome')) return 'Chrome on macOS';
      if (ua.includes('Safari')) return 'Safari on macOS';
      if (ua.includes('Firefox')) return 'Firefox on macOS';
      return 'macOS Device';
    }
    if (ua.includes('Windows')) {
      if (ua.includes('Edg')) return 'Edge on Windows';
      if (ua.includes('Chrome')) return 'Chrome on Windows';
      if (ua.includes('Firefox')) return 'Firefox on Windows';
      return 'Windows PC';
    }
    if (ua.includes('Android')) return 'Chrome on Android';
    if (ua.includes('Linux')) return 'Chrome on Linux';
    if (ua.toLowerCase().includes('node') || ua.includes('undici') || ua === 'lightMyRequest') {
      return 'Web Dashboard Session';
    }
    return ua.length > 24 ? ua.slice(0, 24) + '...' : ua;
  };

  const tabs = [
    { id: 'profile' as const, label: 'Profile & Identity' },
    { id: 'security' as const, label: 'Security & Password' },
    { id: 'sessions' as const, label: 'Active Sessions' },
    { id: 'audit' as const, label: 'Audit Trail' },
  ];

  const resolvedCurrentIp =
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
      <div className="lg:pl-72 flex flex-col min-h-screen min-w-0">
        {/* Top Header */}
        <Header
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          onOpenKycModal={() => setIsKycModalOpen(true)}
          merchantName={merchantName}
          kycStatus={kycStatus}
          isRefreshing={isRefreshing}
          onRefresh={refreshAll}
        />

        {/* Page Body - Constrained max width & min-w-0 to prevent Safari horizontal pinch */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-4xl w-full mx-auto space-y-6 min-w-0">
          {/* KYC Alert Banner (if unverified) */}
          {!isVerified && (
            <KycBanner kycStatus={kycStatus} onOpenKycModal={() => setIsKycModalOpen(true)} />
          )}

          {/* Back Button & Page Title */}
          <div className="space-y-3">
            <div>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back</span>
              </Link>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
                  Settings
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Manage your account identity, credentials, sessions, and security trail.
                </p>
              </div>

              {/* Clean KYC Status Badge (No AI Styling) */}
              <div className="self-start sm:self-auto shrink-0">
                {isVerified ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
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

          {/* Horizontal Tabs - Smooth scrolling, no page clipping */}
          <div className="border-b border-slate-200 dark:border-slate-800 w-full overflow-hidden">
            <nav className="flex space-x-6 sm:space-x-8 overflow-x-auto scrollbar-none pb-px" aria-label="Tabs">
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
            <div className="space-y-8 pt-2 pb-12 w-full min-w-0">
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
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6 pt-2 w-full min-w-0">
                <div className="md:col-span-4 space-y-1">
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Personal Information
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Your name as registered on official records.
                  </p>
                </div>

                <div className="md:col-span-8 w-full min-w-0">
                  <div className="w-full bg-white dark:bg-[#0c1424] rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
                    {!isEditingProfile ? (
                      <div>
                        <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                          <div className="flex items-center gap-3.5 min-w-0">
                            <div className="w-11 h-11 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 font-semibold text-sm shrink-0">
                              {firstName ? firstName.charAt(0).toUpperCase() : 'M'}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                                {firstName} {lastName} {middleName ? `(${middleName})` : ''}
                              </p>
                              <p className="text-xs text-slate-500 font-mono mt-0.5 truncate">
                                {email || 'merchant@baxato.ng'}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {userId && (
                              <button
                                type="button"
                                onClick={copyUserId}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors shrink-0"
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

              {/* 2. Contact Channels (Clean Key-Value Rows, No Redundant Badges) */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6 pt-6 border-t border-slate-200/80 dark:border-slate-800/80 w-full min-w-0">
                <div className="md:col-span-4 space-y-1">
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Contact Channels
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Primary channels for communication and access.
                  </p>
                </div>

                <div className="md:col-span-8 w-full min-w-0">
                  <div className="w-full bg-white dark:bg-[#0c1424] rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] divide-y divide-slate-100 dark:divide-slate-800/80">
                    <div className="p-4 sm:p-5">
                      <span className="text-xs text-slate-500 block mb-1">Email address</span>
                      <p className="text-sm font-mono text-slate-900 dark:text-white font-medium break-all">
                        {email || '—'}
                      </p>
                    </div>

                    <div className="p-4 sm:p-5">
                      <span className="text-xs text-slate-500 block mb-1">Phone number</span>
                      <p className="text-sm font-mono text-slate-900 dark:text-white font-medium">
                        {phoneNumber || '—'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 3. KYC Status (Clean, Direct, Stretches Full Width) */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6 pt-6 border-t border-slate-200/80 dark:border-slate-800/80 w-full min-w-0">
                <div className="md:col-span-4 space-y-1">
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                    KYC Verification
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Identity compliance verification status.
                  </p>
                </div>

                <div className="md:col-span-8 w-full min-w-0">
                  <div className="w-full bg-white dark:bg-[#0c1424] rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] p-4 sm:p-5 flex items-center justify-between gap-4">
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
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shrink-0">
                        <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
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
            <div className="space-y-8 pt-2 pb-12 w-full min-w-0">
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
              {twoFactorNotice && (
                <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-400 text-xs font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{twoFactorNotice}</span>
                </div>
              )}

              {/* 1. Account Password (Sealed with Change Password Toggle) */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6 pt-2 w-full min-w-0">
                <div className="md:col-span-4 space-y-1">
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Password
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Set a secure password to protect your account.
                  </p>
                </div>

                <div className="md:col-span-8 w-full min-w-0">
                  <div className="w-full bg-white dark:bg-[#0c1424] rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
                    {!isChangingPassword ? (
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

              {/* 2. Two-Factor Authentication (Complete Setup Flow: Key, QR & Backup Codes Right There) */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6 pt-6 border-t border-slate-200/80 dark:border-slate-800/80 w-full min-w-0">
                <div className="md:col-span-4 space-y-1">
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Two-Factor Authentication
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Extra layer of protection required during account sign-in.
                  </p>
                </div>

                <div className="md:col-span-8 w-full min-w-0">
                  <div className="w-full bg-white dark:bg-[#0c1424] rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
                    {/* Status Row */}
                    <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500">Status:</span>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                            is2FAEnabled
                              ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                          }`}>
                            {is2FAEnabled ? `Active (${active2FAMethod === 'TOTP' ? 'Authenticator App' : 'Email'})` : 'Off'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          {is2FAEnabled
                            ? 'Verification code required during sign-in.'
                            : 'Two-factor protection is currently deactivated.'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {is2FAEnabled ? (
                          <button
                            type="button"
                            onClick={() => {
                              setIsDisabling2FA(true);
                              setIsConfiguring2FA(false);
                              setTwoFactorError('');
                            }}
                            className="h-8 px-3.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                          >
                            Turn off
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={handleStart2FASetup}
                            className="h-8 px-4 rounded-lg text-xs font-medium bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90 transition-opacity"
                          >
                            Set up 2FA
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Disable Confirmation Box (Requires Account Password) */}
                    {isDisabling2FA && is2FAEnabled && (
                      <form onSubmit={handleConfirmDisable2FA} className="border-t border-slate-100 dark:border-slate-800/80 p-5 sm:p-6 space-y-4 bg-slate-50/40 dark:bg-slate-900/20">
                        <div className="space-y-1">
                          <h3 className="text-xs font-semibold text-slate-900 dark:text-white">
                            Confirm Password to Turn Off 2FA
                          </h3>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            To protect your account from unauthorized changes, enter your password to deactivate Two-Factor Authentication.
                          </p>
                        </div>

                        {twoFactorError && (
                          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200/60 dark:border-red-800/40 text-red-700 dark:text-red-400 text-xs font-medium flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{twoFactorError}</span>
                          </div>
                        )}

                        <div className="relative max-w-sm">
                          <input
                            type={showDisablePassword ? 'text' : 'password'}
                            value={disablePassword}
                            onChange={(e) => setDisablePassword(e.target.value)}
                            required
                            placeholder="Enter your account password"
                            className="w-full h-9 px-3 pr-10 text-base sm:text-sm rounded-lg bg-white dark:bg-[#070D18] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-slate-400 font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => setShowDisablePassword(!showDisablePassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                          >
                            {showDisablePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>

                        <div className="pt-2 flex items-center justify-end gap-2.5">
                          <button
                            type="button"
                            onClick={() => {
                              setIsDisabling2FA(false);
                              setDisablePassword('');
                              setTwoFactorError('');
                            }}
                            className="h-8 px-3.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                          >
                            Cancel
                          </button>

                          <button
                            type="submit"
                            disabled={isSubmittingDisable2FA}
                            className="h-8 px-4 rounded-lg text-xs font-medium bg-red-600 hover:bg-red-700 text-white transition-colors flex items-center gap-1.5 disabled:opacity-50"
                          >
                            {isSubmittingDisable2FA ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Deactivating...</span>
                              </>
                            ) : (
                              <span>Confirm & Turn Off</span>
                            )}
                          </button>
                        </div>
                      </form>
                    )}

                    {/* Interactive Setup Box (Real TOTP QR Code, Real Email Code Dispatch) */}
                    {isConfiguring2FA && !is2FAEnabled && (
                      <form onSubmit={handleActivate2FA} className="border-t border-slate-100 dark:border-slate-800/80 p-5 sm:p-6 space-y-5 bg-slate-50/40 dark:bg-slate-900/20">
                        {twoFactorError && (
                          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200/60 dark:border-red-800/40 text-red-700 dark:text-red-400 text-xs font-medium flex items-center gap-2">
                            <AlertCircle className="w-4 h-4 shrink-0" />
                            <span>{twoFactorError}</span>
                          </div>
                        )}

                        <div className="space-y-3">
                          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                            Choose 2FA Method:
                          </label>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <label className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                              selected2FAMethod === 'TOTP'
                                ? 'border-slate-900 dark:border-white bg-white dark:bg-[#070D18]'
                                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                            }`}>
                              <div className="flex items-center gap-2">
                                <input
                                  type="radio"
                                  name="setup-2fa-method"
                                  checked={selected2FAMethod === 'TOTP'}
                                  onChange={() => handleSelect2FAMethod('TOTP')}
                                />
                                <span className="text-xs font-medium text-slate-900 dark:text-white">
                                  Authenticator App
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-1 pl-5">
                                Google Authenticator, 1Password, or Authy.
                              </p>
                            </label>

                            <label className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                              selected2FAMethod === 'EMAIL'
                                ? 'border-slate-900 dark:border-white bg-white dark:bg-[#070D18]'
                                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                            }`}>
                              <div className="flex items-center gap-2">
                                <input
                                  type="radio"
                                  name="setup-2fa-method"
                                  checked={selected2FAMethod === 'EMAIL'}
                                  onChange={() => handleSelect2FAMethod('EMAIL')}
                                />
                                <span className="text-xs font-medium text-slate-900 dark:text-white">
                                  Email Code
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-1 pl-5">
                                Sent to {email || 'registered email'}.
                              </p>
                            </label>
                          </div>
                        </div>

                        {selected2FAMethod === 'TOTP' ? (
                          <div className="space-y-4 pt-1">
                            {/* Real QR & Secret Key Box */}
                            <div className="p-4 rounded-lg bg-white dark:bg-[#070D18] border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center gap-5">
                              {/* Real Base64 PNG QR Code from RFC 6238 Generator */}
                              <div className="w-28 h-28 bg-white p-1 rounded-lg border border-slate-200 flex flex-col items-center justify-center shrink-0 shadow-xs">
                                {isLoading2FASetup ? (
                                  <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                                ) : totpQrCodeUrl ? (
                                  <img
                                    src={totpQrCodeUrl}
                                    alt="Authenticator QR Code"
                                    className="w-full h-full object-contain"
                                  />
                                ) : (
                                  <QrCode className="w-16 h-16 text-slate-400" />
                                )}
                              </div>

                              <div className="space-y-2 flex-1 min-w-0 text-center sm:text-left">
                                <span className="text-xs text-slate-500 block">
                                  Scan QR code in Google Authenticator or enter manual secret key:
                                </span>
                                <div className="flex items-center justify-center sm:justify-start gap-2">
                                  <code className="text-xs font-mono font-semibold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 select-all">
                                    {totpSecret || 'Loading secret...'}
                                  </code>
                                  {totpSecret && (
                                    <button
                                      type="button"
                                      onClick={copyTotpKey}
                                      className="p-1 rounded text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
                                      title="Copy Secret Key"
                                    >
                                      {copiedTotpSecret ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Verification Input */}
                            <div>
                              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                                Enter 6-digit verification code from your authenticator app:
                              </label>
                              <input
                                type="text"
                                maxLength={6}
                                value={totpCode}
                                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                                placeholder="123456"
                                className="w-48 h-9 px-3 text-center text-base sm:text-sm font-mono font-bold tracking-widest rounded-lg bg-white dark:bg-[#070D18] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-slate-400"
                              />
                            </div>

                            {/* Emergency Backup Recovery Codes */}
                            {backupCodes.length > 0 && (
                              <div className="p-3.5 rounded-lg bg-slate-100/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                    Emergency Backup Recovery Codes:
                                  </span>
                                  <button
                                    type="button"
                                    onClick={copyRecoveryCodes}
                                    className="text-[11px] font-medium text-slate-600 dark:text-slate-300 hover:underline flex items-center gap-1"
                                  >
                                    {copiedBackupCodes ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                                    <span>{copiedBackupCodes ? 'Copied' : 'Copy codes'}</span>
                                  </button>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-center">
                                  {backupCodes.map((code, i) => (
                                    <span key={i} className="text-xs font-mono font-medium text-slate-800 dark:text-slate-200 bg-white dark:bg-[#0c1424] py-1 rounded border border-slate-200/70 dark:border-slate-700/60 select-all">
                                      {code}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-4 pt-1">
                            <div className="p-4 rounded-lg bg-white dark:bg-[#070D18] border border-slate-200 dark:border-slate-800 space-y-3">
                              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                                A 6-digit verification code will be sent to <strong className="text-slate-900 dark:text-white">{email}</strong> via ZeptoMail to verify and activate Two-Factor Authentication.
                              </p>
                              {!emailOtpSent ? (
                                <button
                                  type="button"
                                  onClick={handleRequestEmailOtp}
                                  disabled={isRequestingEmailOtp}
                                  className="h-8 px-4 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                                >
                                  {isRequestingEmailOtp ? (
                                    <>
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                      <span>Dispatching email...</span>
                                    </>
                                  ) : (
                                    <span>Send verification code to {email || 'email'}</span>
                                  )}
                                </button>
                              ) : (
                                <div className="space-y-2 pt-1">
                                  <div className="flex items-center justify-between">
                                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                                      Enter 6-digit verification code from your email:
                                    </label>
                                    <button
                                      type="button"
                                      onClick={handleRequestEmailOtp}
                                      disabled={isRequestingEmailOtp}
                                      className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline disabled:opacity-50"
                                    >
                                      Resend code
                                    </button>
                                  </div>
                                  <input
                                    type="text"
                                    maxLength={6}
                                    value={emailOtpCode}
                                    onChange={(e) => setEmailOtpCode(e.target.value.replace(/\D/g, ''))}
                                    placeholder="123456"
                                    className="w-48 h-9 px-3 text-center text-base sm:text-sm font-mono font-bold tracking-widest rounded-lg bg-white dark:bg-[#070D18] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-slate-400"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        <div className="pt-2 flex items-center justify-end gap-2.5">
                          <button
                            type="button"
                            onClick={() => {
                              setIsConfiguring2FA(false);
                              setTwoFactorError('');
                            }}
                            className="h-8 px-3.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                          >
                            Cancel
                          </button>

                          <button
                            type="submit"
                            disabled={isSubmitting2FA || (selected2FAMethod === 'EMAIL' && !emailOtpSent)}
                            className="h-8 px-4 rounded-lg text-xs font-medium bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:opacity-90 transition-opacity flex items-center gap-1.5 disabled:opacity-50"
                          >
                            {isSubmitting2FA ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Verifying...</span>
                              </>
                            ) : (
                              <span>Verify & Activate 2FA</span>
                            )}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: ACTIVE SESSIONS (Shows all logged in devices cleanly)                */}
          {/* ========================================================================= */}
          {activeTab === 'sessions' && (
            <div className="space-y-8 pt-2 pb-12 w-full min-w-0">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6 pt-2 w-full min-w-0">
                <div className="md:col-span-4 space-y-1">
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Logged-in Devices
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Active client devices authenticated on your account.
                  </p>
                </div>

                <div className="md:col-span-8 w-full min-w-0">
                  <div className="w-full bg-white dark:bg-[#0c1424] rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] divide-y divide-slate-100 dark:divide-slate-800/80 overflow-hidden">
                    {/* Current Viewing Device */}
                    <div className="p-5 sm:p-6 flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3.5 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 shrink-0 mt-0.5">
                          {clientDeviceName.includes('iPhone') || clientDeviceName.includes('Android') ? (
                            <Smartphone className="w-4 h-4" />
                          ) : (
                            <Laptop className="w-4 h-4" />
                          )}
                        </div>
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                              {clientDeviceName}
                            </p>
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shrink-0">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                              This device
                            </span>
                          </div>
                          <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                            IP: {resolvedCurrentIp}
                          </p>
                          <p className="text-xs text-slate-400">
                            Last authentication: {formatDateTime(securityData?.lastLoginAt)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Other Logged-in Devices (from activeSessions) */}
                    {securityData?.activeSessions && securityData.activeSessions.length > 1 && (
                      securityData.activeSessions.slice(1).map((s) => (
                        <div key={s.id} className="p-5 sm:p-6 flex items-start justify-between gap-4 bg-slate-50/30 dark:bg-slate-900/10">
                          <div className="flex items-start gap-3.5 min-w-0">
                            <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 shrink-0 mt-0.5">
                              {s.userAgent?.includes('iPhone') || s.userAgent?.includes('Android') ? (
                                <Smartphone className="w-4 h-4" />
                              ) : (
                                <Laptop className="w-4 h-4" />
                              )}
                            </div>
                            <div className="space-y-1 min-w-0">
                              <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                                {parseLogUserAgent(s.userAgent)}
                              </p>
                              <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                                IP: {s.ipAddress && !s.ipAddress.startsWith('10.') ? s.ipAddress : resolvedCurrentIp}
                              </p>
                              <p className="text-xs text-slate-400">
                                Session logged: {formatDateTime(s.createdAt)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: AUDIT TRAIL (Proper scrolling, independent user agents)           */}
          {/* ========================================================================= */}
          {activeTab === 'audit' && (
            <div className="space-y-8 pt-2 pb-12 w-full min-w-0">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6 pt-2 w-full min-w-0">
                <div className="md:col-span-4 space-y-1">
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Audit Trail
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Chronological record of account events.
                  </p>
                </div>

                <div className="md:col-span-8 w-full min-w-0">
                  <div className="w-full bg-white dark:bg-[#0c1424] rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-[0_1px_3px_rgba(0,0,0,0.04)] overflow-hidden">
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
                      <div className="w-full overflow-x-auto scrollbar-none">
                        <table className="w-full text-left border-collapse text-xs min-w-[460px]">
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
                                  : resolvedCurrentIp;

                              return (
                                <tr key={log.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/20 transition-colors">
                                  <td className="py-3 px-4 whitespace-nowrap">
                                    <span className="font-mono text-[11px] font-medium text-slate-800 dark:text-slate-200">
                                      {action}
                                    </span>
                                  </td>
                                  <td className="py-3 px-4 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                                    {parseLogUserAgent(log.userAgent)}
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
