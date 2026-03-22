'use client';

import { useEffect, useState } from 'react';
import { analyticsAPI } from '@/lib/api';
import { 
  BarChart3, Users, QrCode, MessageSquare, 
  Activity, ArrowUp, ArrowDown, Loader2,
  Clock, ShieldCheck, AlertCircle
} from 'lucide-react';
import { formatDateTime } from '@/lib/utils';

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
    const interval = setInterval(loadAnalytics, 15000); // 15s real-time update
    return () => clearInterval(interval);
  }, []);

  const loadAnalytics = async () => {
    try {
      const res = await analyticsAPI.getDashboard();
      setData(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center p-20">
      <Loader2 className="w-8 h-8 animate-spin text-cos-primary" />
    </div>
  );

  const stats = data?.overview || {};

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black tracking-tight">System <span className="gradient-text">Insights</span></h2>
          <p className="text-cos-text-secondary text-sm">Real-time platform metrics and audit logs</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-black uppercase tracking-widest text-emerald-400">
           <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live Stream Active
        </div>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard label="Open Complaints" value={stats.openComplaints} total={stats.totalComplaints} icon={MessageSquare} color="text-orange-400" />
        <MetricCard label="Gate Passes (MTD)" value={stats.totalGatePassesThisMonth} icon={QrCode} color="text-blue-400" />
        <MetricCard label="Pending Approvals" value={stats.pendingApprovals} icon={ShieldCheck} color="text-amber-400" highlight />
        <MetricCard label="Platform Uptime" value="99.9%" icon={Activity} color="text-emerald-400" />
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* User Distribution */}
        <div className="glass-card p-6">
          <h3 className="font-bold mb-6 flex items-center gap-2">
            <Users className="w-5 h-5 text-cos-primary" /> User Distribution
          </h3>
          <div className="space-y-4">
            {data?.users?.map((u: any) => (
              <div key={`${u.role}-${u.status}`} className="flex items-center justify-between">
                <div className="text-xs font-bold uppercase tracking-widest text-cos-text-muted">
                  {u.role.replace('_', ' ')} <span className="text-[8px] opacity-40">({u.status})</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full gradient-bg" style={{ width: `${Math.min(100, (u.count / 100) * 100)}%` }} />
                  </div>
                  <span className="text-sm font-black">{u.count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Audit Logs */}
        <div className="lg:col-span-2 glass-card overflow-hidden">
          <div className="p-6 border-b border-white/5 flex items-center justify-between">
            <h3 className="font-bold flex items-center gap-2">
              <Clock className="w-5 h-5 text-cos-primary" /> System Audit Trail
            </h3>
            <button className="text-[10px] font-black uppercase tracking-widest text-cos-primary hover:underline">View Full Logs</button>
          </div>
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Identity</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {data?.recentActivity?.map((log: any) => (
                  <tr key={log.id}>
                    <td>
                      <div className="text-xs font-bold">{log.user_name}</div>
                      <div className="text-[10px] text-cos-text-muted uppercase">{log.user_role}</div>
                    </td>
                    <td>
                      <span className={`text-[10px] font-black uppercase ${log.action === 'CREATE' ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="text-xs text-cos-text-secondary">{log.entity_type}</td>
                    <td className="text-[10px] text-cos-text-muted">{formatDateTime(log.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, total, icon: Icon, color, highlight }: any) {
  return (
    <div className={`glass-card p-6 relative group ${highlight ? 'border-amber-500/20 bg-amber-500/[0.02]' : ''}`}>
      <div className={`p-2 rounded-lg bg-white/5 inline-flex mb-4 group-hover:scale-110 transition-transform ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-3xl font-black mb-1">{value}</div>
      <div className="text-[10px] font-black uppercase tracking-widest text-cos-text-muted">
        {label} {total && <span className="ml-1 opacity-50">/ {total} Total</span>}
      </div>
    </div>
  );
}
