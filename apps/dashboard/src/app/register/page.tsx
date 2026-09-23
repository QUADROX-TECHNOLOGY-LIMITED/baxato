'use client';

import { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Check,
  CreditCard,
  Building2,
  Lock,
  Headphones,
  Edit2,
  RotateCw,
  Loader2,
} from 'lucide-react';
import { nigeriaStates, nigeriaStatesList } from '@baxato/common';
import SearchableSelect from '@/components/SearchableSelect';
import { useClerk } from '@clerk/nextjs';

interface RegisterFormContentProps {
  onSendEmailOtp: (email: string, password?: string, firstName?: string, lastName?: string) => Promise<void>;
  onVerifyEmailOtp: (code: string) => Promise<void>;
  onCompleteSignUp: (password: string, firstName: string, lastName: string) => Promise<string | null>;
}

function getClerkErrorMessage(err: unknown): string {
  if (!err) return 'An error occurred during authentication.';
  const clerkErr = err as { errors?: Array<{ message?: string; longMessage?: string }> };
  if (Array.isArray(clerkErr.errors) && clerkErr.errors.length > 0) {
    return clerkErr.errors[0].longMessage || clerkErr.errors[0].message || 'Authentication error';
  }
  if (err instanceof Error) return err.message;
  return String(err);
}

