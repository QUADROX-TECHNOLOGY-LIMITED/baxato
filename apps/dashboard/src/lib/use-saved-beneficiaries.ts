'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getStoredAuthToken,
  getStoredBusiness,
  handleAuthResponse,
  isTokenExpired,
} from '@/lib/auth-session';
import { showToast } from '@/lib/toast';

export type BeneficiaryServiceType = 'AIRTIME' | 'DATA' | 'ELECTRICITY' | 'CABLE_TV';
export type ElectricityMeterType = 'PREPAID' | 'POSTPAID';
export type CableOperatorCode = 'DSTV' | 'GOTV' | 'STARTIMES';

export interface SavedPhoneBeneficiary {
  id: string;
  businessId: string;
  phoneNumber: string;
  network: string | null;
  meterNumber?: string | null;
  disco?: string | null;
  meterType?: ElectricityMeterType | null;
  smartcardNumber?: string | null;
  operator?: CableOperatorCode | null;
  label: string | null;
  serviceType: 'AIRTIME' | 'DATA' | null;
  createdAt: string;
  updatedAt: string;
}

export interface SavedElectricityBeneficiary {
  id: string;
  businessId: string;
  phoneNumber?: string | null;
  network?: string | null;
  meterNumber: string;
  disco: string;
  meterType: ElectricityMeterType;
  smartcardNumber?: string | null;
  operator?: CableOperatorCode | null;
  label: string | null;
  serviceType: 'ELECTRICITY';
  createdAt: string;
  updatedAt: string;
}

export interface SavedCableBeneficiary {
  id: string;
  businessId: string;
  phoneNumber?: string | null;
  network?: string | null;
  meterNumber?: string | null;
  disco?: string | null;
  meterType?: ElectricityMeterType | null;
  smartcardNumber: string;
  operator: CableOperatorCode;
  label: string | null;
  serviceType: 'CABLE_TV';
  createdAt: string;
  updatedAt: string;
}

export type SavedBeneficiary = SavedPhoneBeneficiary;

export type SaveBeneficiaryParams =
  | {
      serviceType: 'AIRTIME' | 'DATA';
      phoneNumber: string;
      network?: string | null;
      label?: string;
    }
  | {
      serviceType: 'ELECTRICITY';
      meterNumber: string;
      disco: string;
      meterType: ElectricityMeterType;
      label?: string;
    }
  | {
      serviceType: 'CABLE_TV';
      smartcardNumber: string;
      operator: CableOperatorCode;
      label?: string;
    };

export function useSavedBeneficiaries(serviceType: 'CABLE_TV'): {
  beneficiaries: SavedCableBeneficiary[];
  isLoadingBeneficiaries: boolean;
  fetchBeneficiaries: () => Promise<void>;
  saveBeneficiary: (params: SaveBeneficiaryParams) => Promise<void>;
  deleteBeneficiary: (id: string) => Promise<void>;
};
export function useSavedBeneficiaries(serviceType: 'ELECTRICITY'): {
  beneficiaries: SavedElectricityBeneficiary[];
  isLoadingBeneficiaries: boolean;
  fetchBeneficiaries: () => Promise<void>;
  saveBeneficiary: (params: SaveBeneficiaryParams) => Promise<void>;
  deleteBeneficiary: (id: string) => Promise<void>;
};
export function useSavedBeneficiaries(serviceType?: 'AIRTIME' | 'DATA'): {
  beneficiaries: SavedPhoneBeneficiary[];
  isLoadingBeneficiaries: boolean;
  fetchBeneficiaries: () => Promise<void>;
  saveBeneficiary: (params: SaveBeneficiaryParams) => Promise<void>;
  deleteBeneficiary: (id: string) => Promise<void>;
};
/**
 * Shared hook to load, save, and delete saved beneficiaries for the active business.
 * Scopes phone beneficiaries (AIRTIME/DATA) separately from utility beneficiaries (ELECTRICITY, CABLE_TV).
 */
