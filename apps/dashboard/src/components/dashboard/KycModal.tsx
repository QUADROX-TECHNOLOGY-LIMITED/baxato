'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  X,
  Calendar,
  CreditCard,
  AlertCircle,
  CheckCircle2,
  Lock,
  ArrowRight,
  Loader2,
  User,
} from 'lucide-react';

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
  userFirstName,
  userLastName,
}: KycModalProps) {
  const [nin, setNin] = useState('');
  const [dob, setDob] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isVerifiedSuccess, setIsVerifiedSuccess] = useState(false);
  const [verifiedDetails, setVerifiedDetails] = useState<any>(null);

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
      setErrorMessage('NIN must be exactly 11 digits numeric.');
      return;
    }
    if (!dob) {
      setErrorMessage('Please select your Date of Birth.');
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
        body: JSON.stringify({
          nin,
          dob,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error?.message ||
            result.message ||
            'The details provided do not match official NIMC identity records. Please check your NIN and Date of Birth.'
        );
      }

      // Update local stored user
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

      setVerifiedDetails(result.data?.officialData || { firstName: userFirstName, lastName: userLastName });
      setIsVerifiedSuccess(true);
      onSuccess(result.data?.user || { kycStatus: 'VERIFIED' });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'NIN verification failed. Please try again.';
      setErrorMessage(msg);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleFinish = () => {
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-lg bg-white dark:bg-[#0A1324] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden my-8"
      >
        {/* Modal Top Header Accent */}
        <div className="h-1.5 w-full bg-gradient-to-r from-[#126BEB] via-[#38BDF8] to-emerald-500" />

        {/* Modal Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors z-10"
          aria-label="Dismiss verification modal"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-6 sm:p-8">
          <AnimatePresence mode="wait">
            {isVerifiedSuccess ? (
              /* ======================================================== */
              /* SUCCESS STATE                                            */
              /* ======================================================== */
              <motion.div
                key="kyc-success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="text-center py-4 space-y-5"
              >
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto border border-emerald-200 dark:border-emerald-800 shadow-lg shadow-emerald-500/10">
                  <CheckCircle2 className="w-10 h-10" />
                </div>

                <div>
                  <h3 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                    Identity Verified Successfully!
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                    Your National Identity Number (NIN) has been reconciled with official registry records.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#0D182B] border border-slate-200 dark:border-slate-800 text-left space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Compliance Tier:</span>
                    <span className="font-extrabold text-emerald-600 dark:text-emerald-400 uppercase">
                      Tier 1 Verified
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Registered Name:</span>
                    <span className="font-bold text-slate-900 dark:text-white">
                      {userFirstName} {userLastName}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Vending Status:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">
                      Active (Instant Fulfillment)
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400 font-medium">Daily Limit:</span>
                    <span className="font-bold text-slate-900 dark:text-white">₦5,000,000 / day</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleFinish}
                  className="w-full py-3.5 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs shadow-md shadow-emerald-600/25 transition-all flex items-center justify-center gap-2"
                >
                  <span>Access Full Merchant Workspace</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </motion.div>
            ) : (
              /* ======================================================== */
              /* VERIFICATION FORM STATE                                  */
              /* ======================================================== */
              <motion.div
                key="kyc-form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                {/* Header */}
                <div className="flex items-start gap-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-[#126BEB] dark:text-[#38BDF8] flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-900/50 shadow-sm">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
                      Verify Your Merchant Identity
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      Link your National Identity Number (NIN) to comply with CBN compliance and activate live telecom & utility vending.
                    </p>
                  </div>
                </div>

                {/* Identity Name Confirmation Pill */}
                <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 text-xs flex items-center gap-2.5 text-slate-700 dark:text-slate-300">
                  <User className="w-4 h-4 text-[#126BEB] shrink-0" />
                  <span>
                    Matching records for registered merchant:{' '}
                    <strong className="text-slate-900 dark:text-white font-bold">
                      {userFirstName} {userLastName}
                    </strong>
                  </span>
                </div>

                {/* Error Banner */}
                {errorMessage && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs flex items-start gap-2.5"
                  >
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{errorMessage}</span>
                  </motion.div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} noValidate className="space-y-4">
                  {/* NIN Input */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        11-Digit National Identity Number (NIN) <span className="text-red-500">*</span>
                      </label>
                      <span
                        className={`text-[10px] font-mono font-bold ${
                          nin.length === 11
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-slate-400'
                        }`}
                      >
                        {nin.length}/11 digits
                      </span>
                    </div>

                    <div className="relative">
                      <CreditCard className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={11}
                        placeholder="Enter 11-digit NIN"
                        value={nin}
                        onChange={handleNinChange}
                        className="w-full h-11 pl-10 pr-4 text-sm font-mono tracking-wider font-semibold rounded-xl bg-slate-50 dark:bg-[#070E1A] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#126BEB] focus:ring-1 focus:ring-[#126BEB] transition-colors"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Dial <code className="font-mono text-[#126BEB] dark:text-[#38BDF8]">*346#</code> on your registered SIM to retrieve your NIN.
                    </p>
                  </div>

                  {/* Date of Birth Picker */}
                  <div>
                    <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                      Date of Birth (as registered with NIMC) <span className="text-red-500">*</span>
                    </label>

                    <div className="relative">
                      <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="date"
                        value={dob}
                        max={new Date(Date.now() - 18 * 365.25 * 24 * 60 * 60 * 1000)
                          .toISOString()
                          .split('T')[0]}
                        onChange={handleDobChange}
                        className="w-full h-11 pl-10 pr-4 text-sm font-medium rounded-xl bg-slate-50 dark:bg-[#070E1A] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#126BEB] focus:ring-1 focus:ring-[#126BEB] transition-colors"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Must match the official Date of Birth on your NIMC National Identity slip.
                    </p>
                  </div>

                  {/* Submit Action */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isVerifying || nin.length !== 11 || !dob}
                      className="w-full h-11 rounded-xl bg-[#126BEB] hover:bg-[#0B5CC7] active:bg-[#094bb5] text-white font-bold text-xs shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {isVerifying ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Verifying with National Identity Registry...</span>
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-4 h-4" />
                          <span>Verify Identity &amp; Activate Account</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Compliance Notice */}
                  <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400 text-center pt-2">
                    <Lock className="w-3 h-3 text-slate-400" />
                    <span>256-bit SSL encrypted. Data verified securely via NIMC authorized gateway.</span>
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
