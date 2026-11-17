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
  Save,
  CheckCircle2,
  AlertTriangle,
  Activity,
  ShieldCheck,
  Clock,
} from 'lucide-react';
import BaxatoLoader from '@/components/BaxatoLoader';
import {
  clearSessionAndRedirect,
  getStoredAuthToken,
  handleAuthResponse,
  isTokenExpired,
} from '@/lib/auth-session';
import { showToast } from '@/lib/toast';

type RoutingStrategy = 'PRIMARY_FALLBACK' | 'MONNIFY_ONLY' | 'VTPASS_ONLY';

interface ServiceItem {
  type: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultStrategy: RoutingStrategy;
}

const SERVICES: ServiceItem[] = [
  {
    type: 'AIRTIME',
    name: 'Airtime',
    description: 'Local and direct carrier top-ups',
    icon: Smartphone,
    defaultStrategy: 'MONNIFY_ONLY',
  },
  {
    type: 'DATA',
    name: 'Data Bundles',
    description: 'SME and direct carrier data plans',
    icon: Wifi,
    defaultStrategy: 'MONNIFY_ONLY',
  },
  {
    type: 'ELECTRICITY',
    name: 'Electricity',
    description: 'Prepaid and postpaid utility tokens',
    icon: Zap,
    defaultStrategy: 'MONNIFY_ONLY',
  },
  {
    type: 'CABLE_TV',
    name: 'Cable TV',
    description: 'Digital TV bouquets and renewals',
    icon: Tv,
    defaultStrategy: 'MONNIFY_ONLY',
  },
  {
    type: 'EXAM_PIN',
    name: 'Exam PINs',
    description: 'Academic PIN issuance',
    icon: GraduationCap,
    defaultStrategy: 'MONNIFY_ONLY',
  },
];

const STRATEGY_OPTIONS: Array<{
  value: RoutingStrategy;
  label: string;
  summary: string;
  allowFailover: boolean;
}> = [
  {
    value: 'PRIMARY_FALLBACK',
    label: 'Primary + Auto-Failover',
    summary: 'Routes to Monnify first, switches to VTPass if unavailable',
    allowFailover: true,
  },
  {
    value: 'MONNIFY_ONLY',
    label: 'Monnify Only',
    summary: 'Routes exclusively through Monnify without failover',
    allowFailover: false,
  },
  {
    value: 'VTPASS_ONLY',
    label: 'VTPass Only',
    summary: 'Routes exclusively through VTPass without failover',
    allowFailover: false,
  },
];

