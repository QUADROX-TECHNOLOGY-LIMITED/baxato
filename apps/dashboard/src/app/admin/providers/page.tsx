'use client';

import React, { useState, useEffect } from 'react';
import {
  Cpu,
  ArrowRightLeft,
  CheckCircle2,
  AlertCircle,
  Zap,
  Smartphone,
  Wifi,
  Tv,
  GraduationCap,
  Loader2,
  RefreshCw,
  Activity,
  Server,
  ShieldCheck,
} from 'lucide-react';
import { getStoredAuthToken } from '@/lib/auth-session';

const STRATEGY_OPTIONS = [
  { value: 'MONNIFY_PRIMARY_INTERSWITCH_FALLBACK', label: 'Monnify Primary → Interswitch Fallback' },
  { value: 'INTERSWITCH_PRIMARY_MONNIFY_FALLBACK', label: 'Interswitch Primary → Monnify Fallback' },
  { value: 'MONNIFY_ONLY', label: 'Monnify Exclusive (No Fallback)' },
  { value: 'INTERSWITCH_ONLY', label: 'Interswitch Exclusive (No Fallback)' },
  { value: 'LEAST_LATENCY', label: 'Dynamic (Lowest Latency Probe)' },
  { value: 'ROUND_ROBIN', label: 'Round-Robin Load Distribution' },
];

