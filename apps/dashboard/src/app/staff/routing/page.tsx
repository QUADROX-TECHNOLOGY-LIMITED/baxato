'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  RefreshCw,
  X,
  Smartphone,
  Wifi,
  Tv,
  Zap,
  GraduationCap,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import BaxatoLoader from '@/components/BaxatoLoader';
import StaffFilterSelect, { type SelectOption } from '@/components/admin/StaffFilterSelect';
import {
  clearSessionAndRedirect,
  getStoredAuthToken,
  handleAuthResponse,
  isTokenExpired,
} from '@/lib/auth-session';
import { showToast } from '@/lib/toast';

type RoutingStrategy =
  | 'PRIMARY_FALLBACK'
  | 'VTPASS_FALLBACK'
  | 'MONNIFY_ONLY'
  | 'VTPASS_ONLY';

interface ServiceItem {
  type: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultStrategy: RoutingStrategy;
}

const SERVICES: ServiceItem[] = [
  {
    type: 'AIRTIME',
    name: 'Airtime',
    icon: Smartphone,
    defaultStrategy: 'MONNIFY_ONLY',
  },
  {
    type: 'DATA',
    name: 'Data Bundles',
    icon: Wifi,
    defaultStrategy: 'MONNIFY_ONLY',
  },
  {
    type: 'ELECTRICITY',
    name: 'Electricity',
    icon: Zap,
    defaultStrategy: 'MONNIFY_ONLY',
  },
  {
    type: 'CABLE_TV',
    name: 'Cable TV',
    icon: Tv,
    defaultStrategy: 'MONNIFY_ONLY',
  },
  {
    type: 'EXAM_PIN',
    name: 'Exam PINs',
    icon: GraduationCap,
    defaultStrategy: 'MONNIFY_ONLY',
  },
];

const PROVIDER_DISPLAY_NAMES: Record<string, string> = {
  MONNIFY: 'Monnify',
  VTPASS: 'VTPass',
};

const STRATEGY_SELECT_OPTIONS: SelectOption<RoutingStrategy>[] = [
  { value: 'PRIMARY_FALLBACK', label: 'Monnify → VTPass (Fallback)' },
  { value: 'VTPASS_FALLBACK', label: 'VTPass → Monnify (Fallback)' },
  { value: 'MONNIFY_ONLY', label: 'Monnify only' },
  { value: 'VTPASS_ONLY', label: 'VTPass only' },
];

