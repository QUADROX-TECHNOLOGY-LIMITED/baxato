import React from 'react';
import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';

interface AccessRestrictedProps {
  title?: string;
  description: string;
}

export default function AccessRestricted({
  title = 'Access Restricted',
  description,
}: AccessRestrictedProps) {
  return (
    <div className="bg-white dark:bg-[#0A1220] border border-slate-200 dark:border-slate-800 rounded-2xl p-8 max-w-md mx-auto text-center space-y-4 shadow-xs mt-12">
      <div className="w-12 h-12 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center text-amber-600 dark:text-amber-400 mx-auto">
        <ShieldAlert className="w-6 h-6" />
      </div>
      <div className="space-y-1.5">
        <h1 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          {description}
        </p>
      </div>
      <div className="pt-2">
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center w-full px-4 py-2.5 rounded-lg bg-[#126BEB] text-white font-medium text-xs sm:text-sm hover:bg-[#0B5CC7] transition-colors"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
