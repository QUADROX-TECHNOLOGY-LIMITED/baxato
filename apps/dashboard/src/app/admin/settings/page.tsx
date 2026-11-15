'use client';

import React, { useMemo, useState, useEffect } from 'react';
import {
  Sliders,
  AlertTriangle,
  Power,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Shield,
  Smartphone,
  Wifi,
  Zap,
  Tv,
  GraduationCap,
  ArrowRightLeft,
  Search,
  X,
} from 'lucide-react';
import {
  getStoredAuthToken,
  isTokenExpired,
  clearSessionAndRedirect,
  handleAuthResponse,
} from '@/lib/auth-session';
import { showToast } from '@/lib/toast';

export default function SuperAdminSettingsPage() {
  const [settings, setSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [planFilterNetwork, setPlanFilterNetwork] = useState<string>('ALL');
  const [planSearchQuery, setPlanSearchQuery] = useState<string>('');

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const token = getStoredAuthToken();
      if (!token || isTokenExpired(token)) {
        clearSessionAndRedirect('expired');
        return;
      }

      const res = await fetch('/api/admin/settings', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const json = await res.json().catch(() => null);
      if (handleAuthResponse(res, json)) return;

      if (res.ok && json?.success) {
        setSettings(json.data);
      } else {
        setErrorMessage(json?.error?.message || 'Failed to load system parameters.');
      }
    } catch {
      setErrorMessage('Network error fetching platform settings.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleUpdateSettings = async (partialUpdates: any, toastSuccessMessage?: string) => {
    try {
      setIsUpdating(true);
      setErrorMessage(null);
      setSuccessMessage(null);
      const token = getStoredAuthToken();
      if (!token || isTokenExpired(token)) {
        clearSessionAndRedirect('expired');
        return;
      }

      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(partialUpdates),
      });

      const json = await res.json().catch(() => null);
      if (handleAuthResponse(res, json)) return;

      if (res.ok && json?.success) {
        setSettings((prev: any) => ({
          ...(prev || {}),
          ...(json.data?.updated || partialUpdates),
        }));
        const msg = toastSuccessMessage || 'System configuration updated.';
        setSuccessMessage(msg);
        showToast({ type: 'success', message: msg });
      } else {
        const errMsg = json?.error?.message || 'Failed to update settings.';
        setErrorMessage(errMsg);
        showToast({ type: 'error', message: errMsg });
      }
    } catch {
      const errMsg = 'Network error updating system settings.';
      setErrorMessage(errMsg);
      showToast({ type: 'error', message: errMsg });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleToggleMaintenance = () => {
    const nextState = !settings?.maintenanceMode;
    if (
      nextState &&
      !confirm('WARNING: Enabling maintenance mode will reject all incoming customer and API transactions. Proceed?')
    ) {
      return;
    }
    handleUpdateSettings(
      { maintenanceMode: nextState },
      nextState ? 'Maintenance mode enabled.' : 'Maintenance mode disabled.',
    );
  };

  const handleToggleKillSwitch = (service: string) => {
    const current = settings?.killSwitches?.[service] || false;
    handleUpdateSettings(
      {
        killSwitches: {
          ...(settings?.killSwitches || {}),
          [service]: !current,
        },
      },
      `${service} ${!current ? 'paused' : 'resumed'}.`,
    );
  };

  const disabledAirtimeNetworks: string[] = Array.isArray(settings?.disabledNetworks?.AIRTIME)
    ? settings.disabledNetworks.AIRTIME
    : [];
  const disabledDataNetworks: string[] = Array.isArray(settings?.disabledNetworks?.DATA)
    ? settings.disabledNetworks.DATA
    : [];
  const disabledDataPlans: string[] = Array.isArray(settings?.disabledDataPlans)
    ? settings.disabledDataPlans
    : [];

  const handleToggleNetwork = (service: 'AIRTIME' | 'DATA', network: string, networkName: string) => {
    const currentList = service === 'AIRTIME' ? disabledAirtimeNetworks : disabledDataNetworks;
    const isCurrentlyDisabled = currentList.includes(network);
    const nextList = isCurrentlyDisabled
      ? currentList.filter((item) => item !== network)
      : [...currentList, network];

    handleUpdateSettings(
      {
        disabledNetworks: {
          AIRTIME: service === 'AIRTIME' ? nextList : disabledAirtimeNetworks,
          DATA: service === 'DATA' ? nextList : disabledDataNetworks,
        },
      },
      `${networkName} ${service.toLowerCase()} ${isCurrentlyDisabled ? 'enabled' : 'disabled'}.`,
    );
  };

  const handleToggleDataPlan = (planId: string, planLabel: string) => {
    const isCurrentlyDisabled = disabledDataPlans.includes(planId);
    const nextPlans = isCurrentlyDisabled
      ? disabledDataPlans.filter((id) => id !== planId)
      : [...disabledDataPlans, planId];

    handleUpdateSettings(
      { disabledDataPlans: nextPlans },
      `${planLabel} ${isCurrentlyDisabled ? 'enabled' : 'disabled'}.`,
    );
  };

  const filteredDataPlans = useMemo(() => {
    const allPlans: Array<{
      id: string;
      name: string;
      network: string;
      networkName: string;
      category: string;
      dataAllowance: string;
      dataType: string;
      priceNaira: number;
      validity: string;
    }> = Array.isArray(settings?.catalogControls?.dataPlans) ? settings.catalogControls.dataPlans : [];

    const query = planSearchQuery.trim().toLowerCase();
    return allPlans.filter((plan) => {
      if (planFilterNetwork !== 'ALL' && plan.network !== planFilterNetwork) {
        return false;
      }
      if (!query) return true;
      return `${plan.networkName} ${plan.dataAllowance} ${plan.name} ${plan.validity} ${plan.priceNaira}`
        .toLowerCase()
        .includes(query);
    });
  }, [settings?.catalogControls?.dataPlans, planFilterNetwork, planSearchQuery]);

  const serviceIcons: Record<string, any> = {
    AIRTIME: Smartphone,
    DATA: Wifi,
    ELECTRICITY: Zap,
    CABLE: Tv,
    EDUCATION: GraduationCap,
    TRANSFERS: ArrowRightLeft,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Sliders className="w-5 h-5 text-[#126BEB]" />
            <span>System Settings</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Operational freeze switches, granular service kill switches, and platform configuration
          </p>
        </div>

        <button
          onClick={fetchSettings}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#126BEB]' : ''}`} />
          <span>Reload</span>
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

      {/* SYSTEM CONTROLS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Global Platform Maintenance */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/50 flex items-center justify-center">
                <Power className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Global Maintenance Mode
                </h3>
                <p className="text-xs text-slate-500">
                  Emergency platform freeze switch
                </p>
              </div>
            </div>

            <button
              onClick={handleToggleMaintenance}
              disabled={isUpdating}
              className={`px-3.5 py-1.5 rounded-xl font-semibold text-xs transition ${
                settings?.maintenanceMode
                  ? 'bg-red-600 text-white hover:bg-red-500 shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {settings?.maintenanceMode ? 'ACTIVE (FROZEN)' : 'OFF (OPERATIONAL)'}
            </button>
          </div>

          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            When enabled, all public web endpoints, mobile apps, and merchant API calls return a structured
            HTTP 503 Maintenance response. Only administrators retain access.
          </p>
        </div>

        {/* Granular Service Kill Switches */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Service Kill Switches
                </h3>
                <p className="text-xs text-slate-500">
                  Isolate individual services during downtime
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
            {(['AIRTIME', 'DATA', 'ELECTRICITY', 'CABLE', 'EDUCATION', 'TRANSFERS'] as const).map(
              (svc) => {
                const isKilled = settings?.killSwitches?.[svc] || false;
                const Icon = serviceIcons[svc] || Sliders;

                return (
                  <button
                    key={svc}
                    onClick={() => handleToggleKillSwitch(svc)}
                    disabled={isUpdating}
                    className={`p-3 rounded-xl border flex flex-col justify-between gap-2 text-left transition ${
                      isKilled
                        ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 font-bold'
                        : 'bg-slate-50 dark:bg-[#0A1324] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <Icon className="w-4 h-4 text-slate-500" />
                      <span className="text-[10px] font-bold uppercase">
                        {isKilled ? 'PAUSED' : 'LIVE'}
                      </span>
                    </div>
                    <span className="font-semibold text-xs text-slate-900 dark:text-white">{svc}</span>
                  </button>
                );
              }
            )}
          </div>
        </div>
      </div>

      {/* NETWORK AVAILABILITY CONTROLS */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-[#126BEB] dark:text-[#4D94FF] border border-blue-200 dark:border-blue-900/50 flex items-center justify-center">
              <Wifi className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Telecom Network Availability
              </h3>
              <p className="text-xs text-slate-500">
                Disable individual telecom networks across Airtime or Data while keeping others active
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Airtime Networks */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Airtime Networks
            </h4>
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              {(
                settings?.catalogControls?.airtimeNetworks || [
                  { network: 'MTN', name: 'MTN Nigeria' },
                  { network: 'AIRTEL', name: 'Airtel Nigeria' },
                  { network: 'GLO', name: 'Globacom (Glo)' },
                  { network: '9MOBILE', name: '9mobile' },
                ]
              ).map((net: { network: string; name: string }) => {
                const isDisabled = disabledAirtimeNetworks.includes(net.network);
                return (
                  <button
                    key={`airtime-${net.network}`}
                    type="button"
                    onClick={() => handleToggleNetwork('AIRTIME', net.network, net.name)}
                    disabled={isUpdating}
                    className={`p-3 rounded-xl border flex flex-col justify-between gap-2 text-left transition cursor-pointer disabled:opacity-50 ${
                      isDisabled
                        ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300'
                        : 'bg-slate-50 dark:bg-[#0A1324] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-bold text-xs text-slate-900 dark:text-white">
                        {net.network}
                      </span>
                      <span className="text-[10px] font-bold uppercase">
                        {isDisabled ? 'DISABLED' : 'LIVE'}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate w-full">
                      {net.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Data Networks */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Data Bundle Networks
            </h4>
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              {(
                settings?.catalogControls?.dataNetworks || [
                  { network: 'MTN', name: 'MTN Nigeria' },
                  { network: 'AIRTEL', name: 'Airtel Nigeria' },
                  { network: 'GLO', name: 'Globacom (Glo)' },
                  { network: '9MOBILE', name: '9mobile' },
                ]
              ).map((net: { network: string; name: string }) => {
                const isDisabled = disabledDataNetworks.includes(net.network);
                return (
                  <button
                    key={`data-${net.network}`}
                    type="button"
                    onClick={() => handleToggleNetwork('DATA', net.network, net.name)}
                    disabled={isUpdating}
                    className={`p-3 rounded-xl border flex flex-col justify-between gap-2 text-left transition cursor-pointer disabled:opacity-50 ${
                      isDisabled
                        ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300'
                        : 'bg-slate-50 dark:bg-[#0A1324] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-bold text-xs text-slate-900 dark:text-white">
                        {net.network}
                      </span>
                      <span className="text-[10px] font-bold uppercase">
                        {isDisabled ? 'DISABLED' : 'LIVE'}
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate w-full">
                      {net.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* DATA BUNDLE PLAN CONTROLS */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Data Bundle Plan Availability
            </h3>
            <p className="text-xs text-slate-500">
              Disable individual data plans to hide them from the catalog and block purchases ({disabledDataPlans.length} disabled)
            </p>
          </div>

          <div className="relative sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={planSearchQuery}
              onChange={(e) => setPlanSearchQuery(e.target.value)}
              placeholder="Search plans (e.g. MTN 1GB)"
              className="w-full h-9 pl-8 pr-8 rounded-lg bg-slate-50 dark:bg-[#070D18] border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#126BEB]"
            />
            {planSearchQuery && (
              <button
                type="button"
                onClick={() => setPlanSearchQuery('')}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {(['ALL', 'MTN', 'AIRTEL', 'GLO', '9MOBILE'] as const).map((net) => {
            const active = planFilterNetwork === net;
            return (
              <button
                key={net}
                type="button"
                onClick={() => setPlanFilterNetwork(net)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition shrink-0 cursor-pointer ${
                  active
                    ? 'bg-[#126BEB] text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {net === 'ALL' ? 'All Networks' : net}
              </button>
            );
          })}
        </div>

        {isLoading ? (
          <div className="py-8 flex items-center justify-center text-xs text-slate-500 gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Loading plans...</span>
          </div>
        ) : filteredDataPlans.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
            No matching data plans found.
          </div>
        ) : (
          <div className="max-h-[420px] overflow-y-auto overscroll-contain space-y-2 pr-1">
            {filteredDataPlans.map((plan) => {
              const isPlanDisabled = disabledDataPlans.includes(plan.id);
              const isNetworkDisabled = disabledDataNetworks.includes(plan.network);
              return (
                <div
                  key={plan.id}
                  className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs transition ${
                    isPlanDisabled || isNetworkDisabled
                      ? 'bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-900/40'
                      : 'bg-slate-50/70 dark:bg-[#0A1324] border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="min-w-0 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 dark:text-white">
                        {plan.network} · {plan.dataAllowance}
                      </span>
                      <span className="px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800 text-[10px] font-semibold text-slate-600 dark:text-slate-300">
                        {plan.validity}
                      </span>
                      <span className="font-semibold text-slate-700 dark:text-slate-200 tabular-nums">
                        ₦{plan.priceNaira.toLocaleString()}
                      </span>
                      {isNetworkDisabled && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 text-[10px] font-semibold">
                          Network disabled
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {plan.name}
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={isUpdating}
                    onClick={() => handleToggleDataPlan(plan.id, `${plan.network} ${plan.dataAllowance}`)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold shrink-0 transition cursor-pointer disabled:opacity-50 ${
                      isPlanDisabled
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                        : 'bg-red-50 hover:bg-red-100 dark:bg-red-950/50 dark:hover:bg-red-950/80 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-900/60'
                    }`}
                  >
                    {isPlanDisabled ? 'Enable' : 'Disable'}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
