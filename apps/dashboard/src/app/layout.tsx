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
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('baxato_theme');
                  var supportDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  if (theme === 'dark' || (!theme && supportDarkMode)) {
                    document.documentElement.classList.add('dark');
                  } else {
                    document.documentElement.classList.remove('dark');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-[#F8FAFC] dark:bg-[#07111F] text-[#526173] dark:text-[#A8B5C7] antialiased">
        {children}
      </body>
    </html>
  );
}
