'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth.store';
import { formatRoleName, getRoleBadgeColor, getInitials } from '@/lib/utils';
import {
  Zap, LayoutDashboard, Bell, MessageSquareWarning, QrCode,
  Calendar, Users, Building2, LogOut,
  Menu, X, ChevronDown, Shield, Wrench, User, Hash, Activity
} from 'lucide-react';

const getNavItems = (role: string) => {
  const allRoles = ['super_admin', 'department_admin', 'faculty', 'student', 'security_staff', 'maintenance_staff', 'warden', 'deputy_warden'];
  const adminRoles = ['super_admin', 'department_admin'];

  return [
    { group: 'Overview', items: [
      { href: '/dashboard', icon: LayoutDashboard, label: 'Control Center', roles: allRoles },
      { href: '/dashboard/analytics', icon: Activity, label: 'Analytics Dashboard', roles: adminRoles },
    ]},
    { group: 'Governance', items: [
      { href: '/dashboard/governance/approvals', icon: Shield, label: 'User Approval', roles: ['super_admin'] },
      { href: '/dashboard/users', icon: Users, label: 'User Management', roles: adminRoles },
      { href: '/dashboard/governance/institution', icon: Building2, label: 'Institution Management', roles: ['super_admin'] },
      { href: '/dashboard/resources', icon: Building2, label: 'Resource Management', roles: adminRoles },
    ]},
    { group: 'Operations', items: [
      { href: '/dashboard/gatepass', icon: QrCode, label: 'Gatepass (Student)', roles: allRoles },
      { href: '/dashboard/gatepass-faculty', icon: QrCode, label: 'Gatepass (Faculty)', roles: ['faculty', 'department_admin', 'super_admin', 'security_staff'] },
      { href: '/dashboard/complaints', icon: MessageSquareWarning, label: 'Complaints Hub', roles: allRoles },
      { href: '/dashboard/resources', icon: Calendar, label: 'Resource Booking', roles: ['faculty', 'department_admin'] },
      { href: '/dashboard/lostfound', icon: Hash, label: 'Lost & Found', roles: ['student', 'faculty', 'department_admin', 'super_admin'] },
    ]},
    { group: 'Communication', items: [
      { href: '/dashboard/notifications', icon: Bell, label: 'Notifications', roles: allRoles },
      { href: '/dashboard/profile', icon: User, label: 'My Identity', roles: allRoles },
    ]}
  ];
};

