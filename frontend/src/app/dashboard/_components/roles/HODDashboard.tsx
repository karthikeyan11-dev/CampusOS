'use client';

import { Building2, CheckCircle2, ArrowUpRight, Plus, Bell, Activity, Users, BarChart3 } from 'lucide-react';
import Link from 'next/link';
import { formatDateTime, getStatusColor } from '@/lib/utils';
import { OverviewStats } from '../OverviewStats';

export function HODDashboard({ stats, notifications, gatePasses, complaints }: any) {
  return (
    <div className="space-y-8">
      {/* High-Level Overview for HOD */}
      <h3 className="text-cos-primary font-black uppercase tracking-widest text-[10px] italic">Department Oversight</h3>
      <OverviewStats 
        stats={stats} 
        notifications={notifications} 
        gatePasses={gatePasses} 
        complaints={complaints} 
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="space-y-6">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-cos-text-muted">HOD Actions</h3>
          <div className="space-y-3">
            <Link href="/dashboard/gatepass" className="flex items-center justify-between p-4 glass-card glass-card-hover group">
              <div className="flex items-center gap-3">
                <Building2 className="w-5 h-5 text-cos-primary" />
                <span className="font-medium text-sm">Escalated Approvals</span>
              </div>
              <ArrowUpRight className="w-4 h-4 text-cos-text-muted group-hover:text-cos-primary transition-colors" />
            </Link>
            <Link href="/dashboard/resources" className="flex items-center justify-between p-4 glass-card glass-card-hover group">
              <div className="flex items-center gap-3">
                <BarChart3 className="w-5 h-5 text-cos-primary" />
                <span className="font-medium text-sm">Resource Management</span>
              </div>
              <Plus className="w-4 h-4 text-cos-text-muted group-hover:text-cos-primary transition-colors" />
            </Link>
            <Link href="/dashboard/notifications/new" className="flex items-center justify-between p-4 glass-card glass-card-hover group border-cos-primary/20">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-cos-primary" />
                <span className="font-medium text-sm">Department Notice</span>
              </div>
              <Plus className="w-4 h-4 text-cos-text-muted group-hover:text-cos-primary transition-colors" />
            </Link>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-cos-text-muted">Department Activities</h3>
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
              <div className="p-8 text-center text-cos-text-muted text-sm italic">No departmental activity</div>
            )}
          </div>
        </div>
      </div>

      <div className="glass-card p-6 border-cos-primary/10">
        <h3 className="font-bold mb-6 flex items-center gap-2 italic">
          <Activity className="w-5 h-5 text-cos-primary" /> 
          Critical Approvals (HOD Level)
        </h3>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Student / Staff</th>
                <th>Request Type</th>
                <th>Priority</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {gatePasses.length > 0 ? gatePasses.slice(0, 5).map((gp: any) => (
                <tr key={gp.id}>
                  <td><div className="font-bold text-sm">{gp.student_name}</div></td>
                  <td><div className="text-xs text-cos-text-secondary italic uppercase tracking-tighter">{gp.pass_type?.replace(/_/g, ' ')}</div></td>
                  <td><span className="text-[10px] text-cos-text-muted font-bold">DEPARTMENT</span></td>
                  <td><span className={`badge text-[10px] ${getStatusColor(gp.status)} uppercase font-black`}>{gp.status?.replace(/_/g, ' ')}</span></td>
                </tr>
              )) : (
                <tr><td colSpan={4} className="text-center py-6 text-cos-text-muted italic">All clear! No pending departmental approvals.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
