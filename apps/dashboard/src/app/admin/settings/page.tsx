'use client';

import React, { useState, useEffect } from 'react';
import {
  Sliders,
  ShieldCheck,
  AlertTriangle,
  Power,
  DollarSign,
  History,
  Search,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  User,
  Globe,
} from 'lucide-react';
import { getStoredAuthToken } from '@/lib/auth-session';

export default function SuperAdminSettingsPage() {
  const [settings, setSettings] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [logPage, setLogPage] = useState(1);
  const [logPagination, setLogPagination] = useState<any>(null);
  const [actionSearch, setActionSearch] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

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

  const fetchAuditLogs = async () => {
    try {
      setIsLoadingLogs(true);
      const token = getStoredAuthToken();

      const params = new URLSearchParams();
      params.set('page', String(logPage));
      params.set('limit', '15');
      if (actionSearch.trim()) params.set('action', actionSearch.trim());

      const res = await fetch(`/api/admin/audit-logs?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const json = await res.json().catch(() => null);
      if (res.ok && json?.success) {
        setAuditLogs(json.data || []);
        setLogPagination(json.pagination);
      }
    } catch {
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    fetchAuditLogs();
  }, [logPage, actionSearch]);

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
        setSuccessMessage('System configuration updated and logged.');
        fetchAuditLogs();
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

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Sliders className="w-6 h-6 text-[#126BEB]" />
            <span>System Settings & Audit Logs</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Emergency service switches, global maintenance mode, and administrative audit logs
          </p>
        </div>
      </div>

      {/* Notices */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 text-red-600 dark:text-red-300 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 text-red-500 dark:text-red-400 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 text-emerald-600 dark:text-emerald-300 text-xs flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 dark:text-emerald-400 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* SECTION 1: EMERGENCY KILL SWITCHES & MAINTENANCE MODE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Global Platform Maintenance */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 text-red-600 dark:text-red-400 flex items-center justify-center">
                <Power className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Global Maintenance Mode</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Emergency master platform freeze switch</p>
              </div>
            </div>

            <button
              onClick={handleToggleMaintenance}
              disabled={isUpdating}
              className={`px-3.5 py-1.5 rounded-xl font-medium text-xs transition ${
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
            HTTP 503 Maintenance Response. Only administrators retain console access.
          </p>
        </div>

        {/* Granular Service Kill Switches */}
        <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-100 dark:border-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Granular Vending Kill Switches</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Isolate specific services during upstream outages</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {(['AIRTIME', 'DATA', 'ELECTRICITY', 'CABLE', 'EDUCATION', 'TRANSFERS'] as const).map(
              (svc) => {
                const isKilled = settings?.killSwitches?.[svc] || false;

                return (
                  <button
                    key={svc}
                    onClick={() => handleToggleKillSwitch(svc)}
                    className={`p-2.5 rounded-xl border flex items-center justify-between transition ${
                      isKilled
                        ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 font-semibold'
                        : 'bg-slate-50 dark:bg-[#080E1A] border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <span>{svc}</span>
                    <span className="text-[10px] font-mono uppercase font-bold">
                      {isKilled ? 'PAUSED' : 'LIVE'}
                    </span>
                  </button>
                );
              }
            )}
          </div>
        </div>
      </div>

      {/* SECTION 2: PLATFORM AUDIT TRAIL */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <History className="w-5 h-5 text-[#126BEB]" />
              <span>System Audit Logs</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Complete historical record of administrative actions, logins, and settings updates
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={actionSearch}
              onChange={(e) => {
                setActionSearch(e.target.value);
                setLogPage(1);
              }}
              placeholder="Filter by action name..."
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-[#080E1A] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs focus:outline-none focus:border-[#126BEB]"
            />
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-[#080E1A] text-slate-500 dark:text-slate-400 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Actor User</th>
                  <th className="px-4 py-3">Resource Target</th>
                  <th className="px-4 py-3">IP Address</th>
                  <th className="px-4 py-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono text-[11px]">
                {isLoadingLogs ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400 font-sans">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto text-[#126BEB] mb-1" />
                      Loading audit logs...
                    </td>
                  </tr>
                ) : auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400 font-sans">
                      No audit records found.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => {
                    const isExpanded = expandedLogId === log.id;

                    return (
                      <React.Fragment key={log.id}>
                        <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition">
                          <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                            {new Date(log.createdAt).toLocaleString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </td>

                          <td className="px-4 py-2.5 font-semibold text-slate-900 dark:text-slate-200">
                            {log.action}
                          </td>

                          <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300">
                            {log.userId ? log.userId.slice(0, 10) + '...' : 'SYSTEM'}
                          </td>

                          <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400">
                            {log.resourceType}: {log.resourceId}
                          </td>

                          <td className="px-4 py-2.5 text-slate-400 dark:text-slate-500">
                            {log.ipAddress || '127.0.0.1'}
                          </td>

                          <td className="px-4 py-2.5 text-right font-sans">
                            <button
                              onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                              className="text-xs text-[#126BEB] hover:underline font-medium"
                            >
                              {isExpanded ? 'Hide Payload' : 'View Payload'}
                            </button>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr className="bg-slate-50 dark:bg-[#050811]/90">
                            <td colSpan={6} className="px-4 py-3">
                              <pre className="p-3 rounded-lg bg-slate-100 dark:bg-[#04060D] border border-slate-200 dark:border-slate-800 text-[10px] text-slate-800 dark:text-emerald-400 overflow-x-auto font-mono">
                                {JSON.stringify(log.changes, null, 2)}
                              </pre>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Log Pagination */}
          {logPagination && logPagination.totalPages > 1 && (
            <div className="px-4 py-2.5 bg-slate-50 dark:bg-[#080E1A] border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>
                Page {logPagination.page} of {logPagination.totalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={!logPagination.hasPrevPage}
                  onClick={() => setLogPage((p) => Math.max(1, p - 1))}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  disabled={!logPagination.hasNextPage}
                  onClick={() => setLogPage((p) => p + 1)}
                  className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
