'use client';

import React from 'react';
import { ShieldAlert, ArrowRight, Lock, AlertTriangle } from 'lucide-react';

interface KycBannerProps {
  kycStatus: string;
  onOpenKycModal: () => void;
}

export default function KycBanner({ kycStatus, onOpenKycModal }: KycBannerProps) {
  if (kycStatus === 'VERIFIED') {
    return null;
  }

  const isRejected = kycStatus === 'REJECTED';

  return (
    <div
      className={`rounded-2xl border p-4 sm:p-5 shadow-sm transition-all ${
        isRejected
          ? 'bg-red-50/90 dark:bg-red-950/30 border-red-200 dark:border-red-900/50 text-red-950 dark:text-red-200'
          : 'bg-amber-50/90 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/50 text-amber-950 dark:text-amber-200'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left: Icon & Explanatory Text */}
        <div className="flex items-start gap-3.5">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
              isRejected
                ? 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400'
                : 'bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400'
            }`}
          >
            {isRejected ? (
              <AlertTriangle className="w-5 h-5" />
            ) : (
              <ShieldAlert className="w-5 h-5 animate-pulse" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold tracking-tight">
                {isRejected
                  ? 'Identity Verification Action Required (NIMC Registry Mismatch)'
                  : 'NIN Identity Verification Required'}
              </h3>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-200/80 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300">
                Action Required
              </span>
            </div>

            <p className="text-xs mt-1 leading-relaxed text-slate-600 dark:text-slate-300 font-normal">
              {isRejected
                ? 'Your previous NIN or Date of Birth verification attempt did not match official government registry records. Please re-enter your 11-digit NIN and registered DOB to unlock service vending.'
                : 'Under Central Bank of Nigeria (CBN) regulations and anti-fraud compliance, link your National Identity Number (NIN) to activate automated vending, wallet top-ups, and settlement withdrawals.'}
            </p>

            <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1 font-medium">
                <Lock className="w-3 h-3 text-amber-600 dark:text-amber-400" /> Vending Gated
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 font-medium">
                <Lock className="w-3 h-3 text-amber-600 dark:text-amber-400" /> Wallet Funding Gated
              </span>
            </div>
          </div>
        </div>

        {/* Right: CTA Button */}
        <div className="shrink-0 sm:self-center">
          <button
            onClick={onOpenKycModal}
            className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs text-white shadow-md transition-all active:scale-[0.98] ${
              isRejected
                ? 'bg-red-600 hover:bg-red-700 shadow-red-600/20'
                : 'bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 shadow-amber-600/20'
            }`}
          >
            <span>{isRejected ? 'Retry Verification' : 'Verify Identity with NIN'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
