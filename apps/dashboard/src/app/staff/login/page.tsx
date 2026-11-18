'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Eye,
  EyeOff,
  AlertCircle,
  Copy,
  Check,
  Smartphone,
  Mail,
} from 'lucide-react';
import BaxatoLoader from '@/components/BaxatoLoader';
import { AUTH_INPUT_CLASS, AUTH_PRIMARY_BUTTON_CLASS } from '@/components/auth/AuthShell';

type LoginStep = 'credentials' | '2fa_verify' | '2fa_setup';
type SetupMethod = 'TOTP' | 'EMAIL';

export default function StaffLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<LoginStep>('credentials');
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingSetup, setIsFetchingSetup] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusHint, setStatusHint] = useState<string | null>(null);
  const [isSessionExpired, setIsSessionExpired] = useState(false);

  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorMethod, setTwoFactorMethod] = useState<'TOTP' | 'EMAIL'>('TOTP');
  const [twoFactorPrompt, setTwoFactorPrompt] = useState('');
  const [isResendingEmail, setIsResendingEmail] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  const [tempToken, setTempToken] = useState('');
  const [setupMethod, setSetupMethod] = useState<SetupMethod>('TOTP');
  const [totpSetupData, setTotpSetupData] = useState<{
    secret?: string;
    qrCodeDataUrl?: string;
    backupCodes?: string[];
  } | null>(null);
  const [setupCode, setSetupCode] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const params = new URLSearchParams(window.location.search);
        if (params.get('expired') === 'true' || params.get('unauthorized') === 'true') {
          setIsSessionExpired(true);
          try {
            localStorage.removeItem('bx_auth_token');
            localStorage.removeItem('bx_user');
            localStorage.removeItem('bx_business');
            document.cookie =
              'bx_auth_token=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax';
          } catch {}
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

  useEffect(() => {
    if (!statusHint) return;
    const timer = setTimeout(() => setStatusHint(null), 2500);
    return () => clearTimeout(timer);
  }, [statusHint]);

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

    if (typeof window !== 'undefined') {
      window.location.assign('/staff/overview');
    } else {
      router.push('/staff/overview');
    }
  };

  const initiateTotpSetup = async (tokenToUse: string) => {
    setIsFetchingSetup(true);
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
        setErrorMessage(data?.error?.message || 'Failed to load authenticator setup.');
      }
    } catch {
      setErrorMessage('Network error loading authenticator setup.');
    } finally {
      setIsFetchingSetup(false);
    }
  };

  const initiateEmailSetup = async () => {
    setIsFetchingSetup(true);
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
        setStatusHint('Code sent');
      } else {
        setErrorMessage(data?.error?.message || 'Unable to send verification code.');
      }
    } catch {
      setErrorMessage('Network error requesting email code.');
    } finally {
      setIsFetchingSetup(false);
    }
  };

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setStatusHint(null);

    const cleanEmail = email.toLowerCase().trim();
    if (!cleanEmail.endsWith('@baxato.com')) {
      setErrorMessage('Staff login requires a @baxato.com email address.');
      return;
    }

    if (!password) {
      setErrorMessage('Password is required.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/staff/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          password,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        setErrorMessage(data?.error?.message || 'Invalid email or password.');
        setIsLoading(false);
        return;
      }

      if (data.data?.requiresTwoFactorSetup) {
        setTempToken(data.data.tempToken);
        setStep('2fa_setup');
        setIsLoading(false);
        void initiateTotpSetup(data.data.tempToken);
      } else if (data.data?.requiresTwoFactor) {
        const method = data.data.twoFactorMethod || 'EMAIL';
        setTwoFactorMethod(method);
        setTwoFactorPrompt(
          method === 'TOTP'
            ? 'Enter the 6-digit code from your authenticator app.'
            : `Enter the 6-digit code sent to ${cleanEmail}.`,
        );
        if (method === 'EMAIL') {
          setResendCountdown(60);
          setStatusHint('Code sent');
        }
        setStep('2fa_verify');
        setIsLoading(false);
      } else if (data.data?.token) {
        completeStaffSession(data.data);
      } else {
        setIsLoading(false);
      }
    } catch {
      setErrorMessage('Network error connecting to staff login.');
      setIsLoading(false);
    }
  };

  const handleVerify2FaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = twoFactorCode.trim();
    if (cleanCode.length !== 6) {
      setErrorMessage('Verification code must be 6 digits.');
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
          twoFactorCode: cleanCode,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        setErrorMessage(data?.error?.message || 'Invalid verification code.');
        setIsLoading(false);
        return;
      }

      completeStaffSession(data.data);
    } catch {
      setErrorMessage('Network error verifying code.');
      setIsLoading(false);
    }
  };

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
        setIsLoading(false);
        return;
      }

      completeStaffSession(data.data);
    } catch {
      setErrorMessage('Network error completing setup.');
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCountdown > 0 || isResendingEmail) return;
    setIsResendingEmail(true);
    setErrorMessage(null);
    try {
      const res = await fetch('/api/auth/staff/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          password,
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        setResendCountdown(60);
        setStatusHint('Code sent');
      } else {
        setErrorMessage(data?.error?.message || 'Failed to resend code.');
      }
    } catch {
      setErrorMessage('Network error resending code.');
    } finally {
      setIsResendingEmail(false);
    }
  };

  const copyValue = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="min-h-[100dvh] flex flex-col justify-center items-center px-4 sm:px-6 py-8 bg-white dark:bg-[#070D18] text-slate-900 dark:text-slate-100 transition-colors duration-200 relative">
      {isLoading && (
        <BaxatoLoader
          variant="fullscreen"
          className="fixed inset-0 z-[100] h-[100dvh] w-screen overflow-hidden"
        />
      )}

      <div className="w-full max-w-[400px] my-auto">
        <div className="flex flex-col items-center text-center mb-7">
          <div className="relative w-10 h-10 mb-3">
            <Image
              src="/baxato-mark.svg"
              alt="BAXATO"
              fill
              priority
              className="object-contain"
            />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white [text-wrap:balance]">
            {step === 'credentials'
              ? 'Staff Login'
              : step === '2fa_verify'
                ? 'Two-Factor Verification'
                : 'Set Up Two-Factor Security'}
          </h1>
          {step !== 'credentials' && (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {step === '2fa_verify'
                ? twoFactorPrompt
                : 'Choose a verification method for your staff account.'}
            </p>
          )}
        </div>

        {isSessionExpired && !errorMessage && (
          <div className="mb-4 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-200 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" aria-hidden="true" />
            <span>Your session expired. Sign in again to continue.</span>
          </div>
        )}

        {errorMessage && (
          <div className="mb-4 p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" aria-hidden="true" />
            <span>{errorMessage}</span>
          </div>
        )}

        {statusHint && (
          <div className="mb-4 text-center text-xs font-medium text-emerald-600 dark:text-emerald-400">
            {statusHint}
          </div>
        )}

        {step === 'credentials' && (
          <form onSubmit={handleCredentialsSubmit} noValidate className="space-y-4">
            <div>
              <label
                htmlFor="staff-email"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Staff Email
              </label>
              <input
                id="staff-email"
                type="email"
                required
                autoFocus
                autoComplete="username"
                placeholder="name@baxato.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={AUTH_INPUT_CLASS}
              />
            </div>

            <div>
              <label
                htmlFor="staff-password"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="staff-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${AUTH_INPUT_CLASS} pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-0 top-0 h-11 w-11 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <Eye className="w-4 h-4" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading || !email.trim() || !password}
              className={`${AUTH_PRIMARY_BUTTON_CLASS} mt-2`}
            >
              <span>Login</span>
            </button>
          </form>
        )}

        {step === '2fa_verify' && (
          <form onSubmit={handleVerify2FaSubmit} noValidate className="space-y-4">
            <div>
              <label
                htmlFor="staff-2fa-code"
                className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
              >
                6-Digit Code
              </label>
              <input
                id="staff-2fa-code"
                type="text"
                inputMode="numeric"
                required
                maxLength={6}
                placeholder="000000"
                autoFocus
                autoComplete="one-time-code"
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, ''))}
                className={`${AUTH_INPUT_CLASS} text-center text-lg font-mono tracking-[0.35em]`}
              />
            </div>

            {twoFactorMethod === 'EMAIL' && (
              <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                <span>Didn&apos;t receive a code?</span>
                {resendCountdown > 0 ? (
                  <span className="tabular-nums">Resend in {resendCountdown}s</span>
                ) : (
                  <button
                    type="button"
                    onClick={handleResendOtp}
                    disabled={isResendingEmail}
                    className="min-h-11 px-2 text-[#126BEB] dark:text-[#38BDF8] font-medium hover:underline disabled:opacity-50"
                  >
                    Send code
                  </button>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || twoFactorCode.length !== 6}
              className={AUTH_PRIMARY_BUTTON_CLASS}
            >
              <span>Verify</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setStep('credentials');
                setTwoFactorCode('');
                setErrorMessage(null);
              }}
              className="w-full min-h-11 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
            >
              Use another account
            </button>
          </form>
        )}

        {step === '2fa_setup' && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-1.5 p-1 rounded-lg border border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setSetupMethod('TOTP');
                  if (!totpSetupData) void initiateTotpSetup(tempToken);
                }}
                className={`min-h-10 px-3 rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
                  setupMethod === 'TOTP'
                    ? 'bg-[#126BEB] text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Authenticator</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSetupMethod('EMAIL');
                  void initiateEmailSetup();
                }}
                className={`min-h-10 px-3 rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
                  setupMethod === 'EMAIL'
                    ? 'bg-[#126BEB] text-white'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Mail className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Email</span>
              </button>
            </div>

            {isFetchingSetup ? (
              <BaxatoLoader variant="inline" className="py-6" />
            ) : (
              <>
                {setupMethod === 'TOTP' && (
                  <div className="space-y-3">
                    {totpSetupData?.qrCodeDataUrl && (
                      <div className="flex flex-col items-center p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white">
                        <img
                          src={totpSetupData.qrCodeDataUrl}
                          alt="Authenticator QR code"
                          className="w-36 h-36 object-contain"
                        />
                        <span className="text-[11px] text-slate-500 mt-2">
                          Scan with your authenticator app
                        </span>
                      </div>
                    )}

                    {totpSetupData?.secret && (
                      <div className="px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 text-xs font-mono">
                        <span className="truncate text-slate-700 dark:text-slate-300">
                          {totpSetupData.secret}
                        </span>
                        <button
                          type="button"
                          onClick={() => copyValue(totpSetupData.secret!, 'secret')}
                          aria-label="Copy setup key"
                          className="min-h-9 min-w-9 flex items-center justify-center rounded-md text-slate-500 hover:text-slate-900 dark:hover:text-white shrink-0"
                        >
                          {copiedKey === 'secret' ? (
                            <Check className="w-4 h-4 text-emerald-500" aria-hidden="true" />
                          ) : (
                            <Copy className="w-4 h-4" aria-hidden="true" />
                          )}
                        </button>
                      </div>
                    )}

                    {Array.isArray(totpSetupData?.backupCodes) && totpSetupData.backupCodes.length > 0 && (
                      <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            Recovery Codes
                          </span>
                          <button
                            type="button"
                            onClick={() => copyValue(totpSetupData.backupCodes!.join('\n'), 'backup')}
                            className="text-[#126BEB] dark:text-[#38BDF8] font-medium hover:underline flex items-center gap-1"
                          >
                            {copiedKey === 'backup' ? (
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
                          {totpSetupData.backupCodes.map((code) => (
                            <span key={code}>{code}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {setupMethod === 'EMAIL' && (
                  <p className="text-xs text-center text-slate-600 dark:text-slate-300 py-2">
                    Enter the 6-digit code sent to <strong className="font-semibold">{email}</strong>.
                  </p>
                )}
              </>
            )}

            <form onSubmit={handleCompleteSetup} noValidate className="space-y-3">
              <div>
                <label
                  htmlFor="staff-setup-code"
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5"
                >
                  Confirmation Code
                </label>
                <input
                  id="staff-setup-code"
                  type="text"
                  inputMode="numeric"
                  required
                  maxLength={6}
                  placeholder="000000"
                  value={setupCode}
                  onChange={(e) => setSetupCode(e.target.value.replace(/\D/g, ''))}
                  className={`${AUTH_INPUT_CLASS} text-center text-lg font-mono tracking-[0.35em]`}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || setupCode.length !== 6}
                className={AUTH_PRIMARY_BUTTON_CLASS}
              >
                <span>Confirm</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setStep('credentials');
                  setSetupCode('');
                  setErrorMessage(null);
                }}
                className="w-full min-h-11 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                Cancel
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
