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
          "flex items-center gap-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-200 group",
          isCollapsed ? "justify-center px-0" : "px-3",
          isActive 
            ? "bg-[#1c44e4] text-white shadow-md shadow-blue-900/20" 
            : "text-slate-400 hover:bg-white/5 hover:text-white"
        )}
      >
        <Icon className={cn("shrink-0 transition-colors", isCollapsed ? "h-5 w-5" : "h-[18px] w-[18px]", isActive ? "text-white" : "text-slate-400 group-hover:text-white")} />
        {!isCollapsed && <span className="truncate">{label}</span>}
      </Link>
    );
  };

  const NavGroup = ({ title, children }: any) => (
    <div className="pt-4 space-y-0.5">
      {!isCollapsed && (
        <p className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
          {title}
        </p>
      )}
      {children}
    </div>
  );

  return (
    <aside 
      className={cn(
        "bg-[#0B1120] border-r border-white/5 hidden lg:flex flex-col shrink-0 h-screen text-slate-300 transition-all duration-300 relative",
        isCollapsed ? "w-20" : "w-64"
      )}
    >
      {/* Sidebar Toggle Button */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-8 bg-[#0B1120] border border-white/10 rounded-full p-1 text-slate-400 hover:text-white hover:bg-white/10 transition-colors z-50 shadow-lg"
      >
        {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
      </button>

      {/* Brand Logo Area */}
      <div className={cn("h-20 flex items-center shrink-0", isCollapsed ? "justify-center px-0" : "px-6")}>
        {isCollapsed ? (
          <div className="h-8 w-8 bg-white/10 rounded-lg flex items-center justify-center font-black text-white">
            B
          </div>
        ) : (
          <div className="bg-white/5 p-1.5 rounded-lg">
             <img 
              src="/baxato-logo.png" 
              alt="BAXATO" 
              className="h-6 w-auto object-contain brightness-0 invert" 
              onError={(e) => {
                // If standard logo invert fails, rely on the raw image
                (e.target as HTMLImageElement).className = "h-6 w-auto object-contain bg-white/90 px-2 py-1 rounded";
              }}
            />
          </div>
        )}
      </div>

      {/* Main Navigation Scroll Area */}
      <nav className="flex-1 overflow-y-auto px-3 pb-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent hover:scrollbar-thumb-white/20">
        <div className="space-y-0.5">
          <NavItem href="/dashboard" icon={LayoutDashboard} label="Dashboard" />
          <NavItem href="/dashboard/wallet" icon={Wallet} label="Wallet & Funding" />
          <NavItem href="/dashboard/transactions" icon={List} label="Transactions" />
          <NavItem href="/dashboard/beneficiaries" icon={Users} label="Beneficiaries" />
        </div>

        <NavGroup title="Pay Bills">
          {/* Separated Airtime and Data */}
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

        <div className="pt-4 mt-2 space-y-0.5 border-t border-white/5">
          <NavItem href="/dashboard/analytics" icon={BarChart3} label="Analytics" />
          <NavItem href="/dashboard/settings" icon={Settings} label="Settings" />
          <NavItem href="/dashboard/support" icon={HelpCircle} label="Support" />
        </div>
      </nav>

      {/* Footer: API Status & User Profile */}
      <div className="p-3 shrink-0 bg-[#0B1120] border-t border-white/5">
        
        {/* API Status Card */}
        {!isCollapsed && (
          <div className="bg-[#131B2F] border border-white/5 rounded-xl p-3 mb-3 relative overflow-hidden">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-0.5">
                <div className={cn("h-2 w-2 rounded-full shadow-[0_0_8px]", apiLive ? "bg-green-500 shadow-green-500/50" : "bg-amber-500 shadow-amber-500/50 animate-pulse")} />
                <p className="text-[11px] font-bold text-white tracking-wide">
                  {apiLive ? 'Your API is live' : 'API Pending'}
                </p>
              </div>
              <p className="text-[10px] font-medium text-slate-400">
                {apiLive ? 'All systems operational' : 'Generate keys to begin'}
              </p>
            </div>
          </div>
        )}

        {/* User Profile Bar */}
        <div className={cn(
          "flex items-center rounded-xl hover:bg-white/5 transition-colors cursor-pointer group",
          isCollapsed ? "justify-center p-2" : "justify-between p-2"
        )}>
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 rounded-full bg-[#1c44e4] text-white flex items-center justify-center font-bold text-xs overflow-hidden shrink-0 ring-1 ring-white/10 shadow-md">
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
                <p className="text-[13px] font-bold text-white truncate group-hover:text-blue-400 transition-colors">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-[10px] text-slate-400 truncate">
                  {user.businessName || "TechNova Ltd."}
                </p>
              </div>
            )}
          </div>
          
          {!isCollapsed && (
            <button className="p-1.5 text-slate-500 hover:text-red-400 transition-colors">
              <LogOut className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
