'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  clearSessionAndRedirect,
  getStoredAuthToken,
  getStoredBusiness,
  handleAuthResponse,
  isTokenExpired,
} from '@/lib/auth-session';

export interface WalletRecord {
  id: string;
  businessId: string;
  type: 'MAIN' | string;
  balanceKobo?: string;
  balanceNaira: number;
  formattedBalance?: string;
  lockedBalanceKobo?: string;
  lockedBalanceNaira?: number;
}

interface UseWalletBalanceOptions {
  enabled?: boolean;
}

interface UseWalletBalanceResult {
  walletBalance: number;
  wallets: WalletRecord[];
  isLoadingBalance: boolean;
  hasLoadedBalance: boolean;
  refreshWallets: () => Promise<void>;
}

function extractBalanceNaira(wallet: WalletRecord): number {
  if (typeof wallet.balanceNaira === 'number' && !Number.isNaN(wallet.balanceNaira)) {
    return wallet.balanceNaira;
  }
  const kobo = Number(wallet.balanceKobo || '0');
  return Number.isFinite(kobo) ? kobo / 100 : 0;
}

function parseSseBlock(block: string): { event: string; data: string } | null {
  const lines = block.split(/\r?\n/);
  let eventName = 'message';
  const dataLines: string[] = [];

  for (const line of lines) {
    if (!line || line.startsWith(':')) continue;
    if (line.startsWith('event:')) {
      eventName = line.slice(6).trim();
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trim());
    }
  }

  if (dataLines.length === 0) return null;
  return { event: eventName, data: dataLines.join('\n') };
}

export function useWalletBalance(
  options: UseWalletBalanceOptions = {},
): UseWalletBalanceResult {
  const { enabled = true } = options;

  const [wallets, setWallets] = useState<WalletRecord[]>([]);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [isLoadingBalance, setIsLoadingBalance] = useState<boolean>(true);
  const [hasLoadedBalance, setHasLoadedBalance] = useState<boolean>(false);

  const mountedRef = useRef<boolean>(true);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const streamAbortRef = useRef<AbortController | null>(null);

  const applyWallets = useCallback((list: WalletRecord[]) => {
    if (!mountedRef.current) return;
    setWallets(list);
    const main = list.find((w) => w.type === 'MAIN');
    if (main) setWalletBalance(extractBalanceNaira(main));
  }, []);

  const applySingleWalletUpdate = useCallback((updated: WalletRecord) => {
    if (!mountedRef.current || !updated) return;
    setWallets((prev) => {
      const idx = prev.findIndex((w) => w.id === updated.id || w.type === updated.type);
      const next =
        idx >= 0 ? prev.map((w, i) => (i === idx ? { ...w, ...updated } : w)) : [...prev, updated];
      return next;
    });
    if (updated.type === 'MAIN') {
      setWalletBalance(extractBalanceNaira(updated));
    }
  }, []);

  const buildHeaders = useCallback((): Record<string, string> | null => {
    const token = getStoredAuthToken();
    if (!token || isTokenExpired(token)) {
      return null;
    }
    const biz = getStoredBusiness();
    return {
      Authorization: `Bearer ${token}`,
      ...(biz?.id ? { 'x-business-id': biz.id } : {}),
    };
  }, []);

  const refreshWallets = useCallback(async () => {
    const headers = buildHeaders();
    if (!headers) {
      clearSessionAndRedirect('expired');
      return;
    }

    try {
      setIsLoadingBalance(true);
      const res = await fetch('/api/wallets', { headers, cache: 'no-store' });
      const json = await res.json().catch(() => null);
      if (handleAuthResponse(res, json)) return;
      if (res.ok && json?.success && Array.isArray(json.data?.wallets)) {
        applyWallets(json.data.wallets);
      }
    } catch {
      // Network error ignored; stream retry handles recovery
    } finally {
      if (mountedRef.current) {
        setIsLoadingBalance(false);
        setHasLoadedBalance(true);
      }
    }
  }, [applyWallets, buildHeaders]);

  useEffect(() => {
    mountedRef.current = true;
    if (!enabled) return;

    let attempt = 0;

    const stopStream = () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (streamAbortRef.current) {
        streamAbortRef.current.abort();
        streamAbortRef.current = null;
      }
    };

    const connectStream = async () => {
      stopStream();
      if (!mountedRef.current) return;

      const headers = buildHeaders();
      if (!headers) return;

      const controller = new AbortController();
      streamAbortRef.current = controller;

      try {
        const response = await fetch('/api/wallets/stream', {
          method: 'GET',
          headers: {
            ...headers,
            Accept: 'text/event-stream',
          },
          cache: 'no-store',
          signal: controller.signal,
        });

        if (response.status === 401 || response.status === 403) {
          const json = await response.json().catch(() => null);
          handleAuthResponse(response, json);
          return;
        }

        if (!response.ok || !response.body) {
          throw new Error('Stream unavailable');
        }

        attempt = 0;
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (mountedRef.current && !controller.signal.aborted) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          let sepIdx = buffer.indexOf('\n\n');
          while (sepIdx !== -1) {
            const rawBlock = buffer.slice(0, sepIdx);
            buffer = buffer.slice(sepIdx + 2);
            const parsed = parseSseBlock(rawBlock);
            if (parsed) {
              try {
                const payload = JSON.parse(parsed.data);
                if (parsed.event === 'wallet_snapshot' && Array.isArray(payload?.wallets)) {
                  applyWallets(payload.wallets);
                  if (mountedRef.current) {
                    setIsLoadingBalance(false);
                    setHasLoadedBalance(true);
                  }
                } else if (parsed.event === 'wallet_updated' && payload?.wallet) {
                  applySingleWalletUpdate(payload.wallet);
                }
              } catch {
                // Ignore malformed event JSON
              }
            }
            sepIdx = buffer.indexOf('\n\n');
          }
        }
      } catch {
        // Ignore abort errors on unmount/switch
      }

      if (mountedRef.current && !controller.signal.aborted) {
        attempt += 1;
        const delayMs = Math.min(1500 * Math.pow(2, attempt - 1), 15_000);
        reconnectTimerRef.current = setTimeout(() => {
          connectStream();
        }, delayMs);
      }
    };

    refreshWallets();
    connectStream();

    const handleBusinessSwitch = () => {
      attempt = 0;
      refreshWallets();
      connectStream();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshWallets();
        if (!streamAbortRef.current || streamAbortRef.current.signal.aborted) {
          connectStream();
        }
      }
    };

    window.addEventListener('bx_business_switched', handleBusinessSwitch);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      mountedRef.current = false;
      stopStream();
      window.removeEventListener('bx_business_switched', handleBusinessSwitch);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [applySingleWalletUpdate, applyWallets, buildHeaders, enabled, refreshWallets]);

  return {
    walletBalance,
    wallets,
    isLoadingBalance,
    hasLoadedBalance,
    refreshWallets,
  };
}

