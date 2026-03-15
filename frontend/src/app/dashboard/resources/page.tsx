'use client';

import { useEffect, useState } from 'react';
import { resourceAPI } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { formatDateTime, getStatusColor } from '@/lib/utils';
import { Calendar, Plus, Loader2, X, Send, Clock, MapPin, Users, Monitor } from 'lucide-react';

export default function ResourcesPage() {
  const { user } = useAuthStore();
  const [resources, setResources] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBook, setShowBook] = useState(false);
  const [selectedResource, setSelectedResource] = useState<string>('');
  const [tab, setTab] = useState<'resources' | 'bookings'>('resources');

  const [form, setForm] = useState({
    resourceId: '', title: '', purpose: '', startTime: '', endTime: '',
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [resRes, bookRes] = await Promise.allSettled([
        resourceAPI.getAll(),
        resourceAPI.getBookings(),
      ]);
      if (resRes.status === 'fulfilled') setResources(resRes.value.data.data || []);
      if (bookRes.status === 'fulfilled') setBookings(bookRes.value.data.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await resourceAPI.book(form);
      setShowBook(false);
      setForm({ resourceId: '', title: '', purpose: '', startTime: '', endTime: '' });
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Booking failed');
    } finally { setCreating(false); }
  };

  const handleApproveBooking = async (id: string, action: string) => {
    try {
      await resourceAPI.approveBooking(id, action);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed');
    }
  };

  const canBook = user?.role === 'faculty';
  const canApprove = ['department_admin', 'super_admin'].includes(user?.role || '');

  const typeIcons: Record<string, any> = {
    seminar_hall: Users,
    lab: Monitor,
    projector: Monitor,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-400" /> Campus Resources
          </h2>
          <p className="text-sm text-cos-text-secondary mt-1">Book seminar halls, labs, and equipment</p>
        </div>
        {canBook && (
          <button onClick={() => setShowBook(true)} className="btn-primary flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> Book Resource
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {(['resources', 'bookings'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === t ? 'gradient-bg text-white' : 'bg-cos-bg-card border border-cos-border text-cos-text-secondary'}`}>
            {t === 'resources' ? 'Available Resources' : 'My Bookings'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-cos-primary" /></div>
      ) : tab === 'resources' ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {resources.map((res: any) => {
            const Icon = typeIcons[res.type] || Calendar;
            return (
              <div key={res.id} className="glass-card glass-card-hover p-5">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{res.name}</h3>
                    <p className="text-xs text-cos-text-muted">{res.type?.replace(/_/g, ' ')}</p>
                  </div>
                </div>
                <div className="space-y-1.5 text-xs text-cos-text-secondary">
                  {res.location && <p className="flex items-center gap-1.5"><MapPin className="w-3 h-3" /> {res.location}</p>}
                  {res.capacity && <p className="flex items-center gap-1.5"><Users className="w-3 h-3" /> Capacity: {res.capacity}</p>}
                </div>
                {canBook && (
                  <button onClick={() => { setForm(p => ({ ...p, resourceId: res.id })); setShowBook(true); }}
                    className="btn-secondary w-full text-xs mt-4 py-2">
                    Book Now
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-3">
          {bookings.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <Calendar className="w-12 h-12 text-cos-text-muted mx-auto mb-3" />
              <p className="text-cos-text-secondary">No bookings yet</p>
            </div>
          ) : bookings.map((b: any) => (
            <div key={b.id} className="glass-card p-5">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold">{b.title}</h3>
                  <p className="text-xs text-cos-text-muted">{b.resource_name} · {b.resource_location}</p>
                </div>
                <span className={`badge text-[10px] ${getStatusColor(b.status)}`}>{b.status}</span>
              </div>
              <div className="flex items-center gap-4 text-xs text-cos-text-muted">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatDateTime(b.start_time)}</span>
                <span>→</span>
                <span>{formatDateTime(b.end_time)}</span>
              </div>
              {canApprove && b.status === 'pending' && (
                <div className="flex gap-2 mt-3 pt-3 border-t border-cos-border">
                  <button onClick={() => handleApproveBooking(b.id, 'approve')} className="btn-primary text-xs py-1.5 px-4">Approve</button>
                  <button onClick={() => handleApproveBooking(b.id, 'reject')} className="btn-secondary text-xs py-1.5 px-4 text-red-400">Reject</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Book Modal */}
      {showBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay" onClick={() => setShowBook(false)}>
          <div className="glass-card p-6 w-full max-w-lg animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Book Resource</h3>
              <button onClick={() => setShowBook(false)}><X className="w-5 h-5 text-cos-text-muted" /></button>
            </div>
            <form onSubmit={handleBook} className="space-y-4">
              <div>
                <label className="block text-sm text-cos-text-secondary mb-1.5">Resource</label>
                <select className="input-field" value={form.resourceId} onChange={e => setForm(p => ({ ...p, resourceId: e.target.value }))} required>
                  <option value="">Select resource</option>
                  {resources.map((r: any) => <option key={r.id} value={r.id}>{r.name} ({r.type?.replace(/_/g, ' ')})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-cos-text-secondary mb-1.5">Event Title</label>
                <input className="input-field" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required placeholder="e.g., Guest Lecture on AI" />
              </div>
              <div>
                <label className="block text-sm text-cos-text-secondary mb-1.5">Purpose</label>
                <textarea className="input-field min-h-[60px] resize-none" value={form.purpose} onChange={e => setForm(p => ({ ...p, purpose: e.target.value }))} placeholder="Purpose of booking..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-cos-text-secondary mb-1.5">Start Time</label>
                  <input type="datetime-local" className="input-field" value={form.startTime} onChange={e => setForm(p => ({ ...p, startTime: e.target.value }))} required />
                </div>
                <div>
                  <label className="block text-sm text-cos-text-secondary mb-1.5">End Time</label>
                  <input type="datetime-local" className="input-field" value={form.endTime} onChange={e => setForm(p => ({ ...p, endTime: e.target.value }))} required />
                </div>
              </div>
              <button type="submit" disabled={creating} className="btn-primary w-full flex items-center justify-center gap-2">
                {creating ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-4 h-4" /> Submit Booking</>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
