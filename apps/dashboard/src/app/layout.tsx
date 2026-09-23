import type { Metadata, Viewport } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  title: 'BAXATO',
  description: 'BAXATO by XATO TECHNOLOGIES LIMITED',
  icons: {
    icon: '/baxato-logo.jpg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const clerkPubKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || process.env.CLERK_PUBLISHABLE_KEY;
  const isClerkConfigured = clerkPubKey && !clerkPubKey.includes('dummy') && clerkPubKey.startsWith('pk_');

  const content = (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  function applyTheme(e) {
                    if (e.matches) {
                      document.documentElement.classList.add('dark');
                    } else {
                      document.documentElement.classList.remove('dark');
                    }
                  }
                  var mq = window.matchMedia('(prefers-color-scheme: dark)');
                  applyTheme(mq);
                  mq.addEventListener('change', applyTheme);
                } catch (err) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-white dark:bg-[#070D18] text-slate-600 dark:text-slate-400 antialiased selection:bg-blue-100 selection:text-[#126BEB]">
        {children}
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
