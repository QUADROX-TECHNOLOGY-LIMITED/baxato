'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Building,
  ChevronDown,
  Check,
  Plus,
  Loader2,
  Wallet,
  ShieldCheck,
} from 'lucide-react';
import {
  getStoredAuthToken,
  getStoredBusiness,
  setActiveBusiness,
  type StoredBusiness,
} from '@/lib/auth-session';
import CreateBusinessModal from './CreateBusinessModal';

interface BusinessItem {
  id: string;
  name: string;
  slug?: string;
  email?: string;
  role?: string;
  isOwner?: boolean;
  isActive?: boolean;
  wallets?: {
    main?: {
      formatted?: string;
      balanceNaira?: number;
    } | null;
  };
}

interface BusinessSwitcherProps {
  currentBusinessName?: string;
  onBusinessChanged?: (business: StoredBusiness) => void;
}

export default function BusinessSwitcher({
  currentBusinessName,
  onBusinessChanged,
}: BusinessSwitcherProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [businesses, setBusinesses] = useState<BusinessItem[]>([]);
  const [activeBiz, setActiveBiz] = useState<StoredBusiness | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [switchingId, setSwitchingId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadBusinesses = async () => {
    try {
      setIsLoading(true);
      const token = getStoredAuthToken();
      if (!token) return;

      const stored = getStoredBusiness();
      if (stored) setActiveBiz(stored);

      const res = await fetch('/api/businesses', {
        headers: {
          Authorization: `Bearer ${token}`,
          ...(stored?.id ? { 'x-business-id': stored.id } : {}),
        },
      });

      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        const list: BusinessItem[] = data.data.businesses || [];
        setBusinesses(list);

        // Sync active business from response if available
        if (stored?.id) {
          const match = list.find((b) => b.id === stored.id);
          if (match) {
            setActiveBiz({
              id: match.id,
              name: match.name,
              slug: match.slug,
              email: match.email,
              role: match.role,
            });
          }
        } else if (list.length > 0 && list[0]) {
          const first = list[0];
          const newActive: StoredBusiness = {
            id: first.id,
            name: first.name,
            slug: first.slug,
            email: first.email,
            role: first.role,
          };
          setActiveBiz(newActive);
          setActiveBusiness(newActive);
        }
      }
    } catch (err) {
      console.error('Failed to load businesses:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBusinesses();

    const handleSwitched = () => {
      const stored = getStoredBusiness();
      if (stored) setActiveBiz(stored);
    };

    window.addEventListener('bx_business_switched', handleSwitched);
    return () => window.removeEventListener('bx_business_switched', handleSwitched);
  }, []);

  const handleSwitch = async (targetId: string) => {
    if (activeBiz?.id === targetId || switchingId) return;

    try {
      setSwitchingId(targetId);
      const token = getStoredAuthToken();
      if (!token) return;

      const res = await fetch(`/api/businesses/${targetId}/switch`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        const switched = data.data.business;
        const newToken = data.data.token;

        const updatedBiz: StoredBusiness = {
          id: switched.id,
          name: switched.name,
          slug: switched.slug,
          email: switched.email,
          phoneNumber: switched.phoneNumber,
          role: switched.role,
        };

        setActiveBiz(updatedBiz);
        setActiveBusiness(updatedBiz, newToken);

        if (onBusinessChanged) {
          onBusinessChanged(updatedBiz);
        }

        setIsOpen(false);
        // Refresh page to cleanly reload all contextual balances & service data
        window.location.reload();
      }
    } catch (err) {
      console.error('Failed to switch business:', err);
    } finally {
      setSwitchingId(null);
    }
  };

  const displayName = activeBiz?.name || currentBusinessName || 'My Business Workspace';
  const count = businesses.length || 1;
  const canAddMore = count < 3;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Workspace Switcher Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left p-2.5 rounded-xl bg-slate-50/90 dark:bg-[#071120] hover:bg-slate-100 dark:hover:bg-[#0B1528] border border-slate-200 dark:border-slate-800/80 transition-all flex items-center justify-between gap-2 group"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-[#126BEB]/10 dark:bg-[#126BEB]/20 text-[#126BEB] dark:text-[#38BDF8] flex items-center justify-center shrink-0 border border-[#126BEB]/20">
            <Building className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate block">
              {displayName}
            </span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500 block truncate">
              {activeBiz?.email || 'Merchant Workspace'}
            </span>
          </div>
        </div>

        <ChevronDown
          className={`w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-transform shrink-0 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Switcher Dropdown Menu */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
          {/* Header */}
          <div className="px-3.5 py-2.5 bg-slate-50 dark:bg-[#080E1A] border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
              Workspaces
            </span>
            <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60">
              {count}/3 Used
            </span>
          </div>

          {/* List of Businesses */}
          <div className="max-h-56 overflow-y-auto p-1.5 space-y-1">
            {isLoading && businesses.length === 0 ? (
              <div className="py-4 text-center text-xs text-slate-400 flex items-center justify-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Loading workspaces...</span>
              </div>
            ) : (
              businesses.map((biz) => {
                const isSelected = activeBiz?.id === biz.id;
                const isSwitching = switchingId === biz.id;
                const balanceFormatted = biz.wallets?.main?.formatted;

                return (
                  <button
                    key={biz.id}
                    type="button"
                    onClick={() => handleSwitch(biz.id)}
                    disabled={isSwitching}
                    className={`w-full text-left p-2 rounded-xl transition-all flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-800/60'
                        : 'hover:bg-slate-100 dark:hover:bg-[#080E1A] border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                          isSelected
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {biz.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-xs font-semibold truncate ${
                              isSelected
                                ? 'text-blue-700 dark:text-blue-300'
                                : 'text-slate-800 dark:text-slate-200'
                            }`}
                          >
                            {biz.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400">
                          {biz.email && <span className="truncate">{biz.email}</span>}
                          {balanceFormatted && (
                            <span className="font-mono font-medium text-emerald-600 dark:text-emerald-400 shrink-0">
                              {balanceFormatted}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center">
                      {isSwitching ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                      ) : isSelected ? (
                        <Check className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      ) : null}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Bottom Action: Add New Workspace */}
          <div className="p-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-[#080E1A]/60">
            {canAddMore ? (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setIsCreateModalOpen(true);
                }}
                className="w-full py-2 px-3 rounded-xl text-xs font-semibold bg-white dark:bg-[#0D1726] hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-blue-600 dark:text-blue-400 transition flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Business Workspace</span>
              </button>
            ) : (
              <div className="py-1 px-2 text-center text-[10px] text-slate-400 font-medium">
                Maximum 3 businesses reached
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal for creating a new business */}
      <CreateBusinessModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        currentCount={count}
        onSuccess={(newBiz) => {
          loadBusinesses();
          // Reload page to activate new workspace immediately
          window.location.reload();
        }}
      />
    </div>
  );
}
