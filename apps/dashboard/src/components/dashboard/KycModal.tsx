'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface KycModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedUser: any) => void;
  userFirstName: string;
  userLastName: string;
}

export default function KycModal({
  isOpen,
  onClose,
  onSuccess,
}: KycModalProps) {
  const [nin, setNin] = useState('');
  const [dob, setDob] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isVerifiedSuccess, setIsVerifiedSuccess] = useState(false);

  // Prevent background scroll on mobile while modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      setIsVerifiedSuccess(false);
      setErrorMessage(null);
      setNin('');
      setDob('');
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
        throw new Error(
          result.error?.message ||
            result.message ||
            'Verification failed. Please check your NIN and date of birth.',
        );
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
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.15 }}
        className="relative w-full max-w-sm sm:max-w-md bg-white dark:bg-[#0A1220] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden"
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
                    Verification Complete
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    Your NIN has been verified and your account limits have been unlocked.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#126BEB] hover:bg-[#0B5CC7] active:bg-[#094bb5] text-white font-semibold text-xs transition-colors"
                >
                  Continue
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
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                    NIN Verification
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Enter your 11-digit NIN and date of birth to complete verification.
                  </p>
                </div>

                {errorMessage && (
                  <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <span className="leading-snug">{errorMessage}</span>
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
                      className="w-full h-10 rounded-lg bg-[#126BEB] hover:bg-[#0B5CC7] active:bg-[#094bb5] text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {isVerifying ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Verifying...</span>
                        </>
                      ) : (
                        <span>Verify NIN</span>
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
