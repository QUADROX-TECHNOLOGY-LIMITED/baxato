'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  ArrowLeft,
  ShieldCheck,
} from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';

type LoginStep = 'credentials' | '2fa_verify';

export default function SuperAdminLoginPage() {
  const router = useRouter();

  // Primary credentials state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<LoginStep>('credentials');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 2FA Verification state
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [twoFactorPrompt, setTwoFactorPrompt] = useState('');

  // 1. Submit Primary Credentials
  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.toLowerCase().trim();

    // Corporate domain check
    if (!cleanEmail.endsWith('@baxato.com')) {
      setErrorMessage('Admin login requires an official @baxato.com email address.');
      return;
    }

    if (!password) {
      setErrorMessage('Password is required.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/admin/login', {
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
        return;
      }

      // Check for 2FA flow if enabled on account
      if (data.data?.requiresTwoFactor) {
        setTwoFactorPrompt(data.data.message || 'Enter your 2FA verification code.');
        setStep('2fa_verify');
        return;
      }

      // Complete login directly
      completeAdminSession(data.data);
    } catch {
      setErrorMessage('Network error during authentication. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Submit 2FA Verification Code
  const handleVerify2FaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanCode = twoFactorCode.trim();
    if (!cleanCode) {
      setErrorMessage('Please enter your 6-digit verification code.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/admin/login', {
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
        setErrorMessage(data?.error?.message || 'Invalid or expired 2FA code.');
        return;
      }

      completeAdminSession(data.data);
    } catch {
      setErrorMessage('Network error verifying 2FA code.');
    } finally {
      setIsLoading(false);
    }
  };

  // Common Session Completion
  const completeAdminSession = (data: any) => {
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
      window.location.assign('/admin/overview');
    } else {
      router.push('/admin/overview');
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center px-4 py-8 sm:py-12 bg-slate-50 dark:bg-[#070D18] text-slate-800 dark:text-slate-200 transition-colors duration-200 relative font-sans">
      {/* Top Bar with ThemeToggle */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <ThemeToggle />
      </div>

      {/* Main Container */}
      <div className="w-full max-w-sm sm:max-w-md">
        {/* Header Branding */}
        <div className="text-center mb-6">
          <div className="relative w-10 h-10 rounded-xl overflow-hidden shadow-sm border border-slate-200 dark:border-white/10 bg-white dark:bg-[#0A1324] p-1 mx-auto mb-3">
            <Image
              src="/baxato-logo.jpg"
              alt="Baxato"
              fill
              priority
              className="object-contain rounded-lg"
            />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Admin Sign in
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Sign in with your platform administrator credentials
          </p>
        </div>

        {/* Card Box */}
        <div className="bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm dark:shadow-xl transition-colors">
          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
              <div className="leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {/* STEP 1: PRIMARY CREDENTIALS */}
          {step === 'credentials' && (
            <form onSubmit={handleCredentialsSubmit} noValidate className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  required
                  autoFocus
                  placeholder="name@baxato.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0A1324] text-slate-900 dark:text-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#126BEB] transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0A1324] text-slate-900 dark:text-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#126BEB] transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#126BEB] hover:bg-[#0E58C4] text-white font-semibold text-sm transition-all shadow-sm shadow-blue-500/20 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <span>Sign in</span>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: 2FA VERIFICATION (WHEN ENABLED) */}
          {step === '2fa_verify' && (
            <form onSubmit={handleVerify2FaSubmit} noValidate className="space-y-4">
              <div className="text-center pb-1">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-[#126BEB] flex items-center justify-center mx-auto mb-2 border border-blue-200 dark:border-blue-900/50">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Two-Factor Authentication
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {twoFactorPrompt || 'Enter the 6-digit code from your authenticator app.'}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Verification Code
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  maxLength={8}
                  placeholder="000000"
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value.replace(/\s+/g, ''))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#0A1324] text-slate-900 dark:text-white text-center text-lg font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-[#126BEB] transition-colors"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading || !twoFactorCode.trim()}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#126BEB] hover:bg-[#0E58C4] text-white font-semibold text-sm transition-all shadow-sm shadow-blue-500/20 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <span>Verify &amp; Sign in</span>
                  )}
                </button>
              </div>

              <div className="pt-1 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setStep('credentials');
                    setErrorMessage(null);
                  }}
                  className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 inline-flex items-center gap-1.5 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to credentials</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer Legal Notice */}
        <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-6">
          &copy; {new Date().getFullYear()} XATO TECHNOLOGIES LIMITED. All rights reserved.
        </p>
      </div>
    </div>
  );
}
