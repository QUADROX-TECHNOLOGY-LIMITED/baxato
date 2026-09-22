'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { CheckCircle2, Sparkles } from 'lucide-react';
import ThemeToggle from '@/components/ThemeToggle';

export default function HomePage() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  // Countdown timer to launch date
  const [timeLeft, setTimeLeft] = useState({
    days: '14',
    hours: '08',
    mins: '45',
    secs: '30',
  });

  useEffect(() => {
    // Target: 14 days from now
    const target = new Date().getTime() + 14 * 24 * 60 * 60 * 1000;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const difference = target - now;

      if (difference > 0) {
        const d = Math.floor(difference / (1000 * 60 * 60 * 24));
        const h = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((difference % (1000 * 60)) / 1000);

        setTimeLeft({
          days: String(d).padStart(2, '0'),
          hours: String(h).padStart(2, '0'),
          mins: String(m).padStart(2, '0'),
          secs: String(s).padStart(2, '0'),
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleNotifyMe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#07111F] flex flex-col justify-between transition-colors duration-200">
      {/* Navigation */}
      <header className="w-full border-b border-[#E2E8F0] dark:border-[#1D3048] bg-white dark:bg-[#0B1728] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
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
            <span className="font-extrabold text-lg tracking-tight text-[#0B1220] dark:text-[#F8FAFC]">
              BAXATO
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-xl text-center">
          {/* Status Badge */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900/60 text-xs font-semibold text-[#126BEB] dark:text-[#1677FF] mb-6"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>COMING SOON</span>
          </motion.div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#0B1220] dark:text-[#F8FAFC] mb-4">
            We&apos;re Launching Soon.
          </h1>

          <p className="text-sm sm:text-base text-[#526173] dark:text-[#A8B5C7] max-w-lg mx-auto mb-8 leading-relaxed">
            BAXATO by <strong className="text-[#0B1220] dark:text-[#F8FAFC]">XATO TECHNOLOGIES LIMITED</strong>.
          </p>

          {/* Waitlist Form Card */}
          <div className="bg-white dark:bg-[#101F33] border border-[#E2E8F0] dark:border-[#1D3048] rounded-2xl p-6 sm:p-8 shadow-xl mb-8">
            {subscribed ? (
              <div className="flex items-center justify-center gap-2 text-emerald-600 dark:text-emerald-400 font-medium text-sm py-2">
                <CheckCircle2 className="w-5 h-5" />
                <span>Thank you! We will notify you as soon as we launch.</span>
              </div>
            ) : (
              <form onSubmit={handleNotifyMe} className="flex flex-col sm:flex-row gap-2.5">
                <input
                  type="email"
                  required
                  placeholder="Enter your email address..."
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-[#E2E8F0] dark:border-[#1D3048] bg-white dark:bg-[#07111F] text-[#0B1220] dark:text-[#F8FAFC] text-sm placeholder-slate-400 focus:outline-none focus:border-[#126BEB] dark:focus:border-[#1677FF]"
                />
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-[#126BEB] hover:bg-[#0B5CC7] dark:bg-[#1677FF] dark:hover:bg-[#0B63CE] text-white font-semibold text-sm transition-colors shadow-sm"
                >
                  Notify Me
                </button>
              </form>
            )}
          </div>

          {/* Countdown Clock */}
          <div className="inline-grid grid-cols-4 gap-3 text-center">
            <div className="bg-white dark:bg-[#101F33] border border-[#E2E8F0] dark:border-[#1D3048] rounded-xl px-4 py-3 shadow-sm min-w-[70px]">
              <span className="block text-2xl font-bold text-[#0B1220] dark:text-[#F8FAFC]">{timeLeft.days}</span>
              <span className="block text-[10px] font-semibold text-slate-400 tracking-wider">DAYS</span>
            </div>
            <div className="bg-white dark:bg-[#101F33] border border-[#E2E8F0] dark:border-[#1D3048] rounded-xl px-4 py-3 shadow-sm min-w-[70px]">
              <span className="block text-2xl font-bold text-[#0B1220] dark:text-[#F8FAFC]">{timeLeft.hours}</span>
              <span className="block text-[10px] font-semibold text-slate-400 tracking-wider">HOURS</span>
            </div>
            <div className="bg-white dark:bg-[#101F33] border border-[#E2E8F0] dark:border-[#1D3048] rounded-xl px-4 py-3 shadow-sm min-w-[70px]">
              <span className="block text-2xl font-bold text-[#0B1220] dark:text-[#F8FAFC]">{timeLeft.mins}</span>
              <span className="block text-[10px] font-semibold text-slate-400 tracking-wider">MINS</span>
            </div>
            <div className="bg-white dark:bg-[#101F33] border border-[#E2E8F0] dark:border-[#1D3048] rounded-xl px-4 py-3 shadow-sm min-w-[70px]">
              <span className="block text-2xl font-bold text-[#0B1220] dark:text-[#F8FAFC]">{timeLeft.secs}</span>
              <span className="block text-[10px] font-semibold text-slate-400 tracking-wider">SECS</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-5 text-center text-xs text-slate-400 dark:text-slate-500 border-t border-[#E2E8F0] dark:border-[#1D3048]">
        <p>&copy; 2026 XATO TECHNOLOGIES LIMITED. All rights reserved.</p>
      </footer>
    </div>
  );
}
