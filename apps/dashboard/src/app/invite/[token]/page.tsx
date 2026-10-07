'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Building2,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  Eye,
  EyeOff,
  Check,
  X,
  ShieldCheck,
} from 'lucide-react';
import { getStoredAuthToken, getStoredUser, StoredUser } from '@/lib/auth-session';

const ROLE_INFO: Record<
  string,
  {
    name: string;
    description: string;
    capabilities: string[];
  }
> = {
  BUSINESS_ADMIN: {
    name: 'Administrator',
    description: 'Full workspace operational and team management access.',
    capabilities: [
      'Manage team members and invite collaborators',
      'Monitor operational wallet balance and funding',
      'Configure webhook endpoints and inspect transactions',
    ],
  },
  DEVELOPER: {
    name: 'Developer',
    description: 'Technical lead for API keys, webhooks, and vending integrations.',
    capabilities: [
      'Generate and rotate Live and Test API keys',
      'Configure webhooks and inspect HMAC delivery logs',
      'Access interactive API documentation and test sandbox',
      'Integrate and trigger digital vending endpoints',
    ],
  },
  FINANCE: {
    name: 'Finance & Billing',
    description: 'Financial reconciliation, statements, and wallet funding.',
    capabilities: [
      'View operational wallet balance and virtual accounts',
      'Reconcile funding deposits and vending debits',
      'Export detailed financial statements (CSV/PDF)',
    ],
  },
  SUPPORT: {
    name: 'Customer Support',
    description: 'Customer dispute resolution and receipt generation.',
    capabilities: [
      'Search transactions by Reference, Phone, or Meter Number',
      'Retrieve electricity tokens and exam scratch codes',
      'Download customer-facing transaction receipts',
    ],
  },
  VIEWER: {
    name: 'Viewer',
    description: 'Read-only access to overview dashboard and charts.',
    capabilities: [
      'View aggregate transaction volume charts',
      'Read-only access to overview metrics and trends',
    ],
  },
};

interface PasswordHealth {
  score: number;
  hasMinLength: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
  isValid: boolean;
  label: string;
  color: string;
}

function evaluatePasswordHealth(password: string): PasswordHealth {
  const hasMinLength = password.length >= 8;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  let score = 0;
  if (hasMinLength) score++;
  if (hasUpper) score++;
  if (hasLower) score++;
  if (hasNumber) score++;
  if (hasSpecial) score++;

  let label = 'Too weak';
  let color = 'bg-slate-300 dark:bg-slate-700';

  if (score === 1 || score === 2) {
    label = 'Weak';
    color = 'bg-red-500';
  } else if (score === 3) {
    label = 'Fair';
    color = 'bg-amber-500';
  } else if (score === 4) {
    label = 'Good';
    color = 'bg-blue-500';
  } else if (score === 5) {
    label = 'Strong';
    color = 'bg-emerald-500';
  }

  return {
    score,
    hasMinLength,
    hasUpper,
    hasLower,
    hasNumber,
    hasSpecial,
    isValid: score === 5,
    label,
    color,
  };
}

