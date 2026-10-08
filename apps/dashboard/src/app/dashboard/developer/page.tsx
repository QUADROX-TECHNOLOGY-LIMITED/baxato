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
  X,
  Download,
  ArrowLeft,
  Webhook,
  Send,
  Lock,
  Eye,
  EyeOff,
  ExternalLink,
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
  webhookTestUrl: string | null;
  webhookTestSecret: string | null;
  hasTestSecret: boolean;
  updatedAt: string | null;
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
  const [showTestKey, setShowTestKey] = useState(false);

  // Sandbox Webhook State
  const [webhookTestUrl, setWebhookTestUrl] = useState('');
  const [initialWebhookTestUrl, setInitialWebhookTestUrl] = useState('');
  const [webhookTestSecret, setWebhookTestSecret] = useState<string | null>(null);
  const [showWebhookTestSecret, setShowWebhookTestSecret] = useState(false);
  const [isSavingWebhookTest, setIsSavingWebhookTest] = useState(false);
  const [isTestingWebhookTest, setIsTestingWebhookTest] = useState(false);
  const [webhookTestMessage, setWebhookTestMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Production Webhook State
  const [webhookLiveUrl, setWebhookLiveUrl] = useState('');
  const [initialWebhookLiveUrl, setInitialWebhookLiveUrl] = useState('');
  const [webhookLiveSecretPrefix, setWebhookLiveSecretPrefix] = useState<string | null>(null);
  const [isSavingWebhookLive, setIsSavingWebhookLive] = useState(false);
  const [isTestingWebhookLive, setIsTestingWebhookLive] = useState(false);
  const [webhookLiveMessage, setWebhookLiveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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
  }, []);

  const getAuthHeaders = (): Record<string, string> => {
    const token = getStoredAuthToken();
    const storedBiz = getStoredBusiness();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (storedBiz?.id) headers['x-business-id'] = storedBiz.id;
    return headers;
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
      }
    } catch {
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
        // Live
        const liveUrl = data.data.webhookUrl || '';
        setWebhookLiveUrl(liveUrl);
        setInitialWebhookLiveUrl(liveUrl);
        setWebhookLiveSecretPrefix(data.data.webhookSecretPrefix || null);

        // Test
        const testUrl = data.data.webhookTestUrl || '';
        setWebhookTestUrl(testUrl);
        setInitialWebhookTestUrl(testUrl);
        setWebhookTestSecret(data.data.webhookTestSecret || null);
      }
    } catch {}
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadKeys();
    loadWebhookConfig();
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

  // Sandbox Webhook: Save
  const handleSaveWebhookTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!webhookTestUrl.trim()) {
      setWebhookTestMessage({ type: 'error', text: 'Please enter a valid sandbox webhook URL.' });
      return;
    }

    if (
      !webhookTestUrl.startsWith('https://') &&
      !webhookTestUrl.startsWith('http://localhost') &&
      !webhookTestUrl.startsWith('http://127.0.0.1')
    ) {
      setWebhookTestMessage({ type: 'error', text: 'Sandbox webhook URL should use HTTPS or local address.' });
      return;
    }

    setIsSavingWebhookTest(true);
    setWebhookTestMessage(null);

    try {
      const res = await fetch('/api/developer/webhooks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ webhookTestUrl: webhookTestUrl.trim() }),
      });

      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        setInitialWebhookTestUrl(webhookTestUrl.trim());
        setWebhookTestMessage({
          type: 'success',
          text: 'Sandbox webhook endpoint saved successfully!',
        });
        loadWebhookConfig();
      } else {
        setWebhookTestMessage({
          type: 'error',
          text: data?.error?.message || 'Failed to save sandbox webhook.',
        });
      }
    } catch (err: any) {
      setWebhookTestMessage({
        type: 'error',
        text: err?.message || 'Network error saving sandbox webhook.',
      });
    } finally {
      setIsSavingWebhookTest(false);
    }
  };

  // Sandbox Webhook: Ping Test
  const handleTestWebhookTestPing = async () => {
    setIsTestingWebhookTest(true);
    setWebhookTestMessage(null);
    try {
      const res = await fetch('/api/developer/webhooks/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ eventType: 'ping', environment: 'TEST' }),
      });

      const data = await res.json().catch(() => null);
      if (res.ok && data?.success && data.data?.success) {
        setWebhookTestMessage({
          type: 'success',
          text: `Sandbox Ping succeeded! HTTP ${data.data.statusCode || 200} OK in ${data.data.latencyMs}ms.`,
        });
      } else {
        const errorDetail = data?.data?.error || data?.error?.message || 'Failed to deliver ping';
        setWebhookTestMessage({
          type: 'error',
          text: `Sandbox Ping failed: ${errorDetail}`,
        });
      }
    } catch (err: any) {
      setWebhookTestMessage({
        type: 'error',
        text: err?.message || 'Network error during sandbox ping.',
      });
    } finally {
      setIsTestingWebhookTest(false);
    }
  };

  // Sandbox Webhook: Roll Secret
  const handleRollWebhookTestSecret = async () => {
    try {
      const res = await fetch('/api/developer/webhooks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ regenerateTestSecret: true }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        showToast('Sandbox webhook secret rolled');
        loadWebhookConfig();
      } else {
        showToast(data?.error?.message || 'Failed to roll sandbox secret');
      }
    } catch {
      showToast('Network error rolling sandbox secret');
    }
  };

  // Production Webhook: Save
  const handleSaveWebhookLive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!webhookLiveUrl.trim()) {
      setWebhookLiveMessage({ type: 'error', text: 'Please enter a valid live webhook URL.' });
      return;
    }

    if (!webhookLiveUrl.startsWith('https://')) {
      setWebhookLiveMessage({ type: 'error', text: 'Production webhook URL must use secure HTTPS protocol.' });
      return;
    }

    setIsSavingWebhookLive(true);
    setWebhookLiveMessage(null);

    try {
      const res = await fetch('/api/developer/webhooks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ webhookUrl: webhookLiveUrl.trim() }),
      });

      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        setInitialWebhookLiveUrl(webhookLiveUrl.trim());
        setWebhookLiveMessage({
          type: 'success',
          text: 'Production webhook endpoint saved successfully!',
        });
        loadWebhookConfig();
      } else {
        setWebhookLiveMessage({
          type: 'error',
          text: data?.error?.message || 'Failed to save production webhook.',
        });
      }
    } catch (err: any) {
      setWebhookLiveMessage({
        type: 'error',
        text: err?.message || 'Network error saving production webhook.',
      });
    } finally {
      setIsSavingWebhookLive(false);
    }
  };

  // Production Webhook: Ping Test
  const handleTestWebhookLivePing = async () => {
    setIsTestingWebhookLive(true);
    setWebhookLiveMessage(null);
    try {
      const res = await fetch('/api/developer/webhooks/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ eventType: 'ping', environment: 'LIVE' }),
      });

      const data = await res.json().catch(() => null);
      if (res.ok && data?.success && data.data?.success) {
        setWebhookLiveMessage({
          type: 'success',
          text: `Production Ping succeeded! HTTP ${data.data.statusCode || 200} OK in ${data.data.latencyMs}ms.`,
        });
      } else {
        const errorDetail = data?.data?.error || data?.error?.message || 'Failed to deliver ping';
        setWebhookLiveMessage({
          type: 'error',
          text: `Production Ping failed: ${errorDetail}`,
        });
      }
    } catch (err: any) {
      setWebhookLiveMessage({
        type: 'error',
        text: err?.message || 'Network error during production ping.',
      });
    } finally {
      setIsTestingWebhookLive(false);
    }
  };

  // Production Webhook: Roll Secret
  const handleRollWebhookLiveSecret = async () => {
    try {
      const res = await fetch('/api/developer/webhooks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ regenerateSecret: true }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.success) {
        showToast('Production webhook secret rolled');
        loadWebhookConfig();
      } else {
        showToast(data?.error?.message || 'Failed to roll production secret');
      }
    } catch {
      showToast('Network error rolling production secret');
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
                  API Keys &amp; Webhook Setup
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  Manage your sandbox and live credentials, and configure dedicated webhook endpoints for each environment.
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

          {/* ========================================================================= */}
          {/* SECTION 1: SANDBOX ENVIRONMENT (TEST MODE)                                */}
          {/* ========================================================================= */}
          <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#0B1528] border border-amber-200/80 dark:border-amber-900/50 shadow-xs space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold shrink-0">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                      Sandbox Environment
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                      Test Mode
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Safe testing ground with simulated transactions. Sandbox API keys never expire or disappear.
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
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Sandbox Key</span>
                </button>
              )}
            </div>

            {/* Subsection 1A: Sandbox API Key Card */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                Sandbox API Key
              </label>

              {activeTestKey ? (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#071120] border border-slate-200 dark:border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        {activeTestKey.name}
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300">
                        ACTIVE
                      </span>
                    </div>

                    <div className="flex items-center gap-2 max-w-full overflow-hidden">
                      <span className="font-mono text-xs font-bold text-slate-900 dark:text-white break-all select-all">
                        {showTestKey
                          ? activeTestKey.keyPrefix
                          : activeTestKey.keyPrefix.startsWith('bx_test_') && !activeTestKey.keyPrefix.endsWith('...')
                          ? `${activeTestKey.keyPrefix.slice(0, 14)}••••••••••••••••••••••••••••••••`
                          : `${activeTestKey.keyPrefix}••••••••••••••••••••••••••••••••`}
                      </span>

                      {/* Eye Toggle to View / Hide Key */}
                      <button
                        type="button"
                        onClick={() => setShowTestKey(!showTestKey)}
                        className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors shrink-0"
                        title={showTestKey ? 'Hide Sandbox Key' : 'Reveal Full Sandbox Key'}
                      >
                        {showTestKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {activeTestKey.keyPrefix.endsWith('...') && (
                      <p className="text-[10px] text-amber-600 dark:text-amber-400">
                        Tip: Click <strong>Roll Key</strong> to generate a fully unmaskable sandbox secret.
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-200 dark:border-slate-800">
                    <button
                      onClick={() => copyToClipboard(activeTestKey.keyPrefix, activeTestKey.id)}
                      className="px-3 py-1.5 rounded-lg bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors"
                    >
                      {copiedKeyId === activeTestKey.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Key</span>
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

              {/* Revoked Sandbox Keys list */}
              {testKeys.filter((k) => k.status !== 'ACTIVE').length > 0 && (
                <div className="pt-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
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
                          <span className="font-mono line-through text-[11px]">
                            {k.keyPrefix.slice(0, 16)}...
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-rose-500 font-bold uppercase">Revoked</span>
                            {canManageKeys && (
                              <button
                                onClick={() => {
                                  setDeletingKey(k);
                                  setDeleteError(null);
                                }}
                                className="text-slate-400 hover:text-rose-600 p-1"
                                title="Delete revoked key record"
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

            {/* Subsection 1B: Sandbox Webhook Configuration */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-4">
              <div className="flex items-center gap-2">
                <Webhook className="w-4 h-4 text-amber-500" />
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  Sandbox Webhook Destination
                </h3>
              </div>

              {webhookTestMessage && (
                <div
                  className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                    webhookTestMessage.type === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-200'
                      : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-200'
                  }`}
                >
                  {webhookTestMessage.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  )}
                  <span className="leading-relaxed">{webhookTestMessage.text}</span>
                </div>
              )}

              <form onSubmit={handleSaveWebhookTest} className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="url"
                    placeholder="https://api.yourdomain.com/webhooks/sandbox or https://ngrok-url..."
                    value={webhookTestUrl}
                    onChange={(e) => setWebhookTestUrl(e.target.value)}
                    required
                    disabled={!canManageKeys || isSavingWebhookTest}
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#070D18] text-slate-900 dark:text-white text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  />

                  <div className="flex items-center gap-2">
                    {initialWebhookTestUrl && (
                      <button
                        type="button"
                        onClick={handleTestWebhookTestPing}
                        disabled={isTestingWebhookTest || isSavingWebhookTest}
                        className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors disabled:opacity-60"
                        title="Send test ping to Sandbox endpoint"
                      >
                        {isTestingWebhookTest ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Send className="w-3.5 h-3.5 text-amber-500" />
                        )}
                        <span>Ping Test</span>
                      </button>
                    )}

                    {canManageKeys && (
                      <button
                        type="submit"
                        disabled={isSavingWebhookTest || webhookTestUrl === initialWebhookTestUrl}
                        className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-60"
                      >
                        {isSavingWebhookTest ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Saving...</span>
                          </>
                        ) : (
                          <span>Save Sandbox Webhook</span>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-[11px] text-slate-400">
                  BAXATO dispatches real-time test event callbacks (like <code>transaction.successful</code>) to this endpoint during development.
                </p>

                {/* Sandbox Signing Secret */}
                {webhookTestSecret && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 dark:bg-[#071120] border border-slate-200 dark:border-slate-800/80 text-xs">
                    <div className="space-y-1">
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                        Sandbox Webhook HMAC Secret (Header: <code>x-baxato-signature</code>)
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-slate-900 dark:text-slate-100 font-bold select-all">
                          {showWebhookTestSecret
                            ? webhookTestSecret
                            : `${webhookTestSecret.slice(0, 10)}••••••••••••••••••••••••••••••••`}
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowWebhookTestSecret(!showWebhookTestSecret)}
                          className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                          title={showWebhookTestSecret ? 'Hide Secret' : 'Show Full Secret'}
                        >
                          {showWebhookTestSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => copyToClipboard(webhookTestSecret, 'whsec_test')}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5"
                      >
                        {copiedKeyId === 'whsec_test' ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-500" />
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy Secret</span>
                          </>
                        )}
                      </button>

                      {canManageKeys && (
                        <button
                          type="button"
                          onClick={handleRollWebhookTestSecret}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                          Roll Secret
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </form>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* SECTION 2: PRODUCTION ENVIRONMENT (LIVE MODE)                              */}
          {/* ========================================================================= */}
          <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#0B1528] border border-emerald-200/80 dark:border-emerald-900/50 shadow-xs space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold shrink-0">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                      Production Environment
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      Live Mode
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Used by your live backend server to vend airtime, electricity, data, and exam PINs with real funds.
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
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 transition-colors flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New Production Key</span>
                </button>
              )}
            </div>

            {/* KYC Guard for Live Credentials */}
            {!isVerified ? (
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#071120] border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                    <Lock className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                      Identity Verification Required for Production Credentials
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Verify your business identity (NIMC / BVN) to unlock real live vending credentials and webhooks.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsKycModalOpen(true)}
                  className="px-3.5 py-2 rounded-xl bg-[#126BEB] hover:bg-[#0B5CC7] text-white text-xs font-bold shrink-0 shadow-xs transition-colors self-start sm:self-auto"
                >
                  Verify Now
                </button>
              </div>
            ) : (
              <>
                {/* Subsection 2A: Production API Key Card */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                    Production API Key
                  </label>

                  {activeLiveKey ? (
                    <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#071120] border border-slate-200 dark:border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="space-y-1.5 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                            {activeLiveKey.name}
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300">
                            ACTIVE
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                            {activeLiveKey.keyPrefix}••••••••••••••••••••••••••••••••
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-slate-200 dark:border-slate-800">
                        <button
                          onClick={() => copyToClipboard(activeLiveKey.keyPrefix, activeLiveKey.id)}
                          className="px-3 py-1.5 rounded-lg bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors"
                        >
                          {copiedKeyId === activeLiveKey.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-500" />
                              <span>Copied Prefix</span>
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

                  {/* Revoked Production Keys list */}
                  {liveKeys.filter((k) => k.status !== 'ACTIVE').length > 0 && (
                    <div className="pt-2">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
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
                              <span className="font-mono line-through text-[11px]">
                                {k.keyPrefix.slice(0, 16)}...
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] text-rose-500 font-bold uppercase">Revoked</span>
                                {canManageKeys && (
                                  <button
                                    onClick={() => {
                                      setDeletingKey(k);
                                      setDeleteError(null);
                                    }}
                                    className="text-slate-400 hover:text-rose-600 p-1"
                                    title="Delete revoked key record"
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

                {/* Subsection 2B: Production Webhook Configuration */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-4">
                  <div className="flex items-center gap-2">
                    <Webhook className="w-4 h-4 text-emerald-500" />
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                      Production Webhook Destination
                    </h3>
                  </div>

                  {webhookLiveMessage && (
                    <div
                      className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                        webhookLiveMessage.type === 'success'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-200'
                          : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-200'
                      }`}
                    >
                      {webhookLiveMessage.type === 'success' ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      )}
                      <span className="leading-relaxed">{webhookLiveMessage.text}</span>
                    </div>
                  )}

                  <form onSubmit={handleSaveWebhookLive} className="space-y-3">
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="url"
                        placeholder="https://api.yourdomain.com/webhooks/production"
                        value={webhookLiveUrl}
                        onChange={(e) => setWebhookLiveUrl(e.target.value)}
                        required
                        disabled={!canManageKeys || isSavingWebhookLive}
                        className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#070D18] text-slate-900 dark:text-white text-xs font-mono focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                      />

                      <div className="flex items-center gap-2">
                        {initialWebhookLiveUrl && (
                          <button
                            type="button"
                            onClick={handleTestWebhookLivePing}
                            disabled={isTestingWebhookLive || isSavingWebhookLive}
                            className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors disabled:opacity-60"
                            title="Send test ping to Production endpoint"
                          >
                            {isTestingWebhookLive ? (
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Send className="w-3.5 h-3.5 text-emerald-500" />
                            )}
                            <span>Ping Test</span>
                          </button>
                        )}

                        {canManageKeys && (
                          <button
                            type="submit"
                            disabled={isSavingWebhookLive || webhookLiveUrl === initialWebhookLiveUrl}
                            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-60"
                          >
                            {isSavingWebhookLive ? (
                              <>
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                <span>Saving...</span>
                              </>
                            ) : (
                              <span>Save Production Webhook</span>
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-400">
                      Live events and transactions with real money are signed and sent to this endpoint via secure HTTPS.
                    </p>

                    {/* Production Signing Secret */}
                    {webhookLiveSecretPrefix && (
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 dark:bg-[#071120] border border-slate-200 dark:border-slate-800/80 text-xs">
                        <div className="space-y-0.5">
                          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                            Production Webhook HMAC Secret (Header: <code>x-baxato-signature</code>)
                          </span>
                          <span className="font-mono text-xs text-slate-700 dark:text-slate-300 font-bold">
                            {webhookLiveSecretPrefix}••••••••••••••••
                          </span>
                        </div>

                        {canManageKeys && (
                          <button
                            type="button"
                            onClick={handleRollWebhookLiveSecret}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors self-start sm:self-auto"
                          >
                            Roll Secret
                          </button>
                        )}
                      </div>
                    )}
                  </form>
                </div>
              </>
            )}
          </div>

          {/* ========================================================================= */}
          {/* SECTION 3: WEBHOOK EVENTS & LOGS REDIRECT BANNER                          */}
          {/* ========================================================================= */}
          <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                <Webhook className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Looking for Webhook Delivery Logs?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Inspect outbound delivery attempts, HTTP response statuses, payloads, and retry failed webhook events.
                </p>
              </div>
            </div>

            <Link
              href="/dashboard/webhooks"
              className="px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 text-xs font-bold shrink-0 flex items-center gap-1.5 transition-colors self-start sm:self-auto"
            >
              <span>View Webhook Events</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </main>
      </div>

      {/* ========================================================================= */}
      {/* MODALS                                                                    */}
      {/* ========================================================================= */}

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

      {/* MODAL 2: Secret Reveal Modal */}
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
                <span>
                  {revealedSecretData.apiKey.environment === 'LIVE'
                    ? 'Save your Production API key now'
                    : 'Sandbox Secret Key Issued'}
                </span>
              </div>
              <p className="text-[11px] leading-relaxed text-amber-700 dark:text-amber-300">
                {revealedSecretData.apiKey.environment === 'LIVE'
                  ? 'Live keys are permanently masked after closing this dialog for your account security. Store it securely in your production environment.'
                  : 'You can unmask and view your Sandbox key at any time directly on this setup page.'}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-900 dark:bg-[#060D18] border border-slate-800 space-y-2">
              <div className="p-2.5 rounded-lg bg-black/40 border border-white/10 font-mono text-xs font-bold text-[#38BDF8] break-all select-all">
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