export default function StaffRoutingPage() {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [savingService, setSavingService] = useState<string | null>(null);
  const [providerStatuses, setProviderStatuses] = useState<any[]>([]);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
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

      if (handleAuthResponse(res, data)) {
        return;
      }

      if (res.ok && data?.success) {
        const routes = data.data?.routing || data.data?.routingTable || [];
        const providers = data.data?.providers || data.data?.providerStatuses || [];
        setProviderStatuses(providers);
        setCheckedAt(data.data?.checkedAt || null);

        const initial: Record<string, RoutingStrategy> = {};
        SERVICES.forEach((s) => {
          const cfg = routes.find((r: any) => r.serviceType === s.type);
          const strategy = cfg?.strategy;
          if (
            strategy === 'PRIMARY_FALLBACK' ||
            strategy === 'MONNIFY_ONLY' ||
            strategy === 'VTPASS_ONLY'
          ) {
            initial[s.type] = strategy;
          } else {
            initial[s.type] = s.defaultStrategy;
          }
        });
        setSavedStrategies(initial);
        setDraftStrategies(initial);
      } else {
        setStatusMessage({
          type: 'error',
          text: data?.error?.message || 'Unable to load provider routing and health.',
        });
      }
    } catch {
      setStatusMessage({
        type: 'error',
        text: 'Network error loading provider routing.',
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

    const option = STRATEGY_OPTIONS.find((o) => o.value === selectedStrategy);
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
          allowFailover: option?.allowFailover ?? selectedStrategy === 'PRIMARY_FALLBACK',
        }),
      });

      const data = await res.json().catch(() => null);
      if (handleAuthResponse(res, data)) {
        return;
      }

      if (res.ok && data?.success) {
        const msg = `${serviceType.replace(/_/g, ' ')} routing set to ${option?.label || selectedStrategy}.`;
        setStatusMessage({ type: 'success', text: msg });
        showToast({ type: 'success', message: msg });
        setSavedStrategies((prev) => ({ ...prev, [serviceType]: selectedStrategy }));
      } else {
        const msg = data?.error?.message || `Failed to update routing for ${serviceType}.`;
        setStatusMessage({ type: 'error', text: msg });
        showToast({ type: 'error', message: msg });
      }
    } catch {
      const msg = 'Network error saving routing configuration.';
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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/80 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white [text-wrap:balance]">
            Routing & Health
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Monitor live gateway availability, circuit breakers, and failover strategies per service.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void loadRouting()}
          disabled={isLoading}
          className="self-start sm:self-auto h-11 sm:h-10 px-3.5 rounded-lg text-xs font-medium bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
          <span>Run Health Check</span>
        </button>
      </div>

      {/* Status Alert */}
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
            aria-label="Dismiss notification"
            className="min-h-8 min-w-8 flex items-center justify-center rounded-md hover:bg-black/5 dark:hover:bg-white/5 shrink-0"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* Gateway Health Cards */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#126BEB] dark:text-[#38BDF8]" aria-hidden="true" />
            <span>Gateway Health & Circuit Breakers</span>
          </h2>
          {checkedAt && (
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Checked{' '}
              {new Date(checkedAt).toLocaleTimeString('en-NG', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })}
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {providerStatuses.map((p: any) => {
            const isHealthy = Boolean(p.health?.isHealthy);
            const cb = p.circuitBreaker || {};
            const cbState = cb.state || 'CLOSED';
            return (
              <div
                key={p.providerName}
                className="p-4 sm:p-5 rounded-xl bg-white dark:bg-[#0B1528] border border-slate-200/80 dark:border-slate-800 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                      {p.providerName}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {p.health?.message || 'Status probe ready'}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold shrink-0 ${
                      isHealthy
                        ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
                        : 'bg-rose-500/10 text-rose-700 dark:text-rose-400'
                    }`}
                  >
                    {isHealthy ? (
                      <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                    ) : (
                      <AlertTriangle className="w-3.5 h-3.5" aria-hidden="true" />
                    )}
                    <span>{isHealthy ? 'Healthy' : 'Degraded'}</span>
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                  <div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                      Latency
                    </span>
                    <span className="font-mono font-semibold text-slate-900 dark:text-white inline-flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3 text-slate-400" aria-hidden="true" />
                      {p.health?.latencyMs ?? 0}ms
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                      Circuit
                    </span>
                    <span
                      className={`font-mono font-semibold mt-0.5 block ${
                        cbState === 'CLOSED'
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : cbState === 'HALF_OPEN'
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-rose-600 dark:text-rose-400'
                      }`}
                    >
                      {cbState}
                    </span>
                  </div>
                  <div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                      Requests
                    </span>
                    <span className="font-mono font-semibold text-slate-900 dark:text-white mt-0.5 block">
                      {cb.totalRequests ?? 0} ({cb.failures ?? 0} err)
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Per-Service Routing Matrix */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-[#126BEB] dark:text-[#38BDF8]" aria-hidden="true" />
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
            Service Routing Rules
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {SERVICES.map((s) => {
            const Icon = s.icon;
            const currentStrategy = draftStrategies[s.type] || s.defaultStrategy;
            const savedStrategy = savedStrategies[s.type] || s.defaultStrategy;
            const isDirty = currentStrategy !== savedStrategy;
            const isSaving = savingService === s.type;
            const activeMeta =
              STRATEGY_OPTIONS.find((opt) => opt.value === currentStrategy) || STRATEGY_OPTIONS[1];

            return (
              <div
                key={s.type}
                className={`p-4 sm:p-5 rounded-xl bg-white dark:bg-[#0B1528] border flex flex-col justify-between space-y-4 transition-colors ${
                  isDirty
                    ? 'border-[#126BEB] dark:border-[#38BDF8]'
                    : 'border-slate-200/80 dark:border-slate-800'
                }`}
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-slate-700 dark:text-slate-200" aria-hidden="true" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                          {s.name}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {s.description}
                        </p>
                      </div>
                    </div>
                    {isDirty && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/60 text-[#126BEB] dark:text-[#38BDF8] shrink-0">
                        Unsaved
                      </span>
                    )}
                  </div>

                  <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800/80">
                    <label
                      htmlFor={`routing-select-${s.type}`}
                      className="text-xs font-medium text-slate-700 dark:text-slate-300 block"
                    >
                      Routing Strategy
                    </label>
                    <select
                      id={`routing-select-${s.type}`}
                      value={currentStrategy}
                      onChange={(e) =>
                        setDraftStrategies((prev) => ({
                          ...prev,
                          [s.type]: e.target.value as RoutingStrategy,
                        }))
                      }
                      className="w-full h-11 px-3 rounded-lg text-base sm:text-sm bg-white dark:bg-[#070D18] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-[#126BEB] dark:focus:border-[#38BDF8]"
                    >
                      {STRATEGY_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      {activeMeta.summary}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={isSaving || !isDirty}
                  onClick={() => void handleSave(s.type)}
                  className="w-full h-11 rounded-lg text-xs font-semibold bg-[#126BEB] hover:bg-[#0E59C9] text-white transition-colors flex items-center justify-center gap-2 disabled:opacity-45 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                  ) : (
                    <Save className="w-3.5 h-3.5" aria-hidden="true" />
                  )}
                  <span>{isSaving ? 'Saving...' : 'Save Rule'}</span>
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
