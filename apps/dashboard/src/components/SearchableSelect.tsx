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
        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border-2 text-base sm:text-sm font-medium text-left transition-colors duration-150 outline-none ${
          disabled
            ? 'bg-slate-100 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 text-slate-400 cursor-not-allowed'
            : isOpen
            ? 'bg-white dark:bg-[#0D1726] border-[#126BEB] dark:border-[#1677FF] ring-2 ring-[#126BEB]/10 text-slate-900 dark:text-white'
            : 'bg-white dark:bg-[#0D1726] border-slate-200 dark:border-[#1E2D44] hover:border-slate-300 dark:hover:border-slate-600 text-slate-900 dark:text-white'
        }`}
      >
        <span className={value ? 'text-slate-900 dark:text-white font-medium' : 'text-slate-400 dark:text-slate-500'}>
          {value || placeholder}
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={2}
          stroke="currentColor"
          className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-[#126BEB] dark:text-[#1677FF]' : ''
          }`}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="absolute z-[100] w-full mt-1.5 bg-white dark:bg-[#0D1726] border-2 border-slate-200 dark:border-[#1E2D44] rounded-xl shadow-xl overflow-hidden"
          >
            <div className="p-2 border-b border-slate-100 dark:border-[#1E2D44] bg-slate-50/70 dark:bg-[#080F1C]">
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-[#1E2D44] rounded-lg px-3 py-2 text-base sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#126BEB] dark:focus:border-[#1677FF] focus:ring-1 focus:ring-[#126BEB]"
              />
            </div>

            <ul className="max-h-48 overflow-y-auto divide-y divide-slate-50 dark:divide-slate-800/40">
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
                      className={`px-4 py-2.5 text-base sm:text-sm font-medium cursor-pointer flex items-center justify-between transition-colors ${
                        isSelected
                          ? 'bg-blue-50 dark:bg-blue-950/40 text-[#126BEB] dark:text-[#38BDF8] font-bold'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#152338]'
                      }`}
                    >
                      <span>{opt}</span>
                      {isSelected && (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          className="w-4 h-4 text-[#126BEB] dark:text-[#38BDF8]"
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
                <li className="px-4 py-3 text-sm text-slate-400 italic text-center">
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
