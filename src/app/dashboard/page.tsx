import { cookies } from 'next/headers';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/modules/auth/session';
import { ThemeToggle } from '@/components/ThemeToggle';
import { 
  Plus, 
  ArrowUpRight, 
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
  Key // <-- Added the missing import here
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
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      
      {/* HEADER & COMPACT API BANNER */}
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Welcome back, {user?.firstName || 'Admin'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Here is the status of your infrastructure today.</p>
          </div>
          <ThemeToggle />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </div>
            <p className="text-sm font-medium text-green-700 dark:text-green-400">
              <strong className="font-bold">API Operational:</strong> All systems are routing traffic successfully.
            </p>
          </div>
          <Link href="/dashboard/api-keys" className="text-xs font-bold text-green-700 dark:text-green-400 hover:opacity-80 flex items-center gap-1 bg-green-500/10 px-3 py-1.5 rounded-lg transition-colors">
            Manage Keys <Settings2 className="h-3 w-3" />
          </Link>
        </div>
      </div>

      {/* TOP ROW: WALLET (Left) & QUICK STATS (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* THE BAXATO PREMIUM WALLET CARD */}
        <div className="lg:col-span-2 bg-gradient-to-br from-primary to-blue-800 rounded-3xl p-8 relative overflow-hidden shadow-lg shadow-primary/20 flex flex-col justify-between min-h-[220px] text-white border border-primary/50">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          
          <div className="relative z-10 flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold text-white/70 uppercase tracking-widest mb-1">Ledger Balance</p>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-medium text-white/80">₦</span>
                <span className="text-5xl md:text-6xl font-bold tracking-tight">{balance}</span>
              </div>
            </div>
            <CreditCard className="h-8 w-8 text-white/30 hidden sm:block" />
          </div>

          <div className="relative z-10 flex items-center gap-3 mt-8">
            <button className="flex items-center gap-2 bg-white text-primary hover:bg-white/90 px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-sm active:scale-95">
              <Plus className="h-4 w-4 stroke-[3]" /> Fund Wallet
            </button>
            <button className="flex items-center gap-2 bg-white/10 text-white hover:bg-white/20 border border-white/20 px-6 py-3 rounded-xl font-semibold text-sm transition-all active:scale-95 backdrop-blur-md">
              <ArrowUpRight className="h-4 w-4" /> Transfer
            </button>
          </div>
        </div>

        {/* QUICK STATS MINI-GRID */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-2xl p-4 flex flex-col justify-center shadow-sm">
            <Activity className="h-5 w-5 text-muted-foreground mb-3" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Today's Vends</p>
            <p className="text-2xl font-bold text-foreground">1,284</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-4 flex flex-col justify-center shadow-sm">
            <TrendingUp className="h-5 w-5 text-muted-foreground mb-3" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Success Rate</p>
            <p className="text-2xl font-bold text-green-500">99.8%</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-4 flex flex-col justify-center shadow-sm">
            <Key className="h-5 w-5 text-muted-foreground mb-3" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">API Calls (24h)</p>
            <p className="text-2xl font-bold text-foreground">45.2K</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-4 flex flex-col justify-center shadow-sm">
            <Webhook className="h-5 w-5 text-muted-foreground mb-3" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Active Hooks</p>
            <p className="text-2xl font-bold text-foreground">2 / 2</p>
          </div>
        </div>
      </div>

      {/* QUICK OPERATIONS PILLS */}
      <div>
        <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4">Manual Operations</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {QUICK_SERVICES.map((service) => (
            <Link 
              key={service.name} 
              href={service.href}
              className="bg-card p-3 rounded-xl border border-border shadow-sm hover:border-primary/50 hover:shadow-md transition-all group flex items-center gap-3 active:scale-95"
            >
              <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 bg-muted border border-border transition-colors group-hover:bg-background ${service.color}`}>
                <service.icon className="h-4 w-4" />
              </div>
              <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{service.name}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* RECENT TRANSACTIONS TABLE */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="p-5 border-b border-border flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-bold text-foreground">Recent Transactions</h2>
          </div>
          <Link href="/dashboard/transactions" className="text-xs font-bold text-primary hover:opacity-80">
            View All
          </Link>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground font-semibold uppercase text-[10px] tracking-wider border-b border-border">
              <tr>
                <th className="px-5 py-3">Reference ID</th>
                <th className="px-5 py-3">Service</th>
                <th className="px-5 py-3">Amount</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {RECENT_TRANSACTIONS.map((tx) => (
                <tr key={tx.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-5 py-3.5 font-mono text-muted-foreground text-xs">{tx.id}</td>
                  <td className="px-5 py-3.5 font-medium text-foreground text-xs">{tx.service}</td>
                  <td className="px-5 py-3.5 font-bold text-foreground text-xs">
                    ₦{tx.amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-5 py-3.5">
                    <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold border uppercase tracking-wider ${
                      tx.status === 'SUCCESSFUL' 
                        ? 'bg-green-500/10 text-green-600 border-green-500/20 dark:text-green-400' 
                        : 'bg-destructive/10 text-destructive border-destructive/20'
                    }`}>
                      {tx.status === 'SUCCESSFUL' ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                      {tx.status}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-right text-muted-foreground whitespace-nowrap text-xs">
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
