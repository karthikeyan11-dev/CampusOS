'use client';

import { useEffect, useState, useMemo } from 'react';
import { gatePassAPI } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { formatDateTime, formatDate, formatTime, getStatusColor } from '@/lib/utils';
import { 
  QrCode, Plus, Loader2, X, Send, CheckCircle2, XCircle, 
  ScanLine, Clock, MapPin, History, UserCircle, ChevronRight, 
  Calendar, Info, ShieldCheck, User as UserIcon, Building2, Briefcase
} from 'lucide-react';

export default function FacultyGatePassPage() {
  const { user } = useAuthStore();
  const [passes, setPasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Faculty Toggles: Academic vs Non-Academic
  const [category, setCategory] = useState<'academic' | 'non_academic'>('academic');
  const [statusTab, setStatusTab] = useState('all');

  const [showCreate, setShowCreate] = useState(false);
  const [selectedPass, setSelectedPass] = useState<any>(null);
  const [showAuditId, setShowAuditId] = useState<string | null>(null);

  const [form, setForm] = useState({
    reason: '', leaveDate: '', outTime: '', returnDate: '', returnTime: '',
  });
  const [creating, setCreating] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => { loadPasses(); }, [statusTab, category]);

  const loadPasses = async () => {
    setLoading(true);
    try {
      const params: any = { limit: 50, passType: 'faculty' };
      const res = await gatePassAPI.getAll(params);
      let data = res.data.data || [];
      
      // Filter based on Workflow A (Academic) vs Workflow B (Non-Academic)
      const filtered = data.filter((gp: any) => {
        const isAcademic = gp.department_id !== null;
        const matchesCategory = category === 'academic' ? isAcademic : !isAcademic;
        if (!matchesCategory && statusTab !== 'all') return false;

        if (statusTab === 'all') return true;
        if (statusTab === 'pending_hod') return gp.status === 'waiting' && isAcademic;
        if (statusTab === 'approved') return gp.status === 'approved';
        if (statusTab === 'opened') return gp.status === 'opened' || gp.status === 'yet_to_be_closed';
        if (statusTab === 'closed') return gp.status === 'closed';
        if (statusTab === 'expired') return gp.status === 'expired';
        
        return true;
      });

      setPasses(filtered);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleCreatePass = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await gatePassAPI.facultyRequest(form);
      setShowCreate(false);
      setForm({ reason: '', leaveDate: '', outTime: '', returnDate: '', returnTime: '' });
      loadPasses();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to request gate pass');
    } finally { setCreating(false); }
  };

  const handleApprove = async (id: string, action: string) => {
    setActionLoading(true);
    try {
      await gatePassAPI.facultyApprove(id, action);
      loadPasses();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Approval Failed');
    } finally { setActionLoading(false); }
  };

  const handleViewDetail = async (id: string) => {
    try {
      const res = await gatePassAPI.getById(id);
      setSelectedPass(res.data.data);
    } catch (err) { console.error(err); }
  };

  const isHOD = user?.role === 'department_admin';
  const isAdmin = user?.role === 'super_admin';
  const canApprove = isHOD || isAdmin;

  const tabs = [
    { id: 'all', label: 'All' },
    { id: 'pending_hod', label: 'Pending HOD' },
    { id: 'approved', label: 'Approved' },
    { id: 'opened', label: 'Opened' },
    { id: 'closed', label: 'Closed' },
    { id: 'expired', label: 'Expired' },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <QrCode className="w-6 h-6 text-cos-primary" /> Faculty <span className="gradient-text">Gatepass</span>
          </h2>
          <p className="text-xs text-cos-text-secondary font-bold uppercase tracking-widest mt-1">Personnel Mobility Engine</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary px-5 py-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
          <Plus className="w-4 h-4" /> New Request
        </button>
      </div>

      <div className="flex items-center gap-4 bg-cos-bg-card/50 p-1.5 rounded-2xl border border-cos-border w-fit">
        <button 
          onClick={() => setCategory('academic')}
          className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${category === 'academic' ? 'gradient-bg text-white' : 'text-cos-text-muted'}`}
        >
          <Building2 className="w-3.5 h-3.5" /> Academic Staff
        </button>
        <button 
          onClick={() => setCategory('non_academic')}
          className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${category === 'non_academic' ? 'gradient-bg text-white' : 'text-cos-text-muted'}`}
        >
          <Briefcase className="w-3.5 h-3.5" /> Non-Academic
        </button>
      </div>

      <div className="flex p-1 bg-black/10 rounded-xl border border-white/5 w-fit overflow-x-auto scrollbar-hide">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setStatusTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${statusTab === tab.id ? 'bg-cos-bg-elevated text-cos-primary border border-cos-primary/20' : 'text-cos-text-muted hover:text-cos-text-primary'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-cos-primary" /></div>
      ) : passes.length === 0 ? (
        <div className="glass-card py-24 text-center border-dashed border-2">
          <QrCode className="w-16 h-16 text-cos-text-muted/20 mx-auto mb-4" />
          <p className="text-cos-text-secondary font-medium italic">No faculty records found for this pipeline</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {passes.map((gp: any) => (
            <div key={gp.id} className="glass-card flex flex-col group overflow-hidden border-cos-primary/5">
              <div className="p-5 flex-1 cursor-pointer" onClick={() => handleViewDetail(gp.id)}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center text-white text-sm font-black">
                      {gp.user_name?.charAt(0)}
                    </div>
                    <div>
                      <div className="font-black text-cos-text-primary">{gp.user_name}</div>
                      <div className="text-[10px] font-bold text-cos-text-muted uppercase tracking-widest">
                        {gp.department_code || 'NON-ACADEMIC'} · {gp.user_role?.replace(/_/g, ' ')}
                      </div>
                    </div>
                  </div>
                  <span className={`badge text-[9px] font-black px-2.5 py-1 ${getStatusColor(gp.status)}`}>
                    {gp.status?.replace(/_/g, ' ')}
                  </span>
                </div>

                <div className="p-3 bg-black/20 rounded-xl border border-white/5 mb-4">
                  <p className="text-xs text-cos-text-secondary line-clamp-2">{gp.reason}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4 text-[10px] font-bold text-cos-text-muted uppercase">
                  <div className="flex items-center gap-2"><Clock className="w-3 h-3 text-cos-primary" /> {formatDate(gp.leave_date)} {gp.out_time}</div>
                  {gp.return_date && <div className="flex items-center gap-2"><MapPin className="w-3 h-3 text-emerald-400" /> Return: {formatDate(gp.return_date)}</div>}
                </div>

                <button 
                  onClick={(e) => { e.stopPropagation(); setShowAuditId(showAuditId === gp.id ? null : gp.id); }}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-cos-bg-elevated border border-cos-border text-[10px] font-black uppercase tracking-widest text-cos-text-muted"
                >
                  <History className="w-3.5 h-3.5" /> {showAuditId === gp.id ? 'Hide Trail' : 'View Audit Trail'}
                </button>

                {showAuditId === gp.id && (
                  <div className="mt-4 pt-4 border-t border-cos-border space-y-4 animate-slide-up" onClick={e => e.stopPropagation()}>
                    {gp.timeline?.map((item: any, idx: number) => (
                      <TimelineItem key={idx} action={item.action} actor={item.actor} timestamp={item.timestamp} isLast={idx === gp.timeline.length - 1} />
                    ))}
                  </div>
                )}
              </div>

              <div className="p-4 bg-black/20 border-t border-cos-border flex gap-3">
                 <button className="flex-1 btn-secondary py-2 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
                    <UserCircle className="w-3.5 h-3.5" /> View Profile
                 </button>
                 {canApprove && gp.status !== 'approved' && gp.status !== 'rejected' && (
                    <div className="flex gap-2 flex-[2]">
                      <button onClick={() => handleApprove(gp.id, 'approve')} className="flex-1 btn-primary py-2 text-[10px] font-black uppercase tracking-widest">
                         Approve
                      </button>
                      <button onClick={() => handleApprove(gp.id, 'reject')} className="px-3 rounded-xl border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-all">
                         <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                 )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="glass-card p-8 w-full max-w-lg animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black tracking-tight">Request <span className="gradient-text">Gatepass</span></h3>
              <button onClick={() => setShowCreate(false)}><X className="w-6 h-6 text-cos-text-muted" /></button>
            </div>
            <form onSubmit={handleCreatePass} className="space-y-6">
              <textarea className="input-field min-h-[100px] py-4" value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} required placeholder="Reason for leaving..." />
              <div className="grid grid-cols-2 gap-6">
                <input type="date" className="input-field" value={form.leaveDate} onChange={e => setForm(p => ({ ...p, leaveDate: e.target.value }))} required />
                <input type="time" className="input-field" value={form.outTime} onChange={e => setForm(p => ({ ...p, outTime: e.target.value }))} required />
                <input type="date" className="input-field" value={form.returnDate} onChange={e => setForm(p => ({ ...p, returnDate: e.target.value }))} />
                <input type="time" className="input-field" value={form.returnTime} onChange={e => setForm(p => ({ ...p, returnTime: e.target.value }))} />
              </div>
              <button type="submit" disabled={creating} className="btn-primary w-full py-4 text-xs font-black uppercase tracking-widest">
                {creating ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : 'Submit Request'}
              </button>
            </form>
          </div>
        </div>
      )}

      {selectedPass && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 modal-overlay" onClick={() => setSelectedPass(null)}>
          <div className="glass-card p-8 w-full max-w-xl max-h-[90vh] overflow-y-auto scrollbar-hide" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-8">
              <div className="flex gap-4 items-center">
                <div className="w-14 h-14 rounded-2xl gradient-bg flex items-center justify-center text-white text-2xl font-black">
                  {selectedPass.user_name?.charAt(0)}
                </div>
                <h3 className="text-xl font-black tracking-tight">{selectedPass.user_name}</h3>
              </div>
              <button onClick={() => setSelectedPass(null)}><X className="w-6 h-6 text-cos-text-muted" /></button>
            </div>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                 <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                    <p className="text-[9px] font-black uppercase text-cos-text-muted mb-1">Reason</p>
                    <p className="text-sm font-bold">{selectedPass.reason}</p>
                 </div>
                 <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                    <p className="text-[9px] font-black uppercase text-cos-text-muted mb-1">Status</p>
                    <p className={`text-sm font-black uppercase ${getStatusColor(selectedPass.status).split(' ')[1]}`}>{selectedPass.status}</p>
                 </div>
              </div>
              {selectedPass.timeline && (
                <div className="p-6 bg-cos-bg-elevated rounded-2xl border border-cos-border">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-cos-text-muted mb-6">Audit Lifecycle</h4>
                  <div className="space-y-5">
                    {selectedPass.timeline.map((item: any, idx: number) => (
                      <TimelineItem key={idx} action={item.action} actor={item.actor} timestamp={item.timestamp} isLast={idx === selectedPass.timeline.length - 1} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TimelineItem({ action, actor, timestamp, isLast }: any) {
  return (
    <div className="flex gap-4 relative">
      {!isLast && <div className="absolute left-[11px] top-[24px] bottom-[-20px] w-0.5 bg-cos-primary/10" />}
      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10 ${isLast ? 'gradient-bg' : 'bg-cos-bg-elevated border border-cos-border'}`}>
        <div className={`w-1.5 h-1.5 rounded-full ${isLast ? 'bg-white' : 'bg-cos-text-muted'}`} />
      </div>
      <div className="flex-1 pb-4">
        <div className="flex items-center justify-between gap-4">
          <span className={`text-[11px] font-black uppercase tracking-widest ${isLast ? 'text-cos-primary' : 'text-cos-text-primary'}`}>{action}</span>
          <span className="text-[9px] font-bold text-cos-text-muted">{formatDateTime(timestamp)}</span>
        </div>
        <div className="text-[10px] text-cos-text-secondary mt-0.5 flex items-center gap-1.5 font-medium italic">
          <UserIcon className="w-2.5 h-2.5" /> {actor || 'System'}
        </div>
      </div>
    </div>
  );
}
