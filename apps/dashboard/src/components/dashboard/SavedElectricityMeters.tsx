'use client';

import React, { useId, useState } from 'react';
import { Bookmark, Check, ChevronDown, Loader2, X } from 'lucide-react';
import {
  useAnchoredPopover,
  type SavedElectricityBeneficiary,
} from '@/lib/use-saved-beneficiaries';

interface SavedElectricityMetersProps {
  label: React.ReactNode;
  beneficiaries: SavedElectricityBeneficiary[];
  currentMeterNumber: string;
  currentDisco?: string;
  currentMeterType?: 'PREPAID' | 'POSTPAID';
  onSelectBeneficiary: (beneficiary: SavedElectricityBeneficiary) => void;
  onDeleteBeneficiary: (id: string) => Promise<void> | void;
}

/**
 * Renders the Meter Number label row with a compact right-aligned `Saved` trigger.
 * Anchors the native `popover="auto"` dropdown to the full-width row so it never
 * clips on narrow mobile screens.
 */
export function SavedMetersLabelRow({
  label,
  beneficiaries,
  currentMeterNumber,
  currentDisco,
  currentMeterType,
  onSelectBeneficiary,
  onDeleteBeneficiary,
}: SavedElectricityMetersProps) {
  const reactId = useId().replace(/:/g, '');
  const anchorName = `--elec-ben-anchor-${reactId}`;
  const popoverId = `elec-ben-popover-${reactId}`;
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const {
    wrapperRef,
    popoverRef,
    isOpen,
    fallbackCoords,
    closePopover,
    togglePopover,
  } = useAnchoredPopover(beneficiaries.length > 0);

  const handleDelete = async (benId: string) => {
    try {
      setDeletingId(benId);
      await onDeleteBeneficiary(benId);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <>
      <div
        ref={wrapperRef}
        style={{ anchorName } as React.CSSProperties}
        className="flex items-center justify-between gap-2"
      >
        {label}

        {beneficiaries.length > 0 && (
          <button
            type="button"
            onClick={togglePopover}
            aria-expanded={isOpen}
            aria-controls={popoverId}
            className="h-7 px-2.5 rounded-md border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-[#0D1726] hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-medium text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
          >
            <Bookmark className="w-3 h-3 text-[#126BEB] dark:text-[#4D94FF]" aria-hidden="true" />
            <span>Saved</span>
            <ChevronDown
              className={`w-3 h-3 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
              aria-hidden="true"
            />
          </button>
        )}
      </div>

      {beneficiaries.length > 0 && (
        <div
          id={popoverId}
          ref={popoverRef}
          popover="auto"
          style={
            fallbackCoords
              ? {
                  position: 'fixed',
                  top: `${fallbackCoords.top}px`,
                  left: `${fallbackCoords.left}px`,
                  width: `${fallbackCoords.width}px`,
                }
              : ({
                  positionAnchor: anchorName,
                  minWidth: '280px',
                  maxWidth: 'calc(100vw - 2rem)',
                } as React.CSSProperties)
          }
          className="baxato-anchored-popover rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1424] shadow-xl shadow-slate-900/10 dark:shadow-black/50 p-1.5 z-50 w-full max-w-sm"
        >
          <div className="px-2.5 py-1.5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 mb-1">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Saved meters ({beneficiaries.length}/5)
            </span>
          </div>

          <div className="max-h-60 overflow-y-auto overscroll-contain space-y-0.5">
            {beneficiaries.map((ben) => {
              const cleanCurrent = currentMeterNumber.replace(/\D/g, '');
              const isSelected =
                cleanCurrent === (ben.meterNumber || '') &&
                currentDisco === ben.disco &&
                currentMeterType === ben.meterType;

              return (
                <div
                  key={ben.id}
                  className={`flex items-center gap-1 rounded-lg transition-colors ${
                    isSelected
                      ? 'bg-[#126BEB]/10 dark:bg-[#1677FF]/15'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => {
                      onSelectBeneficiary(ben);
                      closePopover();
                    }}
                    className="flex-1 min-w-0 flex items-center justify-between gap-2 px-2.5 py-2 text-left rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#126BEB]/40 cursor-pointer"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-mono font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                          {ben.meterNumber}
                        </span>
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded border bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 shrink-0">
                          {ben.disco} · {ben.meterType === 'POSTPAID' ? 'Postpaid' : 'Prepaid'}
                        </span>
                      </div>
                      {ben.label && (
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5 uppercase">
                          {ben.label}
                        </p>
                      )}
                    </div>

                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-[#126BEB] dark:text-[#4D94FF] shrink-0" aria-hidden="true" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(ben.id)}
                    disabled={deletingId === ben.id}
                    aria-label={`Remove meter ${ben.meterNumber}`}
                    className="p-2 mr-0.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors shrink-0 disabled:opacity-50 cursor-pointer"
                  >
                    {deletingId === ben.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      <X className="w-3.5 h-3.5" aria-hidden="true" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Compact Saved Meters selector strip for View 1 (Catalog) so returning users can
 * jump straight to a saved meter without searching the DisCo grid.
 */
export function SavedMetersQuickStrip({
  beneficiaries,
  onSelectBeneficiary,
  onDeleteBeneficiary,
}: {
  beneficiaries: SavedElectricityBeneficiary[];
  onSelectBeneficiary: (beneficiary: SavedElectricityBeneficiary) => void;
  onDeleteBeneficiary: (id: string) => Promise<void> | void;
}) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (beneficiaries.length === 0) return null;

  const handleDelete = async (benId: string) => {
    try {
      setDeletingId(benId);
      await onDeleteBeneficiary(benId);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300">
        <Bookmark className="w-3.5 h-3.5 text-[#126BEB] dark:text-[#4D94FF]" aria-hidden="true" />
        <span>Saved Meters</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {beneficiaries.map((ben) => (
          <div
            key={ben.id}
            className="inline-flex items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1528] hover:border-[#126BEB] dark:hover:border-[#126BEB] transition-colors overflow-hidden"
          >
            <button
              type="button"
              onClick={() => onSelectBeneficiary(ben)}
              className="flex items-center gap-2 pl-3 pr-2 py-2 text-left cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#126BEB]/40"
            >
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-500/10 text-[#126BEB] dark:text-[#38BDF8]">
                {ben.disco} {ben.meterType === 'POSTPAID' ? 'Post' : 'Pre'}
              </span>
              <span className="text-xs font-mono font-semibold text-slate-900 dark:text-white tabular-nums">
                {ben.meterNumber}
              </span>
              {ben.label && (
                <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[140px] uppercase">
                  · {ben.label}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleDelete(ben.id)}
              disabled={deletingId === ben.id}
              aria-label={`Remove saved meter ${ben.meterNumber}`}
              className="pr-2.5 pl-1 py-2 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer disabled:opacity-50"
            >
              {deletingId === ben.id ? (
                <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
              ) : (
                <X className="w-3 h-3" aria-hidden="true" />
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
