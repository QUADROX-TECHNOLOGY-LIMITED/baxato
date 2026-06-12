'use client';

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  LayoutDashboard, Wallet, List, Users, 
  Smartphone, Wifi, Zap, Tv, GraduationCap, 
  Key, Webhook, Book, 
  BarChart3, Settings, HelpCircle, 
  LogOut, Menu, X, Bell
} from "lucide-react";

// --- NAVIGATION CONFIGURATION ---
const NAVIGATION = [
  {
    category: "Main",
    links: [
      { name: "Overview", href: "/dashboard", icon: LayoutDashboard },
      { name: "Wallet & Funding", href: "/dashboard/wallet", icon: Wallet },
      { name: "Transactions", href: "/dashboard/transactions", icon: List },
      { name: "Beneficiaries", href: "/dashboard/beneficiaries", icon: Users },
    ]
  },
  {
    category: "Pay Bills",
    links: [
      { name: "Airtime", href: "/dashboard/airtime", icon: Smartphone },
      { name: "Data Bundles", href: "/dashboard/data", icon: Wifi },
      { name: "Electricity", href: "/dashboard/electricity", icon: Zap },
      { name: "TV Subscriptions", href: "/dashboard/cable-tv", icon: Tv },
      { name: "Exam PINs", href: "/dashboard/exam-pins", icon: GraduationCap },
    ]
  },
  {
    category: "API & Integration",
    links: [
      { name: "API Keys", href: "/dashboard/api-keys", icon: Key },
      { name: "Webhooks", href: "/dashboard/webhooks", icon: Webhook },
      { name: "Documentation", href: "/dashboard/docs", icon: Book },
    ]
  },
  {
    category: "Management",
    links: [
      { name: "Analytics", href: "/dashboard/analytics", icon: BarChart3 },
      { name: "Settings", href: "/dashboard/settings", icon: Settings },
      { name: "Support", href: "/dashboard/support", icon: HelpCircle },
    ]
  }
];

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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // --- SMART HEADER STATE ---
  const [showHeader, setShowHeader] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 60) {
        setShowHeader(false);
      } else {
        setShowHeader(true);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [lastScrollY]);

  const getCurrentPageName = () => {
    for (const group of NAVIGATION) {
      const found = group.links.find(link => pathname === link.href || pathname.startsWith(`${link.href}/`));
      if (found) return found.name;
    }
    return "Dashboard";
  };

  return (
    // 1. Root wrapper: Native min-height, no overflow locks. Page flows freely.
    <div className="min-h-screen bg-[#f8fafc] font-sans selection:bg-[#2563EB] selection:text-white">
      
      {/* 2. MOBILE OVERLAY */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 z-40 lg:hidden backdrop-blur-sm transition-opacity cursor-pointer"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* 3. FIXED SIDEBAR (Dark Theme for Baxato) */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-[#0B1120] border-r border-white/5 
        transform transition-transform duration-300 ease-in-out flex flex-col shadow-2xl lg:shadow-none
        ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
      `}>
        
        {/* Brand Area */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-white/5 shrink-0">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <img 
              src="/baxato-logo.png" 
              alt="Logo" 
              className="h-6 w-6 object-contain" 
              onError={(e) => (e.currentTarget.style.display = 'none')}
            />
            <span className="text-xl font-bold tracking-tight text-white">Baxato</span>
          </Link>
          <button 
            className="lg:hidden text-slate-400 hover:text-white transition-colors p-2 -mr-2"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Navigation Area */}
        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-6 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          {NAVIGATION.map((group) => (
            <div key={group.category} className="space-y-1">
              <h3 className="px-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                {group.category}
              </h3>
              <div className="space-y-0.5">
                {group.links.map((link) => {
                  const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
                  const Icon = link.icon;
                  
                  return (
                    <Link 
                      key={link.name} 
                      href={link.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`
                        flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-semibold tracking-tight transition-all duration-200 group
                        ${isActive 
                          ? "bg-[#2563EB] text-white shadow-md shadow-blue-900/20" 
                          : "text-slate-400 hover:bg-white/5 hover:text-white"
                        }
                      `}
                    >
                      <Icon 
                        className={`h-[18px] w-[18px] shrink-0 transition-colors ${isActive ? "text-white" : "text-slate-400 group-hover:text-white"}`} 
                      />
                      <span className="truncate">{link.name}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer Area: API Status & Logout */}
        <div className="p-4 border-t border-white/5 shrink-0 bg-[#0B1120]">
          <div className="bg-[#131B2F] border border-white/5 rounded-lg p-2.5 mb-3">
            <div className="flex items-center gap-2 mb-1">
              <div className={`h-2 w-2 rounded-full shadow-[0_0_8px] ${apiLive ? "bg-green-500 shadow-green-500/50" : "bg-amber-500 shadow-amber-500/50 animate-pulse"}`} />
              <p className="text-[10px] font-bold text-white uppercase tracking-wider">
                {apiLive ? 'API Live' : 'API Pending'}
              </p>
            </div>
            <p className="text-[10px] text-slate-400">
              {apiLive ? 'Systems operational' : 'Generate keys to start'}
            </p>
          </div>

          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-semibold text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all duration-200 group">
            <LogOut className="h-[18px] w-[18px] shrink-0 transition-transform group-hover:-translate-x-1" />
            Log Out
          </button>
        </div>
      </aside>

      {/* 4. MAIN CONTENT AREA (Padded to fit sidebar) */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        
        {/* SMART HEADER */}
        <header className={`
          sticky top-0 z-30 h-16 bg-white/90 backdrop-blur-md border-b border-gray-200 
          flex items-center justify-between px-4 sm:px-6 lg:px-8 shrink-0 
          transition-transform duration-300 ease-in-out
          ${showHeader ? "translate-y-0" : "-translate-y-full"}
        `}>
          <div className="flex items-center gap-4">
            {/* Massive tap target for mobile menu button */}
            <button 
              className="lg:hidden p-3 -ml-3 text-slate-600 active:bg-gray-100 rounded-xl transition-colors cursor-pointer"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </button>
            <h2 className="text-lg font-bold text-slate-800 hidden sm:block">
              {getCurrentPageName()}
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <button className="relative p-2 text-slate-500 hover:text-[#2563EB] transition-colors rounded-full hover:bg-blue-50 cursor-pointer">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>

            <div className="h-9 w-9 rounded-full bg-[#2563EB] flex items-center justify-center text-white font-bold text-xs shadow-md border-2 border-white cursor-pointer overflow-hidden">
              {user.profilePicture ? (
                <img src={user.profilePicture} alt="Avatar" className="object-cover h-full w-full" crossOrigin="anonymous" />
              ) : (
                <span>{user.firstName?.[0]}{user.lastName?.[0]}</span>
              )}
            </div>
          </div>
        </header>

        {/* MAIN PAGE INJECTION */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 relative z-10">
          <div className="max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            {children}
          </div>
        </main>

      </div>
    </div>
  );
}
