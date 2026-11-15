'use client';

import { useEffect } from 'react';
import { registerModalOverlay } from './theme-sync';

/**
 * Synchronizes mobile status/navigation chrome theme-color with an open modal backdrop.
 */
export function useModalThemeSync(isOpen: boolean): void {
  useEffect(() => {
    if (!isOpen) return;
    return registerModalOverlay();
  }, [isOpen]);
}

