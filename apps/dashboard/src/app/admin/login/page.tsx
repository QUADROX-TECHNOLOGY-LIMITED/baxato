'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  ArrowLeft,
  ShieldCheck,
  Smartphone,
  Mail,
  Copy,
  Check,
  CheckCircle2,
} from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';

type LoginStep = 'credentials' | '2fa_verify' | '2fa_setup';

export default function SuperAdminLoginPage() {
  const router = useRouter();

  // Primary credentials state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<LoginStep>('credentials');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 2FA Verification state (when already enrolled)
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorPrompt, setTwoFactorPrompt] = useState('');
  const [twoFactorMethod, setTwoFactorMethod] = useState<'TOTP' | 'EMAIL'>('TOTP');
  const [resendCountdown, setResendCountdown] = useState(0);
  const [isResendingEmail, setIsResendingEmail] = useState(false);

  // First-time 2FA Enrollment state (mandatory security)
  const [tempToken, setTempToken] = useState('');
  const [setupMethod, setSetupMethod] = useState<'TOTP' | 'EMAIL'>('TOTP');
  const [totpSetupData, setTotpSetupData] = useState<{
    secret?: string;
    qrCodeDataUrl?: string;
    backupCodes?: string[];
  } | null>(null);
  const [setupCode, setSetupCode] = useState('');
  const [copiedSecret, setCopiedSecret] = useState(false);

  // 1. Submit Primary Credentials
  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.toLowerCase().trim();

    if (!cleanEmail.endsWith('@baxato.com')) {
      setErrorMessage('Admin login requires an official @baxato.com email address.');
      return;
    }

    if (!password) {
      setErrorMessage('Password is required.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          password: password.trim(),
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        setErrorMessage(data?.error?.message || 'Invalid email or password.');
        return;
      }

      // Mandatory 2FA Enrollment (pending first-time setup)
      if (data.data?.requiresTwoFactorSetup) {
        setTempToken(data.data.tempToken);
        setStep('2fa_setup');
        initiateTotpSetup(data.data.tempToken);
        return;
      }

      // Existing 2FA Verification Challenge
      if (data.data?.requiresTwoFactor) {
        setTwoFactorMethod(data.data.twoFactorMethod || 'TOTP');
        setTwoFactorPrompt(data.data.message || 'Enter your 2FA verification code.');
        setStep('2fa_verify');
        return;
      }

      // Session completion
      completeAdminSession(data.data);
    } catch {
      setErrorMessage('Network error during authentication. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Submit Existing 2FA Code
  const handleVerify2FaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanCode = twoFactorCode.trim();
    if (cleanCode.length !== 6) {
      setErrorMessage('Verification code must be 6 digits.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          password: password.trim(),
          twoFactorCode: cleanCode,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        setErrorMessage(data?.error?.message || 'Invalid or expired 2FA code.');
        return;
      }

      completeAdminSession(data.data);
    } catch {
      setErrorMessage('Network error verifying 2FA code.');
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Initiate TOTP setup for first-time admin enrollment
  const initiateTotpSetup = async (tokenToUse: string) => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/auth/staff/2fa/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tempToken: tokenToUse,
          method: 'TOTP',
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        setTotpSetupData(data.data);
      } else {
        setErrorMessage(data?.error?.message || 'Failed to initialize authenticator setup.');
      }
    } catch {
      setErrorMessage('Network error loading QR code.');
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Initiate Email OTP setup for first-time admin enrollment
  const initiateEmailSetup = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setSetupCode('');
    try {
      const res = await fetch('/api/auth/staff/2fa/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tempToken,
          method: 'EMAIL',
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        setResendCountdown(60);
      } else {
        setErrorMessage(data?.error?.message || 'Failed to dispatch verification code.');
      }
    } catch {
      setErrorMessage('Network error requesting email code.');
    } finally {
      setIsLoading(false);
    }
  };

  // 5. Complete First-Time 2FA Enrollment & Login
  const handleCompleteSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = setupCode.trim();
    if (cleanCode.length !== 6) {
      setErrorMessage('Verification code must be 6 digits.');
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/staff/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tempToken,
          method: setupMethod,
          code: cleanCode,
          secret: setupMethod === 'TOTP' ? totpSetupData?.secret : undefined,
          backupCodes: setupMethod === 'TOTP' ? totpSetupData?.backupCodes : undefined,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        setErrorMessage(data?.error?.message || 'Invalid verification code.');
        return;
      }

      completeAdminSession(data.data);
    } catch {
      setErrorMessage('Network error finalizing 2FA enrollment.');
    } finally {
      setIsLoading(false);
    }
  };

  // Resend existing email OTP
  const handleResendOtp = async () => {
    if (resendCountdown > 0 || isResendingEmail) return;
    try {
      setIsResendingEmail(true);
      const res = await fetch('/api/auth/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase().trim(), password: password.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        setResendCountdown(60);
      }
    } finally {
      setIsResendingEmail(false);
    }
  };

  const copySecret = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  // Common Session Completion
  const completeAdminSession = (data: any) => {
    if (data?.token) {
      try {
        localStorage.setItem('bx_auth_token', data.token);
        document.cookie = `bx_auth_token=${encodeURIComponent(data.token)}; path=/; max-age=604800; SameSite=Lax`;
        if (data.user) {
          localStorage.setItem('bx_user', JSON.stringify(data.user));
        }
      } catch {}
    }

    if (typeof window !== 'undefined') {
      window.location.assign('/admin/overview');
    } else {
      router.push('/admin/overview');
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-8 sm:py-12 bg-slate-50 dark:bg-[#070D18] text-slate-800 dark:text-slate-200 transition-colors duration-200 relative font-sans">
      {/* Top Bar with ThemeToggle */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <ThemeToggle />
      </div>

      {/* Main Container */}
      <div className="w-full max-w-sm sm:max-w-md">
        {/* Header Branding */}
        <div className="text-center mb-6">
          <div className="relative w-10 h-10 rounded-xl overflow-hidden shadow-sm border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0A1324] p-1 mx-auto mb-3">
            <Image
              src="/baxato-logo.jpg"
              alt="Baxato"
              fill
              priority
              className="object-contain rounded-lg"
            />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Admin Sign in
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Sign in with your platform administrator credentials
          </p>
        </div>

        {/* Card Box */}
        <div className="bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm dark:shadow-xl transition-colors">
          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
              <div className="leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {/* STEP 1: PRIMARY CREDENTIALS */}
          {step === 'credentials' && (
            <form onSubmit={handleCredentialsSubmit} noValidate className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Corporate Email
                </label>
                <input
                  type="email"
                  required
                  autoFocus
                  placeholder="admin@baxato.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0A1324] text-slate-900 dark:text-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#126BEB] transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0A1324] text-slate-900 dark:text-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#126BEB] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#126BEB] hover:bg-[#0E58C4] text-white font-semibold text-sm transition-all shadow-sm shadow-blue-500/20 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <span>Sign in</span>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* STEP 2A: 2FA VERIFICATION (WHEN ALREADY ENROLLED) */}
          {step === '2fa_verify' && (
            <form onSubmit={handleVerify2FaSubmit} noValidate className="space-y-4">
              <div className="text-center pb-1">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-[#126BEB] flex items-center justify-center mx-auto mb-2 border border-blue-200 dark:border-blue-900/50">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Two-Factor Authentication
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {twoFactorPrompt || 'Enter the 6-digit code from your authenticator app.'}
                </p>
              </div>

              <div>
                <input
                  type="text"
                  required
                  autoFocus
                  maxLength={6}
                  placeholder="000000"
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full text-center text-xl font-bold tracking-[0.4em] py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0A1324] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#126BEB] transition-colors"
                />
              </div>

              {twoFactorMethod === 'EMAIL' && (
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
                  <span>Didn&apos;t receive code?</span>
                  {resendCountdown > 0 ? (
                    <span>Resend in {resendCountdown}s</span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendOtp}
                      disabled={isResendingEmail}
                      className="text-[#126BEB] hover:underline font-semibold disabled:opacity-50"
                    >
                      Resend code
                    </button>
                  )}
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading || twoFactorCode.length !== 6}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#126BEB] hover:bg-[#0E58C4] text-white font-semibold text-sm transition-all shadow-sm shadow-blue-500/20 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <span>Verify &amp; Sign in</span>
                  )}
                </button>
              </div>

              <div className="pt-1 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setStep('credentials');
                    setTwoFactorCode('');
                    setErrorMessage(null);
                  }}
                  className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 inline-flex items-center gap-1.5 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to credentials</span>
                </button>
              </div>
            </form>
          )}

          {/* STEP 2B: MANDATORY 2FA ENROLLMENT */}
          {step === '2fa_setup' && (
            <div className="space-y-4">
              <div className="text-center pb-1">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-[#126BEB] flex items-center justify-center mx-auto mb-2 border border-blue-200 dark:border-blue-900/50">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Mandatory 2FA Enrollment
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Platform administrators must configure Two-Factor Authentication.
                </p>
              </div>

              {/* Method Switcher */}
              <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    setSetupMethod('TOTP');
                    if (!totpSetupData) initiateTotpSetup(tempToken);
                  }}
                  className={`py-2 px-3 rounded-lg transition flex items-center justify-center gap-1.5 ${
                    setupMethod === 'TOTP'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Authenticator</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSetupMethod('EMAIL');
                    initiateEmailSetup();
                  }}
                  className={`py-2 px-3 rounded-lg transition flex items-center justify-center gap-1.5 ${
                    setupMethod === 'EMAIL'
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Email OTP</span>
                </button>
              </div>

              {/* TOTP Method */}
              {setupMethod === 'TOTP' && (
                <div className="space-y-3">
                  {totpSetupData?.qrCodeDataUrl ? (
                    <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-white border border-slate-200 dark:border-slate-800">
                      <img
                        src={totpSetupData.qrCodeDataUrl}
                        alt="Scan QR code"
                        className="w-36 h-36 object-contain"
                      />
                      <span className="text-[11px] text-slate-500 mt-1">
                        Scan with Google Authenticator or 1Password
                      </span>
                    </div>
                  ) : (
                    <div className="py-6 flex justify-center">
                      <Loader2 className="w-5 h-5 animate-spin text-[#126BEB]" />
                    </div>
                  )}

                  {totpSetupData?.secret && (
                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
                      <div className="truncate text-slate-600 dark:text-slate-300 pr-2">
                        Key: {totpSetupData.secret}
                      </div>
                      <button
                        type="button"
                        onClick={() => copySecret(totpSetupData.secret!)}
                        className="p-1 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white shrink-0"
                      >
                        {copiedSecret ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Email Method */}
              {setupMethod === 'EMAIL' && (
                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 text-xs text-blue-800 dark:text-blue-300">
                  Verification code dispatched to <strong>{email}</strong>.
                </div>
              )}

              {/* Confirmation Code Input */}
              <form onSubmit={handleCompleteSetup} noValidate className="space-y-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 text-center">
                    Enter 6-digit confirmation code
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="000000"
                    autoFocus
                    value={setupCode}
                    onChange={(e) => setSetupCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full text-center text-xl font-bold tracking-[0.4em] py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0A1324] text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#126BEB] transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading || setupCode.length !== 6}
                  className="w-full py-2.5 px-4 rounded-xl font-semibold text-sm bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-sm active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Activating 2FA...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirm &amp; Complete Sign In</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setStep('credentials');
                    setSetupCode('');
                    setErrorMessage(null);
                  }}
                  className="w-full py-1.5 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition flex items-center justify-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Cancel</span>
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Footer Legal Notice */}
        <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-6">
          &copy; {new Date().getFullYear()} XATO TECHNOLOGIES LIMITED. All rights reserved.
        </p>
      </div>
    </div>
  );
}
