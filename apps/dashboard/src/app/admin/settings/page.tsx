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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-purple-950/40">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Sliders className="w-6 h-6 text-amber-400" />
            <span>Master System Settings & Sovereign Audit Trail</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Emergency platform kill switches, global commission schedules, and immutable SHA-256 audit logs
          </p>
        </div>
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

      {/* SECTION 1: EMERGENCY KILL SWITCHES & MAINTENANCE MODE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Global Platform Maintenance */}
        <div className="p-5 sm:p-6 rounded-2xl bg-[#080D1D] border border-red-900/40 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center">
                <Power className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Global Maintenance Mode</h3>
                <p className="text-xs text-slate-400">Emergency master platform freeze switch</p>
              </div>
            </div>

            <button
              onClick={handleToggleMaintenance}
              disabled={isUpdating}
              className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition ${
                settings?.maintenanceMode
                  ? 'bg-red-600 text-white hover:bg-red-500 shadow-lg shadow-red-900/40'
                  : 'bg-slate-900 text-slate-300 hover:text-white border border-slate-800'
              }`}
            >
              {settings?.maintenanceMode ? 'ACTIVE (FROZEN)' : 'OFF (OPERATIONAL)'}
            </button>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            When enabled, all public web endpoints, mobile apps, and merchant API calls return a structured
            HTTP 503 Maintenance Response. Only Super Admins retain console access.
          </p>
        </div>

        {/* Granular Service Kill Switches */}
        <div className="p-5 sm:p-6 rounded-2xl bg-[#080D1D] border border-purple-900/40 shadow-xl space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Granular Vending Kill Switches</h3>
                <p className="text-xs text-slate-400">Isolate specific services during upstream outages</p>
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
                        ? 'bg-red-950/40 border-red-800 text-red-300 font-bold'
                        : 'bg-[#050811] border-slate-800 text-slate-300 hover:text-white'
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
      <div className="p-5 sm:p-6 rounded-3xl bg-[#080D1D] border border-purple-900/30 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <History className="w-5 h-5 text-purple-400" />
              <span>Immutable Sovereign Audit Trail</span>
            </h2>
            <p className="text-xs text-slate-400">
              Complete historical record of all administrative commands, logins, and settings updates
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
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-[#050811] border border-slate-800 text-white placeholder-slate-500 text-xs focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="rounded-xl border border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#050811] text-slate-400 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Actor User</th>
                  <th className="px-4 py-3">Resource Target</th>
                  <th className="px-4 py-3">IP Address</th>
                  <th className="px-4 py-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850/60 font-mono text-[11px]">
                {isLoadingLogs ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-400 font-sans">
                      <Loader2 className="w-5 h-5 animate-spin mx-auto text-purple-400 mb-1" />
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
                        <tr className="hover:bg-slate-900/40 transition">
                          <td className="px-4 py-2.5 text-slate-400 whitespace-nowrap">
                            {new Date(log.createdAt).toLocaleString('en-GB', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </td>

                          <td className="px-4 py-2.5 font-bold text-purple-300">
                            {log.action}
                          </td>

                          <td className="px-4 py-2.5 text-slate-300">
                            {log.userId ? log.userId.slice(0, 10) + '...' : 'SYSTEM'}
                          </td>

                          <td className="px-4 py-2.5 text-slate-400">
                            {log.resourceType}: {log.resourceId}
                          </td>

                          <td className="px-4 py-2.5 text-slate-500">
                            {log.ipAddress || '127.0.0.1'}
                          </td>

                          <td className="px-4 py-2.5 text-right font-sans">
                            <button
                              onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                              className="text-xs text-purple-400 hover:text-purple-300 font-semibold"
                            >
                              {isExpanded ? 'Hide Payload' : 'View Payload'}
                            </button>
                          </td>
                        </tr>

                        {isExpanded && (
                          <tr className="bg-[#050811]/90">
                            <td colSpan={6} className="px-4 py-3">
                              <pre className="p-3 rounded-lg bg-[#04060D] border border-slate-800 text-[10px] text-emerald-400 overflow-x-auto font-mono">
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
            <div className="px-4 py-2.5 bg-[#050811] border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span>
                Page {logPagination.page} of {logPagination.totalPages}
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={!logPagination.hasPrevPage}
                  onClick={() => setLogPage((p) => Math.max(1, p - 1))}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  disabled={!logPagination.hasNextPage}
                  onClick={() => setLogPage((p) => p + 1)}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white disabled:opacity-40"
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
