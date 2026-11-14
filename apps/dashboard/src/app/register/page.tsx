'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Check,
  Edit2,
  RotateCw,
  Loader2,
} from 'lucide-react';
import { nigeriaStates, nigeriaStatesList } from '@baxato/common';
import SearchableSelect from '@/components/SearchableSelect';
import AuthShell, {
  AUTH_INPUT_CLASS,
  AUTH_PRIMARY_BUTTON_CLASS,
} from '@/components/auth/AuthShell';
import { useClerk } from '@clerk/nextjs';

interface RegisterFormContentProps {
  onSendEmailOtp: (email: string) => Promise<{ alreadyVerified?: boolean } | void>;
  onVerifyEmailOtp: (code: string) => Promise<void>;
  onCompleteSignUp: (password: string, firstName: string, lastName: string) => Promise<string | null>;
  checkEmailVerified?: (email: string) => boolean;
}

interface InlineOtpCardProps {
  targetLabel: string;
  placeholder: string;
  otp: string;
  onOtpChange: (value: string) => void;
  onVerify: () => void;
  onCancel: () => void;
  onResend: () => void;
  isVerifying: boolean;
  isResending: boolean;
  countdown: number;
  error: string | null;
  helperNote?: string;
}

function InlineOtpCard({
  targetLabel,
  placeholder,
  otp,
  onOtpChange,
  onVerify,
  onCancel,
  onResend,
  isVerifying,
  isResending,
  countdown,
  error,
  helperNote,
}: InlineOtpCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className="mt-2 p-3 rounded-lg bg-slate-50 dark:bg-[#0B1424] border border-slate-200 dark:border-slate-700"
    >
      <div className="flex items-center justify-between text-xs mb-2">
        <span className="text-slate-600 dark:text-slate-300 truncate mr-2">
          Code sent to{' '}
          <strong className="text-slate-900 dark:text-white font-medium">{targetLabel}</strong>
        </span>
        <button
          type="button"
          onClick={onCancel}
          className="text-[#126BEB] dark:text-[#38BDF8] text-xs font-medium hover:underline shrink-0"
        >
          Cancel
        </button>
      </div>

      <div className="flex items-center gap-2 w-full">
        <input
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder={placeholder}
          value={otp}
          onChange={(e) => onOtpChange(e.target.value.replace(/\D/g, ''))}
          className="min-w-0 flex-1 h-10 px-3 text-center tracking-[0.25em] font-mono text-base font-semibold bg-white dark:bg-[#070D18] border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:border-[#126BEB] focus:ring-2 focus:ring-[#126BEB]/15 transition-colors"
        />
        <button
          type="button"
          onClick={onVerify}
          disabled={isVerifying || otp.length < 6}
          className="shrink-0 h-10 px-4 rounded-lg bg-[#126BEB] hover:bg-[#0E59C9] text-white text-xs font-medium transition-colors flex items-center justify-center disabled:opacity-45 disabled:cursor-not-allowed min-w-[82px]"
        >
          {isVerifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Confirm'}
        </button>
      </div>

      {error && (
        <p className="text-[11px] text-red-500 font-medium mt-1.5 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      )}

      <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-200/80 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
        <span>
          {countdown > 0 ? (
            <>
              Resend in <strong className="text-slate-700 dark:text-slate-300 font-medium">{countdown}s</strong>
            </>
          ) : (
            <button
              type="button"
              onClick={onResend}
              disabled={isResending}
              className="text-[#126BEB] dark:text-[#38BDF8] font-medium hover:underline inline-flex items-center gap-1 disabled:opacity-45"
            >
              <RotateCw className={`w-3 h-3 ${isResending ? 'animate-spin' : ''}`} />
              <span>Resend code</span>
            </button>
          )}
        </span>
        {helperNote && <span className="text-[11px] text-slate-400">{helperNote}</span>}
      </div>
    </motion.div>
  );
}

function getClerkErrorMessage(err: unknown): string {
  if (!err) return 'An error occurred during authentication.';
  const clerkErr = err as { errors?: Array<{ code?: string; message?: string; longMessage?: string }> };
  if (Array.isArray(clerkErr.errors) && clerkErr.errors.length > 0) {
    const firstErr = clerkErr.errors[0];
    if (firstErr.code === 'form_identifier_exists') {
      return 'An account with this email address already exists. Please login or use a different email.';
    }
    if (firstErr.code === 'verification_already_verified') {
      return 'This email address has already been verified.';
    }
    return firstErr.longMessage || firstErr.message || 'Authentication error';
  }
  if (err instanceof Error) return err.message;
  return String(err);
}

function RegisterFormContent({
  onSendEmailOtp,
  onVerifyEmailOtp,
  onCompleteSignUp,
  checkEmailVerified,
}: RegisterFormContentProps) {
  const router = useRouter();

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

  // Auto-detect if entered email is already verified in current Clerk session
  useEffect(() => {
    if (!checkEmailVerified) return;
    if (formData.email && !isEmailVerified) {
      if (checkEmailVerified(formData.email)) {
        setIsEmailVerified(true);
        setEmailOtpSent(false);
      }
    }
  }, [formData.email, checkEmailVerified, isEmailVerified]);

  // Available LGAs dynamically filtered by the selected State
  const availableLgas = useMemo(() => {
    if (!formData.state) return [];
    return nigeriaStates[formData.state] || [];
  }, [formData.state]);

  const handleStateChange = (state: string) => {
    setFormData((prev) => ({
      ...prev,
      state,
      lga: '',
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

  // Email verification trigger (via Clerk Pro)
  const handleSendEmailOtp = async () => {
    setEmailOtpError(null);
    if (!formData.email.trim() || !isValidEmail) {
      setEmailOtpError('Enter a valid email address first.');
      return;
    }

    setIsSendingEmailOtp(true);
    try {
      const result = await onSendEmailOtp(formData.email.toLowerCase().trim());
      if (result && 'alreadyVerified' in result && result.alreadyVerified) {
        setIsEmailVerified(true);
        setEmailOtpSent(false);
        return;
      }
      setEmailOtpSent(true);
      setEmailCountdown(60);
      setEmailOtp('');
    } catch (err: unknown) {
      const clerkErr = err as { errors?: Array<{ code?: string; message?: string }> };
      const isAlreadyVerified = clerkErr?.errors?.some(
        (e) =>
          e.code === 'verification_already_verified' ||
          e.message?.toLowerCase().includes('already been verified')
      );
      if (isAlreadyVerified) {
        setIsEmailVerified(true);
        setEmailOtpSent(false);
        return;
      }
      setEmailOtpError(getClerkErrorMessage(err));
    } finally {
      setIsSendingEmailOtp(false);
    }
  };

  // Email OTP verification confirm (via Clerk Pro)
  const handleVerifyEmailOtp = async () => {
    setEmailOtpError(null);
    if (emailOtp.trim().length < 6) {
      setEmailOtpError('Please enter the 6-digit verification code.');
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

  // WhatsApp phone verification trigger (via Meta WhatsApp Cloud API)
  const handleSendPhoneOtp = async () => {
    setPhoneOtpError(null);
    if (!formData.phoneNumber || formData.phoneNumber.length < 10) {
      setPhoneOtpError('Enter a valid 10 or 11-digit phone number first.');
      return;
    }

    setIsSendingPhoneOtp(true);
    try {
      const res = await fetch('/api/auth/send-phone-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: formData.phoneNumber }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || data?.success === false || data?.data?.sent === false) {
        throw new Error(
          data?.data?.message ||
            data?.error?.message ||
            data?.message ||
            `Failed to send WhatsApp code (HTTP ${res.status}).`
        );
      }
      setPhoneOtpSent(true);
      setPhoneCountdown(60);
      setPhoneOtp('');
    } catch (err: unknown) {
      setPhoneOtpError(err instanceof Error ? err.message : 'Failed to send WhatsApp code.');
    } finally {
      setIsSendingPhoneOtp(false);
    }
  };

  // WhatsApp phone OTP confirm
  const handleVerifyPhoneOtp = async () => {
    setPhoneOtpError(null);
    if (phoneOtp.trim().length < 6) {
      setPhoneOtpError('Please enter the 6-digit WhatsApp code.');
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
      const data = await res.json().catch(() => null);
      if (!res.ok || data?.success === false) {
        throw new Error(
          data?.error?.message ||
            data?.message ||
            `Failed to verify WhatsApp code (HTTP ${res.status}).`
        );
      }
      setIsPhoneVerified(true);
      setPhoneOtpSent(false);
      setPhoneOtp('');
    } catch (err: unknown) {
      setPhoneOtpError(err instanceof Error ? err.message : 'Invalid code.');
    } finally {
      setIsVerifyingPhoneOtp(false);
    }
  };

  const isFormValid = useMemo(() => {
    return (
      formData.firstName.trim().length > 0 &&
      formData.lastName.trim().length > 0 &&
      isEmailVerified &&
      isPhoneVerified &&
      formData.phoneNumber.length >= 10 &&
      formData.businessName.trim().length > 0 &&
      formData.state.length > 0 &&
      formData.lga.length > 0 &&
      isPasswordSecure &&
      passwordsMatch === true
    );
  }, [formData, isEmailVerified, isPhoneVerified, isPasswordSecure, passwordsMatch]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!isEmailVerified) {
      setErrorMessage('Please verify your email address before creating an account.');
      return;
    }

    if (!isPhoneVerified) {
      setErrorMessage('Please verify your WhatsApp phone number before creating an account.');
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
        formData.lastName.trim()
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
          isPhoneVerified: true,
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

      if (result.data?.token) {
        try {
          localStorage.setItem('bx_auth_token', result.data.token);
          if (result.data?.user) {
            localStorage.setItem('bx_user', JSON.stringify(result.data.user));
          }
          if (result.data?.business) {
            localStorage.setItem('bx_business', JSON.stringify(result.data.business));
          }
        } catch {}
      }

      router.push('/dashboard');
    } catch (err: unknown) {
      setErrorMessage(getClerkErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthShell isLoading={isSubmitting} maxWidthClass="max-w-[460px]">
      <AnimatePresence mode="wait">
        {isRegistered ? (
          <motion.div
            key="success-screen"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            className="text-center py-6"
          >
            <div className="w-12 h-12 bg-blue-50 dark:bg-blue-950/40 text-[#126BEB] rounded-xl flex items-center justify-center mx-auto mb-5 border border-blue-100 dark:border-blue-900/50">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white tracking-tight mb-2">
              Account created
            </h2>

            <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
              Your account for{' '}
              <strong className="text-slate-900 dark:text-white font-medium">
                {formData.businessName}
              </strong>{' '}
              is ready.
            </p>

            <Link href="/dashboard" className={AUTH_PRIMARY_BUTTON_CLASS}>
              Continue to Dashboard
            </Link>
          </motion.div>
        ) : (
          <motion.div
            key="form-screen"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="w-full"
          >
            <div className="text-center mb-6">
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
                Create your account
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">
                Enter your business details to get started.
              </p>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs font-medium flex items-center gap-2.5 mb-5">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-3.5">
              {/* First & Last Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    First name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="John"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className={AUTH_INPUT_CLASS}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Last name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Doe"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className={AUTH_INPUT_CLASS}
                  />
                </div>
              </div>

              {/* Email with In-Flow Verification */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Email <span className="text-red-500">*</span>
                  </label>
                  {isEmailVerified && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      <Check className="w-3.5 h-3.5" /> Verified
                    </span>
                  )}
                </div>

                <div
                  className={`h-11 w-full flex items-center rounded-lg border transition-colors focus-within:border-[#126BEB] focus-within:ring-2 focus-within:ring-[#126BEB]/15 dark:focus-within:border-[#38BDF8] dark:focus-within:ring-[#38BDF8]/15 ${
                    isEmailVerified
                      ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-400 dark:border-emerald-700'
                      : formData.email && !isValidEmail
                      ? 'bg-white dark:bg-[#0D1726] border-red-400 dark:border-red-700'
                      : 'bg-white dark:bg-[#0D1726] border-slate-300 dark:border-slate-700'
                  }`}
                >
                  <input
                    type="email"
                    required
                    disabled={isEmailVerified}
                    placeholder="you@company.com"
                    value={formData.email}
                    onChange={handleEmailChange}
                    className="flex-1 min-w-0 h-full px-3.5 bg-transparent text-base sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none disabled:cursor-not-allowed"
                  />
                  {!isEmailVerified ? (
                    <button
                      type="button"
                      onClick={handleSendEmailOtp}
                      disabled={isSendingEmailOtp || !isValidEmail}
                      className="mr-1.5 shrink-0 h-8 px-2.5 rounded-md bg-blue-50 hover:bg-blue-100 dark:bg-[#126BEB]/20 dark:hover:bg-[#126BEB]/30 text-[#126BEB] dark:text-[#38BDF8] text-xs font-medium transition-colors flex items-center justify-center gap-1.5 disabled:opacity-45 disabled:cursor-not-allowed"
                    >
                      {isSendingEmailOtp ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        'Send code'
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setIsEmailVerified(false);
                        setEmailOtpSent(false);
                      }}
                      className="mr-2.5 shrink-0 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-medium flex items-center gap-1"
                      title="Change email"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                  )}
                </div>

                {emailOtpError && !emailOtpSent && (
                  <p className="text-[11px] text-red-500 font-medium mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{emailOtpError}</span>
                  </p>
                )}

                <AnimatePresence>
                  {emailOtpSent && !isEmailVerified && (
                    <InlineOtpCard
                      targetLabel={formData.email}
                      placeholder="6-digit code"
                      otp={emailOtp}
                      onOtpChange={setEmailOtp}
                      onVerify={handleVerifyEmailOtp}
                      onCancel={() => setEmailOtpSent(false)}
                      onResend={handleSendEmailOtp}
                      isVerifying={isVerifyingEmailOtp}
                      isResending={isSendingEmailOtp}
                      countdown={emailCountdown}
                      error={emailOtpError}
                      helperNote="Check spam folder"
                    />
                  )}
                </AnimatePresence>
              </div>

              {/* WhatsApp Phone Number with In-Flow Verification */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    WhatsApp number <span className="text-red-500">*</span>
                  </label>
                  {isPhoneVerified && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      <Check className="w-3.5 h-3.5" /> Verified
                    </span>
                  )}
                </div>

                <div
                  className={`h-11 w-full flex items-center rounded-lg border transition-colors focus-within:border-[#126BEB] focus-within:ring-2 focus-within:ring-[#126BEB]/15 dark:focus-within:border-[#38BDF8] dark:focus-within:ring-[#38BDF8]/15 ${
                    isPhoneVerified
                      ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-400 dark:border-emerald-700'
                      : 'bg-white dark:bg-[#0D1726] border-slate-300 dark:border-slate-700'
                  }`}
                >
                  <div className="h-full px-3 flex items-center gap-1.5 border-r border-slate-200 dark:border-slate-700 text-xs sm:text-sm text-slate-600 dark:text-slate-300 shrink-0 select-none">
                    <span>🇳🇬</span>
                    <span>+234</span>
                  </div>
                  <input
                    type="tel"
                    required
                    disabled={isPhoneVerified}
                    maxLength={11}
                    placeholder="08012345678"
                    value={formData.phoneNumber}
                    onChange={handlePhoneChange}
                    className="flex-1 min-w-0 h-full px-3 bg-transparent text-base sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none disabled:cursor-not-allowed"
                  />
                  {!isPhoneVerified ? (
                    <button
                      type="button"
                      onClick={handleSendPhoneOtp}
                      disabled={isSendingPhoneOtp || formData.phoneNumber.length < 10}
                      className="mr-1.5 shrink-0 h-8 px-2.5 rounded-md bg-blue-50 hover:bg-blue-100 dark:bg-[#126BEB]/20 dark:hover:bg-[#126BEB]/30 text-[#126BEB] dark:text-[#38BDF8] text-xs font-medium transition-colors flex items-center justify-center gap-1.5 disabled:opacity-45 disabled:cursor-not-allowed"
                    >
                      {isSendingPhoneOtp ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        'Send code'
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setIsPhoneVerified(false);
                        setPhoneOtpSent(false);
                      }}
                      className="mr-2.5 shrink-0 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-medium flex items-center gap-1"
                      title="Change phone number"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                  )}
                </div>

                {phoneOtpError && !phoneOtpSent && (
                  <p className="text-[11px] text-red-500 font-medium mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{phoneOtpError}</span>
                  </p>
                )}

                <AnimatePresence>
                  {phoneOtpSent && !isPhoneVerified && (
                    <InlineOtpCard
                      targetLabel={`+234 ${formData.phoneNumber}`}
                      placeholder="6-digit WhatsApp code"
                      otp={phoneOtp}
                      onOtpChange={setPhoneOtp}
                      onVerify={handleVerifyPhoneOtp}
                      onCancel={() => setPhoneOtpSent(false)}
                      onResend={handleSendPhoneOtp}
                      isVerifying={isVerifyingPhoneOtp}
                      isResending={isSendingPhoneOtp}
                      countdown={phoneCountdown}
                      error={phoneOtpError}
                    />
                  )}
                </AnimatePresence>
              </div>

              {/* Business Name */}
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                  Business name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Apex Telecom Limited"
                  value={formData.businessName}
                  onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                  className={AUTH_INPUT_CLASS}
                />
              </div>

              {/* State & LGA */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
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
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    LGA <span className="text-red-500">*</span>
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
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Password <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Min 8 characters"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
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

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                    Confirm password <span className="text-red-500">*</span>
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
                      className={`${AUTH_INPUT_CLASS} pr-10 ${
                        passwordsMatch === false
                          ? 'border-red-400 dark:border-red-700 focus:border-red-500 focus:ring-red-500/15'
                          : ''
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>

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

              {/* Password Security Checklist */}
              {formData.password && (
                <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#0A1220] border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                    <div
                      className={`flex items-center gap-1.5 ${
                        passwordCriteria.minLength
                          ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                          : 'text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      <span className="w-3 text-center font-semibold">
                        {passwordCriteria.minLength ? '✓' : '○'}
                      </span>
                      <span>8+ characters</span>
                    </div>

                    <div
                      className={`flex items-center gap-1.5 ${
                        passwordCriteria.hasUpperLower
                          ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                          : 'text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      <span className="w-3 text-center font-semibold">
                        {passwordCriteria.hasUpperLower ? '✓' : '○'}
                      </span>
                      <span>Upper &amp; lowercase</span>
                    </div>

                    <div
                      className={`flex items-center gap-1.5 ${
                        passwordCriteria.hasNumber
                          ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                          : 'text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      <span className="w-3 text-center font-semibold">
                        {passwordCriteria.hasNumber ? '✓' : '○'}
                      </span>
                      <span>At least 1 number</span>
                    </div>

                    <div
                      className={`flex items-center gap-1.5 ${
                        passwordCriteria.hasSpecial
                          ? 'text-emerald-600 dark:text-emerald-400 font-medium'
                          : 'text-slate-400 dark:text-slate-500'
                      }`}
                    >
                      <span className="w-3 text-center font-semibold">
                        {passwordCriteria.hasSpecial ? '✓' : '○'}
                      </span>
                      <span>Special character</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || !isFormValid}
                  className={AUTH_PRIMARY_BUTTON_CLASS}
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Account'}
                </button>
              </div>
            </form>

            <div className="mt-6 pt-5 border-t border-slate-200/80 dark:border-slate-800 text-center">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Already have an account?{' '}
                <Link
                  href="/login"
                  className="text-[#126BEB] dark:text-[#38BDF8] font-medium hover:underline"
                >
                  Login
                </Link>
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </AuthShell>
  );
}

export const dynamic = 'force-dynamic';

export default function RegisterPage() {
  const clerk = useClerk();

  const handleSendEmailOtp = async (email: string) => {
    // Wait briefly if Clerk SDK is still finishing initialization
    if (!clerk.loaded || !clerk.client) {
      let attempts = 0;
      while ((!clerk.loaded || !clerk.client) && attempts < 25) {
        await new Promise((r) => setTimeout(r, 200));
        attempts++;
      }
      if (!clerk.loaded || !clerk.client) {
        throw new Error('Authentication service is still connecting. Please wait a moment and try again.');
      }
    }

    const signUp = clerk.client.signUp;
    const normalizedEmail = email.toLowerCase().trim();

    // 1. Proactive check: If Clerk already has this email verified in the current browser session
    if (
      signUp.id &&
      signUp.emailAddress === normalizedEmail &&
      signUp.verifications?.emailAddress?.status === 'verified'
    ) {
      return { alreadyVerified: true };
    }

    // 2. If an existing sign-up attempt exists for a different email or was abandoned, create fresh
    if (!signUp.id || signUp.emailAddress !== normalizedEmail || signUp.status === 'abandoned') {
      try {
        await signUp.create({
          emailAddress: normalizedEmail,
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

    // 3. Prepare email verification code (catch if already verified)
    try {
      await signUp.prepareEmailAddressVerification({
        strategy: 'email_code',
      });
    } catch (prepErr: unknown) {
      const clerkErr = prepErr as { errors?: Array<{ code?: string; message?: string }> };
      const isAlreadyVerified = clerkErr?.errors?.some(
        (e) =>
          e.code === 'verification_already_verified' ||
          e.message?.toLowerCase().includes('already been verified')
      );
      if (isAlreadyVerified || signUp.verifications?.emailAddress?.status === 'verified') {
        return { alreadyVerified: true };
      }
      throw prepErr;
    }
  };

  const handleVerifyEmailOtp = async (code: string) => {
    if (!clerk.loaded || !clerk.client) {
      throw new Error('Authentication service is still initializing. Please wait a moment.');
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
    lastName: string
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

  const checkEmailVerified = (email: string): boolean => {
    if (!clerk.loaded || !clerk.client) return false;
    const currentSignUp = clerk.client.signUp;
    const normalizedEmail = email.toLowerCase().trim();
    return Boolean(
      currentSignUp?.id &&
        currentSignUp.emailAddress === normalizedEmail &&
        currentSignUp.verifications?.emailAddress?.status === 'verified'
    );
  };

  return (
    <RegisterFormContent
      onSendEmailOtp={handleSendEmailOtp}
      onVerifyEmailOtp={handleVerifyEmailOtp}
      onCompleteSignUp={handleCompleteSignUp}
      checkEmailVerified={checkEmailVerified}
    />
  );
}
