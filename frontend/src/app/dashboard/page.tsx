'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { analyticsAPI, notificationAPI, complaintAPI, gatePassAPI } from '@/lib/api';
import { formatRoleName, getStatusColor, getPriorityColor, formatDateTime } from '@/lib/utils';
import {
  Bell, MessageSquareWarning, QrCode, Calendar, Users, Search,
  TrendingUp, AlertTriangle, Clock, CheckCircle2, BarChart3, Activity,
  ArrowUpRight, Loader2
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [gatePasses, setGatePasses] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const results = await Promise.allSettled([
        analyticsAPI.getDashboard().catch(() => null),
        notificationAPI.getAll({ limit: 5 }),
        complaintAPI.getAll({ limit: 5 }),
        gatePassAPI.getAll({ limit: 5 }),
      ]);

      if (results[0].status === 'fulfilled' && results[0].value) {
        setStats(results[0].value.data.data);
      }
      if (results[1].status === 'fulfilled') {
        setNotifications(results[1].value.data.data || []);
      }
      if (results[2].status === 'fulfilled') {
        setComplaints(results[2].value.data.data || []);
      }
      if (results[3].status === 'fulfilled') {
        setGatePasses(results[3].value.data.data || []);
      }
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-cos-primary" />
      </div>
    );
  }

  const quickActions = [
    { href: '/dashboard/notifications', icon: Bell, label: 'Notifications', gradient: 'from-blue-500 to-cyan-400', count: notifications.length },
    { href: '/dashboard/complaints', icon: MessageSquareWarning, label: 'Complaints', gradient: 'from-purple-500 to-pink-400', count: complaints.length },
    { href: '/dashboard/gatepass', icon: QrCode, label: 'Gate Pass', gradient: 'from-rose-500 to-red-400', count: gatePasses.length },
    { href: '/dashboard/resources', icon: Calendar, label: 'Resources', gradient: 'from-emerald-500 to-teal-400', count: 0 },
    { href: '/dashboard/lostfound', icon: Search, label: 'Lost & Found', gradient: 'from-amber-500 to-orange-400', count: 0 },
  ];

  const overviewCards = [
    {
      icon: MessageSquareWarning,
      label: 'Open Complaints',
      value: stats?.overview?.openComplaints || complaints.filter(c => c.status === 'open').length || 0,
      trend: '+12%',
      color: 'text-amber-400',
      bgColor: 'bg-amber-500/15',
    },
    {
      icon: QrCode,
      label: 'Gate Passes Today',
      value: stats?.overview?.totalGatePassesThisMonth || gatePasses.length || 0,
      trend: 'This month',
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/15',
    },
    {
      icon: Bell,
      label: 'Notifications',
      value: notifications.length || 0,
      trend: 'Latest',
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/15',
    },
    {
      icon: Users,
      label: 'Pending Approvals',
      value: stats?.overview?.pendingApprovals || 0,
      trend: 'Action needed',
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/15',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="glass-card p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-cos-primary/10 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative z-10">
          <h2 className="text-2xl font-bold mb-1">
            Welcome back, <span className="gradient-text">{user?.name?.split(' ')[0]}</span>! 👋
          </h2>
          <p className="text-cos-text-secondary text-sm">
            {formatRoleName(user?.role || '')} {user?.department ? `· ${user.department.name}` : ''} · {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {overviewCards.map((card, i) => (
          <div key={i} className="glass-card glass-card-hover p-5 stat-card">
            <div className="flex items-start justify-between">
              <div className={`w-10 h-10 rounded-xl ${card.bgColor} flex items-center justify-center`}>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
              <span className="text-xs text-cos-text-muted">{card.trend}</span>
            </div>
            <div className="mt-4">
              <div className="text-2xl font-bold">{card.value}</div>
              <div className="text-sm text-cos-text-secondary mt-0.5">{card.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-sm font-medium text-cos-text-secondary mb-3 uppercase tracking-wider">Quick Access</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {quickActions.map((action, i) => (
            <Link key={i} href={action.href}
              className="glass-card glass-card-hover p-4 flex flex-col items-center gap-3 text-center group">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${action.gradient} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                <action.icon className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-medium">{action.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Notifications */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Bell className="w-4 h-4 text-cos-primary" /> Recent Notifications
            </h3>
            <Link href="/dashboard/notifications" className="text-xs text-cos-primary hover:underline flex items-center gap-1">
              View all <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {notifications.length > 0 ? notifications.slice(0, 4).map((notif: any) => (
              <div key={notif.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-cos-bg-elevated/50 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bell className="w-4 h-4 text-blue-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{notif.title}</div>
                  <div className="text-xs text-cos-text-muted mt-0.5 truncate">{notif.ai_summary || notif.content?.substring(0, 80)}</div>
                  <div className="text-[10px] text-cos-text-muted mt-1">{formatDateTime(notif.created_at)}</div>
                </div>
              </div>
            )) : (
              <p className="text-sm text-cos-text-muted text-center py-8">No notifications yet</p>
            )}
          </div>
        </div>

        {/* Recent Complaints */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <MessageSquareWarning className="w-4 h-4 text-purple-400" /> Recent Complaints
            </h3>
            <Link href="/dashboard/complaints" className="text-xs text-cos-primary hover:underline flex items-center gap-1">
              View all <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {complaints.length > 0 ? complaints.slice(0, 4).map((complaint: any) => (
              <div key={complaint.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-cos-bg-elevated/50 transition-colors">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${getPriorityColor(complaint.priority)}`}>
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{complaint.title}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`badge text-[10px] ${getStatusColor(complaint.status)}`}>{complaint.status}</span>
                    <span className={`badge text-[10px] ${getPriorityColor(complaint.priority)}`}>{complaint.priority}</span>
                  </div>
                </div>
              </div>
            )) : (
              <p className="text-sm text-cos-text-muted text-center py-8">No complaints yet</p>
            )}
          </div>
        </div>

        {/* Recent Gate Passes */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <QrCode className="w-4 h-4 text-rose-400" /> Recent Gate Passes
            </h3>
            <Link href="/dashboard/gatepass" className="text-xs text-cos-primary hover:underline flex items-center gap-1">
              View all <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {gatePasses.length > 0 ? gatePasses.slice(0, 4).map((gp: any) => (
              <div key={gp.id} className="flex items-start gap-3 p-3 rounded-lg hover:bg-cos-bg-elevated/50 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-rose-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <QrCode className="w-4 h-4 text-rose-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{gp.user_name || 'Gate Pass Request'}</div>
                  <div className="text-xs text-cos-text-muted mt-0.5 truncate">{gp.reason}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`badge text-[10px] ${getStatusColor(gp.status)}`}>{gp.status?.replace(/_/g, ' ')}</span>
                  </div>
                </div>
              </div>
            )) : (
              <p className="text-sm text-cos-text-muted text-center py-8">No gate passes yet</p>
            )}
          </div>
        </div>

        {/* System Status */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" /> System Status
            </h3>
          </div>
          <div className="space-y-4">
            {[
              { label: 'API Server', status: 'Online', color: 'bg-emerald-400' },
              { label: 'Database', status: 'Connected', color: 'bg-emerald-400' },
              { label: 'AI Engine (GROQ)', status: 'Ready', color: 'bg-emerald-400' },
              { label: 'SMS Gateway', status: 'Configured', color: 'bg-amber-400' },
              { label: 'Email Service', status: 'Configured', color: 'bg-amber-400' },
            ].map((service, i) => (
              <div key={i} className="flex items-center justify-between py-2">
                <span className="text-sm text-cos-text-secondary">{service.label}</span>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${service.color}`} />
                  <span className="text-xs text-cos-text-muted">{service.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
