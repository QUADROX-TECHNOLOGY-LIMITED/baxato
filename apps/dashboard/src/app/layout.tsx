import type { Metadata } from 'next';
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
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#FAFAF9] text-stone-600 antialiased selection:bg-amber-200 selection:text-stone-900">
        {children}
      </body>
    </html>
  );
}
