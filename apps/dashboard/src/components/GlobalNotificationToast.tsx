'use client';

import React, { useEffect, useState, useRef } from 'react';
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

    const duration = data.durationMs || 2500;
    timerRef.current = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => setToast(null), 250);
    }, duration);
  };

  useEffect(() => {
    const pending = consumePendingToast();
    if (pending) {
      const t = setTimeout(() => displayToast(pending), 100);
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

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all duration-200 ease-out transform ${
        isVisible
          ? 'translate-y-0 opacity-100 scale-100'
          : '-translate-y-3 opacity-0 scale-95'
      }`}
    >
      <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/95 dark:bg-[#0D1726]/95 text-white border border-slate-700/60 shadow-xl backdrop-blur-md">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
        <span className="text-xs font-medium text-slate-100 tracking-tight whitespace-nowrap">
          {toast.message || toast.title}
        </span>
      </div>
    </div>
  );
}
