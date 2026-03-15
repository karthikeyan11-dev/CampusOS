'use client';

import { useEffect, useState } from 'react';
import { gatePassAPI } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { formatDateTime, formatDate, formatTime, getStatusColor } from '@/lib/utils';
import { QrCode, Plus, Loader2, X, Send, CheckCircle2, XCircle, ScanLine, Clock, MapPin } from 'lucide-react';

export default function GatePassPage() {
  const { user } = useAuthStore();
  const [passes, setPasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showScan, setShowScan] = useState(false);
  const [selectedPass, setSelectedPass] = useState<any>(null);
  const [filter, setFilter] = useState('');

  const [form, setForm] = useState({
    reason: '', leaveDate: '', outTime: '', returnDate: '', returnTime: '',
  });
  const [creating, setCreating] = useState(false);
  const [scanToken, setScanToken] = useState('');
  const [scanType, setScanType] = useState<'exit' | 'return'>('exit');
  const [scanResult, setScanResult] = useState<any>(null);

  useEffect(() => { loadPasses(); }, [filter]);

  const loadPasses = async () => {
    setLoading(true);
    try {
      const params: any = { limit: 50 };
      if (filter) params.status = filter;
      const res = await gatePassAPI.getAll(params);
      setPasses(res.data.data || []);
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
    try {
      const res = await gatePassAPI.scan(scanToken, scanType);
      setScanResult(res.data);
    } catch (err: any) {
      setScanResult({ success: false, message: err.response?.data?.message || 'Scan failed' });
    }
  };

  const handleViewDetail = async (id: string) => {
    try {
      const res = await gatePassAPI.getById(id);
      setSelectedPass(res.data.data);
    } catch (err) { console.error(err); }
  };

  const canRequest = ['student', 'faculty', 'department_admin'].includes(user?.role || '');
  const canApprove = ['faculty', 'department_admin', 'super_admin'].includes(user?.role || '');
  const canScan = user?.role === 'security_staff' || user?.role === 'super_admin';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <QrCode className="w-5 h-5 text-rose-400" /> Gate Pass
          </h2>
          <p className="text-sm text-cos-text-secondary mt-1">Digital gate pass with QR verification</p>
        </div>
        <div className="flex gap-2">
          {canScan && (
            <button onClick={() => setShowScan(true)} className="btn-secondary flex items-center gap-2 text-sm">
              <ScanLine className="w-4 h-4" /> Scan QR
            </button>
          )}
          {canRequest && (
            <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2 text-sm">
              <Plus className="w-4 h-4" /> Request Pass
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {['', 'pending_faculty', 'pending_hod', 'approved', 'active', 'completed', 'expired'].map(s => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs transition-all ${filter === s ? 'gradient-bg text-white' : 'bg-cos-bg-card border border-cos-border text-cos-text-secondary'}`}>
            {s === '' ? 'All' : s.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-cos-primary" /></div>
      ) : passes.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <QrCode className="w-12 h-12 text-cos-text-muted mx-auto mb-3" />
          <p className="text-cos-text-secondary">No gate passes found</p>
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {passes.map((gp: any) => (
            <div key={gp.id} className="glass-card glass-card-hover p-5 cursor-pointer" onClick={() => handleViewDetail(gp.id)}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="font-semibold">{gp.user_name || 'Gate Pass'}</div>
                  <div className="text-xs text-cos-text-muted">{gp.roll_number && `${gp.roll_number} · `}{gp.department_name || ''}</div>
                </div>
                <span className={`badge text-[10px] ${getStatusColor(gp.status)}`}>{gp.status?.replace(/_/g, ' ')}</span>
              </div>
              <p className="text-sm text-cos-text-secondary mb-3 line-clamp-2">{gp.reason}</p>
              <div className="flex items-center gap-4 text-xs text-cos-text-muted">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatDate(gp.leave_date)} {gp.out_time}</span>
                {gp.return_date && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> Return: {formatDate(gp.return_date)} {gp.return_time}</span>}
              </div>

              {/* Approval Actions */}
              {canApprove && ['pending_faculty', 'pending_hod', 'pending_super_admin'].includes(gp.status) && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-cos-border" onClick={e => e.stopPropagation()}>
                  <button onClick={() => handleApprove(gp.id, 'approve')} className="flex-1 btn-primary text-xs py-2 flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                  </button>
                  <button onClick={() => handleApprove(gp.id, 'reject')} className="flex-1 btn-secondary text-xs py-2 flex items-center justify-center gap-1 text-red-400 hover:bg-red-500/10">
                    <XCircle className="w-3.5 h-3.5" /> Reject
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="glass-card p-6 w-full max-w-lg animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Request Gate Pass</h3>
              <button onClick={() => setShowCreate(false)}><X className="w-5 h-5 text-cos-text-muted" /></button>
            </div>
            <form onSubmit={handleCreatePass} className="space-y-4">
              <div>
                <label className="block text-sm text-cos-text-secondary mb-1.5">Reason</label>
                <textarea className="input-field min-h-[80px] resize-none" value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))} required placeholder="Reason for leaving campus..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-cos-text-secondary mb-1.5">Leave Date</label>
                  <input type="date" className="input-field" value={form.leaveDate} onChange={e => setForm(p => ({ ...p, leaveDate: e.target.value }))} required />
                </div>
                <div>
                  <label className="block text-sm text-cos-text-secondary mb-1.5">Out Time</label>
                  <input type="time" className="input-field" value={form.outTime} onChange={e => setForm(p => ({ ...p, outTime: e.target.value }))} required />
                </div>
                <div>
                  <label className="block text-sm text-cos-text-secondary mb-1.5">Return Date</label>
                  <input type="date" className="input-field" value={form.returnDate} onChange={e => setForm(p => ({ ...p, returnDate: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-sm text-cos-text-secondary mb-1.5">Return Time</label>
                  <input type="time" className="input-field" value={form.returnTime} onChange={e => setForm(p => ({ ...p, returnTime: e.target.value }))} />
                </div>
              </div>
              <button type="submit" disabled={creating} className="btn-primary w-full flex items-center justify-center gap-2">
                {creating ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-4 h-4" /> Submit Request</>}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Scanner Modal */}
      {showScan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay" onClick={() => { setShowScan(false); setScanResult(null); }}>
          <div className="glass-card p-6 w-full max-w-md animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Scan Gate Pass QR</h3>
              <button onClick={() => { setShowScan(false); setScanResult(null); }}><X className="w-5 h-5 text-cos-text-muted" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-cos-text-secondary mb-1.5">QR Token</label>
                <textarea className="input-field min-h-[80px] resize-none text-xs font-mono" value={scanToken} onChange={e => setScanToken(e.target.value)} placeholder="Paste QR code content..." />
              </div>
              <div className="flex gap-2">
                <button onClick={() => setScanType('exit')} className={`flex-1 py-2 rounded-lg text-sm border transition-all ${scanType === 'exit' ? 'border-cos-primary bg-cos-primary/10 text-cos-primary' : 'border-cos-border text-cos-text-secondary'}`}>
                  Exit Scan
                </button>
                <button onClick={() => setScanType('return')} className={`flex-1 py-2 rounded-lg text-sm border transition-all ${scanType === 'return' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : 'border-cos-border text-cos-text-secondary'}`}>
                  Return Scan
                </button>
              </div>
              <button onClick={handleScan} className="btn-primary w-full flex items-center justify-center gap-2">
                <ScanLine className="w-4 h-4" /> Verify & Scan
              </button>
              {scanResult && (
                <div className={`p-4 rounded-lg ${scanResult.success ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                  <div className={`font-medium text-sm mb-2 ${scanResult.success ? 'text-emerald-400' : 'text-red-400'}`}>
                    {scanResult.success ? '✅ ' : '❌ '}{scanResult.message}
                  </div>
                  {scanResult.data && (
                    <div className="text-xs space-y-1 text-cos-text-secondary">
                      <p><strong>Name:</strong> {scanResult.data.studentName}</p>
                      <p><strong>Department:</strong> {scanResult.data.department}</p>
                      {scanResult.data.reason && <p><strong>Reason:</strong> {scanResult.data.reason}</p>}
                      {scanResult.data.returnTime && <p><strong>Return:</strong> {scanResult.data.returnTime}</p>}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedPass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay" onClick={() => setSelectedPass(null)}>
          <div className="glass-card p-6 w-full max-w-lg animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <span className={`badge text-xs ${getStatusColor(selectedPass.status)}`}>{selectedPass.status?.replace(/_/g, ' ')}</span>
              <button onClick={() => setSelectedPass(null)}><X className="w-5 h-5 text-cos-text-muted" /></button>
            </div>
            <h3 className="text-lg font-bold mb-1">{selectedPass.user_name}</h3>
            <p className="text-xs text-cos-text-muted mb-4">{selectedPass.roll_number && `${selectedPass.roll_number} · `}{selectedPass.department_name}</p>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-cos-text-muted">Reason</span><span>{selectedPass.reason}</span></div>
              <div className="flex justify-between"><span className="text-cos-text-muted">Leave Date</span><span>{formatDate(selectedPass.leave_date)}</span></div>
              <div className="flex justify-between"><span className="text-cos-text-muted">Out Time</span><span>{selectedPass.out_time}</span></div>
              {selectedPass.return_date && <div className="flex justify-between"><span className="text-cos-text-muted">Return</span><span>{formatDate(selectedPass.return_date)} {selectedPass.return_time}</span></div>}
              {selectedPass.faculty_approver_name && <div className="flex justify-between"><span className="text-cos-text-muted">Faculty</span><span className="text-emerald-400">✓ {selectedPass.faculty_approver_name}</span></div>}
              {selectedPass.hod_approver_name && <div className="flex justify-between"><span className="text-cos-text-muted">HOD</span><span className="text-emerald-400">✓ {selectedPass.hod_approver_name}</span></div>}
            </div>
            {selectedPass.qrDataUrl && (
              <div className="mt-6 text-center">
                <img src={selectedPass.qrDataUrl} alt="Gate Pass QR" className="mx-auto rounded-lg" style={{ maxWidth: 200 }} />
                <p className="text-xs text-cos-text-muted mt-2">Show this QR at the gate</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
