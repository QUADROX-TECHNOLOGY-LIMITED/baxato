'use client';

import React from 'react';
import { ArrowRight, ShieldAlert, AlertCircle } from 'lucide-react';

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
      className={`rounded-xl border p-4 shadow-sm transition-all ${
        isRejected
          ? 'bg-red-50/80 dark:bg-red-950/25 border-red-200 dark:border-red-900/40 text-red-950 dark:text-red-200'
          : 'bg-amber-50/80 dark:bg-amber-950/25 border-amber-200 dark:border-amber-900/40 text-amber-950 dark:text-amber-200'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
              isRejected
                ? 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400'
                : 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400'
            }`}
          >
            {isRejected ? (
              <AlertCircle className="w-4 h-4" />
            ) : (
              <ShieldAlert className="w-4 h-4" />
            )}
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold">
              {isRejected ? 'Identity Verification Needed' : 'Verify your Identity'}
            </h3>
            <p className="text-xs mt-0.5 text-slate-600 dark:text-slate-300">
              {isRejected
                ? 'Your previous verification details did not match official records. Please check and try again.'
                : 'Complete identity verification to enable wallet funding and start vending.'}
            </p>
          </div>
        </div>

        <div className="shrink-0 self-start sm:self-center">
          <button
            onClick={onOpenKycModal}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg font-semibold text-xs text-white shadow-sm transition-colors ${
              isRejected
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-[#126BEB] hover:bg-[#0B5CC7]'
            }`}
          >
            <span>{isRejected ? 'Try Again' : 'Verify Identity'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
