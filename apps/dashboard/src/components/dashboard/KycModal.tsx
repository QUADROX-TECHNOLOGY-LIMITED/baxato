'use client';

import React, { useEffect, useId, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  X,
} from 'lucide-react';
import ModalDialog from '@/components/ModalDialog';
import {
  getStoredAuthToken,
  getStoredUser,
  handleAuthResponse,
} from '@/lib/auth-session';
import { showToast } from '@/lib/toast';

interface KycModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedUser: Record<string, unknown>) => void;
  userFirstName?: string;
  userLastName?: string;
}

export default function KycModal({
  isOpen,
  onClose,
  onSuccess,
  userFirstName: initialFirstName,
  userLastName: initialLastName,
}: KycModalProps) {
  const titleId = useId();
  const firstNameId = useId();
  const lastNameId = useId();
  const ninId = useId();
  const ninHintId = useId();
  const dobId = useId();
  const errFirstId = useId();
  const errLastId = useId();
  const errNinId = useId();
  const errDobId = useId();

  const firstNameRef = useRef<HTMLInputElement>(null);
  const lastNameRef = useRef<HTMLInputElement>(null);
  const ninRef = useRef<HTMLInputElement>(null);
  const dobRef = useRef<HTMLInputElement>(null);

  const [nin, setNin] = useState('');
  const [dob, setDob] = useState('');
  const [firstName, setFirstName] = useState(initialFirstName || '');
  const [lastName, setLastName] = useState(initialLastName || '');
  const [touched, setTouched] = useState({
    firstName: false,
    lastName: false,
    nin: false,
    dob: false,
  });
  const [isVerifying, setIsVerifying] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isVerifiedSuccess, setIsVerifiedSuccess] = useState(false);

  const maxAdultDob = new Date(
    Date.now() - 18 * 365.25 * 24 * 60 * 60 * 1000,
  )
    .toISOString()
    .split('T')[0];

  useEffect(() => {
    if (!isOpen) {
      setIsVerifiedSuccess(false);
      setSubmitError(null);
      setNin('');
      setDob('');
      setTouched({ firstName: false, lastName: false, nin: false, dob: false });
      return;
    }

    const stored = getStoredUser();
    setFirstName(initialFirstName || stored?.firstName || '');
    setLastName(initialLastName || stored?.lastName || '');
  }, [initialFirstName, initialLastName, isOpen]);

  const firstNameError =
    touched.firstName && !firstName.trim() ? 'Enter your first name.' : '';
  const lastNameError =
    touched.lastName && !lastName.trim() ? 'Enter your last name.' : '';
  const ninError =
    touched.nin && nin.length !== 11
      ? 'Enter your 11-digit National Identification Number.'
      : '';
  const dobError =
    touched.dob && !dob ? 'Select your date of birth.' : '';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setTouched({ firstName: true, lastName: true, nin: true, dob: true });

    if (!firstName.trim()) {
      firstNameRef.current?.focus();
      return;
    }
    if (!lastName.trim()) {
      lastNameRef.current?.focus();
      return;
    }
    if (nin.length !== 11) {
      ninRef.current?.focus();
      return;
    }
    if (!dob) {
      dobRef.current?.focus();
      return;
    }

    setIsVerifying(true);
    try {
      const authToken = getStoredAuthToken() || '';
      const response = await fetch('/api/kyc/verify-nin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          nin,
          dob,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
        }),
      });

      const result = await response.json().catch(() => null);
      if (handleAuthResponse(response, result)) return;

      if (!response.ok || !result?.success) {
        const msg =
          result?.error?.message ||
          result?.message ||
          'Verification failed. Check your details and try again.';
        setSubmitError(msg);
        return;
      }

      try {
        const raw = localStorage.getItem('bx_user');
        if (raw) {
          const userObj = JSON.parse(raw);
          userObj.kycStatus = 'VERIFIED';
          if (result.data?.user) {
            Object.assign(userObj, result.data.user);
          }
          localStorage.setItem('bx_user', JSON.stringify(userObj));
          window.dispatchEvent(new CustomEvent('bx_user_updated'));
        }
      } catch {
        // Ignore storage error
      }

      setIsVerifiedSuccess(true);
      showToast({ type: 'success', message: 'Identity verified.' });
      onSuccess(
        result.data?.user || {
          kycStatus: 'VERIFIED',
          firstName: firstName.trim(),
          lastName: lastName.trim(),
        },
      );
    } catch {
      setSubmitError('Network error while verifying identity. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <ModalDialog
      isOpen={isOpen}
      onClose={() => !isVerifying && onClose()}
      dismissible={!isVerifying}
      ariaLabelledBy={titleId}
      maxWidthClass="max-w-md"
      className="bg-white dark:bg-[#0B1528]"
    >
      {isVerifiedSuccess ? (
        <div className="p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" aria-hidden="true" />
          </div>

          <div className="space-y-1">
            <h2
              id={titleId}
              className="text-base font-semibold text-slate-900 dark:text-white"
            >
              Identity verified
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Your NIMC identity details match. Wallet funding and live access are active.
            </p>
          </div>

          <button
            type="button"
            autoFocus
            onClick={onClose}
            className="w-full h-11 rounded-lg bg-[#126BEB] hover:bg-[#0B5CC7] text-white font-medium text-sm transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      ) : (
        <>
          <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-[#126BEB] dark:text-[#38BDF8] flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h2
                  id={titleId}
                  className="text-base font-semibold text-slate-900 dark:text-white truncate"
                >
                  Identity Verification
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  Verify with your NIMC National Identification Number
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => !isVerifying && onClose()}
              disabled={isVerifying}
              aria-label="Close verification dialog"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} noValidate className="p-6 space-y-4">
            {submitError && (
              <div
                role="alert"
                className="p-3 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800/60 text-red-700 dark:text-red-300 text-xs font-medium flex items-start gap-2"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                <span>{submitError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="space-y-1.5">
                <label
                  htmlFor={firstNameId}
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                >
                  First name
                </label>
                <input
                  ref={firstNameRef}
                  id={firstNameId}
                  name="firstName"
                  type="text"
                  required
                  autoComplete="given-name"
                  value={firstName}
                  aria-invalid={Boolean(firstNameError)}
                  aria-describedby={firstNameError ? errFirstId : undefined}
                  onChange={(e) => {
                    setFirstName(e.target.value);
                    if (submitError) setSubmitError(null);
                  }}
                  onBlur={() => {
                    if (firstName || touched.firstName) {
                      setTouched((prev) => ({ ...prev, firstName: true }));
                    }
                  }}
                  placeholder="First name"
                  className={`w-full h-11 px-3.5 text-base sm:text-sm rounded-lg border bg-white dark:bg-[#070D18] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                    firstNameError
                      ? 'border-red-500 focus:ring-red-500/40'
                      : 'border-slate-300 dark:border-slate-700 focus:ring-[#126BEB]'
                  }`}
                />
                {firstNameError && (
                  <p id={errFirstId} className="text-xs text-red-600 dark:text-red-400">
                    {firstNameError}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor={lastNameId}
                  className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                >
                  Last name
                </label>
                <input
                  ref={lastNameRef}
                  id={lastNameId}
                  name="lastName"
                  type="text"
                  required
                  autoComplete="family-name"
                  value={lastName}
                  aria-invalid={Boolean(lastNameError)}
                  aria-describedby={lastNameError ? errLastId : undefined}
                  onChange={(e) => {
                    setLastName(e.target.value);
                    if (submitError) setSubmitError(null);
                  }}
                  onBlur={() => {
                    if (lastName || touched.lastName) {
                      setTouched((prev) => ({ ...prev, lastName: true }));
                    }
                  }}
                  placeholder="Last name"
                  className={`w-full h-11 px-3.5 text-base sm:text-sm rounded-lg border bg-white dark:bg-[#070D18] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                    lastNameError
                      ? 'border-red-500 focus:ring-red-500/40'
                      : 'border-slate-300 dark:border-slate-700 focus:ring-[#126BEB]'
                  }`}
                />
                {lastNameError && (
                  <p id={errLastId} className="text-xs text-red-600 dark:text-red-400">
                    {lastNameError}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor={ninId}
                className="block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                National Identification Number (NIN)
              </label>
              <span id={ninHintId} className="block text-[11px] text-slate-500 dark:text-slate-400">
                11 digits matching your legal name
              </span>
              <input
                ref={ninRef}
                id={ninId}
                name="nin"
                type="text"
                inputMode="numeric"
                required
                autoFocus
                maxLength={11}
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                placeholder="12345678901"
                value={nin}
                aria-invalid={Boolean(ninError)}
                aria-describedby={ninError ? `${ninHintId} ${errNinId}` : ninHintId}
                onChange={(e) => {
                  setNin(e.target.value.replace(/\D/g, '').slice(0, 11));
                  if (submitError) setSubmitError(null);
                }}
                onBlur={() => {
                  if (nin || touched.nin) {
                    setTouched((prev) => ({ ...prev, nin: true }));
                  }
                }}
                className={`w-full h-11 px-3.5 text-base sm:text-sm font-mono rounded-lg border bg-white dark:bg-[#070D18] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 ${
                  ninError
                    ? 'border-red-500 focus:ring-red-500/40'
                    : 'border-slate-300 dark:border-slate-700 focus:ring-[#126BEB]'
                }`}
              />
              {ninError && (
                <p id={errNinId} className="text-xs text-red-600 dark:text-red-400">
                  {ninError}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor={dobId}
                className="block text-xs font-medium text-slate-700 dark:text-slate-300"
              >
                Date of birth
              </label>
              <input
                ref={dobRef}
                id={dobId}
                name="dob"
                type="date"
                required
                max={maxAdultDob}
                value={dob}
                aria-invalid={Boolean(dobError)}
                aria-describedby={dobError ? errDobId : undefined}
                onChange={(e) => {
                  setDob(e.target.value);
                  if (submitError) setSubmitError(null);
                }}
                onBlur={() => {
                  if (dob || touched.dob) {
                    setTouched((prev) => ({ ...prev, dob: true }));
                  }
                }}
                className={`w-full h-11 px-3.5 text-base sm:text-sm rounded-lg border bg-white dark:bg-[#070D18] text-slate-900 dark:text-white focus:outline-none focus:ring-2 ${
                  dobError
                    ? 'border-red-500 focus:ring-red-500/40'
                    : 'border-slate-300 dark:border-slate-700 focus:ring-[#126BEB]'
                }`}
              />
              {dobError && (
                <p id={errDobId} className="text-xs text-red-600 dark:text-red-400">
                  {dobError}
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                disabled={isVerifying}
                onClick={onClose}
                className="h-11 px-4 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isVerifying}
                className="h-11 px-5 rounded-lg bg-[#126BEB] hover:bg-[#0B5CC7] text-white font-medium text-sm transition-colors inline-flex items-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {isVerifying && (
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                )}
                <span>Verify</span>
              </button>
            </div>
          </form>
        </>
      )}
    </ModalDialog>
  );
}
