'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  ChevronRight, 
  Terminal, 
  Zap, 
  ShieldCheck, 
  Webhook, 
  ArrowRight,
  Code2,
  ServerCog,
  Activity
} from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';

// --- CUSTOM HOOK FOR AUTO-COUNTING NUMBERS ---
function useAnimatedCounter(end: number, duration: number = 2000, startOnView: boolean = true) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const percentage = Math.min(progress / duration, 1);
      
      // Easing function (easeOutQuart) for a premium slow-down-at-the-end feel
      const easeOut = 1 - Math.pow(1 - percentage, 4);
      
      setCount(Math.floor(end * easeOut));

      if (percentage < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration]);

  return count;
}

const AnimatedNumber = ({ value, suffix = '', prefix = '' }: { value: number, suffix?: string, prefix?: string }) => {
  const count = useAnimatedCounter(value);
  return <span className="font-bold tabular-nums tracking-tight">{prefix}{count}{suffix}</span>;
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20 selection:text-primary font-sans">
      
      {/* --- NAVIGATION BAR --- */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center font-black text-white text-sm shadow-md">
              B
            </div>
            <span className="text-xl font-bold tracking-tight text-foreground">Baxato</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
            <Link href="#products" className="hover:text-primary transition-colors">Products</Link>
            <Link href="#developers" className="hover:text-primary transition-colors">Developers</Link>
            <Link href="#pricing" className="hover:text-primary transition-colors">Pricing</Link>
            <Link href="#company" className="hover:text-primary transition-colors">Company</Link>
          </div>

          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Link href="/login" className="hidden md:block text-sm font-semibold text-foreground hover:text-primary transition-colors">
              Sign In
            </Link>
            <Link href="/register" className="bg-primary text-primary-foreground hover:bg-primary/90 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm active:scale-95">
              Create Account
            </Link>
          </div>
        </div>
      </nav>

      {/* --- HERO SECTION --- */}
      <section className="relative pt-40 pb-20 md:pt-52 md:pb-32 overflow-hidden">
        {/* Subtle Background Gradients */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 rounded-full blur-[120px] -z-10 pointer-events-none" />
        
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-widest mb-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <Activity className="h-3.5 w-3.5" />
            V2.0 API is now live
          </div>
          
          <h1 className="text-5xl md:text-7xl lg:text-[5rem] font-extrabold tracking-tight text-foreground leading-[1.1] mb-8 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
            Enterprise API for <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">
              African Utility Payments
            </span>
          </h1>
          
          <p className="max-w-2xl mx-auto text-lg md:text-xl text-muted-foreground leading-relaxed mb-10 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-200">
            Build, scale, and automate Airtime, Data, Electricity, and Cable TV provisioning with Nigeria's most robust and developer-centric infrastructure.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 animate-in fade-in slide-in-from-bottom-10 duration-700 delay-300">
            <Link href="/register" className="w-full sm:w-auto flex items-center justify-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-8 py-4 rounded-2xl text-base font-bold transition-all shadow-lg shadow-primary/25 active:scale-95">
              Start Building for Free <ArrowRight className="h-5 w-5" />
            </Link>
            <Link href="#docs" className="w-full sm:w-auto flex items-center justify-center gap-2 bg-card border border-border text-foreground hover:bg-muted px-8 py-4 rounded-2xl text-base font-bold transition-all active:scale-95">
              <Terminal className="h-5 w-5 text-muted-foreground" /> Read API Docs
            </Link>
          </div>
        </div>
      </section>

      {/* --- TELECOM PARTNERS SECTION --- */}
      <section className="py-12 border-y border-border/50 bg-muted/20">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-widest mb-8">
            Direct integrations with leading providers
          </p>
          <div className="flex flex-wrap justify-center items-center gap-12 md:gap-24 opacity-70 grayscale hover:grayscale-0 transition-all duration-500">
             {/* Using high-quality SVG/PNG links for Telcos. If they break, the alt text remains clean. */}
            <img src="https://upload.wikimedia.org/wikipedia/commons/9/93/New-mtn-logo.jpg" alt="MTN" className="h-10 md:h-14 object-contain rounded-full bg-white px-2 py-1" />
            <img src="https://upload.wikimedia.org/wikipedia/commons/f/f4/Airtel_Logo.svg" alt="Airtel" className="h-8 md:h-12 object-contain" />
            <img src="https://upload.wikimedia.org/wikipedia/commons/8/86/Globacom_Limited_Logo.svg" alt="Glo" className="h-10 md:h-14 object-contain" />
            <img src="https://upload.wikimedia.org/wikipedia/commons/f/f6/9mobile_Logo.png" alt="9Mobile" className="h-8 md:h-12 object-contain" />
          </div>
        </div>
      </section>

      {/* --- AUTO-COUNTING STATS --- */}
      <section className="py-24 bg-background">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 divide-y md:divide-y-0 md:divide-x divide-border/50">
            <div className="flex flex-col items-center text-center pt-8 md:pt-0">
              <div className="text-5xl md:text-6xl font-extrabold text-foreground tracking-tighter mb-2">
                <AnimatedNumber value={99} suffix=".99%" />
              </div>
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">Uptime SLA Guarantee</p>
            </div>
            <div className="flex flex-col items-center text-center pt-8 md:pt-0">
              <div className="text-5xl md:text-6xl font-extrabold text-foreground tracking-tighter mb-2">
                <AnimatedNumber value={150} prefix="<" suffix="ms" />
              </div>
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">Average API Latency</p>
            </div>
            <div className="flex flex-col items-center text-center pt-8 md:pt-0">
              <div className="text-5xl md:text-6xl font-extrabold text-foreground tracking-tighter mb-2">
                <AnimatedNumber value={10} suffix="M+" />
              </div>
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">Monthly Transactions</p>
            </div>
          </div>
        </div>
      </section>

      {/* --- FEATURES BENTO GRID --- */}
      <section className="py-24 bg-muted/30 border-t border-border/50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-16">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-foreground mb-4">Engineered for Scale.</h2>
            <p className="text-lg text-muted-foreground max-w-2xl">
              We built Baxato because we were tired of dropped connections, failed vends, and poor documentation. This is the infrastructure your engineering team actually wants to use.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-card border border-border/60 rounded-[2rem] p-8 md:p-10 shadow-sm hover:shadow-md transition-all">
              <Webhook className="h-10 w-10 text-primary mb-6" />
              <h3 className="text-2xl font-bold text-foreground mb-3">Real-time Webhooks & Idempotency</h3>
              <p className="text-muted-foreground leading-relaxed max-w-xl">
                Never double-charge a customer. Use our strict idempotency keys to ensure transactions are processed exactly once. Receive instant webhook notifications the millisecond a vend succeeds or fails.
              </p>
            </div>
            
            <div className="bg-card border border-border/60 rounded-[2rem] p-8 md:p-10 shadow-sm hover:shadow-md transition-all">
              <Zap className="h-10 w-10 text-amber-500 mb-6" />
              <h3 className="text-2xl font-bold text-foreground mb-3">Instant Routing</h3>
              <p className="text-muted-foreground leading-relaxed">
                Smart traffic routing ensures that if one upstream provider is degraded, your traffic is seamlessly routed to the next best node without you lifting a finger.
              </p>
            </div>

            <div className="bg-card border border-border/60 rounded-[2rem] p-8 md:p-10 shadow-sm hover:shadow-md transition-all">
              <ShieldCheck className="h-10 w-10 text-emerald-500 mb-6" />
              <h3 className="text-2xl font-bold text-foreground mb-3">Bank-Grade Security</h3>
              <p className="text-muted-foreground leading-relaxed">
                All API endpoints are protected by robust HMAC signature verification. Your ledger is mathematically secured and audited hourly.
              </p>
            </div>

            <div className="md:col-span-2 bg-card border border-border/60 rounded-[2rem] p-8 md:p-10 shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row items-center gap-8 overflow-hidden">
              <div className="flex-1">
                <Code2 className="h-10 w-10 text-primary mb-6" />
                <h3 className="text-2xl font-bold text-foreground mb-3">Developer First</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Beautiful RESTful architecture, predictable JSON responses, clear HTTP status codes, and comprehensive SDKs for Node.js, PHP, and Python.
                </p>
              </div>
              
              {/* Fake Code Editor snippet */}
              <div className="flex-1 w-full bg-[#0F111A] rounded-2xl p-6 border border-white/10 shadow-2xl">
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-3 w-3 rounded-full bg-red-500/80"></div>
                  <div className="h-3 w-3 rounded-full bg-amber-500/80"></div>
                  <div className="h-3 w-3 rounded-full bg-green-500/80"></div>
                  <span className="text-xs font-mono text-white/40 ml-2">POST /v1/vend/airtime</span>
                </div>
                <pre className="text-sm font-mono text-white/80 overflow-x-auto">
                  <code>
<span className="text-pink-400">const</span> response = <span className="text-pink-400">await</span> baxato.<span className="text-blue-300">airtime</span>.<span className="text-green-300">vend</span>({'{'}<br/>
{'  '}network: <span className="text-amber-300">'MTN'</span>,<br/>
{'  '}amount: <span className="text-purple-300">5000</span>,<br/>
{'  '}phone: <span className="text-amber-300">'08030000000'</span>,<br/>
{'  '}reference: <span className="text-amber-300">'trx_891283'</span><br/>
{'})'};<br/>
<br/>
<span className="text-white/40">// Response: 200 OK</span><br/>
<span className="text-blue-300">console</span>.<span className="text-green-300">log</span>(response.status); <span className="text-white/40">// "SUCCESSFUL"</span>
                  </code>
                </pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- CTA SECTION --- */}
      <section className="py-32 relative overflow-hidden bg-primary text-primary-foreground">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
        <div className="max-w-4xl mx-auto px-6 text-center relative z-10">
          <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6">Ready to upgrade your infrastructure?</h2>
          <p className="text-lg md:text-xl text-primary-foreground/80 mb-10 max-w-2xl mx-auto">
            Join thousands of businesses relying on XATO Technologies Limited for their utility and airtime distribution.
          </p>
          <Link href="/register" className="inline-flex items-center justify-center gap-2 bg-white text-primary hover:bg-white/90 px-10 py-5 rounded-2xl text-lg font-bold transition-all shadow-xl active:scale-95">
            Create your free account <ChevronRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="bg-background border-t border-border/50 pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-16">
            <div className="col-span-2">
              <div className="flex items-center gap-2 mb-4">
                <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center font-black text-white text-sm">
                  B
                </div>
                <span className="text-xl font-bold tracking-tight text-foreground">Baxato</span>
              </div>
              <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
                Enterprise-grade API infrastructure for utility payments, airtime, and data distribution in Africa.
              </p>
            </div>
            <div>
              <h4 className="font-bold text-foreground mb-4">Developers</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><Link href="#" className="hover:text-primary transition-colors">Documentation</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">API Reference</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">Status Page</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-foreground mb-4">Company</h4>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li><Link href="#" className="hover:text-primary transition-colors">About XATO</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">Contact Support</Link></li>
                <li><Link href="#" className="hover:text-primary transition-colors">Terms of Service</Link></li>
              </ul>
            </div>
          </div>
          <div className="pt-8 border-t border-border/50 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} XATO Technologies Limited. All rights reserved. RC: 1234567
            </p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ServerCog className="h-4 w-4" /> Systems Operational
            </div>
          </div>
        </div>
      </footer>
      
    </div>
  );
}
