'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface SearchableSelectProps {
  options: string[];
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  id?: string;
}

export default function SearchableSelect({
  options,
  placeholder,
  value,
  onChange,
  disabled = false,
  id,
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // When opening, gently ensure the component is visible in viewport without causing jarring jumps
  const handleToggle = () => {
    if (disabled) return;
    const nextState = !isOpen;
    setIsOpen(nextState);
    setSearch('');

    if (nextState) {
      setTimeout(() => {
        wrapperRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        // Only auto-focus on desktop devices with physical keyboards (not mobile touch screens)
        const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        if (!isTouch && searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 50);
    }
  };

  const filteredOptions = options.filter((opt) =>
    opt.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div ref={wrapperRef} className="relative w-full" id={id}>
      <button
        type="button"
        disabled={disabled}
        onClick={handleToggle}
        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg border text-sm font-normal text-left transition-all duration-150 outline-none ${
          disabled
            ? 'bg-slate-100 dark:bg-[#07111F]/50 border-slate-200 dark:border-[#1D3048]/50 text-slate-400 cursor-not-allowed'
            : isOpen
            ? 'bg-white dark:bg-[#101F33] border-[#126BEB] dark:border-[#1677FF] ring-2 ring-[#126BEB]/10 text-[#0B1220] dark:text-[#F8FAFC]'
            : 'bg-white dark:bg-[#101F33] border-[#E2E8F0] dark:border-[#1D3048] hover:border-slate-400 dark:hover:border-slate-600 text-[#0B1220] dark:text-[#F8FAFC]'
        }`}
      >
        <span className={value ? 'text-[#0B1220] dark:text-[#F8FAFC]' : 'text-[#94A3B8] dark:text-[#64748B]'}>
          {value || placeholder}
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-[#126BEB] dark:text-[#1677FF]' : ''
          }`}
        >
          <path
            fillRule="evenodd"
            d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute z-[100] w-full mt-1.5 bg-white dark:bg-[#101F33] border border-[#E2E8F0] dark:border-[#1D3048] rounded-xl shadow-2xl overflow-hidden"
          >
            <div className="p-2 border-b border-[#E2E8F0] dark:border-[#1D3048] bg-slate-50/50 dark:bg-[#0B1728]/50">
              <div className="relative flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-3.5 h-3.5 absolute left-2.5 text-slate-400"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z"
                  />
                </svg>
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white dark:bg-[#07111F] border border-[#E2E8F0] dark:border-[#1D3048] rounded-lg text-[#0B1220] dark:text-[#F8FAFC] placeholder-slate-400 focus:outline-none focus:border-[#126BEB] dark:focus:border-[#1677FF]"
                />
              </div>
            </div>

            <ul className="max-h-52 overflow-y-auto py-1 touch-pan-y overscroll-contain">
              {filteredOptions.length > 0 ? (
                filteredOptions.map((opt) => {
                  const isSelected = opt === value;
                  return (
                    <li
                      key={opt}
                      onClick={() => {
                        onChange(opt);
                        setSearch('');
                        setIsOpen(false);
                      }}
                      className={`px-3.5 py-2 text-xs cursor-pointer flex items-center justify-between transition-colors ${
                        isSelected
                          ? 'bg-[#126BEB]/10 dark:bg-[#1677FF]/20 text-[#126BEB] dark:text-[#1677FF] font-semibold'
                          : 'text-[#0B1220] dark:text-[#F8FAFC] hover:bg-slate-50 dark:hover:bg-[#1A2E4C]'
                      }`}
                    >
                      <span>{opt}</span>
                      {isSelected && (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          className="w-3.5 h-3.5 text-[#126BEB] dark:text-[#1677FF]"
                        >
                          <path
                            fillRule="evenodd"
                            d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </li>
                  );
                })
              ) : (
                <li className="px-3.5 py-3 text-xs text-slate-400 italic text-center">
                  No matching results
                </li>
              )}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