function RegisterFormContent({
  onSendEmailOtp,
  onVerifyEmailOtp,
  onCompleteSignUp,
}: RegisterFormContentProps) {

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    businessName: '',
    country: 'NG',
    state: '',
    lga: '',
    password: '',
    confirmPassword: '',
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);

  // Email In-Flow Verification States
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailOtp, setEmailOtp] = useState('');
  const [isSendingEmailOtp, setIsSendingEmailOtp] = useState(false);
  const [isVerifyingEmailOtp, setIsVerifyingEmailOtp] = useState(false);
  const [emailOtpError, setEmailOtpError] = useState<string | null>(null);
  const [emailCountdown, setEmailCountdown] = useState(0);

  // Email countdown timer
  useEffect(() => {
    if (emailCountdown > 0) {
      const timer = setTimeout(() => setEmailCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [emailCountdown]);

  // Available LGAs dynamically filtered by the selected State
  const availableLgas = useMemo(() => {
    if (!formData.state) return [];
    return nigeriaStates[formData.state] || [];
  }, [formData.state]);

  const handleStateChange = (state: string) => {
    setFormData((prev) => ({
      ...prev,
      state,
      lga: '', // Reset LGA when state changes
    }));
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = e.target.value.replace(/\D/g, '').slice(0, 11);
    setFormData((prev) => ({ ...prev, phoneNumber: cleaned }));
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, email: e.target.value }));
    if (isEmailVerified) {
      setIsEmailVerified(false);
      setEmailOtpSent(false);
    }
  };

  // Live Password Criteria Checklist
  const passwordCriteria = useMemo(() => {
    const pwd = formData.password;
    return {
      minLength: pwd.length >= 8,
      hasUpperLower: /[A-Z]/.test(pwd) && /[a-z]/.test(pwd),
      hasNumber: /\d/.test(pwd),
      hasSpecial: /[^A-Za-z0-9]/.test(pwd),
    };
  }, [formData.password]);

  const isPasswordSecure = useMemo(() => {
    return (
      passwordCriteria.minLength &&
      passwordCriteria.hasUpperLower &&
      (passwordCriteria.hasNumber || passwordCriteria.hasSpecial)
    );
  }, [passwordCriteria]);

  const isValidEmail = useMemo(() => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email);
  }, [formData.email]);

  const passwordsMatch = useMemo(() => {
    if (!formData.confirmPassword) return null;
    return formData.password === formData.confirmPassword;
  }, [formData.password, formData.confirmPassword]);

  // Email verification trigger (via Clerk Pro)
  const handleSendEmailOtp = async () => {
    setEmailOtpError(null);
    if (!formData.email.trim() || !isValidEmail) {
      setEmailOtpError('Enter a valid email address first.');
      return;
    }

    setIsSendingEmailOtp(true);
    try {
      await onSendEmailOtp(
        formData.email.toLowerCase().trim(),
        formData.password || undefined,
        formData.firstName.trim() || undefined,
        formData.lastName.trim() || undefined,
      );
      setEmailOtpSent(true);
      setEmailCountdown(60);
      setEmailOtp(''); // Field remains strictly empty for user entry
    } catch (err: unknown) {
      setEmailOtpError(getClerkErrorMessage(err));
    } finally {
      setIsSendingEmailOtp(false);
    }
  };

  // Email OTP verification confirm (via Clerk Pro)
  const handleVerifyEmailOtp = async () => {
    setEmailOtpError(null);
    if (emailOtp.trim().length < 6) {
      setEmailOtpError('Please enter the full 6-digit verification code.');
      return;
    }

    setIsVerifyingEmailOtp(true);
    try {
      await onVerifyEmailOtp(emailOtp.trim());
      setIsEmailVerified(true);
      setEmailOtpSent(false);
      setEmailOtp('');
    } catch (err: unknown) {
      setEmailOtpError(getClerkErrorMessage(err));
    } finally {
      setIsVerifyingEmailOtp(false);
    }
  };


  const isFormValid = useMemo(() => {
    return (
      formData.firstName.trim().length > 0 &&
      formData.lastName.trim().length > 0 &&
      isEmailVerified &&
      formData.phoneNumber.length >= 10 &&
      formData.businessName.trim().length > 0 &&
      formData.state.length > 0 &&
      formData.lga.length > 0 &&
      isPasswordSecure &&
      passwordsMatch === true
    );
  }, [formData, isEmailVerified, isPasswordSecure, passwordsMatch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!isEmailVerified) {
      setErrorMessage('Please verify your email address before creating an account.');
      return;
    }

    if (!isPasswordSecure) {
      setErrorMessage('Please satisfy all password security requirements.');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Finalize Clerk authentication & retrieve Clerk User ID
      const clerkUserId = await onCompleteSignUp(
        formData.password,
        formData.firstName.trim(),
        formData.lastName.trim(),
      );

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clerkId: clerkUserId || undefined,
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          email: formData.email.toLowerCase().trim(),
          phoneNumber: formData.phoneNumber,
          businessName: formData.businessName.trim(),
          country: formData.country,
          state: formData.state,
          lga: formData.lga,
          password: formData.password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error?.message || result.message || 'Registration failed. Please check your details.'
        );
      }

      setIsRegistered(true);
    } catch (err: unknown) {
      setErrorMessage(getClerkErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50 dark:bg-[#070D18] text-slate-800 dark:text-slate-200 transition-colors duration-200">
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

        {/* Light Mode Soft Ambient Gradient (No Dark Image) */}
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
            Join thousands of businesses, merchants, and aggregators vending airtime, data bundles, electricity tokens, and cable subscriptions with instant automated reconciliation.
          </p>

          {/* 4 Professional Commercial Value Pillars */}
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
      {/* RIGHT SIDE: Authentication / Registration Surface        */}
      {/* ======================================================== */}
      <section className="w-full lg:w-1/2 flex flex-col justify-center items-center px-4 py-8 sm:px-8 sm:py-12 lg:p-12 xl:p-16 relative z-10 pb-28 sm:pb-36">
        <div className="w-full max-w-lg mx-auto">
          {/* Mobile Top Branding */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-6">
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

          {/* Seamless Registration Surface (No redundant card-on-card) */}
          <div className="w-full">

          <AnimatePresence mode="wait">
            {isRegistered ? (
              /* ==================================================== */
              /* SUCCESS CONFIRMATION                                 */
              /* ==================================================== */
              <motion.div
                key="success-screen"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="text-center py-6"
              >
                <div className="w-16 h-16 bg-blue-50 dark:bg-blue-950/40 text-[#126BEB] rounded-2xl flex items-center justify-center mx-auto mb-6 border border-blue-100 dark:border-blue-900/50 shadow-sm">
                  <CheckCircle2 className="w-9 h-9" />
                </div>

                <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0B1220] dark:text-white tracking-tight mb-2">
                  Account Provisioned
                </h2>

                <p className="text-sm text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
                  Your merchant enterprise account for{' '}
                  <strong className="text-[#0B1220] dark:text-white font-bold">{formData.businessName}</strong> has been
                  initialized successfully.
                </p>

                <div className="bg-slate-50 dark:bg-[#0D1726] border border-slate-200 dark:border-[#1E2D44] rounded-xl p-4 text-xs text-slate-600 dark:text-slate-300 mb-8 text-left flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-[#126BEB] shrink-0 mt-0.5" />
                  <span>
                    Your settlement wallet and commission ledger have been initialized. You can now proceed to log in to your merchant console.
                  </span>
                </div>

                <Link
                  href="/login"
                  className="w-full inline-flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-[#126BEB] hover:bg-[#0B5CC7] text-white font-semibold text-sm transition-all shadow-md shadow-blue-500/20 active:scale-[0.99]"
                >
                  Proceed to Sign In
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </motion.div>
            ) : (
              /* ==================================================== */
              /* SEAMLESS REGISTRATION SURFACE (NO CARD ON CARD)      */
              /* ==================================================== */
              <motion.div
                key="form-screen"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="w-full"
              >
                {/* Centered & Polished Header */}
                <div className="text-center mb-8">
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0B1220] dark:text-white">
                    Create your account
                  </h1>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                    Start vending telecom and utility services with BAXATO.
                  </p>
                </div>

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

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Name Fields: First & Last Name */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                        First Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="John"
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-[#1E2D44] bg-white dark:bg-[#0D1726] text-base sm:text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#126BEB] dark:focus:border-[#1677FF] transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                        Last Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Doe"
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-[#1E2D44] bg-white dark:bg-[#0D1726] text-base sm:text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#126BEB] dark:focus:border-[#1677FF] transition-colors"
                      />
                    </div>
                  </div>

                  {/* Work Email with In-Flow Verification */}
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        Work / Business Email <span className="text-red-500">*</span>
                      </label>
                      {isEmailVerified && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          <Check className="w-3.5 h-3.5" /> Verified
                        </span>
                      )}
                    </div>

                    <div className="relative flex items-center">
                      <input
                        type="email"
                        required
                        disabled={isEmailVerified}
                        placeholder="alex@example.com"
                        value={formData.email}
                        onChange={handleEmailChange}
                        className={`w-full px-4 py-3 pr-28 rounded-xl border-2 text-base sm:text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none transition-colors ${
                          isEmailVerified
                            ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/60'
                            : formData.email && !isValidEmail
                            ? 'border-red-300 dark:border-red-800/60 focus:border-red-500'
                            : 'border-slate-200 dark:border-[#1E2D44] bg-white dark:bg-[#0D1726] focus:border-[#126BEB] dark:focus:border-[#1677FF]'
                        }`}
                      />
                      {!isEmailVerified ? (
                        <button
                          type="button"
                          onClick={handleSendEmailOtp}
                          disabled={isSendingEmailOtp || !isValidEmail}
                          className="absolute right-2 h-8 px-3 rounded-lg bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-[#126BEB] dark:text-[#38BDF8] text-xs font-semibold transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          {isSendingEmailOtp ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0 text-[#126BEB] dark:text-[#38BDF8]" />
                              <span>Sending...</span>
                            </>
                          ) : (
                            <span>Verify</span>
                          )}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setIsEmailVerified(false);
                            setEmailOtpSent(false);
                          }}
                          className="absolute right-2.5 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-medium flex items-center gap-1"
                          title="Change email"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                      )}
                    </div>

                    {emailOtpError && !emailOtpSent && (
                      <p className="text-[11px] text-red-500 font-medium mt-1.5 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>{emailOtpError}</span>
                      </p>
                    )}

                    {/* Compact Streamlined OTP Verification Card */}
                    <AnimatePresence>
                      {emailOtpSent && !isEmailVerified && (
                        <motion.div
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          className="mt-2.5 p-3 sm:p-3.5 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/80 dark:border-blue-900/50"
                        >
                          <div className="flex items-center justify-between text-xs mb-2">
                            <span className="text-slate-600 dark:text-slate-300 truncate mr-2 text-[11px] sm:text-xs">
                              Code sent to <strong className="text-slate-800 dark:text-white font-semibold">{formData.email}</strong>
                            </span>
                            <button
                              type="button"
                              onClick={() => setEmailOtpSent(false)}
                              className="text-[#126BEB] dark:text-[#38BDF8] text-[11px] font-medium hover:underline shrink-0"
                            >
                              Cancel
                            </button>
                          </div>

                          {/* Inline Input & Guaranteed Visible Confirm Button */}
                          <div className="flex items-center gap-2 w-full">
                            <input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              autoComplete="one-time-code"
                              maxLength={6}
                              placeholder="6-digit code"
                              value={emailOtp}
                              onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, ''))}
                              className="min-w-0 flex-1 h-10 px-3 text-center tracking-[0.25em] font-mono text-base font-bold bg-white dark:bg-[#070D18] border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-[#126BEB] focus:ring-1 focus:ring-[#126BEB] transition-colors"
                            />
                            <button
                              type="button"
                              onClick={handleVerifyEmailOtp}
                              disabled={isVerifyingEmailOtp || emailOtp.length < 6}
                              className="shrink-0 h-10 px-4 rounded-lg bg-[#126BEB] hover:bg-[#0B5CC7] active:bg-[#094bb5] text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm min-w-[85px]"
                            >
                              {isVerifyingEmailOtp ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                                  <span>Checking</span>
                                </>
                              ) : (
                                <>
                                  <Check className="w-3.5 h-3.5 shrink-0" />
                                  <span>Confirm</span>
                                </>
                              )}
                            </button>
                          </div>

                          {emailOtpError && (
                            <p className="text-[11px] text-red-500 font-medium mt-1.5 flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                              <span>{emailOtpError}</span>
                            </p>
                          )}

                          <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-blue-100/80 dark:border-blue-900/30 text-[11px] text-slate-500 dark:text-slate-400">
                            <span>
                              {emailCountdown > 0 ? (
                                <>Resend in <strong className="text-slate-700 dark:text-slate-300 font-semibold">{emailCountdown}s</strong></>
                              ) : (
                                <button
                                  type="button"
                                  onClick={handleSendEmailOtp}
                                  disabled={isSendingEmailOtp}
                                  className="text-[#126BEB] dark:text-[#38BDF8] font-semibold hover:underline inline-flex items-center gap-1 disabled:opacity-40"
                                >
                                  <RotateCw className={`w-3 h-3 ${isSendingEmailOtp ? 'animate-spin' : ''}`} />
                                  <span>Resend code</span>
                                </button>
                              )}
                            </span>
                            <span className="text-[10px] text-slate-400">Check spam folder</span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* WhatsApp Phone Number */}
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        WhatsApp Phone Number <span className="text-red-500">*</span>
                      </label>
                      {formData.phoneNumber.length >= 10 && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          <Check className="w-3.5 h-3.5" /> Valid
                        </span>
                      )}
                    </div>

                    <div className="relative flex items-center">
                      <div className="absolute left-3.5 pointer-events-none text-slate-500 dark:text-slate-400 text-sm font-medium flex items-center gap-1.5 border-r border-slate-200 dark:border-slate-700 pr-2.5 z-10">
                        <span>🇳🇬</span>
                        <span>+234</span>
                      </div>
                      <input
                        type="tel"
                        required
                        maxLength={11}
                        placeholder="08012345678"
                        value={formData.phoneNumber}
                        onChange={handlePhoneChange}
                        className={`w-full pl-24 pr-4 py-3 rounded-xl border-2 text-base sm:text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none transition-colors ${
                          formData.phoneNumber.length >= 10
                            ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/60'
                            : 'border-slate-200 dark:border-[#1E2D44] bg-white dark:bg-[#0D1726] focus:border-[#126BEB] dark:focus:border-[#1677FF]'
                        }`}
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1.5">
                      Official Nigerian merchant contact for transaction notices and emergency support.
                    </p>
                  </div>

                  {/* Business Name */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                      Business or Enterprise Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Apex Telecom Limited"
                      value={formData.businessName}
                      onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 dark:border-[#1E2D44] bg-white dark:bg-[#0D1726] text-base sm:text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#126BEB] dark:focus:border-[#1677FF] transition-colors"
                    />
                  </div>

                  {/* State & LGA */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                        State <span className="text-red-500">*</span>
                      </label>
                      <SearchableSelect
                        id="state-select"
                        options={nigeriaStatesList}
                        placeholder="Select State"
                        value={formData.state}
                        onChange={handleStateChange}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                        LGA / City <span className="text-red-500">*</span>
                      </label>
                      <SearchableSelect
                        id="lga-select"
                        options={availableLgas}
                        placeholder={formData.state ? 'Select LGA' : 'Select State first'}
                        value={formData.lga}
                        onChange={(lga) => setFormData({ ...formData, lga })}
                        disabled={!formData.state}
                      />
                    </div>
                  </div>

                  {/* Password & Confirm Password */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                        Password <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          placeholder="Min 8 characters"
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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

                    <div>
                      <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                        Confirm Password <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          required
                          placeholder="Re-enter password"
                          value={formData.confirmPassword}
                          onChange={(e) =>
                            setFormData({ ...formData, confirmPassword: e.target.value })
                          }
                          className={`w-full px-4 py-3 pr-10 rounded-xl border-2 bg-white dark:bg-[#0D1726] text-base sm:text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none transition-colors ${
                            passwordsMatch === false
                              ? 'border-red-300 dark:border-red-800 focus:border-red-500'
                              : 'border-slate-200 dark:border-[#1E2D44] focus:border-[#126BEB] dark:focus:border-[#1677FF]'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>

                      {/* Direct inline match feedback */}
                      {passwordsMatch === true && (
                        <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mt-1">
                          <Check className="w-3.5 h-3.5" />
                          <span>Passwords match</span>
                        </p>
                      )}
                      {passwordsMatch === false && (
                        <p className="text-[11px] font-medium text-red-500 dark:text-red-400 flex items-center gap-1 mt-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Passwords do not match</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Password Security Checklist (Live Checklist Indicator) */}
                  {formData.password && (
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#0A1220] border border-slate-200 dark:border-[#1E2D44] space-y-1.5 mt-2">
                      <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Password Requirements
                      </p>
                      <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                        <div
                          className={`flex items-center gap-1.5 ${
                            passwordCriteria.minLength
                              ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                              : 'text-slate-400 dark:text-slate-500'
                          }`}
                        >
                          <span className="w-3.5 text-center font-bold">
                            {passwordCriteria.minLength ? '✓' : '○'}
                          </span>
                          <span>At least 8 chars</span>
                        </div>

                        <div
                          className={`flex items-center gap-1.5 ${
                            passwordCriteria.hasUpperLower
                              ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                              : 'text-slate-400 dark:text-slate-500'
                          }`}
                        >
                          <span className="w-3.5 text-center font-bold">
                            {passwordCriteria.hasUpperLower ? '✓' : '○'}
                          </span>
                          <span>Upper &amp; lowercase</span>
                        </div>

                        <div
                          className={`flex items-center gap-1.5 ${
                            passwordCriteria.hasNumber
                              ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                              : 'text-slate-400 dark:text-slate-500'
                          }`}
                        >
                          <span className="w-3.5 text-center font-bold">
                            {passwordCriteria.hasNumber ? '✓' : '○'}
                          </span>
                          <span>At least 1 number</span>
                        </div>

                        <div
                          className={`flex items-center gap-1.5 ${
                            passwordCriteria.hasSpecial
                              ? 'text-emerald-600 dark:text-emerald-400 font-semibold'
                              : 'text-slate-400 dark:text-slate-500'
                          }`}
                        >
                          <span className="w-3.5 text-center font-bold">
                            {passwordCriteria.hasSpecial ? '✓' : '○'}
                          </span>
                          <span>Special character</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Submit Button */}
                  <div className="pt-3">
                    <button
                      type="submit"
                      disabled={isSubmitting || !isFormValid}
                      className="w-full py-3.5 px-6 rounded-xl bg-[#126BEB] hover:bg-[#0B5CC7] text-white font-semibold text-sm transition-all shadow-md shadow-blue-500/20 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                          <span>Creating Account...</span>
                        </>
                      ) : (
                        <span>Create Account</span>
                      )}
                    </button>
                    {!isEmailVerified && (
                      <p className="text-[11px] text-center text-slate-400 mt-2">
                        Verify your work email above to activate account creation.
                      </p>
                    )}
                  </div>
                </form>

                {/* Bottom Sign-In Link */}
                <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 text-center">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Already have a BAXATO merchant account?{' '}
                    <Link
                      href="/login"
                      className="text-[#126BEB] dark:text-[#38BDF8] font-semibold hover:underline"
                    >
                      Sign In
                    </Link>
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          </div>
        </div>
      </section>
    </div>
  );
}

export const dynamic = 'force-dynamic';

export default function RegisterPage() {
  const clerk = useClerk();

  const handleSendEmailOtp = async (
    email: string,
    password?: string,
    firstName?: string,
    lastName?: string,
  ) => {
    // Wait briefly if Clerk SDK is still finishing initialization
    if (!clerk.loaded || !clerk.client) {
      let attempts = 0;
      while ((!clerk.loaded || !clerk.client) && attempts < 25) {
        await new Promise((r) => setTimeout(r, 200));
        attempts++;
      }
      if (!clerk.loaded || !clerk.client) {
        throw new Error('Clerk authentication service is still connecting. Please wait a moment and try again.');
      }
    }

    const signUp = clerk.client.signUp;
    const normalizedEmail = email.toLowerCase().trim();

    // If an existing sign-up attempt exists for a different email or was abandoned, create fresh
    if (!signUp.id || signUp.emailAddress !== normalizedEmail || signUp.status === 'abandoned') {
      try {
        await signUp.create({
          emailAddress: normalizedEmail,
          password: password || undefined,
          firstName: firstName?.trim() || undefined,
          lastName: lastName?.trim() || undefined,
        });
      } catch (createErr: unknown) {
        const clerkErr = createErr as { errors?: Array<{ code?: string; message?: string }> };
        const isExistingForm = clerkErr?.errors?.some(
          (e) => e.code === 'form_identifier_exists' || e.code === 'session_exists'
        );
        if (!isExistingForm && signUp.emailAddress !== normalizedEmail) {
          throw createErr;
        }
      }
    }

    await signUp.prepareEmailAddressVerification({
      strategy: 'email_code',
    });
  };

  const handleVerifyEmailOtp = async (code: string) => {
    if (!clerk.loaded || !clerk.client) {
      throw new Error('Clerk authentication service is still initializing. Please wait a moment.');
    }

    const signUp = clerk.client.signUp;
    const completeSignUp = await signUp.attemptEmailAddressVerification({
      code: code.trim(),
    });

    if (completeSignUp.verifications?.emailAddress?.status !== 'verified') {
      throw new Error('Verification code was not accepted. Please check the code and try again.');
    }
  };

  const handleCompleteSignUp = async (
    password: string,
    firstName: string,
    lastName: string,
  ) => {
    if (!clerk.loaded || !clerk.client) return null;

    const signUp = clerk.client.signUp;
    let sessionId = signUp.createdSessionId;
    let userId = signUp.createdUserId;

    if (signUp.status !== 'complete') {
      const completeResult = await signUp.update({
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
      sessionId = completeResult.createdSessionId;
      userId = completeResult.createdUserId;
    }

    if (sessionId) {
      await clerk.setActive({ session: sessionId });
    }

    return userId || null;
  };

  return (
    <RegisterFormContent
      onSendEmailOtp={handleSendEmailOtp}
      onVerifyEmailOtp={handleVerifyEmailOtp}
      onCompleteSignUp={handleCompleteSignUp}
    />
  );
}
