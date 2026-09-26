'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, AlertCircle, AlertTriangle, Loader2, UserCheck, ShieldCheck } from 'lucide-react';

interface KycModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedUser: any) => void;
  userFirstName?: string;
  userLastName?: string;
}

export default function KycModal({
  isOpen,
  onClose,
  onSuccess,
  userFirstName: initialFirstName,
  userLastName: initialLastName,
}: KycModalProps) {
  const [nin, setNin] = useState('');
  const [dob, setDob] = useState('');
  const [firstName, setFirstName] = useState(initialFirstName || '');
  const [lastName, setLastName] = useState(initialLastName || '');
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isVerifiedSuccess, setIsVerifiedSuccess] = useState(false);

  // Sync names from props or localStorage
  useEffect(() => {
    if (initialFirstName) setFirstName(initialFirstName);
    if (initialLastName) setLastName(initialLastName);

    if (!initialFirstName || !initialLastName) {
      try {
        const stored = localStorage.getItem('bx_user');
        if (stored) {
          const u = JSON.parse(stored);
          if (u.firstName && !initialFirstName) setFirstName(u.firstName);
          if (u.lastName && !initialLastName) setLastName(u.lastName);
        }
      } catch {}
    }
  }, [initialFirstName, initialLastName, isOpen]);

  // Prevent background scroll and sync status bar color while modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const meta =
        (document.getElementById('meta-theme-color') as HTMLMetaElement | null) ||
        document.querySelector('meta[name="theme-color"]');
      if (meta) {
        meta.setAttribute('content', '#070D18');
      }
    } else {
      document.body.style.overflow = '';
      setIsVerifiedSuccess(false);
      setErrorMessage(null);
      setNin('');
      setDob('');
      const isDark = document.documentElement.classList.contains('dark');
      const meta =
        (document.getElementById('meta-theme-color') as HTMLMetaElement | null) ||
        document.querySelector('meta[name="theme-color"]');
      if (meta) {
        meta.setAttribute('content', isDark ? '#070D18' : '#ffffff');
      }
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleNinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 11);
    setNin(raw);
    if (errorMessage) setErrorMessage(null);
  };

  const handleDobChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDob(e.target.value);
    if (errorMessage) setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (nin.length !== 11) {
      setErrorMessage('Please enter a valid 11-digit NIN.');
      return;
    }
    if (!dob) {
      setErrorMessage('Please enter your date of birth.');
      return;
    }

    setIsVerifying(true);
    setErrorMessage(null);

    try {
      const authToken = localStorage.getItem('bx_auth_token') || '';

      const response = await fetch('/api/kyc/verify-nin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({ nin, dob }),
      });

      const result = await response.json();

      if (!response.ok) {
        const errorMsg =
          result.error?.message ||
          result.message ||
          'Verification failed. Please check your NIN and date of birth.';
        
        // If name does not match, reset NIN input so merchant can re-enter their own valid NIN
        if (
          errorMsg.toLowerCase().includes('match') ||
          errorMsg.toLowerCase().includes('name') ||
          result.error?.code === 'NAME_MISMATCH'
        ) {
          setNin('');
        }
        throw new Error(errorMsg);
      }

      // Update cached user in localStorage
      try {
        const stored = localStorage.getItem('bx_user');
        if (stored) {
          const userObj = JSON.parse(stored);
          userObj.kycStatus = 'VERIFIED';
          if (result.data?.user) {
            Object.assign(userObj, result.data.user);
          }
          localStorage.setItem('bx_user', JSON.stringify(userObj));
        }
      } catch {}

      setIsVerifiedSuccess(true);
      onSuccess(result.data?.user || { kycStatus: 'VERIFIED' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Verification failed. Please try again.';
      setErrorMessage(msg);
      if (msg.toLowerCase().includes('match') || msg.toLowerCase().includes('nin')) {
        setNin('');
      }
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 dark:bg-black/90 backdrop-blur-md overflow-hidden">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.15 }}
        className="relative w-full max-w-sm sm:max-w-md bg-white dark:bg-[#0A1220] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isVerifying}
          className="absolute top-3.5 right-3.5 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-5 sm:p-6">
          <AnimatePresence mode="wait">
            {isVerifiedSuccess ? (
              <motion.div
                key="kyc-success"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-center py-2 space-y-4"
              >
                <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-7 h-7" />
                </div>

                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    Identity Verified
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Your NIMC records match your account details. Live vending access is now active.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#126BEB] hover:bg-[#0B5CC7] active:bg-[#094bb5] text-white font-semibold text-xs transition-colors"
                >
                  Continue to Dashboard
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="kyc-form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-[#126BEB] dark:text-[#38BDF8] flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
                      Identity Verification
                    </h2>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Official NIMC government identity validation
                    </p>
                  </div>
                </div>

                {/* Pre-filled Registered Name Box */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#071122] border border-slate-200 dark:border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-[#126BEB]" />
                      Registered Name on Account
                    </span>
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-blue-100/70 dark:bg-blue-950/70 text-[#126BEB] dark:text-[#38BDF8]">
                      Pre-filled
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white dark:bg-[#0B1528] p-2 rounded-lg border border-slate-200 dark:border-slate-700/60">
                      <span className="block text-[10px] text-slate-400">First Name</span>
                      <span className="font-bold text-slate-900 dark:text-white truncate block">
                        {firstName || '—'}
                      </span>
                    </div>
                    <div className="bg-white dark:bg-[#0B1528] p-2 rounded-lg border border-slate-200 dark:border-slate-700/60">
                      <span className="block text-[10px] text-slate-400">Last Name</span>
                      <span className="font-bold text-slate-900 dark:text-white truncate block">
                        {lastName || '—'}
                      </span>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                    NIMC records will be compared against this registered name. Ensure you submit your personal 11-digit NIN.
                  </p>
                </div>

                {errorMessage && (
                  <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                      <span>Verification Note</span>
                    </div>
                    <p className="text-[11px] leading-relaxed pl-5.5">{errorMessage}</p>
                  </div>
                )}

                <form onSubmit={handleSubmit} noValidate className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      NIN (11 digits)
                    </label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={11}
                      placeholder="e.g. 12345678901"
                      value={nin}
                      onChange={handleNinChange}
                      className="w-full h-10 px-3 text-sm font-mono rounded-lg bg-slate-50 dark:bg-[#070D18] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#126BEB] focus:ring-1 focus:ring-[#126BEB] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      value={dob}
                      max={
                        new Date(Date.now() - 18 * 365.25 * 24 * 60 * 60 * 1000)
                          .toISOString()
                          .split('T')[0]
                      }
                      onChange={handleDobChange}
                      className="w-full h-10 px-3 text-sm rounded-lg bg-slate-50 dark:bg-[#070D18] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-[#126BEB] focus:ring-1 focus:ring-[#126BEB] transition-colors"
                    />
                  </div>

                  <div className="pt-1">
                    <button
                      type="submit"
                      disabled={isVerifying || nin.length !== 11 || !dob}
                      className="w-full h-10 rounded-lg bg-[#126BEB] hover:bg-[#0B5CC7] active:bg-[#094bb5] text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shadow-blue-500/20"
                    >
                      {isVerifying ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Verifying with NIMC...</span>
                        </>
                      ) : (
                        <span>Verify & Unlock Account</span>
                      )}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
