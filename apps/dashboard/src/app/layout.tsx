import type { Metadata, Viewport } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';

export const dynamic = 'force-dynamic';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'BAXATO',
  description: 'BAXATO by XATO TECHNOLOGIES LIMITED',
  icons: {
    icon: '/baxato-logo.jpg',
  },
};

import ThemeSynchronizer from '@/components/ThemeSynchronizer';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const clerkPubKey =
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ||
    process.env.CLERK_PUBLISHABLE_KEY ||
    '';
  const isClerkConfigured = Boolean(clerkPubKey && clerkPubKey.startsWith('pk_'));

  const content = (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#ffffff" id="meta-theme-color" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var stored = localStorage.getItem('baxato_theme');
                  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  var isDark = stored === 'dark' || ((!stored || stored === 'system') && prefersDark);
                  if (isDark) {
                    document.documentElement.classList.add('dark');
                    document.documentElement.style.colorScheme = 'dark';
                  } else {
                    document.documentElement.classList.remove('dark');
                    document.documentElement.style.colorScheme = 'light';
                  }
                  var meta = document.getElementById('meta-theme-color');
                  if (meta) {
                    meta.setAttribute('content', isDark ? '#070D18' : '#ffffff');
                  }
                } catch (err) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-slate-50 dark:bg-[#070D18] text-slate-800 dark:text-slate-100 antialiased selection:bg-blue-100 selection:text-[#126BEB]">
        <ThemeSynchronizer />
        {isClerkConfigured ? (
          children
        ) : (
          <div className="min-h-screen flex items-center justify-center p-6 bg-[#070D18] text-white">
            <div className="max-w-md w-full p-8 rounded-2xl bg-[#0D1726] border border-amber-500/30 text-center shadow-2xl">
              <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 text-xl font-bold">
                ⚠️
              </div>
              <h1 className="text-lg font-bold text-white mb-2">Clerk Pro Configuration Required</h1>
              <p className="text-xs text-slate-300 mb-4 leading-relaxed">
                The BAXATO Dashboard requires <code className="text-amber-400 font-mono font-semibold">NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code> to dispatch verification emails and manage authentication.
              </p>
              <div className="p-3 rounded-lg bg-black/40 border border-slate-800 text-[11px] text-slate-400 text-left mb-4 font-mono">
                Coolify &rarr; Baxato Dashboard &rarr; Environment Variables &rarr; add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_...
              </div>
              <p className="text-[11px] text-slate-500">
                Once added, redeploy the container to activate live authentication.
              </p>
            </div>
          </div>
        )}
      </body>
    </html>
  );

  if (isClerkConfigured) {
    return (
      <ClerkProvider publishableKey={clerkPubKey}>
        {content}
      </ClerkProvider>
    );
  }

  return content;
}

