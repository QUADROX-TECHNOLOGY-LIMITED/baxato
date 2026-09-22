import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BAXATO — Enterprise VTU & Telecom Infrastructure',
  description: 'Multi-Tenant Telecom Infrastructure & Bill Payments Platform by XATO TECHNOLOGIES LIMITED',
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
      <body className="min-h-screen bg-[#F8FAFC] dark:bg-[#07111F] text-[#526173] dark:text-[#A8B5C7] antialiased">
        {children}
      </body>
    </html>
  );
}
