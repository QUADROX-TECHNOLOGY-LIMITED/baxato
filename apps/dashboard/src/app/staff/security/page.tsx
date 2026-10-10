'use client';

import React, { useState } from 'react';
import {
  KeyRound,
  ShieldCheck,
  Mail,
  Lock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Eye,
  EyeOff,
} from 'lucide-react';
import { getStoredAuthToken } from '@/lib/auth-session';

export default function StaffSecurityPage() {
  const [step, setStep] = useState<'REQUEST' | 'CONFIRM'>('REQUEST');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Step 1: Validate passwords and request email OTP
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!currentPassword) {
      setErrorMessage('Please enter your current password.');
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      setErrorMessage('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('New password and confirmation do not match.');
      return;
    }
    if (newPassword === currentPassword) {
      setErrorMessage('New password must be different from current password.');
      return;
    }

    try {
      setIsLoading(true);
      const token = getStoredAuthToken();
      if (!token) {
        setErrorMessage('Session expired. Please sign in again.');
        return;
      }

      const res = await fetch('/api/auth/change-password/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await res.json();
      if (res.ok && data?.success) {
        setSuccessMessage(
          data?.data?.message || 'A 6-digit verification code has been dispatched to your email address.',
        );
        setStep('CONFIRM');
      } else {
        setErrorMessage(data?.error?.message || 'Failed to request password change. Check your current password.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Network error while contacting authentication server.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Confirm with OTP and commit password change
  const handleConfirmOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!otp || otp.trim().length !== 6) {
      setErrorMessage('Please enter the 6-digit confirmation code from your email.');
      return;
    }

    try {
      setIsLoading(true);
      const token = getStoredAuthToken();
      if (!token) {
        setErrorMessage('Session expired. Please sign in again.');
        return;
      }

      const res = await fetch('/api/auth/change-password/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          otp: otp.trim(),
        }),
      });

      const data = await res.json();
      if (res.ok && data?.success) {
        setSuccessMessage('Your password has been changed successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setOtp('');
        setStep('REQUEST');
      } else {
        setErrorMessage(data?.error?.message || 'Invalid confirmation code. Please verify and try again.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Network error while confirming password change.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="pb-3 border-b border-slate-200 dark:border-slate-800">
        <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <KeyRound className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          Staff Security & Password
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Manage your backoffice credentials and update your account password with email OTP verification.
        </p>
      </div>

      {/* Notifications */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800/60 text-xs text-red-700 dark:text-red-300 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 text-xs text-emerald-700 dark:text-emerald-300 flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* STEP 1: PASSWORD FORM */}
      {step === 'REQUEST' && (
        <form
          onSubmit={handleRequestOtp}
          className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm"
        >
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Step 1: Set New Credentials</span>
          </div>

          {/* Current Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Current Password
            </label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password..."
                required
                className="w-full px-3.5 py-2.5 pr-10 rounded-xl text-xs bg-slate-50 dark:bg-[#0B132B] border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              New Password
            </label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 8 characters..."
                required
                minLength={8}
                className="w-full px-3.5 py-2.5 pr-10 rounded-xl text-xs bg-slate-50 dark:bg-[#0B132B] border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm New Password */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Confirm New Password
            </label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password..."
                required
                className="w-full px-3.5 py-2.5 pr-10 rounded-xl text-xs bg-slate-50 dark:bg-[#0B132B] border border-slate-200 dark:border-slate-700/80 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-[#0B132B] border border-slate-200/80 dark:border-slate-800 text-[11px] text-slate-500 space-y-1">
            <p className="font-medium text-slate-700 dark:text-slate-300">Security Verification:</p>
            <p>
              When you submit this request, an authentication code (OTP) will be dispatched to your registered email address to verify identity before changes are applied.
            </p>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Verifying & Sending Code...</span>
              </>
            ) : (
              <>
                <span>Send Verification Code</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>
      )}

      {/* STEP 2: EMAIL OTP CONFIRMATION */}
      {step === 'CONFIRM' && (
        <form
          onSubmit={handleConfirmOtp}
          className="p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 space-y-4 shadow-sm"
        >
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800">
            <Mail className="w-4 h-4 text-blue-500" />
            <span>Step 2: Enter Email Confirmation Code</span>
          </div>

          <p className="text-xs text-slate-500">
            A 6-digit confirmation code was sent to your registered email address. Enter the code below to complete the password update.
          </p>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
              6-Digit Confirmation Code (OTP)
            </label>
            <input
              type="text"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="123456"
              required
              className="w-full px-3.5 py-3 rounded-xl text-center text-lg font-mono tracking-[0.3em] font-bold bg-slate-50 dark:bg-[#0B132B] border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setStep('REQUEST');
                setErrorMessage('');
              }}
              className="py-2.5 px-4 rounded-xl text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={isLoading || otp.length !== 6}
              className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Updating Password...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Confirm Password Change</span>
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
