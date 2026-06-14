import { cookies } from 'next/headers';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/modules/auth/session';
import { ThemeToggle } from '@/components/ThemeToggle';
import { 
  Plus, 
  Smartphone, 
  Wifi, 
  Zap, 
  Tv, 
  GraduationCap,
  History,
  CheckCircle2,
  XCircle,
  Clock,
  Activity,
  CreditCard,
  Webhook,
  TrendingUp,
  Settings2,
  Key,
  Tag
} from 'lucide-react';

const RECENT_TRANSACTIONS = [
  { id: 'TRX-98273641', service: 'MTN Airtime - 08030000000', amount: 5000, status: 'SUCCESSFUL', date: '2 mins ago' },
  { id: 'TRX-44109283', service: 'API Wallet Funding', amount: 150000, status: 'SUCCESSFUL', date: '1 hr ago' },
  { id: 'TRX-10938475', service: 'IKEDC Token', amount: 20000, status: 'FAILED', date: 'Yesterday' },
  { id: 'TRX-55829102', service: 'WAEC Result Checker', amount: 3500, status: 'SUCCESSFUL', date: 'Yesterday' },
];

const QUICK_SERVICES = [
  { name: 'Airtime', icon: Smartphone, href: '/dashboard/airtime', color: 'text-blue-500' },
  { name: 'Data', icon: Wifi, href: '/dashboard/data', color: 'text-emerald-500' },
  { name: 'Electricity', icon: Zap, href: '/dashboard/electricity', color: 'text-amber-500' },
  { name: 'Cable TV', icon: Tv, href: '/dashboard/cable-tv', color: 'text-purple-500' },
  { name: 'Exam PINs', icon: GraduationCap, href: '/dashboard/exam-pins', color: 'text-rose-500' },
];

