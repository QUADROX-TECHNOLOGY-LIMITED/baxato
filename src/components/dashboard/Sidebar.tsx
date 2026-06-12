'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, Wallet, List, Users, 
  Smartphone, Wifi, Zap, Tv, GraduationCap, 
  Key, Webhook, Book, 
  BarChart3, Settings, HelpCircle, 
  LogOut, ChevronLeft, ChevronRight
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Sidebar({ user, apiLive }: { user: any; apiLive: boolean }) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const NavItem = ({ href, icon: Icon, label }: any) => {
    const isActive = pathname === href;
    return (
      <Link
        href={href}
        title={isCollapsed ? label : undefined}
        className={cn(
          "flex items-center gap-3 py-2.5 rounded-xl text-[13px] transition-all duration-300 group relative overflow-hidden",
          isCollapsed ? "justify-center px-0" : "px-3.5",
          isActive 
            ? "font-semibold text-white bg-[#1c44e4]/90 backdrop-blur-md border border-blue-400/20 shadow-[0_0_20px_rgba(28,68,228,0.3)]" 
            : "font-medium text-slate-400 hover:bg-white/5 hover:text-white"
        )}
      >
        <Icon className={cn("shrink-0 transition-all duration-300", 
          isCollapsed ? "h-5 w-5" : "h-[18px] w-[18px]", 
          isActive ? "text-white" : "text-slate-400 group-hover:text-blue-400"
        )} />
        {!isCollapsed && <span className="truncate tracking-wide">{label}</span>}
      </Link>
    );
  };

  const NavGroup = ({ title, children }: any) => (
    <div className="pt-5 space-y-1">
      {!isCollapsed && (
        <p className="px-3.5 text-[10px] font-black text-slate-500/70 uppercase tracking-widest mb-2.5">
          {title}
        </p>
      )}
      {children}
    </div>
  );

  return (
    <aside 
      className={cn(
        // Glassy dark background
        "bg-[#070C16]/95 backdrop-blur-2xl border-r border-white/5 hidden lg:flex flex-col shrink-0 h-screen text-slate-300 transition-all duration-300 relative antialiased",
        isCollapsed ? "w-20" : "w-[260px]"
      )}
    >
      {/* Sidebar Toggle Button - Floating Glass Pill */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3.5 top-8 bg-[#131B2F]/80 backdrop-blur-md border border-white/10 rounded-full p-1.5 text-slate-400 hover:text-white hover:bg-[#1c44e4] transition-all duration-300 z-50 shadow-xl"
      >
        {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>

      {/* Brand Logo Area */}
      <div className={cn("h-24 flex items-center shrink-0", isCollapsed ? "justify-center px-0" : "px-7")}>
        {isCollapsed ? (
          <div className="h-9 w-9 bg-gradient-to-br from-[#1c44e4] to-blue-600 rounded-xl flex items-center justify-center font-black text-white shadow-lg shadow-blue-900/20">
            B
          </div>
        ) : (
          <img 
            src="/baxato-logo.png" 
            alt="BAXATO" 
            className="h-7 w-auto object-contain drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]" 
          />
        )}
      </div>

      {/* Main Navigation Scroll Area */}
      <nav className="flex-1 overflow-y-auto px-3.5 pb-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent hover:scrollbar-thumb-white/20">
        <div className="space-y-1">
          <NavItem href="/dashboard" icon={LayoutDashboard} label="Dashboard" />
          <NavItem href="/dashboard/wallet" icon={Wallet} label="Wallet" />
          <NavItem href="/dashboard/transactions" icon={List} label="Transactions" />
          <NavItem href="/dashboard/beneficiaries" icon={Users} label="Beneficiaries" />
        </div>

        <NavGroup title="Pay Bills">
          <NavItem href="/dashboard/airtime" icon={Smartphone} label="Airtime" />
          <NavItem href="/dashboard/data" icon={Wifi} label="Data Bundles" />
          <NavItem href="/dashboard/electricity" icon={Zap} label="Electricity" />
          <NavItem href="/dashboard/cable-tv" icon={Tv} label="TV Subscriptions" />
          <NavItem href="/dashboard/exam-pins" icon={GraduationCap} label="Exam PINs" />
        </NavGroup>

        <NavGroup title="API & Integration">
          <NavItem href="/dashboard/api-keys" icon={Key} label="API Keys" />
          <NavItem href="/dashboard/webhooks" icon={Webhook} label="Webhooks" />
          <NavItem href="/dashboard/docs" icon={Book} label="Documentation" />
        </NavGroup>

        <div className="pt-5 mt-3 space-y-1 border-t border-white/5">
          <NavItem href="/dashboard/analytics" icon={BarChart3} label="Analytics" />
          <NavItem href="/dashboard/settings" icon={Settings} label="Settings" />
          <NavItem href="/dashboard/support" icon={HelpCircle} label="Support" />
          
          {/* Glassy Red Log Out Button */}
          <button 
            title={isCollapsed ? "Log Out" : undefined}
            className={cn(
              "w-full flex items-center gap-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-300 text-red-400 hover:bg-red-500/10 hover:border-red-500/20 border border-transparent group",
              isCollapsed ? "justify-center px-0" : "px-3.5"
            )}
          >
            <LogOut className={cn("shrink-0 transition-transform group-hover:-translate-x-1", isCollapsed ? "h-5 w-5" : "h-[18px] w-[18px]")} />
            {!isCollapsed && <span className="truncate">Log Out</span>}
          </button>
        </div>
      </nav>

      {/* Footer: API Status & User Profile */}
      <div className="p-4 shrink-0 bg-[#070C16]/80 backdrop-blur-xl border-t border-white/5">
        
        {/* Glassy Blue API Status Card */}
        {!isCollapsed && (
          <div className="bg-gradient-to-br from-[#1c44e4]/20 to-blue-900/10 backdrop-blur-md border border-[#1c44e4]/30 rounded-2xl p-3.5 mb-4 relative overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-1">
                <div className={cn("h-2.5 w-2.5 rounded-full shadow-[0_0_10px]", apiLive ? "bg-green-400 shadow-green-400/60" : "bg-amber-400 shadow-amber-400/60 animate-pulse")} />
                <p className="text-[12px] font-bold text-white tracking-wide">
                  {apiLive ? 'Your API is live' : 'API Pending'}
                </p>
              </div>
              <p className="text-[11px] font-medium text-blue-200/70">
                {apiLive ? 'All systems operational' : 'Generate keys to begin'}
              </p>
            </div>
            {/* Glowing orb effect in background */}
            <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-[#1c44e4]/40 rounded-full blur-xl" />
          </div>
        )}

        {/* User Profile Bar - Glassy Hover */}
        <div className={cn(
          "flex items-center rounded-2xl transition-all duration-300 cursor-pointer group",
          isCollapsed ? "justify-center p-0" : "justify-start gap-3 p-2 hover:bg-white/5 hover:border-white/10 border border-transparent"
        )}>
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[#1c44e4] to-blue-600 text-white flex items-center justify-center font-bold text-xs overflow-hidden shrink-0 ring-2 ring-white/10 shadow-[0_0_15px_rgba(28,68,228,0.4)] group-hover:ring-[#1c44e4]/50 transition-all">
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
          
          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-[13.5px] font-bold text-white truncate tracking-tight group-hover:text-blue-400 transition-colors">
                {user.firstName} {user.lastName}
              </p>
              <p className="text-[11px] text-slate-400 truncate tracking-wide font-medium">
                {user.businessName || "TechNova Ltd."}
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
