'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck, Check, Send } from 'lucide-react';
import { nigeriaStates, nigeriaStatesList } from '@baxato/common';
import SearchableSelect from '@/components/SearchableSelect';
import ThemeToggle from '@/components/ThemeToggle';

export default function RegisterPage() {
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

  // Email verification state
  const [emailOtpSent, setEmailOtpSent] = useState(false);
  const [emailOtp, setEmailOtp] = useState('');
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [isSendingEmailOtp, setIsSendingEmailOtp] = useState(false);
  const [isVerifyingEmailOtp, setIsVerifyingEmailOtp] = useState(false);
  const [emailOtpError, setEmailOtpError] = useState<string | null>(null);

  // WhatsApp verification state
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [phoneOtp, setPhoneOtp] = useState('');
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [isSendingPhoneOtp, setIsSendingPhoneOtp] = useState(false);
  const [isVerifyingPhoneOtp, setIsVerifyingPhoneOtp] = useState(false);
  const [phoneOtpError, setPhoneOtpError] = useState<string | null>(null);

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

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
    if (isPhoneVerified) setIsPhoneVerified(false);
    if (phoneOtpSent) setPhoneOtpSent(false);
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, email: e.target.value }));
    if (isEmailVerified) setIsEmailVerified(false);
    if (emailOtpSent) setEmailOtpSent(false);
  };

  // Password Strength Calculation
  const passwordStrength = useMemo(() => {
    const pwd = formData.password;
    if (!pwd) return { score: 0, label: '', color: '', percent: 0 };
    let score = 0;
    if (pwd.length >= 8) score += 1;
    if (pwd.length >= 12) score += 1;
    if (/[a-z]/.test(pwd) && /[A-Z]/.test(pwd)) score += 1;
    if (/\d/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

    if (score <= 2) {
      return { score: 1, label: 'Weak', color: 'bg-red-500', text: 'text-red-500', percent: 33 };
    } else if (score <= 3) {
      return { score: 2, label: 'Moderate', color: 'bg-amber-500', text: 'text-amber-500', percent: 66 };
    } else {
      return { score: 3, label: 'Strong', color: 'bg-emerald-500', text: 'text-emerald-500', percent: 100 };
    }
  }, [formData.password]);

  // Trigger Email OTP Send
  const handleSendEmailOtp = async () => {
    setEmailOtpError(null);
    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setEmailOtpError('Enter a valid email address first.');
      return;
    }

    setIsSendingEmailOtp(true);
    try {
      const res = await fetch(`${apiBaseUrl}/auth/send-email-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email.toLowerCase().trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to send verification code.');
      setEmailOtpSent(true);
    } catch (err: unknown) {
      setEmailOtpError(err instanceof Error ? err.message : 'Could not send code');
    } finally {
      setIsSendingEmailOtp(false);
    }
  };

  // Verify Email OTP Code
  const handleVerifyEmailOtp = async () => {
    setEmailOtpError(null);
    if (emailOtp.length < 6) {
      setEmailOtpError('Enter the 6-digit code.');
      return;
    }

    setIsVerifyingEmailOtp(true);
    try {
      const res = await fetch(`${apiBaseUrl}/auth/verify-email-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email.toLowerCase().trim(),
          otp: emailOtp.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Invalid code.');
      setIsEmailVerified(true);
      setEmailOtpSent(false);
    } catch (err: unknown) {
      setEmailOtpError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setIsVerifyingEmailOtp(false);
    }
  };

  // Trigger WhatsApp OTP Send
  const handleSendPhoneOtp = async () => {
    setPhoneOtpError(null);
    if (formData.phoneNumber.length < 10) {
      setPhoneOtpError('Enter a valid phone number (at least 10 digits).');
      return;
    }

    setIsSendingPhoneOtp(true);
    try {
      const res = await fetch(`${apiBaseUrl}/auth/send-phone-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: formData.phoneNumber }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Failed to send WhatsApp code.');
      setPhoneOtpSent(true);
    } catch (err: unknown) {
      setPhoneOtpError(err instanceof Error ? err.message : 'Could not dispatch code');
    } finally {
      setIsSendingPhoneOtp(false);
    }
  };

  // Verify WhatsApp OTP Code
  const handleVerifyPhoneOtp = async () => {
    setPhoneOtpError(null);
    if (phoneOtp.length < 6) {
      setPhoneOtpError('Enter the 6-digit code.');
      return;
    }

    setIsVerifyingPhoneOtp(true);
    try {
      const res = await fetch(`${apiBaseUrl}/auth/verify-phone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phoneNumber: formData.phoneNumber,
          otp: phoneOtp.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || 'Invalid code.');
      setIsPhoneVerified(true);
      setPhoneOtpSent(false);
    } catch (err: unknown) {
      setPhoneOtpError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setIsVerifyingPhoneOtp(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Form validations
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setErrorMessage('Please provide both first and last name.');
      return;
    }
    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setErrorMessage('Please provide a valid email address.');
      return;
    }
    if (formData.phoneNumber.length < 10) {
      setErrorMessage('Please enter a valid WhatsApp number (at least 10 digits).');
      return;
    }
    if (!formData.businessName.trim()) {
      setErrorMessage('Please provide your business name.');
      return;
    }
    if (!formData.state) {
      setErrorMessage('Please select your state.');
      return;
    }
    if (!formData.lga) {
      setErrorMessage('Please select your LGA or City.');
      return;
    }
    if (formData.password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`${apiBaseUrl}/auth/register`, {
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
        throw new Error(result.error?.message || result.message || 'Registration failed. Please check your details.');
      }

      setIsRegistered(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to complete registration. Please try again.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isPasswordMismatch = formData.confirmPassword.length > 0 && formData.password !== formData.confirmPassword;

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#07111F] flex flex-col justify-between transition-colors duration-200">
      {/* Top Navbar */}
      <header className="w-full border-b border-[#E2E8F0] dark:border-[#1D3048] bg-white dark:bg-[#0B1728] px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="relative w-9 h-9 rounded-lg overflow-hidden border border-[#E2E8F0] dark:border-[#1D3048] shadow-sm">
            <Image
              src="/baxato-logo.jpg"
              alt="BAXATO Logo"
              fill
              priority
              className="object-contain"
            />
          </div>
          <span className="font-extrabold text-xl tracking-tight text-[#0B1220] dark:text-[#F8FAFC]">
            BAXATO
          </span>
        </Link>

        <div className="flex items-center gap-4">
          <span className="hidden sm:inline text-xs text-slate-500 dark:text-slate-400 font-medium">
            Already registered?{' '}
            <Link
              href="/login"
              className="text-[#126BEB] dark:text-[#1677FF] font-semibold hover:underline"
            >
              Sign In
            </Link>
          </span>
          <ThemeToggle />
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-xl">
          <AnimatePresence mode="wait">
            {isRegistered ? (
              /* Success Confirmation Card */
              <motion.div
                key="success-card"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white dark:bg-[#101F33] border border-[#E2E8F0] dark:border-[#1D3048] rounded-2xl p-8 sm:p-10 shadow-xl text-center"
              >
                <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-200 dark:border-emerald-800">
                  <CheckCircle2 className="w-9 h-9" />
                </div>

                <h2 className="text-2xl font-bold text-[#0B1220] dark:text-[#F8FAFC] mb-2 tracking-tight">
                  Registration Successful
                </h2>

                <p className="text-sm text-[#526173] dark:text-[#A8B5C7] mb-6 leading-relaxed">
                  Your merchant account for{' '}
                  <span className="font-semibold text-[#0B1220] dark:text-[#F8FAFC]">{formData.businessName}</span>{' '}
                  has been created successfully.
                </p>

                <div className="bg-slate-50 dark:bg-[#0B1728] rounded-xl p-4 border border-[#E2E8F0] dark:border-[#1D3048] text-xs text-slate-500 dark:text-slate-400 mb-8 flex items-center gap-3 text-left">
                  <ShieldCheck className="w-5 h-5 text-[#126BEB] dark:text-[#1677FF] shrink-0" />
                  <span>
                    Main wallet and commission wallet provisioned. You can proceed directly to sign in.
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Link
                    href="/login"
                    className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#126BEB] hover:bg-[#0B5CC7] dark:bg-[#1677FF] dark:hover:bg-[#0B63CE] text-white font-medium text-sm transition-colors shadow-sm"
                  >
                    Proceed to Sign In
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </motion.div>
            ) : (
              /* Registration Form Card */
              <motion.div
                key="register-card"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="bg-white dark:bg-[#101F33] border border-[#E2E8F0] dark:border-[#1D3048] rounded-2xl p-6 sm:p-8 shadow-xl"
              >
                {/* Brand Header */}
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center p-2 rounded-2xl bg-[#F8FAFC] dark:bg-[#0B1728] border border-[#E2E8F0] dark:border-[#1D3048] mb-4 shadow-sm">
                    <div className="relative w-12 h-12 rounded-xl overflow-hidden">
                      <Image
                        src="/baxato-logo.jpg"
                        alt="BAXATO Logo"
                        fill
                        priority
                        className="object-contain"
                      />
                    </div>
                  </div>
                  <h1 className="text-2xl font-bold tracking-tight text-[#0B1220] dark:text-[#F8FAFC]">
                    Create your BAXATO account
                  </h1>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Name Fields: First Name and Last Name */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-[#0B1220] dark:text-[#F8FAFC] mb-1.5">
                        First Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. John"
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E8F0] dark:border-[#1D3048] bg-white dark:bg-[#0B1728] text-[#0B1220] dark:text-[#F8FAFC] text-sm placeholder-slate-400 focus:outline-none focus:border-[#126BEB] dark:focus:border-[#1677FF] focus:ring-2 focus:ring-[#126BEB]/10 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#0B1220] dark:text-[#F8FAFC] mb-1.5">
                        Last Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Doe"
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E8F0] dark:border-[#1D3048] bg-white dark:bg-[#0B1728] text-[#0B1220] dark:text-[#F8FAFC] text-sm placeholder-slate-400 focus:outline-none focus:border-[#126BEB] dark:focus:border-[#1677FF] focus:ring-2 focus:ring-[#126BEB]/10 transition-all"
                      />
                    </div>
                  </div>

                  {/* Email Field with Inline Verify Button */}
                  <div>
                    <label className="block text-xs font-semibold text-[#0B1220] dark:text-[#F8FAFC] mb-1.5">
                      Work / Business Email <span className="text-red-500">*</span>
                    </label>
                    <div className="relative flex rounded-lg border border-[#E2E8F0] dark:border-[#1D3048] overflow-hidden focus-within:border-[#126BEB] dark:focus-within:border-[#1677FF] focus-within:ring-2 focus-within:ring-[#126BEB]/10">
                      <input
                        type="email"
                        required
                        disabled={isEmailVerified}
                        placeholder="e.g. alex@example.com"
                        value={formData.email}
                        onChange={handleEmailChange}
                        className="flex-1 px-3.5 py-2.5 bg-white dark:bg-[#0B1728] text-[#0B1220] dark:text-[#F8FAFC] text-sm placeholder-slate-400 focus:outline-none disabled:opacity-75"
                      />
                      {isEmailVerified ? (
                        <div className="px-3 py-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-1 border-l border-emerald-200 dark:border-emerald-800 select-none">
                          <Check className="w-3.5 h-3.5" />
                          <span>Verified</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={handleSendEmailOtp}
                          disabled={isSendingEmailOtp || !formData.email.trim()}
                          className="px-3 py-2 bg-slate-50 dark:bg-[#1D3048] hover:bg-slate-100 dark:hover:bg-[#233b5c] text-[#126BEB] dark:text-[#1677FF] text-xs font-semibold border-l border-[#E2E8F0] dark:border-[#1D3048] transition-colors disabled:opacity-50 select-none flex items-center gap-1"
                        >
                          {isSendingEmailOtp ? (
                            <span>Sending...</span>
                          ) : (
                            <>
                              <Send className="w-3 h-3" />
                              <span>Verify</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    {/* Inline Email OTP Entry */}
                    <AnimatePresence>
                      {emailOtpSent && !isEmailVerified && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-2 p-3 rounded-lg bg-blue-50/70 dark:bg-[#0B1728] border border-blue-200 dark:border-[#1D3048] flex flex-col sm:flex-row items-center gap-2"
                        >
                          <div className="flex-1 w-full">
                            <input
                              type="text"
                              maxLength={6}
                              placeholder="Enter 6-digit email code"
                              value={emailOtp}
                              onChange={(e) => setEmailOtp(e.target.value.replace(/\D/g, ''))}
                              className="w-full px-3 py-1.5 text-xs rounded border border-[#E2E8F0] dark:border-[#1D3048] bg-white dark:bg-[#101F33] text-[#0B1220] dark:text-[#F8FAFC] tracking-widest font-mono text-center focus:outline-none focus:border-[#126BEB]"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={handleVerifyEmailOtp}
                            disabled={isVerifyingEmailOtp || emailOtp.length !== 6}
                            className="w-full sm:w-auto px-4 py-1.5 bg-[#126BEB] hover:bg-[#0B5CC7] dark:bg-[#1677FF] text-white text-xs font-medium rounded transition-colors disabled:opacity-50"
                          >
                            {isVerifyingEmailOtp ? 'Checking...' : 'Confirm'}
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    {emailOtpError && (
                      <p className="text-red-500 text-[11px] mt-1 flex items-center gap-1">
                        <span>⚠ {emailOtpError}</span>
                      </p>
                    )}
                  </div>

                  {/* WhatsApp Number Field with Inline Verify Button */}
                  <div>
                    <label className="block text-xs font-semibold text-[#0B1220] dark:text-[#F8FAFC] mb-1.5">
                      WhatsApp Number <span className="text-red-500">*</span>
                    </label>
                    <div className="relative flex rounded-lg border border-[#E2E8F0] dark:border-[#1D3048] overflow-hidden focus-within:border-[#126BEB] dark:focus-within:border-[#1677FF] focus-within:ring-2 focus-within:ring-[#126BEB]/10">
                      <span className="inline-flex items-center gap-1 px-3 bg-slate-50 dark:bg-[#0B1728] text-xs font-semibold text-slate-600 dark:text-slate-300 border-r border-[#E2E8F0] dark:border-[#1D3048] select-none">
                        <span>+234</span>
                      </span>
                      <input
                        type="tel"
                        required
                        disabled={isPhoneVerified}
                        placeholder="801 234 5678"
                        value={formData.phoneNumber}
                        onChange={handlePhoneChange}
                        className="flex-1 px-3.5 py-2.5 bg-white dark:bg-[#0B1728] text-[#0B1220] dark:text-[#F8FAFC] text-sm placeholder-slate-400 focus:outline-none disabled:opacity-75"
                      />
                      {isPhoneVerified ? (
                        <div className="px-3 py-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-1 border-l border-emerald-200 dark:border-emerald-800 select-none">
                          <Check className="w-3.5 h-3.5" />
                          <span>Verified</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={handleSendPhoneOtp}
                          disabled={isSendingPhoneOtp || formData.phoneNumber.length < 10}
                          className="px-3 py-2 bg-slate-50 dark:bg-[#1D3048] hover:bg-slate-100 dark:hover:bg-[#233b5c] text-[#126BEB] dark:text-[#1677FF] text-xs font-semibold border-l border-[#E2E8F0] dark:border-[#1D3048] transition-colors disabled:opacity-50 select-none flex items-center gap-1"
                        >
                          {isSendingPhoneOtp ? (
                            <span>Sending...</span>
                          ) : (
                            <>
                              <Send className="w-3 h-3" />
                              <span>Verify</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    {/* Inline Phone OTP Entry */}
                    <AnimatePresence>
                      {phoneOtpSent && !isPhoneVerified && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-2 p-3 rounded-lg bg-blue-50/70 dark:bg-[#0B1728] border border-blue-200 dark:border-[#1D3048] flex flex-col sm:flex-row items-center gap-2"
                        >
                          <div className="flex-1 w-full">
                            <input
                              type="text"
                              maxLength={6}
                              placeholder="Enter 6-digit WhatsApp OTP"
                              value={phoneOtp}
                              onChange={(e) => setPhoneOtp(e.target.value.replace(/\D/g, ''))}
                              className="w-full px-3 py-1.5 text-xs rounded border border-[#E2E8F0] dark:border-[#1D3048] bg-white dark:bg-[#101F33] text-[#0B1220] dark:text-[#F8FAFC] tracking-widest font-mono text-center focus:outline-none focus:border-[#126BEB]"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={handleVerifyPhoneOtp}
                            disabled={isVerifyingPhoneOtp || phoneOtp.length !== 6}
                            className="w-full sm:w-auto px-4 py-1.5 bg-[#126BEB] hover:bg-[#0B5CC7] dark:bg-[#1677FF] text-white text-xs font-medium rounded transition-colors disabled:opacity-50"
                          >
                            {isVerifyingPhoneOtp ? 'Checking...' : 'Confirm'}
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                    {phoneOtpError && (
                      <p className="text-red-500 text-[11px] mt-1 flex items-center gap-1">
                        <span>⚠ {phoneOtpError}</span>
                      </p>
                    )}
                  </div>

                  {/* Business Name */}
                  <div>
                    <label className="block text-xs font-semibold text-[#0B1220] dark:text-[#F8FAFC] mb-1.5">
                      Business or Enterprise Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Acme Global Services Ltd"
                      value={formData.businessName}
                      onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E8F0] dark:border-[#1D3048] bg-white dark:bg-[#0B1728] text-[#0B1220] dark:text-[#F8FAFC] text-sm placeholder-slate-400 focus:outline-none focus:border-[#126BEB] dark:focus:border-[#1677FF] focus:ring-2 focus:ring-[#126BEB]/10 transition-all"
                    />
                  </div>

                  {/* Location (Cascading State & LGA Dropdowns - No standalone country box) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                    <div>
                      <label className="block text-xs font-semibold text-[#0B1220] dark:text-[#F8FAFC] mb-1.5">
                        State <span className="text-red-500">*</span>
                      </label>
                      <SearchableSelect
                        id="register-state-select"
                        options={nigeriaStatesList}
                        placeholder="Select State..."
                        value={formData.state}
                        onChange={handleStateChange}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#0B1220] dark:text-[#F8FAFC] mb-1.5">
                        City / LGA <span className="text-red-500">*</span>
                      </label>
                      <SearchableSelect
                        id="register-lga-select"
                        options={availableLgas}
                        placeholder={formData.state ? 'Select LGA...' : 'Select State first...'}
                        value={formData.lga}
                        onChange={(lga) => setFormData((prev) => ({ ...prev, lga }))}
                        disabled={!formData.state || availableLgas.length === 0}
                      />
                    </div>
                  </div>

                  {/* Password Field with Dynamic Strength Meter */}
                  <div className="pt-1">
                    <label className="block text-xs font-semibold text-[#0B1220] dark:text-[#F8FAFC] mb-1.5">
                      Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        required
                        placeholder="Min. 8 characters"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full pl-3.5 pr-10 py-2.5 rounded-lg border border-[#E2E8F0] dark:border-[#1D3048] bg-white dark:bg-[#0B1728] text-[#0B1220] dark:text-[#F8FAFC] text-sm placeholder-slate-400 focus:outline-none focus:border-[#126BEB] dark:focus:border-[#1677FF] focus:ring-2 focus:ring-[#126BEB]/10 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Password Strength Indicator */}
                    {formData.password && (
                      <div className="mt-2 space-y-1.5">
                        <div className="w-full bg-slate-100 dark:bg-[#0B1728] h-1.5 rounded-full overflow-hidden">
                          <div
                            className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                            style={{ width: `${passwordStrength.percent}%` }}
                          />
                        </div>
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-slate-400 dark:text-slate-500">
                            Strength: <strong className={passwordStrength.text}>{passwordStrength.label}</strong>
                          </span>
                          <span className="text-slate-400 dark:text-slate-500">Min. 8 characters</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Confirm Password Field with Inline Mismatch Notice */}
                  <div>
                    <label className="block text-xs font-semibold text-[#0B1220] dark:text-[#F8FAFC] mb-1.5">
                      Confirm Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        required
                        placeholder="Repeat password"
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                        className={`w-full pl-3.5 pr-10 py-2.5 rounded-lg border bg-white dark:bg-[#0B1728] text-[#0B1220] dark:text-[#F8FAFC] text-sm placeholder-slate-400 focus:outline-none transition-all ${
                          isPasswordMismatch
                            ? 'border-red-400 dark:border-red-600 focus:ring-2 focus:ring-red-400/20'
                            : 'border-[#E2E8F0] dark:border-[#1D3048] focus:border-[#126BEB] dark:focus:border-[#1677FF] focus:ring-2 focus:ring-[#126BEB]/10'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                        aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                      >
                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Mismatch Error placed directly below confirm password */}
                    {isPasswordMismatch && (
                      <p className="text-red-500 text-xs mt-1.5 flex items-center gap-1 font-medium">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Passwords do not match</span>
                      </p>
                    )}
                  </div>

                  {/* Submit Button */}
                  <div className="pt-3">
                    <button
                      type="submit"
                      disabled={isSubmitting || isPasswordMismatch}
                      className="w-full py-3 px-4 rounded-xl font-semibold text-sm text-white bg-[#126BEB] hover:bg-[#0B5CC7] dark:bg-[#1677FF] dark:hover:bg-[#0B63CE] transition-all duration-150 shadow-md flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? (
                        <>
                          <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          <span>Creating Merchant Account...</span>
                        </>
                      ) : (
                        <span>Create Merchant Account</span>
                      )}
                    </button>
                  </div>
                </form>

                {/* Terms Notice */}
                <p className="text-center text-[11px] text-slate-400 dark:text-slate-500 mt-5 leading-normal">
                  By registering, you agree to BAXATO&apos;s{' '}
                  <span className="text-[#126BEB] dark:text-[#1677FF] hover:underline cursor-pointer">Terms of Service</span>{' '}
                  and{' '}
                  <span className="text-[#126BEB] dark:text-[#1677FF] hover:underline cursor-pointer">Privacy Policy</span>.
                </p>

                {/* Bottom Sign In Link */}
                <div className="text-center mt-6 pt-5 border-t border-[#E2E8F0] dark:border-[#1D3048]">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Already have a BAXATO merchant account?{' '}
                    <Link
                      href="/login"
                      className="font-semibold text-[#126BEB] dark:text-[#1677FF] hover:underline"
                    >
                      Sign in here
                    </Link>
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Slide-in floating error toast at bottom of screen */}
      <AnimatePresence>
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 max-w-md w-full px-4"
          >
            <div className="bg-red-600 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center justify-between gap-3 text-xs font-medium">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="text-white/80 hover:text-white text-base leading-none px-1"
                aria-label="Dismiss error"
              >
                &times;
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Corporate Legal Footer */}
      <footer className="w-full py-5 text-center text-xs text-slate-400 dark:text-slate-500 border-t border-[#E2E8F0] dark:border-[#1D3048]">
        <p>&copy; 2026 XATO TECHNOLOGIES LIMITED. All rights reserved.</p>
      </footer>
    </div>
  );
}
