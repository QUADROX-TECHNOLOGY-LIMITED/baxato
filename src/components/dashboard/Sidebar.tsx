'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, Wallet, List, Users, 
  Phone, Zap, Tv, GraduationCap, 
  Key, Webhook, Book, 
  BarChart3, Settings, HelpCircle, 
  LogOut 
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

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
          "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group",
          isActive 
            ? "bg-[#1c44e4] text-white shadow-lg shadow-blue-900/20" 
            : "text-slate-400 hover:bg-white/5 hover:text-white"
        )}
      >
        <Icon className={cn("h-5 w-5 shrink-0 transition-colors", isActive ? "text-white" : "text-slate-400 group-hover:text-white")} />
        <span className="truncate">{label}</span>
      </Link>
    );
  };

  const NavGroup = ({ title, children }: any) => (
    <div className="pt-6 space-y-1">
      <p className="px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">
        {title}
      </p>
      {children}
    </div>
  );

  return (
    // Dark theme background matching the design
    <aside className="w-72 bg-[#0B1120] border-r border-white/5 hidden lg:flex flex-col shrink-0 h-screen text-slate-300">
      
      {/* Brand Logo Area */}
      <div className="h-24 flex items-center px-8 shrink-0">
        {/* We use a white/light version of the logo for the dark sidebar */}
        <img 
          src="/baxato-logo-white.png" 
          alt="BAXATO" 
          className="h-8 w-auto object-contain" 
          onError={(e) => {
            // Fallback if white logo doesn't exist yet
            (e.target as HTMLImageElement).src = "/baxato-logo.png";
          }}
        />
      </div>

      {/* Main Navigation Scroll Area (Optimized custom scrollbar) */}
      <nav className="flex-1 overflow-y-auto px-4 pb-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent hover:scrollbar-thumb-white/20">
        <div className="space-y-1">
          <NavItem href="/dashboard" icon={LayoutDashboard} label="Dashboard" />
          <NavItem href="/dashboard/wallet" icon={Wallet} label="Wallet & Funding" />
          <NavItem href="/dashboard/transactions" icon={List} label="Transactions" />
          <NavItem href="/dashboard/beneficiaries" icon={Users} label="Beneficiaries" />
        </div>

        <NavGroup title="Pay Bills">
          <NavItem href="/dashboard/airtime-data" icon={Phone} label="Airtime & Data" />
          <NavItem href="/dashboard/electricity" icon={Zap} label="Electricity" />
          <NavItem href="/dashboard/cable-tv" icon={Tv} label="TV Subscriptions" />
          <NavItem href="/dashboard/exam-pins" icon={GraduationCap} label="Exam PINs" />
        </NavGroup>

        <NavGroup title="API & Integration">
          <NavItem href="/dashboard/api-keys" icon={Key} label="API Keys" />
          <NavItem href="/dashboard/webhooks" icon={Webhook} label="Webhooks" />
          <NavItem href="/dashboard/docs" icon={Book} label="Documentation" />
        </NavGroup>

        <div className="pt-6 mt-4 space-y-1 border-t border-white/5">
          <NavItem href="/dashboard/analytics" icon={BarChart3} label="Analytics" />
          <NavItem href="/dashboard/settings" icon={Settings} label="Settings" />
          <NavItem href="/dashboard/support" icon={HelpCircle} label="Support" />
        </div>
      </nav>

      {/* Footer: API Status & User Profile */}
      <div className="p-4 shrink-0 bg-[#0B1120] border-t border-white/5">
        
        {/* API Status Card (Dark Mode Optimized) */}
        <div className="bg-[#131B2F] border border-white/5 rounded-2xl p-4 mb-4 relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1">
              <div className={cn("h-2.5 w-2.5 rounded-full shadow-[0_0_8px]", apiLive ? "bg-green-500 shadow-green-500/50" : "bg-amber-500 shadow-amber-500/50 animate-pulse")} />
              <p className="text-xs font-bold text-white tracking-wide">
                {apiLive ? 'Your API is live' : 'API Pending'}
              </p>
            </div>
            <p className="text-[11px] font-medium text-slate-400 mt-1">
              {apiLive ? 'All systems operational' : 'Generate keys to begin'}
            </p>
          </div>
        </div>

        {/* User Profile Bar (KYC Image fixed using standard img tag) */}
        <div className="flex items-center justify-between p-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-full bg-[#1c44e4] text-white flex items-center justify-center font-bold text-sm overflow-hidden shrink-0 ring-2 ring-[#0B1120] shadow-md">
              {user.profilePicture ? (
                <img 
                  src={user.profilePicture} 
                  alt={user.firstName} 
                  className="object-cover h-full w-full"
                  crossOrigin="anonymous" 
                />
              ) : (
                <span>{user.firstName?.[0]}{user.lastName?.[0]}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-white truncate group-hover:text-blue-400 transition-colors">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-[10px] text-slate-400 truncate">
                {user.businessName || "TechNova Ltd."}
              </p>
            </div>
          </div>
          <button className="p-2 text-slate-500 hover:text-red-400 transition-colors">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
