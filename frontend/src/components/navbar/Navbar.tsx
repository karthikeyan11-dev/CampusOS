'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Zap, LayoutDashboard, QrCode, MessageSquare, Calendar, Bell, User, LogOut } from 'lucide-react';
import { useAuthStore } from '@/stores/auth.store';
import { ThemeToggle } from './ThemeToggle';
import { useEffect, useState } from 'react';

export function Navbar() {
  const pathname = usePathname();
  const { isAuthenticated, logout, user, isLoading } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register');

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/40 backdrop-blur-2xl border-b border-white/5 py-4 px-6 lg:px-12">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group outline-none">
          <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center group-hover:rotate-12 transition-transform shadow-[0_0_20px_rgba(255,106,0,0.3)]">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <span className="text-2xl font-black tracking-tighter">
            Campus<span className="gradient-text">OS</span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-8">
          <Link href="/" className={`text-sm font-semibold transition-colors hover:text-cos-primary ${pathname === '/' ? 'text-cos-primary' : 'text-cos-text-primary'}`}>
            Home
          </Link>
          {pathname === '/' ? (
            <button 
              onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })}
              className="text-sm font-semibold text-cos-text-primary hover:text-cos-primary transition-colors cursor-pointer outline-none"
            >
              About
            </button>
          ) : (
            <Link href="/#about" className="text-sm font-semibold text-cos-text-primary hover:text-cos-primary transition-colors">
              About
            </Link>
          )}
          {pathname === '/' ? (
            <button 
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              className="text-sm font-semibold text-cos-text-primary hover:text-cos-primary transition-colors cursor-pointer outline-none"
            >
              Modules
            </button>
          ) : (
            <Link href="/#features" className="text-sm font-semibold text-cos-text-primary hover:text-cos-primary transition-colors">
              Modules
            </Link>
          )}
          {isAuthenticated && (
            <Link href="/dashboard" className={`text-sm font-semibold transition-colors hover:text-cos-primary ${pathname.startsWith('/dashboard') ? 'text-cos-primary' : 'text-cos-text-primary'}`}>
              Dashboard
            </Link>
          )}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-4">
          <ThemeToggle />
          
          {mounted && !isLoading ? (
            isAuthenticated ? (
              <div className="flex items-center gap-3 ml-2 border-l border-white/10 pl-6">
                <Link href="/dashboard/profile" className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 transition-colors">
                  <div className="w-7 h-7 rounded-full gradient-bg flex items-center justify-center text-xs text-white font-bold uppercase">
                    {user?.name?.[0]}
                  </div>
                  <div className="hidden lg:block text-left mr-1">
                    <div className="text-[11px] font-bold text-cos-text-primary line-clamp-1">{user?.name}</div>
                    <div className="text-[9px] text-cos-text-muted capitalize">{(user?.designation || user?.faculty?.designation || user?.role || '').replace(/_/g, ' ')}</div>
                  </div>
                </Link>
                <button 
                  onClick={logout}
                  className="p-2.5 rounded-full text-cos-text-muted hover:text-red-500 hover:bg-red-500/10 transition-all"
                  title="Logout"
                >
                  <LogOut className="w-4.5 h-4.5" />
                </button>
              </div>
            ) : (
              <Link href="/login" className="btn-primary rounded-full px-7 py-2.5 text-xs font-bold shadow-[0_4px_20px_rgba(255,60,0,0.4)] hover:scale-105 active:scale-95 transition-all">
                Get Started
              </Link>
            )
          ) : (
            <div className="w-24 h-9 animate-pulse bg-white/5 rounded-full" />
          )}
        </div>
      </div>
    </nav>
  );
}