export default function InviteAcceptancePage({
  params,
}: {
  params: { token: string };
}) {
  const router = useRouter();
  const rawToken = params.token;

  // Validation State
  const [isValidating, setIsValidating] = useState(true);
  const [validationData, setValidationData] = useState<{
    valid: boolean;
    businessName: string;
    businessSlug: string;
    businessId?: string;
    email: string;
    role: string;
    inviterName: string;
    expiresAt: string;
    existingAccount: boolean;
    userName: string | null;
    isAlreadyMember?: boolean;
    isOwner?: boolean;
  } | null>(null);
  const [errorState, setErrorState] = useState<string | null>(null);

  // Active Session State
  const [activeAuthToken, setActiveAuthToken] = useState<string | null>(null);
  const [activeUser, setActiveUser] = useState<StoredUser | null>(null);

  // Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Sync client session on mount
  useEffect(() => {
    setActiveAuthToken(getStoredAuthToken());
    setActiveUser(getStoredUser());
  }, []);

  const handleSignOutAndAccept = () => {
    try {
      localStorage.removeItem('bx_auth_token');
      localStorage.removeItem('bx_user');
      localStorage.removeItem('bx_business');
    } catch {}
    setActiveAuthToken(null);
    setActiveUser(null);
    setSubmitError(null);
  };

  // Password Health Calculation
  const passwordHealth = useMemo(() => evaluatePasswordHealth(password), [password]);
  const passwordsMatch = password.length > 0 && password === confirmPassword;

  useEffect(() => {
    validateToken();
  }, [rawToken]);

  const validateToken = async () => {
    setIsValidating(true);
    setErrorState(null);
    try {
      const res = await fetch(`/api/invites/validate?token=${encodeURIComponent(rawToken)}`);
      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.success) {
        setErrorState(
          json?.error?.message || 'Invalid or expired invitation link. Please request a new one.',
        );
      } else {
        setValidationData(json.data);
      }
    } catch {
      setErrorState('Could not reach the server to validate your invitation. Please check your network.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    // If new user, enforce password health and match
    if (!activeAuthToken && !validationData?.existingAccount) {
      if (!passwordHealth.isValid) {
        setSubmitError(
          'Please ensure your password meets all 5 security health requirements.',
        );
        return;
      }
      if (password !== confirmPassword) {
        setSubmitError('The entered passwords do not match. Please verify.');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (activeAuthToken) {
        headers['Authorization'] = `Bearer ${activeAuthToken}`;
      }

      const payload: Record<string, any> = { token: rawToken };

      if (!activeAuthToken) {
        if (validationData?.existingAccount) {
          payload.password = password;
        } else {
          payload.firstName = firstName.trim();
          payload.lastName = lastName.trim();
          payload.phoneNumber = phoneNumber.trim();
          payload.password = password;
        }
      }

      const res = await fetch('/api/invites/accept', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok || !json?.success) {
        setSubmitError(json?.error?.message || 'Failed to accept invitation. Please try again.');
        setIsSubmitting(false);
        return;
      }

      // Store tokens and user profile
      if (typeof window !== 'undefined') {
        if (json.data?.token) {
          localStorage.setItem('bx_auth_token', json.data.token);
        }
        if (json.data?.user) {
          localStorage.setItem('bx_user', JSON.stringify(json.data.user));
          localStorage.setItem(
            'bx_business',
            JSON.stringify({
              id: json.data.user.businessId,
              name: json.data.user.businessName,
            }),
          );
        }
      }

      router.push('/dashboard');
    } catch {
      setSubmitError('Network error while processing invitation. Please try again.');
      setIsSubmitting(false);
    }
  };

  if (isValidating) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#070D18] text-slate-900 dark:text-slate-100 flex items-center justify-center p-4">
        <div className="text-center space-y-3">
          <RefreshCw className="w-6 h-6 animate-spin text-[#126BEB] mx-auto" />
          <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-400">
            Validating invitation...
          </p>
        </div>
      </div>
    );
  }

  if (errorState) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#070D18] text-slate-900 dark:text-slate-100 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-[#0A1220] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 max-w-md w-full text-center space-y-5 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 flex items-center justify-center text-red-600 dark:text-red-400 mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-lg font-semibold text-slate-900 dark:text-white">
              Invitation unavailable
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {errorState}
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/login"
              className="inline-flex items-center justify-center w-full px-4 py-2.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-medium text-xs sm:text-sm hover:opacity-90 transition-opacity"
            >
              Sign in to BAXATO
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const roleCfg = ROLE_INFO[validationData?.role || 'DEVELOPER'] || ROLE_INFO.DEVELOPER;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070D18] text-slate-900 dark:text-slate-100 flex flex-col justify-start sm:justify-center items-center py-10 px-4 sm:px-6 font-sans transition-colors duration-150">
      <div className="w-full max-w-lg space-y-6 my-auto">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <img
            src="/baxato-logo.jpg"
            alt="BAXATO"
            className="w-11 h-11 rounded-xl mx-auto border border-slate-200 dark:border-slate-800 shadow-xs object-cover"
          />
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Join {validationData?.businessName}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            You've been invited by <strong className="text-slate-800 dark:text-slate-200">{validationData?.inviterName}</strong> to collaborate.
          </p>
        </div>

        {/* Card Container */}
        <div className="bg-white dark:bg-[#0A1220] border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-8 shadow-xs space-y-6">
          {/* Organization & Role Callout (Mobile-proof stacked/flex layout) */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#080E1A] border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-400 shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">
                  Workspace
                </p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                  {validationData?.businessName}
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-medium">Assigned Role:</span>
              <span className="font-semibold text-slate-900 dark:text-white">{roleCfg.name}</span>
            </div>
          </div>

          {/* Role Capabilities Summary */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Access permissions granted:
            </p>
            <ul className="space-y-1.5">
              {roleCfg.capabilities.map((cap, i) => (
                <li key={i} className="text-xs text-slate-600 dark:text-slate-400 flex items-start gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <span>{cap}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Form / Acceptance Action */}
          <form onSubmit={handleAccept} className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-800">
            {submitError && (
              <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600 dark:text-red-400" />
                <span>{submitError}</span>
              </div>
            )}

            {/* CASE 0: Already a member of this workspace */}
            {validationData?.isAlreadyMember ? (
              <div className="p-4 rounded-xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 text-blue-950 dark:text-blue-200 space-y-3">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-[#126BEB] dark:text-[#38BDF8] shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                      Already a Workspace Member
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      {validationData.isOwner
                        ? `You are the registered Owner of ${validationData.businessName}.`
                        : `You are already an active member of ${validationData.businessName}.`}
                    </p>
                  </div>
                </div>
                <div className="pt-2 border-t border-blue-200 dark:border-blue-900/60">
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center justify-center w-full py-2.5 px-4 rounded-lg bg-[#126BEB] hover:bg-[#0B5CC7] text-white font-medium text-xs sm:text-sm transition-colors shadow-xs"
                  >
                    Open Workspace Dashboard
                  </Link>
                </div>
              </div>
            ) : activeAuthToken && activeUser?.email && validationData?.email && activeUser.email.toLowerCase() !== validationData.email.toLowerCase() ? (
              /* CASE 1: Active session mismatch (e.g. Admin testing or another user logged in) */
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-950 dark:text-amber-200 space-y-3">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                      Active Session Conflict
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      You are currently signed in as <strong className="text-slate-900 dark:text-white">{activeUser?.email}</strong>, but this invitation was sent to <strong className="text-slate-900 dark:text-white">{validationData?.email}</strong>.
                    </p>
                    <p className="text-[11.5px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      To prevent accidental account linkage or session corruption, please sign out to accept this invitation as <strong>{validationData?.email}</strong>, or return to your current dashboard.
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2.5 pt-2 border-t border-amber-500/20">
                  <button
                    type="button"
                    onClick={handleSignOutAndAccept}
                    className="flex-1 py-2 px-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition-colors shadow-xs text-center"
                  >
                    Sign out & accept as {validationData?.email}
                  </button>
                  <Link
                    href="/dashboard"
                    className="flex-1 py-2 px-3 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-xs transition-colors text-center border border-slate-300 dark:border-slate-700"
                  >
                    Return to Dashboard
                  </Link>
                </div>
              </div>
            ) : activeAuthToken ? (
              /* CASE 2: Logged in caller matching the invited email */
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
                  Signed in as <strong className="text-slate-900 dark:text-white">{activeUser?.email || validationData?.email}</strong>.
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 px-4 rounded-lg bg-[#126BEB] hover:bg-[#0B5CC7] text-white font-medium text-xs sm:text-sm transition-colors shadow-xs flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Accept & Enter Workspace</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            ) : validationData?.existingAccount ? (
              /* CASE 2: User exists but not logged in */
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Account Password
                  </label>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                    An existing account was found for <strong className="text-slate-800 dark:text-slate-200">{validationData.email}</strong>. Enter your password to accept:
                  </p>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-3.5 pr-10 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#070D18] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#126BEB]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-2.5 px-4 rounded-lg bg-[#126BEB] hover:bg-[#0B5CC7] text-white font-medium text-xs sm:text-sm transition-colors shadow-xs flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Verify Password & Join</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            ) : (
              /* CASE 3: Brand new user registration */
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                      First Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Jane"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#070D18] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#126BEB]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                      Last Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Doe"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#070D18] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#126BEB]"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="08012345678"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#070D18] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#126BEB]"
                  />
                </div>

                {/* Password Input with Visibility Toggle */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Create Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Create a strong password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full pl-3.5 pr-10 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#070D18] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#126BEB]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password Input */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      required
                      placeholder="Re-enter password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-3.5 pr-10 py-2 text-xs sm:text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#070D18] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#126BEB]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {confirmPassword.length > 0 && (
                    <p
                      className={`text-[11px] font-medium flex items-center gap-1 ${
                        passwordsMatch ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'
                      }`}
                    >
                      {passwordsMatch ? (
                        <>
                          <Check className="w-3.5 h-3.5" /> Passwords match
                        </>
                      ) : (
                        <>
                          <X className="w-3.5 h-3.5" /> Passwords do not match
                        </>
                      )}
                    </p>
                  )}
                </div>

                {/* Password Health & Security Checklist */}
                {password.length > 0 && (
                  <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 dark:text-slate-400 font-medium">Password Health:</span>
                      <span
                        className={`font-semibold ${
                          passwordHealth.score <= 2
                            ? 'text-red-500'
                            : passwordHealth.score <= 4
                            ? 'text-amber-500'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {passwordHealth.label}
                      </span>
                    </div>

                    {/* Progress Bar (5 ticks) */}
                    <div className="grid grid-cols-5 gap-1.5">
                      {[1, 2, 3, 4, 5].map((level) => (
                        <div
                          key={level}
                          className={`h-1.5 rounded-full transition-all duration-200 ${
                            level <= passwordHealth.score
                              ? passwordHealth.color
                              : 'bg-slate-200 dark:bg-slate-800'
                          }`}
                        />
                      ))}
                    </div>

                    {/* Health Checklist Items */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1 text-[11px]">
                      <div
                        className={`flex items-center gap-1.5 ${
                          passwordHealth.hasMinLength
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-slate-400'
                        }`}
                      >
                        {passwordHealth.hasMinLength ? (
                          <Check className="w-3.5 h-3.5 shrink-0" />
                        ) : (
                          <span className="w-3.5 h-3.5 rounded-full border border-slate-300 dark:border-slate-700 inline-block shrink-0" />
                        )}
                        <span>8+ characters</span>
                      </div>

                      <div
                        className={`flex items-center gap-1.5 ${
                          passwordHealth.hasUpper
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-slate-400'
                        }`}
                      >
                        {passwordHealth.hasUpper ? (
                          <Check className="w-3.5 h-3.5 shrink-0" />
                        ) : (
                          <span className="w-3.5 h-3.5 rounded-full border border-slate-300 dark:border-slate-700 inline-block shrink-0" />
                        )}
                        <span>Uppercase letter (A-Z)</span>
                      </div>

                      <div
                        className={`flex items-center gap-1.5 ${
                          passwordHealth.hasLower
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-slate-400'
                        }`}
                      >
                        {passwordHealth.hasLower ? (
                          <Check className="w-3.5 h-3.5 shrink-0" />
                        ) : (
                          <span className="w-3.5 h-3.5 rounded-full border border-slate-300 dark:border-slate-700 inline-block shrink-0" />
                        )}
                        <span>Lowercase letter (a-z)</span>
                      </div>

                      <div
                        className={`flex items-center gap-1.5 ${
                          passwordHealth.hasNumber
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-slate-400'
                        }`}
                      >
                        {passwordHealth.hasNumber ? (
                          <Check className="w-3.5 h-3.5 shrink-0" />
                        ) : (
                          <span className="w-3.5 h-3.5 rounded-full border border-slate-300 dark:border-slate-700 inline-block shrink-0" />
                        )}
                        <span>Number (0-9)</span>
                      </div>

                      <div
                        className={`flex items-center gap-1.5 sm:col-span-2 ${
                          passwordHealth.hasSpecial
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-slate-400'
                        }`}
                      >
                        {passwordHealth.hasSpecial ? (
                          <Check className="w-3.5 h-3.5 shrink-0" />
                        ) : (
                          <span className="w-3.5 h-3.5 rounded-full border border-slate-300 dark:border-slate-700 inline-block shrink-0" />
                        )}
                        <span>Special character (!@#$%^&*)</span>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting || !passwordHealth.isValid || !passwordsMatch}
                  className="w-full py-2.5 px-4 rounded-lg bg-[#126BEB] hover:bg-[#0B5CC7] text-white font-medium text-xs sm:text-sm transition-colors shadow-xs flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <span>Create Account & Join</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-400 dark:text-slate-500">
          &copy; 2026 XATO TECHNOLOGIES LIMITED. All rights reserved.
        </p>
      </div>
    </div>
  );
}
