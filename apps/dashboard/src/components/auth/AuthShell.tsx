'use client';

import type { ReactNode } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Headphones } from 'lucide-react';

export const AUTH_INPUT_CLASS =
  'w-full h-11 px-3.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0D1726] text-base sm:text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-[#126BEB] focus:ring-2 focus:ring-[#126BEB]/15 dark:focus:border-[#38BDF8] dark:focus:ring-[#38BDF8]/15 transition-colors';

export const AUTH_PRIMARY_BUTTON_CLASS =
  'w-full h-11 px-4 rounded-lg bg-[#126BEB] hover:bg-[#0E59C9] text-white text-sm font-medium transition-colors disabled:opacity-45 disabled:cursor-not-allowed flex items-center justify-center gap-2';

interface PlatformCapability {
  title: string;
  description: string;
}

const PLATFORM_CAPABILITIES: PlatformCapability[] = [
  {
    title: 'Airtime & Data',
    description: 'Nigerian and international airtime top-ups, plus mobile data bundles.',
  },
  {
    title: 'Electricity & Cable TV',
    description: 'Prepaid and postpaid electricity tokens and TV subscriptions.',
  },
  {
    title: 'Exam PINs',
    description: 'Direct PIN issuance for WAEC and JAMB.',
  },
  {
    title: 'Developer API & Webhooks',
    description: 'Integrate top-ups and bill payments via REST API with live callbacks.',
  },
];

interface AuthShellProps {
  children: ReactNode;
  isLoading?: boolean;
  maxWidthClass?: string;
}

/**
 * Shared responsive authentication layout for merchant Login and Create Account flows.
 */
export default function AuthShell({
  children,
  isLoading = false,
  maxWidthClass = 'max-w-[420px]',
}: AuthShellProps) {
  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white dark:bg-[#070D18] text-slate-900 dark:text-slate-100 transition-colors duration-200 relative overflow-x-hidden">
      <AnimatePresence>
        {isLoading && (
          <motion.div
            key="auth-loading-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            role="status"
            aria-live="polite"
            aria-label="Loading"
            className="fixed inset-0 z-[100] flex items-center justify-center bg-white/95 dark:bg-[#070D18]/95 backdrop-blur-sm select-none h-[100dvh] w-screen overflow-hidden"
          >
            <div className="flex flex-col items-center gap-5">
              <div className="relative w-14 h-14 flex items-center justify-center">
                <div className="relative w-full h-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0D1726] shadow-sm flex items-center justify-center p-2.5">
                  <div className="relative w-full h-full">
                    <Image
                      src="/baxato-logo.jpg"
                      alt="BAXATO"
                      fill
                      priority
                      className="object-contain rounded-md"
                    />
                  </div>
                </div>
                <motion.span
                  aria-hidden="true"
                  className="absolute -inset-2 rounded-[20px] border-2 border-transparent border-t-[#126BEB] dark:border-t-[#38BDF8]"
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 0.85, ease: 'linear' }}
                />
              </div>

              <div className="w-24 h-1 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                <motion.div
                  className="h-full w-1/2 rounded-full bg-[#126BEB] dark:bg-[#38BDF8]"
                  animate={{ x: ['-100%', '200%'] }}
                  transition={{ repeat: Infinity, duration: 1.05, ease: 'easeInOut' }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Left Desktop Showcase Panel */}
      <aside className="hidden lg:flex lg:w-1/2 bg-slate-50 dark:bg-[#0A1322] border-r border-slate-200/90 dark:border-slate-800/80 p-12 xl:p-16 flex-col justify-between">
        <div>
          <Link href="/" className="inline-flex items-center gap-2.5">
            <div className="relative w-9 h-9 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-white p-1">
              <Image
                src="/baxato-logo.jpg"
                alt="BAXATO"
                fill
                priority
                className="object-contain"
              />
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-900 dark:text-white">
              BAXATO
            </span>
          </Link>
        </div>

        <div className="max-w-md my-10">
          <h2 className="text-2xl xl:text-[28px] font-semibold tracking-tight text-slate-900 dark:text-white leading-snug">
            Bill payments, airtime &amp; developer API
          </h2>
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
            Manage airtime top-ups, data, utility bills, exam PINs, and API integrations from one dashboard.
          </p>

          <ul className="mt-8 pt-7 border-t border-slate-200/80 dark:border-slate-800 space-y-4">
            {PLATFORM_CAPABILITIES.map((item) => (
              <li key={item.title} className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className="mt-2 w-1.5 h-1.5 rounded-full bg-[#126BEB] dark:bg-[#38BDF8] shrink-0"
                />
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {item.title}
                  </p>
                  <p className="text-[13px] text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-7 pt-5 border-t border-slate-200/80 dark:border-slate-800 flex items-start gap-3">
            <Headphones className="w-4 h-4 text-[#126BEB] dark:text-[#38BDF8] mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                Dedicated Support
              </p>
              <p className="text-[13px] text-slate-600 dark:text-slate-400 mt-0.5">
                24/7 technical and account onboarding assistance.
              </p>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-200/80 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
          <p>&copy; 2026 XATO TECHNOLOGIES LIMITED. All rights reserved.</p>
        </div>
      </aside>

      {/* Right Auth Form Column */}
      <main className="w-full lg:w-1/2 flex flex-col justify-center items-center px-5 py-8 sm:px-8 sm:py-12 lg:p-12 xl:p-16">
        <div className={`w-full ${maxWidthClass} mx-auto`}>
          <div className="lg:hidden flex items-center justify-center gap-2.5 mb-7">
            <div className="relative w-9 h-9 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-white p-1">
              <Image
                src="/baxato-logo.jpg"
                alt="BAXATO"
                fill
                priority
                className="object-contain"
              />
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-900 dark:text-white">
              BAXATO
            </span>
          </div>

          {children}
        </div>
      </main>
    </div>
  );
}

