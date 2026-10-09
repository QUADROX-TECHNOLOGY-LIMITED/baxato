'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  Mail,
  KeyRound,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  QrCode,
  Smartphone,
  Copy,
  Check,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

type LoginStep = 'credentials' | '2fa_verify' | '2fa_setup';
type SetupMethod = 'TOTP' | 'EMAIL';

export default function StaffLoginPage() {
  const router = useRouter();

  // Primary credentials state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<LoginStep>('credentials');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 2FA Verification state (when already configured)
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorMethod, setTwoFactorMethod] = useState<'TOTP' | 'EMAIL'>('TOTP');
  const [twoFactorPrompt, setTwoFactorPrompt] = useState('');
  const [isResendingEmail, setIsResendingEmail] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  // 2FA Setup state (first-time staff enrollment)
  const [tempToken, setTempToken] = useState('');
  const [setupMethod, setSetupMethod] = useState<SetupMethod>('TOTP');
  const [totpSetupData, setTotpSetupData] = useState<any>(null);
  const [setupCode, setSetupCode] = useState('');
  const [copiedSecret, setCopiedSecret] = useState(false);
  const [copiedCodes, setCopiedCodes] = useState(false);

  // 1. Submit Primary Credentials
  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/staff/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data?.error?.message || 'Authentication failed. Please verify credentials.');
        return;
      }

      // Check for 2FA flows
      if (data.data?.requiresTwoFactorSetup) {
        // First-time staff login: Mandatory 2FA Setup
        setTempToken(data.data.tempToken);
        setStep('2fa_setup');
        // Pre-fetch TOTP setup info
        initiateTotpSetup(data.data.tempToken);
      } else if (data.data?.requiresTwoFactor) {
        // Existing 2FA: Prompt for 6-digit code
        setTwoFactorMethod(data.data.twoFactorMethod || 'EMAIL');
        setTwoFactorPrompt(data.data.message || 'Please enter your two-factor authentication code.');
        setStep('2fa_verify');
      } else if (data.data?.token) {
        // Direct session completion
        completeStaffSession(data.data);
      }
    } catch {
      setErrorMessage('Network error while connecting to the staff authentication gateway.');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Submit Existing 2FA Code
  const handleVerify2FaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (twoFactorCode.trim().length !== 6) {
      setErrorMessage('Verification code must be exactly 6 digits.');
      return;
    }

    setErrorMessage(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/staff/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          password,
          twoFactorCode: twoFactorCode.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(data?.error?.message || 'Invalid two-factor authentication code.');
        return;
      }

      completeStaffSession(data.data);
    } catch {
      setErrorMessage('Network error verifying 2FA code.');
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Initiate TOTP setup for first-time staff
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
      const data = await res.json();
      if (res.ok && data.success) {
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

  // 4. Initiate Email OTP setup for first-time staff
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
      const data = await res.json();
      if (res.ok && data.success) {
        setResendSuccess(true);
        setTimeout(() => setResendSuccess(false), 3000);
      } else {
        setErrorMessage(data?.error?.message || 'Failed to dispatch email verification code.');
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
    if (setupCode.trim().length !== 6) {
      setErrorMessage('Please enter the 6-digit confirmation code.');
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
          code: setupCode.trim(),
          secret: setupMethod === 'TOTP' ? totpSetupData?.secret : undefined,
          backupCodes: setupMethod === 'TOTP' ? totpSetupData?.backupCodes : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(data?.error?.message || 'Invalid verification code.');
        return;
      }

      completeStaffSession(data.data);
    } catch {
      setErrorMessage('Network error finalizing 2FA setup.');
    } finally {
      setIsLoading(false);
    }
  };

  // Common Session Completion
  const completeStaffSession = (data: any) => {
    if (data?.token) {
      try {
        localStorage.setItem('bx_auth_token', data.token);
        document.cookie = `bx_auth_token=${encodeURIComponent(data.token)}; path=/; max-age=604800; SameSite=Lax`;
        if (data.user) {
          localStorage.setItem('bx_user', JSON.stringify(data.user));
        }
      } catch {}
    }

    // Force hard refresh into /staff/overview
    if (typeof window !== 'undefined') {
      window.location.assign('/staff/overview');
    } else {
      router.push('/staff/overview');
    }
  };

  const copyToClipboard = (text: string, type: 'secret' | 'codes') => {
    navigator.clipboard.writeText(text);
    if (type === 'secret') {
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    } else {
      setCopiedCodes(true);
      setTimeout(() => setCopiedCodes(false), 2000);
    }
  };

  return (
    <div className="min-h-screen bg-[#070D18] text-white flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Background radial glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-blue-600/15 via-indigo-600/10 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md relative z-10">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2.5 px-3 py-1 rounded-full bg-slate-900/90 border border-slate-800 text-xs text-slate-300 mb-4 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
            </span>
            <span className="font-semibold tracking-wider text-[11px] uppercase">
              Operations Control Portal
            </span>
          </div>

          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="relative w-8 h-8">
              <Image
                src="/baxato-logo-white.png"
                alt="Baxato"
                fill
                className="object-contain"
                onError={(e) => {
                  (e.target as any).src = '/baxato-logo-blue.png';
                }}
              />
            </div>
            <h1 className="text-2xl font-black tracking-wider text-white">BAXATO</h1>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              STAFF
            </span>
          </div>

          <p className="text-xs text-slate-400">
            Privileged authentication for platform staff & administrators
          </p>
        </div>

        {/* Card Box */}
        <div className="bg-[#0D1726]/90 border border-slate-800/80 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <div className="leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {/* STEP 1: PRIMARY CREDENTIALS */}
          {step === 'credentials' && (
            <form onSubmit={handleCredentialsSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Staff Corporate Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="staff@baxato.ng"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs bg-slate-900/80 border border-slate-800 text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl text-xs bg-slate-900/80 border border-slate-800 text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl font-bold text-xs bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white transition flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 disabled:opacity-50 mt-2"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Authenticating...</span>
                  </>
                ) : (
                  <>
                    <span>Verify Credentials</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* No Public Registration Notice */}
              <div className="pt-3 border-t border-slate-800/80 text-center">
                <div className="inline-flex items-center gap-1.5 text-[11px] text-slate-400">
                  <Lock className="w-3.5 h-3.5 text-slate-500" />
                  <span>Staff accounts are provisioned exclusively by Admins</span>
                </div>
                <div className="mt-2 text-[11px] text-slate-500">
                  Are you a merchant?{' '}
                  <Link href="/login" className="text-blue-400 hover:underline font-semibold">
                    Go to Merchant Login
                  </Link>
                </div>
              </div>
            </form>
          )}

          {/* STEP 2A: EXISTING 2FA VERIFICATION */}
          {step === '2fa_verify' && (
            <form onSubmit={handleVerify2FaSubmit} className="space-y-4">
              <div className="text-center pb-2">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 mx-auto mb-3 flex items-center justify-center border border-indigo-500/20">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h2 className="text-base font-bold text-white mb-1">
                  Two-Factor Authentication
                </h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {twoFactorPrompt}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 text-center">
                  6-Digit Security Code
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="000000"
                  autoFocus
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                  className="w-full text-center text-xl font-mono tracking-[0.5em] py-3 rounded-xl bg-slate-900 border border-slate-800 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || twoFactorCode.length !== 6}
                className="w-full py-3 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-500 text-white transition flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying Code...</span>
                  </>
                ) : (
                  <>
                    <span>Verify & Launch Console</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep('credentials');
                  setTwoFactorCode('');
                  setErrorMessage(null);
                }}
                className="w-full py-2 text-xs text-slate-400 hover:text-white transition flex items-center justify-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to sign in</span>
              </button>
            </form>
          )}

          {/* STEP 2B: MANDATORY 2FA FIRST-TIME ENROLLMENT */}
          {step === '2fa_setup' && (
            <div className="space-y-4">
              <div className="text-center pb-2">
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 mx-auto mb-3 flex items-center justify-center border border-amber-500/20">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <h2 className="text-base font-bold text-white mb-1">
                  Mandatory 2FA Enrollment
                </h2>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Fintech platform policy requires Two-Factor Authentication for all staff accounts.
                </p>
              </div>

              {/* Method Toggle */}
              <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-900 border border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setSetupMethod('TOTP');
                    if (!totpSetupData) initiateTotpSetup(tempToken);
                  }}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 ${
                    setupMethod === 'TOTP'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Authenticator App</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSetupMethod('EMAIL');
                    initiateEmailSetup();
                  }}
                  className={`py-2 px-3 rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 ${
                    setupMethod === 'EMAIL'
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Staff Email OTP</span>
                </button>
              </div>

              {/* SUB-VIEW A: TOTP Authenticator App */}
              {setupMethod === 'TOTP' && (
                <div className="space-y-3">
                  {totpSetupData?.qrCodeDataUrl ? (
                    <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-white text-slate-900">
                      <img
                        src={totpSetupData.qrCodeDataUrl}
                        alt="Scan QR in Authenticator App"
                        className="w-36 h-36 object-contain"
                      />
                      <span className="text-[10px] text-slate-500 font-medium mt-1">
                        Scan with Google Authenticator or Authy
                      </span>
                    </div>
                  ) : (
                    <div className="py-8 flex justify-center">
                      <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
                    </div>
                  )}

                  {totpSetupData?.secret && (
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs font-mono">
                      <div className="truncate text-slate-300 pr-2">
                        Key: {totpSetupData.secret}
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(totpSetupData.secret, 'secret')}
                        className="p-1 rounded bg-slate-800 text-slate-300 hover:text-white shrink-0"
                      >
                        {copiedSecret ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* SUB-VIEW B: Email OTP */}
              {setupMethod === 'EMAIL' && (
                <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300 leading-relaxed">
                  A 6-digit confirmation code was sent to <strong className="text-white">{email}</strong>. Enter it below to activate your staff session.
                </div>
              )}

              {/* 6-Digit Verification Input */}
              <form onSubmit={handleCompleteSetup} className="space-y-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1 text-center">
                    Enter 6-Digit Code to Activate
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="000000"
                    value={setupCode}
                    onChange={(e) => setSetupCode(e.target.value.replace(/\D/g, ''))}
                    className="w-full text-center text-xl font-mono tracking-[0.5em] py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading || setupCode.length !== 6}
                  className="w-full py-3 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Enrolling 2FA...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Verify & Activate Session</span>
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
                  className="w-full py-1.5 text-xs text-slate-400 hover:text-white transition flex items-center justify-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Cancel</span>
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
