'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Copy,
  Check,
  ArrowLeft,
  Smartphone,
  Mail,
  ShieldAlert,
  Lock,
  KeyRound,
  Crown,
} from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';

type LoginStep = 'credentials' | '2fa_verify' | '2fa_setup';
type SetupMethod = 'TOTP' | 'EMAIL';

export default function SuperAdminLoginPage() {
  const router = useRouter();

  // Primary credentials state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<LoginStep>('credentials');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 2FA Verification state
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorMethod, setTwoFactorMethod] = useState<'TOTP' | 'EMAIL'>('TOTP');
  const [twoFactorPrompt, setTwoFactorPrompt] = useState('');
  const [isResendingEmail, setIsResendingEmail] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  // 2FA Setup state (first-time super admin enrollment)
  const [tempToken, setTempToken] = useState('');
  const [setupMethod, setSetupMethod] = useState<SetupMethod>('TOTP');
  const [totpSetupData, setTotpSetupData] = useState<{
    secret?: string;
    qrCodeDataUrl?: string;
    backupCodes?: string[];
  } | null>(null);
  const [setupCode, setSetupCode] = useState('');
  const [copiedSecret, setCopiedSecret] = useState(false);

  // Countdown timer for resend
  React.useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

  // 1. Submit Primary Credentials
  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.toLowerCase().trim();

    if (!cleanEmail.endsWith('@baxato.com')) {
      setErrorMessage('Super Admin login requires an official @baxato.com email address.');
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
          password,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        setErrorMessage(data?.error?.message || 'Invalid Super Admin credentials.');
        return;
      }

      // Check for 2FA flows
      if (data.data?.requiresTwoFactorSetup) {
        setTempToken(data.data.tempToken);
        setStep('2fa_setup');
        await initiate2FaSetup(data.data.tempToken, 'TOTP');
        return;
      }

      if (data.data?.requiresTwoFactor) {
        setTwoFactorMethod(data.data.twoFactorMethod || 'TOTP');
        setTwoFactorPrompt(data.data.message || 'Enter your 2FA verification code.');
        if (data.data.twoFactorMethod === 'EMAIL') {
          setResendCountdown(60);
        }
        setStep('2fa_verify');
        return;
      }

      // Complete login directly if 2FA satisfied
      completeAdminSession(data.data);
    } catch {
      setErrorMessage('Network error during authentication. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Submit 2FA Verification Code
  const handleVerify2FaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!twoFactorCode.trim()) {
      setErrorMessage('Please enter your 6-digit verification code.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          password,
          twoFactorCode: twoFactorCode.trim(),
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

  // 3. Initiate 2FA Setup
  const initiate2FaSetup = async (token: string, method: SetupMethod) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch('/api/auth/staff/2fa/setup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ method }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        setErrorMessage(data?.error?.message || 'Failed to initiate 2FA setup.');
        return;
      }

      if (method === 'TOTP') {
        setTotpSetupData(data.data);
      } else {
        setResendCountdown(60);
      }
    } catch {
      setErrorMessage('Error communicating with 2FA provisioning service.');
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Verify & Confirm 2FA Setup
  const handleConfirm2FaSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!setupCode.trim()) {
      setErrorMessage('Please enter the verification code.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/staff/2fa/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tempToken}`,
        },
        body: JSON.stringify({
          method: setupMethod,
          code: setupCode.trim(),
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        setErrorMessage(data?.error?.message || 'Invalid verification code. Please check your authenticator.');
        return;
      }

      // Re-trigger login with newly configured 2FA
      const loginRes = await fetch('/api/auth/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          password,
          twoFactorCode: setupCode.trim(),
        }),
      });

      const loginData = await loginRes.json().catch(() => null);
      if (loginRes.ok && loginData?.success) {
        completeAdminSession(loginData.data);
      } else {
        setStep('2fa_verify');
        setTwoFactorMethod(setupMethod);
      }
    } catch {
      setErrorMessage('Error completing 2FA enrollment.');
    } finally {
      setIsLoading(false);
    }
  };

  // Complete session & route to /admin/overview
  const completeAdminSession = (loginData: any) => {
    if (loginData?.token) {
      try {
        localStorage.setItem('bx_auth_token', loginData.token);
        document.cookie = `bx_auth_token=${encodeURIComponent(loginData.token)}; path=/; max-age=604800; SameSite=Lax`;
        if (loginData.user) {
          localStorage.setItem('bx_user', JSON.stringify(loginData.user));
        }
      } catch {}
    }
    window.location.assign('/admin/overview');
  };

  return (
    <div className="min-h-screen bg-[#040711] text-slate-100 flex flex-col justify-between selection:bg-purple-600 selection:text-white">
      {/* Top Header */}
      <header className="px-6 py-5 flex items-center justify-between border-b border-purple-950/40 bg-[#070B18]/70 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Image
            src="/logos/baxato-icon.svg"
            alt="Baxato"
            width={32}
            height={32}
            className="w-8 h-8 rounded-lg"
          />
          <div className="flex items-center gap-2">
            <span className="font-bold tracking-tight text-white text-base">BAXATO</span>
            <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
              Master Admin
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-md bg-[#090E1E] border border-purple-900/30 rounded-2xl p-6 sm:p-8 shadow-2xl shadow-purple-950/40 space-y-6 relative overflow-hidden">
          {/* Subtle Top Accent Glow */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-600 via-indigo-500 to-amber-500" />

          {/* Heading */}
          <div className="text-center space-y-2">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-purple-950 to-indigo-900 border border-purple-700/40 flex items-center justify-center text-purple-300 shadow-inner">
              <Crown className="w-7 h-7 text-amber-400" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white">
              Platform Super Admin
            </h1>
            <p className="text-xs text-slate-400">
              Root Console & Sovereign Infrastructure Access
            </p>
          </div>

          {/* Error Alert */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-950/50 border border-red-800/60 text-red-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1">{errorMessage}</div>
            </div>
          )}

          {/* STEP 1: Primary Credentials */}
          {step === 'credentials' && (
            <form onSubmit={handleCredentialsSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Super Admin Work Email <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@baxato.com"
                  required
                  autoFocus
                  className="w-full px-4 py-2.5 rounded-xl bg-[#050811] border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 text-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Master Password <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="w-full px-4 py-2.5 rounded-xl bg-[#050811] border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 text-sm font-mono pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm transition shadow-lg shadow-purple-900/40 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying Authority...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Authenticate & Proceed to 2FA</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* STEP 2: 2FA Verification */}
          {step === '2fa_verify' && (
            <form onSubmit={handleVerify2FaSubmit} className="space-y-4">
              <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-800/40 text-xs text-purple-200">
                <p className="font-semibold mb-1">Two-Factor Authentication Required</p>
                <p className="text-[11px] text-purple-300/80">{twoFactorPrompt}</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  6-Digit Security Code
                </label>
                <input
                  type="text"
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value.replace(/\s+/g, ''))}
                  placeholder="123456"
                  maxLength={8}
                  autoFocus
                  required
                  className="w-full px-4 py-3 rounded-xl bg-[#050811] border border-slate-800 text-white text-center font-mono text-lg tracking-widest focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={() => setStep('credentials')}
                  className="text-slate-400 hover:text-white flex items-center gap-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back
                </button>
                {twoFactorMethod === 'EMAIL' && (
                  <button
                    type="button"
                    disabled={resendCountdown > 0}
                    onClick={async () => {
                      setResendCountdown(60);
                      // Trigger resend
                      fetch('/api/auth/admin/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: email.toLowerCase().trim(), password }),
                      });
                    }}
                    className="text-purple-400 hover:text-purple-300 disabled:text-slate-600"
                  >
                    {resendCountdown > 0 ? `Resend code in ${resendCountdown}s` : 'Resend Email Code'}
                  </button>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm transition shadow-lg shadow-purple-900/40 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Verifying Code...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Authorize Master Console</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* STEP 3: Mandatory First-time 2FA Setup */}
          {step === '2fa_setup' && totpSetupData && (
            <form onSubmit={handleConfirm2FaSetup} className="space-y-4">
              <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-800/40 text-xs text-purple-200">
                <p className="font-semibold mb-1">Mandatory 2FA Enrollment</p>
                <p className="text-[11px] text-purple-300/80">
                  Scan this QR code with Google Authenticator or 1Password to activate your Super Admin access.
                </p>
              </div>

              {totpSetupData.qrCodeDataUrl && (
                <div className="flex justify-center p-3 bg-white rounded-xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={totpSetupData.qrCodeDataUrl}
                    alt="2FA QR Code"
                    className="w-40 h-40 object-contain"
                  />
                </div>
              )}

              {totpSetupData.secret && (
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Manual Setup Key:</label>
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-[#050811] border border-slate-800 text-xs font-mono text-purple-300">
                    <span className="flex-1 truncate">{totpSetupData.secret}</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(totpSetupData.secret || '');
                        setCopiedSecret(true);
                        setTimeout(() => setCopiedSecret(false), 2000);
                      }}
                      className="text-slate-400 hover:text-white"
                    >
                      {copiedSecret ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Enter 6-Digit Code from Authenticator
                </label>
                <input
                  type="text"
                  value={setupCode}
                  onChange={(e) => setSetupCode(e.target.value.replace(/\s+/g, ''))}
                  placeholder="000000"
                  maxLength={6}
                  required
                  className="w-full px-4 py-2.5 rounded-xl bg-[#050811] border border-slate-800 text-white text-center font-mono text-base tracking-widest focus:outline-none focus:border-purple-500"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm transition shadow-lg shadow-purple-900/40 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Activating 2FA...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Confirm & Enter Console</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* Footer Notice */}
          <div className="pt-2 border-t border-slate-900 text-center">
            <p className="text-[11px] text-slate-500">
              Restricted to authorized personnel. All session events and commands are immutably logged with SHA-256 signatures.
            </p>
          </div>
        </div>
      </main>

      {/* Bottom Footer */}
      <footer className="px-6 py-4 text-center text-xs text-slate-600 border-t border-slate-900">
        &copy; {new Date().getFullYear()} Baxato Financial Technologies Limited • Sovereign Platform Control
      </footer>
    </div>
  );
}
