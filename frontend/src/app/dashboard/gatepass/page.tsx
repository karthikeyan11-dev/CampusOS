'use client';

import { useEffect, useState, useMemo } from 'react';
import { gatePassAPI } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { formatDateTime, formatDate, formatTime, getStatusColor } from '@/lib/utils';
import { 
  QrCode, Plus, Loader2, X, Send, CheckCircle2, XCircle, 
  ScanLine, Clock, MapPin, History, UserCircle, ChevronRight, 
  Calendar, Info, ShieldCheck, User as UserIcon
} from 'lucide-react';

export default function GatePassPage() {
  const { user } = useAuthStore();
  const [passes, setPasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 1. Segmented UI Architecture
  const [category, setCategory] = useState<'day_scholar' | 'hosteller'>('day_scholar');
  const [statusTab, setStatusTab] = useState('all');

  const [showCreate, setShowCreate] = useState(false);
  const [showScan, setShowScan] = useState(false);
  const [selectedPass, setSelectedPass] = useState<any>(null);
  const [showAuditId, setShowAuditId] = useState<string | null>(null);

  const [form, setForm] = useState({
    reason: '', leaveDate: '', outTime: '', returnDate: '', returnTime: '',
  });
  const [creating, setCreating] = useState(false);
  const [scanToken, setScanToken] = useState('');
  const [scanResult, setScanResult] = useState<any>(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => { loadPasses(); }, [statusTab, category]);

  const loadPasses = async () => {
    setLoading(true);
    try {
      const params: any = { limit: 50 };
      
      // State Machine Mapping
      let mappedStatus = statusTab;
      if (statusTab === 'pending_warden') mappedStatus = 'hod_approved';
      else if (statusTab === 'pending_faculty') mappedStatus = 'pending_faculty';
      else if (statusTab === 'pending_hod') mappedStatus = 'mentor_approved';
      else if (statusTab === 'approved') {
         // This is complex because backend 'approved' is final, but 'hod_approved' can be 'pending_warden' for hosteller
      }

      const res = await gatePassAPI.getAll(params);
      let data = res.data.data || [];
      
      // Frontend Filtering for strict category/status UI mapping
      const filtered = data.filter((gp: any) => {
        const isCorrectCategory = gp.residence_type === category;
        if (!isCorrectCategory && statusTab !== 'all') return false;

        if (statusTab === 'all') return true;
        if (statusTab === 'pending_faculty') return gp.status === 'pending_faculty';
        if (statusTab === 'pending_hod') return gp.status === 'mentor_approved';
        if (statusTab === 'pending_warden') return gp.status === 'hod_approved' && gp.residence_type === 'hosteller';
        
        if (statusTab === 'approved') {
          if (category === 'day_scholar') return gp.status === 'hod_approved' || gp.status === 'approved';
          return gp.status === 'warden_approved' || gp.status === 'approved';
        }
        
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
      await gatePassAPI.request(form);
      setShowCreate(false);
      setForm({ reason: '', leaveDate: '', outTime: '', returnDate: '', returnTime: '' });
      loadPasses();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to request gate pass');
    } finally { setCreating(false); }
  };

  const handleApprove = async (id: string, action: string) => {
    try {
      const res = await gatePassAPI.approve(id, action);
      if (action === 'approve' && res.data.data?.qrDataUrl) {
        setSelectedPass({ ...selectedPass, qrDataUrl: res.data.data.qrDataUrl, status: 'approved' });
      }
      loadPasses();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed');
    }
  };

  const handleScan = async () => {
    setScanLoading(true);
    try {
      const res = await gatePassAPI.scan(scanToken);
      setScanResult(res.data);
    } catch (err: any) {
      setScanResult({ success: false, message: err.response?.data?.message || 'Scan failed' });
    } finally {
      setScanLoading(false);
    }
  };

  const handleOpen = async (passId: string) => {
    setActionLoading(true);
    try {
      await gatePassAPI.open(passId);
      handleScan(); 
      loadPasses();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to open gate');
    } finally {
      setActionLoading(false);
    }
  };

  const handleClose = async (passId: string) => {
    setActionLoading(true);
    try {
      await gatePassAPI.close(passId);
      handleScan();
      loadPasses();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to close gate');
    } finally {
      setActionLoading(false);
    }
  };

  const handleViewDetail = async (id: string) => {
    try {
      const res = await gatePassAPI.getById(id);
      setSelectedPass(res.data.data);
    } catch (err) { console.error(err); }
  };

  const canRequest = ['student', 'faculty', 'department_admin'].includes(user?.role || '');
  const canApprove = ['faculty', 'department_admin', 'warden', 'deputy_warden', 'super_admin'].includes(user?.role || '');
  const canScan = user?.role === 'security_staff' || user?.role === 'super_admin';

  // 2. Dynamic Tabs based on Category
  const tabs = useMemo(() => {
    const common = [
      { id: 'all', label: 'All' },
      { id: 'pending_faculty', label: 'Pending Faculty' },
      { id: 'pending_hod', label: 'Pending HOD' }
    ];
    const wardenTab = category === 'hosteller' ? [{ id: 'pending_warden', label: 'Pending Warden' }] : [];
    const statusTabs = [
      { id: 'approved', label: 'Approved' },
      { id: 'opened', label: 'Opened' },
      { id: 'closed', label: 'Closed' },
      { id: 'expired', label: 'Expired' }
    ];
    return [...common, ...wardenTab, ...statusTabs];
  }, [category]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <QrCode className="w-6 h-6 text-cos-primary" /> Gate <span className="gradient-text">Pass</span>
          </h2>
          <p className="text-xs text-cos-text-secondary font-bold uppercase tracking-widest mt-1">Campus Mobility Management System</p>
        </div>
        <div className="flex gap-2">
          {canScan && (
            <button onClick={() => setShowScan(true)} className="btn-secondary px-5 py-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
              <ScanLine className="w-4 h-4" /> Scan Node
            </button>
          )}
          {canRequest && (
            <button onClick={() => setShowCreate(true)} className="btn-primary px-5 py-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
              <Plus className="w-4 h-4" /> New Request
            </button>
          )}
        </div>
      </div>

      {/* Category Toggle (High-level Selector) */}
      <div className="flex items-center gap-4 bg-cos-bg-card/50 p-1.5 rounded-2xl border border-cos-border w-fit">
        <button 
          onClick={() => setCategory('day_scholar')}
          className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${category === 'day_scholar' ? 'gradient-bg text-white shadow-lg shadow-orange-500/20' : 'text-cos-text-muted hover:text-cos-text-primary'}`}
        >
          Day Scholar
        </button>
        <button 
          onClick={() => setCategory('hosteller')}
          className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${category === 'hosteller' ? 'gradient-bg text-white shadow-lg shadow-orange-500/20' : 'text-cos-text-muted hover:text-cos-text-primary'}`}
        >
          Hosteller
        </button>
      </div>

      {/* Navigation Tabs (Dynamic) */}
      <div className="flex p-1 bg-black/10 rounded-xl border border-white/5 w-fit overflow-x-auto scrollbar-hide">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setStatusTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all whitespace-nowrap ${statusTab === tab.id ? 'bg-cos-bg-elevated text-cos-primary shadow-sm border border-cos-primary/20' : 'text-cos-text-muted hover:text-cos-text-primary'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-cos-primary" /></div>
      ) : passes.length === 0 ? (
        <div className="glass-card py-24 text-center border-dashed border-2">
          <QrCode className="w-16 h-16 text-cos-text-muted/20 mx-auto mb-4" />
          <p className="text-cos-text-secondary font-medium italic">No associations found for this pipeline</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {passes.map((gp: any) => (
            <div key={gp.id} className="glass-card glass-card-hover flex flex-col group overflow-hidden border-cos-primary/5">
              {/* Header Info */}
              <div className="p-5 flex-1 cursor-pointer" onClick={() => handleViewDetail(gp.id)}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center text-white text-sm font-black shadow-lg shadow-orange-500/10">
                      {gp.user_name?.charAt(0)}
                    </div>
                    <div>
                      <div className="font-black text-cos-text-primary">{gp.user_name}</div>
                      <div className="text-[10px] font-bold text-cos-text-muted uppercase tracking-widest">
                        {gp.roll_number} · {gp.department_code || gp.department_name}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <span className={`badge text-[9px] font-black px-2.5 py-1 ${getStatusColor(gp.status)}`}>
                      {gp.status?.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[9px] font-black text-cos-text-muted/60 uppercase tracking-tighter">
                      {gp.residence_type === 'hosteller' ? 'Residential Module' : 'Open Transit'}
                    </span>
                  </div>
                </div>

                <div className="space-y-3 mb-4">
                  <div className="p-3 bg-black/20 rounded-xl border border-white/5">
                     <p className="text-xs text-cos-text-secondary leading-relaxed line-clamp-2">{gp.reason}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-cos-text-muted uppercase">
                      <Clock className="w-3 h-3 text-cos-primary" />
                      {formatDate(gp.leave_date)} {gp.out_time}
                    </div>
                    {gp.return_date && (
                      <div className="flex items-center gap-2 text-[10px] font-bold text-cos-text-muted uppercase">
                        <MapPin className="w-3 h-3 text-emerald-400" />
                        Return: {formatDate(gp.return_date)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Audit Lifecycle Toggle */}
                <button 
                  onClick={(e) => { e.stopPropagation(); setShowAuditId(showAuditId === gp.id ? null : gp.id); }}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-cos-bg-elevated border border-cos-border text-[10px] font-black uppercase tracking-widest text-cos-text-muted hover:text-cos-primary transition-all group-hover:border-cos-primary/20"
                >
                  <History className="w-3.5 h-3.5" /> {showAuditId === gp.id ? 'Hide Trail' : 'View Audit Trail'}
                </button>

                {/* Audit Trail Drawer (Real-time Timeline) */}
                {showAuditId === gp.id && (
                  <div className="mt-4 pt-4 border-t border-cos-border space-y-4 animate-slide-up" onClick={e => e.stopPropagation()}>
                    {/* Submission */}
                    <TimelineItem action="Request Sent" actor={gp.user_name} timestamp={gp.created_at} isLast={!gp.faculty_approved_at} />
                    {gp.faculty_approved_at && (
                      <TimelineItem action="Faculty Approved" actor={gp.faculty_approver_name} timestamp={gp.faculty_approved_at} isLast={!gp.hod_approved_at} />
                    )}
                    {gp.hod_approved_at && (
                      <TimelineItem action="HOD Approved" actor={gp.hod_approver_name} timestamp={gp.hod_approved_at} isLast={!gp.warden_approved_at && !gp.exit_scanned_at} />
                    )}
                    {gp.warden_approved_at && (
                      <TimelineItem action="Warden Approved" actor={gp.warden_approver_name} timestamp={gp.warden_approved_at} isLast={!gp.exit_scanned_at} />
                    )}
                    {gp.exit_scanned_at && (
                      <TimelineItem action="Gate Exit Scanned" actor={gp.exit_scanned_by_name || 'Security'} timestamp={gp.exit_scanned_at} isLast={!gp.return_scanned_at} />
                    )}
                    {gp.return_scanned_at && (
                       <TimelineItem action="Entry Return Scanned" actor={gp.return_scanned_by_name || 'Security'} timestamp={gp.return_scanned_at} isLast={true} />
                    )}
                  </div>
                )}
              </div>

              {/* Action Footer */}
              <div className="p-4 bg-black/20 border-t border-cos-border flex gap-3">
                 <button className="flex-1 btn-secondary py-2 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 group/btn">
                    <UserCircle className="w-3.5 h-3.5 group-hover/btn:text-cos-primary" /> View Profile
                 </button>
                 {canApprove && (
                   (statusTab === 'pending_faculty' && gp.status === 'pending_faculty') ||
                   (statusTab === 'pending_hod' && gp.status === 'mentor_approved') ||
                   (statusTab === 'pending_warden' && gp.status === 'hod_approved')
                 ) && (
                   <div className="flex gap-2 flex-[2]">
                    <button onClick={() => handleApprove(gp.id, 'approve')} className="flex-1 btn-primary py-2 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
                       <CheckCircle2 className="w-3.5 h-3.5" /> Approve
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

      {/* Modals are unchanged but updated for aesthetics */}
      {showCreate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="glass-card p-8 w-full max-w-lg scrollbar-hide overflow-y-auto max-h-[90vh] animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-black tracking-tight">Request <span className="gradient-text">Exit Token</span></h3>
                <p className="text-[10px] font-bold text-cos-text-muted uppercase tracking-widest mt-1">Official Gate Authorization</p>
              </div>
              <button onClick={() => setShowCreate(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors"><X className="w-6 h-6 text-cos-text-muted" /></button>
            </div>
            <form onSubmit={handleCreatePass} className="space-y-6">
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-cos-text-muted ml-1">
                  <Info className="w-3 h-3 text-cos-primary" /> Departure Reason
                </label>
                <textarea className="input-field min-h-[100px] resize-none py-4" value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} required placeholder="State your purpose for leaving campus..." />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-cos-text-muted ml-1">Out Date</label>
                  <input type="date" className="input-field" value={form.leaveDate} onChange={e => setForm(p => ({ ...p, leaveDate: e.target.value }))} required />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-cos-text-muted ml-1">Departure Time</label>
                  <input type="time" className="input-field" value={form.outTime} onChange={e => setForm(p => ({ ...p, outTime: e.target.value }))} required />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-cos-text-muted ml-1">Return Date</label>
                  <input type="date" className="input-field" value={form.returnDate} onChange={e => setForm(p => ({ ...p, returnDate: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-cos-text-muted ml-1">Est. Return Time</label>
                  <input type="time" className="input-field" value={form.returnTime} onChange={e => setForm(p => ({ ...p, returnTime: e.target.value }))} />
                </div>
              </div>
              <button type="submit" disabled={creating} className="btn-primary w-full py-4 text-xs font-black uppercase tracking-[0.3em] flex items-center justify-center gap-3">
                {creating ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Send className="w-4 h-4" /> Finalize Submission</>}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Security Scanner Dashboard */}
      {showScan && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 modal-overlay" onClick={() => { setShowScan(false); setScanResult(null); }}>
          <div className="glass-card p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-fade-in scrollbar-hide" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black tracking-tight flex items-center gap-3">
                <ShieldCheck className="w-6 h-6 text-emerald-400" /> Security <span className="text-emerald-400">Node</span> Dashboard
              </h3>
              <button onClick={() => { setShowScan(false); setScanResult(null); }}><X className="w-6 h-6 text-cos-text-muted hover:text-white transition-colors" /></button>
            </div>

            <div className="space-y-8">
              <div className="flex gap-4">
                <div className="relative flex-1 group">
                   <div className="absolute inset-0 bg-cos-primary/20 blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
                    <textarea 
                      className="input-field relative flex-1 min-h-[60px] resize-none text-xs font-mono py-4 px-5 border-emerald-500/20 focus:border-emerald-500/50" 
                      value={scanToken} 
                      onChange={e => setScanToken(e.target.value)} 
                      placeholder="Input cryptographic QR sequence..." 
                    />
                </div>
                <button 
                  onClick={handleScan} 
                  disabled={scanLoading || !scanToken}
                  className="btn-primary px-8 flex items-center gap-3 font-black text-[10px] uppercase tracking-widest shadow-lg shadow-orange-500/20"
                >
                  {scanLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ScanLine className="w-4 h-4" />}
                  Synchronize
                </button>
              </div>

              {scanResult && scanResult.success && scanResult.data && (
                <div className="space-y-8 animate-fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-6 rounded-2xl bg-cos-bg-card border border-cos-border flex gap-5 relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-1 bg-emerald-500/10 text-emerald-400">
                         <Info className="w-3 h-3" />
                      </div>
                      <div className="w-24 h-24 rounded-2xl gradient-bg flex items-center justify-center text-white text-3xl font-black shadow-xl group-hover:scale-105 transition-transform duration-500">
                        {scanResult.data.student.avatar ? <img src={scanResult.data.student.avatar} className="w-full h-full object-cover rounded-2xl" /> : scanResult.data.student.name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <h4 className="text-[10px] font-black text-cos-text-muted uppercase tracking-widest mb-3">Identity Node</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs">
                            <span className="text-cos-text-secondary font-bold">Label</span>
                            <span className="font-bold text-white truncate max-w-[100px]">{scanResult.data.student.name}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-cos-text-secondary font-bold">R-ID</span>
                            <span className="font-mono text-cos-primary">{scanResult.data.student.rollNumber}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-cos-text-secondary font-bold">Category</span>
                            <span className="text-emerald-400 font-black uppercase text-[9px] tracking-tighter">{scanResult.data.student.residenceType}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 rounded-2xl bg-cos-bg-card border border-cos-border">
                      <h4 className="text-[10px] font-black text-cos-text-muted uppercase tracking-widest mb-4">Escalation Contacts</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between text-xs">
                           <span className="text-cos-text-secondary">Mentor Node</span>
                           <span className="font-bold text-white">{scanResult.data.contacts.mentor.name || 'N/A'}</span>
                        </div>
                        <div className="flex justify-between text-xs items-center">
                           <span className="text-cos-text-secondary">Emergency COMMS</span>
                           <span className="flex items-center gap-1.5 font-bold text-emerald-400 text-[10px]">
                              <Plus className="w-3 h-3" /> {scanResult.data.contacts.parents.father || scanResult.data.contacts.parents.mother || 'N/A'}
                           </span>
                        </div>
                        <div className="flex justify-between text-xs">
                           <span className="text-cos-text-secondary">Institutional HOD</span>
                           <span className="text-white font-bold">{scanResult.data.contacts.hod.phone || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ACTION SECTION */}
                  <div className="pt-4">
                    {scanResult.data.pass.scanStatus === 'EXPIRED' ? (
                      <div className="w-full p-6 bg-red-500/10 border border-red-500/20 rounded-2xl text-center">
                         <XCircle className="w-10 h-10 text-red-500 mx-auto mb-3" />
                         <span className="text-sm font-black text-red-400 uppercase tracking-[0.2em]">Session Expired / Token Invalid</span>
                      </div>
                    ) : scanResult.data.pass.scanStatus === 'EARLY' ? (
                      <div className="w-full p-6 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-center">
                         <Clock className="w-10 h-10 text-amber-500 mx-auto mb-3" />
                         <span className="text-sm font-black text-amber-400 uppercase tracking-[0.2em]">Invalid Temporal Window (Early)</span>
                      </div>
                    ) : scanResult.data.pass.status === 'approved' ? (
                      <button 
                        onClick={() => handleOpen(scanResult.data.pass.id)}
                        disabled={actionLoading}
                        className="w-full p-6 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase tracking-[0.3em] text-sm flex items-center justify-center gap-4 transition-all shadow-2xl shadow-emerald-500/20"
                      >
                        {actionLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <><CheckCircle2 className="w-6 h-6" /> De-Authorize & Open Gate</>}
                      </button>
                    ) : (scanResult.data.pass.status === 'opened' || scanResult.data.pass.status === 'yet_to_be_closed') && scanResult.data.pass.isHosteller ? (
                      <button 
                        onClick={() => handleClose(scanResult.data.pass.id)}
                        disabled={actionLoading}
                        className="w-full p-6 rounded-2xl bg-cos-primary hover:bg-cos-primary/80 text-white font-black uppercase tracking-[0.3em] text-sm flex items-center justify-center gap-4 transition-all shadow-2xl shadow-orange-500/20"
                      >
                        {actionLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <><MapPin className="w-6 h-6" /> Record Return & Secure Pass</>}
                      </button>
                    ) : (
                      <div className="p-8 text-center text-cos-text-muted/40 font-bold uppercase tracking-widest text-[10px] border-2 border-dashed border-cos-border rounded-2xl">
                        Operational State Terminal: {scanResult.data.pass.status}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal (Enhanced with Lifecycle) */}
      {selectedPass && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 modal-overlay" onClick={() => setSelectedPass(null)}>
          <div className="glass-card p-8 w-full max-w-xl animate-scale-in max-h-[90vh] overflow-y-auto scrollbar-hide" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-8">
              <div className="flex gap-4 items-center">
                <div className="w-14 h-14 rounded-2xl gradient-bg flex items-center justify-center text-white text-2xl font-black">
                  {selectedPass.user_name?.charAt(0)}
                </div>
                <div>
                  <h3 className="text-xl font-black tracking-tight">{selectedPass.user_name}</h3>
                  <div className="flex gap-2 items-center mt-1">
                    <span className={`badge text-[9px] font-black uppercase tracking-widest px-3 py-1 ${getStatusColor(selectedPass.status)}`}>
                      {selectedPass.status?.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[9px] font-bold text-cos-text-muted uppercase tracking-tighter">
                      {selectedPass.residence_type} Segment
                    </span>
                  </div>
                </div>
              </div>
              <button onClick={() => setSelectedPass(null)}><X className="w-6 h-6 text-cos-text-muted" /></button>
            </div>

            <div className="space-y-8">
              <div className="glass-card p-6 border-white/5">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-cos-text-muted mb-4 border-b border-white/5 pb-2">Operational Context</h4>
                <div className="grid grid-cols-2 gap-y-6">
                   <DetailItem label="Transit Reason" value={selectedPass.reason} full />
                   <DetailItem label="Leave Sequence" value={`${formatDate(selectedPass.leave_date)} · ${selectedPass.out_time}`} />
                   <DetailItem label="Return Target" value={selectedPass.return_date ? `${formatDate(selectedPass.return_date)} · ${selectedPass.return_time}` : 'Not Defined'} />
                   <DetailItem label="Department Node" value={selectedPass.department_name} />
                   <DetailItem label="In-Roll ID" value={selectedPass.roll_number} />
                </div>
              </div>

              {selectedPass.timeline && (
                <div className="glass-card p-6 border-cos-primary/10">
                   <h4 className="text-[10px] font-black uppercase tracking-widest text-cos-text-muted mb-6 flex items-center gap-2">
                     <History className="w-3" /> Audit Lifecycle Visualization
                   </h4>
                   <div className="space-y-5">
                      {selectedPass.timeline.map((item: any, idx: number) => (
                        <TimelineItem 
                          key={idx} 
                          action={item.action} 
                          actor={item.actor} 
                          timestamp={item.timestamp} 
                          remarks={item.remarks}
                          isLast={idx === selectedPass.timeline.length - 1} 
                        />
                      ))}
                   </div>
                </div>
              )}

              {selectedPass.qrDataUrl && (
                <div className="mt-8 text-center p-6 bg-white/5 rounded-2xl border border-white/5">
                  <img src={selectedPass.qrDataUrl} alt="Gate Pass QR" className="mx-auto rounded-2xl border-4 border-white shadow-2xl" style={{ maxWidth: 180 }} />
                  <p className="text-[10px] font-black text-cos-text-muted mt-4 uppercase tracking-[0.2em]">Cryptographic Authorization Sequence</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TimelineItem({ action, actor, timestamp, remarks, isLast }: any) {
  return (
    <div className="flex gap-4 relative">
      {!isLast && <div className="absolute left-[11px] top-[24px] bottom-[-20px] w-0.5 bg-cos-primary/10" />}
      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10 transition-colors ${isLast ? 'gradient-bg shadow-sm' : 'bg-cos-bg-elevated border border-cos-border'}`}>
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
        {remarks && (
          <p className="mt-2 text-[10px] p-2 bg-black/20 rounded-lg border border-white/5 text-cos-text-muted leading-relaxed">
            "{remarks}"
          </p>
        )}
      </div>
    </div>
  );
}

function DetailItem({ label, value, full }: any) {
  return (
    <div className={full ? 'col-span-2' : ''}>
      <div className="text-[9px] font-black text-cos-text-muted uppercase tracking-widest mb-1.5">{label}</div>
      <div className="text-xs font-bold text-cos-text-primary pr-4">{value || 'N/A'}</div>
    </div>
  );
}