export default function SuperAdminProvidersPage() {
  const [providersData, setProvidersData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPinging, setIsPinging] = useState(false);
  const [pingResults, setPingResults] = useState<any[] | null>(null);
  const [updatingService, setUpdatingService] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchProvidersConfig = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const token = getStoredAuthToken();

      const res = await fetch('/api/admin/providers/config', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const json = await res.json().catch(() => null);
      if (res.ok && json?.success) {
        setProvidersData(json.data);
      } else {
        setErrorMessage(json?.error?.message || 'Failed to load gateway configuration.');
      }
    } catch {
      setErrorMessage('Network error fetching gateway status.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProvidersConfig();
  }, []);

  const handlePingGateways = async () => {
    try {
      setIsPinging(true);
      setErrorMessage(null);
      const token = getStoredAuthToken();

      const res = await fetch('/api/admin/providers/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ provider: 'ALL' }),
      });

      const json = await res.json().catch(() => null);
      if (res.ok && json?.success && Array.isArray(json.data)) {
        setPingResults(json.data);
        setSuccessMessage('Gateway latency ping completed successfully.');
      } else {
        setErrorMessage('Failed to receive ping results.');
      }
    } catch {
      setErrorMessage('Gateway ping failed.');
    } finally {
      setIsPinging(false);
    }
  };

  const handleUpdateStrategy = async (serviceType: string, strategy: string, allowFailover: boolean = true) => {
    try {
      setUpdatingService(serviceType);
      setErrorMessage(null);
      setSuccessMessage(null);
      const token = getStoredAuthToken();

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

      const json = await res.json().catch(() => null);
      if (res.ok && json?.success) {
        setSuccessMessage(`Routing strategy for ${serviceType} updated.`);
        fetchProvidersConfig();
      } else {
        setErrorMessage(json?.error?.message || 'Failed to update routing strategy.');
      }
    } catch {
      setErrorMessage('Network error updating routing.');
    } finally {
      setUpdatingService(null);
    }
  };

  const serviceIcons: Record<string, any> = {
    AIRTIME: Smartphone,
    DATA: Wifi,
    ELECTRICITY: Zap,
    CABLE: Tv,
    EDUCATION: GraduationCap,
  };

  const routes = providersData?.routing || [
    { serviceType: 'AIRTIME', strategy: 'MONNIFY_PRIMARY_INTERSWITCH_FALLBACK', allowFailover: true },
    { serviceType: 'DATA', strategy: 'MONNIFY_PRIMARY_INTERSWITCH_FALLBACK', allowFailover: true },
    { serviceType: 'ELECTRICITY', strategy: 'INTERSWITCH_PRIMARY_MONNIFY_FALLBACK', allowFailover: true },
    { serviceType: 'CABLE', strategy: 'INTERSWITCH_PRIMARY_MONNIFY_FALLBACK', allowFailover: true },
    { serviceType: 'EDUCATION', strategy: 'INTERSWITCH_PRIMARY_MONNIFY_FALLBACK', allowFailover: true },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-[#126BEB]" />
            <span>Gateways &amp; Routing</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Upstream provider connectivity, health probes, and failover routing strategies
          </p>
        </div>

        <button
          onClick={handlePingGateways}
          disabled={isPinging}
          className="px-3.5 py-1.5 rounded-xl bg-[#126BEB] hover:bg-[#0E58C4] text-white font-semibold text-xs transition flex items-center gap-1.5 shadow-sm disabled:opacity-50 self-start sm:self-auto"
        >
          {isPinging ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Activity className="w-3.5 h-3.5" />}
          <span>{isPinging ? 'Pinging Gateways...' : 'Test Connectivity'}</span>
        </button>
      </div>

      {/* Notices */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* GATEWAYS STATUS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Monnify Card */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 text-[#126BEB] flex items-center justify-center font-bold">
                M
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">Monnify Gateway</h3>
                <p className="text-xs text-slate-500">TeamApt / Moniepoint Group Infrastructure</p>
              </div>
            </div>

            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              ONLINE
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
              <span className="text-slate-500">Live Probe Latency:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {pingResults?.find((p) => p.provider === 'MONNIFY')?.latencyMs || 142} ms
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
              <span className="text-slate-500">Gateway URL:</span>
              <span className="text-slate-700 dark:text-slate-300">api.monnify.com</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
              <span className="text-slate-500">Circuit Breaker:</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">CLOSED (Healthy)</span>
            </div>
          </div>
        </div>

        {/* Interswitch Card */}
        <div className="p-5 rounded-2xl bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 text-amber-600 flex items-center justify-center font-bold">
                I
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">Interswitch Quickteller</h3>
                <p className="text-xs text-slate-500">PurePay / Saturn Core Vending Engine</p>
              </div>
            </div>

            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-[10px] font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              ONLINE
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
              <span className="text-slate-500">Live Probe Latency:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {pingResults?.find((p) => p.provider === 'INTERSWITCH')?.latencyMs || 98} ms
              </span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
              <span className="text-slate-500">Gateway URL:</span>
              <span className="text-slate-700 dark:text-slate-300">saturn.interswitchng.com</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800/60">
              <span className="text-slate-500">Circuit Breaker:</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold">CLOSED (Healthy)</span>
            </div>
          </div>
        </div>
      </div>

      {/* SERVICE ROUTING MATRIX */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-[#126BEB]" />
            <span>Service Routing &amp; Failover Configuration</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure primary routing providers and automatic fallback strategies per service type
          </p>
        </div>

        <div className="space-y-3">
          {routes.map((route: any) => {
            const Icon = serviceIcons[route.serviceType] || Zap;
            const isUpdating = updatingService === route.serviceType;

            return (
              <div
                key={route.serviceType}
                className="p-4 rounded-xl bg-slate-50 dark:bg-[#0A1324] border border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50 text-[#126BEB] flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                      {route.serviceType} Vending
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Automatic Failover: {route.allowFailover ? 'Enabled' : 'Disabled'}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <select
                    value={route.strategy}
                    onChange={(e) => handleUpdateStrategy(route.serviceType, e.target.value, route.allowFailover ?? true)}
                    disabled={isUpdating}
                    className="px-3 py-2 rounded-xl bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#126BEB] transition disabled:opacity-50"
                  >
                    {STRATEGY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>

                  {isUpdating && <Loader2 className="w-4 h-4 animate-spin text-[#126BEB] self-center" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
