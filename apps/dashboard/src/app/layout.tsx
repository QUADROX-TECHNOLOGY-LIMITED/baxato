import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import './globals.css';

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
  const clerkPubKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const isClerkConfigured = clerkPubKey && !clerkPubKey.includes('dummy') && clerkPubKey.startsWith('pk_');

  const content = (
    <html lang="en">
      <body className="min-h-screen bg-white text-slate-600 antialiased selection:bg-blue-100 selection:text-[#126BEB]">
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
