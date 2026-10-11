export interface ToastData {
  type?: 'success' | 'info' | 'warning' | 'error';
  title?: string;
  message: string;
  durationMs?: number;
}

const STORAGE_KEY = 'bx_flash_toast';

/**
 * Triggers a real-time toast notification via CustomEvent.
 */
export function showToast(toast: ToastData): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('bx_show_toast', { detail: toast }));
}

/**
 * Stores a pending toast in sessionStorage so it displays after page reload or redirect.
 */
export function setPendingToast(toast: ToastData): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(toast));
  } catch (err) {
    console.warn('Failed to store pending toast:', err);
  }
}

/**
 * Retrieves and clears any pending toast from sessionStorage.
 */
export function consumePendingToast(): ToastData | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(STORAGE_KEY);
    return JSON.parse(raw) as ToastData;
  } catch {
    return null;
  }
}
