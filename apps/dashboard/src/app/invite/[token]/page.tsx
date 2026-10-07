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
    badgeStyle: 'bg-sky-950/60 text-sky-300 border-sky-800',
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
    badgeStyle: 'bg-amber-950/60 text-amber-300 border-amber-800',
    description: 'Technical Lead & API Integrator',
    capabilities: [
      'Generate & rotate Live and Test API keys',
      'Configure webhooks and inspect HMAC delivery logs',
      'Access interactive API documentation (Scalar)',
    ],
  },
  FINANCE: {
    name: 'Finance & Billing',
    icon: Wallet,
    badgeStyle: 'bg-emerald-950/60 text-emerald-300 border-emerald-800',
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
    badgeStyle: 'bg-teal-950/60 text-teal-300 border-teal-800',
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
    badgeStyle: 'bg-slate-800 text-slate-300 border-slate-700',
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
      const json = await res.json();

      if (!res.ok || !json.success) {
        setErrorState(
          json.error?.message || 'Invalid or expired invitation link. Please request a new one.',
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

      const json = await res.json();

      if (!res.ok || !json.success) {
        setSubmitError(json.error?.message || 'Failed to accept invitation. Please try again.');
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

      // Smooth transition to dashboard
      router.push('/dashboard');
    } catch {
      setSubmitError('Network error while processing invitation. Please try again.');
      setIsSubmitting(false);
    }
  };

  if (isValidating) {
    return (
      <div className="min-h-screen bg-[#060D18] flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 mx-auto">
            <RefreshCw className="w-8 h-8 animate-spin" />
          </div>
          <p className="text-sm font-semibold text-slate-300">
            Validating BAXATO invitation...
          </p>
        </div>
      </div>
    );
  }

  if (errorState) {
    return (
      <div className="min-h-screen bg-[#060D18] flex items-center justify-center p-4">
        <div className="bg-[#0A1224] border border-slate-800 rounded-3xl p-8 max-w-md w-full text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-red-950/40 border border-red-800/80 flex items-center justify-center text-red-400 mx-auto">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-white">Invitation Unavailable</h1>
            <p className="text-sm text-slate-400 leading-relaxed">{errorState}</p>
          </div>
          <div className="pt-2">
            <Link
              href="/login"
              className="inline-flex items-center justify-center w-full px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-sm transition-colors"
            >
              Go to Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const roleCfg = ROLE_INFO[validationData?.role || 'DEVELOPER'] || ROLE_INFO.DEVELOPER;
  const RoleIcon = roleCfg.icon;

  return (
    <div className="min-h-screen bg-[#060D18] text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 font-sans relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-sky-500/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="w-full max-w-lg z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/80 text-xs font-semibold text-slate-300">
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            BAXATO Merchant Platform
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Workspace Invitation
          </h1>
        </div>

        {/* Card Container */}
        <div className="bg-[#0A1224]/90 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
          {/* Inviting Business Info */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-sky-950/40 via-blue-950/20 to-transparent border border-sky-900/40 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 shrink-0">
              <Building2 className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-sky-400 font-semibold uppercase tracking-wider">
                Invitation to Join
              </p>
              <h2 className="text-lg font-bold text-white truncate">
                {validationData?.businessName}
              </h2>
              <p className="text-xs text-slate-400">
                Invited by <strong className="text-slate-300">{validationData?.inviterName}</strong>
              </p>
            </div>
          </div>

          {/* Assigned Role Pill & Capabilities */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Your Role
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${roleCfg.badgeStyle}`}
              >
                <RoleIcon className="w-3.5 h-3.5" />
                {roleCfg.name}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#070D1A] border border-slate-800/80 space-y-2.5">
              <p className="text-xs font-semibold text-slate-300">Capabilities Granted:</p>
              <ul className="space-y-1.5">
                {roleCfg.capabilities.map((cap, i) => (
                  <li key={i} className="text-xs text-slate-400 flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{cap}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Form / Acceptance Action */}
          <form onSubmit={handleAccept} className="space-y-4 pt-2">
            {submitError && (
              <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-800/80 text-red-200 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
                <span>{submitError}</span>
              </div>
            )}

            {/* CASE 1: Logged in caller */}
            {activeAuthToken ? (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300">
                  Signed in as <strong className="text-white">{activeUser?.email || 'Current Account'}</strong>.
                </div>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-sm transition-all shadow-lg shadow-sky-500/25 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      Accept & Enter Dashboard <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            ) : validationData?.existingAccount ? (
              /* CASE 2: User exists but not logged in */
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Account Password
                  </label>
                  <p className="text-xs text-slate-400 mb-2">
                    An existing account was found for <strong>{validationData.email}</strong>. Enter your password to accept:
                  </p>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-[#070D1A] border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-sm transition-all shadow-lg shadow-sky-500/25 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      Verify Password & Join <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            ) : (
              /* CASE 3: Brand new user registration */
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      First Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Chidi"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full bg-[#070D1A] border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Last Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Okafor"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full bg-[#070D1A] border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="08012345678"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full bg-[#070D1A] border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Create Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="At least 8 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full bg-[#070D1A] border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {password.length > 0 && (
                    <div className="flex items-center gap-1.5 mt-2">
                      <div
                        className={`h-1 flex-1 rounded-full ${
                          password.length >= 8 ? 'bg-emerald-500' : 'bg-red-500'
                        }`}
                      />
                      <span className="text-[10px] text-slate-400">
                        {password.length >= 8 ? 'Strong' : 'Min 8 chars'}
                      </span>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || password.length < 8}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-sm transition-all shadow-lg shadow-sky-500/25 flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      Create Account & Join <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-500">
          &copy; 2026 XATO TECHNOLOGIES LIMITED. Enterprise VTU & Telecom Infrastructure.
        </p>
      </div>
    </div>
  );
}
