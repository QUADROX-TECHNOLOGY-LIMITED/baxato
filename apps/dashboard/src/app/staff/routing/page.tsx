'use client';

import React, { useState, useEffect } from 'react';
import {
  Server,
  ArrowRightLeft,
  RefreshCw,
  X,
  Smartphone,
  Wifi,
  Tv,
  Zap,
  GraduationCap,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  Save,
} from 'lucide-react';
import { getStoredAuthToken } from '@/lib/auth-session';

interface ServiceCardDef {
  type: string;
  title: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultPrimary: 'MONNIFY' | 'INTERSWITCH';
  defaultFallback?: 'MONNIFY' | 'INTERSWITCH' | 'NONE';
}

const SERVICES: ServiceCardDef[] = [
  {
    type: 'AIRTIME',
    title: 'Airtime Top-up',
    desc: 'MTN, Airtel, Glo, 9mobile VTU vending',
    icon: Smartphone,
    defaultPrimary: 'MONNIFY',
    defaultFallback: 'INTERSWITCH',
  },
  {
    type: 'DATA',
    title: 'Data Bundles',
    desc: 'SME, Direct & Corporate Mobile Data',
    icon: Wifi,
    defaultPrimary: 'MONNIFY',
    defaultFallback: 'INTERSWITCH',
  },
  {
    type: 'CABLE_TV',
    title: 'Cable TV (PayTV)',
    desc: 'DStv, GOtv, StarTimes Bouquets & Renewals',
    icon: Tv,
    defaultPrimary: 'INTERSWITCH',
    defaultFallback: 'MONNIFY',
  },
  {
    type: 'ELECTRICITY',
    title: 'Electricity Tokens',
    desc: '12 DisCos Prepaid STS Tokens & Postpaid Bills',
    icon: Zap,
    defaultPrimary: 'MONNIFY',
    defaultFallback: 'INTERSWITCH',
  },
  {
    type: 'EXAM_PIN',
    title: 'Exam PINs (Education)',
    desc: 'WAEC, JAMB UTME & DE, NECO, NABTEB Tokens',
    icon: GraduationCap,
    defaultPrimary: 'INTERSWITCH',
    defaultFallback: 'NONE',
  },
];

