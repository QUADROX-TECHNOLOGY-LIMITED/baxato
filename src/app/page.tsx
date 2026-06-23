'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  Terminal, 
  ShieldCheck, 
  Zap, 
  Code2, 
  ArrowRight, 
  Smartphone, 
  Wifi, 
  Lightbulb, 
  Tv,
  CheckCircle2,
  Server,
  Activity
} from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';

// --- CUSTOM HOOK FOR ANIMATED NUMBERS ---
function AnimatedCounter({ end, duration = 2000, suffix = "" }: { end: number, duration?: number, suffix?: string }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      // Ease out cubic function for smooth deceleration
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(easeOut * end));
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    requestAnimationFrame(animate);
  }, [end, duration]);

  return <span>{count.toLocaleString()}{suffix}</span>;
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30">
      
      {/* --- NAVIGATION BAR --- */}
      <nav className="fixed top-0 inset-x-0 h-16 bg-background/80 backdrop-blur-md border-b border-border z-50">
        <div className="max-w-7xl mx-auto px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 bg-primary rounded-xl flex items-center justify-center font-black text-primary-foreground text-sm shadow-md">
              B
            </div>
            <span className="text-xl font-bold tracking-tight">Baxato</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <Link href="#features" className="hover:text-foreground transition-colors">Infrastructure</Link>
            <Link href="#developers" className="hover:text-foreground transition-colors">Developers</Link>
            <Link href="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>
            <Link href="/docs" className="hover:text-foreground transition-colors">Documentation</Link>
          </div>

          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link href="/login" className="hidden md:block text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors">
              Sign In
            </Link>
            <Link href="/register" className="bg-primary text-primary-foreground hover:bg-primary/90 px-5 py-2 rounded-lg text-sm font-bold transition-all shadow-sm active:scale-95">
              Get API Keys
            </Link>
          </div>
        </div>
      </nav>

      <main className="pt-16">
        {/* --- HERO SECTION --- */}
        <section className="relative overflow-hidden pt-24 pb-32">
          {/* Background Gradients */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-primary/10 rounded-full blur-[100px] pointer-events-none -z-10" />
          
          <div className="max-w-7xl mx-auto px-6 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-8 border border-primary/20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              v1.0 API is now live globally
            </div>
            
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-tight">
              The Enterprise API for <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">
                Utility Infrastructure.
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto mb-10 leading-relaxed">
              Programmatically vend Airtime, Data, Electricity, and Cable TV with zero downtime. Built for fintechs, banks, and high-volume platforms requiring sub-second latency and absolute reliability.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/register" className="w-full sm:w-auto flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-4 rounded-xl text-base font-bold transition-all shadow-lg shadow-primary/20 active:scale-95">
                Start Building <ArrowRight className="h-5 w-5" />
              </Link>
              <Link href="/docs" className="w-full sm:w-auto flex items-center justify-center gap-2 bg-card text-foreground border border-border hover:bg-accent px-8 py-4 rounded-xl text-base font-bold transition-all active:scale-95">
                <Terminal className="h-5 w-5 text-muted-foreground" /> Read the Docs
              </Link>
            </div>
          </div>
        </section>

        {/* --- STATS SECTION (AUTO COUNTING) --- */}
        <section className="border-y border-border bg-muted/30">
          <div className="max-w-7xl mx-auto px-6 py-12">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-border">
              <div className="text-center px-4">
                <p className="text-4xl font-black text-foreground mb-1"><AnimatedCounter end={99} suffix=".99%" /></p>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Uptime SLA</p>
              </div>
              <div className="text-center px-4">
                <p className="text-4xl font-black text-foreground mb-1"><AnimatedCounter end={120} suffix="ms" /></p>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Avg Response Time</p>
              </div>
              <div className="text-center px-4">
                <p className="text-4xl font-black text-foreground mb-1"><AnimatedCounter end={50} suffix="M+" /></p>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">API Requests Processed</p>
              </div>
              <div className="text-center px-4">
                <p className="text-4xl font-black text-foreground mb-1"><AnimatedCounter end={24} suffix="/7" /></p>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Engineering Support</p>
              </div>
            </div>
          </div>
        </section>

        {/* --- CORE SERVICES BENTO GRID --- */}
        <section id="features" className="py-24">
          <div className="max-w-7xl mx-auto px-6">
            <div className="mb-16">
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">One integration. All utilities.</h2>
              <p className="text-muted-foreground text-lg max-w-2xl">Stop managing multiple vendor connections. Our unified API endpoint handles routing, failover, and reconciliation automatically.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Feature 1 */}
              <div className="bg-card border border-border p-8 rounded-[2rem] shadow-sm hover:shadow-md transition-shadow">
                <div className="h-12 w-12 bg-blue-500/10 rounded-xl flex items-center justify-center mb-6 border border-blue-500/20">
                  <Smartphone className="h-6 w-6 text-blue-500" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">Airtime & Data</h3>
                <p className="text-muted-foreground leading-relaxed text-sm">Instant top-ups across all major African telco networks. Automatic network detection and intelligent failover routing ensures maximum success rates.</p>
              </div>

              {/* Feature 2 */}
              <div className="bg-card border border-border p-8 rounded-[2rem] shadow-sm hover:shadow-md transition-shadow">
                <div className="h-12 w-12 bg-amber-500/10 rounded-xl flex items-center justify-center mb-6 border border-amber-500/20">
                  <Lightbulb className="h-6 w-6 text-amber-500" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">Electricity Tokens</h3>
                <p className="text-muted-foreground leading-relaxed text-sm">Direct connections to national grids and DisCos. Retrieve meter details and generate prepaid electricity tokens with zero manual intervention.</p>
              </div>

              {/* Feature 3 */}
              <div className="bg-card border border-border p-8 rounded-[2rem] shadow-sm hover:shadow-md transition-shadow">
                <div className="h-12 w-12 bg-purple-500/10 rounded-xl flex items-center justify-center mb-6 border border-purple-500/20">
                  <Tv className="h-6 w-6 text-purple-500" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">Cable TV</h3>
                <p className="text-muted-foreground leading-relaxed text-sm">Automate subscription renewals for DSTV, GOTV, and Startimes. Includes instant customer smartcard validation endpoints.</p>
              </div>
            </div>
          </div>
        </section>

        {/* --- DEVELOPER EXPERIENCE (DX) SECTION --- */}
        <section id="developers" className="py-24 bg-card border-y border-border overflow-hidden">
          <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-muted text-muted-foreground text-xs font-bold uppercase tracking-widest mb-6">
                <Code2 className="h-4 w-4" /> Developer First
              </div>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-6">Built for scale. Designed for humans.</h2>
              <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
                We obsessed over the developer experience so your team doesn't have to. Predictable REST endpoints, clear JSON responses, and native idempotency keys to prevent duplicate transactions.
              </p>
              
              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                  <span className="text-foreground font-medium">Idempotent Requests via `X-Reference-Id`</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                  <span className="text-foreground font-medium">Real-time Webhook Notifications</span>
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />
                  <span className="text-foreground font-medium">Comprehensive API testing sandbox</span>
                </li>
              </ul>

              <Link href="/docs" className="text-primary font-bold hover:underline flex items-center gap-1 w-fit">
                Explore Documentation <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Mock Code Editor */}
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full -z-10" />
              <div className="bg-[#0D1117] border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                <div className="bg-[#161B22] px-4 py-3 border-b border-white/5 flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
                    <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
                    <div className="w-3 h-3 rounded-full bg-green-500/80"></div>
                  </div>
                  <span className="ml-4 text-xs font-mono text-white/50">POST /v1/vend/airtime</span>
                </div>
                <div className="p-6 overflow-x-auto">
                  <pre className="font-mono text-sm leading-relaxed text-white/90">
<span className="text-pink-400">curl</span> -X POST https://api.baxato.com/v1/vend/airtime \
  -H <span className="text-green-300">"Authorization: Bearer sk_live_your_key"</span> \
  -H <span className="text-green-300">"Content-Type: application/json"</span> \
  -H <span className="text-green-300">"X-Reference-Id: REQ-12345"</span> \
  -d <span className="text-amber-200">'{'{'}</span>
    <span className="text-blue-300">"network"</span>: <span className="text-green-300">"MTN"</span>,
    <span className="text-blue-300">"amount"</span>: <span className="text-orange-300">5000</span>,
    <span className="text-blue-300">"phone"</span>: <span className="text-green-300">"08030000000"</span>
  <span className="text-amber-200">{'}'}'</span>
                  </pre>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* --- BOTTOM CTA --- */}
        <section className="py-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-primary/5 -z-10" />
          <div className="max-w-4xl mx-auto px-6 text-center">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight mb-6">Ready to upgrade your infrastructure?</h2>
            <p className="text-lg text-muted-foreground mb-10">
              Join the businesses processing millions in daily transactions with Baxato. Create your account and get your live API keys in under 2 minutes.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link href="/register" className="bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-4 rounded-xl text-base font-bold transition-all shadow-lg active:scale-95">
                Create Free Account
              </Link>
              <Link href="/contact" className="bg-card text-foreground border border-border hover:bg-accent px-8 py-4 rounded-xl text-base font-bold transition-all active:scale-95">
                Contact Sales
              </Link>
            </div>
          </div>
        </section>

      </main>

      {/* --- FOOTER --- */}
      <footer className="border-t border-border bg-card">
        <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 bg-primary rounded-lg flex items-center justify-center font-black text-primary-foreground text-[10px]">
              B
            </div>
            <span className="text-lg font-bold tracking-tight">Baxato</span>
          </div>
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} Baxato Infrastructure Ltd. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-sm font-medium text-muted-foreground">
            <Link href="/terms" className="hover:text-foreground">Terms</Link>
            <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
            <Link href="/status" className="hover:text-foreground flex items-center gap-1.5">
               <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              System Status
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
