'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { CheckCircle2, Sparkles } from 'lucide-react';

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
    <div className="min-h-screen bg-white text-[#0B1220] flex flex-col justify-between selection:bg-blue-100 selection:text-[#126BEB] relative overflow-x-hidden font-sans">
      {/* Soft Ambient Blue Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80vw] h-[50vh] bg-[#126BEB]/5 rounded-[100%] blur-[120px] pointer-events-none" />

      {/* Navigation */}
      <header className="w-full border-b border-slate-200 bg-white/95 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="relative w-8 h-8 rounded-xl overflow-hidden border border-slate-200 shadow-sm">
            <Image
              src="/baxato-logo.jpg"
              alt="BAXATO Logo"
              fill
              priority
              className="object-contain"
            />
          </div>
          <div>
            <span className="font-extrabold text-lg tracking-tight text-[#0B1220]">
              BAXATO
            </span>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex items-center justify-center p-6 sm:p-12 z-10">
        <div className="w-full max-w-xl text-center">
          {/* Status Badge */}
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-xs font-semibold text-[#126BEB] mb-6 shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#126BEB]" />
            <span>Coming Soon</span>
          </motion.div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#0B1220] mb-4 leading-tight">
            We&apos;re Launching Soon
          </h1>

          <p className="text-sm text-slate-500 max-w-lg mx-auto mb-8 leading-relaxed">
            BAXATO by <strong className="text-[#0B1220] font-semibold">XATO TECHNOLOGIES LIMITED</strong>.
          </p>

          {/* Waitlist Form Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 sm:p-8 mb-8">
            {subscribed ? (
              <div className="flex items-center justify-center gap-2 text-emerald-600 font-semibold text-sm py-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>Thank you! We will notify you as soon as we launch.</span>
              </div>
            ) : (
              <form onSubmit={handleNotifyMe} className="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  required
                  placeholder="Enter your work email address..."
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 px-4 py-3 rounded-xl border border-slate-200 bg-white text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:border-[#126BEB] focus:ring-2 focus:ring-[#126BEB]/10 transition-colors"
                />
                <button
                  type="submit"
                  className="px-6 py-3 rounded-xl bg-[#126BEB] hover:bg-[#0B5CC7] text-white font-semibold text-sm transition-all shadow-sm shadow-blue-500/20 active:scale-[0.98]"
                >
                  Notify Me
                </button>
              </form>
            )}
          </div>

          {/* Countdown Clock */}
          <div className="inline-grid grid-cols-4 gap-3 text-center">
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 min-w-[70px]">
              <span className="block text-2xl font-bold text-[#0B1220] font-mono">{timeLeft.days}</span>
              <span className="block text-[10px] font-semibold text-slate-400 tracking-wider mt-0.5">DAYS</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 min-w-[70px]">
              <span className="block text-2xl font-bold text-[#0B1220] font-mono">{timeLeft.hours}</span>
              <span className="block text-[10px] font-semibold text-slate-400 tracking-wider mt-0.5">HOURS</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 min-w-[70px]">
              <span className="block text-2xl font-bold text-[#0B1220] font-mono">{timeLeft.mins}</span>
              <span className="block text-[10px] font-semibold text-slate-400 tracking-wider mt-0.5">MINS</span>
            </div>
            <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 min-w-[70px]">
              <span className="block text-2xl font-bold text-[#0B1220] font-mono">{timeLeft.secs}</span>
              <span className="block text-[10px] font-semibold text-slate-400 tracking-wider mt-0.5">SECS</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-6 text-center text-xs font-medium text-slate-500 border-t border-slate-200 bg-white">
        <p>&copy; 2026 XATO TECHNOLOGIES LIMITED. All rights reserved.</p>
      </footer>
    </div>
  );
}
