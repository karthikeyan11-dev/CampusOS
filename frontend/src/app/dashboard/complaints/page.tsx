'use client';

import { useEffect, useState } from 'react';
import { complaintAPI } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { formatDateTime, getStatusColor, getPriorityColor } from '@/lib/utils';
import { MessageSquareWarning, Plus, Loader2, X, Send, AlertTriangle, Shield, Eye, Sparkles, Filter } from 'lucide-react';

export default function ComplaintsPage() {
  const { user } = useAuthStore();
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<any>(null);
  const [filter, setFilter] = useState({ status: '', category: '' });

  const [form, setForm] = useState({ title: '', description: '', isAnonymous: false, category: '' });
  const [creating, setCreating] = useState(false);

  useEffect(() => { loadComplaints(); }, [filter]);

  const loadComplaints = async () => {
    setLoading(true);
    try {
      const params: any = { limit: 50 };
      if (filter.status) params.status = filter.status;
      if (filter.category) params.category = filter.category;
      const res = await complaintAPI.getAll(params);
      setComplaints(res.data.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await complaintAPI.create(form);
      setShowCreate(false);
      setForm({ title: '', description: '', isAnonymous: false, category: '' });
      loadComplaints();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to submit complaint');
    } finally { setCreating(false); }
  };

  const handleViewDetail = async (id: string) => {
    try {
      const res = await complaintAPI.getById(id);
      setSelectedComplaint(res.data.data);
    } catch (err) { console.error(err); }
  };

  const handleStatusUpdate = async (id: string, status: string) => {
    try {
      await complaintAPI.updateStatus(id, { status });
      if (selectedComplaint) handleViewDetail(id);
      loadComplaints();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update');
    }
  };

  const canCreate = ['student', 'faculty'].includes(user?.role || '');
  const canManage = ['super_admin', 'department_admin', 'maintenance_staff'].includes(user?.role || '');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <MessageSquareWarning className="w-5 h-5 text-purple-400" /> Complaints
          </h2>
          <p className="text-sm text-cos-text-secondary mt-1">Grievance redressal system with AI classification</p>
        </div>
        {canCreate && (
          <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> New Complaint
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-cos-text-muted">Status:</span>
          {['', 'open', 'in_progress', 'resolved', 'closed'].map(s => (
            <button key={s} onClick={() => setFilter(p => ({ ...p, status: s }))}
              className={`px-3 py-1 rounded-lg text-xs transition-all ${filter.status === s ? 'gradient-bg text-white' : 'bg-cos-bg-card border border-cos-border text-cos-text-secondary'}`}>
              {s === '' ? 'All' : s.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-cos-primary" /></div>
      ) : complaints.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <MessageSquareWarning className="w-12 h-12 text-cos-text-muted mx-auto mb-3" />
          <p className="text-cos-text-secondary">No complaints found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {complaints.map((c: any) => (
            <div key={c.id} className="glass-card glass-card-hover p-5 cursor-pointer" onClick={() => handleViewDetail(c.id)}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`badge text-[10px] ${getStatusColor(c.status)}`}>{c.status?.replace(/_/g, ' ')}</span>
                    <span className={`badge text-[10px] ${getPriorityColor(c.priority)}`}>{c.priority}</span>
                    {c.category && <span className="badge text-[10px] bg-cos-bg-elevated text-cos-text-muted border-cos-border">{c.category}</span>}
                    {c.is_anonymous && (
                      <span className="badge text-[10px] bg-gray-500/20 text-gray-400 border-gray-500/30">
                        <Shield className="w-2.5 h-2.5 mr-1" /> Anonymous
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold">{c.title}</h3>
                  <p className="text-xs text-cos-text-muted mt-1">
                    {c.submitted_by_name} · {formatDateTime(c.created_at)}
                    {c.department_name && ` · ${c.department_name}`}
                  </p>
                </div>
                <Eye className="w-4 h-4 text-cos-text-muted flex-shrink-0" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="glass-card p-6 w-full max-w-lg animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Submit Complaint</h3>
              <button onClick={() => setShowCreate(false)}><X className="w-5 h-5 text-cos-text-muted" /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm text-cos-text-secondary mb-1.5">Title</label>
                <input className="input-field" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required placeholder="Brief description of the issue" />
              </div>
              <div>
                <label className="block text-sm text-cos-text-secondary mb-1.5">Description</label>
                <textarea className="input-field min-h-[120px] resize-none" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} required placeholder="Provide detailed information..." />
              </div>
              <div>
                <label className="block text-sm text-cos-text-secondary mb-1.5">Category (optional)</label>
                <select className="input-field" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                  <option value="">Let AI classify</option>
                  <option value="infrastructure">Infrastructure</option>
                  <option value="academic">Academic</option>
                  <option value="hostel">Hostel</option>
                  <option value="transport">Transport</option>
                  <option value="canteen">Canteen</option>
                  <option value="it_services">IT Services</option>
                  <option value="library">Library</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <label className="flex items-center gap-3 p-3 rounded-lg border border-cos-border hover:border-cos-primary/30 cursor-pointer transition-colors">
                <input type="checkbox" checked={form.isAnonymous} onChange={e => setForm(p => ({ ...p, isAnonymous: e.target.checked }))}
                  className="w-4 h-4 rounded" />
                <div>
                  <div className="text-sm font-medium flex items-center gap-1.5"><Shield className="w-3.5 h-3.5" /> Submit Anonymously</div>
                  <div className="text-xs text-cos-text-muted">Your identity will be hidden from other users</div>
                </div>
              </label>
              <div className="bg-cos-primary/10 rounded-lg p-3 text-xs text-cos-primary flex items-start gap-2">
                <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>AI will auto-classify the category, priority, and sentiment of your complaint</span>
              </div>
              <button type="submit" disabled={creating} className="btn-primary w-full flex items-center justify-center gap-2">
                {creating ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-4 h-4" /> Submit Complaint</>}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay" onClick={() => setSelectedComplaint(null)}>
          <div className="glass-card p-6 w-full max-w-2xl animate-fade-in max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`badge text-xs ${getStatusColor(selectedComplaint.status)}`}>{selectedComplaint.status?.replace(/_/g, ' ')}</span>
                <span className={`badge text-xs ${getPriorityColor(selectedComplaint.priority)}`}>{selectedComplaint.priority}</span>
                {selectedComplaint.category && <span className="badge text-xs bg-cos-bg-elevated text-cos-text-muted border-cos-border">{selectedComplaint.category}</span>}
              </div>
              <button onClick={() => setSelectedComplaint(null)}><X className="w-5 h-5 text-cos-text-muted" /></button>
            </div>

            <h3 className="text-xl font-bold mb-2">{selectedComplaint.title}</h3>
            <p className="text-xs text-cos-text-muted mb-4">
              {selectedComplaint.submitted_by_name} · {formatDateTime(selectedComplaint.created_at)}
            </p>

            {/* AI Classification */}
            {(selectedComplaint.ai_category || selectedComplaint.ai_priority) && (
              <div className="bg-cos-primary/10 rounded-lg p-4 mb-4">
                <div className="text-xs font-medium text-cos-primary flex items-center gap-1.5 mb-2">
                  <Sparkles className="w-3.5 h-3.5" /> AI Classification
                </div>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div><span className="text-cos-text-muted">Category:</span> <span className="font-medium">{selectedComplaint.ai_category}</span></div>
                  <div><span className="text-cos-text-muted">Priority:</span> <span className="font-medium">{selectedComplaint.ai_priority}</span></div>
                  <div><span className="text-cos-text-muted">Sentiment:</span> <span className="font-medium">{selectedComplaint.ai_sentiment}</span></div>
                </div>
              </div>
            )}

            <div className="text-sm text-cos-text-secondary leading-relaxed whitespace-pre-wrap mb-6">{selectedComplaint.description}</div>

            {/* Status Actions */}
            {canManage && (
              <div className="border-t border-cos-border pt-4 mb-4">
                <p className="text-xs text-cos-text-muted mb-2">Update Status:</p>
                <div className="flex flex-wrap gap-2">
                  {['in_progress', 'resolved', 'rejected', 'escalated'].map(s => (
                    <button key={s} onClick={() => handleStatusUpdate(selectedComplaint.id, s)}
                      className="btn-secondary text-xs px-3 py-1.5">{s.replace(/_/g, ' ')}</button>
                  ))}
                </div>
              </div>
            )}

            {/* Comments */}
            {selectedComplaint.comments && selectedComplaint.comments.length > 0 && (
              <div className="border-t border-cos-border pt-4">
                <h4 className="text-sm font-medium mb-3">Comments</h4>
                <div className="space-y-3">
                  {selectedComplaint.comments.map((comment: any) => (
                    <div key={comment.id} className="bg-cos-bg-secondary/50 rounded-lg p-3">
                      <div className="text-xs text-cos-text-muted mb-1">{comment.user_name} · {formatDateTime(comment.created_at)}</div>
                      <div className="text-sm">{comment.comment}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
