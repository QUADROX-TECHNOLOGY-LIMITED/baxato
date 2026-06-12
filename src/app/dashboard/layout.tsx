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
  const cookieStore = await cookies();
  const token = cookieStore.get('baxato_access')?.value;

  // Use the loop breaker if validation fails
  if (!token) redirect('/login?clear_session=true');

  const payload = await verifyAccessToken(token);
  if (!payload?.userId) redirect('/login?clear_session=true');

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      firstName: true,
      lastName: true,
      role: true,
      profilePicture: true,
      isKycCompleted: true,
      businessName: true,
      apiKeys: {
        take: 1,
        select: { id: true }
      }
    }
  });

  // If the user was deleted from the database, destroy their cookie to break the loop!
  if (!user) redirect('/login?clear_session=true');

  return (
    <div className="min-h-screen bg-[#f8fafc] flex overflow-hidden font-sans">
      <Sidebar user={user} apiLive={user.apiKeys.length > 0} />
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <MobileHeader user={user} />
        <main className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-10">
          <div className="max-w-[1600px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
