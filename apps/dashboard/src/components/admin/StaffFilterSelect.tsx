'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

export interface SelectOption<T extends string = string> {
  value: T;
  label: string;
  dotColor?: string;
}

interface StaffFilterSelectProps<T extends string = string> {
  options: SelectOption<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  disabled?: boolean;
  className?: string;
}

export default function StaffFilterSelect<T extends string = string>({
  options,
  value,
  onChange,
  ariaLabel,
  disabled = false,
  className = '',
}: StaffFilterSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const activeOption = options.find((opt) => opt.value === value) || options[0];

  return (
    <div ref={wrapperRef} className={`relative ${isOpen ? 'z-50' : 'z-10'} ${className}`.trim()}>
      <button
        type="button"
        disabled={disabled}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        className={`w-full h-11 px-3.5 rounded-lg border text-sm font-medium text-left flex items-center justify-between gap-2 transition-colors outline-none ${
          disabled
            ? 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 text-slate-400'
            : isOpen
              ? 'bg-white dark:bg-[#0B1528] border-[#126BEB] dark:border-[#38BDF8] ring-2 ring-[#126BEB]/15 dark:ring-[#38BDF8]/15 text-slate-900 dark:text-white'
              : 'bg-slate-50/70 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-800 dark:text-slate-100'
        }`}
      >
        <span className="flex items-center gap-2 truncate">
          {activeOption?.dotColor && (
            <span className={`w-2 h-2 rounded-full shrink-0 ${activeOption.dotColor}`} aria-hidden="true" />
          )}
          <span className="truncate">{activeOption?.label || value}</span>
        </span>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 shrink-0 transition-transform duration-150 ${
            isOpen ? 'rotate-180 text-[#126BEB] dark:text-[#38BDF8]' : ''
          }`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <ul
          id={listboxId}
          role="listbox"
          aria-label={ariaLabel}
          className="absolute z-40 left-0 right-0 mt-1.5 bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg overflow-hidden py-1 max-h-60 overflow-y-auto"
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <li key={opt.value} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full min-h-11 sm:min-h-10 px-3.5 py-2 text-sm flex items-center justify-between gap-2 text-left transition-colors ${
                    isSelected
                      ? 'bg-slate-100 dark:bg-slate-800 text-[#126BEB] dark:text-[#38BDF8] font-semibold'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <span className="flex items-center gap-2 truncate">
                    {opt.dotColor && (
                      <span className={`w-2 h-2 rounded-full shrink-0 ${opt.dotColor}`} aria-hidden="true" />
                    )}
                    <span className="truncate">{opt.label}</span>
                  </span>
                  {isSelected && <Check className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

