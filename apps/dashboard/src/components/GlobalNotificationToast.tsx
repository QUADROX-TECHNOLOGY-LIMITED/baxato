'use client';

import React, { useEffect, useState, useRef } from 'react';
import { CheckCircle2, AlertCircle, Info, X, Building } from 'lucide-react';
import { consumePendingToast, type ToastData } from '@/lib/toast';

export default function GlobalNotificationToast() {
  const [toast, setToast] = useState<ToastData | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const displayToast = (data: ToastData) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setToast(data);
    setIsVisible(true);

    const duration = data.durationMs || 4500;
    timerRef.current = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => setToast(null), 300);
    }, duration);
  };

  const handleDismiss = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setIsVisible(false);
    setTimeout(() => setToast(null), 300);
  };

  useEffect(() => {
    // Check for any flash toast waiting from a reload / switch action
    const pending = consumePendingToast();
    if (pending) {
      // Small tick delay to allow initial DOM paint for smooth slide-in
      const t = setTimeout(() => {
        displayToast(pending);
      }, 150);
      return () => clearTimeout(t);
    }
  }, []);

  useEffect(() => {
    const handleEvent = (e: Event) => {
      const customEvent = e as CustomEvent<ToastData>;
      if (customEvent.detail) {
        displayToast(customEvent.detail);
      }
    };

    window.addEventListener('bx_show_toast', handleEvent);
    return () => window.removeEventListener('bx_show_toast', handleEvent);
  }, []);

  if (!toast) return null;

  const isSuccess = !toast.type || toast.type === 'success';
  const isError = toast.type === 'error';
  const isWarning = toast.type === 'warning';

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed top-4 inset-x-3 sm:inset-x-auto sm:right-6 sm:w-96 z-50 transition-all duration-300 ease-out transform pointer-events-auto ${
        isVisible
          ? 'translate-y-0 opacity-100'
          : '-translate-y-4 opacity-0 pointer-events-none'
      }`}
    >
      <div
        className={`rounded-2xl p-4 shadow-2xl backdrop-blur-md border transition-all ${
          isSuccess
            ? 'bg-white/95 dark:bg-[#0D1726]/95 border-emerald-500/30 dark:border-emerald-500/40 shadow-emerald-500/10'
            : isError
            ? 'bg-white/95 dark:bg-[#0D1726]/95 border-red-500/30 dark:border-red-500/40 shadow-red-500/10'
            : isWarning
            ? 'bg-white/95 dark:bg-[#0D1726]/95 border-amber-500/30 dark:border-amber-500/40 shadow-amber-500/10'
            : 'bg-white/95 dark:bg-[#0D1726]/95 border-blue-500/30 dark:border-blue-500/40 shadow-blue-500/10'
        }`}
      >
        <div className="flex items-start gap-3.5">
          {/* Icon Badge */}
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
              isSuccess
                ? 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                : isError
                ? 'bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/20'
                : isWarning
                ? 'bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/20'
                : 'bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/20'
            }`}
          >
            {isSuccess ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : isError ? (
              <AlertCircle className="w-5 h-5" />
            ) : isWarning ? (
              <AlertCircle className="w-5 h-5" />
            ) : (
              <Building className="w-5 h-5" />
            )}
          </div>

          {/* Text Content */}
          <div className="flex-1 min-w-0 pt-0.5">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
              {toast.title}
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
              {toast.message}
            </p>
          </div>

          {/* Dismiss Button */}
          <button
            type="button"
            onClick={handleDismiss}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition shrink-0"
            aria-label="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
