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
  GraduationCap,
  Printer,
  ExternalLink,
  Eye,
  EyeOff,
  ShieldCheck,
  CheckCheck,
} from 'lucide-react';

export interface ExamPinItem {
  pin: string;
  serialNumber?: string;
  instructions?: string;
}

export interface ExamPinReceiptData {
  transactionId: string;
  reference: string;
  clientReference?: string;
  providerReference?: string;
  providerName?: string;
  status: 'SUCCESSFUL' | 'PROCESSING' | 'PENDING' | 'FAILED' | 'REVERSED';

  // Package & Council
  packageCode: string;
  packageName: string;
  examBody: 'JAMB' | 'WAEC' | 'NECO' | 'NABTEB' | string;
  councilLogo?: string;
  portalUrl?: string;
  instructions?: string;

  // Candidate
  candidateId: string;
  candidateName?: string;
  candidateEmail?: string;

  // Vended PINs
  pins: ExamPinItem[];
  quantity: number;

  // Financial breakdown
  baseCostNaira: number;
  merchantMarkupNaira: number;
  amountDebitedNaira: number;

  // Metadata
  date: string;
  source?: 'LIVE_PROVIDER' | 'ENCRYPTED_INVENTORY';
  errorMessage?: string;
}

interface ExamPinReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  receipt: ExamPinReceiptData | null;
  onVendAnother?: () => void;
}

