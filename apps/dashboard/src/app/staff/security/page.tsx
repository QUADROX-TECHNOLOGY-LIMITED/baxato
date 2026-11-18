'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  KeyRound,
  ShieldCheck,
  Mail,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Smartphone,
  Laptop,
  History,
  Copy,
  Check,
  X,
} from 'lucide-react';
import BaxatoLoader from '@/components/BaxatoLoader';
import ModalDialog from '@/components/ModalDialog';
import {
  clearSessionAndRedirect,
  getStoredAuthToken,
  handleAuthResponse,
  isTokenExpired,
} from '@/lib/auth-session';
import { showToast } from '@/lib/toast';

type SecurityTab = 'password' | '2fa' | 'sessions';

export default function StaffSecurityPage() {
  const [activeTab, setActiveTab] = useState<SecurityTab>('password');

  // Password Update State
  const [step, setStep] = useState<'REQUEST' | 'CONFIRM'>('REQUEST');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // 2FA Management State
  const [twoFaStatus, setTwoFaStatus] = useState<{
    enabled: boolean;
    method: 'TOTP' | 'EMAIL' | null;
    hasBackupCodes: boolean;
  } | null>(null);
  const [isLoadingTwoFa, setIsLoadingTwoFa] = useState(false);
  const [switchModal, setSwitchModal] = useState<'TOTP' | 'EMAIL' | null>(null);
  const [totpSetup, setTotpSetup] = useState<{
    secret?: string;
    qrCodeDataUrl?: string;
    backupCodes?: string[];
  } | null>(null);
  const [twoFaCode, setTwoFaCode] = useState('');
  const [twoFaModalError, setTwoFaModalError] = useState('');
  const [isSwitchingTwoFa, setIsSwitchingTwoFa] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Sessions & Audit State
  const [securityData, setSecurityData] = useState<any>(null);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [sessionsError, setSessionsError] = useState('');

  const copyValue = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const loadTwoFactorStatus = useCallback(async () => {
    try {
      setIsLoadingTwoFa(true);
      const token = getStoredAuthToken();
      if (!token || isTokenExpired(token)) {
        clearSessionAndRedirect('expired');
        return;
      }

      const res = await fetch('/api/auth/2fa/status', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => null);
      if (handleAuthResponse(res, data)) return;

      if (res.ok && data?.success) {
        setTwoFaStatus(data.data);
      }
    } finally {
      setIsLoadingTwoFa(false);
    }
  }, []);

  const loadSessionsAndAudit = useCallback(async () => {
    try {
      setIsLoadingSessions(true);
      setSessionsError('');
      const token = getStoredAuthToken();
      if (!token || isTokenExpired(token)) {
        clearSessionAndRedirect('expired');
        return;
      }

      const res = await fetch('/api/users/me/security', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => null);
      if (handleAuthResponse(res, data)) return;

      if (res.ok && data?.success) {
        setSecurityData(data.data);
      } else {
        setSessionsError(data?.error?.message || 'Unable to load session history.');
      }
    } catch {
      setSessionsError('Network error loading session history.');
    } finally {
      setIsLoadingSessions(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === '2fa') {
      void loadTwoFactorStatus();
    } else if (activeTab === 'sessions') {
      void loadSessionsAndAudit();
    }
  }, [activeTab, loadTwoFactorStatus, loadSessionsAndAudit]);

  useEffect(() => {
    const handleRefreshEvent = () => {
      if (activeTab === '2fa') void loadTwoFactorStatus();
      if (activeTab === 'sessions') void loadSessionsAndAudit();
    };
    window.addEventListener('bx_staff_refresh', handleRefreshEvent);
    return () => window.removeEventListener('bx_staff_refresh', handleRefreshEvent);
  }, [activeTab, loadTwoFactorStatus, loadSessionsAndAudit]);

  // Step 1: Validate passwords and request email OTP
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!currentPassword) {
      setPasswordError('Enter your current password.');
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }
    if (newPassword === currentPassword) {
      setPasswordError('New password must be different from your current password.');
      return;
    }

    try {
      setIsSubmittingPassword(true);
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
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await res.json().catch(() => null);
      if (handleAuthResponse(res, data)) return;

      if (res.ok && data?.success) {
        setPasswordSuccess('A 6-digit verification code was sent to your email.');
        setStep('CONFIRM');
      } else {
        setPasswordError(
          data?.error?.message || 'Unable to verify your current password.',
        );
      }
    } catch {
      setPasswordError('Network error requesting verification code.');
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  // Step 2: Confirm password change with OTP
  const handleConfirmOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!otp || otp.trim().length !== 6) {
      setPasswordError('Enter the 6-digit code sent to your email.');
      return;
    }

    try {
      setIsSubmittingPassword(true);
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
          otp: otp.trim(),
        }),
      });

      const data = await res.json().catch(() => null);
      if (handleAuthResponse(res, data)) return;

      if (res.ok && data?.success) {
        const msg = 'Password updated.';
        setPasswordSuccess(msg);
        showToast({ type: 'success', message: msg });
        setStep('REQUEST');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setOtp('');
      } else {
        setPasswordError(data?.error?.message || 'Invalid or expired verification code.');
      }
    } catch {
      setPasswordError('Network error confirming password update.');
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  // Open 2FA switch modal
  const openSwitchTwoFa = async (targetMethod: 'TOTP' | 'EMAIL') => {
    setSwitchModal(targetMethod);
    setTwoFaCode('');
    setTwoFaModalError('');
    setTotpSetup(null);

    const token = getStoredAuthToken();
    if (!token) {
      clearSessionAndRedirect('expired');
      return;
    }

    setIsSwitchingTwoFa(true);
    try {
      if (targetMethod === 'TOTP') {
        const res = await fetch('/api/auth/2fa/totp/setup', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json().catch(() => null);
        if (handleAuthResponse(res, data)) return;
        if (res.ok && data?.success) {
          setTotpSetup(data.data);
        } else {
          setTwoFaModalError(data?.error?.message || 'Failed to generate authenticator secret.');
        }
      } else {
        const res = await fetch('/api/auth/2fa/email/request', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json().catch(() => null);
        if (handleAuthResponse(res, data)) return;
        if (!res.ok || !data?.success) {
          setTwoFaModalError(data?.error?.message || 'Failed to send email verification code.');
        }
      }
    } catch {
      setTwoFaModalError('Network error preparing 2FA setup.');
    } finally {
      setIsSwitchingTwoFa(false);
    }
  };

  const handleConfirmSwitchTwoFa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (twoFaCode.trim().length !== 6) {
      setTwoFaModalError('Enter a valid 6-digit code.');
      return;
    }

    const token = getStoredAuthToken();
    if (!token) {
      clearSessionAndRedirect('expired');
      return;
    }

    setIsSwitchingTwoFa(true);
    setTwoFaModalError('');
    try {
      const res =
        switchModal === 'TOTP'
          ? await fetch('/api/auth/2fa/totp/verify', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                secret: totpSetup?.secret,
                token: twoFaCode.trim(),
                backupCodes: totpSetup?.backupCodes,
              }),
            })
          : await fetch('/api/auth/2fa/email/verify', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                otp: twoFaCode.trim(),
              }),
            });

      const data = await res.json().catch(() => null);
      if (handleAuthResponse(res, data)) return;

      if (res.ok && data?.success) {
        const msg =
          switchModal === 'TOTP'
            ? 'Authenticator app 2FA activated.'
            : 'Email 2FA verification activated.';
        showToast({ type: 'success', message: msg });
        setSwitchModal(null);
        void loadTwoFactorStatus();
      } else {
        setTwoFaModalError(data?.error?.message || 'Invalid verification code.');
      }
    } catch {
      setTwoFaModalError('Network error verifying 2FA code.');
    } finally {
      setIsSwitchingTwoFa(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      {isSubmittingPassword && <BaxatoLoader variant="overlay" />}

      {/* Header */}
      <div className="pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white [text-wrap:balance]">
          Account & Security
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Update your password, configure two-factor security, and review recent sign-in activity.
        </p>
      </div>

      {/* Tabs */}
      <div
        role="tablist"
        aria-label="Account security settings"
        className="flex flex-wrap sm:inline-flex w-full sm:w-auto p-1 rounded-xl bg-slate-100 dark:bg-[#0B1528] border border-slate-200/80 dark:border-slate-800 gap-1"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'password'}
          onClick={() => setActiveTab('password')}
          className={`flex-1 sm:flex-initial min-h-10 px-4 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
            activeTab === 'password'
              ? 'bg-white dark:bg-[#126BEB] text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <KeyRound className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Password</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === '2fa'}
          onClick={() => setActiveTab('2fa')}
          className={`flex-1 sm:flex-initial min-h-10 px-4 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
            activeTab === '2fa'
              ? 'bg-white dark:bg-[#126BEB] text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Two-Factor (2FA)</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'sessions'}
          onClick={() => setActiveTab('sessions')}
          className={`flex-1 sm:flex-initial min-h-10 px-4 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
            activeTab === 'sessions'
              ? 'bg-white dark:bg-[#126BEB] text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          <History className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Sessions & Activity</span>
        </button>
      </div>

      {/* TAB 1: PASSWORD */}
      {activeTab === 'password' && (
        <div className="space-y-4">
          {passwordError && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/60 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{passwordError}</span>
            </div>
          )}

          {passwordSuccess && (
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-700 dark:text-emerald-300 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{passwordSuccess}</span>
            </div>
          )}

          {step === 'REQUEST' ? (
            <form
              onSubmit={handleRequestOtp}
              className="p-5 sm:p-6 rounded-xl bg-white dark:bg-[#0B1528] border border-slate-200/80 dark:border-slate-800 space-y-4"
            >
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
                Change Password
              </h2>

              <div className="space-y-1.5">
                <label
                  htmlFor="current-password"
                  className="text-xs font-medium text-slate-700 dark:text-slate-300 block"
                >
                  Current Password
                </label>
                <div className="relative">
                  <input
                    id="current-password"
                    type={showCurrent ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter current password"
                    required
                    className="w-full h-11 px-3.5 pr-12 rounded-lg text-base sm:text-sm bg-transparent border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-[#126BEB] focus:ring-2 focus:ring-[#126BEB]/15 dark:focus:border-[#38BDF8] dark:focus:ring-[#38BDF8]/15"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    aria-label={showCurrent ? 'Hide current password' : 'Show current password'}
                    className="absolute right-0 top-0 h-11 w-11 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white"
                  >
                    {showCurrent ? (
                      <EyeOff className="w-4 h-4" aria-hidden="true" />
                    ) : (
                      <Eye className="w-4 h-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="new-password"
                  className="text-xs font-medium text-slate-700 dark:text-slate-300 block"
                >
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="new-password"
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    required
                    minLength={8}
                    className="w-full h-11 px-3.5 pr-12 rounded-lg text-base sm:text-sm bg-transparent border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-[#126BEB] focus:ring-2 focus:ring-[#126BEB]/15 dark:focus:border-[#38BDF8] dark:focus:ring-[#38BDF8]/15"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    aria-label={showNew ? 'Hide new password' : 'Show new password'}
                    className="absolute right-0 top-0 h-11 w-11 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white"
                  >
                    {showNew ? (
                      <EyeOff className="w-4 h-4" aria-hidden="true" />
                    ) : (
                      <Eye className="w-4 h-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="confirm-password"
                  className="text-xs font-medium text-slate-700 dark:text-slate-300 block"
                >
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    id="confirm-password"
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    required
                    className="w-full h-11 px-3.5 pr-12 rounded-lg text-base sm:text-sm bg-transparent border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-[#126BEB] focus:ring-2 focus:ring-[#126BEB]/15 dark:focus:border-[#38BDF8] dark:focus:ring-[#38BDF8]/15"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    aria-label={showConfirm ? 'Hide confirmation password' : 'Show confirmation password'}
                    className="absolute right-0 top-0 h-11 w-11 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white"
                  >
                    {showConfirm ? (
                      <EyeOff className="w-4 h-4" aria-hidden="true" />
                    ) : (
                      <Eye className="w-4 h-4" aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmittingPassword}
                className="w-full h-11 px-4 rounded-lg text-xs font-semibold bg-[#126BEB] hover:bg-[#0E59C9] text-white transition-colors disabled:opacity-50"
              >
                Send code
              </button>
            </form>
          ) : (
            <form
              onSubmit={handleConfirmOtp}
              className="p-5 sm:p-6 rounded-xl bg-white dark:bg-[#0B1528] border border-slate-200/80 dark:border-slate-800 space-y-4"
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
                <Mail className="w-4 h-4 text-[#126BEB] dark:text-[#38BDF8]" aria-hidden="true" />
                <span>Verify Email Code</span>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400">
                Enter the 6-digit verification code sent to your staff email to save your new password.
              </p>

              <div className="space-y-1.5">
                <label
                  htmlFor="password-otp"
                  className="text-xs font-medium text-slate-700 dark:text-slate-300 block"
                >
                  6-Digit Code
                </label>
                <input
                  id="password-otp"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  required
                  className="w-full h-11 px-3.5 rounded-lg text-center text-lg font-mono tracking-[0.35em] bg-transparent border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-[#126BEB] dark:focus:border-[#38BDF8]"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setStep('REQUEST');
                    setPasswordError('');
                  }}
                  className="h-11 px-5 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingPassword || otp.length !== 6}
                  className="flex-1 h-11 px-4 rounded-lg text-xs font-semibold bg-[#126BEB] hover:bg-[#0E59C9] text-white transition-colors disabled:opacity-50"
                >
                  Confirm
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* TAB 2: TWO-FACTOR SECURITY */}
      {activeTab === '2fa' && (
        <div className="space-y-4">
          {isLoadingTwoFa ? (
            <div className="rounded-xl bg-white dark:bg-[#0B1528] border border-slate-200/80 dark:border-slate-800">
              <BaxatoLoader variant="inline" />
            </div>
          ) : (
            <div className="p-5 sm:p-6 rounded-xl bg-white dark:bg-[#0B1528] border border-slate-200/80 dark:border-slate-800 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Two-Factor Authentication
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Mandatory for all BAXATO operations accounts.
                  </p>
                </div>
                <span className="self-start sm:self-auto px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>
                    {twoFaStatus?.method === 'TOTP'
                      ? 'Authenticator App Active'
                      : twoFaStatus?.method === 'EMAIL'
                        ? 'Email Code Active'
                        : 'Enabled'}
                  </span>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                      <Smartphone className="w-4 h-4 text-[#126BEB] dark:text-[#38BDF8]" aria-hidden="true" />
                      <span>Authenticator App (TOTP)</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Time-based 6-digit codes from your authenticator app.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void openSwitchTwoFa('TOTP')}
                    className="h-11 px-4 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white transition-colors"
                  >
                    {twoFaStatus?.method === 'TOTP' ? 'Rotate Secret Key' : 'Switch to Authenticator'}
                  </button>
                </div>

                <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 flex flex-col justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                      <Mail className="w-4 h-4 text-[#126BEB] dark:text-[#38BDF8]" aria-hidden="true" />
                      <span>Email Verification</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Receive a 6-digit verification code to your @baxato.com address on sign-in.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void openSwitchTwoFa('EMAIL')}
                    className="h-11 px-4 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white transition-colors"
                  >
                    {twoFaStatus?.method === 'EMAIL' ? 'Verify Email 2FA' : 'Switch to Email 2FA'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SESSIONS & AUDIT ACTIVITY */}
      {activeTab === 'sessions' && (
        <div className="space-y-5">
          {sessionsError && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-xs text-rose-700 dark:text-rose-300 flex items-center justify-between gap-2">
              <span>{sessionsError}</span>
              <button
                type="button"
                onClick={() => void loadSessionsAndAudit()}
                className="min-h-9 px-2.5 rounded-md font-semibold hover:bg-rose-100 dark:hover:bg-rose-900/40"
              >
                Retry
              </button>
            </div>
          )}

          {isLoadingSessions && !securityData ? (
            <div className="rounded-xl bg-white dark:bg-[#0B1528] border border-slate-200/80 dark:border-slate-800">
              <BaxatoLoader variant="inline" />
            </div>
          ) : (
            <>
              {/* Current Session */}
              {securityData?.currentSession && (
                <section className="p-4 sm:p-5 rounded-xl bg-white dark:bg-[#0B1528] border border-slate-200/80 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                      <Laptop className="w-4 h-4 text-[#126BEB] dark:text-[#38BDF8]" aria-hidden="true" />
                      <span>Current Session</span>
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                      Active now
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-2 border-t border-slate-100 dark:border-slate-800/80">
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block">Device</span>
                      <span className="font-medium text-slate-900 dark:text-white mt-0.5 block">
                        {securityData.currentSession.deviceName || 'Web Browser'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block">IP Address</span>
                      <span className="font-mono text-slate-900 dark:text-white mt-0.5 block">
                        {securityData.currentSession.ipAddress || 'Unknown'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block">Last Sign-in</span>
                      <span className="text-slate-700 dark:text-slate-300 mt-0.5 block">
                        {securityData.lastLoginAt
                          ? new Date(securityData.lastLoginAt).toLocaleString('en-NG', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          : 'Just now'}
                      </span>
                    </div>
                  </div>
                </section>
              )}

              {/* Recent Audit Activity */}
              <section className="rounded-xl bg-white dark:bg-[#0B1528] border border-slate-200/80 dark:border-slate-800 overflow-hidden">
                <div className="px-4 sm:px-5 py-3.5 border-b border-slate-200/80 dark:border-slate-800">
                  <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                    Recent Account Activity
                  </h2>
                </div>

                {!securityData?.auditLogs || securityData.auditLogs.length === 0 ? (
                  <p className="p-6 text-center text-xs text-slate-500">
                    No recent security events recorded.
                  </p>
                ) : (
                  <ul className="divide-y divide-slate-100 dark:divide-slate-800/70">
                    {securityData.auditLogs.slice(0, 15).map((log: any) => (
                      <li
                        key={log.id}
                        className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                      >
                        <div className="space-y-0.5 min-w-0">
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {log.title || log.action}
                          </div>
                          {log.description && (
                            <div className="text-slate-500 dark:text-slate-400">
                              {log.description}
                            </div>
                          )}
                          <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                            {log.ipAddress || 'Unknown IP'}
                            {log.deviceName ? ` · ${log.deviceName}` : ''}
                          </div>
                        </div>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 whitespace-nowrap shrink-0">
                          {new Date(log.createdAt).toLocaleDateString('en-NG', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
        </div>
      )}

      {/* 2FA SWITCH / SETUP MODAL */}
      <ModalDialog
        isOpen={Boolean(switchModal)}
        onClose={() => setSwitchModal(null)}
        ariaLabelledBy="staff-2fa-modal-title"
        maxWidthClass="max-w-md"
        className="bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
      >
        {switchModal && (
          <div className="flex flex-col max-h-[85dvh]">
            <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-slate-200/80 dark:border-slate-800">
              <div>
                <h2
                  id="staff-2fa-modal-title"
                  className="text-base font-bold text-slate-900 dark:text-white"
                >
                  {switchModal === 'TOTP' ? 'Configure Authenticator App' : 'Configure Email 2FA'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Confirm with a 6-digit verification code.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSwitchModal(null)}
                aria-label="Close modal"
                className="min-h-10 min-w-10 -mr-2 -mt-1 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleConfirmSwitchTwoFa} className="p-5 space-y-4 overflow-y-auto">
              {twoFaModalError && (
                <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
                  {twoFaModalError}
                </div>
              )}

              {isSwitchingTwoFa && !totpSetup && switchModal === 'TOTP' ? (
                <BaxatoLoader variant="inline" className="py-6" />
              ) : (
                <>
                  {switchModal === 'TOTP' && totpSetup && (
                    <div className="space-y-3">
                      {totpSetup.qrCodeDataUrl && (
                        <div className="flex flex-col items-center p-4 rounded-xl bg-white border border-slate-200 dark:border-slate-800">
                          <img
                            src={totpSetup.qrCodeDataUrl}
                            alt="Authenticator QR code"
                            className="w-36 h-36 object-contain"
                          />
                        </div>
                      )}

                      {totpSetup.secret && (
                        <div className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 text-xs font-mono">
                          <span className="truncate text-slate-700 dark:text-slate-300">
                            {totpSetup.secret}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyValue(totpSetup.secret!, 'sec-totp')}
                            aria-label="Copy setup key"
                            className="min-h-8 min-w-8 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white shrink-0"
                          >
                            {copiedKey === 'sec-totp' ? (
                              <Check className="w-3.5 h-3.5 text-emerald-500" aria-hidden="true" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                            )}
                          </button>
                        </div>
                      )}

                      {Array.isArray(totpSetup.backupCodes) && totpSetup.backupCodes.length > 0 && (
                        <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-slate-700 dark:text-slate-300">
                              Recovery Codes
                            </span>
                            <button
                              type="button"
                              onClick={() => copyValue(totpSetup.backupCodes!.join('\n'), 'sec-backup')}
                              className="text-[#126BEB] dark:text-[#38BDF8] font-medium hover:underline flex items-center gap-1"
                            >
                              {copiedKey === 'sec-backup' ? (
                                <>
                                  <Check className="w-3 h-3" aria-hidden="true" />
                                  <span>Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" aria-hidden="true" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>
                          <div className="grid grid-cols-2 gap-1 font-mono text-[11px] text-slate-600 dark:text-slate-400">
                            {totpSetup.backupCodes.map((code) => (
                              <span key={code}>{code}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {switchModal === 'EMAIL' && (
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      A 6-digit verification code was sent to your staff email address.
                    </p>
                  )}
                </>
              )}

              <div className="space-y-1.5">
                <label
                  htmlFor="switch-2fa-code"
                  className="text-xs font-medium text-slate-700 dark:text-slate-300 block"
                >
                  6-Digit Code
                </label>
                <input
                  id="switch-2fa-code"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  value={twoFaCode}
                  onChange={(e) => setTwoFaCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-full h-11 px-3.5 rounded-lg text-center text-lg font-mono tracking-[0.35em] bg-transparent border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-[#126BEB] dark:focus:border-[#38BDF8]"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setSwitchModal(null)}
                  className="h-11 px-4 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSwitchingTwoFa || twoFaCode.length !== 6}
                  className="flex-1 h-11 px-4 rounded-lg text-xs font-semibold bg-[#126BEB] hover:bg-[#0E59C9] text-white transition-colors disabled:opacity-50"
                >
                  Confirm
                </button>
              </div>
            </form>
          </div>
        )}
      </ModalDialog>
    </div>
  );
}
