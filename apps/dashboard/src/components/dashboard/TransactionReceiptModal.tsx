'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Download,
  Share2,
  RefreshCw,
  Copy,
  Check,
  X,
  Smartphone,
  ShieldCheck,
  Receipt,
  ArrowRight,
} from 'lucide-react';

export interface TransactionReceiptData {
  transactionId: string;
  reference: string;
  clientReference?: string;
  providerReference?: string;
  providerName?: string;
  serviceType: 'AIRTIME' | 'DATA' | 'CABLE' | 'ELECTRICITY' | 'EDUCATION';
  status: 'SUCCESSFUL' | 'PROCESSING' | 'PENDING' | 'FAILED' | 'REVERSED';
  
  // Recipient info
  recipient: string;
  network?: string;
  networkName?: string;
  networkLogo?: string;
  
  // Financial breakdown (Distinct Face Value vs Amount Debited)
  faceAmountNaira: number;     // The airtime purchased
  discountNaira?: number;      // Cashback / merchant commission discount
  amountDebitedNaira: number;  // Real amount debited from wallet
  
  // Timestamps & Meta
  date: string;
  businessName?: string;
  errorMessage?: string;
}

interface TransactionReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  receipt: TransactionReceiptData | null;
  onRechargeAnother?: () => void;
  onStatusUpdated?: (updated: TransactionReceiptData) => void;
  pollingEndpoint?: string; // e.g. /api/services/airtime/status/
}