export default function ExamPinReceiptModal({
  isOpen,
  onClose,
  receipt,
  onVendAnother,
}: ExamPinReceiptModalProps) {
  const [copiedPinIdx, setCopiedPinIdx] = useState<number | null>(null);
  const [copiedSerialIdx, setCopiedSerialIdx] = useState<number | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);
  const [showPins, setShowPins] = useState(true);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  if (!isOpen || !receipt) return null;

  const isSuccess = receipt.status === 'SUCCESSFUL';
  const isPending = receipt.status === 'PROCESSING' || receipt.status === 'PENDING';

  const formatNaira = (val: number) =>
    `₦${val.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const handleCopyPin = (pin: string, idx: number) => {
    navigator.clipboard.writeText(pin);
    setCopiedPinIdx(idx);
    setTimeout(() => setCopiedPinIdx(null), 2000);
  };

  const handleCopySerial = (serial: string, idx: number) => {
    navigator.clipboard.writeText(serial);
    setCopiedSerialIdx(idx);
    setTimeout(() => setCopiedSerialIdx(null), 2000);
  };

  const handleCopyAllPins = () => {
    const text = receipt.pins
      .map(
        (p, i) =>
          `PIN ${i + 1}: ${p.pin}${p.serialNumber ? ` | Serial: ${p.serialNumber}` : ''}`,
      )
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleCopyRef = () => {
    navigator.clipboard.writeText(receipt.reference);
    setCopiedRef(true);
    setTimeout(() => setCopiedRef(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShare = async () => {
    const shareText = `Baxato Exam PIN Receipt\nPackage: ${receipt.packageName}\nCandidate: ${receipt.candidateName || receipt.candidateId}\nAmount: ${formatNaira(receipt.amountDebitedNaira)}\nRef: ${receipt.reference}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Exam PIN - ${receipt.packageName}`,
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

  const getCouncilLogo = (body: string) => {
    const b = body.toLowerCase();
    if (b.includes('jamb')) return '/logos/education/jamb.png';
    if (b.includes('waec')) return '/logos/education/waec.png';
    if (b.includes('neco')) return '/logos/education/neco.png';
    if (b.includes('nabteb')) return '/logos/education/nabteb.png';
    return '/favicon.ico';
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg my-8 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-800 dark:text-slate-100 print:shadow-none print:border-none print:m-0"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 print:hidden">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-sm font-semibold tracking-wide text-slate-700 dark:text-slate-200">
              Exam PIN Vending Receipt
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Status & Council Banner */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 p-1 flex items-center justify-center border border-slate-200 dark:border-slate-700">
                <Image
                  src={receipt.councilLogo || getCouncilLogo(receipt.examBody)}
                  alt={receipt.examBody}
                  width={40}
                  height={40}
                  className="object-contain max-h-10"
                />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900 dark:text-white leading-tight">
                  {receipt.packageName}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Council: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{receipt.examBody}</span>
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

          {/* VENDED PIN DISPLAY SECTION */}
          {receipt.pins && receipt.pins.length > 0 && (
            <div className="bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/20 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800 dark:text-emerald-300">
                    Official e-PIN{receipt.pins.length > 1 ? `s (${receipt.pins.length})` : ''}
                  </span>
                </div>
                <div className="flex items-center gap-2 print:hidden">
                  <button
                    type="button"
                    onClick={() => setShowPins(!showPins)}
                    className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition"
                  >
                    {showPins ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    <span>{showPins ? 'Hide' : 'Reveal'}</span>
                  </button>
                  {receipt.pins.length > 1 && (
                    <button
                      type="button"
                      onClick={handleCopyAllPins}
                      className="flex items-center gap-1 text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300"
                    >
                      {copiedAll ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedAll ? 'Copied All' : 'Copy All'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Pin Items List */}
              <div className="space-y-2.5">
                {receipt.pins.map((pinItem, idx) => (
                  <div
                    key={idx}
                    className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border border-emerald-500/20 rounded-lg p-3 space-y-2"
                  >
                    {/* PIN Row */}
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-semibold tracking-wider uppercase text-slate-400">
                          {receipt.pins.length > 1 ? `PIN #${idx + 1}` : 'Vended PIN'}
                        </span>
                        <div className="font-mono font-bold text-lg text-emerald-600 dark:text-emerald-400 tracking-wider">
                          {showPins ? pinItem.pin : '•••• •••• •••• ••••'}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyPin(pinItem.pin, idx)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition print:hidden"
                      >
                        {copiedPinIdx === idx ? (
                          <>
                            <Check className="w-3.5 h-3.5" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" /> Copy PIN
                          </>
                        )}
                      </button>
                    </div>

                    {/* Serial Number Row (if present) */}
                    {pinItem.serialNumber && (
                      <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 dark:border-slate-800">
                        <div>
                          <span className="text-[10px] font-medium uppercase text-slate-400">
                            Serial Number
                          </span>
                          <div className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                            {pinItem.serialNumber}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopySerial(pinItem.serialNumber!, idx)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition print:hidden"
                        >
                          {copiedSerialIdx === idx ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-500" /> Copied
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" /> Copy Serial
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Candidate & Registration Details */}
          <div className="bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-2.5 text-xs">
            <div className="flex justify-between items-center py-1 border-b border-slate-200/60 dark:border-slate-800/80">
              <span className="text-slate-500 dark:text-slate-400">
                {receipt.examBody === 'JAMB' ? 'Candidate Profile Code' : 'Candidate Phone / ID'}
              </span>
              <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                {receipt.candidateId}
              </span>
            </div>

            {receipt.candidateName && (
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60 dark:border-slate-800/80">
                <span className="text-slate-500 dark:text-slate-400">Candidate Name</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {receipt.candidateName}
                </span>
              </div>
            )}

            <div className="flex justify-between items-center py-1 border-b border-slate-200/60 dark:border-slate-800/80">
              <span className="text-slate-500 dark:text-slate-400">Quantity</span>
              <span className="font-semibold text-slate-800 dark:text-slate-200">
                {receipt.quantity} {receipt.quantity > 1 ? 'Units' : 'Unit'}
              </span>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-slate-200/60 dark:border-slate-800/80">
              <span className="text-slate-500 dark:text-slate-400">Wholesale Face Cost</span>
              <span className="font-mono text-slate-700 dark:text-slate-300">
                {formatNaira(receipt.baseCostNaira * receipt.quantity)}
              </span>
            </div>

            <div className="flex justify-between items-center py-1 border-b border-slate-200/60 dark:border-slate-800/80">
              <span className="text-slate-500 dark:text-slate-400">Merchant Markup</span>
              <span className="font-mono text-emerald-600 dark:text-emerald-400 font-semibold">
                +{formatNaira(receipt.merchantMarkupNaira * receipt.quantity)}
              </span>
            </div>

            <div className="flex justify-between items-center pt-1 text-sm font-bold">
              <span className="text-slate-900 dark:text-white">Total Amount Debited</span>
              <span className="font-mono text-slate-900 dark:text-white">
                {formatNaira(receipt.amountDebitedNaira)}
              </span>
            </div>
          </div>

          {/* Reference & Audit Information */}
          <div className="bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800/60 rounded-xl p-3 space-y-1.5 text-[11px] text-slate-500 dark:text-slate-400">
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

            {receipt.portalUrl && (
              <div className="flex justify-between items-center pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
                <span>Official Verification:</span>
                <a
                  href={receipt.portalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline font-medium print:hidden"
                >
                  <span>Portal</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>

          {/* Official Instructions */}
          {receipt.instructions && (
            <div className="p-3 bg-blue-50/60 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-800/40 rounded-xl text-xs text-blue-800 dark:text-blue-300">
              <span className="font-semibold block mb-0.5">Instructions for Candidate:</span>
              <p className="leading-relaxed">{receipt.instructions}</p>
            </div>
          )}

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

            {onVendAnother && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onVendAnother();
                }}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-semibold text-xs text-white shadow-sm transition"
              >
                <span>Vend Another</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
