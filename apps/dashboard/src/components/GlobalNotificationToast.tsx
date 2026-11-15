'use client';

import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { consumePendingToast, type ToastData } from '@/lib/toast';

interface ActiveToast extends ToastData {
  seq: number;
}

function hasOpenModalDialog(): boolean {
  if (typeof document === 'undefined') return false;
  return Boolean(document.querySelector('dialog[open]:modal, [role="dialog"][aria-modal="true"]'));
}

export default function GlobalNotificationToast() {
  const popoverId = useId();
  const [toast, setToast] = useState<ActiveToast | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [liveAnnouncement, setLiveAnnouncement] = useState('');

  const popoverRef = useRef<HTMLDivElement | null>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeAnimTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingQueueRef = useRef<ToastData[]>([]);
  const remainingMsRef = useRef<number>(0);
  const startedAtRef = useRef<number>(0);
  const seqRef = useRef<number>(0);
  const previousFocusRef = useRef<HTMLElement | null>(null);

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

  const restorePreviousFocusIfNeeded = useCallback(() => {
    const el = popoverRef.current;
    if (el && document.activeElement && el.contains(document.activeElement)) {
      const prev = previousFocusRef.current;
      if (prev && prev.isConnected && typeof prev.focus === 'function') {
        prev.focus();
      }
      previousFocusRef.current = null;
    }
  }, []);

  const finishClose = useCallback(() => {
    clearTimers();
    restorePreviousFocusIfNeeded();
    const el = popoverRef.current;
    try {
      if (el && typeof el.hidePopover === 'function' && el.matches(':popover-open')) {
        el.hidePopover();
      }
    } catch {}
    setToast(null);
    setIsClosing(false);
  }, [restorePreviousFocusIfNeeded]);

  const dismissToast = useCallback(() => {
    clearTimers();
    restorePreviousFocusIfNeeded();
    setIsClosing(true);

    closeAnimTimerRef.current = setTimeout(() => {
      finishClose();
    }, 220);
  }, [finishClose, restorePreviousFocusIfNeeded]);

  const scheduleAutoDismiss = useCallback(
    (durationMs: number) => {
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
      }
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
      seqRef.current += 1;
      setToast({ ...data, seq: seqRef.current });

      // Announce message text only (never button controls) via ariaNotify or pre-mounted live region
      const text = data.title ? `${data.title}. ${data.message}` : data.message;
      const docWithAriaNotify = document as Document & {
        ariaNotify?: (announcement: string, options?: { priority?: 'normal' | 'high' }) => void;
      };
      if (typeof docWithAriaNotify.ariaNotify === 'function') {
        try {
          docWithAriaNotify.ariaNotify(text, {
            priority: data.type === 'error' ? 'high' : 'normal',
          });
        } catch {
          setLiveAnnouncement(text);
        }
      } else {
        // Toggle blank first so repeated identical errors still re-announce cleanly
        setLiveAnnouncement('');
        requestAnimationFrame(() => setLiveAnnouncement(text));
      }

      const defaultDuration = data.type === 'error' ? 6000 : data.type === 'warning' ? 5000 : 3200;
      const durationMs = data.durationMs ?? defaultDuration;
      scheduleAutoDismiss(durationMs);
    },
    [scheduleAutoDismiss],
  );

  const flushIfNoModal = useCallback(() => {
    if (pendingQueueRef.current.length === 0) return;
    if (!hasOpenModalDialog()) {
      if (flushRetryTimerRef.current) {
        clearTimeout(flushRetryTimerRef.current);
        flushRetryTimerRef.current = null;
      }
      const next = pendingQueueRef.current.shift();
      if (next) {
        displayToastNow(next);
      }
      return;
    }

    // Fallback safety timer while a modal is transitioning out so queued toasts never stall
    if (flushRetryTimerRef.current) {
      clearTimeout(flushRetryTimerRef.current);
    }
    flushRetryTimerRef.current = setTimeout(() => {
      flushIfNoModal();
    }, 120);
  }, [displayToastNow]);

  const enqueueOrDisplay = useCallback(
    (data: ToastData) => {
      if (hasOpenModalDialog()) {
        pendingQueueRef.current.push(data);
        flushIfNoModal();
        return;
      }
      displayToastNow(data);
    },
    [displayToastNow, flushIfNoModal],
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

  // Promote rendered popover to Top Layer deterministically after React commits the node
  useEffect(() => {
    const el = popoverRef.current;
    if (!el || !toast || isClosing) return;

    // Force initial closed style resolution before showPopover so @starting-style slides cleanly
    void el.offsetHeight;
    try {
      if (typeof el.showPopover === 'function' && !el.matches(':popover-open')) {
        el.showPopover();
      }
    } catch {
      // Non-Popover fallback keeps element visible via data-open attribute / fixed positioning
    }
  }, [toast, isClosing]);

  // Keep React state in sync if the native close button (popovertargetaction="hide") hides the popover
  useEffect(() => {
    const el = popoverRef.current;
    if (!el) return;

    const handleToggle = (e: Event) => {
      const toggleEvent = e as ToggleEvent;
      if (toggleEvent.newState === 'closed') {
        clearTimers();
        restorePreviousFocusIfNeeded();
        setToast(null);
        setIsClosing(false);
      }
    };

    el.addEventListener('toggle', handleToggle);
    return () => el.removeEventListener('toggle', handleToggle);
  }, [toast?.seq, restorePreviousFocusIfNeeded]);

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

    const observer = new MutationObserver(flushIfNoModal);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['open', 'aria-modal', 'data-closing'],
      childList: true,
      subtree: true,
    });

    window.addEventListener('bx_show_toast', handleEvent);
    document.addEventListener('close', flushIfNoModal, true);

    return () => {
      clearTimers();
      if (flushRetryTimerRef.current) {
        clearTimeout(flushRetryTimerRef.current);
      }
      observer.disconnect();
      window.removeEventListener('bx_show_toast', handleEvent);
      document.removeEventListener('close', flushIfNoModal, true);
    };
  }, [enqueueOrDisplay, flushIfNoModal]);

  const variant = toast?.type ?? 'success';

  const variantStyles = {
    error: {
      container: 'bg-red-600 border-red-700 text-white shadow-xl shadow-red-950/25',
      iconWrap: 'bg-white/15 text-white',
      titleColor: 'text-white font-semibold',
      messageColor: 'text-white/95',
      closeBtn: 'text-white/80 hover:text-white hover:bg-white/15',
      Icon: AlertCircle,
    },
    warning: {
      container: 'bg-amber-700 border-amber-800 text-white shadow-xl shadow-amber-950/25',
      iconWrap: 'bg-white/15 text-white',
      titleColor: 'text-white font-semibold',
      messageColor: 'text-white/95',
      closeBtn: 'text-white/80 hover:text-white hover:bg-white/15',
      Icon: AlertTriangle,
    },
    info: {
      container: 'bg-[#126BEB] border-[#0E57C7] text-white shadow-xl shadow-blue-950/25',
      iconWrap: 'bg-white/15 text-white',
      titleColor: 'text-white font-semibold',
      messageColor: 'text-white/95',
      closeBtn: 'text-white/80 hover:text-white hover:bg-white/15',
      Icon: Info,
    },
    success: {
      container: 'bg-emerald-700 border-emerald-800 text-white shadow-xl shadow-emerald-950/25',
      iconWrap: 'bg-white/15 text-white',
      titleColor: 'text-white font-semibold',
      messageColor: 'text-white/95',
      closeBtn: 'text-white/80 hover:text-white hover:bg-white/15',
      Icon: CheckCircle2,
    },
  }[variant];

  const Icon = variantStyles.Icon;

  return (
    <div role="region" aria-label="Notifications" className="contents">
      {/* Always-mounted ARIA live region fallback when ariaNotify is unsupported */}
      <div className="sr-only" aria-live="assertive" aria-atomic="true">
        {liveAnnouncement}
      </div>

      {toast && (
        <div
          key={toast.seq}
          id={popoverId}
          ref={popoverRef}
          popover="manual"
          data-closing={isClosing ? 'true' : undefined}
          onMouseEnter={handlePauseTimer}
          onMouseLeave={handleResumeTimer}
          onFocusCapture={() => {
            if (
              document.activeElement instanceof HTMLElement &&
              !popoverRef.current?.contains(document.activeElement)
            ) {
              previousFocusRef.current = document.activeElement;
            }
            handlePauseTimer();
          }}
          onBlur={handleResumeTimer}
          className="baxato-toast-popover fixed top-3 left-3 right-3 mx-auto w-auto max-w-sm sm:left-auto sm:right-4 sm:top-4 sm:mx-0 sm:min-w-[300px] sm:max-w-[380px] z-[999]"
        >
          <div
            className={`pointer-events-auto flex items-start gap-2.5 px-3.5 py-2.5 rounded-xl border ${variantStyles.container}`}
          >
            <span
              className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${variantStyles.iconWrap}`}
              aria-hidden="true"
            >
              <Icon className="w-3.5 h-3.5" />
            </span>

            <div className="min-w-0 flex-1">
              {toast.title && (
                <p className={`text-xs leading-snug ${variantStyles.titleColor}`}>
                  {toast.title}
                </p>
              )}
              <p className={`text-xs sm:text-[13px] font-medium leading-snug break-words ${variantStyles.messageColor}`}>
                {toast.message}
              </p>
            </div>

            <button
              type="button"
              popoverTarget={popoverId}
              popoverTargetAction="hide"
              onClick={dismissToast}
              aria-label="Close"
              className={`p-1 -m-0.5 rounded-lg transition-colors shrink-0 cursor-pointer ${variantStyles.closeBtn}`}
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
