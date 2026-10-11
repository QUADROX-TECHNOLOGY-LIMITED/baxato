'use client';

import React, { useState, useEffect } from 'react';
import {
  Cpu,
  ArrowRightLeft,
  CheckCircle2,
  AlertCircle,
  Clock,
  Zap,
  Smartphone,
  Wifi,
  Tv,
  GraduationCap,
  Loader2,
  RefreshCw,
  Sliders,
  ShieldCheck,
  Activity,
  Server,
} from 'lucide-react';
import { getStoredAuthToken } from '@/lib/auth-session';

export default function SuperAdminProvidersPage() {
  const [providersData, setProvidersData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPinging, setIsPinging] = useState(false);
  const [pingResults, setPingResults] = useState<any[] | null>(null);
  const [isSwitching, setIsSwitching] = useState<string | null>(null);
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
        setSuccessMessage('Gateways connectivity ping completed successfully.');
      }
    } catch {
      setErrorMessage('Gateway ping failed.');
    } finally {
      setIsPinging(false);
    }
  };

  const handleSwitchRouting = async (serviceType: string, currentStrategy: string) => {
    try {
      setIsSwitching(serviceType);
      setErrorMessage(null);
      setSuccessMessage(null);
      const token = getStoredAuthToken();

      const newStrategy =
        currentStrategy.startsWith('MONNIFY_PRIMARY')
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

      const json = await res.json().catch(() => null);
      if (res.ok && json?.success) {
        setSuccessMessage(`Routing for ${serviceType} switched to ${newStrategy}.`);
        fetchProvidersConfig();
      } else {
        setErrorMessage(json?.error?.message || 'Failed to switch provider strategy.');
      }
    } catch {
      setErrorMessage('Network error switching routing.');
    } finally {
      setIsSwitching(null);
    }
  };

  const serviceIcons: Record<string, any> = {
    AIRTIME: Smartphone,
    DATA: Wifi,
    ELECTRICITY: Zap,
    CABLE: Tv,
    EDUCATION: GraduationCap,
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-purple-950/40">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Cpu className="w-6 h-6 text-blue-400" />
            <span>Gateways & Upstream Provider Routing</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Manage Monnify & Interswitch gateway connectivity, configure failover rules, and execute live flips
          </p>
        </div>

        <button
          onClick={handlePingGateways}
          disabled={isPinging}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs transition flex items-center gap-2 shadow-lg shadow-blue-950/40"
        >
          {isPinging ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
          <span>{isPinging ? 'Pinging Endpoints...' : 'Ping Gateways (Live Latency)'}</span>
        </button>
      </div>

      {/* Notices */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-800/50 text-red-300 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800/50 text-emerald-300 text-xs flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* GATEWAYS STATUS CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Monnify Gateway Card */}
        <div className="p-5 sm:p-6 rounded-2xl bg-[#080D1D] border border-blue-900/40 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-bold">
                M
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Monnify Banking & Utilities</h3>
                <p className="text-xs text-slate-400">TeamApt / Moniepoint Group Infrastructure</p>
              </div>
            </div>

            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              ONLINE
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-[#050811] border border-slate-800/80 space-y-1">
              <span className="text-slate-500 text-[11px]">Floating Reserve Balance:</span>
              <p className="text-lg font-bold font-mono text-blue-400">₦2,500,000.00</p>
            </div>
            <div className="p-3 rounded-xl bg-[#050811] border border-slate-800/80 space-y-1">
              <span className="text-slate-500 text-[11px]">Latency Response:</span>
              <p className="text-lg font-bold font-mono text-emerald-400">
                {pingResults?.find((p) => p.provider === 'MONNIFY')?.latencyMs || 142} ms
              </p>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Contract Code:</span>
              <span className="font-mono text-white">2648291038</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">API Key Fingerprint:</span>
              <span className="font-mono text-slate-300">MK_TEST_••••••••78b9</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Base Gateway:</span>
              <span className="font-mono text-slate-300 text-[11px]">https://sandbox.monnify.com</span>
            </div>
          </div>
        </div>

        {/* Interswitch Gateway Card */}
        <div className="p-5 sm:p-6 rounded-2xl bg-[#080D1D] border border-amber-900/40 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                I
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Interswitch Quickteller Business</h3>
                <p className="text-xs text-slate-400">Interswitch PurePay / Saturn Core Engine</p>
              </div>
            </div>

            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              ONLINE
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-[#050811] border border-slate-800/80 space-y-1">
              <span className="text-slate-500 text-[11px]">Floating Reserve Balance:</span>
              <p className="text-lg font-bold font-mono text-amber-400">₦3,800,000.00</p>
            </div>
            <div className="p-3 rounded-xl bg-[#050811] border border-slate-800/80 space-y-1">
              <span className="text-slate-500 text-[11px]">Latency Response:</span>
              <p className="text-lg font-bold font-mono text-emerald-400">
                {pingResults?.find((p) => p.provider === 'INTERSWITCH')?.latencyMs || 98} ms
              </p>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Terminal ID:</span>
              <span className="font-mono text-white">3ITW0001</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">API Key Fingerprint:</span>
              <span className="font-mono text-slate-300">IKIA_LIVE_••••••••412a</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-800/60">
              <span className="text-slate-400">Base Gateway:</span>
              <span className="font-mono text-slate-300 text-[11px]">https://saturn.interswitchng.com</span>
            </div>
          </div>
        </div>
      </div>

      {/* SERVICE ROUTING MATRIX */}
      <div className="p-5 sm:p-6 rounded-3xl bg-[#080D1D] border border-purple-900/30 shadow-xl space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-purple-400" />
              <span>Service Routing Matrix & Instant Failover</span>
            </h2>
            <p className="text-xs text-slate-400">
              Configure which upstream provider processes transactions for each utility service
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {(providersData?.routing || [
            { serviceType: 'AIRTIME', strategy: 'MONNIFY_PRIMARY_INTERSWITCH_FALLBACK', allowFailover: true },
            { serviceType: 'DATA', strategy: 'MONNIFY_PRIMARY_INTERSWITCH_FALLBACK', allowFailover: true },
            { serviceType: 'ELECTRICITY', strategy: 'INTERSWITCH_PRIMARY_MONNIFY_FALLBACK', allowFailover: true },
            { serviceType: 'CABLE', strategy: 'INTERSWITCH_PRIMARY_MONNIFY_FALLBACK', allowFailover: true },
            { serviceType: 'EDUCATION', strategy: 'INTERSWITCH_PRIMARY_MONNIFY_FALLBACK', allowFailover: true },
          ]).map((route: any) => {
            const Icon = serviceIcons[route.serviceType] || Zap;
            const isMonnifyPrimary = route.strategy.startsWith('MONNIFY_PRIMARY');
            const isFlipping = isSwitching === route.serviceType;

            return (
              <div
                key={route.serviceType}
                className="p-4 rounded-2xl bg-[#050811] border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition hover:border-slate-700"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm">{route.serviceType} Vending</h3>
                    <p className="text-[11px] text-slate-400">
                      Primary:{' '}
                      <span className="font-semibold text-white">
                        {isMonnifyPrimary ? 'Monnify' : 'Interswitch'}
                      </span>{' '}
                      • Fallback:{' '}
                      <span className="font-semibold text-slate-300">
                        {isMonnifyPrimary ? 'Interswitch' : 'Monnify'}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 self-end sm:self-auto">
                  <div className="text-right hidden md:block">
                    <span className="text-[10px] text-slate-500 block">Routing Strategy</span>
                    <span className="text-xs font-mono font-bold text-purple-300">
                      {route.strategy}
                    </span>
                  </div>

                  <button
                    onClick={() => handleSwitchRouting(route.serviceType, route.strategy)}
                    disabled={isFlipping}
                    className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs transition flex items-center gap-2 shadow-md shadow-purple-950/40 disabled:opacity-50"
                  >
                    {isFlipping ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ArrowRightLeft className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {isMonnifyPrimary ? 'Flip to Interswitch' : 'Flip to Monnify'}
                    </span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
