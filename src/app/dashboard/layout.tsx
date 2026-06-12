// src/app/dashboard/layout.tsx
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/modules/auth/session';
import Sidebar from '@/components/dashboard/Sidebar';
import MobileHeader from '@/components/dashboard/MobileHeader';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 1. Authenticate & Fetch Live User Data
  const cookieStore = await cookies();
  const token = cookieStore.get('baxato_access')?.value;

  if (!token) redirect('/login');

  const payload = await verifyAccessToken(token);
  if (!payload?.userId) redirect('/login');

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      firstName: true,
      lastName: true,
      role: true,
      profilePicture: true,
      isKycCompleted: true,
      // Check if API keys exist to drive the "API Status" badge
      apiKeys: {
        take: 1,
        select: { id: true }
      }
    }
  });

  if (!user) redirect('/login');

  return (
    <div className="min-h-screen bg-[#f8fafc] flex overflow-hidden font-sans">
      
      {/* 2. Desktop Sidebar (Hidden on mobile) */}
      <Sidebar 
        user={user} 
        apiLive={user.apiKeys.length > 0} 
      />

      {/* 3. Main Stage */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        
        {/* Mobile-Only Toggle Header */}
        <MobileHeader user={user} />

        {/* Scrollable Content Container */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10">
          {/* Injecting Analytics, Wallets, or Documentation here */}
          <div className="max-w-[1600px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