export default function StaffRoutingPage() {
  const [providersHealth, setProvidersHealth] = useState<any[]>([]);
  const [routingConfig, setRoutingConfig] = useState<any[]>([]);
  const [isLoadingHealth, setIsLoadingHealth] = useState<boolean>(true);
  const [savingService, setSavingService] = useState<string | null>(null);
  const [routingStatusMessage, setRoutingStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Form state per service: { [serviceType]: { primary: 'MONNIFY' | 'INTERSWITCH', fallback: 'NONE' | 'MONNIFY' | 'INTERSWITCH', allowFailover: boolean } }
  const [formState, setFormState] = useState<
    Record<
      string,
      {
        primary: 'MONNIFY' | 'INTERSWITCH';
        fallback: 'NONE' | 'MONNIFY' | 'INTERSWITCH';
        allowFailover: boolean;
      }
    >
  >({});

  const loadProviderHealth = async () => {
    try {
      setIsLoadingHealth(true);
      const token = getStoredAuthToken();
      if (!token) return;

      const res = await fetch('/api/admin/providers/health', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data?.success) {
        const provs = data.data.providers || data.data.providerStatuses || [];
        const routes = data.data.routing || data.data.routingTable || [];
        setProvidersHealth(provs);
        setRoutingConfig(routes);

        // Populate form state from loaded routes
        const initialForm: Record<string, any> = {};
        SERVICES.forEach((s) => {
          const cfg = routes.find((r: any) => r.serviceType === s.type);
          if (cfg) {
            initialForm[s.type] = {
              primary: cfg.primaryProvider || s.defaultPrimary,
              fallback: cfg.fallbackProvider || 'NONE',
              allowFailover: cfg.allowFailover ?? true,
            };
          } else {
            initialForm[s.type] = {
              primary: s.defaultPrimary,
              fallback: s.defaultFallback || 'NONE',
              allowFailover: s.defaultFallback !== 'NONE',
            };
          }
        });
        setFormState(initialForm);
      }
    } catch (err) {
      console.error('Failed to load provider health:', err);
    } finally {
      setIsLoadingHealth(false);
    }
  };

  useEffect(() => {
    loadProviderHealth();
  }, []);

  const handleFieldChange = (
    serviceType: string,
    field: 'primary' | 'fallback' | 'allowFailover',
    value: any,
  ) => {
    setFormState((prev) => {
      const current = prev[serviceType] || {
        primary: 'MONNIFY',
        fallback: 'INTERSWITCH',
        allowFailover: true,
      };

      const updated = { ...current, [field]: value };

      // Ensure fallback is not the same as primary
      if (field === 'primary' && updated.fallback === value) {
        updated.fallback = 'NONE';
      }

      return {
        ...prev,
        [serviceType]: updated,
      };
    });
  };

  const computeStrategy = (primary: string, fallback: string): string => {
    if (primary === 'MONNIFY') {
      return fallback === 'INTERSWITCH'
        ? 'MONNIFY_PRIMARY_INTERSWITCH_FALLBACK'
        : 'MONNIFY_ONLY';
    } else {
      return fallback === 'MONNIFY'
        ? 'INTERSWITCH_PRIMARY_MONNIFY_FALLBACK'
        : 'INTERSWITCH_ONLY';
    }
  };

  const handleSaveRouting = async (serviceType: string) => {
    const serviceConfig = formState[serviceType];
    if (!serviceConfig) return;

    try {
      setSavingService(serviceType);
      setRoutingStatusMessage(null);
      const token = getStoredAuthToken();
      if (!token) return;

      const strategy = computeStrategy(
        serviceConfig.primary,
        serviceConfig.fallback,
      );
      const allowFailover =
        serviceConfig.fallback !== 'NONE' && serviceConfig.allowFailover;

      const res = await fetch('/api/admin/providers/routing', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          serviceType,
          strategy,
          allowFailover,
        }),
      });

      const data = await res.json();
      if (res.ok && data?.success) {
        setRoutingStatusMessage({
          type: 'success',
          text: `Routing updated for ${serviceType}: Primary = ${serviceConfig.primary}, Fallback = ${serviceConfig.fallback} (Strategy: ${strategy})`,
        });
        loadProviderHealth();
      } else {
        setRoutingStatusMessage({
          type: 'error',
          text: data?.error?.message || `Failed to update routing for ${serviceType}.`,
        });
      }
    } catch (err) {
      console.error('Error updating provider routing:', err);
      setRoutingStatusMessage({
        type: 'error',
        text: 'An error occurred while dispatching routing update.',
      });
    } finally {
      setSavingService(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Provider Routing & Failover
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Dynamic gateway orchestration, active primary/fallback assignments, and upstream circuit health.
          </p>
        </div>

        <button
          onClick={loadProviderHealth}
          disabled={isLoadingHealth}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition self-start md:self-auto shadow-sm"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoadingHealth ? 'animate-spin text-blue-500' : ''}`} />
          <span>Refresh Health</span>
        </button>
      </div>

      {/* Status Feedback Banner */}
      {routingStatusMessage && (
        <div
          className={`p-4 rounded-xl text-xs font-medium flex items-center justify-between border ${
            routingStatusMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-400'
              : 'bg-red-500/10 border-red-500/20 text-red-700 dark:text-red-400'
          }`}
        >
          <div className="flex items-center gap-2">
            {routingStatusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            )}
            <span>{routingStatusMessage.text}</span>
          </div>
          <button
            onClick={() => setRoutingStatusMessage(null)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-white ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Upstream Gateways Telemetry */}
      <div>
        <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
          Upstream Provider Telemetry
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {providersHealth.length === 0 ? (
            <div className="col-span-2 p-6 rounded-xl bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500">
              {isLoadingHealth ? 'Loading gateway telemetry...' : 'Gateway metrics unavailable.'}
            </div>
          ) : (
            providersHealth.map((prov) => {
              const isClosed = prov.circuitState === 'CLOSED';
              return (
                <div
                  key={prov.name}
                  className="p-5 rounded-xl bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs ${
                          prov.name === 'MONNIFY'
                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
                            : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {prov.name === 'MONNIFY' ? 'MNF' : 'ISW'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900 dark:text-white">{prov.name}</h3>
                          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                        </div>
                        <p className="text-[11px] text-slate-500">
                          {prov.name === 'MONNIFY'
                            ? 'Monnify VAS Aggregator API'
                            : 'Interswitch Quickteller Orion SVA v5'}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                        isClosed
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                          : 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20'
                      }`}
                    >
                      Circuit: {prov.circuitState}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/40">
                      <span className="text-[10px] text-slate-500 block">Response Time</span>
                      <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                        {prov.latencyMs ?? '45'}ms
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/40">
                      <span className="text-[10px] text-slate-500 block">Failures</span>
                      <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                        {prov.failures ?? 0}
                      </span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/40">
                      <span className="text-[10px] text-slate-500 block">Health</span>
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        HEALTHY
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Service-by-Service Dynamic Routing Table */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Service Routing Matrix
            </h2>
            <p className="text-[11px] text-slate-500">
              Select primary dispatch provider, secondary fallback gateway, and automatic failover policy per category.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {SERVICES.map((item) => {
            const Icon = item.icon;
            const currentForm = formState[item.type] || {
              primary: item.defaultPrimary,
              fallback: item.defaultFallback || 'NONE',
              allowFailover: item.defaultFallback !== 'NONE',
            };
            const isSaving = savingService === item.type;

            return (
              <div
                key={item.type}
                className="p-5 rounded-xl bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 flex flex-col justify-between shadow-sm space-y-4"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0">
                        <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white">{item.title}</h3>
                        <p className="text-[11px] text-slate-500">{item.desc}</p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {item.type}
                    </span>
                  </div>

                  {/* Dynamic Dropdowns & Controls */}
                  <div className="mt-4 space-y-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 text-xs">
                    {/* Primary Provider Selector */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <label className="font-semibold text-slate-700 dark:text-slate-300">
                        Primary Provider:
                      </label>
                      <select
                        value={currentForm.primary}
                        onChange={(e) =>
                          handleFieldChange(
                            item.type,
                            'primary',
                            e.target.value as 'MONNIFY' | 'INTERSWITCH',
                          )
                        }
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="MONNIFY">Monnify</option>
                        <option value="INTERSWITCH">Interswitch</option>
                      </select>
                    </div>

                    {/* Fallback Provider Selector */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <label className="font-semibold text-slate-700 dark:text-slate-300">
                        Fallback Provider:
                      </label>
                      <select
                        value={currentForm.fallback}
                        onChange={(e) =>
                          handleFieldChange(
                            item.type,
                            'fallback',
                            e.target.value as 'NONE' | 'MONNIFY' | 'INTERSWITCH',
                          )
                        }
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="NONE">None (Exclusive Primary)</option>
                        {currentForm.primary !== 'MONNIFY' && (
                          <option value="MONNIFY">Monnify</option>
                        )}
                        {currentForm.primary !== 'INTERSWITCH' && (
                          <option value="INTERSWITCH">Interswitch</option>
                        )}
                      </select>
                    </div>

                    {/* Auto-Failover Toggle */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 dark:border-slate-800">
                      <div>
                        <span className="font-semibold text-slate-700 dark:text-slate-300 block">
                          Auto-Failover
                        </span>
                        <span className="text-[10px] text-slate-500">
                          Route requests to fallback on timeout/trip
                        </span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          disabled={currentForm.fallback === 'NONE'}
                          checked={
                            currentForm.fallback !== 'NONE' && currentForm.allowFailover
                          }
                          onChange={(e) =>
                            handleFieldChange(item.type, 'allowFailover', e.target.checked)
                          }
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600 disabled:opacity-40"></div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <button
                  disabled={isSaving}
                  onClick={() => handleSaveRouting(item.type)}
                  className="w-full py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 shadow-sm"
                >
                  {isSaving ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {isSaving
                      ? 'Applying Routing...'
                      : `Save ${item.title} Routing`}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
