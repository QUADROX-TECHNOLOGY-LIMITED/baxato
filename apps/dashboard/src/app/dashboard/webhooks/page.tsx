'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Webhook,
  ArrowLeft,
  RefreshCw,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Send,
  Eye,
  Check,
  X,
} from 'lucide-react';
import Sidebar from '@/components/dashboard/Sidebar';
import Header from '@/components/dashboard/Header';
import KycBanner from '@/components/dashboard/KycBanner';
import KycModal from '@/components/dashboard/KycModal';
import {
  getStoredAuthToken,
  getStoredUser,
  getStoredBusiness,
  clearSessionAndRedirect,
} from '@/lib/auth-session';

export interface WebhookDeliveryLog {
  id: string;
  eventType: string;
  payload?: any;
  status: 'PENDING' | 'SUCCESSFUL' | 'FAILED';
  attempts: number;
  lastAttemptAt?: string | null;
  nextRetryAt?: string | null;
  responseStatus?: number | null;
  responseBody?: string | null;
  createdAt: string;
}

export default function WebhookEventsPage() {
  const [businessName, setBusinessName] = useState('Business Workspace');
  const [merchantName, setMerchantName] = useState('Merchant');
  const [kycStatus, setKycStatus] = useState('UNVERIFIED');
  const [userRole, setUserRole] = useState('BUSINESS_OWNER');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isKycModalOpen, setIsKycModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [deliveries, setDeliveries] = useState<WebhookDeliveryLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [selectedDelivery, setSelectedDelivery] = useState<WebhookDeliveryLog | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SUCCESSFUL' | 'FAILED'>('ALL');

  useEffect(() => {
    const token = getStoredAuthToken();
    if (!token) {
      clearSessionAndRedirect('expired');
      return;
    }

    try {
      const storedUser = getStoredUser();
      const storedBiz = getStoredBusiness();

      if (storedUser) {
        if (storedUser.role) setUserRole(storedUser.role);
        if (storedUser.firstName) setMerchantName(storedUser.firstName);
        if (storedUser.kycStatus) setKycStatus(storedUser.kycStatus);
      }
      if (storedBiz?.name) {
        setBusinessName(storedBiz.name);
      }
    } catch {}

    loadDeliveries();
  }, []);

  const getAuthHeaders = () => {
    const authToken = getStoredAuthToken();
    const storedBiz = getStoredBusiness();
    return {
      Authorization: `Bearer ${authToken}`,
      ...(storedBiz?.id ? { 'x-business-id': storedBiz.id } : {}),
    };
  };

  const loadDeliveries = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/developer/webhooks/deliveries?limit=50', {
        headers: getAuthHeaders(),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success && Array.isArray(data.data?.deliveries)) {
        setDeliveries(data.data.deliveries);
      } else {
        setDeliveries([]);
      }
    } catch {
      setDeliveries([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadDeliveries();
    setTimeout(() => {
      setIsRefreshing(false);
      showToast('Deliveries refreshed');
    }, 600);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleRetry = async (deliveryId: string) => {
    setRetryingId(deliveryId);
    try {
      const res = await fetch(`/api/developer/webhooks/deliveries/${deliveryId}/retry`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        showToast('Webhook delivery re-dispatched');
        loadDeliveries();
      } else {
        showToast(data?.error?.message || 'Failed to retry delivery');
      }
    } catch {
      showToast('Network error retrying delivery');
    } finally {
      setRetryingId(null);
    }
  };

  const filteredDeliveries = deliveries.filter((d) => {
    if (statusFilter === 'ALL') return true;
    return d.status === statusFilter;
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070D18] text-slate-800 dark:text-slate-100 flex flex-col lg:flex-row transition-colors duration-150">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 px-4 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-semibold animate-in fade-in slide-in-from-bottom-3 duration-200">
          <Check className="w-4 h-4 text-emerald-400 dark:text-emerald-600 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Sidebar */}
      <Sidebar
        businessName={businessName}
        merchantName={merchantName}
        kycStatus={kycStatus}
        userRole={userRole}
        onOpenKycModal={() => setIsKycModalOpen(true)}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-72">
        <Header
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onOpenKycModal={() => setIsKycModalOpen(true)}
          merchantName={merchantName}
          kycStatus={kycStatus}
          userRole={userRole}
          isRefreshing={isRefreshing}
          onRefresh={handleRefresh}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full space-y-6">
          <KycBanner
            kycStatus={kycStatus}
            userRole={userRole}
            onOpenKycModal={() => setIsKycModalOpen(true)}
          />

          {/* Navigation & Header */}
          <div className="space-y-2">
            <Link
              href="/dashboard/developer"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to API Keys & Webhooks</span>
            </Link>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                  Webhook Deliveries & Events
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  Inspect outbound event dispatches, HTTP response codes, and manually re-send missed callbacks.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="p-2 sm:px-3 sm:py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1528] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#126BEB]' : ''}`} />
                  <span className="hidden sm:inline">Refresh</span>
                </button>
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            {/* Filter Tabs */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1.5 text-xs font-semibold">
                {(['ALL', 'SUCCESSFUL', 'FAILED'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setStatusFilter(filter)}
                    className={`px-3 py-1.5 rounded-lg transition-colors ${
                      statusFilter === filter
                        ? 'bg-[#126BEB] text-white font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {filter === 'ALL' ? 'All Deliveries' : filter === 'SUCCESSFUL' ? 'Successful' : 'Failed'}
                  </button>
                ))}
              </div>

              <span className="text-xs text-slate-400 font-semibold">
                {filteredDeliveries.length} Records
              </span>
            </div>

            {isLoading ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-2">
                <RefreshCw className="w-5 h-5 animate-spin text-[#126BEB]" />
                <span className="text-xs text-slate-400">Loading webhook events...</span>
              </div>
            ) : filteredDeliveries.length === 0 ? (
              <div className="py-12 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
                No webhook deliveries matching current filter.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                      <th className="py-2.5 px-3">Event Type</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Attempts</th>
                      <th className="py-2.5 px-3">Timestamp</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                    {filteredDeliveries.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-[#0C1527]/50">
                        <td className="py-3 px-3">
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                            {item.eventType}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          {item.status === 'SUCCESSFUL' ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="w-4 h-4" />
                              <span>{item.responseStatus || 200} OK</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 dark:text-rose-400">
                              <XCircle className="w-4 h-4" />
                              <span>{item.responseStatus ? `HTTP ${item.responseStatus}` : 'Failed'}</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-slate-500">
                          {item.attempts}
                        </td>
                        <td className="py-3 px-3 text-slate-500 text-[11px]">
                          {new Date(item.createdAt).toLocaleString('en-NG', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {item.payload && (
                              <button
                                onClick={() => setSelectedDelivery(item)}
                                className="px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>Payload</span>
                              </button>
                            )}

                            <button
                              onClick={() => handleRetry(item.id)}
                              disabled={retryingId === item.id}
                              className="px-2.5 py-1 rounded bg-[#126BEB] hover:bg-[#0B5CC7] text-white text-xs font-bold transition-colors disabled:opacity-50"
                            >
                              {retryingId === item.id ? 'Retrying...' : 'Re-send'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Payload Viewer Modal */}
      {selectedDelivery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  Webhook Payload: {selectedDelivery.eventType}
                </h3>
                <p className="text-[11px] text-slate-400">
                  Status: {selectedDelivery.responseStatus || 'No response'}
                </p>
              </div>
              <button
                onClick={() => setSelectedDelivery(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900 dark:bg-[#060D18] border border-slate-800 max-h-72 overflow-y-auto">
              <pre className="text-xs font-mono text-emerald-400 whitespace-pre-wrap">
                {JSON.stringify(selectedDelivery.payload, null, 2)}
              </pre>
            </div>

            <button
              onClick={() => setSelectedDelivery(null)}
              className="w-full py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* KYC Modal */}
      <KycModal
        isOpen={isKycModalOpen}
        onClose={() => setIsKycModalOpen(false)}
        onSuccess={() => setKycStatus('VERIFIED')}
      />
    </div>
  );
}
