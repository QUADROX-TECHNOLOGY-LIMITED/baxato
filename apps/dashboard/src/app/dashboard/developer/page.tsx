'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Key,
  ShieldAlert,
  Copy,
  Check,
  RefreshCw,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  X,
  Download,
  ArrowLeft,
  Webhook,
  Send,
  Lock,
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

export type ApiKeyEnvironment = 'TEST' | 'LIVE';
export type ApiKeyStatus = 'ACTIVE' | 'REVOKED' | 'EXPIRED';

export interface ApiKeyItem {
  id: string;
  name: string;
  keyPrefix: string;
  environment: ApiKeyEnvironment;
  status: ApiKeyStatus;
  lastUsedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GeneratedKeyPayload {
  apiKey: ApiKeyItem;
  secretKey: string;
}

export interface WebhookConfig {
  webhookUrl: string | null;
  webhookSecretPrefix: string | null;
  hasSecret: boolean;
}

export interface WebhookDeliveryItem {
  id: string;
  eventType: string;
  status: 'PENDING' | 'SUCCESSFUL' | 'FAILED';
  responseStatus?: number | null;
  attempts: number;
  lastAttemptAt?: string | null;
  createdAt: string;
}

export default function DeveloperKeysPage() {
  const [businessName, setBusinessName] = useState('Business Workspace');
  const [merchantName, setMerchantName] = useState('Merchant');
  const [kycStatus, setKycStatus] = useState('UNVERIFIED');
  const [userRole, setUserRole] = useState('BUSINESS_OWNER');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isKycModalOpen, setIsKycModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Keys State
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [isLoadingKeys, setIsLoadingKeys] = useState(true);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

  // Webhook State
  const [webhookUrl, setWebhookUrl] = useState('');
  const [initialWebhookUrl, setInitialWebhookUrl] = useState('');
  const [webhookSecretPrefix, setWebhookSecretPrefix] = useState<string | null>(null);
  const [isSavingWebhook, setIsSavingWebhook] = useState(false);
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);
  const [webhookMessage, setWebhookMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [deliveries, setDeliveries] = useState<WebhookDeliveryItem[]>([]);
  const [retryingDeliveryId, setRetryingDeliveryId] = useState<string | null>(null);

  // Modal States
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyEnv, setNewKeyEnv] = useState<ApiKeyEnvironment>('TEST');
  const [isSubmittingNewKey, setIsSubmittingNewKey] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  // Secret Reveal Modal (after creation or rotation)
  const [revealedSecretData, setRevealedSecretData] = useState<GeneratedKeyPayload | null>(null);
  const [hasCopiedSecret, setHasCopiedSecret] = useState(false);

  // Rotate Key Modal
  const [rotatingKey, setRotatingKey] = useState<ApiKeyItem | null>(null);
  const [isSubmittingRotate, setIsSubmittingRotate] = useState(false);
  const [rotateError, setRotateError] = useState<string | null>(null);

  // Revoke Key Modal
  const [revokingKey, setRevokingKey] = useState<ApiKeyItem | null>(null);
  const [isSubmittingRevoke, setIsSubmittingRevoke] = useState(false);
  const [revokeError, setRevokeError] = useState<string | null>(null);

  // Delete Key Modal
  const [deletingKey, setDeletingKey] = useState<ApiKeyItem | null>(null);
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const isVerified = kycStatus === 'VERIFIED';
  const canManageKeys = useMemo(() => {
    return (
      userRole === 'BUSINESS_OWNER' ||
      userRole === 'BUSINESS_ADMIN' ||
      userRole === 'DEVELOPER'
    );
  }, [userRole]);

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