const roleIcons: Record<string, any> = {
  super_admin: Shield,
  department_admin: Building2,
  faculty: Users,
  student: User,
  security_staff: Shield,
  maintenance_staff: Wrench,
  warden: Shield,
  deputy_warden: Shield,
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  
  const { 
    user, isAuthenticated, isLoading, error, 
    loadUser, logout, resetError 
  } = useAuthStore();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  // 🔒 SECURITY GUARD: If we have a token cookie but no session, stay in LOADING
  const [isRehydrating, setIsRehydrating] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      // Small delay to allow Zustand persist to rehydrate
      const token = document.cookie.includes('campusos_token');
      if (token && !isAuthenticated) {
        await loadUser();
      }
      setIsRehydrating(false);
    };
    checkSession();
  }, [isAuthenticated, loadUser]);

  useEffect(() => {
    if (!isLoading && !isRehydrating && !isAuthenticated && !error) {
      router.replace('/login');
    }
  }, [isLoading, isRehydrating, isAuthenticated, error, router]);

  // Handle all Loading/Syncing states
  if (isLoading || isRehydrating) {
    return (
      <div className="min-h-screen bg-cos-bg-primary flex items-center justify-center">
        <div className="flex flex-col items-center gap-6">
          <div className="animate-pulse-glow w-20 h-20 rounded-full gradient-bg flex items-center justify-center shadow-[0_0_50px_rgba(255,106,0,0.4)]">
            <Zap className="w-10 h-10 text-white" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-cos-text-muted animate-pulse">Syncing Institutional Hub...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-cos-bg-primary flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mb-6 font-black text-2xl">!</div>
        <h2 className="text-xl font-black mb-2">Identity Hub <span className="text-red-500">Unreachable</span></h2>
        <p className="text-xs text-cos-text-muted max-w-xs mb-8">{error}</p>
        <div className="flex gap-4">
          <button onClick={() => { resetError(); loadUser(); }} className="btn-primary px-8">Verify Session</button>
          <button onClick={() => { logout(); router.push('/login'); }} className="btn-secondary px-8">Force Logout</button>
        </div>
      </div>
    );
  }

  // If we get here and aren't authenticated, the redirect effect above will catch it.
  // We return a loading state just in case while the redirect happens.
  if (!isAuthenticated || !user) {
     return (
       <div className="min-h-screen bg-cos-bg-primary flex items-center justify-center">
         <div className="animate-spin w-8 h-8 border-2 border-cos-primary border-t-transparent rounded-full" />
       </div>
     );
  }

  const navGroups = getNavItems(user.role);
  const RoleIcon = roleIcons[user.role] || LayoutDashboard;

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  return (
    <div className="min-h-screen bg-cos-bg-primary flex">
      {/* Sidebar Overlay (Mobile) */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-cos-bg-primary border-r border-cos-border flex flex-col transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Logo */}
        <div className="flex items-center justify-between px-6 py-6 border-b border-cos-border">
          <Link href="/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center shadow-[0_4px_15px_rgba(255,106,0,0.3)]">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-black tracking-tighter">
              Campus<span className="gradient-text">OS</span>
            </span>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-cos-text-muted hover:text-cos-text-primary">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 px-4 py-6 space-y-8 overflow-y-auto scrollbar-hide">
          {navGroups.map(group => {
            const visibleItems = group.items.filter(item => item.roles.includes(user.role));
            if (visibleItems.length === 0) return null;

            return (
              <div key={group.group} className="space-y-2">
                <h3 className="px-4 text-[10px] font-black uppercase tracking-[0.2em] text-cos-text-muted/60">
                  {group.group}
                </h3>
                <div className="space-y-1">
                  {visibleItems.map(item => {
                    const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href.split('?')[0]));
                    return (
                      <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)}
                        className={`sidebar-item flex items-center gap-3 text-sm font-bold ${isActive ? 'active shadow-lg shadow-orange-500/10 border border-white/5' : 'text-cos-text-secondary hover:text-cos-primary hover:bg-cos-primary/5 transition-all'}`}>
                        <item.icon className={`w-4 h-4 ${isActive ? 'text-cos-primary' : ''}`} />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* User Profile */}
        <div className="border-t border-cos-border p-4">
          <div className="relative">
            <button onClick={() => setProfileOpen(!profileOpen)}
              className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-cos-bg-elevated transition-colors">
              <div className="w-9 h-9 rounded-lg gradient-bg flex items-center justify-center text-white text-sm font-medium">
                {getInitials(user.name)}
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="text-sm font-medium truncate">{user.name}</div>
                <div className="text-xs text-cos-text-muted truncate">{formatRoleName(user.role)}</div>
              </div>
              <ChevronDown className={`w-4 h-4 text-cos-text-muted transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
            </button>

            {profileOpen && (
              <div className="absolute bottom-full left-0 right-0 mb-2 glass-card p-2 animate-fade-in shadow-2xl border-white/10 z-[100]">
                <div className="px-3 py-2 mb-1 border-b border-white/5">
                  <div className="text-[10px] font-black uppercase tracking-widest text-cos-text-muted mb-1">Session Identity</div>
                  <div className="text-xs font-bold text-cos-text-primary truncate">{user.email}</div>
                </div>
                <Link href="/dashboard/profile" onClick={() => setProfileOpen(false)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-bold text-cos-text-secondary hover:text-cos-primary hover:bg-cos-primary/5 rounded-lg transition-all mb-1">
                  <User className="w-4 h-4" /> View Profile
                </Link>
                <button onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-bold text-red-400 hover:bg-red-500/10 rounded-lg transition-all">
                  <LogOut className="w-4 h-4" /> Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-h-screen">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-black/40 backdrop-blur-2xl border-b border-white/5 px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-cos-text-secondary hover:text-cos-primary">
              <Menu className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-xl font-black tracking-tight capitalize">
                {pathname === '/dashboard' ? 'Overview' : pathname.split('/').pop()?.replace(/-/g, ' ')}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold tracking-widest uppercase">
              <RoleIcon className="w-3.5 h-3.5 text-cos-primary" />
              {formatRoleName(user.role)}
            </div>
            {user.department && (
              <span className="text-[10px] font-bold text-cos-text-muted hidden md:block bg-cos-bg-elevated px-2 py-1 rounded">{user.department.code}</span>
            )}
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 p-6 animate-fade-in">
          {children}
        </div>
      </main>
    </div>
  );
}