export default function StaffRoutingPage() {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [savingService, setSavingService] = useState<string | null>(null);
  const [providerStatuses, setProviderStatuses] = useState<any[]>([]);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const [savedStrategies, setSavedStrategies] = useState<Record<string, RoutingStrategy>>({});
  const [draftStrategies, setDraftStrategies] = useState<Record<string, RoutingStrategy>>({});

  const loadRouting = useCallback(async () => {
    try {
      setIsLoading(true);
      const token = getStoredAuthToken();
      if (!token || isTokenExpired(token)) {
        clearSessionAndRedirect('expired');
        return;
      }

      const res = await fetch('/api/admin/providers/health', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json().catch(() => null);
      if (handleAuthResponse(res, data)) return;

      if (res.ok && data?.success) {
        const statuses = data.data?.providerStatuses || data.data?.providers || [];
        const routing = data.data?.routingTable || data.data?.routing || [];

        setProviderStatuses(statuses);

        const initialMap: Record<string, RoutingStrategy> = {};
        for (const s of SERVICES) {
          const found = routing.find((r: any) => r.serviceType === s.type);
          initialMap[s.type] = (found?.strategy as RoutingStrategy) || s.defaultStrategy;
        }
        setSavedStrategies(initialMap);
        setDraftStrategies(initialMap);
      } else {
        setStatusMessage({
          type: 'error',
          text: data?.error?.message || 'Unable to load routing.',
        });
      }
    } catch {
      setStatusMessage({
        type: 'error',
        text: 'Network error loading routing.',
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRouting();
    const handleRefreshEvent = () => {
      void loadRouting();
    };
    window.addEventListener('bx_staff_refresh', handleRefreshEvent);
    return () => window.removeEventListener('bx_staff_refresh', handleRefreshEvent);
  }, [loadRouting]);

  const handleSave = async (serviceType: string) => {
    const selectedStrategy = draftStrategies[serviceType];
    if (!selectedStrategy) return;

    const option = STRATEGY_SELECT_OPTIONS.find((o) => o.value === selectedStrategy);
    const serviceItem = SERVICES.find((s) => s.type === serviceType);
    try {
      setSavingService(serviceType);
      setStatusMessage(null);
      const token = getStoredAuthToken();
      if (!token) {
        clearSessionAndRedirect('expired');
        return;
      }

      const res = await fetch('/api/admin/providers/routing', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          serviceType,
          strategy: selectedStrategy,
          allowFailover:
            selectedStrategy === 'PRIMARY_FALLBACK' || selectedStrategy === 'VTPASS_FALLBACK',
        }),
      });

      const data = await res.json().catch(() => null);
      if (handleAuthResponse(res, data)) return;

      if (res.ok && data?.success) {
        const msg = `${serviceItem?.name || serviceType} set to ${option?.label || selectedStrategy}.`;
        setStatusMessage({ type: 'success', text: msg });
        showToast({ type: 'success', message: msg });
        setSavedStrategies((prev) => ({ ...prev, [serviceType]: selectedStrategy }));
      } else {
        const msg = data?.error?.message || 'Unable to update routing.';
        setStatusMessage({ type: 'error', text: msg });
        showToast({ type: 'error', message: msg });
      }
    } catch {
      const msg = 'Network error saving routing.';
      setStatusMessage({ type: 'error', text: msg });
      showToast({ type: 'error', message: msg });
    } finally {
      setSavingService(null);
    }
  };

  if (isLoading && providerStatuses.length === 0 && Object.keys(savedStrategies).length === 0) {
    return <BaxatoLoader variant="inline" className="py-24" />;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight [text-wrap:balance]">
        Routing &amp; Health
      </h1>

      {statusMessage && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center justify-between gap-3 border ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
            ) : (
              <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            aria-label="Dismiss message"
            className="min-h-11 min-w-11 sm:min-h-9 sm:min-w-9 flex items-center justify-center rounded-md hover:bg-black/5 dark:hover:bg-white/5 shrink-0"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Gateways */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
          Gateways
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {providerStatuses.map((p: any) => {
            const isHealthy = Boolean(p.health?.isHealthy);
            const latency = Number(p.health?.latencyMs || 0);
            const displayName = PROVIDER_DISPLAY_NAMES[p.providerName] || p.providerName;

            return (
              <div
                key={p.providerName}
                className="p-4 sm:p-5 rounded-xl bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                    {displayName}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 tabular-nums">
                    {isHealthy
                      ? latency > 0
                        ? `Response time: ${latency} ms`
                        : 'Connected'
                      : 'Connection unavailable'}
                  </p>
                </div>

                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border shrink-0 ${
                    isHealthy
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border-emerald-200/80 dark:border-emerald-800/60'
                      : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border-rose-200/80 dark:border-rose-800/60'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${isHealthy ? 'bg-emerald-500' : 'bg-rose-500'}`}
                    aria-hidden="true"
                  />
                  <span>{isHealthy ? 'Online' : 'Offline'}</span>
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Service Routing */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
          Service Routing
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {SERVICES.map((s) => {
            const Icon = s.icon;
            const currentStrategy = draftStrategies[s.type] || s.defaultStrategy;
            const savedStrategy = savedStrategies[s.type] || s.defaultStrategy;
            const isDirty = currentStrategy !== savedStrategy;
            const isSaving = savingService === s.type;

            return (
              <div
                key={s.type}
                className="relative has-[[aria-expanded=true]]:z-30 p-4 sm:p-5 rounded-xl bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-4"
              >
                <div className="space-y-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-slate-700 dark:text-slate-200" aria-hidden="true" />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                      {s.name}
                    </h3>
                  </div>

                  <div className="space-y-1.5 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400 block">
                      Gateway
                    </span>
                    <StaffFilterSelect
                      ariaLabel={`${s.name} gateway`}
                      options={STRATEGY_SELECT_OPTIONS}
                      value={currentStrategy}
                      onChange={(val) =>
                        setDraftStrategies((prev) => ({
                          ...prev,
                          [s.type]: val,
                        }))
                      }
                    />
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isSaving || !isDirty}
                  onClick={() => void handleSave(s.type)}
                  className="w-full h-11 sm:h-10 rounded-lg text-xs font-semibold bg-[#126BEB] hover:bg-[#0E59C9] text-white transition-colors flex items-center justify-center gap-2 disabled:opacity-45 disabled:cursor-not-allowed"
                >
                  {isSaving && <RefreshCw className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />}
                  <span>Save</span>
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
