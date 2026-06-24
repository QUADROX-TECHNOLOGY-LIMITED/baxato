'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { 
  ArrowRight, 
  Terminal, 
  ShieldCheck, 
  Zap, 
  Activity, 
  ServerCrash,
  ChevronRight,
  Code2,
  Cpu,
  Globe2,
  Smartphone,
  Tv,
  GraduationCap
} from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';

// --- AUTO-COUNTING NUMBER COMPONENT ---
function AnimatedCounter({ end, duration = 2000, suffix = "", decimals = 0 }: { end: number, duration?: number, suffix?: string, decimals?: number }) {
  const [count, setCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setIsVisible(true);
    }, { threshold: 0.1 });
    
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;
    let startTimestamp: number | null = null;
    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // Ease out quad
      const easeProgress = progress * (2 - progress);
      setCount(easeProgress * end);
      if (progress < 1) {
        window.requestAnimationFrame(step);
      } else {
        setCount(end);
      }
    };
    window.requestAnimationFrame(step);
  }, [isVisible, end, duration]);

  return (
    <span ref={ref}>
      {count.toFixed(decimals)}{suffix}
    </span>
  );
}

// --- MAIN LANDING PAGE ---
export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/30 selection:text-primary">
      
      {/* --- NAVIGATION --- */}
      <header className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? 'bg-background/80 backdrop-blur-md border-b border-border shadow-sm py-3' : 'bg-transparent py-5'}`}>
        <div className="max-w-[1400px] mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center font-black text-primary-foreground text-sm shadow-md">
              B
            </div>
            <span className="text-xl font-bold tracking-tight text-foreground">BAXATO</span>
          </div>
          
          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-muted-foreground">
            <Link href="#products" className="hover:text-foreground transition-colors">Products</Link>
            <Link href="#developers" className="hover:text-foreground transition-colors">Developers</Link>
            <Link href="#infrastructure" className="hover:text-foreground transition-colors">Infrastructure</Link>
            <Link href="#company" className="hover:text-foreground transition-colors">Company</Link>
          </nav>

          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link href="/login" className="hidden sm:block text-sm font-semibold text-foreground hover:text-primary transition-colors">
              Sign In
            </Link>
            <Link href="/login" className="bg-primary text-primary-foreground hover:bg-primary/90 px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md hover:shadow-primary/20 active:scale-95">
              Get API Keys
            </Link>
          </div>
        </div>
      </header>

      {/* --- HERO SECTION --- */}
      <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden">
        {/* Background Architectural Gradients */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/20 blur-[120px] rounded-[100%] opacity-50 pointer-events-none" />
        
        <div className="max-w-[1400px] mx-auto px-6 relative z-10 grid lg:grid-cols-2 gap-12 items-center">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-widest mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              v2.0 API is Live
            </div>
            <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-foreground leading-[1.1] mb-6">
              Enterprise API Infrastructure for <span className="text-primary">Africa.</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 leading-relaxed">
              Scalable, secure, and lightning-fast APIs for Airtime, Data, Electricity, and Cable TV. Built by <strong className="text-foreground">XATO Technologies Limited</strong> to power the next generation of fintechs and enterprise businesses.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link href="/login" className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-4 rounded-2xl font-bold text-base transition-all shadow-xl shadow-primary/20 active:scale-95">
                Start Building <ArrowRight className="h-5 w-5" />
              </Link>
              <Link href="#developers" className="flex items-center gap-2 bg-muted text-foreground hover:bg-accent border border-border px-8 py-4 rounded-2xl font-bold text-base transition-all active:scale-95">
                <Terminal className="h-5 w-5" /> Read the Docs
              </Link>
            </div>
          </div>

          {/* Abstract Hero Tech Image / Code Visualization */}
          <div className="relative mx-auto w-full max-w-[600px] rounded-2xl border border-border bg-card shadow-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/50">
              <div className="h-3 w-3 rounded-full bg-red-500" />
              <div className="h-3 w-3 rounded-full bg-amber-500" />
              <div className="h-3 w-3 rounded-full bg-green-500" />
              <span className="ml-2 text-xs font-mono text-muted-foreground">POST /v1/transactions/vend</span>
            </div>
            <div className="p-6 bg-[#0B1120] font-mono text-sm overflow-x-auto text-slate-300 leading-relaxed">
              <p><span className="text-purple-400">const</span> <span className="text-blue-400">response</span> = <span className="text-purple-400">await</span> <span className="text-amber-300">fetch</span>(<span className="text-green-300">'https://api.baxato.com/v1/vend'</span>, {'{'}</p>
              <p className="pl-4">method: <span className="text-green-300">'POST'</span>,</p>
              <p className="pl-4">headers: {'{'}</p>
              <p className="pl-8"><span className="text-green-300">'Authorization'</span>: <span className="text-green-300">'Bearer pk_live_xato_...'</span>,</p>
              <p className="pl-8"><span className="text-green-300">'Content-Type'</span>: <span className="text-green-300">'application/json'</span></p>
              <p className="pl-4">{'}'},</p>
              <p className="pl-4">body: <span className="text-blue-400">JSON</span>.<span className="text-amber-300">stringify</span>({'{'}</p>
              <p className="pl-8">service_type: <span className="text-green-300">'MTN_DATA'</span>,</p>
              <p className="pl-8">account_ref: <span className="text-green-300">'08030000000'</span>,</p>
              <p className="pl-8">amount: <span className="text-orange-400">5000</span></p>
              <p className="pl-4">{'}'})</p>
              <p>{'}'});</p>
              <br/>
              <p className="text-slate-500">// Returns instantly with status 200 OK</p>
              <p><span className="text-blue-400">console</span>.<span className="text-amber-300">log</span>(await response.json());</p>
            </div>
          </div>
        </div>
      </section>

      {/* --- TRUSTED PROVIDERS LOGOS --- */}
      <section className="py-10 border-y border-border bg-muted/20">
        <div className="max-w-[1400px] mx-auto px-6">
          <p className="text-center text-sm font-bold text-muted-foreground uppercase tracking-widest mb-8">Direct Integration with Tier-1 Providers</p>
          <div className="flex flex-wrap justify-center items-center gap-12 md:gap-24 opacity-70 grayscale hover:grayscale-0 transition-all duration-500">
            <img src="https://upload.wikimedia.org/wikipedia/commons/9/93/New-mtn-logo.jpg" alt="MTN" className="h-12 object-contain rounded-full bg-white p-1" />
            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/f/f6/Airtel_logo_2010.svg/512px-Airtel_logo_2010.svg.png" alt="Airtel" className="h-10 object-contain" />
            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/8/86/Globacom_logo.svg/512px-Globacom_logo.svg.png" alt="Glo" className="h-12 object-contain" />
            <img src="https://upload.wikimedia.org/wikipedia/en/thumb/0/07/9mobile_logo.svg/512px-9mobile_logo.svg.png" alt="9mobile" className="h-10 object-contain" />
            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/DStv_logo_2020.svg/512px-DStv_logo_2020.svg.png" alt="DSTV" className="h-10 object-contain" />
          </div>
        </div>
      </section>

      {/* --- ANIMATED METRICS --- */}
      <section className="py-24 max-w-[1400px] mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="border border-border bg-card rounded-[2rem] p-10 text-center shadow-sm">
            <h3 className="text-5xl md:text-6xl font-extrabold text-foreground tracking-tighter mb-4">
              <AnimatedCounter end={99.99} decimals={2} suffix="%" />
            </h3>
            <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Guaranteed Uptime SLA</p>
          </div>
          <div className="border border-border bg-card rounded-[2rem] p-10 text-center shadow-sm">
            <h3 className="text-5xl md:text-6xl font-extrabold text-primary tracking-tighter mb-4">
              <AnimatedCounter end={150} suffix="ms+" />
            </h3>
            <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Average API Latency</p>
          </div>
          <div className="border border-border bg-card rounded-[2rem] p-10 text-center shadow-sm">
            <h3 className="text-5xl md:text-6xl font-extrabold text-foreground tracking-tighter mb-4">
              <AnimatedCounter end={10} suffix="M+" />
            </h3>
            <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Monthly Transactions</p>
          </div>
        </div>
      </section>

      {/* --- ENTERPRISE FEATURES --- */}
      <section id="infrastructure" className="py-24 bg-muted/30 border-y border-border">
        <div className="max-w-[1400px] mx-auto px-6">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground mb-6">Built for scale. Designed for reliability.</h2>
            <p className="text-lg text-muted-foreground">We bypass aggregators and connect directly to telecom switches to ensure your transactions never fail during peak traffic.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-card border border-border p-8 rounded-[2rem] shadow-sm hover:shadow-md transition-shadow">
              <div className="h-14 w-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
                <ShieldCheck className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">Bank-Grade Security</h3>
              <p className="text-muted-foreground leading-relaxed">End-to-end encryption, IP whitelisting, and rotating API keys ensure your financial data and operations remain completely secure.</p>
            </div>
            
            <div className="bg-card border border-border p-8 rounded-[2rem] shadow-sm hover:shadow-md transition-shadow">
              <div className="h-14 w-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
                <Zap className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">Lightning Fast Routing</h3>
              <p className="text-muted-foreground leading-relaxed">Our proprietary routing algorithm automatically switches pathways to guarantee sub-second delivery for airtime and data vends.</p>
            </div>

            <div className="bg-card border border-border p-8 rounded-[2rem] shadow-sm hover:shadow-md transition-shadow">
              <div className="h-14 w-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-6">
                <Activity className="h-7 w-7 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-3">Real-time Webhooks</h3>
              <p className="text-muted-foreground leading-relaxed">Stop polling our servers. We push instant, payload-rich webhook notifications to your endpoints the millisecond a transaction settles.</p>
            </div>
          </div>
        </div>
      </section>

      {/* --- COMPREHENSIVE SERVICES --- */}
      <section id="products" className="py-24 max-w-[1400px] mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-6">One integration.<br/>Every utility service.</h2>
            <p className="text-lg text-muted-foreground mb-8">Access the entire spectrum of Nigerian utility services through a single, unified REST API architecture. No need to manage multiple vendor contracts.</p>
            
            <div className="space-y-6">
              {[
                { icon: Smartphone, title: 'Airtime & Data VTU', desc: 'Instant top-ups for MTN, Airtel, Glo, and 9mobile.' },
                { icon: Zap, title: 'Electricity Tokens', desc: 'Prepaid meter token generation for all DisCos (IKEDC, EKEDC, etc).' },
                { icon: Tv, title: 'Cable TV Subscriptions', desc: 'Automated renewals for DSTV, GOTV, and Startimes.' },
                { icon: GraduationCap, title: 'Educational PINs', desc: 'WAEC, NECO, and JAMB result checking PIN generation.' }
              ].map((item, idx) => (
                <div key={idx} className="flex gap-4">
                  <div className="mt-1 h-10 w-10 shrink-0 bg-muted border border-border rounded-xl flex items-center justify-center">
                    <item.icon className="h-5 w-5 text-foreground" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-foreground">{item.title}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-primary to-blue-400 rounded-[2rem] blur-2xl opacity-20" />
            <img 
              src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=1000" 
              alt="Data Infrastructure" 
              className="relative z-10 rounded-[2rem] border border-border shadow-2xl object-cover h-[600px] w-full"
            />
          </div>
        </div>
      </section>

      {/* --- CTA SECTION --- */}
      <section className="py-24 border-t border-border">
        <div className="max-w-[1000px] mx-auto px-6">
          <div className="bg-primary rounded-[3rem] p-12 md:p-20 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 mix-blend-overlay"></div>
            <h2 className="relative z-10 text-4xl md:text-5xl font-extrabold tracking-tight text-primary-foreground mb-6">Ready to scale your business?</h2>
            <p className="relative z-10 text-lg md:text-xl text-primary-foreground/80 mb-10 max-w-2xl mx-auto">
              Join hundreds of fintechs and enterprise businesses relying on XATO Technologies for their core utility infrastructure.
            </p>
            <div className="relative z-10 flex flex-wrap justify-center items-center gap-4">
              <Link href="/login" className="bg-white text-primary hover:bg-white/90 px-8 py-4 rounded-2xl font-bold text-lg transition-all shadow-xl active:scale-95">
                Create Free Account
              </Link>
              <Link href="/contact" className="bg-primary-foreground/10 text-primary-foreground hover:bg-primary-foreground/20 border border-primary-foreground/20 px-8 py-4 rounded-2xl font-bold text-lg transition-all backdrop-blur-md active:scale-95">
                Contact Sales
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer id="company" className="bg-muted/50 border-t border-border pt-20 pb-10">
        <div className="max-w-[1400px] mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center font-black text-primary-foreground text-sm shadow-md">
                B
              </div>
              <span className="text-xl font-bold tracking-tight text-foreground">BAXATO</span>
            </div>
            <p className="text-muted-foreground max-w-sm leading-relaxed">
              Baxato provides enterprise-grade API infrastructure for digital utility payments across Africa.
            </p>
            <div className="mt-8">
              <p className="text-sm font-bold text-foreground">A product of</p>
              <p className="text-lg font-black text-primary uppercase tracking-wide mt-1">XATO Technologies Limited</p>
              <p className="text-xs text-muted-foreground mt-1">RC Number: 1234567 • Lagos, Nigeria</p>
            </div>
          </div>

          <div>
            <h4 className="font-bold text-foreground mb-6">Developers</h4>
            <ul className="space-y-4 text-sm text-muted-foreground">
              <li><Link href="/docs" className="hover:text-primary transition-colors">API Documentation</Link></li>
              <li><Link href="/status" className="hover:text-primary transition-colors">System Status</Link></li>
              <li><Link href="/webhooks" className="hover:text-primary transition-colors">Webhooks Guide</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-foreground mb-6">Company</h4>
            <ul className="space-y-4 text-sm text-muted-foreground">
              <li><Link href="/about" className="hover:text-primary transition-colors">About Us</Link></li>
              <li><Link href="/contact" className="hover:text-primary transition-colors">Contact Sales</Link></li>
              <li><Link href="/terms" className="hover:text-primary transition-colors">Terms of Service</Link></li>
              <li><Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
            </ul>
          </div>
        </div>

        <div className="max-w-[1400px] mx-auto px-6 pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} XATO Technologies Limited. All rights reserved.
          </p>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <ShieldCheck className="h-5 w-5" title="Secure Encryption" />
            <ServerCrash className="h-5 w-5" title="Redundant Infrastructure" />
            <Globe2 className="h-5 w-5" title="African Coverage" />
          </div>
        </div>
      </footer>
    </div>
  );
}
