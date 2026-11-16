'use client';

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useClerk } from '@clerk/nextjs';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  ChevronDown,
  Copy,
  Eye,
  EyeOff,
  Key,
  Laptop,
  Loader2,
  QrCode,
  RefreshCw,
  Search,
  Shield,
  Smartphone,
  X,
} from 'lucide-react';
import Sidebar from '@/components/dashboard/Sidebar';
import Header from '@/components/dashboard/Header';
import KycBanner from '@/components/dashboard/KycBanner';
import KycModal from '@/components/dashboard/KycModal';
import ModalDialog from '@/components/ModalDialog';
import BaxatoLoader from '@/components/BaxatoLoader';
import {
  clearSessionAndRedirect,
  getStoredAuthToken,
  getStoredBusiness,
  getStoredUser,
  handleAuthResponse,
} from '@/lib/auth-session';
import { parseDeviceSession } from '@/lib/device-parser';
import { showToast } from '@/lib/toast';

type AuditCategory =
  | 'auth'
  | 'security'
  | 'profile'
  | 'team'
  | 'developer'
  | 'business'
  | 'transaction'
  | 'system';

interface AuditLogItem {
  id: string;
  action: string;
  resourceType?: string;
  resourceId?: string;
  title?: string;
  description?: string;
  category?: AuditCategory;
  deviceName?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  changes?: Record<string, unknown>;
  createdAt: string;
}

interface LoginSessionItem {
  id: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  deviceName?: string;
  os?: string;
  browser?: string;
  category?: string;
  createdAt: string;
}

interface SecurityData {
  lastLoginAt?: string | null;
  currentSession: {
    ipAddress: string;
    userAgent: string;
    deviceName?: string;
    os?: string;
    browser?: string;
    category?: string;
    lastActiveAt?: string;
  };
  activeSessions?: LoginSessionItem[];
  auditLogs: AuditLogItem[];
}

type SettingsTab = 'profile' | 'security' | 'sessions' | 'audit';

interface PasswordHealth {
  score: number;
  hasMinLength: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
  isValid: boolean;
  label: string;
  color: string;
}

const PASSWORD_PATTERN = /(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[\W_]).{8,}/;

function evaluatePasswordHealth(password: string): PasswordHealth {
  const hasMinLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  let score = 0;
  if (hasMinLength) score++;
  if (hasUpper) score++;
  if (hasLower) score++;
  if (hasNumber) score++;
  if (hasSpecial) score++;

  let label = 'Too weak';
  let color = 'bg-slate-300 dark:bg-slate-700';

  if (score === 1 || score === 2) {
    label = 'Weak';
    color = 'bg-red-500';
  } else if (score === 3) {
    label = 'Fair';
    color = 'bg-amber-500';
  } else if (score === 4) {
    label = 'Good';
    color = 'bg-blue-500';
  } else if (score === 5) {
    label = 'Strong';
    color = 'bg-emerald-500';
  }

  return {
    score,
    hasMinLength,
    hasUpper,
    hasLower,
    hasNumber,
    hasSpecial,
    isValid: score === 5 && PASSWORD_PATTERN.test(password),
    label,
    color,
  };
}

function formatDisplayIp(raw?: string | null): string {
  if (!raw || !raw.trim()) return '—';
  const clean = raw.trim();
  if (clean === '127.0.0.1' || clean === '::1') {
    return '127.0.0.1 (Local)';
  }
  return clean;
}

