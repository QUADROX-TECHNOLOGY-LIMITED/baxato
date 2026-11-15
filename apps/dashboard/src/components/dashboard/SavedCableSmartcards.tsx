'use client';

import React, { useId, useState } from 'react';
import { Bookmark, Check, ChevronDown, Loader2, Tv, X } from 'lucide-react';
import {
  useAnchoredPopover,
  type CableOperatorCode,
  type SavedCableBeneficiary,
} from '@/lib/use-saved-beneficiaries';

const OPERATOR_BADGES: Record<CableOperatorCode, { label: string; colorClass: string }> = {
  DSTV: {
    label: 'DStv',
    colorClass:
      'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800/60',
  },
  GOTV: {
    label: 'GOtv',
    colorClass:
      'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60',
  },
  STARTIMES: {
    label: 'StarTimes',
    colorClass:
      'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-800/60',
  },
};

interface SavedCableQuickStripProps {
  beneficiaries: SavedCableBeneficiary[];
  onSelectBeneficiary: (beneficiary: SavedCableBeneficiary) => void;
}

export function SavedCableQuickStrip({
  beneficiaries,
  onSelectBeneficiary,
}: SavedCableQuickStripProps) {
  if (beneficiaries.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
        <Bookmark className="w-3.5 h-3.5 text-[#126BEB] dark:text-[#4D94FF]" aria-hidden="true" />
        <span>Saved</span>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {beneficiaries.map((ben) => {
          const badge = OPERATOR_BADGES[ben.operator] || OPERATOR_BADGES.DSTV;
          return (
            <button
              key={ben.id}
              type="button"
              onClick={() => onSelectBeneficiary(ben)}
              className="shrink-0 inline-flex items-center gap-2.5 h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1528] hover:border-[#126BEB] dark:hover:border-[#126BEB] transition-colors text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#126BEB] cursor-pointer"
            >
              <Tv className="w-3.5 h-3.5 text-[#126BEB] dark:text-[#4D94FF] shrink-0" aria-hidden="true" />
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-semibold text-slate-900 dark:text-white truncate max-w-[140px]">
                  {ben.label || 'Saved decoder'}
                </span>
                <span className="text-xs font-mono text-slate-500 dark:text-slate-400 tabular-nums">
                  {ben.smartcardNumber}
                </span>
                <span
                  className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${badge.colorClass}`}
                >
                  {badge.label}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

interface SavedCableLabelRowProps {
  label: React.ReactNode;
  beneficiaries: SavedCableBeneficiary[];
  currentSmartcard: string;
  currentOperator: CableOperatorCode;
  onSelectBeneficiary: (beneficiary: SavedCableBeneficiary) => void;
  onDeleteBeneficiary: (id: string) => Promise<void> | void;
}

export function SavedCableLabelRow({
  label,
  beneficiaries,
  currentSmartcard,
  currentOperator,
  onSelectBeneficiary,
  onDeleteBeneficiary,
}: SavedCableLabelRowProps) {
  const reactId = useId().replace(/:/g, '');
  const anchorName = `--cable-anchor-${reactId}`;
  const popoverId = `cable-popover-${reactId}`;
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const {
    wrapperRef,
    popoverRef,
    isOpen,
    fallbackCoords,
    closePopover,
    togglePopover,
  } = useAnchoredPopover(beneficiaries.length > 0);

  const handleDelete = async (id: string) => {
    try {
      setDeletingId(id);
      await onDeleteBeneficiary(id);
    } finally {
      setDeletingId(null);
    }
  };

  const cleanCurrent = currentSmartcard.replace(/\D/g, '');
  const hasSaved = beneficiaries.length > 0;

  return (
    <div className="flex items-center justify-between gap-2">
      {label}

      {hasSaved && (
        <div
          ref={wrapperRef}
          style={{ anchorName } as React.CSSProperties}
          className="relative"
        >
          <button
            type="button"
            onClick={togglePopover}
            aria-expanded={isOpen}
            aria-controls={popoverId}
            className="h-7 px-2.5 rounded-md border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-[#0D1726] hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Bookmark className="w-3.5 h-3.5 text-[#126BEB] dark:text-[#4D94FF]" aria-hidden="true" />
            <span>Saved</span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                isOpen ? 'rotate-180' : ''
              }`}
              aria-hidden="true"
            />
          </button>

          <div
            id={popoverId}
            ref={popoverRef}
            popover="auto"
            style={
              fallbackCoords
                ? {
                    position: 'fixed',
                    top: `${fallbackCoords.top}px`,
                    left: `${Math.max(12, fallbackCoords.left + fallbackCoords.width - 320)}px`,
                    width: '320px',
                  }
                : ({
                    positionAnchor: anchorName,
                    width: '320px',
                    maxWidth: 'calc(100vw - 2rem)',
                  } as React.CSSProperties)
            }
            className="baxato-anchored-popover rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1424] shadow-xl shadow-slate-900/10 dark:shadow-black/50 p-1.5 z-50"
          >
            <div className="px-2.5 py-1.5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 mb-1">
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Saved smartcards ({beneficiaries.length}/5)
              </span>
            </div>

            <div className="max-h-64 overflow-y-auto overscroll-contain space-y-0.5">
              {beneficiaries.map((ben) => {
                const badge = OPERATOR_BADGES[ben.operator] || OPERATOR_BADGES.DSTV;
                const isSelected =
                  cleanCurrent === ben.smartcardNumber && currentOperator === ben.operator;

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
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-mono font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                            {ben.smartcardNumber}
                          </span>
                          <span
                            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${badge.colorClass}`}
                          >
                            {badge.label}
                          </span>
                        </div>
                        {ben.label && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                            {ben.label}
                          </p>
                        )}
                      </div>

                      {isSelected && (
                        <Check
                          className="w-3.5 h-3.5 text-[#126BEB] dark:text-[#4D94FF] shrink-0"
                          aria-hidden="true"
                        />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(ben.id)}
                      disabled={deletingId === ben.id}
                      aria-label={`Remove ${ben.smartcardNumber}`}
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
        </div>
      )}
    </div>
  );
}

