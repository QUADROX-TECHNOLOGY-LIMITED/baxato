'use client';

import { useState, useMemo } from 'react';
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
  Zap,
  RefreshCw,
  Wallet,
  Server,
} from 'lucide-react';
import { nigeriaStates, nigeriaStatesList } from '@baxato/common';
import SearchableSelect from '@/components/SearchableSelect';
import { SignUp } from '@clerk/nextjs';

export default function RegisterPage() {
  const clerkPubKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
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
      lga: '', // Reset LGA when state changes
    }));
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = e.target.value.replace(/\D/g, '').slice(0, 11);
    setFormData((prev) => ({ ...prev, phoneNumber: cleaned }));
  };

  // Compact password strength evaluation
  const passwordStrength = useMemo(() => {
    const pwd = formData.password;
    if (!pwd) return { score: 0, label: '', percent: 0, color: '' };
    let score = 0;
    if (pwd.length >= 8) score += 1;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score += 1;
    if (/\d/.test(pwd) || /[^A-Za-z0-9]/.test(pwd)) score += 1;

    if (score === 1) return { score: 1, label: 'Weak', percent: 33, color: 'bg-red-500' };
    if (score === 2) return { score: 2, label: 'Fair', percent: 66, color: 'bg-amber-500' };
    return { score: 3, label: 'Strong', percent: 100, color: 'bg-emerald-500' };
  }, [formData.password]);

  const isValidEmail = useMemo(() => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email);
  }, [formData.email]);

  const passwordsMatch = useMemo(() => {
    if (!formData.confirmPassword) return null;
    return formData.password === formData.confirmPassword;
  }, [formData.password, formData.confirmPassword]);

  const isFormValid = useMemo(() => {
    return (
      formData.firstName.trim().length > 0 &&
      formData.lastName.trim().length > 0 &&
      isValidEmail &&
      formData.phoneNumber.length >= 10 &&
      formData.businessName.trim().length > 0 &&
      formData.state.length > 0 &&
      formData.lga.length > 0 &&
      formData.password.length >= 8 &&
      formData.password === formData.confirmPassword
    );
  }, [formData, isValidEmail]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setErrorMessage('Please provide both your first and last name.');
      return;
    }
    if (!formData.email.trim() || !isValidEmail) {
      setErrorMessage('Please enter a valid work email address.');
      return;
    }
    if (formData.phoneNumber.length < 10) {
      setErrorMessage('Please enter an 11-digit WhatsApp phone number.');
      return;
    }
    if (!formData.businessName.trim()) {
      setErrorMessage('Please provide your business or enterprise name.');
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
      setErrorMessage('Password must be at least 8 characters.');
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
    <div className="min-h-screen flex flex-col lg:flex-row bg-white">
      {/* ======================================================== */}
      {/* LEFT SIDE: Brand Showcase & Value Proposition (Desktop)   */}
      {/* ======================================================== */}
      <section className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#071328] via-[#091D3E] to-[#040A15] text-white p-12 xl:p-16 flex-col justify-between relative overflow-hidden">
        {/* Soft Ambient Radial Glows */}
        <div className="w-[30rem] h-[30rem] bg-[#126BEB]/20 rounded-full blur-[130px] absolute -top-24 -left-24 pointer-events-none" />
        <div className="w-[26rem] h-[26rem] bg-[#1677FF]/15 rounded-full blur-[120px] absolute -bottom-24 -right-24 pointer-events-none" />

        {/* Top Logo */}
        <div className="relative z-10">
          <Link href="/" className="inline-flex items-center gap-3 group">
            <div className="relative w-10 h-10 rounded-xl overflow-hidden shadow-lg border border-white/10 group-hover:scale-105 transition-transform">
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

        {/* Center: Showcase Content / Value Propositions */}
        <div className="relative z-10 max-w-lg my-12">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/15 border border-blue-400/25 text-blue-300 text-xs font-semibold uppercase tracking-wider mb-6">
            <span>Enterprise Infrastructure</span>
          </div>

          <h2 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-white leading-tight">
            Nigeria&apos;s High-Speed Telecom &amp; Bill Payment Platform
          </h2>

          <p className="text-slate-300 text-sm leading-relaxed mt-4">
            Engineered for high-throughput telecom vending, automated virtual accounts, and instant STS utility token generation.
          </p>

          {/* 4 Feature Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
            <div className="p-4 rounded-xl bg-white/[0.04] border border-white/10 backdrop-blur-sm">
              <div className="w-8 h-8 rounded-lg bg-[#126BEB]/20 text-[#38BDF8] flex items-center justify-center mb-2.5">
                <Zap className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-white">Sub-Second STS Vending</h4>
              <p className="text-xs text-slate-400 mt-1 leading-normal">
                Direct DISCO token generation with automated retrieval.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.04] border border-white/10 backdrop-blur-sm">
              <div className="w-8 h-8 rounded-lg bg-[#126BEB]/20 text-[#38BDF8] flex items-center justify-center mb-2.5">
                <RefreshCw className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-white">Dual Provider Failover</h4>
              <p className="text-xs text-slate-400 mt-1 leading-normal">
                Smart routing between Interswitch and Monnify.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.04] border border-white/10 backdrop-blur-sm">
              <div className="w-8 h-8 rounded-lg bg-[#126BEB]/20 text-[#38BDF8] flex items-center justify-center mb-2.5">
                <Wallet className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-white">Multi-Tenant Wallets</h4>
              <p className="text-xs text-slate-400 mt-1 leading-normal">
                Auto-provisioned main and commission wallets.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-white/[0.04] border border-white/10 backdrop-blur-sm">
              <div className="w-8 h-8 rounded-lg bg-[#126BEB]/20 text-[#38BDF8] flex items-center justify-center mb-2.5">
                <Server className="w-4 h-4" />
              </div>
              <h4 className="text-sm font-bold text-white">99.99% Uptime SLA</h4>
              <p className="text-xs text-slate-400 mt-1 leading-normal">
                Cryptographic audit trails and instant webhooks.
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
      {/* RIGHT SIDE: Authentication / Registration Form           */}
      {/* ======================================================== */}
      <section className="w-full lg:w-1/2 flex flex-col justify-center items-center p-6 sm:p-12 xl:p-16 bg-white overflow-y-auto min-h-screen">
        <div className="w-full max-w-md mx-auto">
          {/* Mobile Top Branding */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="relative w-9 h-9 rounded-xl overflow-hidden shadow-sm border border-slate-200">
              <Image
                src="/baxato-logo.jpg"
                alt="BAXATO Logo"
                fill
                priority
                className="object-contain"
              />
            </div>
            <span className="font-extrabold text-xl tracking-tight text-[#0B1220]">
              BAXATO
            </span>
          </div>

          <AnimatePresence mode="wait">
            {isClerkConfigured ? (
              /* ==================================================== */
              /* CLERK AUTH COMPONENT (Customized with BAXATO tokens) */
              /* ==================================================== */
              <motion.div
                key="clerk-signup"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-full"
              >
                <div className="mb-6">
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0B1220]">
                    Create your account
                  </h1>
                  <p className="text-sm text-slate-500 mt-1.5">
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
                        'border-2 border-slate-200 rounded-xl px-4 py-3 text-sm focus:border-[#126BEB] focus:ring-0',
                      footerActionLink: 'text-[#126BEB] hover:text-[#0B5CC7] font-semibold',
                    },
                  }}
                  routing="hash"
                  signInUrl="/login"
                />
              </motion.div>
            ) : isRegistered ? (
              /* ==================================================== */
              /* SUCCESS PROVISIONED STATE                            */
              /* ==================================================== */
              <motion.div
                key="success-screen"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="text-center py-6"
              >
                <div className="w-16 h-16 bg-blue-50 text-[#126BEB] rounded-2xl flex items-center justify-center mx-auto mb-6 border border-blue-100 shadow-sm">
                  <CheckCircle2 className="w-9 h-9" />
                </div>

                <h2 className="text-2xl sm:text-3xl font-bold text-[#0B1220] tracking-tight mb-2">
                  Account Provisioned
                </h2>

                <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                  Your merchant enterprise account for{' '}
                  <strong className="text-[#0B1220]">{formData.businessName}</strong> has been
                  initialized successfully.
                </p>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-600 mb-8 text-left flex items-start gap-3">
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
              /* SEAMLESS REGISTRATION FORM (NO CARD ON CARD)         */
              /* ==================================================== */
              <motion.div
                key="form-screen"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="w-full"
              >
                {/* Header */}
                <div className="mb-8">
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0B1220]">
                    Create your account
                  </h1>
                  <p className="text-sm text-slate-500 mt-1.5">
                    Start vending telecom and utility services with BAXATO.
                  </p>
                </div>

                {/* Error Banner */}
                {errorMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2.5 mb-6"
                  >
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                    <span>{errorMessage}</span>
                  </motion.div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Name Fields: First & Last Name */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                        First Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="John"
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#126BEB] transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                        Last Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Doe"
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#126BEB] transition-colors"
                      />
                    </div>
                  </div>

                  {/* Work Email */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                      Work / Business Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="alex@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className={`w-full px-4 py-3 rounded-xl border-2 text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none transition-colors ${
                        formData.email && !isValidEmail
                          ? 'border-red-300 focus:border-red-500'
                          : 'border-slate-200 focus:border-[#126BEB]'
                      }`}
                    />
                    {formData.email && !isValidEmail && (
                      <p className="text-[11px] text-red-500 font-medium mt-1">
                        Please enter a valid email address.
                      </p>
                    )}
                  </div>

                  {/* WhatsApp Phone Number */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                      WhatsApp Phone Number <span className="text-red-500">*</span>
                    </label>
                    <div className="relative flex items-center">
                      <div className="absolute left-3.5 pointer-events-none text-slate-500 text-sm font-medium flex items-center gap-1.5 border-r border-slate-200 pr-2.5">
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
                        className="w-full pl-24 pr-4 py-3 rounded-xl border-2 border-slate-200 text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#126BEB] transition-colors"
                      />
                    </div>
                  </div>

                  {/* Business Name */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                      Business or Enterprise Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Apex Telecom Limited"
                      value={formData.businessName}
                      onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border-2 border-slate-200 text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#126BEB] transition-colors"
                    />
                  </div>

                  {/* State & LGA */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-800 mb-1.5">
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
                      <label className="block text-xs font-semibold text-slate-800 mb-1.5">
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
                      <label className="block text-xs font-semibold text-slate-800 mb-1.5">
                        Password <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          placeholder="Min 8 characters"
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          className="w-full px-4 py-3 pr-10 rounded-xl border-2 border-slate-200 text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#126BEB] transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>

                      {/* Compact password meter directly under input */}
                      {formData.password && (
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                              style={{ width: `${passwordStrength.percent}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-semibold text-slate-400">
                            {passwordStrength.label}
                          </span>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-800 mb-1.5">
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
                          className={`w-full px-4 py-3 pr-10 rounded-xl border-2 text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none transition-colors ${
                            passwordsMatch === false
                              ? 'border-red-300 focus:border-red-500'
                              : 'border-slate-200 focus:border-[#126BEB]'
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
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
                        <p className="text-[11px] font-medium text-emerald-600 flex items-center gap-1 mt-1">
                          <Check className="w-3.5 h-3.5" />
                          <span>Passwords match</span>
                        </p>
                      )}
                      {passwordsMatch === false && (
                        <p className="text-[11px] font-medium text-red-500 flex items-center gap-1 mt-1">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Passwords do not match</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-3">
                    <button
                      type="submit"
                      disabled={isSubmitting || !isFormValid}
                      className="w-full py-3.5 px-6 rounded-xl bg-[#126BEB] hover:bg-[#0B5CC7] text-white font-semibold text-sm transition-all shadow-md shadow-blue-500/20 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? 'Creating Account...' : 'Create Account'}
                    </button>
                  </div>
                </form>

                {/* Bottom Sign-In Link (NOT IN THE HEADER!) */}
                <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                  <p className="text-xs text-slate-500">
                    Already have a BAXATO merchant account?{' '}
                    <Link
                      href="/login"
                      className="text-[#126BEB] font-semibold hover:underline"
                    >
                      Sign In
                    </Link>
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>
    </div>
  );
}
