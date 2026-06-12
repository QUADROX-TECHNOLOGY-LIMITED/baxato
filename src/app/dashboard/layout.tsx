// src/app/dashboard/layout.tsx
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/modules/auth/session';
import DashboardShell from '@/components/dashboard/DashboardShell';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const token = cookieStore.get('baxato_access')?.value;

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
      apiKeys: { take: 1, select: { id: true } }
    }
  });

  if (!user) redirect('/login?clear_session=true');

  return (
    <DashboardShell user={user} apiLive={user.apiKeys.length > 0}>
      {children}
    </DashboardShell>
  );
}
