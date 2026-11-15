'use client';

import React, { useEffect, useRef } from 'react';

let cachedSupportsDisplayTransition: boolean | undefined;

function canTransitionDisplay(): boolean {
  if (cachedSupportsDisplayTransition !== undefined) {
    return cachedSupportsDisplayTransition;
  }
  if (
    typeof window === 'undefined' ||
    !window.CSS?.supports?.('transition-behavior', 'allow-discrete') ||
    !document.body
  ) {
    return false;
  }
  const probe = document.createElement('div');
  probe.style.cssText = 'transition: display 1s allow-discrete !important; display: block;';
  document.body.appendChild(probe);
  getComputedStyle(probe).display;
  probe.style.display = 'none';
  cachedSupportsDisplayTransition = getComputedStyle(probe).display === 'block';
  probe.remove();
  return cachedSupportsDisplayTransition;
}

function supportsTopLayerExit(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(window.CSS?.supports?.('overlay', 'auto')) && canTransitionDisplay();
}

async function closeTopLayer(dialog: HTMLDialogElement): Promise<void> {
  if (!dialog.open) return;

  if (!supportsTopLayerExit()) {
    dialog.setAttribute('data-closing', '');
    const animations = dialog.getAnimations ? dialog.getAnimations({ subtree: true }) : [];
    if (animations.length > 0) {
      await Promise.race([
        Promise.allSettled(animations.map((a) => a.finished)),
        new Promise((resolve) => setTimeout(resolve, 400)),
      ]);
    }
    if (!dialog.isConnected) return;
    if (!dialog.hasAttribute('data-closing')) return;
    dialog.removeAttribute('data-closing');
  }

  if (dialog.isConnected && dialog.open) {
    dialog.close();
  }
}

export interface ModalDialogProps {
  isOpen: boolean;
  onClose: () => void;
  dismissible?: boolean;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  maxWidthClass?: string;
  className?: string;
  children: React.ReactNode;
}

/**
 * Native top-layer modal built on `<dialog>` + `showModal()`, following modern-web-guidance:
 * - Native top layer, focus management, Esc/back-gesture dismissal, and `::backdrop`
 * - `closedby="any"` + pointerdown/pointerup bounds fallback where `closedBy` is unsupported
 * - Progressive top-layer exit transitions (`data-closing`) + `overscroll-behavior: contain`
 */
export default function ModalDialog({
  isOpen,
  onClose,
  dismissible = true,
  ariaLabel,
  ariaLabelledBy,
  maxWidthClass = 'max-w-md',
  className = '',
  children,
}: ModalDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const onCloseRef = useRef(onClose);
  const dismissibleRef = useRef(dismissible);

  onCloseRef.current = onClose;
  dismissibleRef.current = dismissible;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleCancel = (event: Event) => {
      event.preventDefault();
      if (!dismissibleRef.current) return;
      void closeTopLayer(dialog);
    };

    const handleClose = () => {
      dialog.returnValue = '';
      onCloseRef.current();
    };

    dialog.addEventListener('cancel', handleCancel);
    dialog.addEventListener('close', handleClose);

    // Fallback for browsers without native `closedby` attribute support (e.g. Safari)
    let cleanupLightDismiss: (() => void) | undefined;
    if (!('closedBy' in HTMLDialogElement.prototype)) {
      let pressedOutside = false;
      const isOutside = (e: PointerEvent) => {
        const rect = dialog.getBoundingClientRect();
        return (
          e.clientX < rect.left ||
          e.clientX > rect.right ||
          e.clientY < rect.top ||
          e.clientY > rect.bottom
        );
      };
      const handlePointerDown = (e: PointerEvent) => {
        if (!dismissibleRef.current) {
          pressedOutside = false;
          return;
        }
        pressedOutside = isOutside(e);
      };
      const handlePointerUp = (e: PointerEvent) => {
        if (!dismissibleRef.current) {
          pressedOutside = false;
          return;
        }
        if (pressedOutside && isOutside(e)) {
          void closeTopLayer(dialog);
        }
        pressedOutside = false;
      };

      dialog.addEventListener('pointerdown', handlePointerDown);
      dialog.addEventListener('pointerup', handlePointerUp);
      cleanupLightDismiss = () => {
        dialog.removeEventListener('pointerdown', handlePointerDown);
        dialog.removeEventListener('pointerup', handlePointerUp);
      };
    }

    return () => {
      dialog.removeEventListener('cancel', handleCancel);
      dialog.removeEventListener('close', handleClose);
      cleanupLightDismiss?.();
      if (dialog.open) {
        dialog.close();
      }
    };
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (dialog.hasAttribute('data-closing')) {
        dialog.removeAttribute('data-closing');
      }
      if (!dialog.open) {
        dialog.showModal();
      }
    } else if (dialog.open) {
      const hasRenderableChildren = children !== null && children !== undefined && children !== false;
      if (!hasRenderableChildren) {
        dialog.removeAttribute('data-closing');
        dialog.close();
      } else {
        void closeTopLayer(dialog);
      }
    }
  }, [isOpen, children]);

  return (
    <dialog
      ref={dialogRef}
      aria-label={!ariaLabelledBy ? ariaLabel : undefined}
      aria-labelledby={ariaLabelledBy}
      {...({ closedby: dismissible ? 'any' : 'none' } as Record<string, string>)}
      className={`baxato-dialog w-[calc(100%-2rem)] ${maxWidthClass} max-h-[calc(100dvh-2rem)] overflow-y-auto bg-white dark:bg-[#0B1220] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl shadow-slate-900/15 dark:shadow-black/60 ${className}`.trim()}
    >
      {children}
    </dialog>
  );
}

