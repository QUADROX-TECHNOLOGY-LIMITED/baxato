'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import {
  X,
  Printer,
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  Clock,
} from 'lucide-react';
import ModalDialog from '@/components/ModalDialog';
import { printStaffReceipt } from '@/lib/receipt-printer';

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

  if (!tx) return null;

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const formatToken = (rawToken?: string) => {
    if (!rawToken) return '';
    const clean = rawToken.replace(/\D/g, '');
    return clean.match(/.{1,4}/g)?.join(' - ') || rawToken;
  };

  const SERVICE_CATEGORY_LABELS: Record<string, string> = {
    AIRTIME: 'Airtime',
    DATA: 'Data Bundle',
    ELECTRICITY: 'Electricity',
    CABLE_TV: 'Cable TV',
    CABLE: 'Cable TV',
    EXAM_PIN: 'Exam PIN',
    EDUCATION: 'Exam PIN',
  };
  const serviceCategoryLabel =
    SERVICE_CATEGORY_LABELS[tx.serviceType] || (tx.serviceType || '').replace(/_/g, ' ');
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
  const discoName = meta.discoName || meta.disco || meta.operator || 'Electricity';

  const formattedDate = new Date(tx.createdAt).toLocaleDateString('en-NG', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const handlePrint = () => {
    printStaffReceipt(tx);
  };

  const refValue = tx.requestReference || tx.clientReference || tx.id;

  return (
    <ModalDialog
      isOpen={isOpen && Boolean(tx)}
      onClose={onClose}
      ariaLabelledBy="staff-receipt-title"
      maxWidthClass="max-w-md"
      className="bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
    >
      {/* Modal Header Bar */}
      <div className="no-print flex items-center justify-between px-5 py-3.5 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/70 dark:bg-[#070D18]/60">
        <h2
          id="staff-receipt-title"
          className="text-sm font-semibold text-slate-900 dark:text-white"
        >
          Transaction Receipt
        </h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close receipt"
          className="min-h-10 min-w-10 -mr-2 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>

      {/* Printable Receipt Body */}
      <div
        id="staff-printable-receipt"
        className="p-5 sm:p-6 space-y-4 text-slate-900 dark:text-white max-h-[72dvh] overflow-y-auto"
      >
        <div className="text-center pb-3 border-b border-dashed border-slate-300 dark:border-slate-700 space-y-1.5">
          <div className="flex items-center justify-center gap-2">
            <div className="relative w-6 h-6 shrink-0">
              <Image
                src="/baxato-mark.svg"
                alt="BAXATO"
                fill
                priority
                className="object-contain"
              />
            </div>
            <span className="font-bold text-base tracking-tight text-slate-900 dark:text-white">
              BAXATO
            </span>
          </div>
          <p className="text-[11px] uppercase tracking-widest text-slate-500 font-semibold">
            Transaction Receipt
          </p>
        </div>

        <div className="text-center py-1 space-y-1.5">
          <div className="inline-flex items-center justify-center">
            {tx.status === 'SUCCESSFUL' ? (
              <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-full text-xs font-semibold border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Successful</span>
              </span>
            ) : tx.status === 'FAILED' ? (
              <span className="inline-flex items-center gap-1.5 text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40 px-3 py-1 rounded-full text-xs font-semibold border border-rose-200 dark:border-rose-800">
                <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Failed</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-3 py-1 rounded-full text-xs font-semibold border border-amber-200 dark:border-amber-800">
                <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{tx.status || 'Pending'}</span>
              </span>
            )}
          </div>

          <div className="text-2xl font-bold font-mono tabular-nums tracking-tight text-slate-900 dark:text-white pt-1">
            {tx.formattedAmount ||
              `₦${Number(tx.amountNaira || 0).toLocaleString('en-NG', {
                minimumFractionDigits: 2,
              })}`}
          </div>

          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">
            {serviceCategoryLabel}
          </span>
        </div>

        {isElectricity && tokenFormatted && (
          <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-800 text-center space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 block">
              Electricity Token
            </span>
            <div className="text-lg font-mono font-bold tracking-widest text-amber-950 dark:text-amber-200 select-all">
              {tokenFormatted}
            </div>
            <div className="no-print pt-0.5 flex justify-center">
              <button
                type="button"
                onClick={() => copyToClipboard(rawToken, 'token')}
                className="min-h-9 px-2.5 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300 hover:underline"
              >
                {copiedKey === 'token' ? (
                  <Check className="w-3.5 h-3.5" aria-hidden="true" />
                ) : (
                  <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                )}
                <span>{copiedKey === 'token' ? 'Copied' : 'Copy token'}</span>
              </button>
            </div>
          </div>
        )}

        <dl className="space-y-2.5 text-xs sm:text-sm border-t border-b border-dashed border-slate-300 dark:border-slate-700 py-3.5">
          <div className="flex justify-between items-center gap-3">
            <dt className="text-slate-500 dark:text-slate-400 shrink-0">Service Category</dt>
            <dd className="font-semibold text-slate-900 dark:text-white text-right">
              {serviceCategoryLabel}
            </dd>
          </div>

          <div className="flex justify-between items-center gap-3">
            <dt className="text-slate-500 dark:text-slate-400 shrink-0">Recipient</dt>
            <dd className="font-semibold font-mono text-slate-900 dark:text-white text-right truncate">
              {tx.recipient}
            </dd>
          </div>

          {isElectricity && (
            <>
              <div className="flex justify-between items-center gap-3">
                <dt className="text-slate-500 dark:text-slate-400 shrink-0">Utility</dt>
                <dd className="font-semibold text-slate-900 dark:text-white text-right">
                  {discoName}
                </dd>
              </div>
              {units && (
                <div className="flex justify-between items-center gap-3">
                  <dt className="text-slate-500 dark:text-slate-400 shrink-0">Units</dt>
                  <dd className="font-semibold text-emerald-600 dark:text-emerald-400 font-mono text-right">
                    {units} kWh
                  </dd>
                </div>
              )}
              {customerName && (
                <div className="flex justify-between items-center gap-3">
                  <dt className="text-slate-500 dark:text-slate-400 shrink-0">Customer</dt>
                  <dd className="font-medium text-slate-900 dark:text-white truncate text-right">
                    {customerName}
                  </dd>
                </div>
              )}
            </>
          )}

          {isData && (
            <>
              {meta.network && (
                <div className="flex justify-between items-center gap-3">
                  <dt className="text-slate-500 dark:text-slate-400 shrink-0">Network</dt>
                  <dd className="font-semibold text-slate-900 dark:text-white font-mono">
                    {meta.network}
                  </dd>
                </div>
              )}
              {(meta.planName || meta.capacity) && (
                <div className="flex justify-between items-center gap-3">
                  <dt className="text-slate-500 dark:text-slate-400 shrink-0">Plan</dt>
                  <dd className="font-semibold text-slate-900 dark:text-white text-right">
                    {meta.planName || meta.capacity}
                  </dd>
                </div>
              )}
            </>
          )}

          {isAirtime && meta.network && (
            <div className="flex justify-between items-center gap-3">
              <dt className="text-slate-500 dark:text-slate-400 shrink-0">Network</dt>
              <dd className="font-semibold text-slate-900 dark:text-white font-mono">
                {meta.network}
              </dd>
            </div>
          )}

          {isCable && (
            <>
              {meta.operator && (
                <div className="flex justify-between items-center gap-3">
                  <dt className="text-slate-500 dark:text-slate-400 shrink-0">Operator</dt>
                  <dd className="font-semibold text-slate-900 dark:text-white">{meta.operator}</dd>
                </div>
              )}
              {meta.bouquet && (
                <div className="flex justify-between items-center gap-3">
                  <dt className="text-slate-500 dark:text-slate-400 shrink-0">Bouquet</dt>
                  <dd className="font-semibold text-slate-900 dark:text-white text-right">
                    {meta.bouquet}
                  </dd>
                </div>
              )}
              {customerName && (
                <div className="flex justify-between items-center gap-3">
                  <dt className="text-slate-500 dark:text-slate-400 shrink-0">Customer</dt>
                  <dd className="font-medium text-slate-900 dark:text-white truncate text-right">
                    {customerName}
                  </dd>
                </div>
              )}
            </>
          )}

          {isExam && (
            <>
              {meta.examBody && (
                <div className="flex justify-between items-center gap-3">
                  <dt className="text-slate-500 dark:text-slate-400 shrink-0">Exam Body</dt>
                  <dd className="font-semibold text-slate-900 dark:text-white">{meta.examBody}</dd>
                </div>
              )}
              {meta.pin && (
                <div className="flex justify-between items-center gap-3">
                  <dt className="text-slate-500 dark:text-slate-400 shrink-0">PIN</dt>
                  <dd className="font-mono font-bold text-slate-900 dark:text-white">{meta.pin}</dd>
                </div>
              )}
            </>
          )}

          <div className="flex justify-between items-center gap-3 pt-1">
            <dt className="text-slate-500 dark:text-slate-400 shrink-0">Merchant</dt>
            <dd className="font-medium text-slate-900 dark:text-white truncate text-right">
              {tx.businessName || 'BAXATO Merchant'}
            </dd>
          </div>

          <div className="flex justify-between items-center gap-3">
            <dt className="text-slate-500 dark:text-slate-400 shrink-0">Reference</dt>
            <dd className="flex items-center gap-1.5 font-mono text-[11px] text-slate-700 dark:text-slate-300 min-w-0">
              <span className="truncate">{refValue}</span>
              <button
                type="button"
                onClick={() => copyToClipboard(refValue, 'ref')}
                aria-label="Copy transaction reference"
                className="no-print min-h-8 min-w-8 flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-white shrink-0"
              >
                {copiedKey === 'ref' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-500" aria-hidden="true" />
                ) : (
                  <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                )}
              </button>
            </dd>
          </div>

          <div className="flex justify-between items-center gap-3">
            <dt className="text-slate-500 dark:text-slate-400 shrink-0">Date</dt>
            <dd className="text-slate-600 dark:text-slate-400 text-xs text-right">
              {formattedDate}
            </dd>
          </div>
        </dl>

        <div className="text-center pt-1 text-xs text-slate-400 space-y-0.5">
          <p className="font-semibold text-slate-600 dark:text-slate-400">BAXATO</p>
          <p className="text-[11px]">support@baxato.com</p>
        </div>
      </div>

      {/* Modal Actions */}
      <div className="no-print px-5 py-4 bg-slate-50/70 dark:bg-[#070D18]/60 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-end gap-2.5">
        <button
          type="button"
          onClick={onClose}
          className="h-11 px-4 rounded-lg text-sm font-medium bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          Close
        </button>
        <button
          type="button"
          onClick={handlePrint}
          className="h-11 px-5 rounded-lg text-sm font-semibold bg-[#126BEB] hover:bg-[#0E59C9] text-white transition-colors flex items-center justify-center gap-2"
        >
          <Printer className="w-4 h-4" aria-hidden="true" />
          <span>Print Receipt</span>
        </button>
      </div>
    </ModalDialog>
  );
}
