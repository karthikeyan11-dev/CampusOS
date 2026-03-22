'use client';

import { Wrench, MessageSquareWarning, ArrowUpRight, Plus, Bell, Activity, Users, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { formatDateTime, getStatusColor, getPriorityColor } from '@/lib/utils';
import { OverviewStats } from '../OverviewStats';

export function MaintenanceDashboard({ stats, notifications, complaints }: any) {
  return (
    <div className="space-y-8">
      <OverviewStats 
        stats={stats} 
        notifications={notifications} 
        gatePasses={[]} 
        complaints={complaints} 
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="space-y-6">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-cos-text-muted">Staff Actions</h3>
          <div className="space-y-3">
            <Link href="/dashboard/complaints" className="flex items-center justify-between p-6 glass-card group border-cos-primary/30 bg-cos-primary/5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl gradient-bg flex items-center justify-center shadow-[0_0_30px_rgba(255,106,0,0.4)]">
                   <Wrench className="w-6 h-6 text-white" />
                </div>
                <div>
                   <span className="font-black text-sm uppercase tracking-widest block font-sans italic">Resolve Issues</span>
                   <span className="text-[10px] text-cos-text-muted">Pending Grievances</span>
                </div>
              </div>
              <ArrowUpRight className="w-5 h-5 text-cos-text-muted group-hover:text-cos-primary transition-colors" />
            </Link>
            <Link href="/dashboard/notifications" className="flex items-center justify-between p-4 glass-card glass-card-hover group">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-cos-primary" />
                <span className="font-medium text-sm">System Bulletins</span>
              </div>
              <ArrowUpRight className="w-4 h-4 text-cos-text-muted group-hover:text-cos-primary transition-colors" />
            </Link>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-cos-text-muted">Active Workorders</h3>
            <Link href="/dashboard/complaints" className="text-xs text-cos-primary hover:underline">Full Log</Link>
          </div>
          <div className="glass-card divide-y divide-cos-border">
            {complaints.length > 0 ? complaints.slice(0, 4).map((c: any) => (
              <div key={c.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                 <div className="flex items-center gap-4">
                    <div className="w-9 h-9 rounded-xl gradient-bg flex items-center justify-center text-white shrink-0">
                       <MessageSquareWarning className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold truncate">{c.title}</div>
                      <div className="text-[10px] text-cos-text-muted italic">{c.category?.replace(/_/g, ' ')} · {c.student_name || 'Anonymous'}</div>
                    </div>
                 </div>
                 <div className="text-right">
                    <span className={`text-[10px] font-black uppercase tracking-widest ${getPriorityColor(c.priority)}`}>{c.priority}</span>
                    <div className="text-[9px] text-cos-text-secondary mt-0.5">{formatDateTime(c.created_at)}</div>
                 </div>
              </div>
            )) : (
              <div className="p-8 text-center text-cos-text-muted text-sm italic">All systems optimized! No active workorders.</div>
            )}
          </div>
        </div>
      </div>

      <div className="glass-card p-6">
        <h3 className="font-bold flex items-center gap-2 italic mb-8">
            <Activity className="w-5 h-5 text-cos-primary" /> 
            Recent Grievance Feed
        </h3>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Identity</th>
                <th>Category</th>
                <th>Priority</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {complaints.slice(0, 5).map((c: any) => (
                <tr key={c.id}>
                  <td><div className="font-medium text-sm">{c.title}</div></td>
                  <td><span className="text-[10px] font-bold text-cos-text-muted uppercase tracking-widest">{c.category}</span></td>
                  <td><span className={`text-[10px] uppercase font-black ${getPriorityColor(c.priority)}`}>{c.priority}</span></td>
                  <td><span className={`badge text-[10px] ${getStatusColor(c.status)}`}>{c.status}</span></td>
                </tr>
              ))}
              {complaints.length === 0 && (
                <tr><td colSpan={4} className="text-center py-6 text-cos-text-muted italic">Clear log. Monitoring active...</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
