'use client';

import React, { useState } from 'react';
import {
  X,
  Building2,
  Mail,
  Globe,
  Phone,
  ShieldCheck,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { getStoredAuthToken, setActiveBusiness } from '@/lib/auth-session';

interface CreateBusinessModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newBusiness: any) => void;
  currentCount?: number;
}

export default function CreateBusinessModal({
  isOpen,
  onClose,
  onSuccess,
  currentCount = 1,
}: CreateBusinessModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName || trimmedName.length < 2) {
      setErrorMessage('Business name must be at least 2 characters.');
      return;
    }

    if (!trimmedEmail || !trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
      setErrorMessage('Please enter a valid business email address.');
      return;
    }

    try {
      setIsSubmitting(true);
      const token = getStoredAuthToken();
      if (!token) {
        setErrorMessage('Authentication session expired. Please log in again.');
        return;
      }

      const payload: Record<string, any> = {
        name: trimmedName,
        email: trimmedEmail,
      };

      if (websiteUrl.trim()) {
        payload.websiteUrl = websiteUrl.trim();
      }
      if (phoneNumber.trim()) {
        payload.phoneNumber = phoneNumber.trim();
      }

      const res = await fetch('/api/businesses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      if (res.ok && data?.success) {
        const createdBiz = data.data.business;
        const newToken = data.data.token;

        // Set as active business
        setActiveBusiness(
          {
            id: createdBiz.id,
            name: createdBiz.name,
            slug: createdBiz.slug,
            email: createdBiz.email,
            phoneNumber: createdBiz.phoneNumber,
            role: 'BUSINESS_OWNER',
          },
          newToken,
        );

        onSuccess(createdBiz);
        onClose();
      } else {
        const msg =
          data?.error?.message ||
          data?.message ||
          'Failed to create business. Please check details and try again.';
        setErrorMessage(msg);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'A network error occurred.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white dark:bg-[#0D1726] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-[#080E1A]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                Add New Business Workspace
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Workspace {currentCount + 1} of 3 • Dedicated isolated wallets
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-800 transition disabled:opacity-50"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Identity Verified Callout (No NIN re-verification needed) */}
          <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/60 flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-[11.5px] leading-relaxed text-emerald-900 dark:text-emerald-200">
              <span className="font-semibold block">Merchant Identity Verified</span>
              Your existing account verification applies to this business workspace automatically. No NIN or document re-verification is required.
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Business Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Business Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Building2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                required
                placeholder="e.g. Apex Digital VTU Services"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={isSubmitting}
                className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl bg-white dark:bg-[#070D18] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition"
              />
            </div>
          </div>

          {/* Business Email */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Business Email <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                required
                placeholder="e.g. billing@apexdigital.ng"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
                className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl bg-white dark:bg-[#070D18] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition"
              />
            </div>
            <p className="text-[10.5px] text-slate-400">
              Dedicated email for this business's receipts, notifications, and merchant alerts.
            </p>
          </div>

          {/* Website URL (Optional) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Website URL <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
            </label>
            <div className="relative">
              <Globe className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="url"
                placeholder="https://apexdigital.ng"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                disabled={isSubmitting}
                className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl bg-white dark:bg-[#070D18] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition"
              />
            </div>
          </div>

          {/* Phone Number (Optional) */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Support Phone <span className="text-[10px] text-slate-400 font-normal">(Optional)</span>
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="tel"
                placeholder="e.g. 08012345678"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                disabled={isSubmitting}
                className="w-full pl-9 pr-3.5 py-2 text-xs rounded-xl bg-white dark:bg-[#070D18] border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition"
              />
            </div>
          </div>

          {/* Modal Actions */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="py-2 px-4 rounded-xl text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="py-2 px-5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Creating Workspace...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Create Workspace</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
