'use client';

import { useEffect, useState } from 'react';
import { lostFoundAPI } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { formatDate, getStatusColor } from '@/lib/utils';
import { Search, Plus, Loader2, X, Send, MapPin, CalendarDays, Eye, CheckCircle2, Package } from 'lucide-react';

export default function LostFoundPage() {
  const { user } = useAuthStore();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [filter, setFilter] = useState('');

  const [form, setForm] = useState({
    type: 'lost', title: '', description: '', location: '', itemDate: '', contactInfo: '',
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => { loadItems(); }, [filter]);

  const loadItems = async () => {
    setLoading(true);
    try {
      const params: any = { limit: 50 };
      if (filter) params.type = filter;
      const res = await lostFoundAPI.getAll(params);
      setItems(res.data.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await lostFoundAPI.create(new FormData(e.currentTarget as HTMLFormElement));
      // Fallback: text-based create
      await lostFoundAPI.getAll();
      setShowCreate(false);
      setForm({ type: 'lost', title: '', description: '', location: '', itemDate: '', contactInfo: '' });
      loadItems();
    } catch (err: any) {
      // Try form data approach
      try {
        const fd = new FormData();
        Object.entries(form).forEach(([k, v]) => fd.append(k, v));
        await lostFoundAPI.create(fd);
        setShowCreate(false);
        loadItems();
      } catch (err2: any) {
        alert(err2.response?.data?.message || 'Failed');
      }
    } finally { setCreating(false); }
  };

  const handleViewDetail = async (id: string) => {
    try {
      const res = await lostFoundAPI.getById(id);
      setSelectedItem(res.data.data);
    } catch (err) { console.error(err); }
  };

  const handleResolve = async (id: string) => {
    try {
      await lostFoundAPI.resolve(id);
      setSelectedItem(null);
      loadItems();
    } catch (err: any) { alert(err.response?.data?.message || 'Failed'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Search className="w-5 h-5 text-amber-400" /> Lost & Found
          </h2>
          <p className="text-sm text-cos-text-secondary mt-1">Report and find lost items on campus</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> Report Item
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {['', 'lost', 'found'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${filter === f ? 'gradient-bg text-white' : 'bg-cos-bg-card border border-cos-border text-cos-text-secondary'}`}>
            {f === '' ? 'All Items' : f === 'lost' ? '🔴 Lost' : '🟢 Found'}
          </button>
        ))}
      </div>

      {/* Items Grid */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-cos-primary" /></div>
      ) : items.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <Package className="w-12 h-12 text-cos-text-muted mx-auto mb-3" />
          <p className="text-cos-text-secondary">No items reported yet</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item: any) => (
            <div key={item.id} className="glass-card glass-card-hover p-5 cursor-pointer" onClick={() => handleViewDetail(item.id)}>
              <div className="flex items-center gap-2 mb-3">
                <span className={`badge text-[10px] ${item.type === 'lost' ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'}`}>
                  {item.type === 'lost' ? '🔴 Lost' : '🟢 Found'}
                </span>
                <span className={`badge text-[10px] ${getStatusColor(item.status)}`}>{item.status}</span>
              </div>
              <h3 className="font-semibold mb-1">{item.title}</h3>
              <p className="text-xs text-cos-text-secondary line-clamp-2 mb-3">{item.description}</p>
              <div className="space-y-1 text-xs text-cos-text-muted">
                {item.location && <p className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {item.location}</p>}
                {item.item_date && <p className="flex items-center gap-1"><CalendarDays className="w-3 h-3" /> {formatDate(item.item_date)}</p>}
                <p>Reported by {item.reported_by_name}</p>
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
              <h3 className="text-lg font-semibold">Report Item</h3>
              <button onClick={() => setShowCreate(false)}><X className="w-5 h-5 text-cos-text-muted" /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm text-cos-text-secondary mb-1.5">Type</label>
                <div className="flex gap-3">
                  {['lost', 'found'].map(t => (
                    <button key={t} type="button" onClick={() => setForm(p => ({ ...p, type: t }))}
                      className={`flex-1 py-2.5 rounded-lg border text-sm transition-all ${form.type === t
                        ? t === 'lost' ? 'border-red-500 bg-red-500/10 text-red-400' : 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                        : 'border-cos-border text-cos-text-secondary'
                      }`}>
                      {t === 'lost' ? '🔴 I Lost Something' : '🟢 I Found Something'}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm text-cos-text-secondary mb-1.5">Item Name</label>
                <input className="input-field" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required placeholder="e.g., Blue Water Bottle" />
              </div>
              <div>
                <label className="block text-sm text-cos-text-secondary mb-1.5">Description</label>
                <textarea className="input-field min-h-[80px] resize-none" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} required placeholder="Describe the item in detail..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-cos-text-secondary mb-1.5">Location</label>
                  <input className="input-field" value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))} placeholder="Where was it lost/found?" />
                </div>
                <div>
                  <label className="block text-sm text-cos-text-secondary mb-1.5">Date</label>
                  <input type="date" className="input-field" value={form.itemDate} onChange={e => setForm(p => ({ ...p, itemDate: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="block text-sm text-cos-text-secondary mb-1.5">Contact Info</label>
                <input className="input-field" value={form.contactInfo} onChange={e => setForm(p => ({ ...p, contactInfo: e.target.value }))} placeholder="Phone or email" />
              </div>
              <button type="submit" disabled={creating} className="btn-primary w-full flex items-center justify-center gap-2">
                {creating ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-4 h-4" /> Report</>}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay" onClick={() => setSelectedItem(null)}>
          <div className="glass-card p-6 w-full max-w-lg animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex gap-2">
                <span className={`badge text-xs ${selectedItem.type === 'lost' ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'}`}>
                  {selectedItem.type}
                </span>
                <span className={`badge text-xs ${getStatusColor(selectedItem.status)}`}>{selectedItem.status}</span>
              </div>
              <button onClick={() => setSelectedItem(null)}><X className="w-5 h-5 text-cos-text-muted" /></button>
            </div>
            <h3 className="text-xl font-bold mb-2">{selectedItem.title}</h3>
            <p className="text-sm text-cos-text-secondary mb-4">{selectedItem.description}</p>
            <div className="space-y-2 text-sm text-cos-text-muted">
              {selectedItem.location && <p><strong>Location:</strong> {selectedItem.location}</p>}
              {selectedItem.item_date && <p><strong>Date:</strong> {formatDate(selectedItem.item_date)}</p>}
              <p><strong>Reported by:</strong> {selectedItem.reported_by_name}</p>
              {selectedItem.reported_by_email && <p><strong>Contact:</strong> {selectedItem.reported_by_email}</p>}
            </div>
            {selectedItem.matches && selectedItem.matches.length > 0 && (
              <div className="mt-4 p-3 bg-cos-primary/10 rounded-lg">
                <p className="text-xs font-medium text-cos-primary mb-2">🔗 Potential Matches</p>
                {selectedItem.matches.map((m: any) => (
                  <div key={m.id} className="text-xs text-cos-text-secondary p-2 bg-cos-bg-secondary/50 rounded mb-1">
                    {m.title} — {m.description?.substring(0, 60)}
                  </div>
                ))}
              </div>
            )}
            {selectedItem.status === 'reported' && selectedItem.reported_by === user?.id && (
              <button onClick={() => handleResolve(selectedItem.id)} className="btn-primary w-full mt-4 flex items-center justify-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Mark as Resolved
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
