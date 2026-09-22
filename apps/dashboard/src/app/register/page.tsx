'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
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
    // Only accept numbers, max 11 digits
    const cleaned = e.target.value.replace(/\D/g, '').slice(0, 11);
    setFormData((prev) => ({ ...prev, phoneNumber: cleaned }));
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
      setErrorMessage('Please enter a valid phone number (at least 10 digits).');
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
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);

    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
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
        throw new Error(result.error?.message || result.message || 'Registration failed. Please verify your details.');
      }

      setIsRegistered(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unable to complete registration. Please try again.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#07111F] flex flex-col justify-between transition-colors duration-200">
      {/* Top Navbar */}
      <header className="w-full border-b border-[#E2E8F0] dark:border-[#1D3048] bg-white dark:bg-[#0B1728] px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="relative w-9 h-9 rounded-lg overflow-hidden border border-[#E2E8F0] dark:border-[#1D3048] shadow-sm">
            <Image
              src="/baxato-logo.jpg"
              alt="BAXATO Logo"
              fill
              priority
              className="object-contain"
            />
          </div>
          <div>
            <span className="font-extrabold text-lg tracking-tight text-[#0B1220] dark:text-[#F8FAFC] group-hover:text-[#126BEB] dark:group-hover:text-[#1677FF] transition-colors">
              BAXATO
            </span>
            <span className="block text-[10px] font-semibold text-slate-400 tracking-wider uppercase -mt-1">
              Infrastructure
            </span>
          </div>
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
                  Verify Your Email
                </h2>

                <p className="text-sm text-[#526173] dark:text-[#A8B5C7] mb-6 leading-relaxed">
                  We have dispatched an email confirmation link to{' '}
                  <span className="font-semibold text-[#0B1220] dark:text-[#F8FAFC]">{formData.email}</span> via ZeptoMail.
                  Please check your inbox or spam folder and click the link to activate your merchant console.
                </p>

                <div className="bg-slate-50 dark:bg-[#07111F] rounded-xl p-4 border border-[#E2E8F0] dark:border-[#1D3048] text-xs text-slate-500 dark:text-slate-400 mb-8 flex items-center gap-3 text-left">
                  <ShieldCheck className="w-5 h-5 text-[#126BEB] dark:text-[#1677FF] shrink-0" />
                  <span>
                    Your business <strong className="text-[#0B1220] dark:text-[#F8FAFC]">{formData.businessName}</strong>, main wallet, and commission wallets have been reserved.
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
                  <button
                    type="button"
                    onClick={() => setIsRegistered(false)}
                    className="px-6 py-3 rounded-xl border border-[#E2E8F0] dark:border-[#1D3048] text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#1A2E4C] font-medium text-sm transition-colors"
                  >
                    Back to Form
                  </button>
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
                  <div className="inline-flex items-center justify-center p-2 rounded-2xl bg-[#F8FAFC] dark:bg-[#07111F] border border-[#E2E8F0] dark:border-[#1D3048] mb-4 shadow-sm">
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
                  <p className="text-xs sm:text-sm text-[#526173] dark:text-[#A8B5C7] mt-1.5">
                    Start automating your telecom and bill payment operations in seconds.
                  </p>
                </div>

                {/* Error Banner */}
                {errorMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-6 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex items-start gap-2.5 text-xs text-red-700 dark:text-red-300"
                  >
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{errorMessage}</span>
                  </motion.div>
                )}

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
                        placeholder="e.g. Mukhtar"
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E8F0] dark:border-[#1D3048] bg-white dark:bg-[#07111F] text-[#0B1220] dark:text-[#F8FAFC] text-sm placeholder-slate-400 focus:outline-none focus:border-[#126BEB] dark:focus:border-[#1677FF] focus:ring-2 focus:ring-[#126BEB]/10 transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#0B1220] dark:text-[#F8FAFC] mb-1.5">
                        Last Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Aliyu"
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E8F0] dark:border-[#1D3048] bg-white dark:bg-[#07111F] text-[#0B1220] dark:text-[#F8FAFC] text-sm placeholder-slate-400 focus:outline-none focus:border-[#126BEB] dark:focus:border-[#1677FF] focus:ring-2 focus:ring-[#126BEB]/10 transition-all"
                      />
                    </div>
                  </div>

                  {/* Email Field */}
                  <div>
                    <label className="block text-xs font-semibold text-[#0B1220] dark:text-[#F8FAFC] mb-1.5">
                      Work / Business Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="merchant@yourcompany.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E8F0] dark:border-[#1D3048] bg-white dark:bg-[#07111F] text-[#0B1220] dark:text-[#F8FAFC] text-sm placeholder-slate-400 focus:outline-none focus:border-[#126BEB] dark:focus:border-[#1677FF] focus:ring-2 focus:ring-[#126BEB]/10 transition-all"
                    />
                  </div>

                  {/* Phone Number with +234 Flag Prefix */}
                  <div>
                    <label className="block text-xs font-semibold text-[#0B1220] dark:text-[#F8FAFC] mb-1.5">
                      Phone Number (WhatsApp Verified) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative flex rounded-lg border border-[#E2E8F0] dark:border-[#1D3048] overflow-hidden focus-within:border-[#126BEB] dark:focus-within:border-[#1677FF] focus-within:ring-2 focus-within:ring-[#126BEB]/10">
                      <span className="inline-flex items-center gap-1 px-3 bg-slate-50 dark:bg-[#0B1728] text-xs font-semibold text-slate-600 dark:text-slate-300 border-r border-[#E2E8F0] dark:border-[#1D3048] select-none">
                        <span>🇳🇬</span>
                        <span>+234</span>
                      </span>
                      <input
                        type="tel"
                        required
                        placeholder="801 234 5678"
                        value={formData.phoneNumber}
                        onChange={handlePhoneChange}
                        className="flex-1 px-3.5 py-2.5 bg-white dark:bg-[#07111F] text-[#0B1220] dark:text-[#F8FAFC] text-sm placeholder-slate-400 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Business Name */}
                  <div>
                    <label className="block text-xs font-semibold text-[#0B1220] dark:text-[#F8FAFC] mb-1.5">
                      Business or Enterprise Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Apex Telecom Ventures Ltd"
                      value={formData.businessName}
                      onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-lg border border-[#E2E8F0] dark:border-[#1D3048] bg-white dark:bg-[#07111F] text-[#0B1220] dark:text-[#F8FAFC] text-sm placeholder-slate-400 focus:outline-none focus:border-[#126BEB] dark:focus:border-[#1677FF] focus:ring-2 focus:ring-[#126BEB]/10 transition-all"
                    />
                  </div>

                  {/* Country & Location (Cascading State & LGA) */}
                  <div className="space-y-3.5 pt-1">
                    {/* Country Badge */}
                    <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50/80 dark:bg-[#07111F] border border-[#E2E8F0] dark:border-[#1D3048]">
                      <div className="flex items-center gap-2">
                        <span className="text-base">🇳🇬</span>
                        <div>
                          <span className="text-xs font-semibold text-[#0B1220] dark:text-[#F8FAFC]">
                            Country of Incorporation
                          </span>
                          <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                            Nigeria (Default)
                          </span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/60 text-[#126BEB] dark:text-[#1677FF] rounded border border-blue-200 dark:border-blue-900">
                        NG
                      </span>
                    </div>

                    {/* Cascading State & LGA Dropdowns */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
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
                  </div>

                  {/* Password & Confirm Password */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                    <div>
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
                          className="w-full pl-3.5 pr-10 py-2.5 rounded-lg border border-[#E2E8F0] dark:border-[#1D3048] bg-white dark:bg-[#07111F] text-[#0B1220] dark:text-[#F8FAFC] text-sm placeholder-slate-400 focus:outline-none focus:border-[#126BEB] dark:focus:border-[#1677FF] focus:ring-2 focus:ring-[#126BEB]/10 transition-all"
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
                    </div>

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
                          className="w-full pl-3.5 pr-10 py-2.5 rounded-lg border border-[#E2E8F0] dark:border-[#1D3048] bg-white dark:bg-[#07111F] text-[#0B1220] dark:text-[#F8FAFC] text-sm placeholder-slate-400 focus:outline-none focus:border-[#126BEB] dark:focus:border-[#1677FF] focus:ring-2 focus:ring-[#126BEB]/10 transition-all"
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
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-3">
                    <button
                      type="submit"
                      disabled={isSubmitting}
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

      {/* Corporate Legal Footer */}
      <footer className="w-full py-5 text-center text-xs text-slate-400 dark:text-slate-500 border-t border-[#E2E8F0] dark:border-[#1D3048]">
        <p>&copy; 2026 XATO TECHNOLOGIES LIMITED. All rights reserved.</p>
      </footer>
    </div>
  );
}
