'use client';

import React, { useId, useState } from 'react';
import { Bookmark, Check, ChevronDown, Loader2, Phone, X } from 'lucide-react';
import {
  useAnchoredPopover,
  useSavedBeneficiaries,
  type SavedBeneficiary,
} from '@/lib/use-saved-beneficiaries';

export { useSavedBeneficiaries, type SavedBeneficiary };

const NETWORK_BADGES: Record<string, { label: string; colorClass: string }> = {
  MTN: {
    label: 'MTN',
    colorClass: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/60',
  },
  AIRTEL: {
    label: 'Airtel',
    colorClass: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800/60',
  },
  GLO: {
    label: 'Glo',
    colorClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/60',
  },
  NINEMOBILE: {
    label: '9mobile',
    colorClass: 'bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-800/60',
  },
  '9MOBILE': {
    label: '9mobile',
    colorClass: 'bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-800/60',
  },
};

interface PhoneFieldWithBeneficiariesProps {
  id: string;
  label?: React.ReactNode;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  inputRef?: React.Ref<HTMLInputElement>;
  placeholder?: string;
  beneficiaries: SavedBeneficiary[];
  onSelectBeneficiary: (beneficiary: SavedBeneficiary) => void;
  onDeleteBeneficiary: (id: string) => Promise<void> | void;
  saveChecked: boolean;
  onSaveCheckedChange: (checked: boolean) => void;
  errorText?: string | null;
  errorId?: string;
  required?: boolean;
  rightBadge?: React.ReactNode;
}

export default function PhoneFieldWithBeneficiaries({
  id,
  label = 'Phone Number',
  value,
  onChange,
  onBlur,
  inputRef,
  placeholder = '0803 123 4567',
  beneficiaries,
  onSelectBeneficiary,
  onDeleteBeneficiary,
  saveChecked,
  onSaveCheckedChange,
  errorText,
  errorId,
  required,
  rightBadge,
}: PhoneFieldWithBeneficiariesProps) {
  const reactId = useId().replace(/:/g, '');
  const anchorName = `--ben-anchor-${reactId}`;
  const popoverId = `ben-popover-${reactId}`;

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

  const hasSaved = beneficiaries.length > 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label
          htmlFor={id}
          className="text-xs font-medium text-slate-700 dark:text-slate-300"
        >
          {label}
        </label>
        {rightBadge}
      </div>

      <div
        ref={wrapperRef}
        style={{ anchorName } as React.CSSProperties}
        className="relative"
      >
        <Phone className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          ref={inputRef}
          id={id}
          name="phone"
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          maxLength={20}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          required={required}
          aria-invalid={errorText ? true : undefined}
          aria-describedby={errorText && errorId ? errorId : undefined}
          className={`w-full h-11 pl-10 ${
            hasSaved ? 'pr-24' : 'pr-3.5'
          } rounded-lg border bg-white dark:bg-[#070D18] text-slate-900 dark:text-white text-sm font-medium focus:outline-none focus:ring-2 transition-colors ${
            errorText
              ? 'border-rose-400 dark:border-rose-500 focus:ring-rose-500/20 focus:border-rose-500'
              : 'border-slate-200 dark:border-slate-800 focus:ring-[#126BEB]/25 focus:border-[#126BEB]'
          }`}
        />

        {hasSaved && (
          <button
            type="button"
            onClick={togglePopover}
            aria-expanded={isOpen}
            aria-controls={popoverId}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 h-8 px-2.5 rounded-md border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-[#0D1726] hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 transition-colors"
          >
            <Bookmark className="w-3.5 h-3.5 text-[#126BEB] dark:text-[#4D94FF]" />
            <span>Saved</span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                isOpen ? 'rotate-180' : ''
              }`}
            />
          </button>
        )}
      </div>

      {hasSaved && (
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
              Saved numbers ({beneficiaries.length}/5)
            </span>
          </div>

          <div className="max-h-60 overflow-y-auto overscroll-contain space-y-0.5">
            {beneficiaries.map((ben) => {
              const badge = ben.network ? NETWORK_BADGES[ben.network] : null;
              const isSelected = value.replace(/\s+/g, '') === ben.phoneNumber;
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
                    className="flex-1 min-w-0 flex items-center justify-between gap-2 px-2.5 py-2 text-left rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-[#126BEB]/40"
                  >
                    <div className="min-w-0 flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
                        {ben.phoneNumber}
                      </span>
                      {ben.label && (
                        <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {ben.label}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {badge && (
                        <span
                          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${badge.colorClass}`}
                        >
                          {badge.label}
                        </span>
                      )}
                      {isSelected && (
                        <Check className="w-3.5 h-3.5 text-[#126BEB] dark:text-[#4D94FF]" />
                      )}
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(ben.id)}
                    disabled={deletingId === ben.id}
                    aria-label={`Remove ${ben.phoneNumber}`}
                    className="p-2 mr-0.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors shrink-0 disabled:opacity-50"
                  >
                    {deletingId === ben.id ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <X className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {errorText && (
        <p id={errorId} className="text-xs font-medium text-rose-600 dark:text-rose-400">
          {errorText}
        </p>
      )}

      <label
        htmlFor={`${id}-save-beneficiary`}
        className="inline-flex items-center gap-2 cursor-pointer select-none pt-0.5"
      >
        <input
          id={`${id}-save-beneficiary`}
          type="checkbox"
          checked={saveChecked}
          onChange={(e) => onSaveCheckedChange(e.target.checked)}
          className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-[#126BEB] focus:ring-[#126BEB]/30 bg-white dark:bg-[#070D18]"
        />
        <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
          Save beneficiary
        </span>
      </label>
    </div>
  );
}
