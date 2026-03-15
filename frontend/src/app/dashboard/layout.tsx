'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth.store';
import { formatRoleName, getRoleBadgeColor, getInitials } from '@/lib/utils';
import {
  Zap, LayoutDashboard, Bell, MessageSquareWarning, QrCode,
  Calendar, Search, BarChart3, Users, Building2, LogOut,
  Menu, X, ChevronDown, Shield, Wrench, Settings
} from 'lucide-react';

const getNavItems = (role: string) => {
  const items = [
    { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', roles: ['super_admin', 'department_admin', 'faculty', 'student', 'security_staff', 'maintenance_staff'] },
    { href: '/dashboard/notifications', icon: Bell, label: 'Notifications', roles: ['super_admin', 'department_admin', 'faculty', 'student'] },
    { href: '/dashboard/complaints', icon: MessageSquareWarning, label: 'Complaints', roles: ['super_admin', 'department_admin', 'faculty', 'student', 'maintenance_staff'] },
    { href: '/dashboard/gatepass', icon: QrCode, label: 'Gate Pass', roles: ['super_admin', 'department_admin', 'faculty', 'student', 'security_staff'] },
    { href: '/dashboard/resources', icon: Calendar, label: 'Resources', roles: ['super_admin', 'department_admin', 'faculty', 'student'] },
    { href: '/dashboard/lostfound', icon: Search, label: 'Lost & Found', roles: ['super_admin', 'department_admin', 'faculty', 'student', 'security_staff'] },
    { href: '/dashboard/analytics', icon: BarChart3, label: 'Analytics', roles: ['super_admin', 'department_admin'] },
    { href: '/dashboard/users', icon: Users, label: 'User Management', roles: ['super_admin', 'department_admin', 'faculty'] },
    { href: '/dashboard/departments', icon: Building2, label: 'Departments', roles: ['super_admin'] },
  ];
  return items.filter(item => item.roles.includes(role));
};

const roleIcons: Record<string, any> = {
  super_admin: Settings,
  department_admin: Building2,
  faculty: Users,
  student: LayoutDashboard,
  security_staff: Shield,
  maintenance_staff: Wrench,
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, isLoading, loadUser, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !isAuthenticated || !user) {
    return (
      <div className="min-h-screen bg-cos-bg-primary flex items-center justify-center">
        <div className="animate-pulse-glow w-16 h-16 rounded-full gradient-bg flex items-center justify-center">
          <Zap className="w-8 h-8 text-white" />
        </div>
      </div>
    );
  }

  const navItems = getNavItems(user.role);
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
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-cos-bg-secondary border-r border-cos-border flex flex-col transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-cos-border">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg gradient-bg flex items-center justify-center">
              <Zap className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="text-lg font-bold">
              Campus<span className="gradient-text">OS</span>
            </span>
          </Link>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-cos-text-muted hover:text-cos-text-primary">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(item => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href} onClick={() => setSidebarOpen(false)}
                className={`sidebar-item flex items-center gap-3 text-sm ${isActive ? 'active' : 'text-cos-text-secondary hover:text-cos-text-primary'}`}>
                <item.icon className="w-4.5 h-4.5" />
                <span>{item.label}</span>
              </Link>
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
              <div className="absolute bottom-full left-0 right-0 mb-2 glass-card p-2 animate-fade-in">
                <div className="px-3 py-2 mb-1">
                  <div className="text-xs text-cos-text-muted">{user.email}</div>
                  <div className={`badge mt-1 text-[10px] ${getRoleBadgeColor(user.role)}`}>
                    {formatRoleName(user.role)}
                  </div>
                </div>
                <button onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
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
        <header className="sticky top-0 z-30 bg-cos-bg-primary/80 backdrop-blur-xl border-b border-cos-border px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-cos-text-secondary hover:text-cos-text-primary">
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-semibold capitalize">
                {pathname === '/dashboard' ? 'Dashboard' : pathname.split('/').pop()?.replace(/-/g, ' ')}
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={`badge text-xs ${getRoleBadgeColor(user.role)}`}>
              <RoleIcon className="w-3 h-3 mr-1" />
              {formatRoleName(user.role)}
            </div>
            {user.department && (
              <span className="text-xs text-cos-text-muted hidden sm:block">{user.department.code}</span>
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
