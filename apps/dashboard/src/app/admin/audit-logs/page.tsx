'use client';

import React, { useState, useEffect } from 'react';
import {
  History,
  Search,
  Loader2,
  AlertTriangle,
  RefreshCw,
  Clock,
  Shield,
  User,
  Globe,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { getStoredAuthToken } from '@/lib/auth-session';

interface AuditLogRecord {
  id: string;
  userId?: string | null;
  action: string;
  resourceType: string;
  resourceId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  changes?: any;
  createdAt: string;
}

export default function SuperAdminAuditLogsPage() {
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchAuditLogs = async () => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const token = getStoredAuthToken();

      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '20');
      if (search.trim()) params.set('action', search.trim());

      const res = await fetch(`/api/admin/audit-logs?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const json = await res.json().catch(() => null);
      if (res.ok && json?.success) {
        setAuditLogs(json.data || []);
        if (json.pagination) setPagination(json.pagination);
      } else {
        setErrorMessage(json?.error?.message || 'Failed to load audit logs.');
      }
    } catch {
      setErrorMessage('Network error fetching audit trail.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [page]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchAuditLogs();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <History className="w-5 h-5 text-[#126BEB]" />
            <span>Audit Trail &amp; Activity Logs</span>
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Immutable historical record of administrative actions, logins, and system configuration updates
          </p>
        </div>

        <button
          onClick={fetchAuditLogs}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition disabled:opacity-50 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-[#126BEB]' : ''}`} />
          <span>Refresh Logs</span>
        </button>
      </div>

      {/* Notices */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-700 dark:text-red-300 text-xs flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter by action name (e.g. LOGIN, SETTINGS_UPDATE)..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-xs focus:outline-none focus:ring-2 focus:ring-[#126BEB] transition"
          />
        </form>
      </div>

      {/* Table Container */}
      <div className="rounded-xl bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 font-semibold uppercase tracking-wider text-[10px] border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-5 py-3.5">Timestamp</th>
                <th className="px-5 py-3.5">Action</th>
                <th className="px-5 py-3.5">Actor User</th>
                <th className="px-5 py-3.5">Resource Target</th>
                <th className="px-5 py-3.5">IP Address</th>
                <th className="px-5 py-3.5 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#126BEB] mb-2" />
                    <span>Loading audit trail...</span>
                  </td>
                </tr>
              ) : auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                    No audit records found matching your filter.
                  </td>
                </tr>
              ) : (
                auditLogs.map((log) => {
                  const isExpanded = expandedLogId === log.id;

                  return (
                    <React.Fragment key={log.id}>
                      <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition">
                        <td className="px-5 py-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString('en-GB', {
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </td>

                        <td className="px-5 py-3 font-semibold text-slate-900 dark:text-white">
                          {log.action}
                        </td>

                        <td className="px-5 py-3 text-slate-600 dark:text-slate-300">
                          {log.userId ? log.userId.slice(0, 14) : 'SYSTEM'}
                        </td>

                        <td className="px-5 py-3 text-slate-500">
                          {log.resourceType}: {log.resourceId}
                        </td>

                        <td className="px-5 py-3 text-slate-400">
                          {log.ipAddress || '127.0.0.1'}
                        </td>

                        <td className="px-5 py-3 text-right">
                          <button
                            onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                            className="inline-flex items-center gap-1 text-xs text-[#126BEB] hover:underline font-semibold"
                          >
                            <span>{isExpanded ? 'Hide' : 'View'}</span>
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="bg-slate-50 dark:bg-[#070D18]">
                          <td colSpan={6} className="px-5 py-4">
                            <div className="space-y-2">
                              <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 block">
                                Audit Changes Payload:
                              </span>
                              <pre className="p-3 rounded-lg bg-white dark:bg-[#0A1324] border border-slate-200 dark:border-slate-800 text-[11px] text-slate-800 dark:text-emerald-400 overflow-x-auto font-mono">
                                {JSON.stringify(log.changes, null, 2)}
                              </pre>
                            </div>
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

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="px-5 py-3 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
            <span>
              Page {pagination.page} of {pagination.totalPages} ({pagination.totalCount} total)
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={!pagination.hasPrevPage}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0D1726] text-slate-700 dark:text-slate-300 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                disabled={!pagination.hasNextPage}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0D1726] text-slate-700 dark:text-slate-300 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
