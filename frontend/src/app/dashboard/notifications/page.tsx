'use client';

import { useEffect, useState } from 'react';
import { notificationAPI } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { formatDateTime, getStatusColor, truncate } from '@/lib/utils';
import { Bell, Plus, Send, Eye, Loader2, X, Sparkles, Filter } from 'lucide-react';

export default function NotificationsPage() {
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedNotif, setSelectedNotif] = useState<any>(null);
  const [filter, setFilter] = useState('');

  const [form, setForm] = useState({
    title: '', content: '', type: 'academic', targetType: 'all', expiresAt: '',
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => { loadNotifications(); }, [filter]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const params: any = { limit: 50 };
      if (filter) params.type = filter;
      const res = await notificationAPI.getAll(params);
      setNotifications(res.data.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await notificationAPI.create({
        ...form,
        expiresAt: form.expiresAt || undefined,
      });
      setShowCreate(false);
      setForm({ title: '', content: '', type: 'academic', targetType: 'all', expiresAt: '' });
      loadNotifications();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create notification');
    } finally { setCreating(false); }
  };

  const handleViewDetail = async (id: string) => {
    try {
      const res = await notificationAPI.getById(id);
      setSelectedNotif(res.data.data);
    } catch (err) { console.error(err); }
  };

  const canCreate = ['super_admin', 'department_admin', 'faculty'].includes(user?.role || '');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Bell className="w-5 h-5 text-cos-primary" /> Notifications
          </h2>
          <p className="text-sm text-cos-text-secondary mt-1">Campus announcements and alerts</p>
        </div>
        {canCreate && (
          <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> New Notification
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Filter className="w-4 h-4 text-cos-text-muted" />
        {['', 'academic', 'event', 'emergency', 'department', 'system'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filter === f ? 'gradient-bg text-white' : 'bg-cos-bg-card border border-cos-border text-cos-text-secondary hover:border-cos-primary/30'}`}>
            {f === '' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Notification List */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-cos-primary" /></div>
      ) : notifications.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Bell className="w-12 h-12 text-cos-text-muted mx-auto mb-3" />
          <p className="text-cos-text-secondary">No notifications found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((notif: any) => (
            <div key={notif.id} className="glass-card glass-card-hover p-5 cursor-pointer" onClick={() => handleViewDetail(notif.id)}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`badge text-[10px] ${getStatusColor(notif.status)}`}>{notif.status}</span>
                    <span className="badge text-[10px] bg-cos-bg-elevated text-cos-text-muted border-cos-border">{notif.type}</span>
                    {notif.is_pinned && <span className="text-[10px] text-amber-400">📌 Pinned</span>}
                  </div>
                  <h3 className="font-semibold">{notif.title}</h3>
                  {notif.ai_summary && (
                    <p className="text-sm text-cos-primary/80 mt-1 flex items-start gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                      {notif.ai_summary}
                    </p>
                  )}
                  <p className="text-xs text-cos-text-muted mt-2">
                    By {notif.posted_by_name} · {formatDateTime(notif.published_at || notif.created_at)}
                    {notif.view_count > 0 && ` · ${notif.view_count} views`}
                  </p>
                </div>
                <Eye className="w-4 h-4 text-cos-text-muted flex-shrink-0 mt-1" />
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
              <h3 className="text-lg font-semibold">Create Notification</h3>
              <button onClick={() => setShowCreate(false)} className="text-cos-text-muted hover:text-cos-text-primary"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm text-cos-text-secondary mb-1.5">Title</label>
                <input className="input-field" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required placeholder="Announcement title" />
              </div>
              <div>
                <label className="block text-sm text-cos-text-secondary mb-1.5">Content</label>
                <textarea className="input-field min-h-[120px] resize-none" value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} required placeholder="Full announcement content..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-cos-text-secondary mb-1.5">Type</label>
                  <select className="input-field" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
                    <option value="academic">Academic</option>
                    <option value="event">Event</option>
                    <option value="emergency">Emergency</option>
                    <option value="department">Department</option>
                    <option value="system">System</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-cos-text-secondary mb-1.5">Target</label>
                  <select className="input-field" value={form.targetType} onChange={e => setForm(p => ({ ...p, targetType: e.target.value }))}>
                    <option value="all">Entire College</option>
                    <option value="department">Department</option>
                    <option value="batch">Batch</option>
                    <option value="hostellers">Hostellers</option>
                    <option value="day_scholars">Day Scholars</option>
                    <option value="faculty">Faculty</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm text-cos-text-secondary mb-1.5">Expires At (optional)</label>
                <input type="datetime-local" className="input-field" value={form.expiresAt} onChange={e => setForm(p => ({ ...p, expiresAt: e.target.value }))} />
              </div>
              <div className="bg-cos-primary/10 rounded-lg p-3 text-xs text-cos-primary flex items-start gap-2">
                <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>AI will automatically generate a concise summary for push notifications</span>
              </div>
              <button type="submit" disabled={creating} className="btn-primary w-full flex items-center justify-center gap-2">
                {creating ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-4 h-4" /> Publish</>}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedNotif && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay" onClick={() => setSelectedNotif(null)}>
          <div className="glass-card p-6 w-full max-w-lg animate-fade-in max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className={`badge text-xs ${getStatusColor(selectedNotif.status)}`}>{selectedNotif.status}</span>
                <span className="badge text-xs bg-cos-bg-elevated text-cos-text-muted border-cos-border">{selectedNotif.type}</span>
              </div>
              <button onClick={() => setSelectedNotif(null)} className="text-cos-text-muted hover:text-cos-text-primary"><X className="w-5 h-5" /></button>
            </div>
            <h3 className="text-xl font-bold mb-3">{selectedNotif.title}</h3>
            {selectedNotif.ai_summary && (
              <div className="bg-cos-primary/10 rounded-lg p-3 mb-4 text-sm text-cos-primary flex items-start gap-2">
                <Sparkles className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{selectedNotif.ai_summary}</span>
              </div>
            )}
            <div className="text-sm text-cos-text-secondary leading-relaxed whitespace-pre-wrap">{selectedNotif.content}</div>
            <div className="mt-6 pt-4 border-t border-cos-border text-xs text-cos-text-muted">
              <p>Posted by {selectedNotif.posted_by_name} · {formatDateTime(selectedNotif.created_at)}</p>
              {selectedNotif.expires_at && <p>Expires: {formatDateTime(selectedNotif.expires_at)}</p>}
              <p>Views: {selectedNotif.view_count}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
