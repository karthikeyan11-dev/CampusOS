'use client';

import { useEffect, useState } from 'react';
import { authAPI } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { formatDateTime, getRoleBadgeColor, formatRoleName, getStatusColor } from '@/lib/utils';
import { 
  Users, Loader2, CheckCircle2, XCircle, Search, Shield, Clock
} from 'lucide-react';

export default function ApprovalsPage() {
  const { user: currentUser } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [roleFilter, setRoleFilter] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await authAPI.getPendingUsers();
      if (res.data?.success) {
        setPendingUsers(res.data.data || []);
      }
    } catch (err: any) {
      console.error('Approvals Fetch Error:', err);
      if (err.response?.status === 401) {
        console.warn('Unauthorized approvals fetch. Session may be expired.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string, status: string) => {
    try {
      await authAPI.approveUser(id, status);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to process approval');
    }
  };

  const filteredUsers = pendingUsers.filter(u => 
    (roleFilter === 'all' || u.role === roleFilter) && 
    (u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
        <div>
          <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
             <Shield className="w-7 h-7 text-cos-primary" /> User <span className="gradient-text">Approvals</span>
          </h2>
          <p className="text-xs text-cos-text-secondary font-bold uppercase tracking-widest mt-1">Institutional Registration Gatekeeper</p>
        </div>
      </div>

      <div className="glass-card overflow-hidden">
        <div className="p-6 border-b border-cos-border flex flex-col sm:flex-row gap-4 justify-between items-center bg-black/10">
          <div className="flex gap-2">
            {['all', 'student', 'faculty', 'warden', 'security_staff'].map(f => (
              <button key={f} onClick={() => setRoleFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all border ${roleFilter === f ? 'bg-cos-primary/10 border-cos-primary text-cos-primary' : 'border-white/5 text-cos-text-muted hover:text-white'}`}>
                {f}
              </button>
            ))}
          </div>
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cos-text-muted" />
            <input className="input-field py-2.5 pl-10 text-xs" placeholder="Search identities..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-10 h-10 animate-spin text-cos-primary" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-cos-text-muted">
              <Clock className="w-12 h-12 mb-4 opacity-20" />
              <p className="font-bold text-sm">No pending registrations found</p>
              <p className="text-xs uppercase tracking-widest mt-1">All identities have been processed</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Identity</th>
                    <th>Requested Role</th>
                    <th>Dept / Type</th>
                    <th>Applied On</th>
                    <th>Status</th>
                    <th>Decision</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u: any) => (
                    <tr key={u.id}>
                      <td>
                        <div className="font-bold text-cos-text-primary">{u.name}</div>
                        <div className="text-[10px] text-cos-text-muted lowercase">{u.email}</div>
                      </td>
                      <td>
                        <span className={`badge text-[9px] font-black ${getRoleBadgeColor(u.role)}`}>
                          {formatRoleName(u.role)}
                        </span>
                      </td>
                      <td>
                        <div className="text-xs font-bold text-cos-text-secondary">{u.department_code || u.department_name || 'GENERAL'}</div>
                        <div className="text-[10px] text-cos-text-muted">Roll: {u.roll_number || 'N/A'}</div>
                      </td>
                      <td className="text-cos-text-muted text-[10px]">{formatDateTime(u.created_at)}</td>
                      <td>
                        <span className={`badge text-[9px] font-black ${getStatusColor(u.status)}`}>{u.status}</span>
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <button onClick={() => handleApprove(u.id, 'approved')} className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20" title="Grant Access"><CheckCircle2 className="w-4 h-4" /></button>
                          <button onClick={() => handleApprove(u.id, 'rejected')} className="p-2 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20" title="Deny Access"><XCircle className="w-4 h-4" /></button>
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
    </div>
  );
}