export default async function DashboardOverview() {
  const cookieStore = await cookies();
  const token = cookieStore.get('baxato_access')?.value;
  const payload = token ? await verifyAccessToken(token) : null;

  const user = payload?.userId ? await prisma.user.findUnique({
    where: { id: payload.userId },
    include: { wallet: true }
  }) : null;

  const balance = user?.wallet?.balance 
    ? (Number(user.wallet.balance) / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })
    : '0.00';

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      
      {/* HEADER */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">Welcome back, {user?.firstName || 'Admin'}. Here is your infrastructure status.</p>
        </div>
        <ThemeToggle />
      </div>

      {/* TOP ROW: COMPACT WALLET (Left) & QUICK STATS (Right) */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        
        {/* THE COMPACT WALLET CARD */}
        <div className="xl:col-span-2 bg-primary rounded-[1.5rem] p-6 lg:p-7 relative overflow-hidden shadow-lg shadow-primary/20 flex flex-col justify-between min-h-[180px] text-primary-foreground border border-primary/20">
          <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-gradient-to-br from-white/10 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
          
          <div className="relative z-10 flex-1 flex flex-col justify-center mb-5">
            <div className="flex items-center justify-between w-full mb-1">
              <p className="text-[10px] font-semibold text-primary-foreground/70 uppercase tracking-[0.2em]">
                Available Ledger
              </p>
              <CreditCard className="h-5 w-5 text-primary-foreground/30 hidden sm:block" />
            </div>
            
            <div className="flex items-start gap-1">
              <span className="text-2xl font-medium text-primary-foreground/70 mt-1">₦</span>
              <span className="text-4xl lg:text-5xl leading-none font-bold tracking-tight">{balance}</span>
            </div>
          </div>

          <div className="relative z-10 pt-4 border-t border-primary-foreground/10 flex flex-wrap items-center gap-3">
            <button className="flex items-center gap-2 bg-white text-primary hover:bg-white/90 px-5 py-2 rounded-xl font-bold text-[13px] transition-all shadow-sm active:scale-95">
              <Plus className="h-4 w-4 stroke-[3]" /> Fund Wallet
            </button>
            <Link href="/dashboard/pricing" className="flex items-center gap-2 bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20 border border-primary-foreground/10 px-5 py-2 rounded-xl font-semibold text-[13px] transition-all active:scale-95 backdrop-blur-md">
              <Tag className="h-4 w-4" /> Pricing
            </Link>
          </div>
        </div>

        {/* QUICK STATS MINI-GRID - TIGHTENED */}
        <div className="grid grid-cols-2 gap-3 h-full">
          <div className="bg-card border border-border/60 rounded-[1.25rem] p-4 flex flex-col justify-center shadow-sm">
            <Activity className="h-4 w-4 text-muted-foreground mb-2.5" />
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Today's Vends</p>
            <p className="text-lg font-bold text-foreground tracking-tight">1,284</p>
          </div>
          <div className="bg-card border border-border/60 rounded-[1.25rem] p-4 flex flex-col justify-center shadow-sm">
            <TrendingUp className="h-4 w-4 text-muted-foreground mb-2.5" />
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Success Rate</p>
            <p className="text-lg font-bold text-green-500 tracking-tight">99.8%</p>
          </div>
          <div className="bg-card border border-border/60 rounded-[1.25rem] p-4 flex flex-col justify-center shadow-sm">
            <Key className="h-4 w-4 text-muted-foreground mb-2.5" />
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">API Calls (24h)</p>
            <p className="text-lg font-bold text-foreground tracking-tight">45.2K</p>
          </div>
          <div className="bg-card border border-border/60 rounded-[1.25rem] p-4 flex flex-col justify-center shadow-sm">
            <Webhook className="h-4 w-4 text-muted-foreground mb-2.5" />
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Active Hooks</p>
            <p className="text-lg font-bold text-foreground tracking-tight">2 / 2</p>
          </div>
        </div>
      </div>

      {/* COMPACT API BANNER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-green-500/5 border border-green-500/20 rounded-xl px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </div>
          <p className="text-xs font-medium text-green-700 dark:text-green-400">
            <strong className="font-semibold">API Operational:</strong> All systems are routing traffic successfully.
          </p>
        </div>
        <Link href="/dashboard/api-keys" className="text-[11px] font-semibold text-green-700 dark:text-green-400 hover:opacity-80 flex items-center gap-1.5 bg-green-500/10 px-3 py-1.5 rounded-lg transition-colors">
          Manage Keys <Settings2 className="h-3 w-3" />
        </Link>
      </div>

      {/* QUICK OPERATIONS PILLS */}
      <div>
        <h2 className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest mb-3.5">Manual Operations</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {QUICK_SERVICES.map((service) => (
            <Link 
              key={service.name} 
              href={service.href}
              className="bg-card p-3 rounded-xl border border-border/60 shadow-sm hover:border-primary/40 hover:shadow-md transition-all group flex items-center gap-3 active:scale-95"
            >
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 bg-muted border border-border/50 transition-colors group-hover:bg-background ${service.color}`}>
                <service.icon className="h-4 w-4" />
              </div>
              <span className="text-[13px] font-semibold text-foreground group-hover:text-primary transition-colors">{service.name}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* RECENT TRANSACTIONS TABLE */}
      <div className="bg-card rounded-[1.25rem] border border-border/60 shadow-sm overflow-hidden mt-2">
        <div className="p-4 border-b border-border/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-bold text-foreground">Recent Transactions</h2>
          </div>
          <Link href="/dashboard/transactions" className="text-[11px] font-semibold text-primary hover:opacity-80">
            View All
          </Link>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/30 text-muted-foreground font-semibold uppercase text-[10px] tracking-widest border-b border-border/50">
              <tr>
                <th className="px-5 py-3.5">Reference ID</th>
                <th className="px-5 py-3.5">Service</th>
                <th className="px-5 py-3.5">Amount</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {RECENT_TRANSACTIONS.map((tx) => (
                <tr key={tx.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-5 py-3.5 font-mono text-muted-foreground text-[11px]">{tx.id}</td>
                  <td className="px-5 py-3.5 font-medium text-foreground text-xs">{tx.service}</td>
                  <td className="px-5 py-3.5 font-semibold text-foreground text-xs">
                    ₦{tx.amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[9px] font-bold border uppercase tracking-widest ${
                      tx.status === 'SUCCESSFUL' 
                        ? 'bg-green-500/10 text-green-600 border-green-500/20 dark:text-green-400' 
                        : 'bg-destructive/10 text-destructive border-destructive/20'
                    }`}>
                      {tx.status === 'SUCCESSFUL' ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      {tx.status}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-right text-muted-foreground whitespace-nowrap text-[11px]">
                    <div className="flex items-center justify-end gap-1.5">
                      <Clock className="h-3 w-3" /> {tx.date}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
