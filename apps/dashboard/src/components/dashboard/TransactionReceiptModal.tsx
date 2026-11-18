'use client';

import React, { useState, useEffect, useRef, useId, useCallback } from 'react';
import Image from 'next/image';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  RefreshCw,
  Share2,
  X,
} from 'lucide-react';
import { printTransactionReceipt } from '@/lib/receipt-printer';
import ModalDialog from '@/components/ModalDialog';

export interface TransactionReceiptData {
  transactionId: string;
  reference: string;
  clientReference?: string;
  serviceType: 'AIRTIME' | 'DATA' | 'CABLE' | 'ELECTRICITY' | 'EDUCATION';
  status: 'SUCCESSFUL' | 'PROCESSING' | 'PENDING' | 'FAILED' | 'REVERSED';

  recipient: string;
  network?: string;
  networkName?: string;
  networkLogo?: string;
  planName?: string;
  dataAllowance?: string;
  validity?: string;

  faceAmountNaira: number;
  discountNaira?: number;
  amountDebitedNaira: number;

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
  pollingEndpoint?: string;
}

function getServiceLabel(serviceType: TransactionReceiptData['serviceType']): string {
  switch (serviceType) {
    case 'DATA':
      return 'Data Bundle';
    case 'AIRTIME':
      return 'Airtime';
    case 'CABLE':
      return 'Cable TV';
    case 'ELECTRICITY':
      return 'Electricity';
    case 'EDUCATION':
      return 'Education';
    default:
      return serviceType;
  }
}

