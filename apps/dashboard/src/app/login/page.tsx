'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
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
} from 'lucide-react';
import { useClerk } from '@clerk/nextjs';
import ThemeToggle from '@/components/ThemeToggle';

export default function LoginPage() {
  const router = useRouter();
  const clerk = useClerk();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    if (!clerk.loaded || !clerk.client) {
      setErrorMessage('Authentication service initializing. Please retry in a moment.');
      return;
    }

    setIsSubmitting(true);

    try {
      const signInResult = await clerk.client.signIn.create({
        identifier: email.toLowerCase().trim(),
        password,
      });

      if (signInResult.status === 'complete' && signInResult.createdSessionId) {
        await clerk.setActive({ session: signInResult.createdSessionId });
        router.push('/dashboard');
      } else {
        router.push('/dashboard');
      }
    } catch (err: unknown) {
      const clerkErr = err as { errors?: Array<{ message?: string; longMessage?: string }> };
      const msg = clerkErr?.errors?.[0]?.longMessage || clerkErr?.errors?.[0]?.message || 'Invalid email or password.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-slate-50 dark:bg-[#070D18] text-slate-800 dark:text-slate-200 transition-colors duration-200">
      {/* LEFT SIDE: Brand Showcase (Desktop) */}
      <section className="hidden lg:flex lg:w-1/2 bg-slate-100/80 dark:bg-[#060D1A] text-slate-900 dark:text-white p-12 xl:p-16 flex-col justify-between relative border-r border-slate-200 dark:border-slate-800/80">
        <div className="absolute inset-0 z-0 pointer-events-none hidden dark:block">
          <Image
            src="/fintech-bg.jpg"
            alt="BAXATO Fintech Infrastructure"
            fill
            priority
            className="object-cover opacity-35 mix-blend-luminosity scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#060D18] via-[#060D18]/80 to-[#060D18]/50" />
        </div>
        <div className="absolute inset-0 z-0 pointer-events-none dark:hidden bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-blue-100/60 via-slate-100/40 to-transparent" />

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

        <div className="relative z-10 max-w-lg my-10">
          <h2 className="text-3xl xl:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-tight">
            High-Throughput Telecom Infrastructure &amp; Utility Clearing
          </h2>
          <p className="text-slate-600 dark:text-slate-300 text-sm leading-relaxed mt-4 font-normal">
            Log in to manage your settlement accounts, track live vending volume, and generate production developer API keys.
          </p>

          <div className="grid grid-cols-2 gap-4 mt-8">
            <div className="p-4 rounded-xl bg-white/90 dark:bg-white/[0.05] border border-slate-200/90 dark:border-white/10 shadow-sm backdrop-blur-md">
              <CreditCard className="w-5 h-5 text-[#126BEB] mb-2" />
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">Automated Settlement</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Instant commission ledger</p>
            </div>
            <div className="p-4 rounded-xl bg-white/90 dark:bg-white/[0.05] border border-slate-200/90 dark:border-white/10 shadow-sm backdrop-blur-md">
              <Lock className="w-5 h-5 text-[#126BEB] mb-2" />
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">Bank-Grade Ledger</h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Double-entry accounting</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-xs text-slate-500 dark:text-slate-400">
          &copy; 2026 XATO TECHNOLOGIES LIMITED. All rights reserved.
        </div>
      </section>

      {/* RIGHT SIDE: Login Form */}
      <section className="flex-1 flex flex-col justify-between p-6 sm:p-12 lg:p-16 max-w-2xl mx-auto w-full">
        <div className="flex justify-between items-center w-full mb-8">
          <Link href="/" className="lg:hidden flex items-center gap-2">
            <div className="relative w-8 h-8 rounded-xl overflow-hidden border border-slate-200 shadow-sm p-0.5">
              <Image src="/baxato-logo.jpg" alt="BAXATO" fill priority className="object-contain" />
            </div>
            <span className="font-extrabold text-lg text-slate-900 dark:text-white">BAXATO</span>
          </Link>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>

        <div className="w-full max-w-md mx-auto my-auto">
          <div className="text-center mb-8">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0B1220] dark:text-white">
              Sign in to your account
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              Access your BAXATO merchant operations console.
            </p>
          </div>

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
            <div>
              <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                Work Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="merchant@example.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-[#1E2D44] bg-white dark:bg-[#0B1322] text-slate-900 dark:text-white text-xs placeholder:text-slate-400 focus:outline-none focus:border-[#126BEB] focus:ring-1 focus:ring-[#126BEB] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-800 dark:text-slate-200 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-[#1E2D44] bg-white dark:bg-[#0B1322] text-slate-900 dark:text-white text-xs placeholder:text-slate-400 focus:outline-none focus:border-[#126BEB] focus:ring-1 focus:ring-[#126BEB] transition-colors"
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

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 inline-flex items-center justify-center gap-2 py-3 px-6 rounded-xl bg-[#126BEB] hover:bg-[#0B5CC7] text-white font-semibold text-xs tracking-wide transition-all shadow-md shadow-blue-500/20 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Merchant Console</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

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
        </div>

        <div className="w-full text-center text-[11px] text-slate-400 mt-8">
          Enterprise Security &amp; Telecom Gateway Managed by XATO TECHNOLOGIES LIMITED
        </div>
      </section>
    </div>
  );
}