    loadKeys();
    loadWebhookConfig();
    loadWebhookDeliveries();
  }, []);

  const getAuthHeaders = () => {
    const authToken = getStoredAuthToken();
    const storedBiz = getStoredBusiness();
    return {
      Authorization: `Bearer ${authToken}`,
      ...(storedBiz?.id ? { 'x-business-id': storedBiz.id } : {}),
    };
  };

  const loadKeys = async () => {
    setIsLoadingKeys(true);
    try {
      const res = await fetch('/api/developer/keys', {
        headers: getAuthHeaders(),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success && Array.isArray(data.data)) {
        setKeys(data.data);
      } else {
        setKeys([]);
      }
    } catch {
      setKeys([]);
    } finally {
      setIsLoadingKeys(false);
    }
  };

  const loadWebhookConfig = async () => {
    try {
      const res = await fetch('/api/developer/webhooks', {
        headers: getAuthHeaders(),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success && data.data) {
        setWebhookUrl(data.data.webhookUrl || '');
        setInitialWebhookUrl(data.data.webhookUrl || '');
        setWebhookSecretPrefix(data.data.webhookSecretPrefix || null);
      }
    } catch {}
  };

  const loadWebhookDeliveries = async () => {
    try {
      const res = await fetch('/api/developer/webhooks/deliveries?limit=5', {
        headers: getAuthHeaders(),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success && Array.isArray(data.data?.deliveries)) {
        setDeliveries(data.data.deliveries);
      }
    } catch {}
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadKeys();
    loadWebhookConfig();
    loadWebhookDeliveries();
    setTimeout(() => {
      setIsRefreshing(false);
      showToast('Developer configuration refreshed');
    }, 600);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKeyId(id);
    showToast('Copied to clipboard');
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  // Group keys into Sandbox (TEST) and Production (LIVE)
  const testKeys = useMemo(() => keys.filter((k) => k.environment === 'TEST'), [keys]);
  const liveKeys = useMemo(() => keys.filter((k) => k.environment === 'LIVE'), [keys]);

  const activeTestKey = useMemo(() => testKeys.find((k) => k.status === 'ACTIVE') || null, [testKeys]);
  const activeLiveKey = useMemo(() => liveKeys.find((k) => k.status === 'ACTIVE') || null, [liveKeys]);

  // Handle Generate Key
  const handleGenerateKeySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim() || newKeyName.trim().length < 2) {
      setGenerateError('Key name must be at least 2 characters.');
      return;
    }

    if (newKeyEnv === 'LIVE' && !isVerified) {
      setGenerateError('Identity verification required before creating live production keys.');
      return;
    }

    setIsSubmittingNewKey(true);
    setGenerateError(null);

    try {
      const res = await fetch('/api/developer/keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          name: newKeyName.trim(),
          environment: newKeyEnv,
        }),
      });

      const data = await res.json().catch(() => null);
      if (res.ok && data?.success && data.data?.secretKey) {
        setIsGenerateModalOpen(false);
        setNewKeyName('');
        setRevealedSecretData(data.data);
        setHasCopiedSecret(false);
        loadKeys();
      } else {
        setGenerateError(data?.error?.message || 'Failed to generate API key.');
      }
    } catch (err: any) {
      setGenerateError(err?.message || 'Network error while generating API key.');
    } finally {
      setIsSubmittingNewKey(false);
    }
  };

  // Handle Rotate Key
  const handleRotateKeySubmit = async () => {
    if (!rotatingKey) return;
    setIsSubmittingRotate(true);
    setRotateError(null);

    try {
      const res = await fetch(`/api/developer/keys/${rotatingKey.id}/rotate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
      });

      const data = await res.json().catch(() => null);
      if (res.ok && data?.success && data.data?.secretKey) {
        setRotatingKey(null);
        setRevealedSecretData(data.data);
        setHasCopiedSecret(false);
        loadKeys();
      } else {
        setRotateError(data?.error?.message || 'Failed to rotate key.');
      }
    } catch (err: any) {
      setRotateError(err?.message || 'Network error during rotation.');
    } finally {
      setIsSubmittingRotate(false);
    }
  };

  // Handle Revoke Key
  const handleRevokeKeySubmit = async () => {
    if (!revokingKey) return;
    setIsSubmittingRevoke(true);
    setRevokeError(null);

    try {
      const res = await fetch(`/api/developer/keys/${revokingKey.id}/revoke`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
      });

      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        setRevokingKey(null);
        showToast('API key revoked successfully');
        loadKeys();
      } else {
        setRevokeError(data?.error?.message || 'Failed to revoke key.');
      }
    } catch (err: any) {
      setRevokeError(err?.message || 'Network error during revocation.');
    } finally {
      setIsSubmittingRevoke(false);
    }
  };

  // Handle Delete Key
  const handleDeleteKeySubmit = async () => {
    if (!deletingKey) return;
    setIsSubmittingDelete(true);
    setDeleteError(null);

    try {
      const res = await fetch(`/api/developer/keys/${deletingKey.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        setDeletingKey(null);
        showToast('API key deleted');
        loadKeys();
      } else {
        setDeleteError(data?.error?.message || 'Failed to delete key.');
      }
    } catch (err: any) {
      setDeleteError(err?.message || 'Network error during deletion.');
    } finally {
      setIsSubmittingDelete(false);
    }
  };

  // Ping Webhook before saving
  const handleSaveWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!webhookUrl.trim()) {
      setWebhookMessage({ type: 'error', text: 'Please enter a valid webhook URL.' });
      return;
    }

    if (!webhookUrl.startsWith('https://') && !webhookUrl.startsWith('http://localhost')) {
      setWebhookMessage({ type: 'error', text: 'Webhook URL must use secure HTTPS protocol.' });
      return;
    }

    setIsSavingWebhook(true);
    setWebhookMessage(null);

    try {
      // Step 1: Temporarily update or test ping the endpoint
      // We ping the endpoint first to ensure it responds with 200 OK
      const pingRes = await fetch('/api/developer/webhooks/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ eventType: 'ping', testUrl: webhookUrl.trim() }),
      });

      const pingData = await pingRes.json().catch(() => null);

      if (!pingRes.ok || !pingData?.success || !pingData?.data?.success) {
        const errorDetail =
          pingData?.data?.error ||
          pingData?.error?.message ||
          `Endpoint returned status ${pingData?.data?.statusCode || 'unreachable'}`;
        setWebhookMessage({
          type: 'error',
          text: `Webhook validation failed: Unable to verify endpoint (Expected HTTP 200). Details: ${errorDetail}`,
        });
        setIsSavingWebhook(false);
        return;
      }

      // Step 2: Ping succeeded! Persist the webhook configuration
      const saveRes = await fetch('/api/developer/webhooks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ webhookUrl: webhookUrl.trim() }),
      });

      const saveData = await saveRes.json().catch(() => null);
      if (saveRes.ok && saveData?.success) {
        setInitialWebhookUrl(webhookUrl.trim());
        setWebhookMessage({
          type: 'success',
          text: `Endpoint verified and saved successfully (${pingData.data.latencyMs}ms response time).`,
        });
        loadWebhookConfig();
        loadWebhookDeliveries();
      } else {
        setWebhookMessage({
          type: 'error',
          text: saveData?.error?.message || 'Failed to persist webhook configuration.',
        });
      }
    } catch (err: any) {
      setWebhookMessage({
        type: 'error',
        text: err?.message || 'Network error while validating webhook endpoint.',
      });
    } finally {
      setIsSavingWebhook(false);
    }
  };

  // Test Webhook
  const handleTestWebhookPing = async () => {
    setIsTestingWebhook(true);
    setWebhookMessage(null);
    try {
      const res = await fetch('/api/developer/webhooks/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ eventType: 'ping' }),
      });

      const data = await res.json().catch(() => null);
      if (res.ok && data?.success && data.data?.success) {
        setWebhookMessage({
          type: 'success',
          text: `Ping delivered successfully (HTTP ${data.data.statusCode}, ${data.data.latencyMs}ms latency).`,
        });
        loadWebhookDeliveries();
      } else {
        setWebhookMessage({
          type: 'error',
          text: `Ping failed: ${data?.data?.error || data?.error?.message || 'No response from destination server.'}`,
        });
      }
    } catch (err: any) {
      setWebhookMessage({
        type: 'error',
        text: err?.message || 'Failed to dispatch test ping.',
      });
    } finally {
      setIsTestingWebhook(false);
    }
  };

  // Retry Webhook Delivery
  const handleRetryDelivery = async (deliveryId: string) => {
    setRetryingDeliveryId(deliveryId);
    try {
      const res = await fetch(`/api/developer/webhooks/deliveries/${deliveryId}/retry`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        showToast('Webhook delivery re-dispatched');
        loadWebhookDeliveries();
      } else {
        showToast(data?.error?.message || 'Failed to retry delivery');
      }
    } catch {
      showToast('Network error retrying delivery');
    } finally {
      setRetryingDeliveryId(null);
    }
  };

  // Download .env file
  const handleDownloadEnv = () => {
    if (!revealedSecretData) return;
    const envKey =
      revealedSecretData.apiKey.environment === 'LIVE'
        ? 'BAXATO_LIVE_SECRET_KEY'
        : 'BAXATO_TEST_SECRET_KEY';
    const content = `# BAXATO API Authentication (${revealedSecretData.apiKey.environment})\n${envKey}=${revealedSecretData.secretKey}\n`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${envKey.toLowerCase()}.env`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('.env file downloaded');
  };

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
          {/* Identity Verification Warning Banner (if applicable) */}
          <KycBanner
            kycStatus={kycStatus}
            userRole={userRole}
            onOpenKycModal={() => setIsKycModalOpen(true)}
          />

          {/* Navigation & Header */}
          <div className="space-y-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Dashboard</span>
            </Link>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                  API Keys & Webhooks
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  Manage your sandbox and live credentials, configure webhook destinations, and inspect delivery events.
                </p>
              </div>

              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="p-2 sm:px-3 sm:py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1528] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors self-start sm:self-auto"
                title="Refresh settings"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#126BEB]' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
            </div>
          </div>

          {/* Restricted Role Alert */}
          {!canManageKeys && (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 flex items-start gap-3 text-xs text-amber-800 dark:text-amber-200">
              <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Restricted Permissions</p>
                <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">
                  Your current role (<strong>{userRole}</strong>) has read-only access. Only Business Owners, Administrators, and Developers can modify credentials or webhooks.
                </p>
              </div>
            </div>
          )}

          {/* SECTION 1: SANDBOX / TEST KEY (AT TOP) */}
          <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    Sandbox API Key (Test Mode)
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Use this key to authenticate development requests without charging real money.
                  </p>
                </div>
              </div>

              {canManageKeys && (
                <button
                  onClick={() => {
                    setNewKeyEnv('TEST');
                    setNewKeyName('Sandbox Key');
                    setGenerateError(null);
                    setIsGenerateModalOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Sandbox Key</span>
                </button>
              )}
            </div>

            {/* Active Sandbox Key Card */}
            {activeTestKey ? (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#071120] border border-slate-200 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                    {activeTestKey.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                      {activeTestKey.keyPrefix}••••••••••••••••••••••••••••••••
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => copyToClipboard(activeTestKey.keyPrefix, activeTestKey.id)}
                    className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors"
                  >
                    {copiedKeyId === activeTestKey.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Prefix</span>
                      </>
                    )}
                  </button>

                  {canManageKeys && (
                    <>
                      <button
                        onClick={() => {
                          setRotatingKey(activeTestKey);
                          setRotateError(null);
                        }}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-[#126BEB]" />
                        <span>Roll Key</span>
                      </button>
                      <button
                        onClick={() => {
                          setRevokingKey(activeTestKey);
                          setRevokeError(null);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                        title="Revoke key"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-6 px-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  No active Sandbox key found.
                </p>
                {canManageKeys && (
                  <button
                    onClick={() => {
                      setNewKeyEnv('TEST');
                      setNewKeyName('Sandbox Key');
                      setGenerateError(null);
                      setIsGenerateModalOpen(true);
                    }}
                    className="mt-2 text-xs font-bold text-[#126BEB] hover:underline"
                  >
                    Generate Sandbox Key
                  </button>
                )}
              </div>
            )}

            {/* List of Revoked / Inactive Sandbox Keys */}
            {testKeys.filter((k) => k.status !== 'ACTIVE').length > 0 && (
              <div className="pt-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  Revoked Sandbox Keys
                </span>
                <div className="space-y-1.5">
                  {testKeys
                    .filter((k) => k.status !== 'ACTIVE')
                    .map((k) => (
                      <div
                        key={k.id}
                        className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#071120] text-xs flex items-center justify-between text-slate-500"
                      >
                        <span className="font-mono line-through">{k.keyPrefix}...</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-rose-500 font-bold uppercase">Revoked</span>
                          {canManageKeys && (
                            <button
                              onClick={() => {
                                setDeletingKey(k);
                                setDeleteError(null);
                              }}
                              className="text-slate-400 hover:text-rose-600 p-1"
                              title="Delete revoked key permanently"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* SECTION 2: PRODUCTION / LIVE KEY (AT BOTTOM) */}
          <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    Production API Key (Live Mode)
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Used on your production server to vend live airtime, data, power, and exam PINs.
                  </p>
                </div>
              </div>

              {isVerified && canManageKeys && (
                <button
                  onClick={() => {
                    setNewKeyEnv('LIVE');
                    setNewKeyName('Production Key');
                    setGenerateError(null);
                    setIsGenerateModalOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Production Key</span>
                </button>
              )}
            </div>

            {/* KYC Guard for Live Keys */}
            {!isVerified ? (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#071120] border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                      Identity Verification Required for Production Keys
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Verify your business identity (NIMC / BVN) to unlock real live vending credentials.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsKycModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-[#126BEB] hover:bg-[#0B5CC7] text-white text-xs font-bold shrink-0 shadow-xs transition-colors"
                >
                  Verify Now
                </button>
              </div>
            ) : activeLiveKey ? (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#071120] border border-slate-200 dark:border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                    {activeLiveKey.name}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                      {activeLiveKey.keyPrefix}••••••••••••••••••••••••••••••••
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => copyToClipboard(activeLiveKey.keyPrefix, activeLiveKey.id)}
                    className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors"
                  >
                    {copiedKeyId === activeLiveKey.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Prefix</span>
                      </>
                    )}
                  </button>

                  {canManageKeys && (
                    <>
                      <button
                        onClick={() => {
                          setRotatingKey(activeLiveKey);
                          setRotateError(null);
                        }}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors"
                      >
                        <RefreshCw className="w-3.5 h-3.5 text-[#126BEB]" />
                        <span>Roll Key</span>
                      </button>
                      <button
                        onClick={() => {
                          setRevokingKey(activeLiveKey);
                          setRevokeError(null);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                        title="Revoke key"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-6 px-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  No active Production key found.
                </p>
                {canManageKeys && (
                  <button
                    onClick={() => {
                      setNewKeyEnv('LIVE');
                      setNewKeyName('Production Key');
                      setGenerateError(null);
                      setIsGenerateModalOpen(true);
                    }}
                    className="mt-2 text-xs font-bold text-[#126BEB] hover:underline"
                  >
                    Generate Production Key
                  </button>
                )}
              </div>
            )}

            {/* List of Revoked / Inactive Live Keys */}
            {isVerified && liveKeys.filter((k) => k.status !== 'ACTIVE').length > 0 && (
              <div className="pt-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  Revoked Production Keys
                </span>
                <div className="space-y-1.5">
                  {liveKeys
                    .filter((k) => k.status !== 'ACTIVE')
                    .map((k) => (
                      <div
                        key={k.id}
                        className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-[#071120] text-xs flex items-center justify-between text-slate-500"
                      >
                        <span className="font-mono line-through">{k.keyPrefix}...</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-rose-500 font-bold uppercase">Revoked</span>
                          {canManageKeys && (
                            <button
                              onClick={() => {
                                setDeletingKey(k);
                                setDeleteError(null);
                              }}
                              className="text-slate-400 hover:text-rose-600 p-1"
                              title="Delete revoked key permanently"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>

          {/* SECTION 3: WEBHOOK SETUP & EVENTS */}
          <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800 shadow-xs space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
                  <Webhook className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    Webhook Destination & Events
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Receive instant real-time HTTP callbacks whenever transactions succeed or fail.
                  </p>
                </div>
              </div>
            </div>

            {/* Webhook URL Form */}
            <form onSubmit={handleSaveWebhook} className="space-y-4">
              {webhookMessage && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                    webhookMessage.type === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-200'
                      : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-200'
                  }`}
                >
                  {webhookMessage.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  )}
                  <span className="leading-relaxed">{webhookMessage.text}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Endpoint URL
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="url"
                    placeholder="https://api.yourdomain.com/webhooks/baxato"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    required
                    disabled={!canManageKeys || isSavingWebhook}
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#070D18] text-slate-900 dark:text-white text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-[#126BEB]"
                  />

                  <div className="flex items-center gap-2">
                    {initialWebhookUrl && (
                      <button
                        type="button"
                        onClick={handleTestWebhookPing}
                        disabled={isTestingWebhook || isSavingWebhook}
                        className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors disabled:opacity-60"
                      >
                        {isTestingWebhook ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Send className="w-3.5 h-3.5 text-purple-500" />
                        )}
                        <span>Ping Test</span>
                      </button>
                    )}

                    {canManageKeys && (
                      <button
                        type="submit"
                        disabled={isSavingWebhook || webhookUrl === initialWebhookUrl}
                        className="px-4 py-2.5 rounded-xl bg-[#126BEB] hover:bg-[#0B5CC7] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-60"
                      >
                        {isSavingWebhook ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Pinging & Saving...</span>
                          </>
                        ) : (
                          <span>Save Webhook</span>
                        )}
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-[11px] text-slate-400">
                  Before saving, BAXATO verifies your server by dispatching a test ping. The endpoint must respond with HTTP 200 OK.
                </p>
              </div>

              {webhookSecretPrefix && (
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-[#071120] border border-slate-200 dark:border-slate-800/80 text-xs">
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                      Webhook HMAC Signing Secret
                    </span>
                    <span className="font-mono text-xs text-slate-700 dark:text-slate-300 font-bold">
                      {webhookSecretPrefix}••••••••••••••••
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Header: x-baxato-signature
                  </span>
                </div>
              )}
            </form>

            {/* Webhook Deliveries Log Table */}
            <div className="pt-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Recent Webhook Deliveries
                </span>
                <span className="text-[11px] text-slate-400">
                  Last {deliveries.length} events
                </span>
              </div>

              {deliveries.length === 0 ? (
                <div className="py-6 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400">
                  No outbound webhook deliveries logged yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                        <th className="py-2 px-3">Event</th>
                        <th className="py-2 px-3">Status</th>
                        <th className="py-2 px-3">Attempts</th>
                        <th className="py-2 px-3">Time</th>
                        <th className="py-2 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                      {deliveries.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-[#0C1527]/50">
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-800 dark:text-slate-200">
                            {item.eventType}
                          </td>
                          <td className="py-2.5 px-3">
                            {item.status === 'SUCCESSFUL' ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>{item.responseStatus || 200} OK</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 dark:text-rose-400">
                                <XCircle className="w-3.5 h-3.5" />
                                <span>{item.responseStatus ? `HTTP ${item.responseStatus}` : 'Failed'}</span>
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500">
                            {item.attempts}
                          </td>
                          <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                            {new Date(item.createdAt).toLocaleTimeString('en-NG', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              onClick={() => handleRetryDelivery(item.id)}
                              disabled={retryingDeliveryId === item.id}
                              className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-semibold text-slate-700 dark:text-slate-300 transition-colors disabled:opacity-50"
                            >
                              {retryingDeliveryId === item.id ? 'Retrying...' : 'Re-send'}
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* MODAL 1: Generate New Key Modal */}
      {isGenerateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#126BEB]/10 text-[#126BEB] flex items-center justify-center">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                    Generate {newKeyEnv === 'LIVE' ? 'Production' : 'Sandbox'} Key
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Create a new secret key for API requests
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsGenerateModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleGenerateKeySubmit} className="space-y-4">
              {generateError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{generateError}</span>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Key Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Core Backend, Mobile Service"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#070D18] text-slate-900 dark:text-white text-xs focus:outline-hidden focus:ring-2 focus:ring-[#126BEB]"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsGenerateModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingNewKey}
                  className="px-4 py-2 rounded-xl bg-[#126BEB] hover:bg-[#0B5CC7] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-60"
                >
                  {isSubmittingNewKey ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Generating...</span>
                    </>
                  ) : (
                    <span>Create Key</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Secret Reveal Modal (Shown ONCE) */}
      {revealedSecretData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  {revealedSecretData.apiKey.name} Created
                </h3>
                <p className="text-[11px] text-slate-400">
                  {revealedSecretData.apiKey.environment === 'LIVE' ? 'Production' : 'Sandbox'} Secret Key
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-200 text-xs space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Save your API key now</span>
              </div>
              <p className="text-[11px] leading-relaxed text-amber-700 dark:text-amber-300">
                This secret key will <strong>never be shown again</strong>. Please copy it and store it securely in your environment variables.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900 dark:bg-[#060D18] border border-slate-800 space-y-2">
              <div className="p-2.5 rounded-lg bg-black/40 border border-white/10 font-mono text-xs font-bold text-[#38BDF8] break-all">
                {revealedSecretData.secretKey}
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleDownloadEnv}
                  className="text-xs text-slate-300 hover:text-white flex items-center gap-1 font-semibold transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .env</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(revealedSecretData.secretKey);
                    setHasCopiedSecret(true);
                    showToast('Secret key copied');
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                    hasCopiedSecret
                      ? 'bg-emerald-600 text-white'
                      : 'bg-[#126BEB] hover:bg-[#0B5CC7] text-white shadow-xs'
                  }`}
                >
                  {hasCopiedSecret ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Secret Key</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <button
              onClick={() => {
                setRevealedSecretData(null);
                setHasCopiedSecret(false);
              }}
              className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* MODAL 3: Rotate Key Modal */}
      {rotatingKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  Roll / Rotate API Key
                </h3>
                <p className="text-[11px] text-slate-400">
                  {rotatingKey.name} ({rotatingKey.environment})
                </p>
              </div>
            </div>

            {rotateError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{rotateError}</span>
              </div>
            )}

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Rolling this key will <strong>immediately revoke the old secret</strong> and generate a replacement key. Any systems using the old secret will need to be updated.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setRotatingKey(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRotateKeySubmit}
                disabled={isSubmittingRotate}
                className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-60"
              >
                {isSubmittingRotate ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Rotating...</span>
                  </>
                ) : (
                  <span>Confirm Roll Key</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Revoke Key Modal */}
      {revokingKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center font-bold">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  Revoke API Key
                </h3>
                <p className="text-[11px] text-slate-400">
                  {revokingKey.name} ({revokingKey.environment})
                </p>
              </div>
            </div>

            {revokeError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{revokeError}</span>
              </div>
            )}

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Are you sure you want to revoke <strong>{revokingKey.name}</strong>? Requests using this key will immediately be denied.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setRevokingKey(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRevokeKeySubmit}
                disabled={isSubmittingRevoke}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-60"
              >
                {isSubmittingRevoke ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Revoking...</span>
                  </>
                ) : (
                  <span>Revoke Key</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: Delete Key Modal */}
      {deletingKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center font-bold">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  Delete Key Record
                </h3>
                <p className="text-[11px] text-slate-400">
                  {deletingKey.name}
                </p>
              </div>
            </div>

            {deleteError && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Permanently delete this revoked key record from your list? Past vending history remains in your ledger.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setDeletingKey(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteKeySubmit}
                disabled={isSubmittingDelete}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-60"
              >
                {isSubmittingDelete ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <span>Delete Key</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KYC Verification Modal */}
      <KycModal
        isOpen={isKycModalOpen}
        onClose={() => setIsKycModalOpen(false)}
        onSuccess={() => setKycStatus('VERIFIED')}
      />
    </div>
  );
}
