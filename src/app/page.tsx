'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { ThemeToggle } from '@/components/ThemeToggle';
import { 
  Terminal, 
  Zap, 
  ShieldCheck, 
  Cpu, 
  Globe, 
  Smartphone, 
  Wifi, 
  Tv, 
  GraduationCap,
  ArrowRight,
  Code2,
  CheckCircle2
} from 'lucide-react';

// --- AUTO COUNTER COMPONENT ---
const AnimatedCounter = ({ end, suffix = "", decimals = 0, duration = 2000 }: { end: number, suffix?: string, decimals?: number, duration?: number }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTimestamp: number | null = null;
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // Ease out cubic function for smooth deceleration
      const easeProgress = 1 - Math.pow(1 - progress, 3); 
      setCount(easeProgress * end);
      if (progress < 1) {
        window.requestAnimationFrame(step);
      }
    };
    window.requestAnimationFrame(step);
  }, [end, duration]);

  return (
    <span className="font-bold tracking-tight">
      {count.toFixed(decimals)}{suffix}
    </span>
  );
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/30 font-sans">
      
      {/* NAVIGATION */}
      <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center font-black text-primary-foreground text-sm shadow-md">
              B
            </div>
            <span className="text-xl font-bold tracking-tight">Baxato</span>
          </div>
          
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <Link href="#features" className="hover:text-foreground transition-colors">Features</Link>
            <Link href="#services" className="hover:text-foreground transition-colors">Services</Link>
            <Link href="#developers" className="hover:text-foreground transition-colors">Developers</Link>
            <Link href="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>
          </nav>

          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link href="/login" className="hidden sm:block text-sm font-semibold hover:text-primary transition-colors">
              Sign In
            </Link>
            <Link href="/register" className="bg-primary text-primary-foreground hover:opacity-90 px-5 py-2 rounded-xl text-sm font-bold transition-all shadow-sm active:scale-95">
              Get API Keys
            </Link>
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative pt-24 pb-20 md:pt-32 md:pb-28 overflow-hidden">
        {/* Abstract Background Gradients */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[100px] pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-6 relative z-10 text-center flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-widest mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            v2.0 API is Live
          </div>
          
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 max-w-4xl leading-[1.1]">
            Enterprise Infrastructure for <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">African Utilities.</span>
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl leading-relaxed">
            The most reliable, high-throughput API for VTU, Electricity, Data, and Cable TV. Built for fintechs, banks, and high-volume aggregators.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
            <Link href="/register" className="w-full sm:w-auto flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:opacity-90 px-8 py-4 rounded-2xl text-base font-bold transition-all shadow-lg shadow-primary/20 active:scale-95">
              Start Building for Free <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/docs" className="w-full sm:w-auto flex items-center justify-center gap-2 bg-card border border-border/60 hover:bg-muted text-foreground px-8 py-4 rounded-2xl text-base font-bold transition-all active:scale-95">
              <Terminal className="h-4 w-4" /> Read the Docs
            </Link>
          </div>
        </div>
      </section>

      {/* AUTO COUNTING STATS SECTION */}
      <section className="border-y border-border/50 bg-muted/30">
        <div className="max-w-7xl mx-auto px-6 py-12 grid grid-cols-2 md:grid-cols-4 gap-8 divide-x divide-border/50">
          <div className="flex flex-col items-center text-center px-4">
            <h3 className="text-4xl md:text-5xl text-foreground mb-2">
              <AnimatedCounter end={99.99} decimals={2} suffix="%" />
            </h3>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Guaranteed Uptime</p>
          </div>
          <div className="flex flex-col items-center text-center px-4">
            <h3 className="text-4xl md:text-5xl text-foreground mb-2">
              <AnimatedCounter end={50} suffix="M+" />
            </h3>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Monthly API Calls</p>
          </div>
          <div className="flex flex-col items-center text-center px-4">
            <h3 className="text-4xl md:text-5xl text-foreground mb-2">
              <AnimatedCounter end={150} suffix="ms" />
            </h3>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Avg Response Time</p>
          </div>
          <div className="flex flex-col items-center text-center px-4">
            <h3 className="text-4xl md:text-5xl text-foreground mb-2">
              <AnimatedCounter end={100} suffix="%" />
            </h3>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Delivery Rate</p>
          </div>
        </div>
      </section>

      {/* CORE SERVICES */}
      <section id="services" className="py-24 max-w-7xl mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">One API. All Utilities.</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">Integrate once and gain instant access to every major network and biller in the country.</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { title: "Airtime & Data", desc: "Instant automated top-ups for MTN, Airtel, GLO, and 9Mobile with dynamic routing.", icon: Smartphone, color: "text-blue-500", bg: "bg-blue-500/10" },
            { title: "Electricity Tokens", desc: "Prepaid and postpaid meter vending for IKEDC, EKEDC, KEDCO, and all major DisCos.", icon: Zap, color: "text-amber-500", bg: "bg-amber-500/10" },
            { title: "Cable TV", desc: "Instant subscription renewals and bouquet upgrades for DSTV, GOTV, and Startimes.", icon: Tv, color: "text-purple-500", bg: "bg-purple-500/10" },
            { title: "Education PINs", desc: "Direct generation of result checker PINs for WAEC, NECO, and NABTEB.", icon: GraduationCap, color: "text-emerald-500", bg: "bg-emerald-500/10" },
          ].map((service, i) => (
            <div key={i} className="bg-card border border-border/60 rounded-[1.5rem] p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className={`h-12 w-12 rounded-xl flex items-center justify-center mb-6 ${service.bg} ${service.color}`}>
                <service.icon className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold mb-2 text-foreground">{service.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{service.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* DEVELOPER EXPERIENCE SECTION */}
      <section id="developers" className="py-24 bg-card border-y border-border/50">
        <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-16 items-center">
          
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted border border-border/60 text-foreground text-xs font-bold uppercase tracking-widest mb-6">
              <Code2 className="h-4 w-4 text-primary" /> Developer First
            </div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-6">Integration that takes minutes, not weeks.</h2>
            <p className="text-muted-foreground mb-8 text-lg leading-relaxed">
              We built Baxato with developers in mind. Clean RESTful architecture, predictable JSON responses, and instant webhook notifications for async transactions.
            </p>
            
            <ul className="space-y-4 mb-8">
              {[
                "Idempotency keys to prevent duplicate charges",
                "Instant Webhook delivery with payload signing",
                "Comprehensive SDKs for Node.js and PHP",
                "99.99% SLA backed enterprise uptime"
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-sm font-medium text-foreground">
                  <CheckCircle2 className="h-5 w-5 text-primary shrink-0" /> {item}
                </li>
              ))}
            </ul>
            
            <Link href="/docs" className="text-primary font-bold hover:underline flex items-center gap-1 w-fit">
              Explore the API Reference <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {/* MOCK TERMINAL */}
          <div className="rounded-2xl overflow-hidden border border-border/50 shadow-2xl bg-[#0B1120]">
            <div className="flex items-center px-4 py-3 border-b border-white/10 bg-[#0F172A]">
              <div className="flex gap-1.5">
                <div className="h-3 w-3 rounded-full bg-red-500/80" />
                <div className="h-3 w-3 rounded-full bg-amber-500/80" />
                <div className="h-3 w-3 rounded-full bg-green-500/80" />
              </div>
              <span className="ml-4 text-xs font-mono text-slate-400">POST /v1/airtime/vend</span>
            </div>
            <div className="p-6 overflow-x-auto">
              <pre className="text-sm font-mono leading-relaxed">
                <code className="text-slate-300">
<span className="text-pink-400">const</span> response = <span className="text-pink-400">await</span> fetch(<span className="text-green-300">'https://api.baxato.com/v1/airtime'</span>, {'{'}
  method: <span className="text-green-300">'POST'</span>,
  headers: {'{'}
    <span className="text-blue-300">'Authorization'</span>: <span className="text-green-300">'Bearer pk_live_...'</span>,
    <span className="text-blue-300">'Content-Type'</span>: <span className="text-green-300">'application/json'</span>
  {'}'},
  body: JSON.<span className="text-blue-300">stringify</span>({'{'}
    network: <span className="text-green-300">'MTN'</span>,
    amount: <span className="text-orange-300">5000</span>,
    phone: <span className="text-green-300">'08030000000'</span>,
    reference: <span className="text-green-300">'tx_123456789'</span>
  {'}'})
{'}'});

<span className="text-slate-500">// Returns:</span>
<span className="text-slate-500">// {'{'}</span>
<span className="text-slate-500">//   "status": "success",</span>
<span className="text-slate-500">//   "message": "Airtime vended successfully",</span>
<span className="text-slate-500">//   "data": {'{'} "reference": "tx_123456789", "balance": 45000 {'}'}</span>
<span className="text-slate-500">// {'}'}</span>
                </code>
              </pre>
            </div>
          </div>

        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-background border-t border-border/50 py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2.5">
            <div className="h-6 w-6 bg-primary rounded-md flex items-center justify-center font-black text-primary-foreground text-[10px]">
              B
            </div>
            <span className="text-lg font-bold tracking-tight">Baxato API</span>
          </div>
          
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} TechNova Ltd. All rights reserved.
          </p>

          <div className="flex gap-6 text-sm font-medium text-muted-foreground">
            <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link href="/contact" className="hover:text-foreground transition-colors">Contact</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
