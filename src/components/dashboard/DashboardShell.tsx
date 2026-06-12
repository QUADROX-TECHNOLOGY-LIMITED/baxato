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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const NavItem = ({ href, icon: Icon, label }: any) => {
    const isActive = pathname === href || pathname.startsWith(`${href}/`);
    return (
      <Link
        href={href}
        onClick={() => setIsMobileMenuOpen(false)}
        title={isCollapsed ? label : undefined}
        className={`
          flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold tracking-tight transition-all duration-200 group
          ${isCollapsed ? "justify-center lg:px-0" : ""}
          ${isActive 
            ? "bg-[#2563EB] text-white shadow-[0_4px_12px_rgba(37,99,235,0.3)]" 
            : "text-slate-400 hover:bg-white/5 hover:text-white"
          }
        `}
      >
        <Icon className={`shrink-0 transition-colors ${isCollapsed ? "h-5 w-5" : "h-[18px] w-[18px]"} ${isActive ? "text-white" : "text-slate-400 group-hover:text-white"}`} />
        {!isCollapsed && <span className="truncate">{label}</span>}
      </Link>
    );
  };

  const NavGroup = ({ title, children }: any) => (
    <div className="pt-4 space-y-1">
      {!isCollapsed && (
        <h3 className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
          {title}
        </h3>
      )}
      {children}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans antialiased text-slate-600">
      
      {/* MOBILE OVERLAY */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 z-40 lg:hidden backdrop-blur-sm transition-opacity cursor-pointer"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* SIDEBAR (Fixed, handles own overflow) */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 bg-[#0B1120] border-r border-white/5 
        transform transition-all duration-300 ease-in-out flex flex-col shadow-2xl lg:shadow-none
        ${isMobileMenuOpen ? "translate-x-0 w-64" : "-translate-x-full lg:translate-x-0"}
        ${isCollapsed ? "lg:w-20" : "lg:w-64"}
      `}>
        
        {/* Desktop Collapse Toggle */}
        <button 
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-7 hidden lg:flex items-center justify-center h-6 w-6 bg-[#0B1120] border border-white/10 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors z-50 shadow-lg cursor-pointer"
        >
          {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
        </button>

        {/* Brand Logo Area */}
        <div className={`h-16 flex items-center shrink-0 border-b border-white/5 ${isCollapsed ? "justify-center" : "justify-between px-6"}`}>
          {isCollapsed ? (
            <div className="h-8 w-8 bg-[#2563EB] rounded-lg flex items-center justify-center font-black text-white text-sm shadow-md">
              B
            </div>
          ) : (
            <div className="flex items-center gap-2.5">
              <img src="/baxato-logo.png" alt="Logo" className="h-6 w-6 object-contain" />
              <span className="text-xl font-bold tracking-tight text-white">Baxato</span>
            </div>
          )}
          
          <button 
            className="lg:hidden text-slate-400 hover:text-white transition-colors cursor-pointer"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Navigation Scroll Area */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          <NavItem href="/dashboard" icon={LayoutDashboard} label="Dashboard" />
          <NavItem href="/dashboard/wallet" icon={Wallet} label="Wallet" />
          <NavItem href="/dashboard/transactions" icon={List} label="Transactions" />
          <NavItem href="/dashboard/beneficiaries" icon={Users} label="Beneficiaries" />

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

          <div className="pt-4 mt-2 border-t border-white/5 space-y-0.5">
            <NavItem href="/dashboard/analytics" icon={BarChart3} label="Analytics" />
            <NavItem href="/dashboard/settings" icon={Settings} label="Settings" />
            <NavItem href="/dashboard/support" icon={HelpCircle} label="Support" />
            
            <button 
              type="button"
              title={isCollapsed ? "Log Out" : undefined}
              className={`w-full flex items-center gap-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-200 text-red-400 hover:bg-red-500/10 hover:text-red-300 group cursor-pointer ${isCollapsed ? "justify-center lg:px-0" : "px-3"}`}
            >
              <LogOut className={`shrink-0 transition-colors ${isCollapsed ? "h-5 w-5" : "h-[18px] w-[18px]"}`} />
              {!isCollapsed && <span className="truncate">Log Out</span>}
            </button>
          </div>
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-white/5 shrink-0">
          {!isCollapsed && (
            <div className="bg-[#0F172A] border border-white/5 rounded-lg p-2.5 mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${apiLive ? "bg-green-500 shadow-[0_0_6px_#22c55e]" : "bg-amber-500 shadow-[0_0_6px_#f59e0b] animate-pulse"}`} />
                <span className="text-[11px] font-bold text-white uppercase tracking-wider">
                  {apiLive ? 'API Active' : 'API Pending'}
                </span>
              </div>
            </div>
          )}

          <div className={`flex items-center rounded-xl p-1.5 bg-white/5 ${isCollapsed ? "justify-center" : "gap-3"}`}>
            <div className="h-8 w-8 rounded-full bg-[#2563EB] text-white flex items-center justify-center font-bold text-xs overflow-hidden shrink-0 ring-2 ring-[#0B1120]">
              {user.profilePicture ? (
                <img src={user.profilePicture} alt="Avatar" className="object-cover h-full w-full" crossOrigin="anonymous" />
              ) : (
                <span>{user.firstName?.[0]}{user.lastName?.[0]}</span>
              )}
            </div>
            {!isCollapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-bold text-white truncate">{user.firstName} {user.lastName}</p>
                <p className="text-[10px] text-slate-400 truncate">{user.businessName || "TechNova Ltd."}</p>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA (Pushed right on desktop) */}
      <div className={`flex flex-col min-h-screen transition-all duration-300 ease-in-out ${isCollapsed ? "lg:pl-20" : "lg:pl-64"}`}>
        
        {/* Mobile Header */}
        <header className="sticky top-0 z-30 h-16 bg-white/90 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-4 lg:hidden shrink-0">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="p-2 -ml-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex items-center gap-2">
              <img src="/baxato-logo.png" alt="Logo" className="h-6 w-6 object-contain" />
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

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 relative z-10">
          <div className="max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            {children}
          </div>
        </main>

      </div>
    </div>
  );
}
