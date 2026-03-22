'use client';

import { QrCode, ShieldCheck, ArrowUpRight, Plus, Bell, Activity, Users, Camera } from 'lucide-react';
import Link from 'next/link';
import { formatDateTime, getStatusColor } from '@/lib/utils';
import { OverviewStats } from '../OverviewStats';

export function SecurityDashboard({ stats, notifications, gatePasses }: any) {
  return (
    <div className="space-y-8">
      <OverviewStats 
        stats={stats} 
        notifications={notifications} 
        gatePasses={gatePasses} 
        complaints={[]} 
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="space-y-6">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-cos-text-muted">Security Actions</h3>
          <div className="space-y-3">
            <Link href="/dashboard/gatepass" className="flex items-center justify-between p-6 glass-card group border-cos-primary/30 bg-cos-primary/5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl gradient-bg flex items-center justify-center shadow-[0_0_30px_rgba(255,106,0,0.4)]">
                   <QrCode className="w-6 h-6 text-white" />
                </div>
                <div>
                   <span className="font-black text-sm uppercase tracking-widest block">Scan Transit QR</span>
                   <span className="text-[10px] text-cos-text-muted">Validate entry/exit</span>
                </div>
              </div>
              <ArrowUpRight className="w-5 h-5 text-cos-text-muted group-hover:text-cos-primary transition-colors" />
            </Link>
            <Link href="/dashboard/notifications" className="flex items-center justify-between p-4 glass-card glass-card-hover group">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-cos-primary" />
                <span className="font-medium text-sm">Security Bulletins</span>
              </div>
              <ArrowUpRight className="w-4 h-4 text-cos-text-muted group-hover:text-cos-primary transition-colors" />
            </Link>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-cos-text-muted">Real-time Transit Log</h3>
            <Link href="/dashboard/gatepass" className="text-xs text-cos-primary hover:underline">Full Log</Link>
          </div>
          <div className="glass-card divide-y divide-cos-border">
            {gatePasses.length > 0 ? gatePasses.slice(0, 4).map((gp: any) => (
              <div key={gp.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                 <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-[10px] font-bold text-cos-primary border border-white/10 uppercase">
                       {gp.student_name?.[0]}
                    </div>
                    <div>
                      <div className="text-sm font-bold">{gp.student_name}</div>
                      <div className="text-[10px] text-cos-text-muted italic">{gp.pass_type?.replace(/_/g, ' ')} · {gp.reason}</div>
                    </div>
                 </div>
                 <div className="text-right">
                    <div className={`text-[9px] font-black uppercase tracking-widest ${gp.status === 'opened' ? 'text-cos-success' : 'text-cos-primary'}`}>{gp.status?.replace(/_/g, ' ')}</div>
                    <div className="text-[9px] text-cos-text-secondary mt-0.5">{formatDateTime(gp.updated_at)}</div>
                 </div>
              </div>
            )) : (
              <div className="p-8 text-center text-cos-text-muted text-sm italic">No recent scans detected</div>
            )}
          </div>
        </div>
      </div>

      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-8">
           <h3 className="font-bold flex items-center gap-2 italic">
            <Camera className="w-5 h-5 text-cos-primary" /> 
            Recent Scan Activity
          </h3>
          <div className="px-3 py-1 rounded-full bg-cos-success/10 border border-cos-success/20 text-[10px] font-black text-cos-success uppercase tracking-widest animate-pulse">Live Feed</div>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Identity</th>
                <th>Mode</th>
                <th>Time Scanned</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {gatePasses.slice(0, 5).map((gp: any) => (
                <tr key={gp.id}>
                  <td><div className="font-medium text-sm">{gp.student_name}</div></td>
                  <td><span className="text-[10px] font-bold text-cos-text-muted uppercase tracking-widest">{gp.residence_type || 'INSTITUTIONAL'}</span></td>
                  <td className="text-xs text-cos-text-muted">{formatDateTime(gp.exit_scanned_at || gp.entry_scanned_at || gp.updated_at)}</td>
                  <td><span className={`badge text-[10px] ${getStatusColor(gp.status)}`}>{gp.status?.replace(/_/g, ' ')}</span></td>
                </tr>
              ))}
              {gatePasses.length === 0 && (
                <tr><td colSpan={4} className="text-center py-6 text-cos-text-muted italic">Clear entrypoint. Monitoring active...</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
