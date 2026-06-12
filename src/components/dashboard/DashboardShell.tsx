'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, Wallet, List, Users, 
  Smartphone, Wifi, Zap, Tv, GraduationCap, 
  Key, Webhook, Book, 
  BarChart3, Settings, HelpCircle, 
  LogOut, ChevronLeft, ChevronRight, Menu, X
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function DashboardShell({ 
  user, 
  apiLive, 
  children 
}: { 
  user: any; 
  apiLive: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const handleNavClick = () => setIsMobileOpen(false);

  const NavItem = ({ href, icon: Icon, label }: any) => {
    const isActive = pathname === href;
    return (
      <Link
        href={href}
        onClick={handleNavClick}
        title={isCollapsed ? label : undefined}
        className={cn(
          "flex items-center gap-2.5 py-2 rounded-lg text-[12px] font-semibold tracking-tight transition-all duration-200 group",
          isCollapsed ? "justify-center px-0 lg:px-0" : "px-3",
          isActive 
            ? "bg-[#2563EB] text-white shadow-[0_0_12px_rgba(37,99,235,0.4)]" 
            : "text-slate-400 hover:bg-white/5 hover:text-white"
        )}
      >
        <Icon className={cn("shrink-0 transition-colors", isCollapsed ? "h-[18px] w-[18px]" : "h-4 w-4", isActive ? "text-white" : "text-slate-400 group-hover:text-white")} />
        {(!isCollapsed || isMobileOpen) && <span className="truncate">{label}</span>}
      </Link>
    );
  };

  const NavGroup = ({ title, children }: any) => (
    <div className="pt-3 space-y-0.5">
      {(!isCollapsed || isMobileOpen) && (
        <p className="px-3 text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">
          {title}
        </p>
      )}
      {children}
    </div>
  );

  const SidebarContent = () => (
    <>
      <div className={cn("h-16 flex items-center shrink-0", isCollapsed && !isMobileOpen ? "justify-center px-0" : "px-5")}>
        {isCollapsed && !isMobileOpen ? (
          <div className="h-7 w-7 bg-[#2563EB] rounded-lg flex items-center justify-center font-black text-white text-xs shadow-md">
            B
          </div>
        ) : (
          <div className="flex items-center gap-2.5">
            <img 
              src="/baxato-logo.png" 
              alt="Logo" 
              className="h-6 w-6 object-contain" 
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
            <span className="text-xl font-bold tracking-tight text-white">Baxato</span>
          </div>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-6 scrollbar-none">
        <div className="space-y-0.5">
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

        <div className="pt-3 mt-2 space-y-0.5 border-t border-white/5">
          <NavItem href="/dashboard/analytics" icon={BarChart3} label="Analytics" />
          <NavItem href="/dashboard/settings" icon={Settings} label="Settings" />
          <NavItem href="/dashboard/support" icon={HelpCircle} label="Support" />
          
          <button 
            type="button"
            title={isCollapsed && !isMobileOpen ? "Log Out" : undefined}
            className={cn(
              "w-full flex items-center gap-2.5 py-2 rounded-lg text-[12px] font-semibold tracking-tight transition-all duration-200 text-red-400 hover:bg-red-500/10 hover:text-red-300 group",
              isCollapsed && !isMobileOpen ? "justify-center px-0" : "px-3"
            )}
          >
            <LogOut className={cn("shrink-0 transition-colors", isCollapsed && !isMobileOpen ? "h-[18px] w-[18px]" : "h-4 w-4")} />
            {(!isCollapsed || isMobileOpen) && <span className="truncate">Log Out</span>}
          </button>
        </div>
      </nav>

      <div className="p-3 shrink-0 bg-[#0B1120] border-t border-white/5">
        {(!isCollapsed || isMobileOpen) && (
          <div className="bg-[#0F172A] border border-white/5 rounded-lg p-2 mb-2">
            <div className="flex items-center gap-2 mb-0.5">
              <div className={cn("h-1.5 w-1.5 rounded-full", apiLive ? "bg-green-500 shadow-[0_0_4px_#22c55e]" : "bg-amber-500 shadow-[0_0_4px_#f59e0b] animate-pulse")} />
              <p className="text-[9px] font-bold text-white uppercase tracking-wider">
                {apiLive ? 'API Live' : 'API Pending'}
              </p>
            </div>
            <p className="text-[9px] text-slate-500 leading-tight">
              {apiLive ? 'Systems operational' : 'Generate keys to start'}
            </p>
          </div>
        )}

        <div className={cn(
          "flex items-center rounded-lg p-1.5 bg-white/5",
          isCollapsed && !isMobileOpen ? "justify-center" : "justify-start gap-2.5"
        )}>
          <div className="h-7 w-7 rounded-full bg-[#2563EB] text-white flex items-center justify-center font-bold text-[10px] overflow-hidden shrink-0 ring-1 ring-white/10 shadow-md">
            {user.profilePicture ? (
              <img src={user.profilePicture} alt="Avatar" className="object-cover h-full w-full" crossOrigin="anonymous" />
            ) : (
              <span>{user.firstName?.[0]}{user.lastName?.[0]}</span>
            )}
          </div>
          {(!isCollapsed || isMobileOpen) && (
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold text-white truncate">{user.firstName} {user.lastName}</p>
              <p className="text-[9px] text-slate-400 truncate">{user.businessName || "TechNova Ltd."}</p>
            </div>
          )}
        </div>
      </div>
    </>
  );

  return (
    // FIX 1: The main wrapper uses min-h-screen so it flows naturally
    <div className="min-h-screen bg-[#f8fafc] flex font-sans antialiased">
      
      {/* FIX 2: Desktop Sidebar uses h-screen with sticky top-0 */}
      <aside 
        className={cn(
          "bg-[#0B1120] border-r border-white/5 hidden lg:flex flex-col shrink-0 sticky top-0 h-screen transition-all duration-300 z-20",
          isCollapsed ? "w-20" : "w-60"
        )}
      >
        <button 
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-6 bg-[#0B1120] border border-white/10 rounded-full p-1 text-slate-400 hover:text-white hover:bg-white/10 transition-colors z-50 shadow-lg"
        >
          {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </button>
        <SidebarContent />
      </aside>

      {/* MOBILE SIDEBAR & OVERLAY */}
      <div className="lg:hidden">
        {isMobileOpen && (
          <div 
            className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-40 transition-opacity"
            onClick={() => setIsMobileOpen(false)}
          />
        )}
        {/* FIX 3: Mobile drawer uses fixed h-[100dvh] to perfectly clear the keyboard */}
        <aside 
          className={cn(
            "fixed inset-y-0 left-0 w-64 bg-[#0B1120] border-r border-white/5 flex flex-col h-[100dvh] transform transition-transform duration-300 ease-in-out z-50 shadow-2xl",
            isMobileOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <button 
            type="button"
            onClick={() => setIsMobileOpen(false)}
            className="absolute right-4 top-4 p-2 text-slate-400 hover:text-white bg-white/5 rounded-full"
          >
            <X className="h-5 w-5" />
          </button>
          <SidebarContent />
        </aside>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 h-14 bg-white/90 backdrop-blur-md border-b border-gray-200 flex items-center justify-between px-4 lg:hidden z-30">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsMobileOpen(true)}
              className="p-3 -ml-3 text-gray-600 active:bg-gray-100 rounded-xl transition-colors"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex items-center gap-2">
              <img 
                src="/baxato-logo.png" 
                alt="Logo" 
                className="h-5 w-5 object-contain" 
                onError={(e) => (e.currentTarget.style.display = 'none')}
              />
              <span className="text-lg font-bold tracking-tight text-[#0B1120]">Baxato</span>
            </div>
          </div>
          <div className="h-8 w-8 rounded-full bg-[#2563EB] text-white flex items-center justify-center font-bold text-xs overflow-hidden shadow-sm">
            {user.profilePicture ? (
              <img src={user.profilePicture} alt="Avatar" className="object-cover h-full w-full" crossOrigin="anonymous" />
            ) : (
              <span>{user.firstName?.[0]}{user.lastName?.[0]}</span>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <div className="max-w-[1600px] mx-auto">
            {children}
          </div>
        </main>
      </div>

    </div>
  );
}
