'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, Wallet, List, Users, 
  Phone, Zap, Tv, GraduationCap, 
  Key, Webhook, Book, 
  BarChart3, Settings, HelpCircle, 
  ChevronRight, LogOut 
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Utility for clean conditional classes
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Sidebar({ user, apiLive }: { user: any; apiLive: boolean }) {
  const pathname = usePathname();

  const NavItem = ({ href, icon: Icon, label }: any) => {
    const isActive = pathname === href;
    return (
      <Link
        href={href}
        className={cn(
          "flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all group",
          isActive 
            ? "bg-blue-50 text-[#1c44e4]" 
            : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
        )}
      >
        <div className="flex items-center gap-3">
          <Icon className={cn("h-5 w-5", isActive ? "text-[#1c44e4]" : "text-gray-400 group-hover:text-gray-600")} />
          <span>{label}</span>
        </div>
        {isActive && <div className="w-1.5 h-1.5 rounded-full bg-[#1c44e4]" />}
      </Link>
    );
  };

  const NavGroup = ({ title, children }: any) => (
    <div className="pt-6 space-y-1">
      <p className="px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">{title}</p>
      {children}
    </div>
  );

  return (
    <aside className="w-72 bg-white border-r border-gray-100 hidden lg:flex flex-col shrink-0 h-screen">
      {/* Brand Logo Area */}
      <div className="h-24 flex items-center px-8">
        <Image src="/baxato-logo.png" alt="BAXATO" width={140} height={40} className="h-8 w-auto object-contain" />
      </div>

      {/* Main Navigation Scroll Area */}
      <nav className="flex-1 overflow-y-auto px-4 custom-scrollbar">
        <div className="space-y-1">
          <NavItem href="/dashboard" icon={LayoutDashboard} label="Dashboard" />
          <NavItem href="/dashboard/wallet" icon={Wallet} label="Wallet & Funding" />
          <NavItem href="/dashboard/transactions" icon={List} label="Transactions" />
          <NavItem href="/dashboard/beneficiaries" icon={Users} label="Beneficiaries" />
        </div>

        <NavGroup title="Pay Bills">
          <NavItem href="/dashboard/airtime-data" icon={Phone} label="Airtime & Data" />
          <NavItem href="/dashboard/electricity" icon={Zap} label="Electricity" />
          <NavItem href="/dashboard/cable-tv" icon={Tv} label="Cable TV" />
          <NavItem href="/dashboard/exam-pins" icon={GraduationCap} label="Exam PINs" />
        </NavGroup>

        <NavGroup title="API & Integration">
          <NavItem href="/dashboard/api-keys" icon={Key} label="API Keys" />
          <NavItem href="/dashboard/webhooks" icon={Webhook} label="Webhooks" />
        </NavGroup>

        <NavGroup title="Developers">
          <NavItem href="/dashboard/docs" icon={Book} label="Documentation" />
        </NavGroup>

        <div className="pt-6 border-t border-gray-50 mt-4 space-y-1">
          <NavItem href="/dashboard/analytics" icon={BarChart3} label="Analytics" />
          <NavItem href="/dashboard/settings" icon={Settings} label="Settings" />
          <NavItem href="/dashboard/support" icon={HelpCircle} label="Support" />
        </div>
      </nav>

      {/* Footer: API Status & User Profile */}
      <div className="p-4 space-y-4 bg-white border-t border-gray-50">
        {/* API Status Card */}
        <div className="bg-[#1c44e4] rounded-2xl p-4 text-white shadow-lg shadow-blue-100 relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1">
              <div className={cn("h-2 w-2 rounded-full", apiLive ? "bg-green-400" : "bg-yellow-400 animate-pulse")} />
              <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                {apiLive ? 'Your API is live' : 'API Connection Pending'}
              </p>
            </div>
            <p className="text-xs font-medium leading-relaxed">
              {apiLive ? 'Infrastructure ready for production traffic.' : 'Set up your keys to begin integration.'}
            </p>
          </div>
          {/* Decorative background shape */}
          <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-white/10 rounded-full blur-2xl" />
        </div>

        {/* User Profile Bar */}
        <div className="flex items-center justify-between bg-gray-50 p-2 rounded-2xl border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-[#1c44e4] text-white flex items-center justify-center font-bold text-sm overflow-hidden shrink-0">
              {user.profilePicture ? (
                <Image src={user.profilePicture} alt="Avatar" width={40} height={40} className="object-cover h-full w-full" />
              ) : (
                <span>{user.firstName[0]}{user.lastName[0]}</span>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">{user.firstName} {user.lastName}</p>
              <p className="text-[10px] text-gray-500 uppercase font-bold tracking-tight">{user.role}</p>
            </div>
          </div>
          <button className="p-2 text-gray-400 hover:text-red-500 transition-colors">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