export function useSavedBeneficiaries(serviceType?: BeneficiaryServiceType) {
  const [beneficiaries, setBeneficiaries] = useState<
    Array<SavedPhoneBeneficiary | SavedElectricityBeneficiary | SavedCableBeneficiary>
  >([]);
  const [isLoadingBeneficiaries, setIsLoadingBeneficiaries] = useState(false);

  const getHeaders = useCallback(() => {
    const token = getStoredAuthToken();
    if (!token || isTokenExpired(token)) return null;
    const biz = getStoredBusiness();
    return {
      Authorization: `Bearer ${token}`,
      ...(biz?.id ? { 'x-business-id': biz.id } : {}),
    };
  }, []);

  const fetchBeneficiaries = useCallback(async () => {
    const headers = getHeaders();
    if (!headers) return;

    const url =
      serviceType === 'ELECTRICITY' || serviceType === 'CABLE_TV'
        ? `/api/beneficiaries?serviceType=${serviceType}`
        : '/api/beneficiaries';

    try {
      setIsLoadingBeneficiaries(true);
      const res = await fetch(url, { headers, cache: 'no-store' });
      const json = await res.json().catch(() => null);
      if (handleAuthResponse(res, json)) return;
      if (res.ok && json?.success && Array.isArray(json.data)) {
        setBeneficiaries(json.data);
      }
    } catch {
      // Non-blocking
    } finally {
      setIsLoadingBeneficiaries(false);
    }
  }, [getHeaders, serviceType]);

  const saveBeneficiary = useCallback(
    async (params: SaveBeneficiaryParams) => {
      const headers = getHeaders();
      if (!headers) return;

      const payload =
        params.serviceType === 'ELECTRICITY'
          ? {
              serviceType: 'ELECTRICITY',
              meterNumber: params.meterNumber,
              disco: params.disco,
              meterType: params.meterType,
              ...(params.label ? { label: params.label } : {}),
            }
          : params.serviceType === 'CABLE_TV'
            ? {
                serviceType: 'CABLE_TV',
                smartcardNumber: params.smartcardNumber,
                operator: params.operator,
                ...(params.label ? { label: params.label } : {}),
              }
            : {
                serviceType: params.serviceType,
                phoneNumber: params.phoneNumber,
                ...(params.network ? { network: params.network } : {}),
                ...(params.label ? { label: params.label } : {}),
              };

      try {
        const res = await fetch('/api/beneficiaries', {
          method: 'POST',
          headers: {
            ...headers,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });
        const json = await res.json().catch(() => null);
        if (handleAuthResponse(res, json)) return;
        if (res.ok && json?.success) {
          await fetchBeneficiaries();
        }
      } catch {
        // Non-blocking background persistence after purchase
      }
    },
    [fetchBeneficiaries, getHeaders],
  );

  const deleteBeneficiary = useCallback(
    async (id: string) => {
      const headers = getHeaders();
      if (!headers) return;

      try {
        const res = await fetch(`/api/beneficiaries/${encodeURIComponent(id)}`, {
          method: 'DELETE',
          headers,
        });
        const json = await res.json().catch(() => null);
        if (handleAuthResponse(res, json)) return;
        if (res.ok && json?.success) {
          setBeneficiaries((prev) => prev.filter((item) => item.id !== id));
        } else {
          showToast({
            type: 'error',
            message: json?.error?.message || 'Unable to remove saved beneficiary.',
          });
        }
      } catch {
        showToast({
          type: 'error',
          message: 'Network error while removing beneficiary.',
        });
      }
    },
    [getHeaders],
  );

  useEffect(() => {
    fetchBeneficiaries();

    const handleSwitch = () => {
      fetchBeneficiaries();
    };
    window.addEventListener('bx_business_switched', handleSwitch);
    return () => window.removeEventListener('bx_business_switched', handleSwitch);
  }, [fetchBeneficiaries]);

  return {
    beneficiaries,
    isLoadingBeneficiaries,
    fetchBeneficiaries,
    saveBeneficiary,
    deleteBeneficiary,
  };
}

/**
 * Shared state and CSS Anchor Positioning / fallback coordinates for `popover="auto"` dropdowns.
 */
export function useAnchoredPopover(hasItems: boolean, alignEnd = false) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [fallbackCoords, setFallbackCoords] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  const supportsAnchorPositioning = () =>
    typeof CSS !== 'undefined' &&
    typeof CSS.supports === 'function' &&
    CSS.supports('position-area', 'block-end');

  const updateFallbackCoords = useCallback(() => {
    if (supportsAnchorPositioning() || !wrapperRef.current) return;
    const rect = wrapperRef.current.getBoundingClientRect();
    const minWidth = Math.max(rect.width, 280);
    const maxAllowedLeft = Math.max(12, window.innerWidth - minWidth - 12);
    const desiredLeft = alignEnd ? rect.right - minWidth : rect.left;
    setFallbackCoords({
      top: rect.bottom + 6,
      left: Math.min(Math.max(12, desiredLeft), maxAllowedLeft),
      width: minWidth,
    });
  }, [alignEnd]);

  const closePopover = useCallback(() => {
    setIsOpen(false);
    const el = popoverRef.current;
    if (!el) return;
    try {
      if (typeof el.hidePopover === 'function' && el.matches(':popover-open')) {
        el.hidePopover();
      }
    } catch {}
  }, []);

  const openPopover = useCallback(() => {
    if (!hasItems) return;
    updateFallbackCoords();
    setIsOpen(true);
    requestAnimationFrame(() => {
      const el = popoverRef.current;
      if (!el) return;
      try {
        if (typeof el.showPopover === 'function' && !el.matches(':popover-open')) {
          el.showPopover();
        }
      } catch {}
    });
  }, [hasItems, updateFallbackCoords]);

  const togglePopover = useCallback(() => {
    if (isOpen) {
      closePopover();
    } else {
      openPopover();
    }
  }, [closePopover, isOpen, openPopover]);

  useEffect(() => {
    const el = popoverRef.current;
    if (!el) return;

    const handleNativeToggle = (e: Event) => {
      const evt = e as Event & { newState?: string };
      if (evt.newState === 'closed') {
        setIsOpen(false);
      } else if (evt.newState === 'open') {
        setIsOpen(true);
      }
    };

    el.addEventListener('toggle', handleNativeToggle);
    return () => el.removeEventListener('toggle', handleNativeToggle);
  }, [hasItems]);

  useEffect(() => {
    if (!isOpen) return;

    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(target) &&
        popoverRef.current &&
        !popoverRef.current.contains(target)
      ) {
        closePopover();
      }
    };

    const handleResizeOrScroll = () => {
      updateFallbackCoords();
    };

    document.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('resize', handleResizeOrScroll);
    window.addEventListener('scroll', handleResizeOrScroll, true);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('resize', handleResizeOrScroll);
      window.removeEventListener('scroll', handleResizeOrScroll, true);
    };
  }, [closePopover, isOpen, updateFallbackCoords]);

  return {
    wrapperRef,
    popoverRef,
    isOpen,
    fallbackCoords,
    closePopover,
    togglePopover,
  };
}
