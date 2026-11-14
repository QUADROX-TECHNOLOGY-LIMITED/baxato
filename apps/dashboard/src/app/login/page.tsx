'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  RotateCw,
  CheckCircle2,
} from 'lucide-react';
import { useClerk } from '@clerk/nextjs';
import AuthShell, {
  AUTH_INPUT_CLASS,
  AUTH_PRIMARY_BUTTON_CLASS,
} from '@/components/auth/AuthShell';

type LoginStep = 'credentials' | '2fa';

export default function LoginPage() {
  const router = useRouter();
  const clerk = useClerk();

  const [step, setStep] = useState<LoginStep>('credentials');

  // Step 1: Credentials
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSessionExpired, setIsSessionExpired] = useState(false);

  // Step 2: Two-Factor Authentication
  const [twoFactorMethod, setTwoFactorMethod] = useState<'TOTP' | 'EMAIL'>('TOTP');
  const [twoFactorEmail, setTwoFactorEmail] = useState('');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorNotice, setTwoFactorNotice] = useState<string | null>(null);
  const [isResendingOtp, setIsResendingOtp] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  const otpInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus OTP input when switching to 2FA step
  useEffect(() => {
    if (step === '2fa') {
      setTimeout(() => {
        otpInputRef.current?.focus();
      }, 150);
    }
  }, [step]);

  // Resend countdown timer
  useEffect(() => {
    if (resendCountdown > 0) {
      const timer = setTimeout(() => setResendCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCountdown]);

  // Check for expired session query param
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

  // Step 1: Handle Submit Credentials
  const handleSubmitCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setTwoFactorNotice(null);

    const cleanEmail = email.toLowerCase().trim();
    if (!cleanEmail || !password) {
      setErrorMessage('Please enter both your email and password.');
      return;
    }

    try {
      setIsSubmitting(true);

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          password: password.trim(),
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        setIsSubmitting(false);
        setErrorMessage(data?.error?.message || 'Invalid email or password.');
        return;
      }

      // Check if account has 2FA enabled
      if (data.data?.requiresTwoFactor) {
        setIsSubmitting(false);
        setTwoFactorMethod(data.data.twoFactorMethod || 'TOTP');
        setTwoFactorEmail(data.data.email || cleanEmail);
        setTwoFactorCode('');
        setStep('2fa');
        if (data.data.twoFactorMethod === 'EMAIL') {
          setResendCountdown(60);
          setTwoFactorNotice(
            `A 6-digit code has been sent to ${data.data.email || cleanEmail}.`
          );
        }
        return;
      }

      // 2FA not required: proceed with login completion
      await handleCompleteLogin(data.data);
    } catch {
      setIsSubmitting(false);
      setErrorMessage('Network error connecting to authentication service. Please try again.');
    }
  };

  // Step 2: Handle Submit Two-Factor Authentication Code
  const executeTwoFactorVerification = async (codeToVerify?: string) => {
    const cleanCode = (codeToVerify !== undefined ? codeToVerify : twoFactorCode).trim();
    if (!cleanCode) {
      setErrorMessage(
        twoFactorMethod === 'TOTP'
          ? 'Please enter the 6-digit authenticator code or 8-character recovery code.'
          : 'Please enter the 6-digit code sent to your email.'
      );
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);
      setTwoFactorNotice(null);

      const res = await fetch('/api/auth/login', {
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
        setIsSubmitting(false);
        setErrorMessage(
          data?.error?.message ||
            'Invalid or expired two-factor authentication code. Please try again.'
        );
        setTwoFactorCode('');
        setTimeout(() => otpInputRef.current?.focus(), 150);
        return;
      }

      await handleCompleteLogin(data.data);
    } catch {
      setIsSubmitting(false);
      setErrorMessage('Network error verifying authentication code. Please try again.');
    }
  };

  const handleSubmitTwoFactor = async (e: React.FormEvent) => {
    e.preventDefault();
    await executeTwoFactorVerification();
  };

  const handleOtpChange = (val: string) => {
    const clean = val.replace(/\s+/g, '');
    setTwoFactorCode(clean);
    setErrorMessage(null);

    // Automatically submit once full code is typed/pasted (6 digits for Email/TOTP, 8 for backup code)
    if (clean.length === 6 && /^\d{6}$/.test(clean)) {
      executeTwoFactorVerification(clean);
    } else if (twoFactorMethod === 'TOTP' && clean.length === 8) {
      executeTwoFactorVerification(clean);
    }
  };

  // Resend Email OTP
  const handleResendEmailOtp = async () => {
    if (resendCountdown > 0 || isResendingOtp) return;
    setErrorMessage(null);
    setTwoFactorNotice(null);

    try {
      setIsResendingOtp(true);
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.toLowerCase().trim(),
          password,
        }),
      });

      const data = await res.json().catch(() => null);
      if (res.ok && data?.success && data?.data?.requiresTwoFactor) {
        setResendCountdown(60);
        setTwoFactorNotice(
          `A 6-digit code has been sent to ${twoFactorEmail || email}.`
        );
      } else {
        setErrorMessage(data?.error?.message || 'Failed to send a new verification code.');
      }
    } catch {
      setErrorMessage('Network error requesting a new verification code.');
    } finally {
      setIsResendingOtp(false);
    }
  };

  // Common Login Completion Logic
  const handleCompleteLogin = async (loginData: any) => {
    if (loginData?.token) {
      try {
        localStorage.setItem('bx_auth_token', loginData.token);
        document.cookie = `bx_auth_token=${encodeURIComponent(
          loginData.token
        )}; path=/; max-age=604800; SameSite=Lax`;
        if (loginData.user) {
          localStorage.setItem('bx_user', JSON.stringify(loginData.user));
        }
        if (loginData.business) {
          localStorage.setItem('bx_business', JSON.stringify(loginData.business));
        }
      } catch {}
    }

    // Optional non-blocking Clerk session sync if configured
    try {
      if (clerk.loaded && clerk.client) {
        const syncPromise = clerk.client.signIn
          .create({
            identifier: email.toLowerCase().trim(),
            password,
          })
          .then(async (signInResult) => {
            if (signInResult.status === 'complete' && signInResult.createdSessionId) {
              await clerk.setActive({ session: signInResult.createdSessionId });
            }
          })
          .catch((err) => {
            console.warn('Clerk background sync error:', err);
          });

        // Limit Clerk sync wait to max 500ms so dashboard redirection is immediate
        await Promise.race([
          syncPromise,
          new Promise((resolve) => setTimeout(resolve, 500)),
        ]);
      }
    } catch (clerkErr) {
      console.warn('Clerk session sync skipped (backend authenticated):', clerkErr);
    }

    const targetUrl = '/dashboard';

    // Hard navigation to ensure fresh session state across entire app and prevent lingering on login
    if (typeof window !== 'undefined') {
      window.location.assign(targetUrl);
    } else {
      router.push(targetUrl);
    }
  };

  const handleBackToCredentials = () => {
    setStep('credentials');
    setTwoFactorCode('');
    setErrorMessage(null);
    setTwoFactorNotice(null);
    setIsSubmitting(false);
  };

  return (
    <AuthShell isLoading={isSubmitting} maxWidthClass="max-w-[400px]">
      <AnimatePresence mode="wait">
        {step === 'credentials' ? (
          <motion.div
            key="step-credentials"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="w-full"
          >
            <div className="mb-7 text-center">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
                Login
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">
                Enter your email and password to continue.
              </p>
            </div>

            {isSessionExpired && !errorMessage && (
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-200 text-xs font-medium flex items-center gap-2.5 mb-5">
                <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Your session has expired. Please login again.</span>
              </div>
            )}

            {errorMessage && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs font-medium flex items-center gap-2.5 mb-5">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmitCredentials} noValidate className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  className={AUTH_INPUT_CLASS}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`${AUTH_INPUT_CLASS} pr-10`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-1">
                <button
                  type="submit"
                  disabled={isSubmitting || !email.trim() || !password}
                  className={AUTH_PRIMARY_BUTTON_CLASS}
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Login'}
                </button>
              </div>
            </form>

            <div className="mt-7 pt-5 border-t border-slate-200/80 dark:border-slate-800 text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Don&apos;t have an account?{' '}
                <Link
                  href="/register"
                  className="text-[#126BEB] dark:text-[#38BDF8] font-medium hover:underline"
                >
                  Create account
                </Link>
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="step-2fa"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="w-full"
          >
            <div className="text-center mb-6">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
                Two-factor authentication
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
                {twoFactorMethod === 'TOTP' ? (
                  'Enter the 6-digit code from your authenticator app or an 8-character recovery code.'
                ) : (
                  <>
                    Enter the 6-digit code sent to{' '}
                    <span className="text-slate-800 dark:text-slate-200 font-medium">
                      {twoFactorEmail || email}
                    </span>
                    .
                  </>
                )}
              </p>
            </div>

            {twoFactorNotice && (
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 text-[#126BEB] dark:text-[#38BDF8] text-xs font-medium flex items-center gap-2.5 mb-5">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{twoFactorNotice}</span>
              </div>
            )}

            {errorMessage && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs font-medium flex items-center gap-2.5 mb-5">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmitTwoFactor} noValidate className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5 text-center">
                  Verification code
                </label>
                <input
                  ref={otpInputRef}
                  type="text"
                  required
                  maxLength={8}
                  autoComplete="one-time-code"
                  inputMode={twoFactorMethod === 'EMAIL' ? 'numeric' : 'text'}
                  placeholder="000000"
                  value={twoFactorCode}
                  onChange={(e) => handleOtpChange(e.target.value)}
                  disabled={isSubmitting}
                  className="w-full h-12 px-4 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0D1726] text-center font-mono text-lg tracking-[0.3em] font-semibold text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:outline-none focus:border-[#126BEB] focus:ring-2 focus:ring-[#126BEB]/15 dark:focus:border-[#38BDF8] dark:focus:ring-[#38BDF8]/15 transition-colors disabled:opacity-60"
                />
              </div>

              {twoFactorMethod === 'EMAIL' && (
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>Didn&apos;t receive code?</span>
                  {resendCountdown > 0 ? (
                    <span>
                      Resend in <strong className="font-medium text-slate-700 dark:text-slate-200">{resendCountdown}s</strong>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResendEmailOtp}
                      disabled={isResendingOtp}
                      className="text-[#126BEB] dark:text-[#38BDF8] font-medium hover:underline inline-flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <RotateCw className={`w-3.5 h-3.5 ${isResendingOtp ? 'animate-spin' : ''}`} />
                      <span>Resend code</span>
                    </button>
                  )}
                </div>
              )}

              <div className="pt-1">
                <button
                  type="submit"
                  disabled={isSubmitting || !twoFactorCode.trim()}
                  className={AUTH_PRIMARY_BUTTON_CLASS}
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify'}
                </button>
              </div>

              <button
                type="button"
                onClick={handleBackToCredentials}
                className="w-full py-2 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                Use another account
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </AuthShell>
  );
}
