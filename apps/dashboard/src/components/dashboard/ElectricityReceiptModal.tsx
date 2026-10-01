'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  Zap,
  Printer,
  Receipt,
  RotateCw,
} from 'lucide-react';

export interface ElectricityReceiptData {
  transactionId: string;
  reference: string;
  clientReference?: string;
  status: 'SUCCESSFUL' | 'PROCESSING' | 'PENDING' | 'FAILED' | 'REVERSED';

  // DISCO & Consumer Info
  disco: string;
  discoName: string;
  discoLogo?: string;
  meterNumber: string;
  meterType: 'PREPAID' | 'POSTPAID';
  customerName?: string;
  customerAddress?: string;

  // STS Token & Metering
  token?: string;
  units?: string;
  unitsCostNaira?: number;
  vatNaira?: number;
  tariff?: string;
  feeder?: string;

  // Financial breakdown
  faceAmountNaira: number;
  discountNaira?: number;
  amountDebitedNaira: number;

  // Metadata
  date: string;
  errorMessage?: string;
}

interface ElectricityReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  receipt: ElectricityReceiptData | null;
  onVendAnother?: () => void;
  onStatusUpdated?: (updated: ElectricityReceiptData) => void;
  pollingEndpoint?: string;
}

export default function ElectricityReceiptModal({
  isOpen,
  onClose,
  receipt,
  onVendAnother,
  onStatusUpdated,
  pollingEndpoint = '/api/services/electricity/status/',
}: ElectricityReceiptModalProps) {
  const [currentReceipt, setCurrentReceipt] = useState<ElectricityReceiptData | null>(receipt);
  const [isCopiedToken, setIsCopiedToken] = useState(false);
  const [isCopiedRef, setIsCopiedRef] = useState(false);
  const [isPinging, setIsPinging] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setCurrentReceipt(receipt);
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

          if (
            remoteStatus &&
            (remoteStatus !== currentReceipt.status || remoteData.token !== currentReceipt.token)
          ) {
            const updated: ElectricityReceiptData = {
              ...currentReceipt,
              status: remoteStatus,
              token: remoteData.token || currentReceipt.token,
              units: remoteData.units || currentReceipt.units,
              unitsCostNaira: remoteData.unitsCostNaira ?? currentReceipt.unitsCostNaira,
              vatNaira: remoteData.vatNaira ?? currentReceipt.vatNaira,
            };

            setCurrentReceipt(updated);
            if (onStatusUpdated) {
              onStatusUpdated(updated);
            }
          }
        }
      } catch (err) {
        console.warn('[ElectricityReceiptModal] Status ping error:', err);
      } finally {
        setIsPinging(false);
      }
    };

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

  // Format token into groups of 4 (e.g. 1234 5678 9012 3456 7890)
  const formatToken = (tok?: string) => {
    if (!tok) return '';
    const clean = tok.replace(/\D/g, '');
    return clean.match(/.{1,4}/g)?.join(' ') || tok;
  };

  const handleCopyToken = () => {
    if (!currentReceipt.token) return;
    const cleanToken = currentReceipt.token.replace(/\s+/g, '');
    navigator.clipboard.writeText(cleanToken);
    setIsCopiedToken(true);
    setTimeout(() => setIsCopiedToken(false), 2000);
  };

  const handleCopyReference = () => {
    navigator.clipboard.writeText(currentReceipt.reference);
    setIsCopiedRef(true);
    setTimeout(() => setIsCopiedRef(false), 2000);
  };

  const getPlainTextReceipt = () => {
    const isPrepaid = currentReceipt.meterType === 'PREPAID';
    return [
      '================================',
      '   BAXATO ELECTRICITY RECEIPT   ',
      '================================',
      `Status:             ${currentReceipt.status}`,
      `DISCO:              ${currentReceipt.discoName}`,
      `Meter Type:         ${currentReceipt.meterType}`,
      `Meter Number:       ${currentReceipt.meterNumber}`,
      ...(currentReceipt.customerName ? [`Customer Name:      ${currentReceipt.customerName}`] : []),
      ...(currentReceipt.customerAddress ? [`Address:            ${currentReceipt.customerAddress}`] : []),
      ...(isPrepaid && currentReceipt.token
        ? [
            '--------------------------------',
            `TOKEN:              ${formatToken(currentReceipt.token)}`,
            ...(currentReceipt.units ? [`Units:              ${currentReceipt.units} kWh`] : []),
            '--------------------------------',
          ]
        : []),
      `Face Amount:        ₦${currentReceipt.faceAmountNaira.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`,
      ...(currentReceipt.discountNaira && currentReceipt.discountNaira > 0
        ? [`Merchant Discount:  -₦${currentReceipt.discountNaira.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`]
        : []),
      `Amount Debited:     ₦${currentReceipt.amountDebitedNaira.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`,
      `Transaction Ref:    ${currentReceipt.reference}`,
      `Date & Time:        ${currentReceipt.date}`,
      'Payment Wallet:     BAXATO Settlement Balance',
      '================================',
      'Thank you for vending with BAXATO',
      'Customer Support: support@baxato.com',
    ].join('\n');
  };

  const handleShare = async () => {
    const summary = getPlainTextReceipt();
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Electricity Token Receipt - ${currentReceipt.meterNumber}`,
          text: summary,
        });
        return;
      } catch {
        // Fallback to clipboard
      }
    }
    navigator.clipboard.writeText(summary);
    setShareFeedback('Receipt copied to clipboard!');
    setTimeout(() => setShareFeedback(null), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-[#0B1528] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden my-6">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/40">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
              <Zap className="w-3.5 h-3.5" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider block">
                Electricity Receipt
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                Official Value Delivery Slip
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-5 max-h-[82vh] overflow-y-auto">
          
          {/* Status Badge & Headline */}
          <div className="text-center pt-1">
            <div className="inline-flex items-center justify-center mb-2.5">
              {isSuccess && (
                <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 dark:bg-emerald-500/15 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20 animate-in zoom-in-50 duration-300">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
              )}
              {isProcessing && (
                <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 dark:bg-amber-500/15 dark:text-amber-400 flex items-center justify-center border border-amber-500/20 animate-pulse">
                  <Clock className="w-7 h-7" />
                </div>
              )}
              {isFailed && (
                <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-500 dark:bg-rose-500/15 dark:text-rose-400 flex items-center justify-center border border-rose-500/20">
                  <AlertTriangle className="w-7 h-7" />
                </div>
              )}
            </div>

            <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
              {isSuccess && 'Token Generated Successfully'}
              {isProcessing && 'Token Generation In Progress'}
              {isFailed && 'Electricity Vending Failed'}
            </h3>

            {/* Subtext description */}
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {isSuccess && 'Your electricity token is ready to load into your meter.'}
              {isProcessing && 'Your request is accepted and queued with the electricity distribution company.'}
              {isFailed && (currentReceipt.errorMessage || 'The electricity operator could not complete this vend. Any wallet deduction has been reversed.')}
            </p>

            {/* Live Polling Indicator when Processing */}
            {isProcessing && (
              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] font-semibold text-amber-700 dark:text-amber-300">
                <RotateCw className={`w-3 h-3 ${isPinging ? 'animate-spin' : ''}`} />
                <span>Auto-checking live status with DISCO...</span>
              </div>
            )}
          </div>

          {/* TOKEN CALLOUT CARD (PREPAID SUCCESSFUL) */}
          {currentReceipt.meterType === 'PREPAID' && currentReceipt.token && (
            <div className="p-4 sm:p-5 rounded-2xl bg-linear-to-br from-amber-500/10 via-amber-500/5 to-transparent border-2 border-amber-500/30 dark:border-amber-500/40 text-center relative overflow-hidden shadow-inner">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-widest flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5" />
                  Prepaid STS Token
                </span>
                {currentReceipt.units && (
                  <span className="text-xs font-extrabold text-slate-700 dark:text-slate-300 bg-white/70 dark:bg-[#070E1C]/70 px-2 py-0.5 rounded-md border border-amber-500/20">
                    {currentReceipt.units} kWh
                  </span>
                )}
              </div>

              {/* Grouped Token Display */}
              <div className="my-2.5 py-2 px-3 bg-white dark:bg-[#070D18] rounded-xl border border-amber-500/20 shadow-xs">
                <p className="font-mono text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-widest select-all">
                  {formatToken(currentReceipt.token)}
                </p>
              </div>

              <div className="flex items-center justify-center gap-2 mt-3">
                <button
                  type="button"
                  onClick={handleCopyToken}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-xs transition-all cursor-pointer"
                >
                  {isCopiedToken ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-white" />
                      <span>Copied Token!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy 20-Digit Token</span>
                    </>
                  )}
                </button>
              </div>

              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2">
                Load by entering these 20 digits into your meter keypad followed by Enter / ↵
              </p>
            </div>
          )}

          {/* PROCESSING NOTICE CARD */}
          {isProcessing && (
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#070D18] border border-amber-500/30 text-center">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                The meter token will appear here the moment confirmation is received.
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                You can safely close this window. Your token is preserved and viewable under History.
              </p>
            </div>
          )}

          {/* Amount Paid Callout */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#070D18] border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                Face Value
              </span>
              <span className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                ₦{currentReceipt.faceAmountNaira.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="text-right">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                Amount Debited
              </span>
              <span className="text-base font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">
                ₦{currentReceipt.amountDebitedNaira.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
              </span>
              {currentReceipt.discountNaira !== undefined && currentReceipt.discountNaira > 0 && (
                <span className="text-[10px] text-emerald-500 block font-medium">
                  Saved ₦{currentReceipt.discountNaira.toFixed(2)}
                </span>
              )}
            </div>
          </div>

          {/* Consumer & Meter Details Table */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
            {/* DISCO */}
            <div className="px-3.5 py-2.5 flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">DISCO Operator</span>
              <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                {currentReceipt.discoName} ({currentReceipt.disco})
              </span>
            </div>

            {/* Meter Type */}
            <div className="px-3.5 py-2.5 flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">Meter Type</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${
                currentReceipt.meterType === 'PREPAID'
                  ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                  : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
              }`}>
                {currentReceipt.meterType}
              </span>
            </div>

            {/* Meter Number */}
            <div className="px-3.5 py-2.5 flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">Meter / Account No.</span>
              <span className="font-mono font-bold text-slate-900 dark:text-white">
                {currentReceipt.meterNumber}
              </span>
            </div>

            {/* Customer Name */}
            {currentReceipt.customerName && (
              <div className="px-3.5 py-2.5 flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Customer Name</span>
                <span className="font-bold text-slate-900 dark:text-white uppercase text-right max-w-[240px] truncate">
                  {currentReceipt.customerName}
                </span>
              </div>
            )}

            {/* Customer Address */}
            {currentReceipt.customerAddress && (
              <div className="px-3.5 py-2.5 flex items-start justify-between gap-3">
                <span className="text-slate-500 dark:text-slate-400 shrink-0">Address</span>
                <span className="font-medium text-slate-700 dark:text-slate-300 text-right max-w-[260px] line-clamp-2">
                  {currentReceipt.customerAddress}
                </span>
              </div>
            )}

            {/* Reference */}
            <div className="px-3.5 py-2.5 flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">Transaction Ref</span>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                  {currentReceipt.reference}
                </span>
                <button
                  type="button"
                  onClick={handleCopyReference}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                  title="Copy Reference"
                >
                  {isCopiedRef ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>

            {/* Date & Time */}
            <div className="px-3.5 py-2.5 flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400">Date & Time</span>
              <span className="text-slate-700 dark:text-slate-300">
                {currentReceipt.date}
              </span>
            </div>
          </div>

          {/* Share Feedback Toast */}
          {shareFeedback && (
            <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold text-center animate-in fade-in duration-150">
              {shareFeedback}
            </div>
          )}

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={handleShare}
              className="w-full py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5 text-slate-500" />
              <span>Share Receipt</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="w-full py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>Print Slip</span>
            </button>
          </div>

          {onVendAnother && (
            <button
              type="button"
              onClick={onVendAnother}
              className="w-full py-3 px-4 rounded-xl bg-[#126BEB] hover:bg-[#0B5CC7] active:bg-[#094bb5] text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Vend Another Meter</span>
            </button>
          )}

          {/* Clean Footer Branding */}
          <p className="text-[10px] text-center text-slate-400 dark:text-slate-500 pt-1">
            Powered by BAXATO Secure Billing Switch • Instant National Settlement
          </p>
        </div>
      </div>
    </div>
  );
}
