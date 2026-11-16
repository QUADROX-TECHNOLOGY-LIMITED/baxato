'use client';

import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Copy,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Plus,
  RefreshCw,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import Sidebar from '@/components/dashboard/Sidebar';
import Header from '@/components/dashboard/Header';
import KycBanner from '@/components/dashboard/KycBanner';
import KycModal from '@/components/dashboard/KycModal';
import AccessRestricted from '@/components/dashboard/AccessRestricted';
import ModalDialog from '@/components/ModalDialog';
import BaxatoLoader from '@/components/BaxatoLoader';
import {
  clearSessionAndRedirect,
  getStoredAuthToken,
  getStoredBusiness,
  getStoredUser,
  handleAuthResponse,
} from '@/lib/auth-session';
import { showToast } from '@/lib/toast';

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

type KeyModalState =
  | { kind: 'create'; environment: ApiKeyEnvironment }
  | { kind: 'rotate'; keyItem: ApiKeyItem }
  | {
      kind: 'reveal';
      title: string;
      environment: ApiKeyEnvironment;
      secretValue: string;
      envVarName?: string;
      downloadFilename?: string;
      oneTimeWarning: boolean;
    }
  | null;

const ALLOWED_ROLES = new Set(['BUSINESS_OWNER', 'BUSINESS_ADMIN', 'DEVELOPER']);

function formatMaskedKey(prefix: string): string {
  const clean = prefix.replace(/\.+$/, '');
  return `${clean.slice(0, 14)}••••••••`;
}