export default function TransactionReceiptModal({
  isOpen,
  onClose,
  receipt,
  onRechargeAnother,
  onStatusUpdated,
  pollingEndpoint,
}: TransactionReceiptModalProps) {
  const titleId = useId();
  const [currentReceipt, setCurrentReceipt] = useState<TransactionReceiptData | null>(receipt);
  const [isCopied, setIsCopied] = useState(false);
  const [isPinging, setIsPinging] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setCurrentReceipt(receipt);
  }, [receipt]);

  const status = currentReceipt?.status || 'PROCESSING';
  const isProcessing = status === 'PROCESSING' || status === 'PENDING';
  const isSuccess = status === 'SUCCESSFUL';
  const isFailed = status === 'FAILED' || status === 'REVERSED';
  const isFullBleedLogo =
    currentReceipt?.network === 'MTN' || currentReceipt?.network === 'GLO';

  const canPoll = Boolean(
    (pollingEndpoint && currentReceipt?.reference) || currentReceipt?.transactionId,
  );

  const checkStatus = useCallback(async () => {
    if (!currentReceipt || !canPoll) return;
    try {
      setIsPinging(true);
      const authToken = localStorage.getItem('bx_auth_token') || '';
      const activeBizId = localStorage.getItem('bx_active_business_id') || '';

      const useSpecificEndpoint = Boolean(pollingEndpoint && currentReceipt.reference);
      const endpoint = useSpecificEndpoint
        ? `${pollingEndpoint}${encodeURIComponent(currentReceipt.reference)}`
        : `/api/transactions/${encodeURIComponent(currentReceipt.transactionId)}/check-status`;

      const res = await fetch(endpoint, {
        method: useSpecificEndpoint ? 'GET' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
          ...(activeBizId ? { 'x-business-id': activeBizId } : {}),
        },
      });

      const json = await res.json().catch(() => null);
      if (res.ok && json?.success && json?.data) {
        const remoteStatus = json.data.status || json.data.transaction?.status;
        if (remoteStatus && remoteStatus !== currentReceipt.status) {
          const updated: TransactionReceiptData = {
            ...currentReceipt,
            status: remoteStatus,
            ...(remoteStatus === 'FAILED' && json.data.message
              ? { errorMessage: json.data.message }
              : {}),
          };
          setCurrentReceipt(updated);
          onStatusUpdated?.(updated);
        }
      }
    } catch {
      // Status check stays resilient on transient network errors
    } finally {
      setIsPinging(false);
    }
  }, [currentReceipt, canPoll, pollingEndpoint, onStatusUpdated]);

  useEffect(() => {
    if (!isOpen || !currentReceipt || !isProcessing || !canPoll) {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      return;
    }

    const timeout = setTimeout(() => {
      void checkStatus();
    }, 1500);
    pollingRef.current = setInterval(() => {
      void checkStatus();
    }, 3500);

    return () => {
      clearTimeout(timeout);
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [isOpen, currentReceipt, isProcessing, canPoll, checkStatus]);

  if (!currentReceipt) return null;

  const serviceLabel = getServiceLabel(currentReceipt.serviceType);
  const valueLabel =
    currentReceipt.serviceType === 'DATA' ? 'Bundle Price' : 'Airtime Value';
  const isReversed = status === 'REVERSED';

  const discountPercent =
    currentReceipt.faceAmountNaira > 0 && currentReceipt.discountNaira
      ? ((currentReceipt.discountNaira / currentReceipt.faceAmountNaira) * 100).toFixed(1)
      : null;

  const handleCopyReference = () => {
    if (!navigator?.clipboard) return;
    void navigator.clipboard.writeText(currentReceipt.reference);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const getReceiptSummaryText = () => {
    const lines = [
      'BAXATO RECEIPT',
      `Status: ${currentReceipt.status}`,
      `Service: ${serviceLabel}`,
      `Network: ${currentReceipt.networkName || currentReceipt.network || 'Telecom'}`,
      `Recipient: ${currentReceipt.recipient}`,
    ];
    if (currentReceipt.planName || currentReceipt.dataAllowance) {
      lines.push(`Plan: ${currentReceipt.planName || currentReceipt.dataAllowance}`);
    }
    if (currentReceipt.validity) {
      lines.push(`Validity: ${currentReceipt.validity}`);
    }
    lines.push(
      `${valueLabel}: ₦${currentReceipt.faceAmountNaira.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`,
    );
    if (currentReceipt.discountNaira && currentReceipt.discountNaira > 0) {
      lines.push(
        `Discount: -₦${currentReceipt.discountNaira.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`,
      );
    }
    lines.push(
      `Total Debited: ₦${currentReceipt.amountDebitedNaira.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`,
      `Reference: ${currentReceipt.reference}`,
      `Date: ${currentReceipt.date}`,
      'Support: support@baxato.com',
    );
    return lines.join('\n');
  };

  const handlePrintPdf = () => {
    printTransactionReceipt(currentReceipt);
  };

  const handleShare = async () => {
    const summary = getReceiptSummaryText();
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `BAXATO Receipt - ${currentReceipt.reference}`,
          text: summary,
        });
        setShareFeedback('Receipt shared.');
        setTimeout(() => setShareFeedback(null), 2500);
        return;
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          // Fall back to clipboard
        }
      }
    }

    if (navigator?.clipboard) {
      await navigator.clipboard.writeText(summary);
      setShareFeedback('Receipt copied to clipboard.');
      setTimeout(() => setShareFeedback(null), 2500);
    }
  };

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={onClose}
      ariaLabelledBy={titleId}
      maxWidthClass="max-w-md"
      className="dark:bg-[#0B1528] text-slate-900 dark:text-white"
    >
      <div id="baxato-receipt-document" className="p-5 sm:p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center gap-2">
            <Image
              src="/baxato-mark.svg"
              alt=""
              width={24}
              height={24}
              className="w-6 h-6 shrink-0"
            />
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold tracking-tight text-slate-900 dark:text-white">
                BAXATO
              </span>
              <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">
                /
              </span>
              <h2 id={titleId} className="text-xs font-medium text-slate-500 dark:text-slate-400">
                Receipt
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close receipt"
            className="no-print relative p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg after:content-[''] after:absolute after:-inset-2 cursor-pointer transition-colors"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Hero Status & Debited Total */}
        <div className="text-center space-y-2.5">
          <div className="flex justify-center">
            {isSuccess && (
              <div className="w-11 h-11 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                <CheckCircle2 className="w-6 h-6" aria-hidden="true" />
              </div>
            )}
            {isProcessing && (
              <div className="w-11 h-11 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
                <Clock className="w-6 h-6" aria-hidden="true" />
              </div>
            )}
            {isFailed && (
              <div className="w-11 h-11 rounded-full bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center border border-red-500/20">
                <AlertTriangle className="w-6 h-6" aria-hidden="true" />
              </div>
            )}
          </div>

          <div className="space-y-1">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                isSuccess
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/70'
                  : isProcessing
                    ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/70'
                    : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/50 dark:text-red-300 dark:border-red-800/70'
              }`}
            >
              {isSuccess && 'Successful'}
              {isProcessing && (
                <>
                  <RefreshCw className={`w-3 h-3 ${isPinging ? 'animate-spin' : ''}`} aria-hidden="true" />
                  Processing
                </>
              )}
              {isFailed && (isReversed ? 'Reversed' : 'Failed')}
            </span>

            <div className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums tracking-tight pt-1">
              ₦{currentReceipt.amountDebitedNaira.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 text-pretty">
              {isSuccess &&
                (currentReceipt.serviceType === 'DATA' && currentReceipt.dataAllowance
                  ? `${currentReceipt.dataAllowance} sent to ${currentReceipt.recipient}`
                  : `Sent to ${currentReceipt.recipient}`)}
              {isProcessing && `Initiated for ${currentReceipt.recipient}`}
              {isFailed &&
                (currentReceipt.errorMessage || 'Transaction could not be completed.')}
            </p>
          </div>

          {isProcessing && canPoll && (
            <div className="no-print px-3 py-2 rounded-lg bg-amber-50/70 dark:bg-amber-950/35 border border-amber-200/80 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <RefreshCw
                  className={`w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0 ${
                    isPinging ? 'animate-spin' : ''
                  }`}
                  aria-hidden="true"
                />
                <span>Checking transaction status...</span>
              </div>
              <button
                type="button"
                onClick={() => void checkStatus()}
                disabled={isPinging}
                className="px-2 py-1 rounded bg-amber-200/80 dark:bg-amber-900/70 hover:bg-amber-200 text-amber-950 dark:text-amber-100 text-[11px] font-semibold cursor-pointer disabled:opacity-50"
              >
                Refresh
              </button>
            </div>
          )}
        </div>

        {/* Receipt Breakdown & Details */}
        <dl className="rounded-xl bg-slate-50/80 dark:bg-[#070D18] border border-slate-200/80 dark:border-slate-800 p-4 space-y-2.5 text-xs">
          <div className="flex justify-between items-center gap-4">
            <dt className="text-slate-500 dark:text-slate-400">Service</dt>
            <dd className="font-semibold text-slate-900 dark:text-white">{serviceLabel}</dd>
          </div>

          <div className="flex justify-between items-center gap-4">
            <dt className="text-slate-500 dark:text-slate-400">Network</dt>
            <dd className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
              {currentReceipt.networkLogo && (
                <span
                  className={`w-4 h-4 rounded-full overflow-hidden flex items-center justify-center shrink-0 ${
                    isFullBleedLogo
                      ? ''
                      : 'bg-white border border-slate-200 dark:border-slate-700 p-0.5'
                  }`}
                >
                  <Image
                    src={currentReceipt.networkLogo}
                    alt=""
                    width={16}
                    height={16}
                    className={`w-full h-full ${
                      isFullBleedLogo ? 'object-cover' : 'object-contain'
                    } ${currentReceipt.network === 'GLO' ? 'scale-[1.09]' : ''}`}
                  />
                </span>
              )}
              <span>{currentReceipt.networkName || currentReceipt.network}</span>
            </dd>
          </div>

          <div className="flex justify-between items-center gap-4">
            <dt className="text-slate-500 dark:text-slate-400">Recipient</dt>
            <dd className="font-semibold text-slate-900 dark:text-white tabular-nums">
              {currentReceipt.recipient}
            </dd>
          </div>

          {(currentReceipt.planName || currentReceipt.dataAllowance) && (
            <div className="flex justify-between items-center gap-4">
              <dt className="text-slate-500 dark:text-slate-400">Plan</dt>
              <dd className="font-semibold text-slate-900 dark:text-white text-right">
                {currentReceipt.planName || currentReceipt.dataAllowance}
              </dd>
            </div>
          )}

          {currentReceipt.validity && (
            <div className="flex justify-between items-center gap-4">
              <dt className="text-slate-500 dark:text-slate-400">Validity</dt>
              <dd className="font-medium text-slate-800 dark:text-slate-200">
                {currentReceipt.validity}
              </dd>
            </div>
          )}

          <div className="flex justify-between items-center gap-4">
            <dt className="text-slate-500 dark:text-slate-400">{valueLabel}</dt>
            <dd className="font-medium text-slate-900 dark:text-white tabular-nums">
              ₦{currentReceipt.faceAmountNaira.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
            </dd>
          </div>

          {currentReceipt.discountNaira !== undefined && currentReceipt.discountNaira > 0 && (
            <div className="flex justify-between items-center gap-4 text-emerald-600 dark:text-emerald-400 font-medium">
              <dt>Discount{discountPercent ? ` (${discountPercent}%)` : ''}</dt>
              <dd className="tabular-nums">
                -₦{currentReceipt.discountNaira.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
              </dd>
            </div>
          )}

          <div className="flex justify-between items-center gap-4 pt-2 border-t border-slate-200/80 dark:border-slate-800">
            <dt className="font-semibold text-slate-900 dark:text-white">Total Debited</dt>
            <dd className="font-bold text-[#126BEB] dark:text-[#38BDF8] tabular-nums">
              ₦{currentReceipt.amountDebitedNaira.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
            </dd>
          </div>

          <div className="flex justify-between items-center gap-4 pt-2 border-t border-slate-200/80 dark:border-slate-800">
            <dt className="text-slate-500 dark:text-slate-400">Reference</dt>
            <dd>
              <button
                type="button"
                onClick={handleCopyReference}
                aria-label={isCopied ? 'Reference copied' : 'Copy transaction reference'}
                className="font-mono text-[11px] font-semibold text-slate-800 dark:text-slate-200 inline-flex items-center gap-1.5 hover:text-[#126BEB] dark:hover:text-[#38BDF8] cursor-pointer"
              >
                <span className="truncate max-w-[190px]">{currentReceipt.reference}</span>
                {isCopied ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" aria-hidden="true" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-slate-400 shrink-0 no-print" aria-hidden="true" />
                )}
              </button>
            </dd>
          </div>

          <div className="flex justify-between items-center gap-4">
            <dt className="text-slate-500 dark:text-slate-400">Date</dt>
            <dd className="text-slate-700 dark:text-slate-300 font-medium">
              {currentReceipt.date}
            </dd>
          </div>
        </dl>

        {shareFeedback && (
          <p
            role="status"
            className="no-print py-1.5 px-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs text-center font-medium"
          >
            {shareFeedback}
          </p>
        )}

        {/* Action Buttons */}
        <div className="no-print space-y-2.5">
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={handlePrintPdf}
              className="min-h-[44px] px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#070D18] hover:bg-slate-50 dark:hover:bg-slate-800/80 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" aria-hidden="true" />
              <span>Save PDF</span>
            </button>

            <button
              type="button"
              onClick={handleShare}
              className="min-h-[44px] px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#070D18] hover:bg-slate-50 dark:hover:bg-slate-800/80 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" aria-hidden="true" />
              <span>Share</span>
            </button>
          </div>

          {onRechargeAnother ? (
            <button
              type="button"
              onClick={onRechargeAnother}
              className="w-full h-11 px-4 rounded-lg bg-[#126BEB] hover:bg-[#0B5CC7] active:bg-[#094bb5] text-white text-sm font-semibold transition-colors flex items-center justify-center cursor-pointer"
            >
              Buy Another
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="w-full h-11 px-4 rounded-lg bg-[#126BEB] hover:bg-[#0B5CC7] active:bg-[#094bb5] text-white text-sm font-semibold transition-colors flex items-center justify-center cursor-pointer"
            >
              Done
            </button>
          )}
        </div>

        {/* Minimal Footer */}
        <p className="pt-2 text-center text-[11px] text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-slate-800/80">
          BAXATO &bull; support@baxato.com
        </p>
      </div>
    </ModalDialog>
  );
}