export default function TransactionReceiptModal({
  isOpen,
  onClose,
  receipt,
  onRechargeAnother,
  onStatusUpdated,
  pollingEndpoint = '/api/services/airtime/status/',
}: TransactionReceiptModalProps) {
  const [currentReceipt, setCurrentReceipt] = useState<TransactionReceiptData | null>(receipt);
  const [isCopied, setIsCopied] = useState(false);
  const [isPinging, setIsPinging] = useState(false);
  const [pingCount, setPingCount] = useState(0);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Sync internal state when prop changes
  useEffect(() => {
    setCurrentReceipt(receipt);
    setPingCount(0);
  }, [receipt]);

  const status = currentReceipt?.status || 'PROCESSING';
  const isProcessing = status === 'PROCESSING' || status === 'PENDING';
  const isSuccess = status === 'SUCCESSFUL';
  const isFailed = status === 'FAILED' || status === 'REVERSED';

  // Live Auto-Pinging when transaction is in PROCESSING or PENDING state
  useEffect(() => {
    if (!isOpen || !currentReceipt || !isProcessing) {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      return;
    }

    const checkStatus = async () => {
      if (!currentReceipt?.reference) return;
      try {
        setIsPinging(true);
        const authToken = localStorage.getItem('bx_auth_token') || '';
        const endpoint = `${pollingEndpoint}${encodeURIComponent(currentReceipt.reference)}`;

        const res = await fetch(endpoint, {
          headers: {
            'Content-Type': 'application/json',
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          },
        });

        const json = await res.json().catch(() => null);
        if (res.ok && json?.success && json?.data) {
          const remoteData = json.data;
          const remoteStatus = remoteData.status;

          if (remoteStatus && remoteStatus !== currentReceipt.status) {
            const updated: TransactionReceiptData = {
              ...currentReceipt,
              status: remoteStatus,
              providerReference: remoteData.providerReference || currentReceipt.providerReference,
              providerName: remoteData.providerName || currentReceipt.providerName,
            };

            setCurrentReceipt(updated);
            if (onStatusUpdated) {
              onStatusUpdated(updated);
            }
          }
        }
      } catch (err) {
        console.warn('[ReceiptModal] Status ping error:', err);
      } finally {
        setIsPinging(false);
        setPingCount((prev) => prev + 1);
      }
    };

    // Immediate first check, then interval every 3.5 seconds
    const timeout = setTimeout(checkStatus, 1500);
    pollingRef.current = setInterval(checkStatus, 3500);

    return () => {
      clearTimeout(timeout);
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [isOpen, currentReceipt?.reference, isProcessing, pollingEndpoint, onStatusUpdated]);

  if (!isOpen || !currentReceipt) return null;

  // Copy reference to clipboard
  const handleCopyReference = () => {
    navigator.clipboard.writeText(currentReceipt.reference);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Generate plain-text receipt summary
  const getReceiptSummaryText = () => {
    return [
      '================================',
      '       BAXATO TRANSACTION RECEIPT       ',
      '================================',
      `Status:             ${currentReceipt.status}`,
      `Service:            ${currentReceipt.serviceType} Top-Up`,
      `Network:            ${currentReceipt.networkName || currentReceipt.network || 'Telecom'}`,
      `Recipient:          ${currentReceipt.recipient}`,
      `Face Value Bought:  ₦${currentReceipt.faceAmountNaira.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`,
      ...(currentReceipt.discountNaira && currentReceipt.discountNaira > 0
        ? [`Merchant Discount:  -₦${currentReceipt.discountNaira.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`]
        : []),
      `Amount Debited:     ₦${currentReceipt.amountDebitedNaira.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`,
      `Transaction Ref:    ${currentReceipt.reference}`,
      ...(currentReceipt.providerReference
        ? [`Provider Session:   ${currentReceipt.providerReference}`]
        : []),
      `Date & Time:        ${currentReceipt.date}`,
      'Payment Wallet:     BAXATO Main Balance',
      '================================',
      'Digitally Cleared via BAXATO Infrastructure',
    ].join('\n');
  };

  // One-click Download PDF / Print Receipt
  const handlePrintPdf = () => {
    window.print();
  };

  // Share receipt via native Web Share API or Clipboard Fallback
  const handleShare = async () => {
    const summary = getReceiptSummaryText();
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `BAXATO Receipt - ${currentReceipt.reference}`,
          text: summary,
        });
        setShareFeedback('Shared successfully');
        setTimeout(() => setShareFeedback(null), 2500);
        return;
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.warn('Share error:', err);
        }
      }
    }

    // Clipboard fallback
    navigator.clipboard.writeText(summary);
    setShareFeedback('Receipt copied to clipboard!');
    setTimeout(() => setShareFeedback(null), 2500);
  };

  const discountPercent =
    currentReceipt.faceAmountNaira > 0 && currentReceipt.discountNaira
      ? ((currentReceipt.discountNaira / currentReceipt.faceAmountNaira) * 100).toFixed(1)
      : null;

  return (
    <>
      {/* Dedicated Print Stylesheet: prints crisp isolated receipt without any modal UI */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #baxato-receipt-document,
          #baxato-receipt-document * {
            visibility: visible !important;
          }
          #baxato-receipt-document {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 480px !important;
            margin: 0 auto !important;
            box-shadow: none !important;
            border: 1px solid #cbd5e1 !important;
            background: #ffffff !important;
            color: #0f172a !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Modal Backdrop Overlay */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-sm animate-in fade-in duration-150 overflow-y-auto">
        {/* Modal Container */}
        <div
          id="baxato-receipt-document"
          className="w-full max-w-md bg-white dark:bg-[#0B1528] rounded-2xl sm:rounded-3xl border border-slate-200/90 dark:border-slate-800 p-5 sm:p-7 shadow-2xl space-y-4 text-slate-900 dark:text-white relative overflow-hidden transition-all my-auto"
        >
          {/* Subtle Top Decorative Accent */}
          <div
            className={`absolute top-0 left-0 right-0 h-1.5 ${
              isSuccess
                ? 'bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-600'
                : isProcessing
                ? 'bg-gradient-to-r from-amber-400 via-blue-500 to-amber-500 animate-pulse'
                : 'bg-gradient-to-r from-red-500 via-rose-500 to-red-600'
            }`}
          />

          {/* Header: Logo, Title & Close Button */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
            <div className="flex items-center gap-2.5">
              <div className="relative w-8 h-8 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-white p-0.5 shadow-xs">
                <Image
                  src="/baxato-logo.jpg"
                  alt="BAXATO"
                  fill
                  priority
                  className="object-contain"
                />
              </div>
              <div>
                <span className="text-xs font-black tracking-wider text-slate-900 dark:text-white uppercase flex items-center gap-1">
                  BAXATO
                  <ShieldCheck className="w-3.5 h-3.5 text-[#126BEB]" />
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 block -mt-0.5">
                  Official Transaction Slip
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="no-print text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
              title="Close Receipt"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Status Icon & Main Amount Showcase */}
          <div className="text-center pt-1 pb-2 space-y-2">
            {/* Status Badge Icon */}
            <div className="flex justify-center">
              {isSuccess && (
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 shadow-xs animate-in zoom-in-75 duration-200">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
              )}
              {isProcessing && (
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20 shadow-xs">
                  <Clock className="w-8 h-8 animate-pulse" />
                </div>
              )}
              {isFailed && (
                <div className="w-14 h-14 rounded-2xl bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center border border-red-500/20 shadow-xs">
                  <AlertTriangle className="w-8 h-8" />
                </div>
              )}
            </div>

            {/* Status Text & Headline */}
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-1.5">
                {isSuccess && (
                  <span className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 px-2.5 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-800/80">
                    Recharge Successful
                  </span>
                )}
                {isProcessing && (
                  <span className="bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 px-2.5 py-0.5 rounded-full border border-amber-300 dark:border-amber-800/80 flex items-center gap-1.5">
                    <RefreshCw className={`w-3 h-3 ${isPinging ? 'animate-spin' : ''}`} />
                    Processing with Network
                  </span>
                )}
                {isFailed && (
                  <span className="bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300 px-2.5 py-0.5 rounded-full border border-red-300 dark:border-red-800/80">
                    Vending Failed &bull; Refunded
                  </span>
                )}
              </div>

              {/* Recipient note */}
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isSuccess && `Value credited to ${currentReceipt.recipient}`}
                {isProcessing && `Top-up initiated for ${currentReceipt.recipient}`}
                {isFailed && (currentReceipt.errorMessage || 'Unable to complete top-up at this time')}
              </p>
            </div>

            {/* Live Auto-Pinging Status Alert (Only during PROCESSING) */}
            {isProcessing && (
              <div className="no-print p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-[11.5px] text-amber-800 dark:text-amber-300 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>Checking operator status live... (ping #{pingCount})</span>
                </div>
                <button
                  type="button"
                  onClick={() => setPingCount((p) => p + 1)}
                  disabled={isPinging}
                  className="px-2 py-1 rounded bg-amber-200 dark:bg-amber-900/80 hover:bg-amber-300 text-amber-900 dark:text-amber-200 text-[10px] font-bold cursor-pointer"
                >
                  Refresh Now
                </button>
              </div>
            )}
          </div>

          {/* FINANCIAL BREAKDOWN: Distinct Face Value vs Amount Debited */}
          <div className="rounded-xl bg-slate-50 dark:bg-[#070E1C] border border-slate-200/80 dark:border-slate-800 p-4 space-y-2.5 text-xs">
            <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
              <span>Airtime Face Value (Purchased)</span>
              <span className="font-semibold text-slate-900 dark:text-white">
                ₦{currentReceipt.faceAmountNaira.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* Discount / Commission */}
            {currentReceipt.discountNaira !== undefined && currentReceipt.discountNaira > 0 && (
              <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400 font-medium">
                <span>Merchant Discount {discountPercent ? `(${discountPercent}%)` : ''}</span>
                <span>
                  -₦{currentReceipt.discountNaira.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}

            {/* Total Debited */}
            <div className="pt-2 border-t border-dashed border-slate-200 dark:border-slate-700/80 flex justify-between items-center">
              <div>
                <span className="font-bold text-slate-900 dark:text-white block">
                  Amount Debited
                </span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500">
                  Deducted from Main Wallet
                </span>
              </div>
              <span className="text-lg font-black text-[#126BEB] dark:text-[#38BDF8]">
                ₦{currentReceipt.amountDebitedNaira.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          {/* TRANSACTION METADATA DETAILS */}
          <div className="space-y-2.5 py-1 text-xs">
            {/* Network */}
            <div className="flex justify-between items-center">
              <span className="text-slate-500 dark:text-slate-400">Network Operator</span>
              <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                {currentReceipt.networkLogo && (
                  <Image
                    src={currentReceipt.networkLogo}
                    alt={currentReceipt.networkName || 'Network'}
                    width={20}
                    height={14}
                    className="object-contain"
                  />
                )}
                {currentReceipt.networkName || currentReceipt.network}
              </span>
            </div>

            {/* Recipient Phone */}
            <div className="flex justify-between items-center">
              <span className="text-slate-500 dark:text-slate-400">Recipient Phone</span>
              <span className="font-semibold text-slate-900 dark:text-white font-mono text-sm">
                {currentReceipt.recipient}
              </span>
            </div>

            {/* Reference ID with Quick Copy */}
            <div className="flex justify-between items-center">
              <span className="text-slate-500 dark:text-slate-400">Transaction Ref</span>
              <button
                type="button"
                onClick={handleCopyReference}
                className="font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1 hover:text-[#126BEB] dark:hover:text-[#38BDF8] cursor-pointer"
                title="Click to copy reference"
              >
                <span>{currentReceipt.reference}</span>
                {isCopied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-slate-400 no-print" />
                )}
              </button>
            </div>

            {/* Provider Reference (if available) */}
            {currentReceipt.providerReference && (
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">Session ID</span>
                <span className="font-mono text-[10.5px] text-slate-600 dark:text-slate-300">
                  {currentReceipt.providerReference}
                </span>
              </div>
            )}

            {/* Date and Time */}
            <div className="flex justify-between items-center">
              <span className="text-slate-500 dark:text-slate-400">Date &amp; Time</span>
              <span className="text-slate-700 dark:text-slate-300 font-medium">
                {currentReceipt.date}
              </span>
            </div>
          </div>

          {/* Feedback banner (if shared or copied) */}
          {shareFeedback && (
            <div className="no-print p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs text-center font-medium">
              {shareFeedback}
            </div>
          )}

          {/* ACTION BUTTONS (Hidden when printing) */}
          <div className="no-print pt-2 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              {/* Download / Print PDF */}
              <button
                type="button"
                onClick={handlePrintPdf}
                className="py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#070E1C] hover:bg-slate-50 dark:hover:bg-slate-800/80 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Download className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span>Save as PDF</span>
              </button>

              {/* Share Receipt */}
              <button
                type="button"
                onClick={handleShare}
                className="py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#070E1C] hover:bg-slate-50 dark:hover:bg-slate-800/80 text-xs font-bold text-slate-700 dark:text-slate-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Share2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                <span>Share Receipt</span>
              </button>
            </div>

            {/* Primary Action: Recharge Another or Done */}
            {onRechargeAnother ? (
              <button
                type="button"
                onClick={onRechargeAnother}
                className="w-full py-3 px-4 rounded-xl bg-[#126BEB] hover:bg-[#0B5CC7] active:bg-[#094bb5] text-white text-xs font-bold transition-all shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Recharge Another Number</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white text-xs font-bold transition-all cursor-pointer"
              >
                Close Receipt
              </button>
            )}
          </div>

          {/* Security & Verification Footer */}
          <div className="pt-2 text-center text-[10px] text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-slate-800/60">
            Digitally cleared by BAXATO Telecom Gateway &bull; Regulated VAS Node
          </div>
        </div>
      </div>
    </>
  );
}
