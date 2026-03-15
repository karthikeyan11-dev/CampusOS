'use client';

import Link from 'next/link';
import { 
  Shield, Bell, MessageSquareWarning, Search, Calendar, QrCode,
  ChevronRight, Sparkles, ArrowRight, Zap, Lock, BarChart3, Users
} from 'lucide-react';

const features = [
  {
    icon: Bell,
    title: 'Smart Notifications',
    description: 'AI-summarized announcements with targeted delivery to departments, batches, or entire campus.',
    gradient: 'from-blue-500 to-cyan-400',
  },
  {
    icon: MessageSquareWarning,
    title: 'Grievance System',
    description: 'Anonymous or identified complaints with AI-powered classification, priority detection, and auto-escalation.',
    gradient: 'from-purple-500 to-pink-400',
  },
  {
    icon: Search,
    title: 'Lost & Found',
    description: 'Digital board with smart matching. Report lost or found items and get auto-notified on potential matches.',
    gradient: 'from-amber-500 to-orange-400',
  },
  {
    icon: Calendar,
    title: 'Resource Booking',
    description: 'Book seminar halls, labs, and projectors with calendar availability views and approval workflows.',
    gradient: 'from-emerald-500 to-teal-400',
  },
  {
    icon: QrCode,
    title: 'Digital Gate Pass',
    description: 'JWT-signed QR gate passes with multi-level approval, security scanning, and parent SMS alerts.',
    gradient: 'from-rose-500 to-red-400',
  },
  {
    icon: Shield,
    title: 'Role-Based Access',
    description: 'Six distinct roles with granular permissions — from Super Admin to Security Staff.',
    gradient: 'from-indigo-500 to-violet-400',
  },
];

