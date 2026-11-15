'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { consumePendingToast, type ToastData } from '@/lib/toast';

function hasOpenModalDialog(): boolean {
  if (typeof document === 'undefined') return false;
  return Boolean(document.querySelector('dialog[open]:modal, [role="dialog"][aria-modal="true"]'));
}

export default function GlobalNotificationToast() {
  const [toast, setToast] = useState<ToastData | null>(null);
  const [isClosing, setIsClosing] = useState(false);

  const popoverRef = useRef<HTMLDivElement | null>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeAnimTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingQueueRef = useRef<ToastData[]>([]);
  const remainingMsRef = useRef<number>(0);
  const startedAtRef = useRef<number>(0);

  const clearTimers = () => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
    if (closeAnimTimerRef.current) {
      clearTimeout(closeAnimTimerRef.current);
      closeAnimTimerRef.current = null;
    }
  };

  const dismissToast = useCallback(() => {
    clearTimers();
    setIsClosing(true);

    closeAnimTimerRef.current = setTimeout(() => {
      try {
        popoverRef.current?.hidePopover?.();
      } catch {}
      setToast(null);
      setIsClosing(false);
    }, 210);
  }, []);

  const scheduleAutoDismiss = useCallback(
    (durationMs: number) => {
      clearTimeout(dismissTimerRef.current ?? undefined);
      remainingMsRef.current = durationMs;
      startedAtRef.current = Date.now();
      dismissTimerRef.current = setTimeout(() => {
        dismissToast();
      }, durationMs);
    },
    [dismissToast],
  );

  const displayToastNow = useCallback(
    (data: ToastData) => {
      clearTimers();
      setIsClosing(false);
      setToast(data);

      const defaultDuration = data.type === 'error' ? 6500 : data.type === 'warning' ? 5000 : 3200;
      const durationMs = data.durationMs ?? defaultDuration;
      scheduleAutoDismiss(durationMs);

      requestAnimationFrame(() => {
        const el = popoverRef.current;
        if (!el) return;
        try {
          if (typeof el.showPopover === 'function' && !el.matches(':popover-open')) {
            el.showPopover();
          }
        } catch {
          // Safe fallback on browsers without Top Layer Popover support
        }
      });
    },
    [scheduleAutoDismiss],
  );

  const enqueueOrDisplay = useCallback(
    (data: ToastData) => {
      if (hasOpenModalDialog()) {
        pendingQueueRef.current.push(data);
        return;
      }
      displayToastNow(data);
    },
    [displayToastNow],
  );

  const handlePauseTimer = () => {
    if (!dismissTimerRef.current) return;
    clearTimeout(dismissTimerRef.current);
    dismissTimerRef.current = null;
    const elapsed = Date.now() - startedAtRef.current;
    remainingMsRef.current = Math.max(800, remainingMsRef.current - elapsed);
  };

  const handleResumeTimer = () => {
    if (!toast || isClosing || dismissTimerRef.current) return;
    const ms = remainingMsRef.current > 0 ? remainingMsRef.current : 2500;
    scheduleAutoDismiss(ms);
  };

  useEffect(() => {
    const pending = consumePendingToast();
    if (pending) {
      const t = setTimeout(() => enqueueOrDisplay(pending), 100);
      return () => clearTimeout(t);
    }
  }, [enqueueOrDisplay]);

  useEffect(() => {
    const handleEvent = (e: Event) => {
      const customEvent = e as CustomEvent<ToastData>;
      if (customEvent.detail) {
        enqueueOrDisplay(customEvent.detail);
      }
    };

    const flushIfNoModal = () => {
      if (pendingQueueRef.current.length > 0 && !hasOpenModalDialog()) {
        const next = pendingQueueRef.current.shift();
        if (next) {
          displayToastNow(next);
        }
      }
    };

    const observer = new MutationObserver(flushIfNoModal);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['open', 'aria-modal'],
      childList: true,
      subtree: true,
    });

    window.addEventListener('bx_show_toast', handleEvent);
    document.addEventListener('close', flushIfNoModal, true);

    return () => {
      clearTimers();
      observer.disconnect();
      window.removeEventListener('bx_show_toast', handleEvent);
      document.removeEventListener('close', flushIfNoModal, true);
    };
  }, [displayToastNow, enqueueOrDisplay]);

  if (!toast) return null;

  const variant = toast.type ?? 'success';
  const isError = variant === 'error';

  const variantStyles = {
    error: {
      container:
        'bg-white dark:bg-[#0D1726] border-rose-200 dark:border-rose-800/80 text-slate-900 dark:text-slate-100',
      iconWrap: 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400',
      titleColor: 'text-rose-700 dark:text-rose-300',
      Icon: AlertCircle,
    },
    warning: {
      container:
        'bg-white dark:bg-[#0D1726] border-amber-200 dark:border-amber-800/80 text-slate-900 dark:text-slate-100',
      iconWrap: 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400',
      titleColor: 'text-amber-700 dark:text-amber-300',
      Icon: AlertTriangle,
    },
    info: {
      container:
        'bg-white dark:bg-[#0D1726] border-blue-200 dark:border-blue-800/80 text-slate-900 dark:text-slate-100',
      iconWrap: 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400',
      titleColor: 'text-blue-700 dark:text-blue-300',
      Icon: Info,
    },
    success: {
      container:
        'bg-white dark:bg-[#0D1726] border-emerald-200 dark:border-emerald-800/80 text-slate-900 dark:text-slate-100',
      iconWrap: 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400',
      titleColor: 'text-emerald-700 dark:text-emerald-300',
      Icon: CheckCircle2,
    },
  }[variant];

  const Icon = variantStyles.Icon;

  return (
    <div
      ref={popoverRef}
      popover="manual"
      data-closing={isClosing ? 'true' : undefined}
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? 'assertive' : 'polite'}
      onMouseEnter={handlePauseTimer}
      onMouseLeave={handleResumeTimer}
      onFocus={handlePauseTimer}
      onBlur={handleResumeTimer}
      className="baxato-toast-popover fixed top-3 left-1/2 -translate-x-1/2 sm:left-auto sm:translate-x-0 sm:top-4 sm:right-4 z-[999] w-[calc(100vw-1.5rem)] max-w-md sm:w-auto sm:min-w-[300px]"
    >
      <div
        className={`pointer-events-auto flex items-start gap-3 px-3.5 py-3 rounded-xl border shadow-lg shadow-slate-900/10 dark:shadow-black/40 ${variantStyles.container}`}
      >
        <span
          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${variantStyles.iconWrap}`}
        >
          <Icon className="w-4 h-4" />
        </span>

        <div className="min-w-0 flex-1">
          {toast.title && (
            <p className={`text-xs font-semibold leading-snug ${variantStyles.titleColor}`}>
              {toast.title}
            </p>
          )}
          <p className="text-xs sm:text-[13px] font-medium text-slate-700 dark:text-slate-200 leading-relaxed break-words">
            {toast.message}
          </p>
        </div>

        <button
          type="button"
          onClick={dismissToast}
          aria-label="Dismiss notification"
          className="p-1 -m-0.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/70 transition-colors shrink-0"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
