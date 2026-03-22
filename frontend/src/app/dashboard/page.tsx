'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { notificationAPI, complaintAPI, gatePassAPI, analyticsAPI } from '@/lib/api';
import { formatRoleName, getStatusColor, getPriorityColor, formatDateTime } from '@/lib/utils';
import {
  Bell, MessageSquareWarning, QrCode, Calendar,
  Activity, ArrowUpRight, Loader2, Plus, CheckCircle2
} from 'lucide-react';
import Link from 'next/link';
import { OverviewStats } from './_components/OverviewStats';

import { StudentDashboard } from './_components/roles/StudentDashboard';
import { FacultyDashboard } from './_components/roles/FacultyDashboard';
import { HODDashboard } from './_components/roles/HODDashboard';
import { WardenDashboard } from './_components/roles/WardenDashboard';
import { SecurityDashboard } from './_components/roles/SecurityDashboard';
import { MaintenanceDashboard } from './_components/roles/MaintenanceDashboard';

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [gatePasses, setGatePasses] = useState<any[]>([]);

  const designation = (user?.designation || user?.faculty?.designation || '').toUpperCase();

  useEffect(() => {
    if (user?.role) {
      loadDashboardData();
    }
  }, [user?.role, designation]);

  const loadDashboardData = async () => {
    // Only show full-page loader on first mount or when switching core roles
    const isInitial = !stats && notifications.length === 0;
    if (isInitial) setLoading(true);
    else setRefreshing(true);

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
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-cos-primary" />
      </div>
    );
  }

  const role = user?.role || '';

  return (
    <div className="space-y-8">
      {/* Dynamic Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold mb-1">
            Hello, <span className="gradient-text">{user?.name?.split(' ')[0]}</span>
          </h2>
          <p className="text-cos-text-secondary text-sm">
            {formatRoleName(role)} {designation ? `· ${designation}` : ''} {user?.department ? `· ${user.department.name}` : ''}
          </p>
        </div>
        {refreshing && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-cos-primary/10 border border-cos-primary/20 text-cos-primary text-[10px] font-black uppercase tracking-widest animate-pulse">
            <Loader2 className="w-3 h-3 animate-spin" /> Syncing Node...
          </div>
        )}
      </div>

      {/* Role-Specific Dashboard Swap */}
      {role === 'student' && (
        <StudentDashboard stats={stats} notifications={notifications} gatePasses={gatePasses} />
      )}

      {(role === 'faculty' && designation !== 'HOD' && designation !== 'WARDEN') && (
        <FacultyDashboard stats={stats} notifications={notifications} gatePasses={gatePasses} complaints={complaints} />
      )}

      {(role === 'department_admin' || designation === 'HOD') && (
        <HODDashboard stats={stats} notifications={notifications} gatePasses={gatePasses} complaints={complaints} />
      )}

      {(role === 'warden' || designation === 'WARDEN' || designation === 'DEPUTY WARDEN') && (
        <WardenDashboard stats={stats} notifications={notifications} gatePasses={gatePasses} />
      )}

      {role === 'security_staff' && (
        <SecurityDashboard stats={stats} notifications={notifications} gatePasses={gatePasses} />
      )}

      {role === 'maintenance_staff' && (
        <MaintenanceDashboard stats={stats} notifications={notifications} complaints={complaints} />
      )}

      {/* Super Admin Fallback */}
      {role === 'super_admin' && (
        <div className="space-y-8">
          <OverviewStats stats={stats} complaints={complaints} notifications={notifications} gatePasses={gatePasses} />
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-6">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-cos-text-muted">Operations</h3>
              <div className="space-y-3">
                <Link href="/dashboard/gatepass" className="flex items-center justify-between p-4 glass-card glass-card-hover group">
                  <div className="flex items-center gap-3">
                    <QrCode className="w-5 h-5 text-cos-primary" />
                    <span className="font-medium text-sm">Transits / Scans</span>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-cos-text-muted group-hover:text-cos-primary transition-colors" />
                </Link>
                <Link href="/dashboard/notifications" className="flex items-center justify-between p-4 glass-card glass-card-hover group">
                  <div className="flex items-center gap-3">
                    <Bell className="w-5 h-5 text-cos-primary" />
                    <span className="font-medium text-sm">Broadcast Center</span>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-cos-text-muted group-hover:text-cos-primary transition-colors" />
                </Link>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-cos-text-muted">System Overview</h3>
              <div className="glass-card p-6 min-h-[160px] flex items-center justify-center text-cos-text-muted italic">
                Authorized Personnel Feed: Monitoring Campus Lifeline
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
