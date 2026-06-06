import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import Link from 'next/link';
import Image from 'next/image';
import { 
  LayoutDashboard, 
  Wallet, 
  History, 
  Settings, 
  LogOut,
  CreditCard,
  Phone
} from 'lucide-react';

import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/modules/auth/session';
import { KycModal } from '@/modules/kyc/components/KycModal';

// --- NAVIGATION CONFIG ---
const navigation = [
  { name: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Wallets & Funding', href: '/dashboard/wallet', icon: Wallet },
  { name: 'Buy Airtime/Data', href: '/dashboard/services', icon: Phone },
  { name: 'Transactions', href: '/dashboard/transactions', icon: History },
  { name: 'Cards', href: '/dashboard/cards', icon: CreditCard },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 1. Authenticate the user via Edge Middleware cookies
  const cookieStore = await cookies();
  const token = cookieStore.get('baxato_access')?.value;

  if (!token) {
    redirect('/login');
  }

  const payload = await verifyAccessToken(token);
  if (!payload?.userId) {
    redirect('/login');
  }

  // 2. Fetch the User's core profile and KYC status
  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: {
      firstName: true,
      lastName: true,
      isKycCompleted: true,
      profilePicture: true,
      role: true,
    }
  });

  if (!user) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] flex">
      
      {/* --- KYC ENFORCEMENT GATE --- */}
      {!user.isKycCompleted && <KycModal />}

      {/* --- SIDEBAR NAVIGATION --- */}
      <div className="w-64 bg-white border-r border-gray-200 hidden md:flex flex-col">
        {/* Brand Area */}
        <div className="h-20 flex items-center px-6 border-b border-gray-100 shrink-0">
          <Image 
            src="/baxato-logo.png" 
            alt="BAXATO" 
            width={140} 
            height={40} 
            className="h-8 w-auto object-contain"
          />
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          {navigation.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:text-[#1c44e4] hover:bg-blue-50 transition-colors"
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {item.name}
            </Link>
          ))}
        </nav>

        {/* User Profile Footer */}
        <div className="p-4 border-t border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-gray-100 border border-gray-200 overflow-hidden shrink-0">
              {user.profilePicture ? (
                <Image src={user.profilePicture} alt="Profile" width={40} height={40} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center bg-[#1c44e4] text-white font-bold">
                  {user.firstName[0]}{user.lastName[0]}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-xs text-gray-500 truncate capitalize">{user.role.toLowerCase()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* --- MAIN CONTENT AREA --- */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        
        {/* Mobile Header (Visible only on small screens) */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:hidden shrink-0">
          <Image src="/baxato-logo.png" alt="BAXATO" width={100} height={30} className="h-6 w-auto" />
          <button className="text-gray-500">Menu</button>
        </header>

        {/* Page Content Injection Point */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          {children}
        </main>
      </div>

    </div>
  );
}
