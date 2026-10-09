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
  Activity,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { getStoredAuthToken } from '@/lib/auth-session';

export default function StaffRoutingPage() {
  const [providersHealth, setProvidersHealth] = useState<any[]>([]);
  const [routingConfig, setRoutingConfig] = useState<any[]>([]);
  const [isLoadingHealth, setIsLoadingHealth] = useState<boolean>(true);
  const [isSwitchingRouting, setIsSwitchingRouting] = useState<string | null>(null);
  const [routingSuccessMessage, setRoutingSuccessMessage] = useState<string | null>(null);

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
        setProvidersHealth(data.data.providers || []);
        setRoutingConfig(data.data.routing || []);
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

  const handleSwitchRouting = async (serviceType: string, currentPrimary: string) => {
    try {
      setIsSwitchingRouting(serviceType);
      const token = getStoredAuthToken();
      if (!token) return;

      const newStrategy =
        currentPrimary === 'MONNIFY'
          ? 'INTERSWITCH_PRIMARY_MONNIFY_FALLBACK'
          : 'MONNIFY_PRIMARY_INTERSWITCH_FALLBACK';

      const res = await fetch('/api/admin/providers/routing', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          serviceType,
          strategy: newStrategy,
          allowFailover: true,
        }),
      });

      const data = await res.json();
      if (res.ok && data?.success) {
        setRoutingSuccessMessage(`Successfully switched ${serviceType} routing to ${newStrategy}.`);
        loadProviderHealth();
      } else {
        alert(data?.error?.message || 'Failed to switch provider routing.');
      }
    } catch (err) {
      console.error('Error switching provider routing:', err);
    } finally {
      setIsSwitchingRouting(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Provider Routing
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Circuit breakers, provider health, and dynamic failover configuration.
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

      {routingSuccessMessage && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium flex items-center justify-between">
          <span>{routingSuccessMessage}</span>
          <button onClick={() => setRoutingSuccessMessage(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Staff Notice */}
      <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 text-xs leading-relaxed">
        <span className="font-bold">Staff Failover Switch:</span> As an operations staff member, you can trigger instant provider failover switches if an upstream route experiences latency or downtime. Changes apply dynamically across all merchant vending requests.
      </div>

      {/* Upstream Provider Health Telemetry */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {providersHealth.map((prov) => (
          <div
            key={prov.name}
            className="p-5 rounded-xl bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-xs text-slate-900 dark:text-white">
                  {prov.name === 'MONNIFY' ? 'MNF' : 'ISW'}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">{prov.name}</h3>
                  <p className="text-[11px] text-slate-500">VAS Provider Gateway</p>
                </div>
              </div>

              <span
                className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                  prov.circuitState === 'CLOSED'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                    : 'bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20'
                }`}
              >
                Circuit: {prov.circuitState}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
              <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/40">
                <span className="text-[10px] text-slate-500 block">Avg Latency</span>
                <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                  {prov.latencyMs ?? '45'}ms
                </span>
              </div>
              <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/40">
                <span className="text-[10px] text-slate-500 block">Failures</span>
                <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                  {prov.failures ?? 0}
                </span>
              </div>
              <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/40">
                <span className="text-[10px] text-slate-500 block">Status</span>
                <span className="text-xs font-bold text-emerald-500">ONLINE</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Service Failover Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          {
            type: 'AIRTIME',
            title: 'Airtime Top-up',
            desc: 'MTN, Airtel, Glo, 9mobile VTU',
            icon: Smartphone,
            config: routingConfig.find((r) => r.serviceType === 'AIRTIME'),
          },
          {
            type: 'DATA',
            title: 'Data Bundles',
            desc: 'SME, Direct & Corporate Data Plans',
            icon: Wifi,
            config: routingConfig.find((r) => r.serviceType === 'DATA'),
          },
          {
            type: 'CABLE_TV',
            title: 'Cable TV (PayTV)',
            desc: 'DStv, GOtv, StarTimes Bouquets',
            icon: Tv,
            config: routingConfig.find((r) => r.serviceType === 'CABLE_TV'),
          },
          {
            type: 'ELECTRICITY',
            title: 'Electricity Tokens',
            desc: '12 DisCos Prepaid STS & Postpaid Bills',
            icon: Zap,
            config: routingConfig.find((r) => r.serviceType === 'ELECTRICITY'),
          },
        ].map((item) => {
          const Icon = item.icon;
          const primary = item.config?.primaryProvider || 'MONNIFY';
          const fallback = item.config?.fallbackProvider || 'INTERSWITCH';
          const isSwitching = isSwitchingRouting === item.type;

          return (
            <div
              key={item.type}
              className="p-5 rounded-xl bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 flex flex-col justify-between shadow-sm"
            >
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">{item.title}</h3>
                    <p className="text-[11px] text-slate-500">{item.desc}</p>
                  </div>
                </div>

                <div className="my-4 p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Primary Provider:</span>
                    <span className="font-bold text-slate-900 dark:text-white px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      {primary}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Failover Backup:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800">
                      {fallback}
                    </span>
                  </div>
                </div>
              </div>

              <button
                disabled={isSwitching}
                onClick={() => handleSwitchRouting(item.type, primary)}
                className="w-full py-2.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 bg-[#126BEB] text-white hover:bg-[#0E58C4] disabled:opacity-50 shadow-sm"
              >
                <ArrowRightLeft className={`w-3.5 h-3.5 ${isSwitching ? 'animate-spin' : ''}`} />
                {isSwitching
                  ? 'Switching Routing...'
                  : `Failover Switch (Make ${primary === 'MONNIFY' ? 'Interswitch' : 'Monnify'} Primary)`}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
