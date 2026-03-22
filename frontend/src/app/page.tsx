'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, Zap, Shield, QrCode, MessageSquare, BarChart, Bell } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';

export default function Home() {
  const { isAuthenticated, user, isLoading } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // 🧹 STALE SESSION CLEANUP: Verify if we have rogue cookies that could trigger a redirect loop
    if (!isLoading && !isAuthenticated) {
      const hasCookie = document.cookie.includes('campusos_token');
      if (hasCookie) {
        console.warn('[AUTH] Rogue cookie detected on landing. Clearing for safety.');
        document.cookie = 'campusos_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        document.cookie = 'campusos_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      }
    }
  }, [isLoading, isAuthenticated]);

  return (
    <div className="relative min-h-screen bg-cos-bg-primary">
      {/* Background Decor */}
      <div className="hero-glow top-0 right-[-100px]" />
      <div className="hero-glow bottom-[-100px] left-[-100px] opacity-10" />
      <div className="fixed inset-0 grid-pattern pointer-events-none opacity-40" />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 lg:px-12 max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-0">
          
          {/* Left Text */}
          <div className="flex-1 text-center lg:text-left z-10">
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-2xl lg:text-3xl font-medium mb-4 text-cos-text-primary"
            >
              Hey, I'm a
            </motion.p>
            <motion.h1 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.1 }}
              className="text-6xl md:text-8xl lg:text-[120px] font-black leading-tight tracking-tighter mb-8"
            >
              <span className="block">Campus<span className="gradient-text">OS</span></span>
              <span className="block mt-[-10px]">Platform</span>
            </motion.h1>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col sm:flex-row items-center gap-6 justify-center lg:justify-start"
            >
              {mounted && !isLoading && isAuthenticated ? (
                <Link href="/dashboard" className="btn-primary flex items-center gap-2 text-lg px-8 py-4 group">
                  Go to Dashboard 
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              ) : mounted && !isLoading ? (
                <Link href="/login" className="btn-primary flex items-center gap-2 text-lg px-8 py-4 group">
                  Get Started 
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              ) : (
                <div className="w-48 h-12 animate-pulse bg-white/5 rounded-xl block sm:inline-block" />
              )}
              <div className="hidden sm:block h-12 w-px bg-cos-border" />
              <p className="text-cos-text-secondary text-lg max-w-xs">
                Great design should feel invisible. Our system connects your campus life effortlessly.
              </p>
            </motion.div>
          </div>

          {/* Right Image (Silhouette) */}
          <div className="flex-1 relative animate-float">
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 1, delay: 0.4 }}
              className="relative w-full aspect-square max-w-[500px] mx-auto overflow-visible"
            >
              <div className="absolute inset-0 gradient-bg opacity-20 blur-[100px] rounded-full" />
              <Image 
                src="/assets/scholar-hero.png" 
                alt="Scholar Silhouette"
                width={600}
                height={600}
                className="relative z-10 w-full h-full object-contain pointer-events-none drop-shadow-[0_0_50px_rgba(255,106,0,0.4)]"
                priority
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative py-24 px-6 lg:px-12 max-w-7xl mx-auto scroll-mt-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-black mb-6 tracking-tight">
            Institutional <span className="gradient-text">Intelligence</span>
          </h2>
          <p className="text-cos-text-secondary text-lg max-w-2xl mx-auto">
            A comprehensive ecosystem designed to modernize every aspect of campus management.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { 
              id: '01', 
              label: 'Smart Gate Pass', 
              icon: QrCode, 
              desc: 'Secure, real-time digital authorization for campus entry and exit with instant QR validation.' 
            },
            { 
              id: '02', 
              label: 'Grievance System', 
              icon: MessageSquare, 
              desc: 'Transparent tracking and resolution of institutional complaints with automated escalation.' 
            },
            { 
              id: '03', 
              label: 'Resource Hub', 
              icon: Zap, 
              desc: 'Seamless booking and management of institutional assets, rooms, and technology.' 
            },
            { 
              id: '04', 
              label: 'Notification Engine', 
              icon: Bell, 
              desc: 'Critical broadcast system for emergency alerts, announcements, and personalized updates.' 
            },
            { 
              id: '05', 
              label: 'Campus Analytics', 
              icon: BarChart, 
              desc: 'Data-driven insights into campus activity, resource utilization, and institutional performance.' 
            },
          ].map((item, idx) => (
            <motion.div 
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: idx * 0.1 }}
              className="glass-card p-8 group hover:border-cos-primary/30 transition-all duration-300"
            >
              <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center mb-6 shadow-[0_0_20px_rgba(255,106,0,0.2)]">
                <item.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold mb-3 group-hover:text-cos-primary transition-colors">{item.label}</h3>
              <p className="text-cos-text-secondary leading-relaxed">
                {item.desc}
              </p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="relative py-24 px-6 lg:px-12 bg-black/20 backdrop-blur-3xl scroll-mt-24">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-16">
          <div className="flex-1">
            <h2 className="text-4xl md:text-5xl font-black mb-8 leading-tight">
              One Operating System for <br />
              <span className="gradient-text">Your Entire Campus</span>
            </h2>
            <div className="space-y-6 text-cos-text-secondary text-lg leading-relaxed">
              <p>
                CampusOS is more than just management software—it's a centralized intelligence platform designed to harmonize the complex relationships between students, faculty, and administration.
              </p>
              <p>
                By leveraging real-time data and automated workflows, we eliminate bureaucratic friction and provide a seamless, secure environment for academic excellence.
              </p>
            </div>
          </div>
          <div className="flex-1 w-full max-w-xl">
             <div className="glass-card p-1 aspect-video relative overflow-hidden group">
               <div className="absolute inset-0 gradient-bg opacity-10 group-hover:opacity-20 transition-opacity" />
               <div className="relative h-full w-full bg-cos-bg-primary rounded-[22px] flex items-center justify-center border border-white/5">
                 <Zap className="w-16 h-16 text-cos-primary/20 animate-pulse" />
               </div>
             </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-24 px-6 lg:px-12 text-center overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full gradient-bg opacity-5 blur-[120px]" />
        <div className="relative z-10 max-w-4xl mx-auto">
          <h2 className="text-4xl md:text-6xl font-black mb-8 leading-tight italic tracking-tighter">
            READY TO <span className="gradient-text uppercase">TRANSFORM</span> <br />
            YOUR INSTITUTION?
          </h2>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
            {!isAuthenticated ? (
              <Link href="/login" className="btn-primary px-10 py-5 text-xl">
                Get Started Now <ArrowRight className="w-6 h-6" />
              </Link>
            ) : (
              <Link href="/dashboard" className="btn-primary px-10 py-5 text-xl">
                Enter Dashboard <ArrowRight className="w-6 h-6" />
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full p-8 border-t border-cos-border/30 bg-black/40">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-black text-xl tracking-tighter">
              Campus<span className="gradient-text">OS</span>
            </span>
          </div>
          <p className="text-cos-text-muted text-sm flex items-center gap-2">
            © 2026 CampusOS Platform. Engineered for excellence.
          </p>
        </div>
      </footer>
    </div>
  );
}
