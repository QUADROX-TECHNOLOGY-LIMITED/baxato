'use client';

import React, { useState, useRef } from 'react';
import Image from 'next/image';
import {
  X,
  Printer,
  Copy,
  Check,
  Share2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Zap,
  Phone,
  Wifi,
  Tv,
  GraduationCap,
  ShieldCheck,
} from 'lucide-react';

interface StaffReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  tx: any | null;
}

export default function StaffReceiptModal({
  isOpen,
  onClose,
  tx,
}: StaffReceiptModalProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !tx) return null;

  const copyToClipboard = (text: string, key: string, label?: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    if (label) {
      setShareFeedback(label);
      setTimeout(() => setShareFeedback(null), 2500);
    }
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const formatToken = (rawToken?: string) => {
    if (!rawToken) return '';
    const clean = rawToken.replace(/\D/g, '');
    return clean.match(/.{1,4}/g)?.join(' - ') || rawToken;
  };

  const meta = tx.metadata || {};
  const isElectricity = tx.serviceType === 'ELECTRICITY';
  const isAirtime = tx.serviceType === 'AIRTIME';
  const isData = tx.serviceType === 'DATA';
  const isCable = tx.serviceType === 'CABLE_TV' || tx.serviceType === 'CABLE';
  const isExam = tx.serviceType === 'EXAM_PIN' || tx.serviceType === 'EDUCATION';

  const rawToken = meta.token || meta.tokenValue || tx.token;
  const tokenFormatted = formatToken(rawToken);
  const units = meta.units || tx.units;
  const customerName = meta.customerName || meta.name || tx.userName;
  const meterNumber = tx.recipient || meta.meterNumber;
  const discoName = meta.discoName || meta.disco || meta.operator || 'DISCO';

  const formattedDate = new Date(tx.createdAt).toLocaleDateString('en-NG', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const getPlainTextReceipt = () => {
    const lines = [
      '========================================',
      '      BAXATO OFFICIAL TRANSACTION RECEIPT',
      '========================================',
      `Status:        ${tx.status}`,
      `Service:       ${tx.serviceType}`,
      `Amount:        ${tx.formattedAmount || `₦${Number(tx.amountNaira || 0).toLocaleString()}`}`,
      `Recipient:     ${tx.recipient}`,
    ];

    if (isElectricity) {
      lines.push(`DISCO:         ${discoName}`);
      lines.push(`Meter Number:  ${meterNumber}`);
      if (customerName) lines.push(`Customer:      ${customerName}`);
      if (tokenFormatted) lines.push(`TOKEN:         ${tokenFormatted}`);
      if (units) lines.push(`Units:         ${units} kWh`);
    } else if (isData) {
      if (meta.network) lines.push(`Network:       ${meta.network}`);
      if (meta.planName || meta.capacity) lines.push(`Plan:          ${meta.planName || meta.capacity}`);
    } else if (isAirtime) {
      if (meta.network) lines.push(`Network:       ${meta.network}`);
    } else if (isCable) {
      if (meta.operator) lines.push(`Operator:      ${meta.operator}`);
      if (meta.bouquet) lines.push(`Bouquet:       ${meta.bouquet}`);
      if (customerName) lines.push(`Customer:      ${customerName}`);
    } else if (isExam) {
      if (meta.examBody) lines.push(`Exam Body:     ${meta.examBody}`);
      if (meta.pin) lines.push(`PIN:           ${meta.pin}`);
      if (meta.serialNumber) lines.push(`Serial:        ${meta.serialNumber}`);
    }

    lines.push(`Merchant:      ${tx.businessName || 'Baxato Merchant'}`);
    lines.push(`Reference:     ${tx.requestReference || tx.clientReference || tx.id}`);
    if (tx.providerReference) lines.push(`Provider Ref:  ${tx.providerReference}`);
    lines.push(`Date & Time:   ${formattedDate}`);
    lines.push('========================================');
    lines.push('Thank you for choosing Baxato.');
    lines.push('========================================');

    return lines.join('\n');
  };

  const handlePrint = () => {
    window.print();
  };

  const handleShareWhatsApp = () => {
    const text = getPlainTextReceipt();
    copyToClipboard(text, 'share', 'WhatsApp slip copied to clipboard!');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm overflow-y-auto print:p-0 print:bg-white print:static">
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #staff-printable-receipt, #staff-printable-receipt * {
            visibility: visible !important;
          }
          #staff-printable-receipt {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 420px !important;
            margin: 0 auto !important;
            padding: 16px !important;
            background: white !important;
            color: black !important;
            box-shadow: none !important;
            border: 1px dashed #666 !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="relative w-full max-w-md my-auto bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden print:shadow-none print:border-none print:max-w-none">
        {/* Modal Controls Header (Hidden on print) */}
        <div className="no-print flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#080E1A]">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              Transaction Proof of Payment
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-medium bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60">
              STAFF VOUCHER
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 transition"
            aria-label="Close receipt"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Feedback Alert */}
        {shareFeedback && (
          <div className="no-print mx-4 mt-3 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{shareFeedback}</span>
          </div>
        )}

        {/* PRINTABLE RECEIPT BODY */}
        <div
          id="staff-printable-receipt"
          ref={receiptRef}
          className="p-5 sm:p-6 space-y-4 text-slate-900 dark:text-white"
        >
          {/* Brand Header */}
          <div className="text-center pb-3 border-b border-dashed border-slate-300 dark:border-slate-700 space-y-1">
            <div className="flex items-center justify-center gap-2">
              <div className="relative w-6 h-6 rounded overflow-hidden bg-white p-0.5 border border-slate-200 shrink-0">
                <Image
                  src="/baxato-logo.jpg"
                  alt="Baxato"
                  fill
                  priority
                  className="object-contain"
                />
              </div>
              <span className="font-extrabold text-base tracking-wider text-slate-900 dark:text-white">
                BAXATO
              </span>
            </div>
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold">
              Payment & Vending Receipt
            </p>
          </div>

          {/* Status & Amount Display */}
          <div className="text-center py-2 space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold">
              {tx.status === 'SUCCESSFUL' ? (
                <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Transaction Successful
                </span>
              ) : tx.status === 'FAILED' ? (
                <span className="flex items-center gap-1.5 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-3 py-1 rounded-full border border-red-200 dark:border-red-800">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Transaction Failed
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-3 py-1 rounded-full border border-amber-200 dark:border-amber-800">
                  <Clock className="w-3.5 h-3.5" />
                  Transaction Processing
                </span>
              )}
            </div>

            <div className="text-2xl font-black font-mono tracking-tight text-slate-900 dark:text-white pt-1">
              {tx.formattedAmount || `₦${Number(tx.amountNaira || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}`}
            </div>

            <span className="text-[11px] text-slate-500 font-medium block">
              {tx.serviceType.replace('_', ' ')} PAYMENT
            </span>
          </div>

          {/* ELECTRICITY STS TOKEN HIGHLIGHT BOX */}
          {isElectricity && tokenFormatted && (
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border-2 border-amber-300 dark:border-amber-800/80 text-center space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 block">
                PREPAID METER TOKEN
              </span>
              <div className="text-lg font-mono font-black tracking-widest text-amber-950 dark:text-amber-200 select-all">
                {tokenFormatted}
              </div>
              <div className="no-print pt-1 flex justify-center">
                <button
                  onClick={() => copyToClipboard(rawToken, 'token', 'Meter token copied!')}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300 hover:underline"
                >
                  {copiedKey === 'token' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>Copy Token</span>
                </button>
              </div>
            </div>
          )}

          {/* RECEIPT LINE ITEMS */}
          <div className="space-y-2 text-xs border-t border-b border-dashed border-slate-300 dark:border-slate-700 py-3">
            {/* Recipient */}
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Recipient / Target:</span>
              <span className="font-semibold font-mono text-slate-900 dark:text-white">
                {tx.recipient}
              </span>
            </div>

            {/* Service-Specific Fields */}
            {isElectricity && (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Electricity DISCO:</span>
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {discoName}
                  </span>
                </div>
                {units && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Purchased Units:</span>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                      {units} kWh
                    </span>
                  </div>
                )}
                {customerName && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Account Name:</span>
                    <span className="font-medium text-slate-900 dark:text-white truncate max-w-[200px]">
                      {customerName}
                    </span>
                  </div>
                )}
              </>
            )}

            {isData && (
              <>
                {meta.network && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Network:</span>
                    <span className="font-semibold text-slate-900 dark:text-white font-mono">
                      {meta.network}
                    </span>
                  </div>
                )}
                {(meta.planName || meta.capacity) && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Bundle Plan:</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {meta.planName || meta.capacity}
                    </span>
                  </div>
                )}
              </>
            )}

            {isAirtime && meta.network && (
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Network:</span>
                <span className="font-semibold text-slate-900 dark:text-white font-mono">
                  {meta.network}
                </span>
              </div>
            )}

            {isCable && (
              <>
                {meta.operator && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Operator:</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {meta.operator}
                    </span>
                  </div>
                )}
                {meta.bouquet && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Bouquet Package:</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {meta.bouquet}
                    </span>
                  </div>
                )}
                {customerName && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Subscriber Name:</span>
                    <span className="font-medium text-slate-900 dark:text-white truncate max-w-[200px]">
                      {customerName}
                    </span>
                  </div>
                )}
              </>
            )}

            {isExam && (
              <>
                {meta.examBody && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Examination Body:</span>
                    <span className="font-semibold text-slate-900 dark:text-white">
                      {meta.examBody}
                    </span>
                  </div>
                )}
                {meta.pin && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Exam PIN:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white">
                      {meta.pin}
                    </span>
                  </div>
                )}
              </>
            )}

            {/* Merchant Business */}
            <div className="flex justify-between items-center pt-1">
              <span className="text-slate-500">Merchant Account:</span>
              <span className="font-medium text-slate-900 dark:text-white truncate max-w-[200px]">
                {tx.businessName || 'Merchant'}
              </span>
            </div>

            {/* Transaction Ref */}
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Reference:</span>
              <div className="flex items-center gap-1 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                <span className="truncate max-w-[180px]">
                  {tx.requestReference || tx.clientReference || tx.id}
                </span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(tx.requestReference || tx.clientReference || tx.id, 'ref', 'Reference copied!')}
                  className="no-print text-slate-400 hover:text-slate-600"
                >
                  {copiedKey === 'ref' ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>

            {/* Provider Ref */}
            {tx.providerReference && (
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Gateway Ref:</span>
                <span className="font-mono text-[10px] text-slate-500 truncate max-w-[180px]">
                  {tx.providerReference}
                </span>
              </div>
            )}

            {/* Timestamp */}
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Date & Time:</span>
              <span className="text-slate-600 dark:text-slate-400 text-[11px]">
                {formattedDate}
              </span>
            </div>
          </div>

          {/* Official Verification Footer */}
          <div className="text-center pt-1 text-[10px] text-slate-400 space-y-0.5">
            <div className="flex items-center justify-center gap-1 font-semibold text-slate-600 dark:text-slate-400">
              <ShieldCheck className="w-3 h-3 text-emerald-500" />
              <span>Verified by Baxato National Payment Gateway</span>
            </div>
            <p>For support and inquiries, quote the transaction reference above.</p>
          </div>
        </div>

        {/* MODAL ACTIONS (Hidden on print) */}
        <div className="no-print p-4 bg-slate-50 dark:bg-[#080E1A] border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-2">
          <button
            onClick={handleShareWhatsApp}
            className="flex-1 py-2 px-3 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition flex items-center justify-center gap-1.5 shadow-sm"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Copy WhatsApp Slip</span>
          </button>

          <button
            onClick={handlePrint}
            className="py-2 px-4 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition flex items-center justify-center gap-1.5 shadow-sm"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Receipt</span>
          </button>

          <button
            onClick={onClose}
            className="py-2 px-3 rounded-xl text-xs font-medium bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
