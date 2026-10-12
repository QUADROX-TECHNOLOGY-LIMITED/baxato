'use client';

import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { getStoredAuthToken } from '@/lib/auth-session';

export default function SuperAdminSettingsPage() {
  const [settings, setSettings] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const token = getStoredAuthToken();

      const res = await fetch('/api/admin/settings', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const json = await res.json().catch(() => null);
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

  const handleUpdateSettings = async (partialUpdates: any) => {
    try {
      setIsUpdating(true);
      setErrorMessage(null);
      setSuccessMessage(null);
      const token = getStoredAuthToken();

      const updated = { ...settings, ...partialUpdates };

      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updated),
      });

      const json = await res.json().catch(() => null);
      if (res.ok && json?.success) {
        setSettings(updated);
        setSuccessMessage('System configuration updated successfully.');
      } else {
        setErrorMessage(json?.error?.message || 'Failed to update settings.');
      }
    } catch {
      setErrorMessage('Network error updating system settings.');
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
    handleUpdateSettings({ maintenanceMode: nextState });
  };

  const handleToggleKillSwitch = (service: string) => {
    const current = settings?.killSwitches?.[service] || false;
    handleUpdateSettings({
      killSwitches: {
        ...(settings?.killSwitches || {}),
        [service]: !current,
      },
    });
  };

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
                  Isolate individual vending services during provider downtime
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
    </div>
  );
}
