'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, Wallet, List, Users, 
  Phone, Zap, Tv, GraduationCap, Wifi,
  Key, Webhook, Book, 
  BarChart3, Settings, HelpCircle, 
  LogOut, PanelLeftClose, PanelLeftOpen 
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function Sidebar({ user, apiLive }: { user: any; apiLive: boolean }) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [logoError, setLogoError] = useState(false); // Tracks if the image fails to load

  const NavItem = ({ href, icon: Icon, label }: any) => {
    const isActive = pathname === href;
    return (
      <Link
        href={href}
        title={isCollapsed ? label : undefined}
        className={cn(
          "flex items-center rounded-lg font-medium transition-all duration-200 group",
          // Adjust padding and alignment based on collapsed state
          isCollapsed ? "justify-center p-2.5 mx-auto w-10 h-10" : "gap-3 px-3 py-2 mx-2 w-[calc(100%-16px)]",
          isActive 
            ? "bg-[#1c44e4] text-white shadow-md shadow-blue-900/20" 
            : "text-slate-400 hover:bg-white/5 hover:text-white"
        )}
      >
        <Icon className={cn("shrink-0 transition-colors", isCollapsed ? "h-5 w-5" : "h-4 w-4", isActive ? "text-white" : "text-slate-400 group-hover:text-white")} />
        {!isCollapsed && <span className="text-xs truncate">{label}</span>}
      </Link>
    );
  };

  const NavGroup = ({ title, children }: any) => (
    <div className="pt-4 space-y-0.5">
      {!isCollapsed && (
        <p className="px-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
          {title}
        </p>
      )}
      {/* Tiny visual separator when collapsed */}
      {isCollapsed && <div className="w-4 mx-auto border-t border-white/10 my-3" />}
      {children}
    </div>
  );

  return (
    <aside className={cn(
      "bg-[#0B1120] border-r border-white/5 hidden lg:flex flex-col shrink-0 h-screen text-slate-300 transition-all duration-300 relative",
      isCollapsed ? "w-20" : "w-64"
    )}>
      
      {/* Sidebar Collapse Toggle */}
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-7 bg-[#131B2F] border border-white/10 text-slate-400 hover:text-white rounded-full p-1.5 z-50 transition-colors shadow-lg"
      >
        {isCollapsed ? <PanelLeftOpen className="h-3.5 w-3.5" /> : <PanelLeftClose className="h-3.5 w-3.5" />}
      </button>

      {/* Brand Logo Area */}
      <div className={cn("h-20 flex items-center shrink-0", isCollapsed ? "justify-center px-0" : "px-5")}>
        {!isCollapsed ? (
          logoError ? (
            // Text Fallback if the logo image is missing/broken
            <span className="font-black text-xl tracking-tighter text-white">BAXATO</span>
          ) : (
            <img 
              src="/baxato-logo-white.png" 
              alt="BAXATO" 
              className="h-6 w-auto object-contain" 
              onError={() => setLogoError(true)}
            />
          )
        ) : (
          // Collapsed state logo (Just a cool blue 'B')
          <div className="h-8 w-8 bg-[#1c44e4] rounded-lg flex items-center justify-center font-black text-white text-lg">
            B
          </div>
        )}
      </div>

      {/* Main Navigation Scroll Area */}
      <nav className="flex-1 overflow-y-auto pb-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent hover:scrollbar-thumb-white/20">
        <div className="space-y-0.5">
          <NavItem href="/dashboard" icon={LayoutDashboard} label="Dashboard" />
          <NavItem href="/dashboard/wallet" icon={Wallet} label="Wallet & Funding" />
          <NavItem href="/dashboard/transactions" icon={List} label="Transactions" />
          <NavItem href="/dashboard/beneficiaries" icon={Users} label="Beneficiaries" />
        </div>

        <NavGroup title="Pay Bills">
          <NavItem href="/dashboard/airtime" icon={Phone} label="Airtime" />
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

        <div className="pt-4 mt-4 space-y-0.5 border-t border-white/5">
          <NavItem href="/dashboard/analytics" icon={BarChart3} label="Analytics" />
          <NavItem href="/dashboard/settings" icon={Settings} label="Settings" />
          <NavItem href="/dashboard/support" icon={HelpCircle} label="Support" />
        </div>
      </nav>

      {/* Footer: API Status & User Profile */}
      <div className="p-3 shrink-0 bg-[#0B1120] border-t border-white/5">
        
        {/* API Status Card */}
        {!isCollapsed ? (
          <div className="bg-[#131B2F] border border-white/5 rounded-xl p-3 mb-3 mx-1">
            <div className="flex items-center gap-2 mb-0.5">
              <div className={cn("h-2.5 w-2.5 rounded-full shadow-[0_0_8px]", apiLive ? "bg-green-500 shadow-green-500/50" : "bg-amber-500 shadow-amber-500/50 animate-pulse")} />
              <p className="text-[11px] font-bold text-white tracking-wide">
                {apiLive ? 'API is live' : 'API Pending'}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex justify-center mb-4">
             <div title={apiLive ? 'API is live' : 'API Pending'} className={cn("h-2.5 w-2.5 rounded-full shadow-[0_0_8px]", apiLive ? "bg-green-500 shadow-green-500/50" : "bg-amber-500 shadow-amber-500/50 animate-pulse")} />
          </div>
        )}

        {/* User Profile Bar */}
        <div className={cn("flex items-center justify-between rounded-xl hover:bg-white/5 transition-colors cursor-pointer group", isCollapsed ? "p-1 justify-center" : "p-2 mx-1")}>
          <div className={cn("flex items-center gap-3 min-w-0", isCollapsed ? "justify-center" : "")}>
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
                <p className="text-xs font-bold text-white truncate group-hover:text-blue-400 transition-colors">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-[9px] text-slate-400 truncate">
                  {user.businessName || "Quadrox Tech"}
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
