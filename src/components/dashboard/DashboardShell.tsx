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
            ? "bg-primary text-primary-foreground shadow-md" 
            : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        )}
      >
        <Icon className={cn("shrink-0 transition-colors", isCollapsed ? "h-[18px] w-[18px]" : "h-4 w-4", isActive ? "text-primary-foreground" : "text-muted-foreground group-hover:text-accent-foreground")} />
        {(!isCollapsed || isMobileOpen) && <span className="truncate">{label}</span>}
      </Link>
    );
  };

  const NavGroup = ({ title, children }: any) => (
    <div className="pt-3 space-y-0.5">
      {(!isCollapsed || isMobileOpen) && (
        <p className="px-3 text-[9px] font-bold text-muted-foreground/70 uppercase tracking-widest mb-1.5">
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
          <div className="h-7 w-7 bg-primary rounded-lg flex items-center justify-center font-black text-primary-foreground text-xs shadow-md">
            B
          </div>
        ) : (
          <div className="flex items-center gap-2.5">
            <img 
              src="/baxato-logo.png" 
              alt="Logo" 
              className="h-6 w-6 object-contain dark:invert" 
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
            <span className="text-xl font-bold tracking-tight text-foreground">Baxato</span>
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

        <div className="pt-3 mt-2 space-y-0.5 border-t border-border">
          <NavItem href="/dashboard/analytics" icon={BarChart3} label="Analytics" />
          <NavItem href="/dashboard/settings" icon={Settings} label="Settings" />
          <NavItem href="/dashboard/support" icon={HelpCircle} label="Support" />
          
          <button 
            type="button"
            title={isCollapsed && !isMobileOpen ? "Log Out" : undefined}
            className={cn(
              "w-full flex items-center gap-2.5 py-2 rounded-lg text-[12px] font-semibold tracking-tight transition-all duration-200 text-destructive hover:bg-destructive/10 group",
              isCollapsed && !isMobileOpen ? "justify-center px-0" : "px-3"
            )}
          >
            <LogOut className={cn("shrink-0 transition-colors", isCollapsed && !isMobileOpen ? "h-[18px] w-[18px]" : "h-4 w-4")} />
            {(!isCollapsed || isMobileOpen) && <span className="truncate">Log Out</span>}
          </button>
        </div>
      </nav>

      <div className="p-3 shrink-0 bg-card border-t border-border">
        {(!isCollapsed || isMobileOpen) && (
          <div className="bg-muted border border-border rounded-lg p-2 mb-2">
            <div className="flex items-center gap-2 mb-0.5">
              <div className={cn("h-1.5 w-1.5 rounded-full", apiLive ? "bg-green-500 shadow-[0_0_4px_#22c55e]" : "bg-amber-500 shadow-[0_0_4px_#f59e0b] animate-pulse")} />
              <p className="text-[9px] font-bold text-foreground uppercase tracking-wider">
                {apiLive ? 'API Live' : 'API Pending'}
              </p>
            </div>
            <p className="text-[9px] text-muted-foreground leading-tight">
              {apiLive ? 'Systems operational' : 'Generate keys to start'}
            </p>
          </div>
        )}

        <div className={cn(
          "flex items-center rounded-lg p-1.5 hover:bg-accent transition-colors",
          isCollapsed && !isMobileOpen ? "justify-center" : "justify-start gap-2.5"
        )}>
          <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-[10px] overflow-hidden shrink-0 ring-1 ring-border shadow-sm">
            {user.profilePicture ? (
              <img src={user.profilePicture} alt="Avatar" className="object-cover h-full w-full" crossOrigin="anonymous" />
            ) : (
              <span>{user.firstName?.[0]}{user.lastName?.[0]}</span>
            )}
          </div>
          {(!isCollapsed || isMobileOpen) && (
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold text-foreground truncate">{user.firstName} {user.lastName}</p>
              <p className="text-[9px] text-muted-foreground truncate">{user.businessName || "TechNova Ltd."}</p>
            </div>
          )}
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background flex font-sans antialiased text-foreground">
      
      {/* DESKTOP SIDEBAR */}
      <aside 
        className={cn(
          "bg-card border-r border-border hidden lg:flex flex-col shrink-0 sticky top-0 h-screen transition-all duration-300 z-20",
          isCollapsed ? "w-20" : "w-60"
        )}
      >
        <button 
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-6 bg-background border border-border rounded-full p-1 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors z-50 shadow-sm"
        >
          {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </button>
        <SidebarContent />
      </aside>

      {/* MOBILE SIDEBAR & OVERLAY */}
      <div className="lg:hidden">
        {isMobileOpen && (
          <div 
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 transition-opacity"
            onClick={() => setIsMobileOpen(false)}
          />
        )}
        <aside 
          className={cn(
            "fixed inset-y-0 left-0 w-64 bg-card border-r border-border flex flex-col h-[100dvh] transform transition-transform duration-300 ease-in-out z-50 shadow-2xl",
            isMobileOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <button 
            type="button"
            onClick={() => setIsMobileOpen(false)}
            className="absolute right-4 top-4 p-2 text-muted-foreground hover:text-foreground bg-accent rounded-full"
          >
            <X className="h-5 w-5" />
          </button>
          <SidebarContent />
        </aside>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 h-14 bg-background/90 backdrop-blur-md border-b border-border flex items-center justify-between px-4 lg:hidden z-30">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsMobileOpen(true)}
              className="p-3 -ml-3 text-muted-foreground active:bg-accent rounded-xl transition-colors"
            >
              <Menu className="h-6 w-6" />
            </button>
            <div className="flex items-center gap-2">
              <img 
                src="/baxato-logo.png" 
                alt="Logo" 
                className="h-5 w-5 object-contain dark:invert" 
                onError={(e) => (e.currentTarget.style.display = 'none')}
              />
              <span className="text-lg font-bold tracking-tight text-foreground">Baxato</span>
            </div>
          </div>
          <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs overflow-hidden shadow-sm">
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