function formatFallbackAuditTitle(action?: string): string {
  if (!action) return 'Account event';
  return action
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((w, idx) => (idx === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ');
}

const AUDIT_CATEGORY_LABELS: Record<AuditCategory, string> = {
  auth: 'Sign-in',
  security: 'Security',
  profile: 'Profile',
  team: 'Team',
  developer: 'Developer',
  business: 'Workspace',
  transaction: 'Transaction',
  system: 'System',
};

export default function SettingsPage() {
  const clerk = useClerk();

  const profileTabId = useId();
  const securityTabId = useId();
  const sessionsTabId = useId();
  const auditTabId = useId();
  const auditTableTitleId = useId();
  const auditSearchId = useId();
  const auditCategoryId = useId();
  const passModalTitleId = useId();
  const currentPassId = useId();
  const currentPassErrId = useId();
  const newPassId = useId();
  const newPassRulesId = useId();
  const newPassErrId = useId();
  const confirmPassId = useId();
  const confirmPassErrId = useId();
  const passOtpId = useId();
  const passOtpErrId = useId();
  const disable2faTitleId = useId();
  const disable2faPassId = useId();
  const disable2faErrId = useId();
  const totpInputId = useId();
  const emailOtpInputId = useId();

  const tabRefs = useRef<Record<SettingsTab, HTMLButtonElement | null>>({
    profile: null,
    security: null,
    sessions: null,
    audit: null,
  });
  const currentPassRef = useRef<HTMLInputElement>(null);
  const newPassRef = useRef<HTMLInputElement>(null);
  const confirmPassRef = useRef<HTMLInputElement>(null);
  const passOtpRef = useRef<HTMLInputElement>(null);
  const disablePassRef = useRef<HTMLInputElement>(null);

  const [merchantName, setMerchantName] = useState<string>('');
  const [businessName, setBusinessName] = useState<string>('');
  const [kycStatus, setKycStatus] = useState<string>('INITIALIZING');
  const [userRole, setUserRole] = useState<string>('BUSINESS_OWNER');

  const [isKycModalOpen, setIsKycModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [activeTab, setActiveTab] = useState<SettingsTab>('profile');

  // Profile fields
  const [userId, setUserId] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [ninMasked, setNinMasked] = useState<string | null>(null);
  const [copiedUserId, setCopiedUserId] = useState(false);

  // Two-step Password Change Dialog state
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordStep, setPasswordStep] = useState<'credentials' | 'otp'>('credentials');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordOtp, setPasswordOtp] = useState('');
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [touchedPassFields, setTouchedPassFields] = useState({
    current: false,
    next: false,
    confirm: false,
    otp: false,
  });
  const [passwordSubmitError, setPasswordSubmitError] = useState('');
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);

  // 2FA Setup & Disable state
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
  const [twoFactorError, setTwoFactorError] = useState('');
  const [isLoading2FASetup, setIsLoading2FASetup] = useState(false);
  const [isSubmitting2FA, setIsSubmitting2FA] = useState(false);

  const [isDisable2FAModalOpen, setIsDisable2FAModalOpen] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [showDisablePassword, setShowDisablePassword] = useState(false);
  const [disable2FAError, setDisable2FAError] = useState('');
  const [isSubmittingDisable2FA, setIsSubmittingDisable2FA] = useState(false);

  // Sessions & Audit Log state
  const [securityData, setSecurityData] = useState<SecurityData | null>(null);
  const [isLoadingSecurity, setIsLoadingSecurity] = useState(false);
  const [browserUserAgent, setBrowserUserAgent] = useState<string | null>(null);
  const [isTouchMacIpad, setIsTouchMacIpad] = useState(false);

  const [auditSearch, setAuditSearch] = useState('');
  const [auditCategoryFilter, setAuditCategoryFilter] = useState<string>('ALL');

  const newPasswordHealth = useMemo(
    () => evaluatePasswordHealth(newPassword),
    [newPassword],
  );

  const currentPassError = useMemo(() => {
    if (!touchedPassFields.current) return '';
    if (!currentPassword) return 'Enter your current password.';
    return '';
  }, [currentPassword, touchedPassFields.current]);

  const newPassError = useMemo(() => {
    if (!touchedPassFields.next) return '';
    if (!newPassword) return 'Enter a new password.';
    if (newPassword === currentPassword && currentPassword) {
      return 'New password must differ from your current password.';
    }
    if (!newPasswordHealth.isValid) {
      return 'New password must meet all 5 requirements above.';
    }
    return '';
  }, [currentPassword, newPassword, newPasswordHealth.isValid, touchedPassFields.next]);

  const confirmPassError = useMemo(() => {
    if (!touchedPassFields.confirm) return '';
    if (!confirmPassword) return 'Confirm your new password.';
    if (confirmPassword !== newPassword) return 'Passwords do not match.';
    return '';
  }, [confirmPassword, newPassword, touchedPassFields.confirm]);

  const passOtpError = useMemo(() => {
    if (!touchedPassFields.otp) return '';
    if (passwordOtp.trim().length !== 6) return 'Enter the 6-digit verification code.';
    return '';
  }, [passwordOtp, touchedPassFields.otp]);

  const syncWorkspaceFromStorage = useCallback(() => {
    const storedUser = getStoredUser();
    const storedBiz = getStoredBusiness();
    setUserRole(storedBiz?.role || storedUser?.role || 'BUSINESS_OWNER');
    if (storedBiz?.name) setBusinessName(storedBiz.name);
    if (storedUser) {
      if (storedUser.firstName) {
        setFirstName(storedUser.firstName);
        setMerchantName(storedUser.firstName);
      }
      if (storedUser.lastName) setLastName(storedUser.lastName);
      if (storedUser.email) setEmail(storedUser.email);
      if (storedUser.phone) setPhoneNumber(storedUser.phone);
      if (storedUser.kycStatus) setKycStatus(storedUser.kycStatus);
    }
  }, []);

  const loadProfile = useCallback(async () => {
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

      const storedBiz = getStoredBusiness();
      setUserRole(storedBiz?.role || u.role || 'BUSINESS_OWNER');

      try {
        const stored = getStoredUser() || ({} as Record<string, unknown>);
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
      } catch {
        // Ignore storage errors
      }

      if (u.nin) {
        const rawNin = String(u.nin);
        setNinMasked(
          rawNin.length > 4
            ? `${rawNin.slice(0, 3)}****${rawNin.slice(-3)}`
            : 'Verified',
        );
      }
    } else if (!res.ok) {
      showToast({
        type: 'error',
        message: data?.error?.message || 'Unable to load account profile.',
      });
    }
  }, []);

  const loadSecurityData = useCallback(async () => {
    const token = getStoredAuthToken();
    if (!token) return;

    setIsLoadingSecurity(true);
    try {
      const [secRes, twoFaRes] = await Promise.all([
        fetch('/api/users/me/security', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/auth/2fa/status', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const [secData, twoFaData] = await Promise.all([
        secRes.json().catch(() => null),
        twoFaRes.json().catch(() => null),
      ]);

      if (
        handleAuthResponse(secRes, secData) ||
        handleAuthResponse(twoFaRes, twoFaData)
      ) {
        return;
      }

      if (secRes.ok && secData?.success && secData?.data) {
        setSecurityData(secData.data);
      } else if (!secRes.ok) {
        showToast({
          type: 'error',
          message: secData?.error?.message || 'Unable to load security telemetry.',
        });
      }

      if (twoFaRes.ok && twoFaData?.success && twoFaData?.data) {
        setIs2FAEnabled(Boolean(twoFaData.data.enabled));
        setActive2FAMethod(twoFaData.data.method || null);
      }
    } catch {
      showToast({
        type: 'error',
        message: 'Network error loading security information.',
      });
    } finally {
      setIsLoadingSecurity(false);
    }
  }, []);

  useEffect(() => {
    const token = getStoredAuthToken();
    if (!token) {
      clearSessionAndRedirect('expired');
      return;
    }

    if (typeof navigator !== 'undefined') {
      setBrowserUserAgent(navigator.userAgent);
      setIsTouchMacIpad(
        navigator.maxTouchPoints > 1 && /Macintosh/i.test(navigator.userAgent),
      );
    }

    syncWorkspaceFromStorage();

    let cancelled = false;
    (async () => {
      try {
        await Promise.all([loadProfile(), loadSecurityData()]);
      } finally {
        if (!cancelled) {
          setIsInitialLoading(false);
        }
      }
    })();

    const onBusinessSwitched = () => {
      syncWorkspaceFromStorage();
    };
    window.addEventListener('bx_business_switched', onBusinessSwitched);
    return () => {
      cancelled = true;
      window.removeEventListener('bx_business_switched', onBusinessSwitched);
    };
  }, [loadProfile, loadSecurityData, syncWorkspaceFromStorage]);

  const handleRefresh = async () => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    try {
      await Promise.all([loadProfile(), loadSecurityData()]);
      showToast({ type: 'success', message: 'Settings refreshed.' });
    } catch {
      showToast({ type: 'error', message: 'Unable to refresh settings.' });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Current device parsed accurately from client UA or backend session fallback
  const currentDevice = useMemo(() => {
    const ua = browserUserAgent || securityData?.currentSession?.userAgent;
    const parsed = parseDeviceSession(ua);
    if (isTouchMacIpad && parsed.os === 'macOS') {
      return {
        ...parsed,
        displayName: `iPad (iPadOS) · ${parsed.browser}`,
        category: 'mobile' as const,
        os: 'iPadOS',
        fingerprintKey: `mobile:ipad:${parsed.browser.toLowerCase()}`,
      };
    }
    return parsed;
  }, [browserUserAgent, isTouchMacIpad, securityData?.currentSession?.userAgent]);

  const currentSessionIp = securityData?.currentSession?.ipAddress || null;

  const otherActiveSessions = useMemo(() => {
    const list = securityData?.activeSessions || [];
    return list.filter((session) => {
      const parsed = parseDeviceSession(session.userAgent);
      if (parsed.isAutomated) return false;

      const sameDeviceAndBrowser =
        parsed.fingerprintKey === currentDevice.fingerprintKey;
      const sameIp =
        !session.ipAddress ||
        !currentSessionIp ||
        session.ipAddress === currentSessionIp;

      return !(sameDeviceAndBrowser && sameIp);
    });
  }, [currentDevice.fingerprintKey, currentSessionIp, securityData?.activeSessions]);

  const filteredAuditLogs = useMemo(() => {
    const logs = securityData?.auditLogs || [];
    const q = auditSearch.toLowerCase().trim();

    return logs.filter((log) => {
      const category = (log.category || 'system') as AuditCategory;
      if (auditCategoryFilter !== 'ALL' && category !== auditCategoryFilter) {
        return false;
      }
      if (!q) return true;

      const title = (log.title || formatFallbackAuditTitle(log.action)).toLowerCase();
      const desc = (log.description || '').toLowerCase();
      const ip = (log.ipAddress || '').toLowerCase();
      const device = (
        log.deviceName ||
        (log.userAgent ? parseDeviceSession(log.userAgent).displayName : '')
      ).toLowerCase();

      return (
        title.includes(q) ||
        desc.includes(q) ||
        ip.includes(q) ||
        device.includes(q)
      );
    });
  }, [auditCategoryFilter, auditSearch, securityData?.auditLogs]);

  // Password Change Modal Handlers
  const openPasswordModal = () => {
    setPasswordStep('credentials');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordOtp('');
    setShowCurrentPass(false);
    setShowNewPass(false);
    setShowConfirmPass(false);
    setTouchedPassFields({
      current: false,
      next: false,
      confirm: false,
      otp: false,
    });
    setPasswordSubmitError('');
    setIsPasswordModalOpen(true);
  };

  const handleRequestPasswordChange = async (e?: React.SyntheticEvent) => {
    e?.preventDefault();
    setPasswordSubmitError('');
    setTouchedPassFields((prev) => ({
      ...prev,
      current: true,
      next: true,
      confirm: true,
    }));

    if (!currentPassword) {
      currentPassRef.current?.focus();
      return;
    }
    if (!newPassword || newPassword === currentPassword || !newPasswordHealth.isValid) {
      newPassRef.current?.focus();
      return;
    }
    if (confirmPassword !== newPassword) {
      confirmPassRef.current?.focus();
      return;
    }

    const token = getStoredAuthToken();
    if (!token) {
      clearSessionAndRedirect('expired');
      return;
    }

    setIsSubmittingPassword(true);
    try {
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

      if (!res.ok || !data?.success) {
        setPasswordSubmitError(
          data?.error?.message || 'Unable to verify current password.',
        );
        return;
      }

      setPasswordStep('otp');
      setPasswordOtp('');
      setTouchedPassFields((prev) => ({ ...prev, otp: false }));
      showToast({
        type: 'success',
        message: 'Verification code sent to your email.',
      });
    } catch {
      setPasswordSubmitError('Network error while requesting verification code.');
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  const handleConfirmPasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSubmitError('');
    setTouchedPassFields((prev) => ({ ...prev, otp: true }));

    if (passwordOtp.trim().length !== 6) {
      passOtpRef.current?.focus();
      return;
    }

    const token = getStoredAuthToken();
    if (!token) {
      clearSessionAndRedirect('expired');
      return;
    }

    setIsSubmittingPassword(true);
    try {
      const res = await fetch('/api/auth/change-password/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          otp: passwordOtp.trim(),
        }),
      });

      const data = await res.json().catch(() => null);
      if (handleAuthResponse(res, data)) return;

      if (!res.ok || !data?.success) {
        setPasswordSubmitError(
          data?.error?.message || 'Invalid or expired verification code.',
        );
        return;
      }

      if (clerk.user) {
        try {
          await clerk.user.updatePassword({
            currentPassword,
            newPassword,
          });
        } catch {
          // Primary BAXATO password updated successfully; ignore secondary Clerk sync failure
        }
      }

      setIsPasswordModalOpen(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordOtp('');
      showToast({ type: 'success', message: 'Password updated.' });
      await loadSecurityData();
    } catch {
      setPasswordSubmitError('Network error confirming password update.');
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  // 2FA Setup Handlers
  const fetchTotpSetup = async () => {
    const token = getStoredAuthToken();
    if (!token) return;

    setIsLoading2FASetup(true);
    setTwoFactorError('');
    try {
      const res = await fetch('/api/auth/2fa/totp/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      });

      const data = await res.json().catch(() => null);
      if (handleAuthResponse(res, data)) return;

      if (res.ok && data?.success && data?.data) {
        setTotpSecret(data.data.secret || '');
        setTotpQrCodeUrl(data.data.qrCodeDataUrl || '');
        if (Array.isArray(data.data.backupCodes)) {
          setBackupCodes(data.data.backupCodes);
        }
      } else {
        setTwoFactorError(
          data?.error?.message || 'Unable to initialize authenticator setup.',
        );
      }
    } catch {
      setTwoFactorError('Network error initializing authenticator setup.');
    } finally {
      setIsLoading2FASetup(false);
    }
  };

  const handleStart2FASetup = async () => {
    setIsConfiguring2FA(true);
    setTwoFactorError('');
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
    const token = getStoredAuthToken();
    if (!token) return;

    setIsRequestingEmailOtp(true);
    setTwoFactorError('');
    try {
      const res = await fetch('/api/auth/2fa/email/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      });

      const data = await res.json().catch(() => null);
      if (handleAuthResponse(res, data)) return;

      if (res.ok && data?.success) {
        setEmailOtpSent(true);
        showToast({ type: 'success', message: 'Verification code sent.' });
      } else {
        setTwoFactorError(data?.error?.message || 'Unable to send verification code.');
      }
    } catch {
      setTwoFactorError('Network error sending verification code.');
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
        setTwoFactorError('Enter the 6-digit code from your authenticator app.');
        return;
      }

      setIsSubmitting2FA(true);
      try {
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
        if (handleAuthResponse(res, data)) return;

        if (res.ok && data?.success) {
          setIs2FAEnabled(true);
          setActive2FAMethod('TOTP');
          setIsConfiguring2FA(false);
          setTotpCode('');
          showToast({
            type: 'success',
            message: 'Two-factor authentication enabled.',
          });
          await loadSecurityData();
        } else {
          setTwoFactorError(
            data?.error?.message || 'Invalid authenticator code. Please try again.',
          );
        }
      } catch {
        setTwoFactorError('Network error verifying authenticator code.');
      } finally {
        setIsSubmitting2FA(false);
      }
    } else {
      if (emailOtpCode.trim().length !== 6) {
        setTwoFactorError('Enter the 6-digit code sent to your email.');
        return;
      }

      setIsSubmitting2FA(true);
      try {
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
        if (handleAuthResponse(res, data)) return;

        if (res.ok && data?.success) {
          setIs2FAEnabled(true);
          setActive2FAMethod('EMAIL');
          setIsConfiguring2FA(false);
          setEmailOtpCode('');
          setEmailOtpSent(false);
          showToast({
            type: 'success',
            message: 'Two-factor authentication enabled.',
          });
          await loadSecurityData();
        } else {
          setTwoFactorError(
            data?.error?.message || 'Invalid or expired verification code.',
          );
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
    setDisable2FAError('');

    if (!disablePassword) {
      setDisable2FAError('Enter your password to confirm.');
      disablePassRef.current?.focus();
      return;
    }

    const token = getStoredAuthToken();
    if (!token) return;

    setIsSubmittingDisable2FA(true);
    try {
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
      if (handleAuthResponse(res, data)) return;

      if (res.ok && data?.success) {
        setIs2FAEnabled(false);
        setActive2FAMethod(null);
        setIsDisable2FAModalOpen(false);
        setDisablePassword('');
        showToast({
          type: 'success',
          message: 'Two-factor authentication turned off.',
        });
        await loadSecurityData();
      } else {
        setDisable2FAError(data?.error?.message || 'Incorrect password.');
      }
    } catch {
      setDisable2FAError('Network error turning off 2FA.');
    } finally {
      setIsSubmittingDisable2FA(false);
    }
  };

  const copyValue = async (value: string, type: 'id' | 'secret' | 'codes') => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      if (type === 'id') {
        setCopiedUserId(true);
        setTimeout(() => setCopiedUserId(false), 2000);
        showToast({ type: 'success', message: 'User ID copied.' });
      } else if (type === 'secret') {
        setCopiedTotpSecret(true);
        setTimeout(() => setCopiedTotpSecret(false), 2000);
        showToast({ type: 'success', message: 'Setup key copied.' });
      } else {
        setCopiedBackupCodes(true);
        setTimeout(() => setCopiedBackupCodes(false), 2000);
        showToast({ type: 'success', message: 'Recovery codes copied.' });
      }
    } catch {
      showToast({ type: 'error', message: 'Unable to copy to clipboard.' });
    }
  };

  const formatDateTime = (dateStr?: string | null) => {
    if (!dateStr) return 'Active now';
    try {
      return new Date(dateStr).toLocaleString('en-US', {
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

  const handleTabKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    current: SettingsTab,
  ) => {
    const order: SettingsTab[] = ['profile', 'security', 'sessions', 'audit'];
    const idx = order.indexOf(current);
    let nextIdx = -1;

    if (e.key === 'ArrowRight') nextIdx = (idx + 1) % order.length;
    else if (e.key === 'ArrowLeft') nextIdx = (idx - 1 + order.length) % order.length;
    else if (e.key === 'Home') nextIdx = 0;
    else if (e.key === 'End') nextIdx = order.length - 1;

    if (nextIdx !== -1) {
      e.preventDefault();
      const target = order[nextIdx];
      setActiveTab(target);
      tabRefs.current[target]?.focus();
    }
  };

  const isVerified = kycStatus === 'VERIFIED';

  if (isInitialLoading) {
    return <BaxatoLoader variant="fullscreen" />;
  }

  const tabs = [
    { id: 'profile' as const, label: 'Profile', tabId: profileTabId },
    { id: 'security' as const, label: 'Security', tabId: securityTabId },
    { id: 'sessions' as const, label: 'Active Sessions', tabId: sessionsTabId },
    { id: 'audit' as const, label: 'Audit Trail', tabId: auditTabId },
  ];

  return (
    <div className="min-h-screen bg-[#FFFFFF] dark:bg-[#070D18] text-slate-800 dark:text-slate-100 flex flex-col lg:flex-row transition-colors duration-150">
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
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          onOpenKycModal={() => setIsKycModalOpen(true)}
          merchantName={merchantName}
          businessName={businessName}
          kycStatus={kycStatus}
          userRole={userRole}
          isRefreshing={isRefreshing}
          onRefresh={handleRefresh}
          sticky={false}
        />

        <main className="flex-1 px-4 py-5 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full space-y-6 min-w-0">
          <KycBanner
            kycStatus={kycStatus}
            userRole={userRole}
            onOpenKycModal={() => setIsKycModalOpen(true)}
          />

          {/* Top Navigation */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
              <span>Back to Dashboard</span>
            </Link>

            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              aria-label="Refresh settings and telemetry"
              className="inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1528] text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#126BEB]' : 'text-slate-400'}`}
                aria-hidden="true"
              />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>

          {/* Page Title */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
                Settings
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                Account identity, password security, signed-in devices, and activity log.
              </p>
            </div>

            <div className="self-start sm:self-auto shrink-0">
              {isVerified ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                  <Check className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>KYC Verified</span>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsKycModalOpen(true)}
                  className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-lg text-xs font-medium bg-[#126BEB] hover:bg-[#0B5CC7] text-white transition-colors cursor-pointer"
                >
                  <span>Verify Identity</span>
                </button>
              )}
            </div>
          </div>

          {/* Horizontal Accessible Tabs */}
          <div className="border-b border-slate-200 dark:border-slate-800">
            <div
              role="tablist"
              aria-label="Settings sections"
              className="flex items-center gap-6 overflow-x-auto scrollbar-none"
            >
              {tabs.map((tab) => {
                const isSelected = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    ref={(el) => {
                      tabRefs.current[tab.id] = el;
                    }}
                    id={tab.tabId}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    tabIndex={isSelected ? 0 : -1}
                    onClick={() => setActiveTab(tab.id)}
                    onKeyDown={(e) => handleTabKeyDown(e, tab.id)}
                    className={`relative py-3 text-sm font-medium whitespace-nowrap shrink-0 border-b-2 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#126BEB] ${
                      isSelected
                        ? 'border-[#126BEB] dark:border-[#38BDF8] text-[#126BEB] dark:text-[#38BDF8] font-semibold'
                        : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* TAB 1: PROFILE */}
          {activeTab === 'profile' && (
            <section
              role="tabpanel"
              aria-labelledby={profileTabId}
              className="space-y-8 pt-2 pb-12"
            >
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6">
                <div className="md:col-span-4 space-y-1">
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Personal Information
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Your identity details registered on your account.
                  </p>
                </div>

                <div className="md:col-span-8">
                  <div className="bg-[#FFFFFF] dark:bg-[#0B1528] rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
                    <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-11 h-11 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 font-semibold text-sm shrink-0">
                          {firstName ? firstName.charAt(0).toUpperCase() : 'B'}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                            {firstName} {lastName} {middleName ? `(${middleName})` : ''}
                          </p>
                          <p className="text-xs text-slate-500 font-mono mt-0.5 truncate">
                            {email || '—'}
                          </p>
                        </div>
                      </div>

                      {userId && (
                        <button
                          type="button"
                          onClick={() => copyValue(userId, 'id')}
                          aria-label="Copy User ID"
                          className="inline-flex items-center gap-1.5 h-9 px-3 rounded-lg text-xs font-mono text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0 self-start sm:self-auto"
                        >
                          <span>{userId.slice(0, 10)}…</span>
                          {copiedUserId ? (
                            <Check className="w-3.5 h-3.5 text-emerald-500" aria-hidden="true" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                          )}
                        </button>
                      )}
                    </div>

                    <div className="border-t border-slate-100 dark:border-slate-800/80 px-5 sm:px-6 py-4 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                      <div>
                        <span className="text-slate-500 dark:text-slate-400 block mb-0.5">First name</span>
                        <span className="font-medium text-slate-900 dark:text-white">{firstName || '—'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 dark:text-slate-400 block mb-0.5">Last name</span>
                        <span className="font-medium text-slate-900 dark:text-white">{lastName || '—'}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 dark:text-slate-400 block mb-0.5">Middle name</span>
                        <span className="font-medium text-slate-900 dark:text-white">{middleName || '—'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6 pt-6 border-t border-slate-200/80 dark:border-slate-800">
                <div className="md:col-span-4 space-y-1">
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Contact Channels
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Primary email and phone number used for notifications and security checks.
                  </p>
                </div>

                <div className="md:col-span-8">
                  <div className="bg-[#FFFFFF] dark:bg-[#0B1528] rounded-2xl border border-slate-200/80 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
                    <div className="p-5">
                      <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Email address</span>
                      <p className="text-sm font-mono text-slate-900 dark:text-white font-medium break-all">
                        {email || '—'}
                      </p>
                    </div>
                    <div className="p-5">
                      <span className="text-xs text-slate-500 dark:text-slate-400 block mb-1">Phone number</span>
                      <p className="text-sm font-mono text-slate-900 dark:text-white font-medium">
                        {phoneNumber || '—'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6 pt-6 border-t border-slate-200/80 dark:border-slate-800">
                <div className="md:col-span-4 space-y-1">
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                    KYC Verification
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Identity compliance status for your account.
                  </p>
                </div>

                <div className="md:col-span-8">
                  <div className="bg-[#FFFFFF] dark:bg-[#0B1528] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 flex items-center justify-between gap-4">
                    <div>
                      <span className="text-xs text-slate-500 dark:text-slate-400 block mb-0.5">Verification status</span>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {isVerified ? 'Verified' : 'Not Verified'}
                      </p>
                      {ninMasked && (
                        <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-1">
                          NIN: {ninMasked}
                        </p>
                      )}
                    </div>

                    {isVerified ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 shrink-0">
                        <Check className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Verified</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsKycModalOpen(true)}
                        className="h-10 px-4 rounded-lg text-xs sm:text-sm font-medium bg-[#126BEB] hover:bg-[#0B5CC7] text-white transition-colors cursor-pointer shrink-0"
                      >
                        Verify Now
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* TAB 2: SECURITY */}
          {activeTab === 'security' && (
            <section
              role="tabpanel"
              aria-labelledby={securityTabId}
              className="space-y-8 pt-2 pb-12"
            >
              {/* Password Card */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6">
                <div className="md:col-span-4 space-y-1">
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Password
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Use a unique strong password protected by email confirmation.
                  </p>
                </div>

                <div className="md:col-span-8">
                  <div className="bg-[#FFFFFF] dark:bg-[#0B1528] rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 flex items-center justify-between gap-4">
                    <div>
                      <span className="text-xs text-slate-500 dark:text-slate-400 block mb-0.5">
                        Account password
                      </span>
                      <span className="text-sm font-mono tracking-widest text-slate-800 dark:text-slate-200 font-medium">
                        ••••••••••••
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={openPasswordModal}
                      className="h-10 px-4 rounded-lg text-xs sm:text-sm font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                    >
                      Change password
                    </button>
                  </div>
                </div>
              </div>

              {/* Two-Factor Authentication Card */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6 pt-6 border-t border-slate-200/80 dark:border-slate-800">
                <div className="md:col-span-4 space-y-1">
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Two-Factor Authentication
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Require a second verification step when signing in to your account.
                  </p>
                </div>

                <div className="md:col-span-8">
                  <div className="bg-[#FFFFFF] dark:bg-[#0B1528] rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
                    <div className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500 dark:text-slate-400">Status:</span>
                          <span
                            className={`text-xs font-medium px-2.5 py-0.5 rounded-md border ${
                              is2FAEnabled
                                ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300'
                                : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                            }`}
                          >
                            {is2FAEnabled
                              ? `Enabled (${active2FAMethod === 'TOTP' ? 'Authenticator App' : 'Email'})`
                              : 'Off'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">
                          {is2FAEnabled
                            ? 'A 6-digit verification code is required at sign-in.'
                            : 'Protect your account with an authenticator app or email code.'}
                        </p>
                      </div>

                      <div className="shrink-0">
                        {is2FAEnabled ? (
                          <button
                            type="button"
                            onClick={() => {
                              setDisablePassword('');
                              setDisable2FAError('');
                              setShowDisablePassword(false);
                              setIsDisable2FAModalOpen(true);
                            }}
                            className="h-10 px-4 rounded-lg text-xs sm:text-sm font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            Turn off
                          </button>
                        ) : !isConfiguring2FA ? (
                          <button
                            type="button"
                            onClick={handleStart2FASetup}
                            className="h-10 px-4 rounded-lg text-xs sm:text-sm font-medium bg-[#126BEB] hover:bg-[#0B5CC7] text-white transition-colors cursor-pointer"
                          >
                            Enable 2FA
                          </button>
                        ) : null}
                      </div>
                    </div>

                    {/* Interactive Setup Flow */}
                    {isConfiguring2FA && !is2FAEnabled && (
                      <form
                        onSubmit={handleActivate2FA}
                        noValidate
                        className="border-t border-slate-200/80 dark:border-slate-800 p-5 sm:p-6 space-y-5 bg-slate-50/40 dark:bg-[#081020]"
                      >
                        {twoFactorError && (
                          <div
                            role="alert"
                            className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/60 text-red-700 dark:text-red-300 text-xs font-medium flex items-center gap-2"
                          >
                            <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                            <span>{twoFactorError}</span>
                          </div>
                        )}

                        <fieldset className="space-y-2.5">
                          <legend className="text-xs font-medium text-slate-700 dark:text-slate-300">
                            Verification method
                          </legend>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <label
                              htmlFor="setup-2fa-totp"
                              className={`p-3.5 rounded-xl border cursor-pointer transition-colors ${
                                selected2FAMethod === 'TOTP'
                                  ? 'border-[#126BEB] bg-white dark:bg-[#0B1528]'
                                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1528] hover:border-slate-300 dark:hover:border-slate-700'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <input
                                  id="setup-2fa-totp"
                                  type="radio"
                                  name="setup-2fa-method"
                                  value="TOTP"
                                  checked={selected2FAMethod === 'TOTP'}
                                  onChange={() => handleSelect2FAMethod('TOTP')}
                                  className="accent-[#126BEB]"
                                />
                                <span className="text-xs sm:text-sm font-medium text-slate-900 dark:text-white">
                                  Authenticator App
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 pl-6">
                                Google Authenticator, 1Password, or Authy.
                              </p>
                            </label>

                            <label
                              htmlFor="setup-2fa-email"
                              className={`p-3.5 rounded-xl border cursor-pointer transition-colors ${
                                selected2FAMethod === 'EMAIL'
                                  ? 'border-[#126BEB] bg-white dark:bg-[#0B1528]'
                                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1528] hover:border-slate-300 dark:hover:border-slate-700'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <input
                                  id="setup-2fa-email"
                                  type="radio"
                                  name="setup-2fa-method"
                                  value="EMAIL"
                                  checked={selected2FAMethod === 'EMAIL'}
                                  onChange={() => handleSelect2FAMethod('EMAIL')}
                                  className="accent-[#126BEB]"
                                />
                                <span className="text-xs sm:text-sm font-medium text-slate-900 dark:text-white">
                                  Email Code
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 pl-6 truncate">
                                Sent to {email || 'your email'}.
                              </p>
                            </label>
                          </div>
                        </fieldset>

                        {selected2FAMethod === 'TOTP' ? (
                          <div className="space-y-4">
                            <div className="p-4 rounded-xl bg-white dark:bg-[#070D18] border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center gap-5">
                              <div className="w-28 h-28 bg-white p-1.5 rounded-xl border border-slate-200 flex items-center justify-center shrink-0">
                                {isLoading2FASetup ? (
                                  <Loader2 className="w-6 h-6 animate-spin text-slate-400" aria-hidden="true" />
                                ) : totpQrCodeUrl ? (
                                  <img
                                    src={totpQrCodeUrl}
                                    alt="Authenticator QR Code"
                                    className="w-full h-full object-contain"
                                  />
                                ) : (
                                  <QrCode className="w-14 h-14 text-slate-400" aria-hidden="true" />
                                )}
                              </div>

                              <div className="space-y-2 flex-1 min-w-0 text-center sm:text-left">
                                <span className="text-xs text-slate-500 dark:text-slate-400 block">
                                  Scan the QR code or copy the manual setup key:
                                </span>
                                <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                                  <code className="text-xs font-mono font-semibold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 select-all">
                                    {totpSecret || 'Loading…'}
                                  </code>
                                  {totpSecret && (
                                    <button
                                      type="button"
                                      onClick={() => copyValue(totpSecret, 'secret')}
                                      aria-label="Copy setup key"
                                      className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                    >
                                      {copiedTotpSecret ? (
                                        <Check className="w-4 h-4 text-emerald-500" aria-hidden="true" />
                                      ) : (
                                        <Copy className="w-4 h-4" aria-hidden="true" />
                                      )}
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="space-y-1.5">
                              <label
                                htmlFor={totpInputId}
                                className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                              >
                                6-digit code
                              </label>
                              <input
                                id={totpInputId}
                                name="totpCode"
                                type="text"
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                maxLength={6}
                                value={totpCode}
                                onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, ''))}
                                placeholder="000000"
                                className="w-48 h-11 px-3.5 text-center text-base sm:text-sm font-mono font-semibold tracking-widest rounded-lg bg-white dark:bg-[#070D18] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#126BEB]"
                              />
                            </div>

                            {backupCodes.length > 0 && (
                              <div className="p-4 rounded-xl bg-white dark:bg-[#070D18] border border-slate-200 dark:border-slate-800 space-y-2.5">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                    Backup recovery codes
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => copyValue(backupCodes.join('\n'), 'codes')}
                                    className="text-xs font-medium text-[#126BEB] dark:text-[#38BDF8] hover:underline inline-flex items-center gap-1 cursor-pointer"
                                  >
                                    {copiedBackupCodes ? (
                                      <Check className="w-3.5 h-3.5 text-emerald-500" aria-hidden="true" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                                    )}
                                    <span>{copiedBackupCodes ? 'Copied' : 'Copy all'}</span>
                                  </button>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-center">
                                  {backupCodes.map((code, idx) => (
                                    <span
                                      key={idx}
                                      className="text-xs font-mono font-medium text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-900 py-1.5 rounded-lg border border-slate-200/80 dark:border-slate-800 select-all"
                                    >
                                      {code}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="p-4 rounded-xl bg-white dark:bg-[#070D18] border border-slate-200 dark:border-slate-800 space-y-3">
                            <p className="text-xs text-slate-600 dark:text-slate-300">
                              We will send a 6-digit verification code to{' '}
                              <strong className="text-slate-900 dark:text-white">{email}</strong>.
                            </p>

                            {!emailOtpSent ? (
                              <button
                                type="button"
                                onClick={handleRequestEmailOtp}
                                disabled={isRequestingEmailOtp}
                                className="h-11 px-4 rounded-lg text-xs sm:text-sm font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
                              >
                                {isRequestingEmailOtp && (
                                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                                )}
                                <span>Send code</span>
                              </button>
                            ) : (
                              <div className="space-y-2">
                                <div className="flex items-center justify-between max-w-xs">
                                  <label
                                    htmlFor={emailOtpInputId}
                                    className="text-xs font-medium text-slate-700 dark:text-slate-300"
                                  >
                                    6-digit code
                                  </label>
                                  <button
                                    type="button"
                                    onClick={handleRequestEmailOtp}
                                    disabled={isRequestingEmailOtp}
                                    className="text-xs text-[#126BEB] dark:text-[#38BDF8] hover:underline cursor-pointer disabled:opacity-50"
                                  >
                                    Resend
                                  </button>
                                </div>
                                <input
                                  id={emailOtpInputId}
                                  name="emailOtpCode"
                                  type="text"
                                  inputMode="numeric"
                                  autoComplete="one-time-code"
                                  maxLength={6}
                                  value={emailOtpCode}
                                  onChange={(e) => setEmailOtpCode(e.target.value.replace(/\D/g, ''))}
                                  placeholder="000000"
                                  className="w-48 h-11 px-3.5 text-center text-base sm:text-sm font-mono font-semibold tracking-widest rounded-lg bg-white dark:bg-[#070D18] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#126BEB]"
                                />
                              </div>
                            )}
                          </div>
                        )}

                        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200/80 dark:border-slate-800">
                          <button
                            type="button"
                            onClick={() => {
                              setIsConfiguring2FA(false);
                              setTwoFactorError('');
                            }}
                            className="h-11 px-4 rounded-lg text-sm font-medium border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={
                              isSubmitting2FA ||
                              (selected2FAMethod === 'EMAIL' && !emailOtpSent)
                            }
                            className="h-11 px-5 rounded-lg text-sm font-medium bg-[#126BEB] hover:bg-[#0B5CC7] text-white transition-colors inline-flex items-center gap-2 cursor-pointer disabled:opacity-50"
                          >
                            {isSubmitting2FA && (
                              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                            )}
                            <span>Verify</span>
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* TAB 3: ACTIVE SESSIONS */}
          {activeTab === 'sessions' && (
            <section
              role="tabpanel"
              aria-labelledby={sessionsTabId}
              className="space-y-8 pt-2 pb-12"
            >
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 sm:gap-6">
                <div className="md:col-span-4 space-y-1">
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Signed-In Devices
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Browsers and devices recently authenticated on your account.
                  </p>
                </div>

                <div className="md:col-span-8">
                  <div className="bg-[#FFFFFF] dark:bg-[#0B1528] rounded-2xl border border-slate-200/80 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
                    {/* Current Session */}
                    <div className="p-5 sm:p-6 flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3.5 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 shrink-0 mt-0.5">
                          {currentDevice.category === 'mobile' ? (
                            <Smartphone className="w-4 h-4" aria-hidden="true" />
                          ) : (
                            <Laptop className="w-4 h-4" aria-hidden="true" />
                          )}
                        </div>
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                              {currentDevice.displayName}
                            </p>
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 shrink-0">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              This device
                            </span>
                          </div>
                          <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                            IP: {formatDisplayIp(currentSessionIp)}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            Last sign-in: {formatDateTime(securityData?.lastLoginAt)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Other Distinct Devices / Browsers */}
                    {otherActiveSessions.length === 0 ? (
                      <div className="p-5 sm:p-6 text-center bg-slate-50/40 dark:bg-[#081020]">
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          No other signed-in browsers or devices detected.
                        </p>
                      </div>
                    ) : (
                      otherActiveSessions.map((session) => {
                        const parsed = parseDeviceSession(session.userAgent);
                        const label = session.deviceName || parsed.displayName;
                        return (
                          <div
                            key={session.id}
                            className="p-5 sm:p-6 flex items-start justify-between gap-4"
                          >
                            <div className="flex items-start gap-3.5 min-w-0">
                              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 shrink-0 mt-0.5">
                                {parsed.category === 'mobile' ? (
                                  <Smartphone className="w-4 h-4 text-[#126BEB] dark:text-[#38BDF8]" aria-hidden="true" />
                                ) : parsed.category === 'api' ? (
                                  <Key className="w-4 h-4 text-amber-500" aria-hidden="true" />
                                ) : (
                                  <Laptop className="w-4 h-4" aria-hidden="true" />
                                )}
                              </div>
                              <div className="space-y-1 min-w-0">
                                <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                                  {label}
                                </p>
                                <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                                  IP: {formatDisplayIp(session.ipAddress)}
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                  Signed in: {formatDateTime(session.createdAt)}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* TAB 4: AUDIT TRAIL */}
          {activeTab === 'audit' && (
            <section
              role="tabpanel"
              aria-labelledby={auditTabId}
              className="space-y-4 pt-2 pb-12"
            >
              <search>
                <form
                  onSubmit={(e) => e.preventDefault()}
                  className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3"
                >
                  <div className="relative flex-1 sm:max-w-sm">
                    <label htmlFor={auditSearchId} className="sr-only">
                      Search audit trail events
                    </label>
                    <Search
                      className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                      aria-hidden="true"
                    />
                    <input
                      id={auditSearchId}
                      type="search"
                      value={auditSearch}
                      onChange={(e) => setAuditSearch(e.target.value)}
                      placeholder="Search activity, device, or IP..."
                      autoCorrect="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      className="w-full h-11 pl-10 pr-9 text-base sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#126BEB] focus:border-transparent"
                    />
                    {auditSearch && (
                      <button
                        type="button"
                        onClick={() => setAuditSearch('')}
                        aria-label="Clear activity search"
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="relative sm:w-48">
                    <label htmlFor={auditCategoryId} className="sr-only">
                      Filter audit trail by category
                    </label>
                    <select
                      id={auditCategoryId}
                      value={auditCategoryFilter}
                      onChange={(e) => setAuditCategoryFilter(e.target.value)}
                      className="w-full h-11 appearance-none pl-3.5 pr-9 text-base sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#126BEB] focus:border-transparent cursor-pointer"
                    >
                      <option value="ALL">All categories</option>
                      <option value="auth">Sign-in</option>
                      <option value="security">Security</option>
                      <option value="profile">Profile</option>
                    </select>
                    <ChevronDown
                      className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                      aria-hidden="true"
                    />
                  </div>
                </form>
              </search>

              <div className="bg-[#FFFFFF] dark:bg-[#0B1528] rounded-2xl border border-slate-200/80 dark:border-slate-800 overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <h2
                    id={auditTableTitleId}
                    className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                  >
                    Account Security Activity
                  </h2>
                  <button
                    type="button"
                    onClick={loadSecurityData}
                    disabled={isLoadingSecurity}
                    aria-label="Reload audit trail"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${isLoadingSecurity ? 'animate-spin text-[#126BEB]' : ''}`}
                      aria-hidden="true"
                    />
                  </button>
                </div>

                {filteredAuditLogs.length === 0 ? (
                  <div className="py-12 px-4 text-center space-y-2 text-slate-500 dark:text-slate-400">
                    <Shield className="w-6 h-6 mx-auto text-slate-300 dark:text-slate-600" aria-hidden="true" />
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                      {auditSearch || auditCategoryFilter !== 'ALL'
                        ? 'No matching events found'
                        : 'No recent events recorded'}
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Desktop Table */}
                    <div
                      tabIndex={0}
                      role="region"
                      aria-labelledby={auditTableTitleId}
                      className="hidden md:block overflow-x-auto"
                    >
                      <table className="w-full text-left border-collapse text-xs sm:text-sm">
                        <thead>
                          <tr className="bg-slate-50/70 dark:bg-[#081020] border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider">
                            <th scope="col" className="py-3 px-5">
                              Activity
                            </th>
                            <th scope="col" className="py-3 px-4">
                              Category
                            </th>
                            <th scope="col" className="py-3 px-4">
                              Device
                            </th>
                            <th scope="col" className="py-3 px-4">
                              IP Address
                            </th>
                            <th scope="col" className="py-3 px-5 text-right">
                              Time
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                          {filteredAuditLogs.map((log) => {
                            const category = (log.category || 'system') as AuditCategory;
                            const title = log.title || formatFallbackAuditTitle(log.action);
                            const deviceLabel =
                              log.deviceName ||
                              (log.userAgent
                                ? parseDeviceSession(log.userAgent).displayName
                                : '—');

                            return (
                              <tr
                                key={log.id}
                                className="hover:bg-slate-50/60 dark:hover:bg-slate-800/20 transition-colors"
                              >
                                <th scope="row" className="py-3.5 px-5 font-normal text-left">
                                  <p className="font-medium text-slate-900 dark:text-white text-xs sm:text-sm">
                                    {title}
                                  </p>
                                  {log.description && (
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                      {log.description}
                                    </p>
                                  )}
                                </th>
                                <td className="py-3.5 px-4 whitespace-nowrap">
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700">
                                    {AUDIT_CATEGORY_LABELS[category] || 'System'}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">
                                  {deviceLabel}
                                </td>
                                <td className="py-3.5 px-4 text-xs font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                  {formatDisplayIp(log.ipAddress)}
                                </td>
                                <td className="py-3.5 px-5 text-right text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                  {formatDateTime(log.createdAt)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Stacked Cards */}
                    <ul className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredAuditLogs.map((log) => {
                        const category = (log.category || 'system') as AuditCategory;
                        const title = log.title || formatFallbackAuditTitle(log.action);
                        const deviceLabel =
                          log.deviceName ||
                          (log.userAgent
                            ? parseDeviceSession(log.userAgent).displayName
                            : '—');

                        return (
                          <li key={log.id} className="p-4 space-y-1.5">
                            <div className="flex items-start justify-between gap-2">
                              <p className="text-sm font-medium text-slate-900 dark:text-white">
                                {title}
                              </p>
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 shrink-0">
                                {AUDIT_CATEGORY_LABELS[category] || 'System'}
                              </span>
                            </div>
                            {log.description && (
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {log.description}
                              </p>
                            )}
                            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px] text-slate-500 dark:text-slate-400">
                              <span>
                                {deviceLabel} ·{' '}
                                <span className="font-mono">{formatDisplayIp(log.ipAddress)}</span>
                              </span>
                              <span>{formatDateTime(log.createdAt)}</span>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </>
                )}
              </div>
            </section>
          )}
        </main>
      </div>

      {/* MODAL: TWO-STEP PASSWORD CHANGE */}
      <ModalDialog
        isOpen={isPasswordModalOpen}
        onClose={() => {
          if (!isSubmittingPassword) setIsPasswordModalOpen(false);
        }}
        dismissible={!isSubmittingPassword}
        ariaLabelledBy={passModalTitleId}
        maxWidthClass="max-w-md"
      >
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 id={passModalTitleId} className="text-base font-semibold text-slate-900 dark:text-white">
              Change password
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {passwordStep === 'credentials'
                ? 'Choose a new strong password for your account.'
                : `Enter the 6-digit confirmation code sent to ${email || 'your email'}.`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => !isSubmittingPassword && setIsPasswordModalOpen(false)}
            aria-label="Close password dialog"
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {passwordStep === 'credentials' ? (
          <form onSubmit={handleRequestPasswordChange} noValidate className="p-6 space-y-4">
            {passwordSubmitError && (
              <div
                role="alert"
                className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/60 text-red-700 dark:text-red-300 text-xs font-medium flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{passwordSubmitError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label
                htmlFor={currentPassId}
                className="block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Current password
              </label>
              <div className="relative">
                <input
                  ref={currentPassRef}
                  id={currentPassId}
                  name="currentPassword"
                  type={showCurrentPass ? 'text' : 'password'}
                  autoFocus
                  autoComplete="current-password"
                  required
                  value={currentPassword}
                  aria-invalid={Boolean(currentPassError)}
                  aria-describedby={currentPassError ? currentPassErrId : undefined}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  onBlur={() => {
                    if (currentPassword) {
                      setTouchedPassFields((prev) => ({ ...prev, current: true }));
                    }
                  }}
                  className={`w-full h-11 px-3.5 pr-11 text-base sm:text-sm rounded-lg border bg-white dark:bg-[#070D18] text-slate-900 dark:text-white focus:outline-none focus:ring-2 ${
                    currentPassError
                      ? 'border-red-500 focus:ring-red-500/40'
                      : 'border-slate-300 dark:border-slate-700 focus:ring-[#126BEB]'
                  }`}
                />
                <button
                  type="button"
                  aria-pressed={showCurrentPass}
                  aria-label={showCurrentPass ? 'Hide current password' : 'Show current password'}
                  onClick={() => setShowCurrentPass((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 cursor-pointer"
                >
                  {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {currentPassError && (
                <p id={currentPassErrId} className="text-xs text-red-600 dark:text-red-400">
                  {currentPassError}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor={newPassId}
                className="block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                New password
              </label>
              <ul
                id={newPassRulesId}
                className="grid grid-cols-2 gap-1 text-[11px] text-slate-500 dark:text-slate-400 pb-1"
              >
                <li className={newPasswordHealth.hasMinLength ? 'text-emerald-600 dark:text-emerald-400 font-medium' : ''}>
                  {newPasswordHealth.hasMinLength ? '✓ ' : '• '}8+ characters
                </li>
                <li className={newPasswordHealth.hasUpper ? 'text-emerald-600 dark:text-emerald-400 font-medium' : ''}>
                  {newPasswordHealth.hasUpper ? '✓ ' : '• '}Uppercase letter
                </li>
                <li className={newPasswordHealth.hasLower ? 'text-emerald-600 dark:text-emerald-400 font-medium' : ''}>
                  {newPasswordHealth.hasLower ? '✓ ' : '• '}Lowercase letter
                </li>
                <li className={newPasswordHealth.hasNumber ? 'text-emerald-600 dark:text-emerald-400 font-medium' : ''}>
                  {newPasswordHealth.hasNumber ? '✓ ' : '• '}Number
                </li>
                <li className={`col-span-2 ${newPasswordHealth.hasSpecial ? 'text-emerald-600 dark:text-emerald-400 font-medium' : ''}`}>
                  {newPasswordHealth.hasSpecial ? '✓ ' : '• '}Special character (!@#$…)
                </li>
              </ul>
              <div className="relative">
                <input
                  ref={newPassRef}
                  id={newPassId}
                  name="newPassword"
                  type={showNewPass ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  value={newPassword}
                  aria-invalid={Boolean(newPassError)}
                  aria-describedby={
                    newPassError ? `${newPassRulesId} ${newPassErrId}` : newPassRulesId
                  }
                  onChange={(e) => setNewPassword(e.target.value)}
                  onBlur={() => {
                    if (newPassword) {
                      setTouchedPassFields((prev) => ({ ...prev, next: true }));
                    }
                  }}
                  className={`w-full h-11 px-3.5 pr-11 text-base sm:text-sm rounded-lg border bg-white dark:bg-[#070D18] text-slate-900 dark:text-white focus:outline-none focus:ring-2 ${
                    newPassError
                      ? 'border-red-500 focus:ring-red-500/40'
                      : 'border-slate-300 dark:border-slate-700 focus:ring-[#126BEB]'
                  }`}
                />
                <button
                  type="button"
                  aria-pressed={showNewPass}
                  aria-label={showNewPass ? 'Hide new password' : 'Show new password'}
                  onClick={() => setShowNewPass((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 cursor-pointer"
                >
                  {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {newPassError && (
                <p id={newPassErrId} className="text-xs text-red-600 dark:text-red-400">
                  {newPassError}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor={confirmPassId}
                className="block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Confirm new password
              </label>
              <div className="relative">
                <input
                  ref={confirmPassRef}
                  id={confirmPassId}
                  name="confirmPassword"
                  type={showConfirmPass ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  aria-invalid={Boolean(confirmPassError)}
                  aria-describedby={confirmPassError ? confirmPassErrId : undefined}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onBlur={() => {
                    if (confirmPassword) {
                      setTouchedPassFields((prev) => ({ ...prev, confirm: true }));
                    }
                  }}
                  className={`w-full h-11 px-3.5 pr-11 text-base sm:text-sm rounded-lg border bg-white dark:bg-[#070D18] text-slate-900 dark:text-white focus:outline-none focus:ring-2 ${
                    confirmPassError
                      ? 'border-red-500 focus:ring-red-500/40'
                      : 'border-slate-300 dark:border-slate-700 focus:ring-[#126BEB]'
                  }`}
                />
                <button
                  type="button"
                  aria-pressed={showConfirmPass}
                  aria-label={showConfirmPass ? 'Hide password confirmation' : 'Show password confirmation'}
                  onClick={() => setShowConfirmPass((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 cursor-pointer"
                >
                  {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {confirmPassError && (
                <p id={confirmPassErrId} className="text-xs text-red-600 dark:text-red-400">
                  {confirmPassError}
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => !isSubmittingPassword && setIsPasswordModalOpen(false)}
                className="h-11 px-4 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmittingPassword}
                className="h-11 px-5 rounded-lg bg-[#126BEB] hover:bg-[#0B5CC7] text-white font-medium text-sm transition-colors inline-flex items-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isSubmittingPassword && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
                <span>Send code</span>
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleConfirmPasswordChange} noValidate className="p-6 space-y-4">
            {passwordSubmitError && (
              <div
                role="alert"
                className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/60 text-red-700 dark:text-red-300 text-xs font-medium flex items-center gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                <span>{passwordSubmitError}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor={passOtpId}
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                >
                  6-digit confirmation code
                </label>
                <button
                  type="button"
                  disabled={isSubmittingPassword}
                  onClick={handleRequestPasswordChange}
                  className="text-xs text-[#126BEB] dark:text-[#38BDF8] hover:underline cursor-pointer disabled:opacity-50"
                >
                  Resend code
                </button>
              </div>
              <input
                ref={passOtpRef}
                id={passOtpId}
                name="otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                maxLength={6}
                value={passwordOtp}
                aria-invalid={Boolean(passOtpError)}
                aria-describedby={passOtpError ? passOtpErrId : undefined}
                onChange={(e) => setPasswordOtp(e.target.value.replace(/\D/g, ''))}
                onBlur={() => {
                  if (passwordOtp) {
                    setTouchedPassFields((prev) => ({ ...prev, otp: true }));
                  }
                }}
                placeholder="000000"
                className={`w-full h-11 px-3.5 text-center text-base sm:text-sm font-mono font-semibold tracking-widest rounded-lg border bg-white dark:bg-[#070D18] text-slate-900 dark:text-white focus:outline-none focus:ring-2 ${
                  passOtpError
                    ? 'border-red-500 focus:ring-red-500/40'
                    : 'border-slate-300 dark:border-slate-700 focus:ring-[#126BEB]'
                }`}
              />
              {passOtpError && (
                <p id={passOtpErrId} className="text-xs text-red-600 dark:text-red-400">
                  {passOtpError}
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                disabled={isSubmittingPassword}
                onClick={() => {
                  setPasswordSubmitError('');
                  setPasswordStep('credentials');
                }}
                className="h-11 px-4 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-medium transition-colors cursor-pointer"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isSubmittingPassword}
                className="h-11 px-5 rounded-lg bg-[#126BEB] hover:bg-[#0B5CC7] text-white font-medium text-sm transition-colors inline-flex items-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isSubmittingPassword && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
                <span>Confirm</span>
              </button>
            </div>
          </form>
        )}
      </ModalDialog>

      {/* MODAL: DISABLE 2FA CONFIRMATION */}
      <ModalDialog
        isOpen={isDisable2FAModalOpen}
        onClose={() => {
          if (!isSubmittingDisable2FA) setIsDisable2FAModalOpen(false);
        }}
        dismissible={!isSubmittingDisable2FA}
        ariaLabelledBy={disable2faTitleId}
        maxWidthClass="max-w-md"
      >
        <form onSubmit={handleConfirmDisable2FA} noValidate className="p-6 space-y-5">
          <div>
            <h2 id={disable2faTitleId} className="text-base font-semibold text-slate-900 dark:text-white">
              Turn off two-factor authentication
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
              Enter your account password to deactivate two-factor authentication.
            </p>
          </div>

          {disable2FAError && (
            <div
              role="alert"
              className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/60 text-red-700 dark:text-red-300 text-xs font-medium flex items-center gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{disable2FAError}</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label
              htmlFor={disable2faPassId}
              className="block text-xs font-medium text-slate-700 dark:text-slate-300"
            >
              Account password
            </label>
            <div className="relative">
              <input
                ref={disablePassRef}
                id={disable2faPassId}
                name="password"
                type={showDisablePassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={disablePassword}
                aria-invalid={Boolean(disable2FAError)}
                aria-describedby={disable2FAError ? disable2faErrId : undefined}
                onChange={(e) => {
                  setDisablePassword(e.target.value);
                  if (disable2FAError) setDisable2FAError('');
                }}
                placeholder="Enter password"
                className="w-full h-11 px-3.5 pr-11 text-base sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#070D18] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#126BEB]"
              />
              <button
                type="button"
                aria-pressed={showDisablePassword}
                aria-label={showDisablePassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowDisablePassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 cursor-pointer"
              >
                {showDisablePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {disable2FAError && (
              <p id={disable2faErrId} className="sr-only">
                {disable2FAError}
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              autoFocus
              onClick={() => !isSubmittingDisable2FA && setIsDisable2FAModalOpen(false)}
              className="h-11 px-4 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-medium transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingDisable2FA}
              className="h-11 px-5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium text-sm transition-colors inline-flex items-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isSubmittingDisable2FA && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
              <span>Turn off</span>
            </button>
          </div>
        </form>
      </ModalDialog>

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
