'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth.store';
import { Zap, Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cos-bg-primary flex flex-col lg:flex-row overflow-hidden">
      {/* Background Decor */}
      <div className="hero-glow top-0 left-[-200px]" />
      <div className="hero-glow bottom-0 right-[-200px]" style={{ opacity: 0.1 }} />
      <div className="absolute inset-0 grid-pattern pointer-events-none" />

      {/* Left Section - Promo */}
      <div className="hidden lg:flex flex-1 items-center justify-center p-12 relative z-10">
        <motion.div 
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          className="max-w-md"
        >
          <div className="flex items-center gap-4 mb-12">
            <div className="w-14 h-14 rounded-2xl gradient-bg flex items-center justify-center shadow-[0_0_30px_rgba(255,106,0,0.4)]">
              <Zap className="w-7 h-7 text-white" />
            </div>
            <span className="text-4xl font-black tracking-tighter">
              Campus<span className="gradient-text">OS</span>
            </span>
          </div>
          
          <h2 className="text-6xl font-black leading-tight mb-6">
            Everything <br />
            <span className="gradient-text">Connected.</span>
          </h2>
          <p className="text-cos-text-secondary text-xl font-medium leading-relaxed">
            Your university portal, reimagined. Secure, fast, and intelligent.
          </p>

          <div className="mt-12 flex gap-4">
             <div className="glass-card px-6 py-4 flex-1">
               <div className="text-cos-primary font-bold mb-1">99.9%</div>
               <div className="text-xs text-cos-text-muted uppercase tracking-widest font-bold">Uptime</div>
             </div>
             <div className="glass-card px-6 py-4 flex-1">
               <div className="text-cos-primary font-bold mb-1">Instant</div>
               <div className="text-xs text-cos-text-muted uppercase tracking-widest font-bold">Gate Pass</div>
             </div>
          </div>
        </motion.div>
      </div>

      {/* Right Section - Form */}
      <div className="flex-1 flex items-center justify-center p-6 relative z-10">
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-[450px]"
        >
          <div className="glass-card p-10 border-white/10 shadow-2xl relative overflow-hidden group">
            {/* Spotlight effect */}
            <div className="absolute -top-24 -right-24 w-48 h-48 bg-cos-primary/10 blur-[60px] rounded-full group-hover:bg-cos-primary/20 transition-colors" />
            
            <header className="mb-10 text-center lg:text-left">
              <h1 className="text-3xl font-black mb-2">Welcome Back</h1>
              <p className="text-cos-text-secondary font-medium">Continue to your campus dashboard</p>
            </header>

            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mb-8 p-4 rounded-xl bg-cos-danger/10 border border-cos-danger/20 text-cos-danger text-sm font-bold flex items-center gap-2"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-cos-danger animate-pulse" />
                {error}
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-cos-text-muted ml-1">Identity (Email)</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field py-4 px-5 bg-white/5 border-white/10 focus:bg-white/10 transition-all font-medium"
                  placeholder="name@college.edu"
                  required
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-xs font-bold uppercase tracking-widest text-cos-text-muted">Secret (Password)</label>
                  <Link href="/forgot-password" className="text-[10px] uppercase font-bold text-cos-primary hover:opacity-80 transition-opacity">Reset Access</Link>
                </div>
                <div className="relative group">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field py-4 px-5 pr-14 bg-white/5 border-white/10 focus:bg-white/10 transition-all font-medium"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-cos-text-muted hover:text-cos-primary transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-4 text-sm font-black uppercase tracking-widest flex items-center justify-center gap-3 shadow-[0_10px_30px_rgba(255,106,0,0.3)] hover:shadow-[0_15px_40px_rgba(255,106,0,0.5)] transition-all mt-8"
              >
                {loading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <>Enter Dashboard <ArrowRight className="w-5 h-5" /></>
                )}
              </button>
            </form>

            <footer className="mt-10 pt-8 border-t border-white/5 text-center">
               <p className="text-sm text-cos-text-muted font-medium">
                 New to CampusOS? {' '}
                 <Link href="/register" className="text-cos-primary font-black hover:opacity-80 transition-opacity">Create Account</Link>
               </p>
            </footer>
          </div>

        </motion.div>
      </div>
    </div>
  );
}
