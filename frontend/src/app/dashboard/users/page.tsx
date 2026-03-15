'use client';

import { useEffect, useState } from 'react';
import { authAPI } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { formatDateTime, getRoleBadgeColor, formatRoleName, getStatusColor } from '@/lib/utils';
import { Users, Loader2, CheckCircle2, XCircle, Clock, Shield } from 'lucide-react';

export default function UsersPage() {
  const { user } = useAuthStore();
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadPendingUsers(); }, []);

  const loadPendingUsers = async () => {
    setLoading(true);
    try {
      const res = await authAPI.getPendingUsers();
      setPendingUsers(res.data.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleApprove = async (id: string, status: string) => {
    try {
      await authAPI.approveUser(id, status);
      loadPendingUsers();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Users className="w-5 h-5 text-cos-primary" /> User Management
        </h2>
        <p className="text-sm text-cos-text-secondary mt-1">Review and approve user registrations</p>
      </div>

      <div className="glass-card p-5">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-amber-400" /> Pending Approvals ({pendingUsers.length})
        </h3>

        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-cos-primary" /></div>
        ) : pendingUsers.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle2 className="w-12 h-12 text-emerald-400/30 mx-auto mb-3" />
            <p className="text-cos-text-secondary">No pending approvals</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Department</th>
                  <th>Registered</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingUsers.map((u: any) => (
                  <tr key={u.id}>
                    <td className="font-medium">{u.name}</td>
                    <td className="text-cos-text-secondary">{u.email}</td>
                    <td>
                      <span className={`badge text-[10px] ${getRoleBadgeColor(u.role)}`}>
                        {formatRoleName(u.role)}
                      </span>
                    </td>
                    <td className="text-cos-text-muted text-xs">{u.department_name || '—'}</td>
                    <td className="text-cos-text-muted text-xs">{formatDateTime(u.created_at)}</td>
                    <td>
                      <div className="flex gap-2">
                        <button onClick={() => handleApprove(u.id, 'approved')}
                          className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 transition-colors" title="Approve">
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleApprove(u.id, 'rejected')}
                          className="p-1.5 rounded-lg bg-red-500/15 text-red-400 hover:bg-red-500/25 transition-colors" title="Reject">
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
