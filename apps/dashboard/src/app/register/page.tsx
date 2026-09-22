'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, CheckCircle2, AlertCircle, ArrowRight, ShieldCheck } from 'lucide-react';
import { nigeriaStates, nigeriaStatesList } from '@baxato/common';
import SearchableSelect from '@/components/SearchableSelect';

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

  // Password Strength Calculation
  const passwordStrength = useMemo(() => {
    const pwd = formData.password;
    if (!pwd) return { score: 0, label: '', percent: 0, color: '' };
    let score = 0;
    if (pwd.length >= 8) score += 1;
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score += 1;
    if (/\d/.test(pwd) || /[^A-Za-z0-9]/.test(pwd)) score += 1;

    if (score === 1) return { score: 1, label: 'Weak', percent: 33, color: 'bg-red-500' };
    if (score === 2) return { score: 2, label: 'Moderate', percent: 66, color: 'bg-amber-500' };
    return { score: 3, label: 'Strong', percent: 100, color: 'bg-emerald-600' };
  }, [formData.password]);

  const isValidEmail = useMemo(() => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email);
  }, [formData.email]);

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

    // Form validations
    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setErrorMessage('Please provide both first and last name.');
      return;
    }
    if (!formData.email.trim() || !isValidEmail) {
      setErrorMessage('Please enter a valid work email address.');
      return;
    }
    if (formData.phoneNumber.length < 10) {
      setErrorMessage('Please enter a valid WhatsApp phone number (at least 10 digits).');
      return;
    }
    if (!formData.businessName.trim()) {
      setErrorMessage('Please provide your registered business or enterprise name.');
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

  const inputStyle =
    'w-full bg-white border-2 border-stone-200 rounded-xl px-4 py-3.5 text-stone-900 font-medium placeholder-stone-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors text-sm';

  return (
    <main className="min-h-screen selection:bg-amber-200 selection:text-stone-900 relative overflow-x-hidden font-sans bg-[#FAFAF9] text-stone-900 flex flex-col justify-between">
      {/* Warm Ambient Glow Aura */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80vw] h-[50vh] bg-amber-500/5 rounded-[100%] blur-[120px] pointer-events-none" />

      {/* Slim Top Navigation Header */}
      <header className="sticky top-0 inset-x-0 z-40 border-b border-stone-200 bg-white/95 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="relative w-8 h-8 rounded-full overflow-hidden border border-stone-200">
              <Image
                src="/baxato-logo.jpg"
                alt="BAXATO Logo"
                fill
                priority
                className="object-contain"
              />
            </div>
            <span className="font-black text-stone-900 text-lg uppercase tracking-[0.2em]">
              BAXATO
            </span>
          </Link>

          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-xs font-bold text-stone-500 uppercase tracking-wider">
              Already registered?
            </span>
            <Link
              href="/login"
              className="text-[11px] uppercase tracking-[0.15em] font-bold text-stone-900 border-2 border-stone-900 px-5 py-2 rounded-full hover:bg-stone-900 hover:text-white transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </header>

      {/* Main Registration Content */}
      <section className="flex-1 flex items-center justify-center px-4 py-12 sm:px-6 z-10">
        <div className="w-full max-w-xl mx-auto">
          <AnimatePresence mode="wait">
            {isRegistered ? (
              /* Success Confirmation Card */
              <motion.div
                key="success-card"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
                className="bg-white border-2 border-stone-200 rounded-3xl p-8 sm:p-12 shadow-xl shadow-stone-900/5 text-center"
              >
                <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-6 border-2 border-amber-200 shadow-sm">
                  <CheckCircle2 className="w-9 h-9" />
                </div>

                <p className="text-[10px] text-stone-500 uppercase tracking-[0.2em] font-black mb-2">
                  Account Provisioned
                </p>
                <h2 className="text-2xl sm:text-3xl font-black text-stone-900 uppercase tracking-[0.1em] mb-3">
                  Registration Complete
                </h2>

                <p className="text-sm text-stone-600 mb-8 leading-relaxed max-w-md mx-auto">
                  Your merchant enterprise account for{' '}
                  <strong className="text-stone-900 font-bold">{formData.businessName}</strong> has
                  been initialized.
                </p>

                <div className="bg-amber-50/70 border-l-4 border-amber-500 rounded-r-xl p-4 text-xs text-stone-700 mb-8 text-left flex items-center gap-3">
                  <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0" />
                  <span>
                    Your secure merchant wallet has been initialized. You may now proceed directly
                    to sign in to your merchant dashboard.
                  </span>
                </div>

                <Link
                  href="/login"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-stone-900 text-white font-bold py-4 px-8 uppercase tracking-[0.15em] text-sm hover:bg-amber-600 transition-all duration-300 shadow-lg shadow-stone-900/10 active:scale-[0.98]"
                >
                  Proceed to Sign In
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </motion.div>
            ) : (
              /* Registration Form Card */
              <motion.div
                key="register-card"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="bg-white border-2 border-stone-200 rounded-3xl p-6 sm:p-10 shadow-xl shadow-stone-900/5"
              >
                {/* Brand Header */}
                <div className="text-center mb-8">
                  <div className="w-14 h-14 mx-auto rounded-full border-2 border-stone-200 p-2.5 bg-white flex items-center justify-center mb-4 shadow-sm">
                    <div className="relative w-full h-full">
                      <Image
                        src="/baxato-logo.jpg"
                        alt="BAXATO Logo"
                        fill
                        priority
                        className="object-contain"
                      />
                    </div>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-black text-stone-900 uppercase tracking-[0.1em]">
                    Merchant Registration
                  </h1>
                  <p className="text-[11px] text-stone-500 uppercase tracking-[0.2em] font-bold mt-2">
                    Create your enterprise BAXATO account
                  </p>
                </div>

                {/* Error Banner */}
                {errorMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-xl bg-red-50 border-2 border-red-200 text-red-700 text-xs font-semibold flex items-center gap-3 mb-6"
                  >
                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                    <span>{errorMessage}</span>
                  </motion.div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Name Fields: First Name & Last Name */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black text-stone-900 uppercase tracking-widest mb-2">
                        First Name <span className="text-amber-600">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. John"
                        value={formData.firstName}
                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                        className={inputStyle}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-stone-900 uppercase tracking-widest mb-2">
                        Last Name <span className="text-amber-600">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Doe"
                        value={formData.lastName}
                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                        className={inputStyle}
                      />
                    </div>
                  </div>

                  {/* Work Email Address */}
                  <div>
                    <label className="block text-xs font-black text-stone-900 uppercase tracking-widest mb-2">
                      Work / Business Email <span className="text-amber-600">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. alex@example.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className={`${inputStyle} ${
                        formData.email && !isValidEmail ? 'border-red-300 focus:border-red-500' : ''
                      }`}
                    />
                    {formData.email && !isValidEmail && (
                      <p className="text-[10px] text-red-500 font-bold mt-1.5 uppercase tracking-wider">
                        Please enter a valid email format.
                      </p>
                    )}
                  </div>

                  {/* WhatsApp Phone Number */}
                  <div>
                    <label className="block text-xs font-black text-stone-900 uppercase tracking-widest mb-2">
                      WhatsApp Phone Number <span className="text-amber-600">*</span>
                    </label>
                    <div className="relative flex items-center">
                      <div className="absolute left-4 pointer-events-none text-stone-500 text-sm font-bold flex items-center gap-1.5 border-r border-stone-200 pr-3">
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
                        className={`${inputStyle} pl-24`}
                      />
                    </div>
                    <p className="text-[10px] text-stone-400 font-medium mt-1.5">
                      11-digit WhatsApp-enabled mobile number for alerts.
                    </p>
                  </div>

                  {/* Business Name */}
                  <div>
                    <label className="block text-xs font-black text-stone-900 uppercase tracking-widest mb-2">
                      Business or Enterprise Name <span className="text-amber-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Apex Telecom Services"
                      value={formData.businessName}
                      onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                      className={inputStyle}
                    />
                  </div>

                  {/* Country & State */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black text-stone-900 uppercase tracking-widest mb-2">
                        Country
                      </label>
                      <div className="w-full bg-stone-100 border-2 border-stone-200 rounded-xl px-4 py-3.5 text-stone-700 font-medium flex items-center gap-2 cursor-not-allowed text-sm">
                        <span>🇳🇬</span>
                        <span>Nigeria</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-black text-stone-900 uppercase tracking-widest mb-2">
                        State <span className="text-amber-600">*</span>
                      </label>
                      <SearchableSelect
                        id="state-select"
                        options={nigeriaStatesList}
                        placeholder="Select State..."
                        value={formData.state}
                        onChange={handleStateChange}
                      />
                    </div>
                  </div>

                  {/* LGA / City Cascading Selector */}
                  <div>
                    <div className="flex justify-between items-end mb-2">
                      <label className="block text-xs font-black text-stone-900 uppercase tracking-widest">
                        LGA / City <span className="text-amber-600">*</span>
                      </label>
                      {!formData.state && (
                        <span className="text-[10px] text-stone-400 font-bold uppercase tracking-wider">
                          Select State first
                        </span>
                      )}
                    </div>
                    <SearchableSelect
                      id="lga-select"
                      options={availableLgas}
                      placeholder={formData.state ? 'Select LGA...' : 'Select State first...'}
                      value={formData.lga}
                      onChange={(lga) => setFormData({ ...formData, lga })}
                      disabled={!formData.state}
                    />
                  </div>

                  {/* Password & Confirm Password */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black text-stone-900 uppercase tracking-widest mb-2">
                        Password <span className="text-amber-600">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          placeholder="Min 8 characters"
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          className={`${inputStyle} pr-12`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-black text-stone-900 uppercase tracking-widest mb-2">
                        Confirm Password <span className="text-amber-600">*</span>
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
                          className={`${inputStyle} pr-12 ${
                            formData.confirmPassword &&
                            formData.password !== formData.confirmPassword
                              ? 'border-red-300 focus:border-red-500'
                              : ''
                          }`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 transition-colors"
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Password Strength Indicator */}
                  {formData.password && (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-stone-500">
                        <span>Password Strength</span>
                        <span
                          className={
                            passwordStrength.score === 1
                              ? 'text-red-500'
                              : passwordStrength.score === 2
                              ? 'text-amber-600'
                              : 'text-emerald-600'
                          }
                        >
                          {passwordStrength.label}
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-stone-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-300 ${passwordStrength.color}`}
                          style={{ width: `${passwordStrength.percent}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Submit CTA Button */}
                  <div className="pt-4">
                    <button
                      type="submit"
                      disabled={isSubmitting || !isFormValid}
                      className="w-full rounded-full bg-stone-900 text-white font-bold py-4 px-8 uppercase tracking-[0.15em] text-sm transition-all duration-300 hover:bg-amber-600 hover:shadow-[0_10px_25px_rgba(217,119,6,0.3)] active:scale-[0.98] disabled:opacity-40 disabled:hover:bg-stone-900 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? 'Creating Account...' : 'Create Account'}
                    </button>
                  </div>
                </form>

                {/* Footer Switcher */}
                <div className="mt-8 pt-6 border-t border-stone-100 text-center">
                  <p className="text-xs font-bold text-stone-500">
                    Already have a BAXATO merchant account?{' '}
                    <Link
                      href="/login"
                      className="text-stone-900 hover:text-amber-600 uppercase tracking-wider underline transition-colors"
                    >
                      Sign in here
                    </Link>
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* Corporate Legal Footer */}
      <footer className="border-t border-stone-200 bg-white py-6 text-center text-xs font-medium text-stone-500">
        <p>© 2026 XATO TECHNOLOGIES LIMITED. All rights reserved.</p>
      </footer>
    </main>
  );
}
