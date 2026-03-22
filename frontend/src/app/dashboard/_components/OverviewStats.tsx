'use client';

import { QrCode, MessageSquareWarning, Bell, Users } from 'lucide-react';

interface StatsProps {
  stats: any;
  complaints: any[];
  notifications: any[];
  gatePasses: any[];
}

export function OverviewStats({ stats, complaints, notifications, gatePasses }: StatsProps) {
  const overviewCards = [
    {
      icon: MessageSquareWarning,
      label: 'Open Complaints',
      value: stats?.overview?.openComplaints || complaints.filter(c => c.status === 'open').length || 0,
      trend: 'Complaints',
      color: 'text-cos-primary',
      bgColor: 'bg-cos-primary/10',
    },
    {
      icon: QrCode,
      label: 'Gate Passes',
      value: stats?.overview?.totalGatePassesThisMonth || gatePasses.length || 0,
      trend: 'Monthly',
      color: 'text-cos-primary',
      bgColor: 'bg-cos-primary/10',
    },
    {
      icon: Bell,
      label: 'Notifications',
      value: notifications.length || 0,
      trend: 'Recent',
      color: 'text-cos-primary',
      bgColor: 'bg-cos-primary/10',
    },
    {
      icon: Users,
      label: 'Approvals',
      value: stats?.overview?.pendingApprovals || 0,
      trend: 'Pending',
      color: 'text-cos-primary',
      bgColor: 'bg-cos-primary/10',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {overviewCards.map((card, i) => (
        <div key={i} className="glass-card p-5 stat-card">
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
  );
}
