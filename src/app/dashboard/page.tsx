import { cookies } from 'next/headers';
import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/modules/auth/session';
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

// --- MOCK DATA FOR UI DESIGN ---
// We will replace this with a real Prisma query later.
const RECENT_TRANSACTIONS = [
  { id: 'TRX-98273641', service: 'MTN Airtime - 08030000000', amount: 5000, status: 'SUCCESSFUL', date: '2 mins ago' },
  { id: 'TRX-44109283', service: 'API Wallet Funding', amount: 150000, status: 'SUCCESSFUL', date: '1 hr ago' },
  { id: 'TRX-10938475', service: 'IKEDC Token', amount: 20000, status: 'FAILED', date: 'Yesterday' },
  { id: 'TRX-55829102', service: 'WAEC Result Checker', amount: 3500, status: 'SUCCESSFUL', date: 'Yesterday' },
];

const QUICK_SERVICES = [
  { name: 'Airtime', icon: Smartphone, href: '/dashboard/airtime', color: 'text-blue-600', bg: 'bg-blue-50' },
  { name: 'Data Bundle', icon: Wifi, href: '/dashboard/data', color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { name: 'Electricity', icon: Zap, href: '/dashboard/electricity', color: 'text-amber-600', bg: 'bg-amber-50' },
  { name: 'Cable TV', icon: Tv, href: '/dashboard/cable-tv', color: 'text-purple-600', bg: 'bg-purple-50' },
  { name: 'Exam PINs', icon: GraduationCap, href: '/dashboard/exam-pins', color: 'text-rose-600', bg: 'bg-rose-50' },
];

export default async function DashboardOverview() {
  // 1. Fetch User Data
  const cookieStore = await cookies();
  const token = cookieStore.get('baxato_access')?.value;
  const payload = token ? await verifyAccessToken(token) : null;

  const user = payload?.userId ? await prisma.user.findUnique({
    where: { id: payload.userId },
    include: { wallet: true }
  }) : null;

  // Format the balance (converting from Kobo to NGN if wallet exists)
  const balance = user?.wallet?.balance 
    ? (Number(user.wallet.balance) / 100).toLocaleString('en-NG', { minimumFractionDigits: 2 })
    : '0.00';

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      
      {/* --- HEADER --- */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">
          Welcome back, {user?.firstName || 'Admin'}
        </h1>
        <p className="text-sm text-gray-500 mt-1">Here is what is happening with your infrastructure today.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* --- MAIN WALLET CARD (Spans 2 columns on desktop) --- */}
        <div className="lg:col-span-2 bg-[#0B1120] rounded-3xl p-8 relative overflow-hidden shadow-xl shadow-blue-900/10 border border-slate-800">
          {/* Decorative Background Elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-purple-600/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />
          
          <div className="relative z-10 flex flex-col h-full justify-between gap-8">
            <div>
              <p className="text-sm font-semibold text-slate-400 uppercase tracking-widest mb-2">Available Ledger Balance</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-medium text-slate-300">₦</span>
                <span className="text-5xl md:text-6xl font-bold tracking-tight text-white">{balance}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button className="flex items-center gap-2 bg-[#2563EB] hover:bg-blue-600 text-white px-6 py-3 rounded-xl font-semibold text-sm transition-all shadow-lg shadow-blue-900/20 active:scale-95">
                <Plus className="h-4 w-4" /> Fund Wallet
              </button>
              <button className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-xl font-semibold text-sm transition-all backdrop-blur-sm active:scale-95">
                <ArrowUpRight className="h-4 w-4" /> Transfer
              </button>
            </div>
          </div>
        </div>

        {/* --- QUICK ACTION / STATUS CARD --- */}
        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm flex flex-col justify-center">
           <div className="h-12 w-12 bg-green-100 rounded-2xl flex items-center justify-center mb-6">
             <CheckCircle2 className="h-6 w-6 text-green-600" />
           </div>
           <h3 className="text-lg font-bold text-gray-900">Infrastructure Online</h3>
           <p className="text-sm text-gray-500 mt-2 leading-relaxed">
             Your API keys are active and routing traffic successfully. No provider outages detected in the last 24 hours.
           </p>
           <Link href="/dashboard/api-keys" className="mt-6 text-sm font-bold text-[#2563EB] hover:text-blue-800 flex items-center gap-1 w-fit">
             Manage API Keys <ArrowUpRight className="h-4 w-4" />
           </Link>
        </div>

      </div>

      {/* --- QUICK SERVICES GRID --- */}
      <div>
        <h2 className="text-base font-bold text-gray-900 mb-4">Manual Operations</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {QUICK_SERVICES.map((service) => (
            <Link 
              key={service.name} 
              href={service.href}
              className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all group flex flex-col items-center justify-center text-center gap-3 active:scale-95"
            >
              <div className={`h-12 w-12 rounded-full flex items-center justify-center transition-transform group-hover:scale-110 ${service.bg} ${service.color}`}>
                <service.icon className="h-6 w-6" />
              </div>
              <span className="text-sm font-bold text-gray-700 group-hover:text-gray-900">{service.name}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* --- RECENT TRANSACTIONS TABLE --- */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-gray-400" />
            <h2 className="text-base font-bold text-gray-900">Recent API Logs & Transactions</h2>
          </div>
          <Link href="/dashboard/transactions" className="text-sm font-bold text-[#2563EB] hover:text-blue-800">
            View All
          </Link>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-500 font-semibold uppercase text-[11px] tracking-wider">
              <tr>
                <th className="px-6 py-4 rounded-tl-lg">Reference ID</th>
                <th className="px-6 py-4">Service</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right rounded-tr-lg">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {RECENT_TRANSACTIONS.map((tx) => (
                <tr key={tx.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4 font-mono text-gray-600">{tx.id}</td>
                  <td className="px-6 py-4 font-medium text-gray-900">{tx.service}</td>
                  <td className="px-6 py-4 font-bold text-gray-900">
                    ₦{tx.amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4">
                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                      tx.status === 'SUCCESSFUL' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                    }`}>
                      {tx.status === 'SUCCESSFUL' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                      {tx.status}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right text-gray-500 whitespace-nowrap">
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
