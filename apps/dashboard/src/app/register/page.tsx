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
} from 'lucide-react';
import { nigeriaStates, nigeriaStatesList } from '@baxato/common';
import SearchableSelect from '@/components/SearchableSelect';
import { SignUp } from '@clerk/nextjs';

export default function RegisterPage() {
  const clerkPubKey =
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || process.env.CLERK_PUBLISHABLE_KEY;
  const isClerkConfigured =
    clerkPubKey && !clerkPubKey.includes('dummy') && clerkPubKey.startsWith('pk_');

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

  // WhatsApp Phone In-Flow Verification States
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [phoneOtp, setPhoneOtp] = useState('');
  const [isSendingPhoneOtp, setIsSendingPhoneOtp] = useState(false);
  const [isVerifyingPhoneOtp, setIsVerifyingPhoneOtp] = useState(false);
  const [phoneOtpError, setPhoneOtpError] = useState<string | null>(null);
  const [phoneCountdown, setPhoneCountdown] = useState(0);

  // Email countdown timer
  useEffect(() => {
    if (emailCountdown > 0) {
      const timer = setTimeout(() => setEmailCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [emailCountdown]);

  // Phone countdown timer
  useEffect(() => {
    if (phoneCountdown > 0) {
      const timer = setTimeout(() => setPhoneCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [phoneCountdown]);

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
    if (isPhoneVerified) {
      setIsPhoneVerified(false);
      setPhoneOtpSent(false);
    }
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

  // Email verification trigger
  const handleSendEmailOtp = async () => {
    setEmailOtpError(null);
    if (!formData.email.trim() || !isValidEmail) {
      setEmailOtpError('Enter a valid email address first.');
      return;
    }

    setIsSendingEmailOtp(true);
    try {
      const res = await fetch('/api/auth/send-email-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email.toLowerCase().trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to send verification code.');
      setEmailOtpSent(true);
      setEmailCountdown(60);
      setEmailOtp(''); // Field remains strictly empty for user entry
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to dispatch verification code.';
      setEmailOtpError(msg);
    } finally {
      setIsSendingEmailOtp(false);
    }
  };

  // Email OTP verification confirm
  const handleVerifyEmailOtp = async () => {
    setEmailOtpError(null);
    if (emailOtp.trim().length < 6) {
      setEmailOtpError('Please enter the full 6-digit verification code.');
      return;
    }

    setIsVerifyingEmailOtp(true);
    try {
      const res = await fetch('/api/auth/verify-email-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email.toLowerCase().trim(),
          otp: emailOtp.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Invalid verification code.');
      setIsEmailVerified(true);
      setEmailOtpSent(false);
      setEmailOtp('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid code. Please check your email.';
      setEmailOtpError(msg);
    } finally {
      setIsVerifyingEmailOtp(false);
    }
  };

  // WhatsApp OTP verification trigger
  const handleSendPhoneOtp = async () => {
    setPhoneOtpError(null);
    if (formData.phoneNumber.length < 10) {
      setPhoneOtpError('Enter a valid 11-digit WhatsApp phone number.');
      return;
    }

    setIsSendingPhoneOtp(true);
    try {
      const res = await fetch('/api/auth/send-phone-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: formData.phoneNumber }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to send WhatsApp code.');
      setPhoneOtpSent(true);
      setPhoneCountdown(60);
      setPhoneOtp(''); // Field remains strictly empty for user entry
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to dispatch WhatsApp code.';
      setPhoneOtpError(msg);
    } finally {
      setIsSendingPhoneOtp(false);
    }
  };

  // WhatsApp OTP verification confirm
  const handleVerifyPhoneOtp = async () => {
    setPhoneOtpError(null);
    if (phoneOtp.trim().length < 6) {
      setPhoneOtpError('Please enter the full 6-digit WhatsApp code.');
      return;
    }

    setIsVerifyingPhoneOtp(true);
    try {
      const res = await fetch('/api/auth/verify-phone-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: formData.phoneNumber,
          otp: phoneOtp.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Invalid WhatsApp code.');
      setIsPhoneVerified(true);
      setPhoneOtpSent(false);
      setPhoneOtp('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Invalid code. Please check your message.';
      setPhoneOtpError(msg);
    } finally {
      setIsVerifyingPhoneOtp(false);
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
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
      const msg = err instanceof Error ? err.message : 'Unable to complete registration.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col lg:flex-row bg-[#060D1A] lg:bg-white lg:dark:bg-[#070D18] transition-colors duration-200">
      {/* ======================================================== */}
      {/* MOBILE BACKGROUND: 3D Fintech Backdrop visible on mobile */}
      {/* ======================================================== */}
      <div className="lg:hidden fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <Image
          src="/fintech-bg.jpg"
          alt="BAXATO Fintech Backdrop"
          fill
          priority
          className="object-cover opacity-50 dark:opacity-40 scale-105"
        />
        {/* Subtle deep navy gradient for high contrast */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#060D1A]/90 via-[#060D1A]/80 to-[#060D1A]/95 dark:from-[#040810]/95 dark:via-[#060D1A]/85 dark:to-[#040810]/98" />
      </div>

      {/* ======================================================== */}
      {/* LEFT SIDE: Brand Showcase with Generated 3D Asset (Desktop) */}
      {/* ======================================================== */}
      <section className="hidden lg:flex lg:w-1/2 bg-[#060D1A] text-white p-12 xl:p-16 flex-col justify-between relative overflow-hidden">
        {/* Generated 3D Glassmorphic Backdrop Image */}
        <div className="absolute inset-0 z-0">
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

        {/* Top Logo */}
        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center gap-3 group">
            <div className="relative w-11 h-11 rounded-2xl overflow-hidden shadow-xl border border-white/15 bg-white/5 backdrop-blur-md group-hover:scale-105 transition-transform p-1">
              <Image
                src="/baxato-logo.jpg"
                alt="BAXATO Logo"
                fill
                priority
                className="object-contain"
              />
            </div>
            <span className="font-extrabold text-2xl tracking-tight text-white">
              BAXATO
            </span>
          </Link>
        </div>

        {/* Center: Commercial Showcase & Value Proposition */}
        <div className="relative z-10 max-w-lg my-10">
          <h2 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-white leading-tight">
            Empowering High-Growth Digital Commerce &amp; Payments Across Nigeria
          </h2>

          <p className="text-slate-300 text-sm leading-relaxed mt-4 font-normal">
            Join thousands of businesses, merchants, and aggregators vending airtime, data bundles, electricity tokens, and cable subscriptions with instant automated reconciliation.
          </p>

          {/* 4 Professional Commercial Value Pillars */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
            <div className="p-4 rounded-xl bg-white/[0.05] border border-white/10 backdrop-blur-md">
              <div className="w-8 h-8 rounded-lg bg-[#126BEB]/25 text-[#38BDF8] flex items-center justify-center mb-2.5">
                <CreditCard className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-white">Instant Wallet Settlement</h4>
              <p className="text-xs text-slate-300 mt-1 leading-normal font-normal">
                Commissions and funds credited immediately upon vending.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.05] border border-white/10 backdrop-blur-md">
              <div className="w-8 h-8 rounded-lg bg-[#126BEB]/25 text-[#38BDF8] flex items-center justify-center mb-2.5">
                <Building2 className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-white">Nationwide Coverage</h4>
              <p className="text-xs text-slate-300 mt-1 leading-normal font-normal">
                Direct integration with all Nigerian DISCOs and telecom operators.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.05] border border-white/10 backdrop-blur-md">
              <div className="w-8 h-8 rounded-lg bg-[#126BEB]/25 text-[#38BDF8] flex items-center justify-center mb-2.5">
                <Lock className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-white">Bank-Grade Ledger</h4>
              <p className="text-xs text-slate-300 mt-1 leading-normal font-normal">
                Transparent cryptographic accounting and financial auditing.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.05] border border-white/10 backdrop-blur-md">
              <div className="w-8 h-8 rounded-lg bg-[#126BEB]/25 text-[#38BDF8] flex items-center justify-center mb-2.5">
                <Headphones className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-white">Dedicated Support</h4>
              <p className="text-xs text-slate-300 mt-1 leading-normal font-normal">
                24/7 technical and merchant onboarding assistance.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Legal Notice */}
        <div className="relative z-10 pt-6 border-t border-white/10 text-xs text-slate-400">
          <p>© 2026 XATO TECHNOLOGIES LIMITED. All rights reserved.</p>
        </div>
      </section>

      {/* ======================================================== */}
      {/* RIGHT SIDE: Authentication / Registration Surface        */}
      {/* ======================================================== */}
      <section className="w-full lg:w-1/2 flex flex-col justify-center items-center p-4 sm:p-8 lg:p-12 xl:p-16 relative z-10 overflow-y-auto min-h-screen">
        <div className="w-full max-w-lg mx-auto py-4 sm:py-8">
          {/* Mobile Top Branding (Sits on top of 3D Backdrop) */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-6">
            <div className="relative w-11 h-11 rounded-2xl overflow-hidden shadow-2xl border border-white/20 bg-white/10 backdrop-blur-md p-1">
              <Image
                src="/baxato-logo.jpg"
                alt="BAXATO Logo"
                fill
                priority
                className="object-contain"
              />
            </div>
            <span className="font-extrabold text-2xl tracking-tight text-white drop-shadow-md">
              BAXATO
            </span>
          </div>

          {/* Elevated Surface on Mobile, Clean Seamless on Desktop */}
          <div className="bg-white/95 dark:bg-[#0A1220]/95 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 rounded-3xl shadow-2xl p-6 sm:p-10 lg:bg-transparent lg:dark:bg-transparent lg:border-0 lg:shadow-none lg:p-0">

          <AnimatePresence mode="wait">
            {isClerkConfigured ? (
              /* ==================================================== */
              /* CLERK AUTH COMPONENT                                 */
              /* ==================================================== */
              <motion.div
                key="clerk-signup"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full"
              >
                <div className="text-center mb-8">
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0B1220] dark:text-white">
                    Create your account
                  </h1>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                    Start vending telecom and utility services with BAXATO.
                  </p>
                </div>

                <SignUp
                  appearance={{
                    variables: {
                      colorPrimary: '#126BEB',
                      borderRadius: '0.75rem',
                    },
                    elements: {
                      card: 'shadow-none border-0 p-0 bg-transparent w-full',
                      rootBox: 'w-full',
                      headerTitle: 'hidden',
                      headerSubtitle: 'hidden',
                      formButtonPrimary:
                        'bg-[#126BEB] hover:bg-[#0B5CC7] text-white font-semibold py-3.5 rounded-xl transition-all shadow-md shadow-blue-500/15 text-sm',
                      formFieldInput:
                        'border-2 border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-base sm:text-sm focus:border-[#126BEB] dark:bg-[#0D1726] dark:text-white',
                      footerActionLink: 'text-[#126BEB] hover:text-[#0B5CC7] font-semibold',
                    },
                  }}
                  routing="hash"
                  signInUrl="/login"
                />
              </motion.div>
            ) : isRegistered ? (
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
                        className={`w-full px-4 py-3 pr-24 rounded-xl border-2 text-base sm:text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none transition-colors ${
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
                          className="absolute right-2 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-[#126BEB] dark:text-[#38BDF8] text-xs font-bold transition-colors disabled:opacity-40"
                        >
                          {isSendingEmailOtp ? 'Sending...' : 'Verify'}
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

                    {/* Email Verification Box (Expands when OTP is sent) */}
                    <AnimatePresence>
                      {emailOtpSent && !isEmailVerified && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-2.5 p-4 rounded-xl bg-slate-50 dark:bg-[#0A1220] border-2 border-blue-200 dark:border-blue-900/50 overflow-hidden"
                        >
                          <div className="flex justify-between items-center mb-1.5">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              Verify Email Address
                            </span>
                            <button
                              type="button"
                              onClick={() => setEmailOtpSent(false)}
                              className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 underline"
                            >
                              Change Email
                            </button>
                          </div>

                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
                            Enter the 6-digit verification code sent to{' '}
                            <strong className="text-slate-800 dark:text-slate-200">{formData.email}</strong>.
                          </p>

                          <div className="flex gap-2">
                            <input
                              type="text"
                              maxLength={6}
                              placeholder="• • • • • •"
                              value={emailOtp}
                              onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, ''))}
                              className="flex-1 px-4 py-2.5 text-center tracking-[0.35em] font-mono text-base font-bold bg-white dark:bg-[#070D18] border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-[#126BEB]"
                            />
                            <button
                              type="button"
                              onClick={handleVerifyEmailOtp}
                              disabled={isVerifyingEmailOtp || emailOtp.length < 6}
                              className="px-5 py-2.5 rounded-lg bg-[#126BEB] hover:bg-[#0B5CC7] text-white text-xs font-bold transition-colors disabled:opacity-40"
                            >
                              {isVerifyingEmailOtp ? 'Verifying...' : 'Confirm'}
                            </button>
                          </div>

                          {emailOtpError && (
                            <p className="text-[11px] text-red-500 font-medium mt-2">
                              {emailOtpError}
                            </p>
                          )}

                          <div className="flex justify-between items-center mt-3 text-[11px] text-slate-500 dark:text-slate-400">
                            <span>
                              {emailCountdown > 0 ? (
                                `Resend code in ${emailCountdown}s`
                              ) : (
                                <button
                                  type="button"
                                  onClick={handleSendEmailOtp}
                                  className="text-[#126BEB] font-semibold hover:underline inline-flex items-center gap-1"
                                >
                                  <RotateCw className="w-3 h-3" /> Resend Code
                                </button>
                              )}
                            </span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* WhatsApp Phone Number with In-Flow Verification */}
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        WhatsApp Phone Number <span className="text-red-500">*</span>
                      </label>
                      {isPhoneVerified && (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          <Check className="w-3.5 h-3.5" /> Verified
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
                        disabled={isPhoneVerified}
                        placeholder="08012345678"
                        value={formData.phoneNumber}
                        onChange={handlePhoneChange}
                        className={`w-full pl-24 pr-24 py-3 rounded-xl border-2 text-base sm:text-sm font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none transition-colors ${
                          isPhoneVerified
                            ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/60'
                            : 'border-slate-200 dark:border-[#1E2D44] bg-white dark:bg-[#0D1726] focus:border-[#126BEB] dark:focus:border-[#1677FF]'
                        }`}
                      />
                      {!isPhoneVerified ? (
                        <button
                          type="button"
                          onClick={handleSendPhoneOtp}
                          disabled={isSendingPhoneOtp || formData.phoneNumber.length < 10}
                          className="absolute right-2 px-3 py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-[#126BEB] dark:text-[#38BDF8] text-xs font-bold transition-colors disabled:opacity-40"
                        >
                          {isSendingPhoneOtp ? 'Sending...' : 'Verify'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setIsPhoneVerified(false);
                            setPhoneOtpSent(false);
                          }}
                          className="absolute right-2.5 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-medium flex items-center gap-1"
                          title="Change phone"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Edit</span>
                        </button>
                      )}
                    </div>

                    {/* Phone Verification Box (Expands when OTP is sent) */}
                    <AnimatePresence>
                      {phoneOtpSent && !isPhoneVerified && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-2.5 p-4 rounded-xl bg-slate-50 dark:bg-[#0A1220] border-2 border-blue-200 dark:border-blue-900/50 overflow-hidden"
                        >
                          <div className="flex justify-between items-center mb-1.5">
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                              Verify WhatsApp Number
                            </span>
                            <button
                              type="button"
                              onClick={() => setPhoneOtpSent(false)}
                              className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 underline"
                            >
                              Change Number
                            </button>
                          </div>

                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-3">
                            Enter the 6-digit WhatsApp code sent to{' '}
                            <strong className="text-slate-800 dark:text-slate-200">+234{formData.phoneNumber}</strong>.
                          </p>

                          <div className="flex gap-2">
                            <input
                              type="text"
                              maxLength={6}
                              placeholder="• • • • • •"
                              value={phoneOtp}
                              onChange={(e) => setPhoneOtp(e.target.value.replace(/\D/g, ''))}
                              className="flex-1 px-4 py-2.5 text-center tracking-[0.35em] font-mono text-base font-bold bg-white dark:bg-[#070D18] border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-[#126BEB]"
                            />
                            <button
                              type="button"
                              onClick={handleVerifyPhoneOtp}
                              disabled={isVerifyingPhoneOtp || phoneOtp.length < 6}
                              className="px-5 py-2.5 rounded-lg bg-[#126BEB] hover:bg-[#0B5CC7] text-white text-xs font-bold transition-colors disabled:opacity-40"
                            >
                              {isVerifyingPhoneOtp ? 'Verifying...' : 'Confirm'}
                            </button>
                          </div>

                          {phoneOtpError && (
                            <p className="text-[11px] text-red-500 font-medium mt-2">
                              {phoneOtpError}
                            </p>
                          )}

                          <div className="flex justify-between items-center mt-3 text-[11px] text-slate-500 dark:text-slate-400">
                            <span>
                              {phoneCountdown > 0 ? (
                                `Resend code in ${phoneCountdown}s`
                              ) : (
                                <button
                                  type="button"
                                  onClick={handleSendPhoneOtp}
                                  className="text-[#126BEB] font-semibold hover:underline inline-flex items-center gap-1"
                                >
                                  <RotateCw className="w-3 h-3" /> Resend OTP
                                </button>
                              )}
                            </span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
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
                      className="w-full py-3.5 px-6 rounded-xl bg-[#126BEB] hover:bg-[#0B5CC7] text-white font-semibold text-sm transition-all shadow-md shadow-blue-500/20 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? 'Creating Account...' : 'Create Account'}
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
