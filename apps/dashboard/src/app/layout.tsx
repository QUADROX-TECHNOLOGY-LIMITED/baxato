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
import GlobalNotificationToast from '@/components/GlobalNotificationToast';

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
    <html lang="en" className="bg-white dark:bg-[#070D18]" suppressHydrationWarning>
      <head>
        <meta name="color-scheme" content="light dark" id="meta-color-scheme" />
        <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" data-baxato-theme-color="system-light" />
        <meta name="theme-color" content="#070D18" media="(prefers-color-scheme: dark)" data-baxato-theme-color="system-dark" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var stored = localStorage.getItem('baxato_theme');
                  var isExplicit = stored === 'light' || stored === 'dark';
                  var scheme = isExplicit ? stored : 'light dark';
                  var metaScheme = document.getElementById('meta-color-scheme');
                  if (metaScheme) {
                    metaScheme.setAttribute('content', scheme);
                  }
                  var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  var isDark = stored === 'dark' || ((!stored || stored === 'system') && prefersDark);
                  var bg = isDark ? '#070D18' : '#ffffff';
                  document.documentElement.classList.toggle('dark', isDark);
                  if (!window.CSS || !window.CSS.supports || !window.CSS.supports('selector(:has(*))')) {
                    document.documentElement.style.colorScheme = scheme;
                  }
                  document.documentElement.style.backgroundColor = bg;
                  if (isExplicit) {
                    var metas = document.querySelectorAll('meta[name="theme-color"]');
                    for (var i = 0; i < metas.length; i++) {
                      metas[i].parentNode && metas[i].parentNode.removeChild(metas[i]);
                    }
                    var single = document.createElement('meta');
                    single.name = 'theme-color';
                    single.id = 'meta-theme-color';
                    single.content = bg;
                    document.head.appendChild(single);
                  }
                } catch (err) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-white dark:bg-[#070D18] text-slate-800 dark:text-slate-100 antialiased selection:bg-blue-100 selection:text-[#126BEB]">
        <ThemeSynchronizer />
        <GlobalNotificationToast />
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

