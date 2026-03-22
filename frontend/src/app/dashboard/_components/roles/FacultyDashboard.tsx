'use client';

import { QrCode, CheckCircle2, ArrowUpRight, Plus, Bell, Activity, Users } from 'lucide-react';
import Link from 'next/link';
import { formatDateTime, getStatusColor } from '@/lib/utils';
import { OverviewStats } from '../OverviewStats';

export function FacultyDashboard({ stats, notifications, gatePasses, complaints }: any) {
  return (
    <div className="space-y-8">
      <OverviewStats 
        stats={stats} 
        notifications={notifications} 
        gatePasses={gatePasses} 
        complaints={complaints} 
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="space-y-6">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-cos-text-muted">Faculty Actions</h3>
          <div className="space-y-3">
            <Link href="/dashboard/gatepass" className="flex items-center justify-between p-4 glass-card glass-card-hover group">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-cos-primary" />
                <span className="font-medium text-sm">Approve Requests</span>
              </div>
              <ArrowUpRight className="w-4 h-4 text-cos-text-muted group-hover:text-cos-primary transition-colors" />
            </Link>
            <Link href="/dashboard/notifications/new" className="flex items-center justify-between p-4 glass-card glass-card-hover group">
              <div className="flex items-center gap-3">
                <Plus className="w-5 h-5 text-cos-primary" />
                <span className="font-medium text-sm">Post Announcement</span>
              </div>
              <Plus className="w-4 h-4 text-cos-text-muted group-hover:text-cos-primary transition-colors" />
            </Link>
            <Link href="/dashboard/resources" className="flex items-center justify-between p-4 glass-card glass-card-hover group">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-cos-primary" />
                <span className="font-medium text-sm">Resource Bookings</span>
              </div>
              <ArrowUpRight className="w-4 h-4 text-cos-text-muted group-hover:text-cos-primary transition-colors" />
            </Link>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-cos-text-muted">Latest Activities</h3>
            <Link href="/dashboard/notifications" className="text-xs text-cos-primary hover:underline">View All</Link>
          </div>
          <div className="glass-card divide-y divide-cos-border">
            {notifications.length > 0 ? notifications.slice(0, 3).map((notif: any) => (
              <div key={notif.id} className="p-4 flex items-start gap-4 hover:bg-cos-bg-secondary/30 transition-colors">
                <div className="w-9 h-9 rounded-full bg-cos-primary/10 flex items-center justify-center shrink-0">
                  <Bell className="w-4 h-4 text-cos-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-sm font-semibold">{notif.title}</h4>
                  <p className="text-xs text-cos-text-secondary line-clamp-1 mt-1">{notif.ai_summary || notif.content}</p>
                </div>
              </div>
            )) : (
              <div className="p-8 text-center text-cos-text-muted text-sm italic">No recent updates</div>
            )}
          </div>
        </div>
      </div>

      <div className="glass-card p-6">
        <h3 className="font-bold mb-6 flex items-center gap-2 italic">
          <Activity className="w-5 h-5 text-cos-primary" /> 
          Pending Approvals
        </h3>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Applicant</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Time Received</th>
              </tr>
            </thead>
            <tbody>
              {gatePasses.slice(0, 5).map((gp: any) => (
                <tr key={gp.id}>
                  <td><div className="font-bold text-sm">{gp.student_name}</div></td>
                  <td><div className="text-xs text-cos-text-secondary">{gp.reason}</div></td>
                  <td><span className={`badge text-[10px] ${getStatusColor(gp.status)}`}>{gp.status?.replace(/_/g, ' ')}</span></td>
                  <td className="text-xs text-cos-text-muted">{formatDateTime(gp.created_at)}</td>
                </tr>
              ))}
              {gatePasses.length === 0 && (
                <tr><td colSpan={4} className="text-center py-6 text-cos-text-muted italic">Clear queue! No pending tasks.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
