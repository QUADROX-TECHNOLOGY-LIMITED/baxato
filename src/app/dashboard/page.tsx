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
  Clock
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
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      
      {/* HEADER WITH THEME TOGGLE */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Welcome back, {user?.firstName || 'Admin'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Here is what is happening with your infrastructure today.</p>
        </div>
        {/* We place the Theme Toggle right here on the dashboard for easy access! */}
        <ThemeToggle />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* MAIN WALLET CARD */}
        <div className="lg:col-span-2 bg-card rounded-3xl p-8 relative overflow-hidden shadow-sm border border-border flex flex-col justify-between min-h-[240px]">
          {/* Subtle accent gradients that adapt to the theme */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary/5 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />
          
          <div className="relative z-10">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-2">Available Balance</p>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-medium text-muted-foreground">₦</span>
              <span className="text-5xl md:text-6xl font-bold tracking-tight text-foreground">{balance}</span>
            </div>
          </div>

          <div className="relative z-10 flex flex-wrap items-center gap-3 mt-8">
            <button className="flex items-center gap-2 bg-primary text-primary-foreground hover:opacity-90 px-6 py-3 rounded-xl font-semibold text-sm transition-all shadow-sm active:scale-95">
              <Plus className="h-4 w-4" /> Fund Wallet
            </button>
            <button className="flex items-center gap-2 bg-accent text-accent-foreground hover:bg-accent/80 px-6 py-3 rounded-xl font-semibold text-sm transition-all active:scale-95 border border-border">
              <ArrowUpRight className="h-4 w-4" /> Transfer
            </button>
          </div>
        </div>

        {/* STATUS CARD */}
        <div className="bg-card rounded-3xl p-8 border border-border shadow-sm flex flex-col justify-center">
           <div className="h-12 w-12 bg-green-500/10 rounded-2xl flex items-center justify-center mb-6 border border-green-500/20">
             <CheckCircle2 className="h-6 w-6 text-green-500" />
           </div>
           <h3 className="text-lg font-bold text-foreground">API Operational</h3>
           <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
             All systems are routing traffic successfully. No outages detected in the last 24 hours.
           </p>
           <Link href="/dashboard/api-keys" className="mt-6 text-sm font-bold text-primary hover:opacity-80 flex items-center gap-1 w-fit">
             Manage API Keys <ArrowUpRight className="h-4 w-4" />
           </Link>
        </div>

      </div>

      {/* QUICK SERVICES GRID */}
      <div>
        <h2 className="text-base font-bold text-foreground mb-4">Quick Operations</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {QUICK_SERVICES.map((service) => (
            <Link 
              key={service.name} 
              href={service.href}
              className="bg-card p-5 rounded-2xl border border-border shadow-sm hover:border-primary/50 hover:bg-accent transition-all group flex flex-col items-center justify-center text-center gap-3 active:scale-95"
            >
              <div className={`h-12 w-12 rounded-full flex items-center justify-center transition-transform group-hover:scale-110 bg-background border border-border shadow-sm ${service.color}`}>
                <service.icon className="h-5 w-5" />
              </div>
              <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{service.name}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* RECENT TRANSACTIONS TABLE */}
      <div className="bg-card rounded-3xl border border-border shadow-sm overflow-hidden">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-muted-foreground" />
            <h2 className="text-base font-bold text-foreground">Recent Transactions</h2>
          </div>
          <Link href="/dashboard/transactions" className="text-sm font-bold text-primary hover:opacity-80">
            View All
          </Link>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground font-semibold uppercase text-[11px] tracking-wider border-b border-border">
              <tr>
                <th className="px-6 py-4">Reference ID</th>
                <th className="px-6 py-4">Service</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {RECENT_TRANSACTIONS.map((tx) => (
                <tr key={tx.id} className="hover:bg-muted/50 transition-colors">
                  <td className="px-6 py-4 font-mono text-muted-foreground text-xs">{tx.id}</td>
                  <td className="px-6 py-4 font-medium text-foreground">{tx.service}</td>
                  <td className="px-6 py-4 font-bold text-foreground">
                    ₦{tx.amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4">
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border ${
                      tx.status === 'SUCCESSFUL' 
                        ? 'bg-green-500/10 text-green-600 border-green-500/20 dark:text-green-400' 
                        : 'bg-destructive/10 text-destructive border-destructive/20'
                    }`}>
                      {tx.status === 'SUCCESSFUL' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                      {tx.status}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right text-muted-foreground whitespace-nowrap text-xs">
                    <div className="flex items-center justify-end gap-1.5">
                      <Clock className="h-3.5 w-3.5" /> {tx.date}
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
