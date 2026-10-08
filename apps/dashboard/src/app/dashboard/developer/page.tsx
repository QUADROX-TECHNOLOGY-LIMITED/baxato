'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Key,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Copy,
  Check,
  RefreshCw,
  Plus,
  Trash2,
  AlertTriangle,
  ExternalLink,
  Code2,
  Terminal,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  EyeOff,
  X,
  Download,
  BookOpen,
  Webhook,
  ArrowRight,
  Info,
  Cpu,
  Layers,
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
  expiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GeneratedKeyPayload {
  apiKey: ApiKeyItem;
  secretKey: string;
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

  // Developer Keys State
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [isLoadingKeys, setIsLoadingKeys] = useState(true);
  const [activeTabEnv, setActiveTabEnv] = useState<ApiKeyEnvironment>('TEST');
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

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

  // Code generator language tab
  const [codeLang, setCodeLang] = useState<'curl' | 'node' | 'python' | 'php'>('curl');

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
  }, []);

  const loadKeys = async () => {
    setIsLoadingKeys(true);
    try {
      const authToken = getStoredAuthToken();
      if (!authToken) return;

      const res = await fetch('/api/developer/keys', {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      const data = await res.json().catch(() => null);
      if (res.ok && data?.success && Array.isArray(data.data)) {
        setKeys(data.data);
      } else {
        setKeys([]);
      }
    } catch (err) {
      setKeys([]);
    } finally {
      setIsLoadingKeys(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadKeys();
    setTimeout(() => {
      setIsRefreshing(false);
      showToast('API keys reloaded');
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

  // Filtered keys by selected environment tab
  const filteredKeys = useMemo(() => {
    return keys.filter((k) => k.environment === activeTabEnv);
  }, [keys, activeTabEnv]);

  // Primary active key in the current environment
  const primaryActiveKey = useMemo(() => {
    return filteredKeys.find((k) => k.status === 'ACTIVE') || null;
  }, [filteredKeys]);

  // Handle Generate Key
  const handleGenerateKeySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim() || newKeyName.trim().length < 2) {
      setGenerateError('Key name must be at least 2 characters.');
      return;
    }

    setIsSubmittingNewKey(true);
    setGenerateError(null);

    try {
      const authToken = getStoredAuthToken();
      const res = await fetch('/api/developer/keys', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
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
        setActiveTabEnv(newKeyEnv);
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
      const authToken = getStoredAuthToken();
      const res = await fetch(`/api/developer/keys/${rotatingKey.id}/rotate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
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
      const authToken = getStoredAuthToken();
      const res = await fetch(`/api/developer/keys/${revokingKey.id}/revoke`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
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

  // Download .env file
  const handleDownloadEnv = () => {
    if (!revealedSecretData) return;
    const envKey =
      revealedSecretData.apiKey.environment === 'LIVE'
        ? 'BAXATO_LIVE_SECRET_KEY'
        : 'BAXATO_TEST_SECRET_KEY';
    const content = `# BAXATO API Authentication (${revealedSecretData.apiKey.environment} Environment)\n# Generated: ${new Date().toISOString()}\n${envKey}=${revealedSecretData.secretKey}\n`;
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

  // Active Key representation
  const activeKeySample = primaryActiveKey
    ? primaryActiveKey.keyPrefix
    : activeTabEnv === 'LIVE'
    ? 'bx_live_••••••••••••••••••••••••••••••••••••••••'
    : 'bx_test_••••••••••••••••••••••••••••••••••••••••';

  // Code snippets generator
  const getCodeSnippet = () => {
    const keyPlaceholder = primaryActiveKey ? primaryActiveKey.keyPrefix : activeKeySample;
    switch (codeLang) {
      case 'curl':
        return `# 1. Dispense Airtime via BAXATO REST API (${activeTabEnv} Mode)
curl -X POST https://api.baxato.com/v1/services/airtime/purchase \\
  -H "Content-Type: application/json" \\
  -H "x-api-key: ${keyPlaceholder}" \\
  -d '{
    "network": "MTN",
    "phoneNumber": "08031234567",
    "amount": 1000,
    "clientReference": "REF_${Date.now()}"
  }'`;
      case 'node':
        return `import axios from 'axios';

// BAXATO High-Performance Vending Client (${activeTabEnv} Mode)
const response = await axios.post(
  'https://api.baxato.com/v1/services/airtime/purchase',
  {
    network: 'MTN',
    phoneNumber: '08031234567',
    amount: 1000,
    clientReference: 'REF_${Date.now()}'
  },
  {
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': '${keyPlaceholder}'
    }
  }
);

console.log('Vend Result:', response.data);`;
      case 'python':
        return `import requests

# BAXATO Python SDK Example (${activeTabEnv} Mode)
url = "https://api.baxato.com/v1/services/airtime/purchase"
headers = {
    "Content-Type": "application/json",
    "x-api-key": "${keyPlaceholder}"
}
payload = {
    "network": "MTN",
    "phoneNumber": "08031234567",
    "amount": 1000,
    "clientReference": "REF_${Date.now()}"
}

res = requests.post(url, json=payload, headers=headers)
print(res.json())`;
      case 'php':
        return `<?php
// BAXATO PHP Integration (${activeTabEnv} Mode)
$ch = curl_init('https://api.baxato.com/v1/services/airtime/purchase');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'x-api-key: ${keyPlaceholder}'
]);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    'network' => 'MTN',
    'phoneNumber' => '08031234567',
    'amount' => 1000,
    'clientReference' => 'REF_${Date.now()}'
]));

$response = curl_exec($ch);
curl_close($ch);
echo $response;`;
    }
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

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-6 sm:space-y-8">
          {/* Identity Verification Warning Banner (if applicable) */}
          <KycBanner
            kycStatus={kycStatus}
            userRole={userRole}
            onOpenKycModal={() => setIsKycModalOpen(true)}
          />

          {/* Page Title & Top Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#126BEB]/10 dark:bg-[#126BEB]/20 text-[#126BEB] dark:text-[#38BDF8] flex items-center justify-center border border-[#126BEB]/20 shadow-xs">
                  <Key className="w-5 h-5" />
                </div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                  Developer API Keys
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                Manage cryptographic authentication credentials for your backend integrations and automated vending services.
              </p>
            </div>

            {/* Quick Links & Actions */}
            <div className="flex items-center gap-2.5">
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="p-2 sm:px-3 sm:py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1528] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
                title="Refresh keys"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-[#126BEB]' : ''}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>

              <Link
                href="/dashboard/webhooks"
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0B1528] text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <Webhook className="w-3.5 h-3.5 text-purple-500" />
                <span className="hidden sm:inline">Webhooks</span>
              </Link>

              {canManageKeys && (
                <button
                  onClick={() => {
                    setNewKeyEnv(activeTabEnv);
                    setNewKeyName('');
                    setGenerateError(null);
                    setIsGenerateModalOpen(true);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-[#126BEB] hover:bg-[#0B5CC7] active:bg-[#094bb5] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Generate Key</span>
                </button>
              )}
            </div>
          </div>

          {/* RBAC Role Notice if unauthorized */}
          {!canManageKeys && (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 flex items-start gap-3 text-xs text-amber-800 dark:text-amber-200">
              <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Restricted Workspace Permissions</p>
                <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">
                  Your assigned role (<strong>{userRole}</strong>) allows read-only visibility for security compliance. Only Business Owners, Administrators, and Developers can generate, rotate, or revoke API keys.
                </p>
              </div>
            </div>
          )}

          {/* Dual Environment Toggle Tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
            <div className="inline-flex p-1 bg-slate-200/70 dark:bg-[#0B1528] rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold">
              <button
                onClick={() => setActiveTabEnv('TEST')}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${
                  activeTabEnv === 'TEST'
                    ? 'bg-white dark:bg-[#126BEB] text-slate-900 dark:text-white shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>Sandbox / Test Mode</span>
                <span className="px-1.5 py-0.2 rounded text-[10px] bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-300/40 font-mono">
                  bx_test_
                </span>
              </button>

              <button
                onClick={() => setActiveTabEnv('LIVE')}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${
                  activeTabEnv === 'LIVE'
                    ? 'bg-white dark:bg-[#126BEB] text-slate-900 dark:text-white shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Production / Live Mode</span>
                <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-300/40 font-mono">
                  bx_live_
                </span>
              </button>
            </div>

            {/* Environment Help Text */}
            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>
                {activeTabEnv === 'TEST'
                  ? 'Sandbox keys simulate telecom fulfillment with zero real wallet debit.'
                  : 'Live keys perform real dispatches and immediately debit your operational balance.'}
              </span>
            </div>
          </div>

          {/* Section 1: Primary Active Key Card */}
          <div
            className={`p-5 sm:p-6 rounded-2xl border transition-all ${
              activeTabEnv === 'LIVE'
                ? 'bg-gradient-to-br from-[#071324] via-[#09182E] to-[#0D2447] border-blue-500/30 text-white shadow-md'
                : 'bg-gradient-to-br from-[#1A1429] via-[#141021] to-[#0E0C17] border-purple-500/30 text-white shadow-md'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div
                  className={`p-2 rounded-xl ${
                    activeTabEnv === 'LIVE'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-400/30'
                  }`}
                >
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">
                      {primaryActiveKey ? primaryActiveKey.name : `${activeTabEnv} API Key`}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        activeTabEnv === 'LIVE'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {activeTabEnv} ENVIRONMENT
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-300">
                    {primaryActiveKey
                      ? `Active since ${new Date(primaryActiveKey.createdAt).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' })}`
                      : `No active ${activeTabEnv} key generated yet`}
                  </span>
                </div>
              </div>

              {primaryActiveKey && canManageKeys && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setRotatingKey(primaryActiveKey);
                      setRotateError(null);
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/10 hover:bg-white/15 text-slate-200 border border-white/10 transition-colors flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-blue-400" />
                    <span>Rotate Key</span>
                  </button>
                  <button
                    onClick={() => {
                      setRevokingKey(primaryActiveKey);
                      setRevokeError(null);
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition-colors flex items-center gap-1.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Revoke</span>
                  </button>
                </div>
              )}
            </div>

            {/* Key Preview Box */}
            <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-black/40 border border-white/10 backdrop-blur-sm">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-xs font-mono font-bold text-slate-200 tracking-wider truncate">
                  {primaryActiveKey ? primaryActiveKey.keyPrefix : activeKeySample}
                </span>
                <span className="text-[10px] text-slate-400 hidden sm:inline">
                  (SHA-256 Hashed at Rest)
                </span>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {primaryActiveKey ? (
                  <button
                    onClick={() => copyToClipboard(primaryActiveKey.keyPrefix, primaryActiveKey.id)}
                    className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    {copiedKeyId === primaryActiveKey.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Prefix</span>
                      </>
                    )}
                  </button>
                ) : (
                  canManageKeys && (
                    <button
                      onClick={() => {
                        setNewKeyEnv(activeTabEnv);
                        setNewKeyName('');
                        setGenerateError(null);
                        setIsGenerateModalOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-[#126BEB] hover:bg-[#0B5CC7] text-white text-xs font-bold flex items-center gap-1.5 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Generate {activeTabEnv} Key</span>
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Key Protection Notice */}
            <div className="mt-3.5 text-[11px] text-slate-300 flex items-center gap-1.5 opacity-90">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>
                Plaintext secrets are displayed strictly once upon creation. If your key is lost or leaked, click <strong>Rotate Key</strong> immediately to issue a replacement without downtime.
              </span>
            </div>
          </div>

          {/* Section 2: Complete API Keys Management Table */}
          <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#0B1528] border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Key className="w-4 h-4 text-[#126BEB]" />
                  <span>{activeTabEnv === 'TEST' ? 'Sandbox' : 'Production'} API Keys Registry</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Audit log of all issued keys, last usage timestamps, and lifecycle revocation controls.
                </p>
              </div>

              <span className="text-xs font-bold text-slate-400">
                {filteredKeys.length} {filteredKeys.length === 1 ? 'Key' : 'Keys'} Registered
              </span>
            </div>

            {isLoadingKeys ? (
              <div className="py-12 flex flex-col items-center justify-center space-y-3">
                <RefreshCw className="w-6 h-6 animate-spin text-[#126BEB]" />
                <span className="text-xs text-slate-400">Loading cryptographic keys...</span>
              </div>
            ) : filteredKeys.length === 0 ? (
              <div className="py-12 px-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                  <Key className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    No {activeTabEnv} API Keys Created
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                    Generate an API key for your {activeTabEnv === 'TEST' ? 'staging sandbox' : 'production server'} to begin programmatic vending.
                  </p>
                </div>
                {canManageKeys && (
                  <button
                    onClick={() => {
                      setNewKeyEnv(activeTabEnv);
                      setNewKeyName('');
                      setGenerateError(null);
                      setIsGenerateModalOpen(true);
                    }}
                    className="px-4 py-2 rounded-xl bg-[#126BEB] text-white text-xs font-bold inline-flex items-center gap-1.5 shadow-xs hover:bg-[#0B5CC7] transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Create {activeTabEnv} Key</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                      <th className="py-2.5 px-3">Key Name</th>
                      <th className="py-2.5 px-3">Prefix / Hash</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Last Used</th>
                      <th className="py-2.5 px-3">Created</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                    {filteredKeys.map((keyItem) => (
                      <tr
                        key={keyItem.id}
                        className="hover:bg-slate-50/60 dark:hover:bg-[#0C1527]/60 transition-colors"
                      >
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-900 dark:text-white">
                            {keyItem.name}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            ID: {keyItem.id}
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
                              {keyItem.keyPrefix}
                            </span>
                            <button
                              onClick={() => copyToClipboard(keyItem.keyPrefix, keyItem.id)}
                              className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-700 dark:hover:text-white"
                              title="Copy prefix"
                            >
                              {copiedKeyId === keyItem.id ? (
                                <Check className="w-3 h-3 text-emerald-500" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        </td>

                        <td className="py-3 px-3">
                          {keyItem.status === 'ACTIVE' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              Active
                            </span>
                          ) : keyItem.status === 'REVOKED' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900">
                              <XCircle className="w-3 h-3" />
                              Revoked
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                              Expired
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-3 text-slate-500 dark:text-slate-400">
                          {keyItem.lastUsedAt ? (
                            new Date(keyItem.lastUsedAt).toLocaleString('en-NG', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })
                          ) : (
                            <span className="text-slate-400 italic">Never used</span>
                          )}
                        </td>

                        <td className="py-3 px-3 text-slate-500 dark:text-slate-400">
                          {new Date(keyItem.createdAt).toLocaleDateString('en-NG', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </td>

                        <td className="py-3 px-3 text-right">
                          {canManageKeys && keyItem.status === 'ACTIVE' && (
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  setRotatingKey(keyItem);
                                  setRotateError(null);
                                }}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1"
                              >
                                <RefreshCw className="w-3 h-3 text-[#126BEB]" />
                                <span>Rotate</span>
                              </button>
                              <button
                                onClick={() => {
                                  setRevokingKey(keyItem);
                                  setRevokeError(null);
                                }}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold border border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors flex items-center gap-1"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Revoke</span>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Section 3: Interactive Integration Quickstart & Code Generator */}
          <div className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#0B1528] border border-slate-200/90 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-[#126BEB]" />
                  <span>Integration Quickstart & Code Generator</span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Ready-to-run request examples configured for the active {activeTabEnv} environment.
                </p>
              </div>

              {/* Language Selector */}
              <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-[#060D18] rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                {(['curl', 'node', 'python', 'php'] as const).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setCodeLang(lang)}
                    className={`px-3 py-1.5 rounded-lg uppercase font-bold text-[10px] transition-all ${
                      codeLang === lang
                        ? 'bg-white dark:bg-[#126BEB] text-slate-900 dark:text-white shadow-xs'
                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>

            {/* Code Block Container */}
            <div className="relative rounded-xl overflow-hidden bg-[#060D18] border border-slate-800">
              <div className="flex items-center justify-between px-4 py-2.5 bg-[#091322] border-b border-slate-800 text-xs text-slate-400">
                <span className="font-mono text-[11px]">
                  POST https://api.baxato.com/v1/services/airtime/purchase
                </span>
                <button
                  onClick={() => copyToClipboard(getCodeSnippet(), 'code-snippet')}
                  className="px-2.5 py-1 rounded bg-white/10 hover:bg-white/20 text-slate-200 text-[11px] font-semibold flex items-center gap-1.5 transition-colors"
                >
                  {copiedKeyId === 'code-snippet' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Code</span>
                    </>
                  )}
                </button>
              </div>

              <pre className="p-4 text-xs font-mono text-slate-200 overflow-x-auto leading-relaxed">
                <code>{getCodeSnippet()}</code>
              </pre>
            </div>
          </div>

          {/* Section 4: External Docs & Webhooks Navigation Card */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-50/80 via-slate-50 to-indigo-50/80 dark:from-[#091528] dark:via-[#070D18] dark:to-[#0B1528] border border-blue-200/70 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#126BEB]/10 dark:bg-[#126BEB]/20 text-[#126BEB] dark:text-[#38BDF8] flex items-center justify-center shrink-0 border border-[#126BEB]/20">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Looking for full API schemas, request parameters, and response models?
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Inspect the complete interactive Scalar API documentation for Data bundles, Electricity discos, PayTV, and Exam PINs.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <Link
                href="/dashboard/webhooks"
                className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B1528] text-slate-800 dark:text-slate-200 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Webhooks Setup
              </Link>
              <a
                href="/v1/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 rounded-xl bg-[#126BEB] hover:bg-[#0B5CC7] text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <span>Interactive Docs</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
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
                <div className="w-8 h-8 rounded-lg bg-[#126BEB]/10 dark:bg-[#126BEB]/20 text-[#126BEB] dark:text-[#38BDF8] flex items-center justify-center">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                    Generate New API Key
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Issue a cryptographic token for external API access
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

              {/* Key Name Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Key Description / Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Primary Core Backend, Mobile App Server"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#070D18] text-slate-900 dark:text-white text-xs focus:outline-hidden focus:ring-2 focus:ring-[#126BEB]"
                />
                <p className="text-[10.5px] text-slate-400">
                  A recognizable label describing what application will consume this key.
                </p>
              </div>

              {/* Environment Choice */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Environment Scope
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setNewKeyEnv('TEST')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      newKeyEnv === 'TEST'
                        ? 'border-[#126BEB] bg-blue-50/50 dark:bg-blue-950/30'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="w-2 h-2 rounded-full bg-amber-400" />
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        Sandbox (Test)
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 block font-mono">
                      bx_test_...
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setNewKeyEnv('LIVE')}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      newKeyEnv === 'LIVE'
                        ? 'border-[#126BEB] bg-blue-50/50 dark:bg-blue-950/30'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        Production (Live)
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 block font-mono">
                      bx_live_...
                    </span>
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
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
                    <span>Generate Key</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Secret Reveal Modal (One-Time View) */}
      {revealedSecretData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  API Key Generated Successfully
                </h3>
                <p className="text-[11px] text-slate-400">
                  {revealedSecretData.apiKey.name} • {revealedSecretData.apiKey.environment}
                </p>
              </div>
            </div>

            {/* Warning Alert */}
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-amber-800 dark:text-amber-200 text-xs space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Save your API secret key now</span>
              </div>
              <p className="text-[11px] leading-relaxed text-amber-700 dark:text-amber-300">
                For security reasons, this plaintext secret key is shown <strong>only once</strong> and cannot be recovered. If you navigate away without copying, you will need to rotate the key to issue a new one.
              </p>
            </div>

            {/* Secret Key Display Box */}
            <div className="p-3.5 rounded-xl bg-slate-900 dark:bg-[#060D18] border border-slate-800 space-y-2">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Secret API Key Token</span>
                <span className="font-mono text-[10px]">
                  {revealedSecretData.apiKey.environment === 'LIVE' ? 'Production' : 'Sandbox'}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-black/40 border border-white/10 font-mono text-xs font-bold text-[#38BDF8] break-all">
                <span>{revealedSecretData.secretKey}</span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={handleDownloadEnv}
                  className="text-xs text-slate-300 hover:text-white flex items-center gap-1 font-semibold transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .env snippet</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(revealedSecretData.secretKey);
                    setHasCopiedSecret(true);
                    showToast('Secret key copied to clipboard');
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

            {/* Done Action */}
            <button
              onClick={() => {
                setRevealedSecretData(null);
                setHasCopiedSecret(false);
              }}
              className="w-full py-2.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors"
            >
              I have stored my secret securely
            </button>
          </div>
        </div>
      )}

      {/* MODAL 3: Rotate Key Confirmation Modal */}
      {rotatingKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#0B1528] border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative space-y-5">
            <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-sm">
                  Rotate API Key
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
              Rotating this key will <strong>immediately revoke the existing secret key</strong>. Any applications or backend servers currently communicating with the old key will begin receiving <code className="text-rose-500">401 Unauthorized</code> errors until updated with the new secret.
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
                  <span>Confirm Rotation</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Revoke Key Confirmation Modal */}
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
              Are you sure you want to permanently revoke <strong>{revokingKey.name}</strong>? Any automated systems relying on this key will be permanently denied access. This action cannot be undone.
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
                  <span>Revoke Key Permanently</span>
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
