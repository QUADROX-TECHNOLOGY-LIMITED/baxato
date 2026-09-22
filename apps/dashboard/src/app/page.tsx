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
    <div className="min-h-screen bg-[#FAFAF9] text-stone-900 flex flex-col justify-between selection:bg-amber-200 selection:text-stone-900 relative overflow-x-hidden font-sans">
      {/* Warm Ambient Glow Aura */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[80vw] h-[50vh] bg-amber-500/5 rounded-[100%] blur-[120px] pointer-events-none" />

      {/* Navigation */}
      <header className="w-full border-b border-stone-200 bg-white/95 backdrop-blur-md px-6 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="relative w-8 h-8 rounded-full overflow-hidden border border-stone-200 shadow-sm">
            <Image
              src="/baxato-logo.jpg"
              alt="BAXATO Logo"
              fill
              priority
              className="object-contain"
            />
          </div>
          <div>
            <span className="font-black text-lg uppercase tracking-[0.2em] text-stone-900">
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
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-50 border-2 border-amber-200 text-xs font-black uppercase tracking-widest text-amber-700 mb-6 shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
            <span>Coming Soon</span>
          </motion.div>

          <h1 className="text-3xl sm:text-5xl font-black uppercase tracking-[0.1em] text-stone-900 mb-4 leading-tight">
            We&apos;re Launching Soon
          </h1>

          <p className="text-xs sm:text-sm text-stone-500 uppercase tracking-widest font-bold max-w-lg mx-auto mb-8">
            BAXATO by XATO TECHNOLOGIES LIMITED
          </p>

          {/* Waitlist Form Card */}
          <div className="bg-white border-2 border-stone-200 rounded-3xl p-6 sm:p-8 shadow-xl shadow-stone-900/5 mb-8">
            {subscribed ? (
              <div className="flex items-center justify-center gap-2 text-stone-900 font-bold text-sm py-2">
                <CheckCircle2 className="w-5 h-5 text-amber-600" />
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
                  className="flex-1 px-4 py-3.5 rounded-xl border-2 border-stone-200 bg-white text-stone-900 text-sm font-medium placeholder-stone-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-colors"
                />
                <button
                  type="submit"
                  className="px-8 py-3.5 rounded-full bg-stone-900 hover:bg-amber-600 text-white font-bold uppercase tracking-[0.15em] text-xs transition-all duration-300 shadow-md shadow-stone-900/10 active:scale-[0.98]"
                >
                  Notify Me
                </button>
              </form>
            )}
          </div>

          {/* Countdown Clock */}
          <div className="inline-grid grid-cols-4 gap-3 text-center">
            <div className="bg-white border-2 border-stone-200 rounded-2xl px-4 py-3 shadow-sm min-w-[70px]">
              <span className="block text-2xl font-black text-stone-900 font-mono">{timeLeft.days}</span>
              <span className="block text-[9px] font-black text-stone-400 uppercase tracking-widest mt-1">DAYS</span>
            </div>
            <div className="bg-white border-2 border-stone-200 rounded-2xl px-4 py-3 shadow-sm min-w-[70px]">
              <span className="block text-2xl font-black text-stone-900 font-mono">{timeLeft.hours}</span>
              <span className="block text-[9px] font-black text-stone-400 uppercase tracking-widest mt-1">HOURS</span>
            </div>
            <div className="bg-white border-2 border-stone-200 rounded-2xl px-4 py-3 shadow-sm min-w-[70px]">
              <span className="block text-2xl font-black text-stone-900 font-mono">{timeLeft.mins}</span>
              <span className="block text-[9px] font-black text-stone-400 uppercase tracking-widest mt-1">MINS</span>
            </div>
            <div className="bg-white border-2 border-stone-200 rounded-2xl px-4 py-3 shadow-sm min-w-[70px]">
              <span className="block text-2xl font-black text-stone-900 font-mono">{timeLeft.secs}</span>
              <span className="block text-[9px] font-black text-stone-400 uppercase tracking-widest mt-1">SECS</span>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-6 text-center text-xs font-medium text-stone-500 border-t border-stone-200 bg-white">
        <p>&copy; 2026 XATO TECHNOLOGIES LIMITED. All rights reserved.</p>
      </footer>
    </div>
  );
}
