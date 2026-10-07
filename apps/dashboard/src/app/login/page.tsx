'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  Building2,
  Lock,
  Headphones,
  Loader2,
  QrCode,
  Mail,
  RotateCw,
  ArrowLeft,
  CheckCircle2,
} from 'lucide-react';
import { useClerk } from '@clerk/nextjs';
import ThemeToggle from '@/components/ThemeToggle';

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
  const [loadingMessage, setLoadingMessage] = useState<string | null>(null);
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
        if (params.get('expired') === 'true') {
          setIsSessionExpired(true);
          try {
            localStorage.removeItem('bx_auth_token');
            localStorage.removeItem('bx_user');
            localStorage.removeItem('bx_business');
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
      setErrorMessage('Please enter both your work email and password.');
      return;
    }

    try {
      setIsSubmitting(true);
      setLoadingMessage('Authenticating credentials...');

      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          password,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        setIsSubmitting(false);
        setLoadingMessage(null);
        setErrorMessage(data?.error?.message || 'Invalid email or password.');
        return;
      }

      // Check if account has 2FA enabled
      if (data.data?.requiresTwoFactor) {
        setIsSubmitting(false);
        setLoadingMessage(null);
        setTwoFactorMethod(data.data.twoFactorMethod || 'TOTP');
        setTwoFactorEmail(data.data.email || cleanEmail);
        setTwoFactorCode('');
        setStep('2fa');
        if (data.data.twoFactorMethod === 'EMAIL') {
          setResendCountdown(60);
          setTwoFactorNotice(`A 6-digit verification code has been dispatched to ${data.data.email || cleanEmail}.`);
        }
        return;
      }

      // 2FA not required: proceed with login completion
      setLoadingMessage('Authentication successful! Loading dashboard...');
      await handleCompleteLogin(data.data);
    } catch {
      setIsSubmitting(false);
      setLoadingMessage(null);
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
          : 'Please enter the 6-digit verification code sent to your email.'
      );
      return;
    }

    try {
      setIsSubmitting(true);
      setLoadingMessage('Verifying authentication code...');
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
        setLoadingMessage(null);
        setErrorMessage(
          data?.error?.message || 'Invalid or expired two-factor authentication code. Please check and try again.'
        );
        setTwoFactorCode('');
        setTimeout(() => otpInputRef.current?.focus(), 150);
        return;
      }

      // 2FA Verified! Keep loading overlay visible while transitioning to dashboard
      setLoadingMessage('Authentication successful! Loading dashboard...');
      await handleCompleteLogin(data.data);
    } catch {
      setIsSubmitting(false);
      setLoadingMessage(null);
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
        setTwoFactorNotice(`A new 6-digit verification code was sent to ${twoFactorEmail || email}.`);
      } else {
        setErrorMessage(data?.error?.message || 'Failed to dispatch a new verification code.');
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
        // Persist standard session cookie
        document.cookie = `bx_auth_token=${encodeURIComponent(loginData.token)}; path=/; max-age=604800; SameSite=Lax`;
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

    // Hard navigation to ensure fresh session state across entire app and prevent lingering on login
    if (typeof window !== 'undefined') {
      window.location.assign('/dashboard');
    } else {
      router.push('/dashboard');
    }
  };

  const handleBackToCredentials = () => {
    setStep('credentials');
    setTwoFactorCode('');
    setErrorMessage(null);
    setTwoFactorNotice(null);
    setLoadingMessage(null);
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50 dark:bg-[#070D18] text-slate-800 dark:text-slate-200 transition-colors duration-200 relative overflow-x-hidden">
      {/* ======================================================== */}
      {/* IMMERSIVE CLEAN LOADING SCREEN (NO CARDS BLEEDING)       */}
      {/* ======================================================== */}
      <AnimatePresence>
        {isSubmitting && (
          <motion.div
            key="clean-loading-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white dark:bg-[#070D18] select-none h-[100dvh] w-screen overflow-hidden"
          >
            <div className="flex flex-col items-center justify-center p-6 text-center">
              {/* Circular spinning ring with BAXATO emblem */}
              <div className="relative w-20 h-20 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-[3px] border-slate-200 dark:border-white/10" />
                <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-[#126BEB] border-r-[#38BDF8] animate-spin" />
                <div className="relative w-11 h-11 rounded-full overflow-hidden shadow-md bg-white dark:bg-[#0A1324] p-1 flex items-center justify-center border border-slate-200 dark:border-slate-800">
                  <div className="relative w-full h-full">
                    <Image
                      src="/baxato-logo.jpg"
                      alt="BAXATO"
                      fill
                      priority
                      className="object-contain rounded-full"
                    />
                  </div>
                </div>
              </div>

              <p className="mt-4 text-xs font-semibold text-slate-800 dark:text-white tracking-wide">
                {loadingMessage ||
                  (step === 'credentials'
                    ? 'Authenticating credentials...'
                    : 'Verifying security credentials...')}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ======================================================== */}
      {/* LEFT SIDE: Brand Showcase with Theme-Aware Visuals (Desktop) */}
      {/* ======================================================== */}
      <section className="hidden lg:flex lg:w-1/2 bg-slate-100/80 dark:bg-[#060D1A] text-slate-900 dark:text-white p-12 xl:p-16 flex-col justify-between relative border-r border-slate-200 dark:border-slate-800/80">
        {/* Dark Mode ONLY 3D Glassmorphic Backdrop */}
        <div className="absolute inset-0 z-0 pointer-events-none hidden dark:block">
          <Image
            src="/fintech-bg.jpg"
            alt="BAXATO Fintech Infrastructure"
            fill
            priority
            className="object-cover opacity-35 mix-blend-luminosity scale-105"
          />
          {/* Subtle Deep Navy Gradient Sheen */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#060D18] via-[#060D18]/80 to-[#060D18]/50" />
        </div>

        {/* Light Mode Soft Ambient Gradient */}
        <div className="absolute inset-0 z-0 pointer-events-none dark:hidden bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-blue-100/60 via-slate-100/40 to-transparent" />

        {/* Top Logo */}
        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center gap-3 group">
            <div className="relative w-11 h-11 rounded-2xl overflow-hidden shadow-sm dark:shadow-xl border border-slate-200 dark:border-white/15 bg-white dark:bg-white/5 backdrop-blur-md group-hover:scale-105 transition-transform p-1">
              <Image
                src="/baxato-logo.jpg"
                alt="BAXATO Logo"
                fill
                priority
                className="object-contain"
              />
            </div>
            <span className="font-extrabold text-2xl tracking-tight text-slate-900 dark:text-white">
              BAXATO
            </span>
          </Link>
        </div>

        {/* Center: Commercial Showcase & Value Proposition */}
        <div className="relative z-10 max-w-lg my-10">
          <h2 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
            Empowering High-Growth Digital Commerce &amp; Payments Across Nigeria
          </h2>

          <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mt-4 font-normal">
            Access your merchant console to manage settlement accounts, track live vending volume, and generate production developer API keys.
          </p>

          {/* 4 Professional Commercial Value Pillars (Matching Register) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
            <div className="p-4 rounded-xl bg-white/90 dark:bg-white/[0.05] border border-slate-200/90 dark:border-white/10 shadow-sm dark:shadow-none backdrop-blur-md">
              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-[#126BEB]/25 text-[#126BEB] dark:text-[#38BDF8] flex items-center justify-center mb-2.5">
                <CreditCard className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">Instant Wallet Settlement</h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-normal font-normal">
                Commissions and funds credited immediately upon vending.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white/90 dark:bg-white/[0.05] border border-slate-200/90 dark:border-white/10 shadow-sm dark:shadow-none backdrop-blur-md">
              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-[#126BEB]/25 text-[#126BEB] dark:text-[#38BDF8] flex items-center justify-center mb-2.5">
                <Building2 className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">Nationwide Coverage</h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-normal font-normal">
                Direct integration with all Nigerian DISCOs and telecom operators.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white/90 dark:bg-white/[0.05] border border-slate-200/90 dark:border-white/10 shadow-sm dark:shadow-none backdrop-blur-md">
              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-[#126BEB]/25 text-[#126BEB] dark:text-[#38BDF8] flex items-center justify-center mb-2.5">
                <Lock className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">Bank-Grade Ledger</h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-normal font-normal">
                Transparent cryptographic accounting and financial auditing.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white/90 dark:bg-white/[0.05] border border-slate-200/90 dark:border-white/10 shadow-sm dark:shadow-none backdrop-blur-md">
              <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-[#126BEB]/25 text-[#126BEB] dark:text-[#38BDF8] flex items-center justify-center mb-2.5">
                <Headphones className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">Dedicated Support</h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-normal font-normal">
                24/7 technical and merchant onboarding assistance.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Legal Notice */}
        <div className="relative z-10 pt-6 border-t border-slate-200 dark:border-white/10 text-xs text-slate-500 dark:text-slate-400">
          <p>© 2026 XATO TECHNOLOGIES LIMITED. All rights reserved.</p>
        </div>
      </section>

      {/* ======================================================== */}
      {/* RIGHT SIDE: Authentication Surface                        */}
      {/* ======================================================== */}
      <section className="w-full lg:w-1/2 flex flex-col justify-center items-center px-4 py-8 sm:px-8 sm:py-12 lg:p-12 xl:p-16 relative z-10 pb-12 sm:pb-16">
        <div className="w-full max-w-lg mx-auto">
          {/* Top Header Bar: Mobile Branding + ThemeToggle */}
          <div className="flex items-center justify-between mb-8">
            <div className="lg:hidden flex items-center gap-3">
              <div className="relative w-11 h-11 rounded-2xl overflow-hidden shadow-md border border-slate-200 dark:border-white/10 bg-white dark:bg-white/10 p-1">
                <Image
                  src="/baxato-logo.jpg"
                  alt="BAXATO Logo"
                  fill
                  priority
                  className="object-contain"
                />
              </div>
              <span className="font-extrabold text-2xl tracking-tight text-slate-900 dark:text-white">
                BAXATO
              </span>
            </div>
            <div className="ml-auto">
              <ThemeToggle />
            </div>
          </div>

          <div className="w-full">
            <AnimatePresence mode="wait">
              {step === 'credentials' ? (
                /* ==================================================== */
                /* STEP 1: CREDENTIALS (EMAIL & PASSWORD)               */
                /* ==================================================== */
                <motion.div
                  key="step-credentials"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="w-full"
                >
                  {/* Centered & Polished Header */}
                  <div className="text-center mb-8">
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0B1220] dark:text-white">
                      Sign in to your account
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                      Access your BAXATO merchant operations console.
                    </p>
                  </div>

                  {/* Session Expired Banner */}
                  {isSessionExpired && !errorMessage && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-amber-800 dark:text-amber-200 text-xs font-semibold flex items-center gap-2.5 mb-6 shadow-xs"
                    >
                      <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                      <span>Your session has expired. Please sign in again to continue.</span>
                    </motion.div>
                  )}

                  {/* Error Banner */}
                  {errorMessage && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs font-medium flex items-center gap-2.5 mb-6"
                    >
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                      <span>{errorMessage}</span>
                    </motion.div>
                  )}

                  <form onSubmit={handleSubmitCredentials} noValidate className="space-y-4">
                    {/* Work Email Address */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                        Work / Business Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        autoFocus
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="alex@example.com"
                        className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-[#1E2D44] bg-white dark:bg-[#0D1726] text-base sm:text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#126BEB] dark:focus:border-[#1677FF] transition-colors"
                      />
                    </div>

                    {/* Password Field with Eye Toggle */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                        Password <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••••••"
                          className="w-full px-4 py-3 pr-10 rounded-xl border-2 border-slate-200 dark:border-[#1E2D44] bg-white dark:bg-[#0D1726] text-base sm:text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#126BEB] dark:focus:border-[#1677FF] transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={isSubmitting || !email.trim() || !password}
                        className="w-full py-3.5 px-6 rounded-xl bg-[#126BEB] hover:bg-[#0B5CC7] text-white font-semibold text-sm transition-all shadow-md shadow-blue-500/20 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                            <span>Signing In...</span>
                          </>
                        ) : (
                          <>
                            <span>Sign In to Merchant Console</span>
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </div>
                  </form>

                  {/* Bottom Register Link */}
                  <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 text-center">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Don&apos;t have a BAXATO merchant account?{' '}
                      <Link
                        href="/register"
                        className="text-[#126BEB] dark:text-[#38BDF8] font-semibold hover:underline"
                      >
                        Create Account
                      </Link>
                    </p>
                  </div>
                </motion.div>
              ) : (
                /* ==================================================== */
                /* STEP 2: TWO-FACTOR AUTHENTICATION CHALLENGE          */
                /* ==================================================== */
                <motion.div
                  key="step-2fa"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="w-full"
                >
                  {/* 2FA Header with Method Icon */}
                  <div className="text-center mb-6">
                    <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-[#126BEB] dark:text-[#38BDF8] border border-blue-200/60 dark:border-blue-900/40 flex items-center justify-center mx-auto mb-4 shadow-sm">
                      {twoFactorMethod === 'TOTP' ? (
                        <QrCode className="w-7 h-7" />
                      ) : (
                        <Mail className="w-7 h-7" />
                      )}
                    </div>

                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0B1220] dark:text-white">
                      Two-Factor Authentication
                    </h1>

                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed max-w-sm mx-auto">
                      {twoFactorMethod === 'TOTP' ? (
                        <span>
                          Enter the 6-digit code from your authenticator app, or use an 8-character recovery backup code.
                        </span>
                      ) : (
                        <span>
                          Enter the 6-digit confirmation code sent to{' '}
                          <strong className="text-slate-800 dark:text-white font-semibold">
                            {twoFactorEmail || email}
                          </strong>
                          .
                        </span>
                      )}
                    </p>
                  </div>

                  {/* Notice Banner */}
                  {twoFactorNotice && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 text-[#126BEB] dark:text-[#38BDF8] text-xs font-semibold flex items-center gap-2.5 mb-6"
                    >
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-[#126BEB]" />
                      <span>{twoFactorNotice}</span>
                    </motion.div>
                  )}

                  {/* Error Banner */}
                  {errorMessage && (
                    <motion.div
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs font-medium flex items-center gap-2.5 mb-6"
                    >
                      <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                      <span>{errorMessage}</span>
                    </motion.div>
                  )}

                  <form onSubmit={handleSubmitTwoFactor} noValidate className="space-y-4">
                    {/* Security Code Input */}
                    <div>
                      <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-2 text-center">
                        {twoFactorMethod === 'TOTP' ? 'Authenticator or Backup Code' : 'Verification Code'}
                      </label>
                      <input
                        ref={otpInputRef}
                        type="text"
                        required
                        maxLength={8}
                        autoComplete="one-time-code"
                        placeholder="••••••"
                        value={twoFactorCode}
                        onChange={(e) => handleOtpChange(e.target.value)}
                        disabled={isSubmitting}
                        className="w-full px-4 py-3.5 rounded-xl border-2 border-slate-200 dark:border-[#1E2D44] bg-white dark:bg-[#0D1726] text-center font-mono text-xl sm:text-2xl tracking-[0.35em] font-bold text-slate-900 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:outline-none focus:border-[#126BEB] dark:focus:border-[#1677FF] transition-colors disabled:opacity-60"
                      />
                    </div>

                    {/* Email Resend Timer or Authenticator Helper */}
                    {twoFactorMethod === 'EMAIL' ? (
                      <div className="flex items-center justify-between pt-1 px-1 text-xs text-slate-500 dark:text-slate-400">
                        <span>Didn&apos;t receive code?</span>
                        {resendCountdown > 0 ? (
                          <span className="font-medium text-slate-600 dark:text-slate-300">
                            Resend in <strong className="font-semibold">{resendCountdown}s</strong>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={handleResendEmailOtp}
                            disabled={isResendingOtp}
                            className="text-[#126BEB] dark:text-[#38BDF8] font-semibold hover:underline inline-flex items-center gap-1.5 disabled:opacity-50"
                          >
                            <RotateCw className={`w-3.5 h-3.5 ${isResendingOtp ? 'animate-spin' : ''}`} />
                            <span>Resend code</span>
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="pt-1 text-center">
                        <p className="text-[11px] text-slate-400">
                          Lost access to your authenticator app? Enter an 8-character recovery backup code above.
                        </p>
                      </div>
                    )}

                    {/* Submit Button */}
                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={isSubmitting || !twoFactorCode.trim()}
                        className="w-full py-3.5 px-6 rounded-xl bg-[#126BEB] hover:bg-[#0B5CC7] text-white font-semibold text-sm transition-all shadow-md shadow-blue-500/20 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        {isSubmitting ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                            <span>Verifying Security Code...</span>
                          </>
                        ) : (
                          <>
                            <span>Verify &amp; Sign In</span>
                            <ArrowRight className="w-4 h-4" />
                          </>
                        )}
                      </button>
                    </div>

                    {/* Back to Credentials Button */}
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={handleBackToCredentials}
                        className="w-full py-2.5 px-4 rounded-lg text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center justify-center gap-1.5"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Sign in with another account</span>
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>
    </div>
  );
}
