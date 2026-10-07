'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Shield,
  ShieldCheck,
  Building2,
  CheckCircle2,
  AlertCircle,
  Lock,
  User,
  Phone,
  ArrowRight,
  RefreshCw,
  Eye,
  EyeOff,
  Sparkles,
  Key,
  Wallet,
  Headphones,
  Mail,
  Check,
} from 'lucide-react';
import { getStoredAuthToken, getStoredUser } from '@/lib/auth-session';

const ROLE_INFO: Record<
  string,
  {
    name: string;
    icon: React.ElementType;
    badgeStyle: string;
    description: string;
    capabilities: string[];
  }
> = {
  BUSINESS_ADMIN: {
    name: 'Administrator',
    icon: Shield,
    badgeStyle: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/60',
    description: 'General Operations Manager',
    capabilities: [
      'Manage team members and invite collaborators',
      'Monitor operational wallet balance and funding',
      'Configure webhook endpoints and inspect transactions',
    ],
  },
  DEVELOPER: {
    name: 'Developer',
    icon: Key,
    badgeStyle: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60',
    description: 'Technical Lead & API Integrator',
    capabilities: [
      'Generate and rotate Live and Test API keys',
      'Configure webhooks and inspect HMAC delivery logs',
      'Access interactive API documentation and test sandbox',
    ],
  },
  FINANCE: {
    name: 'Finance & Billing',
    icon: Wallet,
    badgeStyle: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60',
    description: 'Accountant & Financial Officer',
    capabilities: [
      'View operational wallet balance and virtual accounts',
      'Reconcile funding deposits and vending debits',
      'Export detailed financial statements (CSV/PDF)',
    ],
  },
  SUPPORT: {
    name: 'Customer Support',
    icon: Headphones,
    badgeStyle: 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800/60',
    description: 'Helpdesk & Customer Care',
    capabilities: [
      'Search transactions by Reference, Phone, or Meter Number',
      'Retrieve electricity tokens and exam scratch codes',
      'Download customer-facing transaction receipts',
    ],
  },
  VIEWER: {
    name: 'Viewer',
    icon: Eye,
    badgeStyle: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700',
    description: 'Read-only Analyst',
    capabilities: [
      'View aggregate transaction volume charts',
      'Read-only access to overview metrics and trends',
    ],
  },
};

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
    email: string;
    role: string;
    inviterName: string;
    expiresAt: string;
    existingAccount: boolean;
    userName: string | null;
  } | null>(null);
  const [errorState, setErrorState] = useState<string | null>(null);

  // Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const activeAuthToken = typeof window !== 'undefined' ? getStoredAuthToken() : null;
  const activeUser = typeof window !== 'undefined' ? getStoredUser() : null;

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
    setIsSubmitting(true);
    setSubmitError(null);

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
        <div className="bg-white dark:bg-[#0A1220] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 max-w-md w-full text-center space-y-5 shadow-sm">
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
  const RoleIcon = roleCfg.icon;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#070D18] text-slate-900 dark:text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 font-sans transition-colors duration-150">
      <div className="w-full max-w-lg space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            <Sparkles className="w-3.5 h-3.5 text-[#126BEB]" />
            <span>BAXATO Workspace Invitation</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Join {validationData?.businessName}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            You've been invited by <strong className="text-slate-800 dark:text-slate-200">{validationData?.inviterName}</strong> to collaborate.
          </p>
        </div>

        {/* Card Container */}
        <div className="bg-white dark:bg-[#0A1220] border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-xs space-y-6">
          {/* Organization & Role Callout */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#080E1A] border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 flex items-center justify-center text-[#126BEB] dark:text-[#38BDF8] shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-500 dark:text-slate-400">Organization</p>
                <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                  {validationData?.businessName}
                </p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Your Role</p>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium border ${roleCfg.badgeStyle}`}
              >
                <RoleIcon className="w-3 h-3" />
                {roleCfg.name}
              </span>
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

            {/* CASE 1: Logged in caller */}
            {activeAuthToken ? (
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
                  Signed in as <strong className="text-slate-900 dark:text-white">{activeUser?.email || 'Current Account'}</strong>.
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                    Create Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="At least 8 characters"
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
                  {password.length > 0 && (
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <div
                        className={`h-1 flex-1 rounded-full ${
                          password.length >= 8 ? 'bg-emerald-500' : 'bg-red-500'
                        }`}
                      />
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        {password.length >= 8 ? 'Password looks good' : 'Minimum 8 characters'}
                      </span>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || password.length < 8}
                  className="w-full py-2.5 px-4 rounded-lg bg-[#126BEB] hover:bg-[#0B5CC7] text-white font-medium text-xs sm:text-sm transition-colors shadow-xs flex items-center justify-center gap-2 disabled:opacity-50"
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