export default function DeveloperKeysPage() {
  const testWebhookInputId = useId();
  const testWebhookErrorId = useId();
  const liveWebhookInputId = useId();
  const liveWebhookErrorId = useId();
  const keyModalTitleId = useId();
  const newKeyInputId = useId();
  const revokeModalTitleId = useId();
  const deleteModalTitleId = useId();

  const tabRefs = useRef<Record<ApiKeyEnvironment, HTMLButtonElement | null>>({
    TEST: null,
    LIVE: null,
  });

  const [businessName, setBusinessName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return getStoredBusiness()?.name || '';
    }
    return '';
  });
  const [merchantName, setMerchantName] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return getStoredUser()?.firstName || '';
    }
    return '';
  });
  const [kycStatus, setKycStatus] = useState<string>('INITIALIZING');
  const [userRole, setUserRole] = useState<string>('BUSINESS_OWNER');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isKycModalOpen, setIsKycModalOpen] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Environment Tab
  const [activeEnv, setActiveEnv] = useState<ApiKeyEnvironment>('TEST');

  // API Keys State
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showTestKey, setShowTestKey] = useState(false);
  const [showRevoked, setShowRevoked] = useState(false);

  // Sandbox Webhook State
  const [webhookTestUrl, setWebhookTestUrl] = useState('');
  const [initialWebhookTestUrl, setInitialWebhookTestUrl] = useState('');
  const [webhookTestSecret, setWebhookTestSecret] = useState<string | null>(null);
  const [showWebhookTestSecret, setShowWebhookTestSecret] = useState(false);
  const [isSavingWebhookTest, setIsSavingWebhookTest] = useState(false);
  const [isTestingWebhookTest, setIsTestingWebhookTest] = useState(false);
  const [isRollingTestSecret, setIsRollingTestSecret] = useState(false);
  const [webhookTestError, setWebhookTestError] = useState<string | null>(null);

  // Production Webhook State
  const [webhookLiveUrl, setWebhookLiveUrl] = useState('');
  const [initialWebhookLiveUrl, setInitialWebhookLiveUrl] = useState('');
  const [webhookLiveSecretPrefix, setWebhookLiveSecretPrefix] = useState<string | null>(null);
  const [isSavingWebhookLive, setIsSavingWebhookLive] = useState(false);
  const [isTestingWebhookLive, setIsTestingWebhookLive] = useState(false);
  const [isRollingLiveSecret, setIsRollingLiveSecret] = useState(false);
  const [webhookLiveError, setWebhookLiveError] = useState<string | null>(null);

  // Modals State
  const [keyModal, setKeyModal] = useState<KeyModalState>(null);
  const [newKeyName, setNewKeyName] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [isSubmittingKeyAction, setIsSubmittingKeyAction] = useState(false);
  const [hasCopiedRevealed, setHasCopiedRevealed] = useState(false);

  const [revokingKey, setRevokingKey] = useState<ApiKeyItem | null>(null);
  const [isSubmittingRevoke, setIsSubmittingRevoke] = useState(false);

  const [deletingKey, setDeletingKey] = useState<ApiKeyItem | null>(null);
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);

  const isVerified = kycStatus === 'VERIFIED';
  const canManageKeys = ALLOWED_ROLES.has(userRole);

  const getAuthHeaders = useCallback((): Record<string, string> => {
    const token = getStoredAuthToken();
    const storedBiz = getStoredBusiness();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (storedBiz?.id) headers['x-business-id'] = storedBiz.id;
    return headers;
  }, []);

  const loadKeys = useCallback(async () => {
    try {
      const res = await fetch('/api/developer/keys', {
        headers: getAuthHeaders(),
        cache: 'no-store',
      });
      const data = await res.json().catch(() => null);
      if (handleAuthResponse(res, data)) return;
      if (res.ok && data?.success && Array.isArray(data.data)) {
        setKeys(data.data);
      }
    } catch {
      // Handled gracefully
    }
  }, [getAuthHeaders]);

  const loadWebhookConfig = useCallback(async () => {
    try {
      const res = await fetch('/api/developer/webhooks', {
        headers: getAuthHeaders(),
        cache: 'no-store',
      });
      const data = await res.json().catch(() => null);
      if (handleAuthResponse(res, data)) return;
      if (res.ok && data?.success && data.data) {
        const liveUrl = data.data.webhookUrl || '';
        setWebhookLiveUrl(liveUrl);
        setInitialWebhookLiveUrl(liveUrl);
        setWebhookLiveSecretPrefix(data.data.webhookSecretPrefix || null);

        const testUrl = data.data.webhookTestUrl || '';
        setWebhookTestUrl(testUrl);
        setInitialWebhookTestUrl(testUrl);
        setWebhookTestSecret(data.data.webhookTestSecret || null);
      }
    } catch {
      // Handled gracefully
    }
  }, [getAuthHeaders]);

  const syncUserProfile = useCallback(async () => {
    try {
      const currentToken = getStoredAuthToken();
      if (!currentToken) return;
      const res = await fetch('/api/users/me', {
        headers: { Authorization: `Bearer ${currentToken}` },
        cache: 'no-store',
      });
      const data = await res.json().catch(() => null);
      if (handleAuthResponse(res, data)) return;
      if (res.ok && data?.success && data.data) {
        const userData = data.data.user || data.data;
        if (userData.kycStatus) setKycStatus(userData.kycStatus);
        if (userData.firstName) setMerchantName(userData.firstName);
      }
    } catch {}
  }, []);

  useEffect(() => {
    const token = getStoredAuthToken();
    if (!token) {
      clearSessionAndRedirect('expired');
      return;
    }

    let role = 'BUSINESS_OWNER';
    try {
      const storedUser = getStoredUser();
      const storedBiz = getStoredBusiness();

      if (storedBiz?.role) {
        role = storedBiz.role;
        setUserRole(storedBiz.role);
      } else if (storedUser?.role) {
        role = storedUser.role;
        setUserRole(storedUser.role);
      }
      if (storedUser?.firstName) setMerchantName(storedUser.firstName);
      if (storedUser?.kycStatus) setKycStatus(storedUser.kycStatus);
      else setKycStatus('UNVERIFIED');
      if (storedBiz?.name) setBusinessName(storedBiz.name);
    } catch {}

    let isMounted = true;
    const initializePage = async () => {
      try {
        if (ALLOWED_ROLES.has(role)) {
          await Promise.all([loadKeys(), loadWebhookConfig(), syncUserProfile()]);
        } else {
          await syncUserProfile();
        }
      } finally {
        if (isMounted) {
          setIsInitialLoading(false);
        }
      }
    };

    void initializePage();

    const handleBizSwitched = () => {
      let switchedRole = 'BUSINESS_OWNER';
      try {
        const b = getStoredBusiness();
        if (b?.name) setBusinessName(b.name);
        if (b?.role) {
          switchedRole = b.role;
          setUserRole(b.role);
        }
      } catch {}
      if (ALLOWED_ROLES.has(switchedRole)) {
        void Promise.all([loadKeys(), loadWebhookConfig()]);
      }
    };

    window.addEventListener('bx_business_switched', handleBizSwitched);
    return () => {
      isMounted = false;
      window.removeEventListener('bx_business_switched', handleBizSwitched);
    };
  }, [loadKeys, loadWebhookConfig, syncUserProfile]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([loadKeys(), loadWebhookConfig()]);
    } finally {
      setIsRefreshing(false);
    }
  };

  const copyText = (value: string, id: string, label = 'Copied to clipboard') => {
    if (!value || typeof navigator === 'undefined' || !navigator.clipboard) return;
    void navigator.clipboard.writeText(value);
    setCopiedId(id);
    showToast({ type: 'success', message: label });
    setTimeout(() => {
      setCopiedId((prev) => (prev === id ? null : prev));
    }, 1800);
  };

  // Key groupings for current active environment tab
  const testKeys = useMemo(() => keys.filter((k) => k.environment === 'TEST'), [keys]);
  const liveKeys = useMemo(() => keys.filter((k) => k.environment === 'LIVE'), [keys]);

  const currentEnvKeys = activeEnv === 'TEST' ? testKeys : liveKeys;
  const activeKey = useMemo(
    () => currentEnvKeys.find((k) => k.status === 'ACTIVE') || null,
    [currentEnvKeys],
  );
  const revokedKeys = useMemo(
    () => currentEnvKeys.filter((k) => k.status !== 'ACTIVE'),
    [currentEnvKeys],
  );

  const canCopySandboxSecret = Boolean(
    activeKey &&
      activeKey.environment === 'TEST' &&
      !activeKey.keyPrefix.endsWith('...'),
  );

  const openCreateModal = (environment: ApiKeyEnvironment) => {
    setNewKeyName(environment === 'LIVE' ? 'Production Key' : 'Sandbox Key');
    setModalError(null);
    setHasCopiedRevealed(false);
    setKeyModal({ kind: 'create', environment });
  };

  const openRotateModal = (keyItem: ApiKeyItem) => {
    setModalError(null);
    setHasCopiedRevealed(false);
    setKeyModal({ kind: 'rotate', keyItem });
  };

  const handleTabKeyDown = (e: React.KeyboardEvent, env: ApiKeyEnvironment) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const next: ApiKeyEnvironment = env === 'TEST' ? 'LIVE' : 'TEST';
      setActiveEnv(next);
      tabRefs.current[next]?.focus();
    }
  };

  // Create API Key Submit
  const handleCreateKeySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyModal || keyModal.kind !== 'create') return;

    const trimmed = newKeyName.trim();
    if (trimmed.length < 2) {
      setModalError('Enter a key name with at least 2 characters.');
      return;
    }

    if (keyModal.environment === 'LIVE' && !isVerified) {
      setModalError('Verify your identity before creating a production key.');
      return;
    }

    setIsSubmittingKeyAction(true);
    setModalError(null);

    try {
      const res = await fetch('/api/developer/keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          name: trimmed,
          environment: keyModal.environment,
        }),
      });

      const data = await res.json().catch(() => null);
      if (handleAuthResponse(res, data)) return;

      if (res.ok && data?.success && data.data?.secretKey) {
        const payload = data.data as GeneratedKeyPayload;
        const env = payload.apiKey.environment;
        setNewKeyName('');
        setHasCopiedRevealed(false);
        setKeyModal({
          kind: 'reveal',
          title: `${payload.apiKey.name} Created`,
          environment: env,
          secretValue: payload.secretKey,
          envVarName: env === 'LIVE' ? 'BAXATO_LIVE_SECRET_KEY' : 'BAXATO_TEST_SECRET_KEY',
          downloadFilename: env === 'LIVE' ? 'baxato_live.env' : 'baxato_test.env',
          oneTimeWarning: env === 'LIVE',
        });
        void loadKeys();
      } else {
        setModalError(data?.error?.message || 'Unable to create API key.');
      }
    } catch {
      setModalError('Network error while creating API key.');
    } finally {
      setIsSubmittingKeyAction(false);
    }
  };

  // Rotate API Key Submit
  const handleRotateKeySubmit = async () => {
    if (!keyModal || keyModal.kind !== 'rotate') return;
    setIsSubmittingKeyAction(true);
    setModalError(null);

    try {
      const res = await fetch(`/api/developer/keys/${keyModal.keyItem.id}/rotate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
      });

      const data = await res.json().catch(() => null);
      if (handleAuthResponse(res, data)) return;

      if (res.ok && data?.success && data.data?.secretKey) {
        const payload = data.data as GeneratedKeyPayload;
        const env = payload.apiKey.environment;
        setHasCopiedRevealed(false);
        setKeyModal({
          kind: 'reveal',
          title: `${payload.apiKey.name} Rolled`,
          environment: env,
          secretValue: payload.secretKey,
          envVarName: env === 'LIVE' ? 'BAXATO_LIVE_SECRET_KEY' : 'BAXATO_TEST_SECRET_KEY',
          downloadFilename: env === 'LIVE' ? 'baxato_live.env' : 'baxato_test.env',
          oneTimeWarning: env === 'LIVE',
        });
        void loadKeys();
      } else {
        setModalError(data?.error?.message || 'Unable to roll API key.');
      }
    } catch {
      setModalError('Network error while rolling API key.');
    } finally {
      setIsSubmittingKeyAction(false);
    }
  };

  // Revoke API Key
  const handleRevokeKeySubmit = async () => {
    if (!revokingKey) return;
    setIsSubmittingRevoke(true);
    try {
      const res = await fetch(`/api/developer/keys/${revokingKey.id}/revoke`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
      });
      const data = await res.json().catch(() => null);
      if (handleAuthResponse(res, data)) return;
      if (res.ok && data?.success) {
        setRevokingKey(null);
        showToast({ type: 'success', message: 'API key revoked' });
        void loadKeys();
      } else {
        showToast({ type: 'error', message: data?.error?.message || 'Unable to revoke key.' });
      }
    } catch {
      showToast({ type: 'error', message: 'Network error revoking API key.' });
    } finally {
      setIsSubmittingRevoke(false);
    }
  };

  // Delete Revoked Key Record
  const handleDeleteKeySubmit = async () => {
    if (!deletingKey) return;
    setIsSubmittingDelete(true);
    try {
      const res = await fetch(`/api/developer/keys/${deletingKey.id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await res.json().catch(() => null);
      if (handleAuthResponse(res, data)) return;
      if (res.ok && data?.success) {
        setDeletingKey(null);
        showToast({ type: 'success', message: 'Key record deleted' });
        void loadKeys();
      } else {
        showToast({ type: 'error', message: data?.error?.message || 'Unable to delete key.' });
      }
    } catch {
      showToast({ type: 'error', message: 'Network error deleting key record.' });
    } finally {
      setIsSubmittingDelete(false);
    }
  };

  // Sandbox Webhook: Save
  const handleSaveWebhookTest = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = webhookTestUrl.trim();
    if (!trimmed) {
      setWebhookTestError('Enter a sandbox webhook URL.');
      return;
    }

    if (
      !trimmed.startsWith('https://') &&
      !trimmed.startsWith('http://localhost') &&
      !trimmed.startsWith('http://127.0.0.1')
    ) {
      setWebhookTestError('Use https:// or a localhost URL for sandbox webhooks.');
      return;
    }

    setIsSavingWebhookTest(true);
    setWebhookTestError(null);

    try {
      const res = await fetch('/api/developer/webhooks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ webhookTestUrl: trimmed }),
      });

      const data = await res.json().catch(() => null);
      if (handleAuthResponse(res, data)) return;

      if (res.ok && data?.success) {
        setInitialWebhookTestUrl(trimmed);
        showToast({ type: 'success', message: 'Sandbox webhook saved' });
        void loadWebhookConfig();
      } else {
        const msg = data?.error?.message || 'Unable to save sandbox webhook.';
        setWebhookTestError(msg);
        showToast({ type: 'error', message: msg });
      }
    } catch {
      const msg = 'Network error saving sandbox webhook.';
      setWebhookTestError(msg);
      showToast({ type: 'error', message: msg });
    } finally {
      setIsSavingWebhookTest(false);
    }
  };

  // Sandbox Webhook: Ping
  const handleTestWebhookTestPing = async () => {
    setIsTestingWebhookTest(true);
    setWebhookTestError(null);
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
      if (handleAuthResponse(res, data)) return;
      if (res.ok && data?.success && data.data?.success) {
        showToast({
          type: 'success',
          message: `Ping succeeded (${data.data.statusCode || 200} in ${data.data.latencyMs}ms)`,
        });
      } else {
        const msg = data?.data?.error || data?.error?.message || 'Webhook ping failed.';
        setWebhookTestError(msg);
        showToast({ type: 'error', message: msg });
      }
    } catch {
      const msg = 'Network error sending webhook ping.';
      setWebhookTestError(msg);
      showToast({ type: 'error', message: msg });
    } finally {
      setIsTestingWebhookTest(false);
    }
  };

  // Sandbox Webhook: Roll Secret
  const handleRollWebhookTestSecret = async () => {
    setIsRollingTestSecret(true);
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
      if (handleAuthResponse(res, data)) return;
      if (res.ok && data?.success) {
        showToast({ type: 'success', message: 'Sandbox webhook secret updated' });
        void loadWebhookConfig();
      } else {
        showToast({ type: 'error', message: data?.error?.message || 'Unable to roll secret.' });
      }
    } catch {
      showToast({ type: 'error', message: 'Network error rolling secret.' });
    } finally {
      setIsRollingTestSecret(false);
    }
  };

  // Production Webhook: Save
  const handleSaveWebhookLive = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = webhookLiveUrl.trim();
    if (!trimmed) {
      setWebhookLiveError('Enter a production webhook URL.');
      return;
    }

    if (!trimmed.startsWith('https://')) {
      setWebhookLiveError('Production webhook URL must start with https://.');
      return;
    }

    setIsSavingWebhookLive(true);
    setWebhookLiveError(null);

    try {
      const res = await fetch('/api/developer/webhooks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ webhookUrl: trimmed }),
      });

      const data = await res.json().catch(() => null);
      if (handleAuthResponse(res, data)) return;

      if (res.ok && data?.success) {
        setInitialWebhookLiveUrl(trimmed);
        showToast({ type: 'success', message: 'Production webhook saved' });
        if (data.data?.newSecret) {
          setHasCopiedRevealed(false);
          setKeyModal({
            kind: 'reveal',
            title: 'Webhook Secret Issued',
            environment: 'LIVE',
            secretValue: data.data.newSecret,
            oneTimeWarning: true,
          });
        }
        void loadWebhookConfig();
      } else {
        const msg = data?.error?.message || 'Unable to save production webhook.';
        setWebhookLiveError(msg);
        showToast({ type: 'error', message: msg });
      }
    } catch {
      const msg = 'Network error saving production webhook.';
      setWebhookLiveError(msg);
      showToast({ type: 'error', message: msg });
    } finally {
      setIsSavingWebhookLive(false);
    }
  };

  // Production Webhook: Ping
  const handleTestWebhookLivePing = async () => {
    setIsTestingWebhookLive(true);
    setWebhookLiveError(null);
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
      if (handleAuthResponse(res, data)) return;
      if (res.ok && data?.success && data.data?.success) {
        showToast({
          type: 'success',
          message: `Ping succeeded (${data.data.statusCode || 200} in ${data.data.latencyMs}ms)`,
        });
      } else {
        const msg = data?.data?.error || data?.error?.message || 'Webhook ping failed.';
        setWebhookLiveError(msg);
        showToast({ type: 'error', message: msg });
      }
    } catch {
      const msg = 'Network error sending webhook ping.';
      setWebhookLiveError(msg);
      showToast({ type: 'error', message: msg });
    } finally {
      setIsTestingWebhookLive(false);
    }
  };

  // Production Webhook: Roll Secret
  const handleRollWebhookLiveSecret = async () => {
    setIsRollingLiveSecret(true);
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
      if (handleAuthResponse(res, data)) return;
      if (res.ok && data?.success) {
        if (data.data?.newSecret) {
          setHasCopiedRevealed(false);
          setKeyModal({
            kind: 'reveal',
            title: 'Production Webhook Secret Rolled',
            environment: 'LIVE',
            secretValue: data.data.newSecret,
            oneTimeWarning: true,
          });
        } else {
          showToast({ type: 'success', message: 'Production webhook secret updated' });
        }
        void loadWebhookConfig();
      } else {
        showToast({ type: 'error', message: data?.error?.message || 'Unable to roll secret.' });
      }
    } catch {
      showToast({ type: 'error', message: 'Network error rolling secret.' });
    } finally {
      setIsRollingLiveSecret(false);
    }
  };

  const handleDownloadEnv = () => {
    if (!keyModal || keyModal.kind !== 'reveal' || !keyModal.envVarName) return;
    const content = `# BAXATO API Key (${keyModal.environment})\n${keyModal.envVarName}=${keyModal.secretValue}\n`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = keyModal.downloadFilename || 'baxato.env';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast({ type: 'success', message: '.env file downloaded' });
  };

  if (isInitialLoading) {
    return <BaxatoLoader variant="fullscreen" />;
  }

  return (
    <div className="min-h-screen bg-[#FFFFFF] dark:bg-[#070D18] text-slate-800 dark:text-slate-100 flex flex-col lg:flex-row transition-colors duration-150">
      <Sidebar
        businessName={businessName}
        merchantName={merchantName}
        kycStatus={kycStatus}
        userRole={userRole}
        onOpenKycModal={() => setIsKycModalOpen(true)}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 lg:pl-72">
        <Header
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onOpenKycModal={() => setIsKycModalOpen(true)}
          merchantName={merchantName}
          businessName={businessName}
          kycStatus={kycStatus}
          userRole={userRole}
          isRefreshing={isRefreshing}
          onRefresh={handleRefresh}
          sticky={false}
        />

        <main className="flex-1 px-4 py-5 sm:p-6 lg:p-8 max-w-5xl mx-auto w-full space-y-6">
          {!canManageKeys ? (
            <AccessRestricted description="API keys and webhook configuration are restricted to Workspace Owners, Administrators, and Developers." />
          ) : (
            <>
              <KycBanner
                kycStatus={kycStatus}
                userRole={userRole}
                onOpenKycModal={() => setIsKycModalOpen(true)}
              />

              {/* Top Navigation */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
                  <span>Back to Dashboard</span>
                </Link>

                <div className="flex items-center gap-2">
                  <Link
                    href="/dashboard/webhooks"
                    className="inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
                  >
                    <span>Webhook Logs</span>
                    <ExternalLink className="w-3.5 h-3.5 text-[#126BEB] dark:text-[#38BDF8]" aria-hidden="true" />
                  </Link>

                  <button
                    type="button"
                    onClick={handleRefresh}
                    disabled={isRefreshing}
                    aria-label="Refresh API keys and webhooks"
                    className="inline-flex items-center gap-1.5 min-h-[36px] px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1528] text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#126BEB]' : 'text-slate-400'}`}
                      aria-hidden="true"
                    />
                    <span className="hidden sm:inline">Refresh</span>
                  </button>
                </div>
              </div>

              {/* Page Heading */}
              <div className="pb-5 border-b border-slate-200/80 dark:border-slate-800/80">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                  API Keys &amp; Webhooks
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                  Manage credentials and webhook endpoints for your integration.
                </p>
              </div>

              {/* Environment Tabs */}
              <div
                role="tablist"
                aria-label="API environment"
                className="flex border-b border-slate-200 dark:border-slate-800 gap-2"
              >
                {([
                  { id: 'TEST' as const, label: 'Sandbox' },
                  { id: 'LIVE' as const, label: 'Production' },
                ]).map((tab) => {
                  const isSelected = activeEnv === tab.id;
                  return (
                    <button
                      key={tab.id}
                      ref={(el) => {
                        tabRefs.current[tab.id] = el;
                      }}
                      id={`env-tab-${tab.id}`}
                      type="button"
                      role="tab"
                      aria-selected={isSelected}
                      tabIndex={isSelected ? 0 : -1}
                      onClick={() => {
                        setActiveEnv(tab.id);
                        setShowRevoked(false);
                      }}
                      onKeyDown={(e) => handleTabKeyDown(e, tab.id)}
                      className={`relative min-h-[44px] px-4 py-2 text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#126BEB] ${
                        isSelected
                          ? 'text-[#126BEB] dark:text-[#38BDF8] after:content-[""] after:absolute after:inset-x-0 after:bottom-0 after:border-b-2 after:border-[#126BEB] dark:after:border-[#38BDF8]'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>

              {/* Active Tab Panel */}
              <div
                role="tabpanel"
                aria-labelledby={`env-tab-${activeEnv}`}
                className="space-y-6"
              >
                {activeEnv === 'LIVE' && !isVerified ? (
                  <div className="p-6 rounded-2xl bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <Lock className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" aria-hidden="true" />
                      <div>
                        <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                          Identity verification required
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Verify your business identity to create production API keys and live webhooks.
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsKycModalOpen(true)}
                      className="h-11 px-5 rounded-lg bg-[#126BEB] hover:bg-[#0B5CC7] text-white text-xs sm:text-sm font-semibold shrink-0 transition-colors cursor-pointer self-start sm:self-auto"
                    >
                      Verify Identity
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Section 1: API Key */}
                    <section className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800 space-y-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h2 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white">
                            {activeEnv === 'TEST' ? 'Sandbox Key' : 'Production Key'}
                          </h2>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {activeEnv === 'TEST'
                              ? 'Authenticate requests in the sandbox environment.'
                              : 'Authenticate requests in the production environment.'}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => openCreateModal(activeEnv)}
                          className="h-9 px-3 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>New Key</span>
                        </button>
                      </div>

                      {activeKey ? (
                        <div className="p-4 rounded-xl bg-slate-50/70 dark:bg-[#070D18] border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="min-w-0 flex-1 space-y-1.5">
                            <div className="flex items-center gap-2 text-xs">
                              <span className="font-semibold text-slate-900 dark:text-white">
                                {activeKey.name}
                              </span>
                              <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                                Active
                              </span>
                            </div>

                            <div className="flex items-center gap-2 min-w-0">
                              <code className="font-mono text-xs sm:text-sm text-slate-700 dark:text-slate-200 break-all select-all min-w-0">
                                {activeKey.environment === 'TEST' && canCopySandboxSecret && showTestKey
                                  ? activeKey.keyPrefix
                                  : formatMaskedKey(activeKey.keyPrefix)}
                              </code>

                              {canCopySandboxSecret && (
                                <button
                                  type="button"
                                  onClick={() => setShowTestKey((prev) => !prev)}
                                  aria-label={showTestKey ? 'Hide sandbox key' : 'Show sandbox key'}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors shrink-0 cursor-pointer"
                                >
                                  {showTestKey ? (
                                    <EyeOff className="w-4 h-4" aria-hidden="true" />
                                  ) : (
                                    <Eye className="w-4 h-4" aria-hidden="true" />
                                  )}
                                </button>
                              )}
                            </div>

                            {activeKey.environment === 'TEST' && activeKey.keyPrefix.endsWith('...') && (
                              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                Roll this key to inspect or copy the full sandbox secret.
                              </p>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200 dark:border-slate-800">
                            {canCopySandboxSecret && (
                              <button
                                type="button"
                                onClick={() => copyText(activeKey.keyPrefix, activeKey.id, 'API key copied')}
                                className="h-9 px-3 rounded-lg bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                              >
                                {copiedId === activeKey.id ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-500" aria-hidden="true" />
                                    <span>Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                                    <span>Copy Key</span>
                                  </>
                                )}
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => openRotateModal(activeKey)}
                              className="h-9 px-3 rounded-lg bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <RefreshCw className="w-3.5 h-3.5 text-[#126BEB] dark:text-[#38BDF8]" aria-hidden="true" />
                              <span>Roll Key</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setRevokingKey(activeKey)}
                              aria-label="Revoke API key"
                              className="h-9 px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-rose-600 hover:border-rose-300 dark:hover:border-rose-900/60 hover:bg-rose-50/70 dark:hover:bg-rose-950/30 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                              <span>Revoke</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-6 rounded-xl bg-slate-50/70 dark:bg-[#070D18] border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            No active {activeEnv === 'TEST' ? 'sandbox' : 'production'} key yet.
                          </p>
                          <button
                            type="button"
                            onClick={() => openCreateModal(activeEnv)}
                            className="h-11 px-4 rounded-lg bg-[#126BEB] hover:bg-[#0B5CC7] text-white text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0 self-start sm:self-auto"
                          >
                            <Plus className="w-4 h-4" aria-hidden="true" />
                            <span>Create Key</span>
                          </button>
                        </div>
                      )}

                      {revokedKeys.length > 0 && (
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={() => setShowRevoked((prev) => !prev)}
                            className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer"
                          >
                            {showRevoked ? 'Hide revoked keys' : `Revoked keys (${revokedKeys.length})`}
                          </button>

                          {showRevoked && (
                            <div className="mt-2.5 divide-y divide-slate-100 dark:divide-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                              {revokedKeys.map((k) => (
                                <div
                                  key={k.id}
                                  className="px-3.5 py-2.5 bg-slate-50/60 dark:bg-[#070D18] text-xs flex items-center justify-between gap-3"
                                >
                                  <div className="min-w-0 flex items-center gap-2.5">
                                    <span className="font-medium text-slate-700 dark:text-slate-300 truncate">
                                      {k.name}
                                    </span>
                                    <code className="font-mono text-[11px] text-slate-400 line-through truncate">
                                      {formatMaskedKey(k.keyPrefix)}
                                    </code>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setDeletingKey(k)}
                                    aria-label={`Delete revoked key ${k.name}`}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer shrink-0"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </section>

                    {/* Section 2: Webhook Configuration */}
                    {activeEnv === 'TEST' ? (
                      <section className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800 space-y-4">
                        <div>
                          <h2 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white">
                            Sandbox Webhook
                          </h2>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Receive event callbacks signed with <code className="font-mono">x-baxato-signature</code>.
                          </p>
                        </div>

                        <form onSubmit={handleSaveWebhookTest} noValidate className="space-y-3">
                          <div className="space-y-1.5">
                            <label
                              htmlFor={testWebhookInputId}
                              className="text-xs font-semibold text-slate-700 dark:text-slate-300 block"
                            >
                              Endpoint URL
                            </label>
                            <div className="flex flex-col sm:flex-row gap-2.5">
                              <input
                                id={testWebhookInputId}
                                name="webhookTestUrl"
                                type="url"
                                autoCorrect="off"
                                autoCapitalize="none"
                                spellCheck={false}
                                placeholder="https://example.com/webhooks/baxato"
                                value={webhookTestUrl}
                                onChange={(e) => {
                                  setWebhookTestUrl(e.target.value);
                                  if (webhookTestError) setWebhookTestError(null);
                                }}
                                aria-invalid={webhookTestError ? 'true' : 'false'}
                                aria-describedby={webhookTestError ? testWebhookErrorId : undefined}
                                disabled={isSavingWebhookTest}
                                className={`flex-1 h-11 px-3.5 rounded-lg bg-white dark:bg-[#070D18] border text-slate-900 dark:text-white text-xs sm:text-sm font-mono placeholder:text-slate-400 placeholder:font-sans focus:outline-none focus:ring-2 transition-colors ${
                                  webhookTestError
                                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                                    : 'border-slate-200 dark:border-slate-700 focus:border-[#126BEB] focus:ring-[#126BEB]/20'
                                }`}
                              />

                              <div className="flex items-center gap-2 shrink-0">
                                {initialWebhookTestUrl && (
                                  <button
                                    type="button"
                                    onClick={handleTestWebhookTestPing}
                                    disabled={isTestingWebhookTest || isSavingWebhookTest}
                                    className="h-11 px-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                                  >
                                    {isTestingWebhookTest ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                                    ) : (
                                      <Send className="w-3.5 h-3.5 text-[#126BEB] dark:text-[#38BDF8]" aria-hidden="true" />
                                    )}
                                    <span>Ping</span>
                                  </button>
                                )}

                                <button
                                  type="submit"
                                  disabled={isSavingWebhookTest || webhookTestUrl.trim() === initialWebhookTestUrl}
                                  className="h-11 px-5 rounded-lg bg-[#126BEB] hover:bg-[#0B5CC7] text-white text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {isSavingWebhookTest && (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                                  )}
                                  <span>Save</span>
                                </button>
                              </div>
                            </div>
                          </div>

                          {webhookTestError && (
                            <p
                              id={testWebhookErrorId}
                              className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1.5"
                            >
                              <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                              <span>{webhookTestError}</span>
                            </p>
                          )}

                          {webhookTestSecret && (
                            <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-[#070D18] border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="min-w-0 space-y-1">
                                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
                                  Signing Secret
                                </span>
                                <div className="flex items-center gap-2 min-w-0">
                                  <code className="font-mono text-xs text-slate-800 dark:text-slate-200 break-all select-all min-w-0">
                                    {showWebhookTestSecret
                                      ? webhookTestSecret
                                      : `${webhookTestSecret.slice(0, 10)}••••••••`}
                                  </code>
                                  <button
                                    type="button"
                                    onClick={() => setShowWebhookTestSecret((prev) => !prev)}
                                    aria-label={showWebhookTestSecret ? 'Hide webhook secret' : 'Show webhook secret'}
                                    className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 shrink-0 cursor-pointer"
                                  >
                                    {showWebhookTestSecret ? (
                                      <EyeOff className="w-3.5 h-3.5" aria-hidden="true" />
                                    ) : (
                                      <Eye className="w-3.5 h-3.5" aria-hidden="true" />
                                    )}
                                  </button>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => copyText(webhookTestSecret, 'whsec_test', 'Webhook secret copied')}
                                  className="h-9 px-3 rounded-lg bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                                >
                                  {copiedId === 'whsec_test' ? (
                                    <>
                                      <Check className="w-3.5 h-3.5 text-emerald-500" aria-hidden="true" />
                                      <span>Copied</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                                      <span>Copy Secret</span>
                                    </>
                                  )}
                                </button>

                                <button
                                  type="button"
                                  onClick={handleRollWebhookTestSecret}
                                  disabled={isRollingTestSecret}
                                  className="h-9 px-3 rounded-lg bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                                >
                                  {isRollingTestSecret && (
                                    <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
                                  )}
                                  <span>Roll Secret</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </form>
                      </section>
                    ) : (
                      <section className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800 space-y-4">
                        <div>
                          <h2 className="text-sm sm:text-base font-semibold text-slate-900 dark:text-white">
                            Production Webhook
                          </h2>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            Receive live event callbacks signed with <code className="font-mono">x-baxato-signature</code> over HTTPS.
                          </p>
                        </div>

                        <form onSubmit={handleSaveWebhookLive} noValidate className="space-y-3">
                          <div className="space-y-1.5">
                            <label
                              htmlFor={liveWebhookInputId}
                              className="text-xs font-semibold text-slate-700 dark:text-slate-300 block"
                            >
                              Endpoint URL
                            </label>
                            <div className="flex flex-col sm:flex-row gap-2.5">
                              <input
                                id={liveWebhookInputId}
                                name="webhookUrl"
                                type="url"
                                autoCorrect="off"
                                autoCapitalize="none"
                                spellCheck={false}
                                placeholder="https://api.yourdomain.com/webhooks/baxato"
                                value={webhookLiveUrl}
                                onChange={(e) => {
                                  setWebhookLiveUrl(e.target.value);
                                  if (webhookLiveError) setWebhookLiveError(null);
                                }}
                                aria-invalid={webhookLiveError ? 'true' : 'false'}
                                aria-describedby={webhookLiveError ? liveWebhookErrorId : undefined}
                                disabled={isSavingWebhookLive}
                                className={`flex-1 h-11 px-3.5 rounded-lg bg-white dark:bg-[#070D18] border text-slate-900 dark:text-white text-xs sm:text-sm font-mono placeholder:text-slate-400 placeholder:font-sans focus:outline-none focus:ring-2 transition-colors ${
                                  webhookLiveError
                                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20'
                                    : 'border-slate-200 dark:border-slate-700 focus:border-[#126BEB] focus:ring-[#126BEB]/20'
                                }`}
                              />

                              <div className="flex items-center gap-2 shrink-0">
                                {initialWebhookLiveUrl && (
                                  <button
                                    type="button"
                                    onClick={handleTestWebhookLivePing}
                                    disabled={isTestingWebhookLive || isSavingWebhookLive}
                                    className="h-11 px-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-200 inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                                  >
                                    {isTestingWebhookLive ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                                    ) : (
                                      <Send className="w-3.5 h-3.5 text-[#126BEB] dark:text-[#38BDF8]" aria-hidden="true" />
                                    )}
                                    <span>Ping</span>
                                  </button>
                                )}

                                <button
                                  type="submit"
                                  disabled={isSavingWebhookLive || webhookLiveUrl.trim() === initialWebhookLiveUrl}
                                  className="h-11 px-5 rounded-lg bg-[#126BEB] hover:bg-[#0B5CC7] text-white text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {isSavingWebhookLive && (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                                  )}
                                  <span>Save</span>
                                </button>
                              </div>
                            </div>
                          </div>

                          {webhookLiveError && (
                            <p
                              id={liveWebhookErrorId}
                              className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1.5"
                            >
                              <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                              <span>{webhookLiveError}</span>
                            </p>
                          )}

                          {webhookLiveSecretPrefix && (
                            <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-[#070D18] border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="min-w-0 space-y-1">
                                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block">
                                  Signing Secret
                                </span>
                                <code className="font-mono text-xs text-slate-700 dark:text-slate-300 break-all block">
                                  {formatMaskedKey(webhookLiveSecretPrefix)}
                                </code>
                              </div>

                              <button
                                type="button"
                                onClick={handleRollWebhookLiveSecret}
                                disabled={isRollingLiveSecret}
                                className="h-9 px-3 rounded-lg bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 transition-colors cursor-pointer shrink-0 self-start sm:self-auto disabled:opacity-50"
                              >
                                {isRollingLiveSecret && (
                                  <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
                                )}
                                <span>Roll Secret</span>
                              </button>
                            </div>
                          )}
                        </form>
                      </section>
                    )}
                  </>
                )}
              </div>
            </>
          )}
        </main>
      </div>

      {/* Unified Create / Roll / Secret Reveal Dialog (single native top-layer dialog prevents transition overlap) */}
      <ModalDialog
        isOpen={Boolean(keyModal)}
        onClose={() => {
          if (!isSubmittingKeyAction) {
            setKeyModal(null);
            setModalError(null);
            setHasCopiedRevealed(false);
          }
        }}
        dismissible={!isSubmittingKeyAction}
        ariaLabelledBy={keyModalTitleId}
        maxWidthClass={keyModal?.kind === 'reveal' ? 'max-w-md' : 'max-w-sm'}
        className="dark:bg-[#0B1528] text-slate-900 dark:text-white"
      >
        {keyModal?.kind === 'create' && (
          <div className="p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <h2 id={keyModalTitleId} className="text-sm font-semibold text-slate-900 dark:text-white">
                {keyModal.environment === 'LIVE' ? 'New Production Key' : 'New Sandbox Key'}
              </h2>
              <button
                type="button"
                onClick={() => setKeyModal(null)}
                disabled={isSubmittingKeyAction}
                aria-label="Close"
                className="relative p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 after:content-[''] after:absolute after:-inset-2 cursor-pointer"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={handleCreateKeySubmit} noValidate className="space-y-4">
              {modalError && (
                <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span>{modalError}</span>
                </p>
              )}

              <div className="space-y-1.5">
                <label
                  htmlFor={newKeyInputId}
                  className="text-xs font-semibold text-slate-700 dark:text-slate-300 block"
                >
                  Key Name
                </label>
                <input
                  id={newKeyInputId}
                  name="keyName"
                  type="text"
                  autoFocus
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="e.g. Backend Server"
                  value={newKeyName}
                  onChange={(e) => {
                    setNewKeyName(e.target.value);
                    if (modalError) setModalError(null);
                  }}
                  required
                  className="w-full h-11 px-3.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-[#070D18] text-slate-900 dark:text-white text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#126BEB]/20 focus:border-[#126BEB] transition-colors"
                />
              </div>

              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setKeyModal(null)}
                  disabled={isSubmittingKeyAction}
                  className="flex-1 h-11 rounded-lg border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingKeyAction}
                  className="flex-1 h-11 rounded-lg bg-[#126BEB] hover:bg-[#0B5CC7] text-white text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingKeyAction && (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                  )}
                  <span>Create Key</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {keyModal?.kind === 'rotate' && (
          <div className="p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <h2 id={keyModalTitleId} className="text-sm font-semibold text-slate-900 dark:text-white">
                Roll API Key
              </h2>
              <button
                type="button"
                onClick={() => setKeyModal(null)}
                disabled={isSubmittingKeyAction}
                aria-label="Close"
                className="relative p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 after:content-[''] after:absolute after:-inset-2 cursor-pointer"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            {modalError && (
              <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>{modalError}</span>
              </p>
            )}

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Rolling <span className="font-semibold text-slate-900 dark:text-white">{keyModal.keyItem.name}</span> revokes the existing key immediately and issues a new secret.
            </p>

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setKeyModal(null)}
                disabled={isSubmittingKeyAction}
                className="flex-1 h-11 rounded-lg border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRotateKeySubmit}
                disabled={isSubmittingKeyAction}
                className="flex-1 h-11 rounded-lg bg-[#126BEB] hover:bg-[#0B5CC7] text-white text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSubmittingKeyAction && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                )}
                <span>Confirm</span>
              </button>
            </div>
          </div>
        )}

        {keyModal?.kind === 'reveal' && (
          <div className="p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <h2 id={keyModalTitleId} className="text-sm font-semibold text-slate-900 dark:text-white">
                {keyModal.title}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setKeyModal(null);
                  setHasCopiedRevealed(false);
                }}
                aria-label="Close"
                className="relative p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 after:content-[''] after:absolute after:-inset-2 cursor-pointer"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {keyModal.oneTimeWarning
                ? 'Copy this key now. For security, it will not be shown again.'
                : 'Your sandbox secret key is ready. You can also view it anytime on this page.'}
            </p>

            <div className="p-3.5 rounded-xl bg-slate-900 dark:bg-[#060D18] border border-slate-800 space-y-3 min-w-0">
              <div className="p-2.5 rounded-lg bg-black/40 border border-white/10 min-w-0">
                <code className="block w-full font-mono text-xs font-semibold text-[#38BDF8] break-all select-all leading-relaxed">
                  {keyModal.secretValue}
                </code>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                {keyModal.envVarName ? (
                  <button
                    type="button"
                    onClick={handleDownloadEnv}
                    className="h-9 px-3 rounded-lg border border-slate-700 text-xs font-semibold text-slate-200 hover:bg-slate-800 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Download .env</span>
                  </button>
                ) : (
                  <span />
                )}

                <button
                  type="button"
                  onClick={() => {
                    if (typeof navigator !== 'undefined' && navigator.clipboard) {
                      void navigator.clipboard.writeText(keyModal.secretValue);
                    }
                    setHasCopiedRevealed(true);
                    showToast({ type: 'success', message: 'Secret copied' });
                  }}
                  className={`h-9 px-3.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer ${
                    hasCopiedRevealed
                      ? 'bg-emerald-600 text-white'
                      : 'bg-[#126BEB] hover:bg-[#0B5CC7] text-white'
                  }`}
                >
                  {hasCopiedRevealed ? (
                    <>
                      <Check className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setKeyModal(null);
                setHasCopiedRevealed(false);
              }}
              className="w-full h-11 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs sm:text-sm font-semibold hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        )}
      </ModalDialog>

      {/* Revoke API Key Modal */}
      <ModalDialog
        isOpen={Boolean(revokingKey)}
        onClose={() => {
          if (!isSubmittingRevoke) setRevokingKey(null);
        }}
        dismissible={!isSubmittingRevoke}
        ariaLabelledBy={revokeModalTitleId}
        maxWidthClass="max-w-sm"
        className="dark:bg-[#0B1528] text-slate-900 dark:text-white"
      >
        {revokingKey && (
          <div className="p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <h2 id={revokeModalTitleId} className="text-sm font-semibold text-slate-900 dark:text-white">
                Revoke API Key
              </h2>
              <button
                type="button"
                onClick={() => setRevokingKey(null)}
                disabled={isSubmittingRevoke}
                aria-label="Close"
                className="relative p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 after:content-[''] after:absolute after:-inset-2 cursor-pointer"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Revoke <span className="font-semibold text-slate-900 dark:text-white">{revokingKey.name}</span>? Requests using this key will fail immediately.
            </p>

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setRevokingKey(null)}
                disabled={isSubmittingRevoke}
                className="flex-1 h-11 rounded-lg border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRevokeKeySubmit}
                disabled={isSubmittingRevoke}
                className="flex-1 h-11 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSubmittingRevoke && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                )}
                <span>Revoke</span>
              </button>
            </div>
          </div>
        )}
      </ModalDialog>

      {/* Delete Key Record Modal */}
      <ModalDialog
        isOpen={Boolean(deletingKey)}
        onClose={() => {
          if (!isSubmittingDelete) setDeletingKey(null);
        }}
        dismissible={!isSubmittingDelete}
        ariaLabelledBy={deleteModalTitleId}
        maxWidthClass="max-w-sm"
        className="dark:bg-[#0B1528] text-slate-900 dark:text-white"
      >
        {deletingKey && (
          <div className="p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <h2 id={deleteModalTitleId} className="text-sm font-semibold text-slate-900 dark:text-white">
                Delete Key Record
              </h2>
              <button
                type="button"
                onClick={() => setDeletingKey(null)}
                disabled={isSubmittingDelete}
                aria-label="Close"
                className="relative p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 after:content-[''] after:absolute after:-inset-2 cursor-pointer"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              Delete <span className="font-semibold text-slate-900 dark:text-white">{deletingKey.name}</span> from your revoked keys list?
            </p>

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setDeletingKey(null)}
                disabled={isSubmittingDelete}
                className="flex-1 h-11 rounded-lg border border-slate-200 dark:border-slate-700 text-xs sm:text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteKeySubmit}
                disabled={isSubmittingDelete}
                className="flex-1 h-11 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-semibold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSubmittingDelete && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                )}
                <span>Delete</span>
              </button>
            </div>
          </div>
        )}
      </ModalDialog>

      <KycModal
        isOpen={isKycModalOpen}
        onClose={() => setIsKycModalOpen(false)}
        onSuccess={() => setKycStatus('VERIFIED')}
      />
    </div>
  );
}
