'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth.store';
import { Zap, Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react';

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
    <div className="min-h-screen bg-cos-bg-primary flex">
      {/* Ambient Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full bg-cos-primary/5 blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-cos-secondary/5 blur-[120px]" />
      </div>

      {/* Left Panel - Branding */}
      <div className="hidden lg:flex flex-1 items-center justify-center relative">
        <div className="grid-pattern absolute inset-0 opacity-20" />
        <div className="relative z-10 max-w-md px-12">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold">
              Campus<span className="gradient-text">OS</span>
            </span>
          </div>
          <h2 className="text-3xl font-bold mb-4">
            Welcome back to your <span className="gradient-text">Smart Campus</span>
          </h2>
          <p className="text-cos-text-secondary leading-relaxed">
            Access your dashboard to manage notifications, gate passes, complaints, and campus resources — all in one place.
          </p>

          {/* Feature highlights */}
          <div className="mt-10 space-y-4">
            {['AI-powered notifications', 'Digital QR gate passes', 'Real-time analytics'].map((f, i) => (
              <div key={i} className="flex items-center gap-3 text-sm text-cos-text-secondary">
                <div className="w-1.5 h-1.5 rounded-full bg-cos-primary" />
                <span>{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex items-center justify-center px-6 relative z-10">
        <div className="w-full max-w-md">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold">
              Campus<span className="gradient-text">OS</span>
            </span>
          </div>

          <div className="glass-card p-8">
            <h1 className="text-2xl font-bold mb-2">Sign In</h1>
            <p className="text-sm text-cos-text-secondary mb-8">Enter your credentials to access your account</p>

            {error && (
              <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-cos-text-secondary mb-2">Email Address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field"
                  placeholder="you@college.edu"
                  required
                  id="login-email"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-cos-text-secondary mb-2">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field pr-10"
                    placeholder="••••••••"
                    required
                    id="login-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-cos-text-muted hover:text-cos-text-primary transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2 py-3 disabled:opacity-50"
                id="login-submit"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>Sign In <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-cos-text-secondary">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="text-cos-primary hover:underline font-medium">
                Register here
              </Link>
            </div>
          </div>

          {/* Demo Credentials */}
          <div className="mt-4 glass-card p-4">
            <p className="text-xs text-cos-text-muted text-center mb-2">Demo Credentials</p>
            <div className="flex items-center justify-center gap-4 text-xs">
              <code className="bg-cos-bg-secondary px-2 py-1 rounded text-cos-primary">admin@campusos.edu</code>
              <code className="bg-cos-bg-secondary px-2 py-1 rounded text-cos-primary">admin123</code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
