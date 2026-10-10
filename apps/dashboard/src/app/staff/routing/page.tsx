'use client';

import React, { useState, useEffect } from 'react';
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
  AlertCircle,
} from 'lucide-react';
import { getStoredAuthToken } from '@/lib/auth-session';

interface ServiceItem {
  type: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultPrimary: 'MONNIFY' | 'INTERSWITCH';
  defaultFallback?: 'MONNIFY' | 'INTERSWITCH' | 'NONE';
}

const SERVICES: ServiceItem[] = [
  {
    type: 'AIRTIME',
    name: 'Airtime',
    description: 'MTN, Airtel, Glo, 9mobile VTU',
    icon: Smartphone,
    defaultPrimary: 'MONNIFY',
    defaultFallback: 'INTERSWITCH',
  },
  {
    type: 'DATA',
    name: 'Data Bundles',
    description: 'SME and direct data plans',
    icon: Wifi,
    defaultPrimary: 'MONNIFY',
    defaultFallback: 'INTERSWITCH',
  },
  {
    type: 'ELECTRICITY',
    name: 'Electricity',
    description: '12 DisCos prepaid & postpaid',
    icon: Zap,
    defaultPrimary: 'MONNIFY',
    defaultFallback: 'INTERSWITCH',
  },
  {
    type: 'CABLE_TV',
    name: 'Cable TV',
    description: 'DStv, GOtv, StarTimes',
    icon: Tv,
    defaultPrimary: 'INTERSWITCH',
    defaultFallback: 'MONNIFY',
  },
  {
    type: 'EXAM_PIN',
    name: 'Exam PINs',
    description: 'WAEC, JAMB, NECO tokens',
    icon: GraduationCap,
    defaultPrimary: 'INTERSWITCH',
    defaultFallback: 'NONE',
  },
];

export default function StaffRoutingPage() {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [savingService, setSavingService] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

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

  const loadRouting = async () => {
    try {
      setIsLoading(true);
      const token = getStoredAuthToken();
      if (!token) return;

      const res = await fetch('/api/admin/providers/health', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data?.success) {
        const routes = data.data.routing || data.data.routingTable || [];

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
      console.error('Failed to load provider routing:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadRouting();
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

  const handleSave = async (serviceType: string) => {
    const config = formState[serviceType];
    if (!config) return;

    try {
      setSavingService(serviceType);
      setStatusMessage(null);
      const token = getStoredAuthToken();
      if (!token) return;

      const strategy = computeStrategy(config.primary, config.fallback);
      const allowFailover = config.fallback !== 'NONE' && config.allowFailover;

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
        setStatusMessage({
          type: 'success',
          text: `Routing updated: ${serviceType} is set to ${config.primary}${config.fallback !== 'NONE' ? ` (Fallback: ${config.fallback})` : ''}.`,
        });
        loadRouting();
      } else {
        setStatusMessage({
          type: 'error',
          text: data?.error?.message || `Failed to update routing for ${serviceType}.`,
        });
      }
    } catch (err) {
      setStatusMessage({
        type: 'error',
        text: 'An error occurred while updating routing.',
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
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Provider Routing
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Configure primary provider and optional backup provider per service category.
          </p>
        </div>

        <button
          onClick={loadRouting}
          disabled={isLoading}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Status Feedback */}
      {statusMessage && (
        <div
          className={`p-3.5 rounded-xl text-xs flex items-center justify-between border ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
              : 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button onClick={() => setStatusMessage(null)}>
            <X className="w-4 h-4 text-slate-400 hover:text-slate-600" />
          </button>
        </div>
      )}

      {/* Services Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {SERVICES.map((s) => {
          const Icon = s.icon;
          const current = formState[s.type] || {
            primary: s.defaultPrimary,
            fallback: s.defaultFallback || 'NONE',
            allowFailover: s.defaultFallback !== 'NONE',
          };
          const isSaving = savingService === s.type;

          return (
            <div
              key={s.type}
              className="p-5 rounded-xl bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-4 shadow-sm"
            >
              <div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                      {s.name}
                    </h3>
                    <p className="text-[11px] text-slate-500">{s.description}</p>
                  </div>
                </div>

                <div className="mt-4 space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
                  {/* Primary Provider */}
                  <div>
                    <label className="text-slate-600 dark:text-slate-400 block mb-1 font-medium">
                      Primary Provider
                    </label>
                    <select
                      value={current.primary}
                      onChange={(e) =>
                        handleFieldChange(
                          s.type,
                          'primary',
                          e.target.value as 'MONNIFY' | 'INTERSWITCH',
                        )
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                    >
                      <option value="MONNIFY">Monnify</option>
                      <option value="INTERSWITCH">Interswitch</option>
                    </select>
                  </div>

                  {/* Fallback Provider */}
                  <div>
                    <label className="text-slate-600 dark:text-slate-400 block mb-1 font-medium">
                      Fallback Provider
                    </label>
                    <select
                      value={current.fallback}
                      onChange={(e) =>
                        handleFieldChange(
                          s.type,
                          'fallback',
                          e.target.value as 'NONE' | 'MONNIFY' | 'INTERSWITCH',
                        )
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg text-xs bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none"
                    >
                      <option value="NONE">None</option>
                      {current.primary !== 'MONNIFY' && (
                        <option value="MONNIFY">Monnify</option>
                      )}
                      {current.primary !== 'INTERSWITCH' && (
                        <option value="INTERSWITCH">Interswitch</option>
                      )}
                    </select>
                  </div>

                  {/* Auto Failover */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-slate-600 dark:text-slate-400">
                      Auto-Failover
                    </span>
                    <input
                      type="checkbox"
                      disabled={current.fallback === 'NONE'}
                      checked={current.fallback !== 'NONE' && current.allowFailover}
                      onChange={(e) =>
                        handleFieldChange(s.type, 'allowFailover', e.target.checked)
                      }
                      className="rounded border-slate-300 text-blue-600 focus:ring-0 disabled:opacity-40"
                    />
                  </div>
                </div>
              </div>

              <button
                disabled={isSaving}
                onClick={() => handleSave(s.type)}
                className="w-full py-2 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isSaving ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Save className="w-3.5 h-3.5" />
                )}
                <span>{isSaving ? 'Saving...' : 'Save Routing'}</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