const stats = [
  { value: '6', label: 'User Roles' },
  { value: '5+', label: 'Core Modules' },
  { value: 'AI', label: 'Powered' },
  { value: '24/7', label: 'Monitoring' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-cos-bg-primary overflow-hidden">
      {/* Ambient Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-cos-primary/5 blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full bg-cos-secondary/5 blur-[120px]" />
        <div className="grid-pattern absolute inset-0 opacity-30" />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-6 lg:px-12 py-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">
            Campus<span className="gradient-text">OS</span>
          </span>
        </div>

        <div className="hidden md:flex items-center gap-8 text-sm text-cos-text-secondary">
          <a href="#features" className="hover:text-cos-text-primary transition-colors">Features</a>
          <a href="#modules" className="hover:text-cos-text-primary transition-colors">Modules</a>
          <a href="#security" className="hover:text-cos-text-primary transition-colors">Security</a>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/login" className="btn-secondary text-sm px-5 py-2.5">
            Log In
          </Link>
          <Link href="/register" className="btn-primary text-sm px-5 py-2.5 flex items-center gap-2">
            Get Started <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 px-6 lg:px-12 pt-20 pb-32 text-center">
        <div className="animate-fade-in max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-cos-border bg-cos-bg-card/50 text-sm text-cos-text-secondary mb-8">
            <Sparkles className="w-4 h-4 text-cos-primary" />
            <span>AI-Powered Campus Management</span>
          </div>

          {/* Heading */}
          <h1 className="text-5xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-6">
            Smart Campus
            <br />
            <span className="gradient-text">Management Platform</span>
          </h1>

          <p className="text-lg lg:text-xl text-cos-text-secondary max-w-2xl mx-auto mb-10 leading-relaxed">
            Centralized platform solving campus management challenges — from academic notifications 
            to digital gate passes — powered by AI for smarter, faster operations.
          </p>

          {/* CTA Buttons */}
          <div className="flex items-center justify-center gap-4 mb-16">
            <Link href="/register" className="btn-primary text-base px-8 py-3.5 flex items-center gap-2 glow">
              Start Now <ChevronRight className="w-5 h-5" />
            </Link>
            <Link href="/login" className="btn-secondary text-base px-8 py-3.5 flex items-center gap-2">
              <Lock className="w-4 h-4" /> Sign In
            </Link>
          </div>

          {/* Stats Strip */}
          <div className="flex items-center justify-center gap-8 lg:gap-16">
            {stats.map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-2xl lg:text-3xl font-bold gradient-text">{stat.value}</div>
                <div className="text-xs text-cos-text-muted uppercase tracking-wider mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Hero Visual - Dashboard Preview Mockup */}
        <div className="relative max-w-5xl mx-auto mt-20">
          <div className="glass-card p-2 glow">
            <div className="bg-cos-bg-secondary rounded-xl p-6 min-h-[300px] flex items-center justify-center">
              <div className="grid grid-cols-3 gap-4 w-full max-w-3xl">
                {/* Mock Dashboard Cards */}
                <div className="glass-card p-4 col-span-2">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                      <BarChart3 className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                      <div className="text-sm font-medium">Analytics Overview</div>
                      <div className="text-xs text-cos-text-muted">Real-time campus metrics</div>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    {[65, 42, 78, 55, 88, 70, 60, 85, 72, 90].map((h, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div 
                          className="w-full rounded-t bg-gradient-to-t from-cos-primary/40 to-cos-primary/80 transition-all duration-500"
                          style={{ height: `${h}px` }}
                        />
                        <span className="text-[10px] text-cos-text-muted">{i + 1}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="glass-card p-4">
                    <div className="text-xs text-cos-text-muted mb-1">Active Gate Passes</div>
                    <div className="text-2xl font-bold text-emerald-400">24</div>
                  </div>
                  <div className="glass-card p-4">
                    <div className="text-xs text-cos-text-muted mb-1">Open Complaints</div>
                    <div className="text-2xl font-bold text-amber-400">12</div>
                  </div>
                  <div className="glass-card p-4">
                    <div className="text-xs text-cos-text-muted mb-1">Pending Approvals</div>
                    <div className="text-2xl font-bold text-cos-primary">8</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Reflection */}
          <div className="absolute -bottom-20 left-0 right-0 h-20 bg-gradient-to-b from-cos-primary/5 to-transparent blur-2xl" />
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative z-10 px-6 lg:px-12 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">
            Everything Your Campus <span className="gradient-text">Needs</span>
          </h2>
          <p className="text-cos-text-secondary max-w-xl mx-auto">
            Six powerful modules designed for real-world college workflows, automated with AI.
          </p>
        </div>

        <div id="modules" className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {features.map((feature, i) => (
            <div key={i} className="glass-card glass-card-hover p-6 group" style={{ animationDelay: `${i * 100}ms` }}>
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <feature.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-cos-text-secondary leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Security Section */}
      <section id="security" className="relative z-10 px-6 lg:px-12 py-24">
        <div className="max-w-6xl mx-auto glass-card p-8 lg:p-12">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">
                Enterprise-Grade <span className="gradient-text">Security</span>
              </h2>
              <div className="space-y-4">
                {[
                  { icon: Lock, text: 'JWT authentication with refresh token rotation' },
                  { icon: Shield, text: 'Role-based access control with permission matrix' },
                  { icon: Users, text: 'Account approval workflow before activation' },
                  { icon: QrCode, text: 'JWT-signed QR codes with expiry protection' },
                  { icon: BarChart3, text: 'Complete audit logging of all system actions' },
                  { icon: Zap, text: 'Rate limiting and input validation on all endpoints' },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-cos-primary/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <item.icon className="w-4 h-4 text-cos-primary" />
                    </div>
                    <span className="text-cos-text-secondary">{item.text}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-center">
              <div className="relative">
                <div className="w-48 h-48 rounded-full border-2 border-cos-primary/20 flex items-center justify-center animate-pulse-glow">
                  <div className="w-36 h-36 rounded-full border border-cos-primary/30 flex items-center justify-center">
                    <div className="w-24 h-24 rounded-full gradient-bg flex items-center justify-center animate-float">
                      <Shield className="w-12 h-12 text-white" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 px-6 lg:px-12 py-8 border-t border-cos-border">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-cos-text-muted">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-cos-primary" />
            <span>CampusOS — AI Powered Smart Campus Management</span>
          </div>
          <div>Built for College Hackathon 2026</div>
        </div>
      </footer>
    </div>
  );
}
