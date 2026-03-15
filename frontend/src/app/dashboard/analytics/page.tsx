'use client';

import { useEffect, useState } from 'react';
import { analyticsAPI } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import { BarChart3, Loader2, MessageSquareWarning, QrCode, Bell, Users, Activity, Clock } from 'lucide-react';

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    analyticsAPI.getDashboard()
      .then(res => setData(res.data.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-cos-primary" /></div>;
  }

  if (!data) {
    return (
      <div className="glass-card p-12 text-center">
        <BarChart3 className="w-12 h-12 text-cos-text-muted mx-auto mb-3" />
        <p className="text-cos-text-secondary">Analytics data not available</p>
      </div>
    );
  }

  const complaintsByStatus = data.complaints?.byStatus || [];
  const complaintsByCategory = data.complaints?.byCategory || [];
  const gatePassStats = data.gatePasses?.thisMonth || [];
  const notifStats = data.notifications?.thisMonth || [];
  const resourceUsage = data.resources?.usage || [];
  const recentActivity = data.recentActivity || [];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-cos-primary" /> Analytics Dashboard
        </h2>
        <p className="text-sm text-cos-text-secondary mt-1">Campus-wide statistics and insights</p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
              <MessageSquareWarning className="w-5 h-5 text-amber-400" />
            </div>
            <div className="text-xs text-cos-text-muted">Complaints</div>
          </div>
          <div className="text-2xl font-bold">{data.overview?.totalComplaints || 0}</div>
          <div className="text-xs text-cos-text-muted mt-1">{data.overview?.openComplaints || 0} open</div>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 flex items-center justify-center">
              <QrCode className="w-5 h-5 text-blue-400" />
            </div>
            <div className="text-xs text-cos-text-muted">Gate Passes</div>
          </div>
          <div className="text-2xl font-bold">{data.overview?.totalGatePassesThisMonth || 0}</div>
          <div className="text-xs text-cos-text-muted mt-1">This month</div>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
              <Bell className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="text-xs text-cos-text-muted">Notifications</div>
          </div>
          <div className="text-2xl font-bold">{notifStats.reduce((s: number, n: any) => s + parseInt(n.count), 0)}</div>
          <div className="text-xs text-cos-text-muted mt-1">This month</div>
        </div>
        <div className="glass-card p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-400" />
            </div>
            <div className="text-xs text-cos-text-muted">Pending Users</div>
          </div>
          <div className="text-2xl font-bold">{data.overview?.pendingApprovals || 0}</div>
          <div className="text-xs text-cos-text-muted mt-1">Awaiting approval</div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Complaints by Category */}
        <div className="glass-card p-5">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <MessageSquareWarning className="w-4 h-4 text-amber-400" /> Complaints by Category
          </h3>
          <div className="space-y-3">
            {complaintsByCategory.length > 0 ? complaintsByCategory.map((cat: any, i: number) => {
              const maxCount = Math.max(...complaintsByCategory.map((c: any) => parseInt(c.count)));
              const pct = (parseInt(cat.count) / maxCount) * 100;
              return (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="capitalize text-cos-text-secondary">{cat.category?.replace(/_/g, ' ')}</span>
                    <span className="font-medium">{cat.count}</span>
                  </div>
                  <div className="h-2 bg-cos-bg-secondary rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-cos-primary to-cos-secondary rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            }) : <p className="text-sm text-cos-text-muted text-center py-4">No data</p>}
          </div>
        </div>

        {/* Complaints by Status */}
        <div className="glass-card p-5">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-400" /> Complaints by Status
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {complaintsByStatus.map((stat: any, i: number) => (
              <div key={i} className="bg-cos-bg-secondary/50 rounded-lg p-3 text-center">
                <div className="text-xl font-bold">{stat.count}</div>
                <div className="text-xs text-cos-text-muted capitalize mt-1">{stat.status?.replace(/_/g, ' ')}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Gate Pass Stats */}
        <div className="glass-card p-5">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <QrCode className="w-4 h-4 text-rose-400" /> Gate Pass Status (This Month)
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {gatePassStats.length > 0 ? gatePassStats.map((stat: any, i: number) => (
              <div key={i} className="bg-cos-bg-secondary/50 rounded-lg p-3 text-center">
                <div className="text-xl font-bold">{stat.count}</div>
                <div className="text-xs text-cos-text-muted capitalize mt-1">{stat.status?.replace(/_/g, ' ')}</div>
              </div>
            )) : <p className="col-span-2 text-sm text-cos-text-muted text-center py-4">No data</p>}
          </div>
        </div>

        {/* Resource Usage */}
        <div className="glass-card p-5">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-emerald-400" /> Resource Usage
          </h3>
          <div className="space-y-3">
            {resourceUsage.length > 0 ? resourceUsage.map((res: any, i: number) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-cos-border last:border-0">
                <span className="text-sm capitalize text-cos-text-secondary">{res.resource_type?.replace(/_/g, ' ')}</span>
                <div className="text-right">
                  <span className="text-sm font-medium">{res.bookings} bookings</span>
                  <span className="text-xs text-emerald-400 ml-2">({res.approved} approved)</span>
                </div>
              </div>
            )) : <p className="text-sm text-cos-text-muted text-center py-4">No data</p>}
          </div>
        </div>
      </div>

      {/* Recent Activity / Audit Log */}
      <div className="glass-card p-5">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-cos-primary" /> Recent System Activity
        </h3>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Action</th>
                <th>Entity</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {recentActivity.length > 0 ? recentActivity.map((log: any) => (
                <tr key={log.id}>
                  <td className="text-cos-text-secondary">{log.user_name}</td>
                  <td><span className="badge text-[10px] bg-cos-bg-elevated text-cos-text-muted border-cos-border">{log.action}</span></td>
                  <td className="text-cos-text-muted text-xs">{log.entity_type}</td>
                  <td className="text-cos-text-muted text-xs">{formatDateTime(log.created_at)}</td>
                </tr>
              )) : (
                <tr><td colSpan={4} className="text-center text-cos-text-muted py-4">No recent activity</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
