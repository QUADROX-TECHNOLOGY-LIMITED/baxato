'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Download,
  Share2,
  Copy,
  Check,
  X,
  Tv,
  Printer,
} from 'lucide-react';

export interface CableReceiptData {
  transactionId: string;
  reference: string;
  clientReference?: string;
  status: 'SUCCESSFUL' | 'PROCESSING' | 'PENDING' | 'FAILED' | 'REVERSED';

  // Operator & Decoder Info
  operator: 'DSTV' | 'GOTV' | 'STARTIMES' | string;
  operatorName: string;
  operatorLogo?: string;
  smartcard: string;
  customerName?: string;

  // Bouquet Details
  bouquetName: string;
  validity?: string;

  // Financial breakdown
  faceAmountNaira: number;
  discountNaira?: number;
  amountDebitedNaira: number;

  // Metadata
  date: string;
  errorMessage?: string;
}

interface CableReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  receipt: CableReceiptData | null;
  onSubscribeAnother?: () => void;
}

export default function CableReceiptModal({
  isOpen,
  onClose,
  receipt,
  onSubscribeAnother,
}: CableReceiptModalProps) {
  const [copiedRef, setCopiedRef] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  if (!isOpen || !receipt) return null;

  const isSuccess = receipt.status === 'SUCCESSFUL';
  const isPending = receipt.status === 'PROCESSING' || receipt.status === 'PENDING';

  const formatNaira = (val: number) =>
    `₦${val.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const handleCopyRef = () => {
    navigator.clipboard.writeText(receipt.reference);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    const shareText = `Baxato Cable TV Receipt\nProvider: ${receipt.operatorName}\nDecoder: ${receipt.smartcard}\nCustomer: ${receipt.customerName || 'N/A'}\nBouquet: ${receipt.bouquetName}\nAmount: ${formatNaira(receipt.amountDebitedNaira)}\nRef: ${receipt.reference}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Receipt - ${receipt.operatorName}`,
          text: shareText,
        });
      } catch {
        // Ignored if cancelled
      }
    } else {
      navigator.clipboard.writeText(shareText);
      setShareFeedback('Receipt summary copied!');
      setTimeout(() => setShareFeedback(null), 2500);
    }
  };

  const getOperatorLogo = (op: string) => {
    const o = op.toLowerCase();
    if (o.includes('dstv')) return '/logos/cable/dstv.svg';
    if (o.includes('gotv')) return '/logos/cable/gotv.png';
    if (o.includes('startimes')) return '/logos/cable/startimes.svg';
    if (o.includes('showmax')) return '/logos/cable/showmax.svg';
    return '/favicon.ico';
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md my-8 bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-800 dark:text-slate-100 print:shadow-none print:border-none print:m-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 print:hidden">
          <div className="flex items-center gap-2">
            <Tv className="w-5 h-5 text-[#126BEB]" />
            <span className="text-sm font-semibold tracking-wide text-slate-700 dark:text-slate-200">
              Subscription Receipt
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Status & Provider Banner */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-900 p-1 flex items-center justify-center border border-slate-200 dark:border-slate-800">
                <Image
                  src={receipt.operatorLogo || getOperatorLogo(receipt.operator)}
                  alt={receipt.operatorName}
                  width={38}
                  height={38}
                  className="object-contain max-h-10"
                />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white leading-tight">
                  {receipt.operatorName}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {receipt.bouquetName}
                </p>
              </div>
            </div>

            <div>
              {isSuccess ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Successful
                </span>
              ) : isPending ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  <Clock className="w-3.5 h-3.5" />
                  Processing
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Failed
                </span>
              )}
            </div>
          </div>

          {/* Subscription Details Box */}
          <div className="bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2.5 text-xs">
            <div className="flex justify-between items-center py-1 border-b border-slate-200/60 dark:border-slate-800/80">
              <span className="text-slate-500 dark:text-slate-400">Smartcard / IUC</span>
              <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-sm">
                {receipt.smartcard}
              </span>
            </div>

            {receipt.customerName && (
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60 dark:border-slate-800/80">
                <span className="text-slate-500 dark:text-slate-400">Subscriber Name</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {receipt.customerName}
                </span>
              </div>
            )}

            <div className="flex justify-between items-center py-1 border-b border-slate-200/60 dark:border-slate-800/80">
              <span className="text-slate-500 dark:text-slate-400">Subscribed Bouquet</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {receipt.bouquetName}
              </span>
            </div>

            {receipt.validity && (
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60 dark:border-slate-800/80">
                <span className="text-slate-500 dark:text-slate-400">Validity</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {receipt.validity}
                </span>
              </div>
            )}

            <div className="flex justify-between items-center py-1 border-b border-slate-200/60 dark:border-slate-800/80">
              <span className="text-slate-500 dark:text-slate-400">Bouquet Price</span>
              <span className="font-mono text-slate-700 dark:text-slate-300">
                {formatNaira(receipt.faceAmountNaira)}
              </span>
            </div>

            {receipt.discountNaira && receipt.discountNaira > 0 ? (
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60 dark:border-slate-800/80">
                <span className="text-slate-500 dark:text-slate-400">Merchant Cashback</span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                  -{formatNaira(receipt.discountNaira)}
                </span>
              </div>
            ) : null}

            <div className="flex justify-between items-center pt-1 text-sm font-bold">
              <span className="text-slate-900 dark:text-white">Amount Debited</span>
              <span className="font-mono text-slate-900 dark:text-white text-base">
                {formatNaira(receipt.amountDebitedNaira)}
              </span>
            </div>
          </div>

          {/* Reference & Audit Information */}
          <div className="bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/60 rounded-xl p-3 space-y-1.5 text-[11px] text-slate-500 dark:text-slate-400">
            <div className="flex justify-between items-center">
              <span>Transaction Ref:</span>
              <div className="flex items-center gap-1 font-mono text-slate-700 dark:text-slate-300">
                <span>{receipt.reference}</span>
                <button
                  type="button"
                  onClick={handleCopyRef}
                  className="hover:text-slate-900 dark:hover:text-white transition print:hidden"
                  title="Copy Reference"
                >
                  {copiedRef ? (
                    <Check className="w-3 h-3 text-emerald-500" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span>Date & Time:</span>
              <span className="text-slate-700 dark:text-slate-300">
                {new Date(receipt.date).toLocaleString('en-NG', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </span>
            </div>
          </div>

          {shareFeedback && (
            <div className="p-2 text-center text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 rounded-lg">
              {shareFeedback}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2.5 pt-2 print:hidden">
            <button
              type="button"
              onClick={handlePrint}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 font-semibold text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <Printer className="w-4 h-4" />
              <span>Print Slip</span>
            </button>

            <button
              type="button"
              onClick={handleShare}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 font-semibold text-xs text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <Share2 className="w-4 h-4" />
              <span>Share Slip</span>
            </button>

            {onSubscribeAnother && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onSubscribeAnother();
                }}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#126BEB] hover:bg-[#0B5CC7] font-semibold text-xs text-white shadow-sm transition"
              >
                <span>Recharge Another</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
