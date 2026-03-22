'use client';

import { useEffect, useState } from 'react';
import { lostFoundAPI } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { formatDateTime, getStatusColor } from '@/lib/utils';
import { Hash, Plus, Loader2, X, Send, Camera, Search, User, MapPin } from 'lucide-react';

export default function LostFoundPage() {
  const { user } = useAuthStore();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [filter, setFilter] = useState('');

  const [form, setForm] = useState({
    title: '', description: '', locationFound: '', type: 'lost' as 'lost' | 'found', category: '',
  });
  const [image, setImage] = useState<File | null>(null);

  useEffect(() => { loadData(); }, [filter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await lostFoundAPI.getAll(filter ? { type: filter } : {});
      setItems(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      const formData = new FormData();
      Object.entries(form).forEach(([key, val]) => formData.append(key, val));
      if (image) formData.append('image', image);

      await lostFoundAPI.create(formData);
      setShowCreate(false);
      setForm({ title: '', description: '', locationFound: '', type: 'lost', category: '' });
      setImage(null);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to post item');
    } finally {
      setCreating(false);
    }
  };

  const handleResolve = async (id: string) => {
    if (!confirm('Mark this item as resolved/returned?')) return;
    try {
      await lostFoundAPI.resolve(id);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Hash className="w-5 h-5 text-cos-primary" /> Lost & Found
          </h2>
          <p className="text-sm text-cos-text-secondary mt-1">Recover lost items or report found property</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> Report Item
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {['', 'lost', 'found'].map(t => (
          <button key={t} onClick={() => setFilter(t)}
            className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${filter === t ? 'gradient-bg text-white' : 'bg-cos-bg-card border border-cos-border text-cos-text-muted'}`}>
            {t === '' ? 'All Items' : t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-cos-primary" /></div>
      ) : items.length === 0 ? (
        <div className="glass-card p-20 text-center border-dashed border-2">
          <Search className="w-12 h-12 text-cos-text-muted mx-auto mb-4 opacity-20" />
          <p className="text-cos-text-secondary font-medium italic">No items matching your search</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item: any) => (
            <div key={item.id} className="glass-card glass-card-hover group relative overflow-hidden">
               {item.image_url && (
                 <div className="h-48 overflow-hidden bg-black/20">
                    <img src={item.image_url} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                 </div>
               )}
               <div className="p-6">
                 <div className="flex items-start justify-between mb-4">
                   <div className={`badge text-[10px] font-black uppercase tracking-widest ${item.type === 'lost' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                     {item.type}
                   </div>
                   <span className="text-[10px] text-cos-text-muted font-bold uppercase">{formatDateTime(item.created_at)}</span>
                 </div>
                 <h3 className="font-bold text-lg mb-2">{item.title}</h3>
                 <p className="text-xs text-cos-text-secondary line-clamp-2 mb-4 leading-relaxed">{item.description}</p>
                 
                 <div className="space-y-2 text-xs text-cos-text-muted font-medium mb-6">
                    <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-cos-primary" /> {item.location_found}</div>
                    <div className="flex items-center gap-2"><User className="w-3.5 h-3.5 text-cos-primary" /> Posted by {item.reporter_name}</div>
                 </div>

                 {item.status === 'open' && (item.reporter_id === user?.id || user?.role === 'super_admin') && (
                   <button onClick={() => handleResolve(item.id)} className="w-full btn-secondary text-[10px] font-black uppercase tracking-widest py-3">
                     Mark Resolved
                   </button>
                 )}
                 {item.status === 'resolved' && (
                   <div className="w-full py-3 text-center text-[10px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/5 rounded-xl border border-emerald-500/10">
                     Resolved
                   </div>
                 )}
               </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay" onClick={() => setShowCreate(false)}>
           <div className="glass-card p-8 w-full max-w-xl animate-fade-in relative z-50" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between mb-8">
                 <h3 className="text-xl font-bold flex items-center gap-2">
                   <Send className="w-5 h-5 text-cos-primary" /> Report Property
                 </h3>
                 <button onClick={() => setShowCreate(false)} className="hover:rotate-90 transition-transform">
                   <X className="w-6 h-6 text-cos-text-muted" />
                 </button>
              </div>

              <form onSubmit={handleCreate} className="space-y-6">
                 <div className="flex gap-4 p-1 rounded-2xl bg-black/20 border border-white/5">
                    {['lost', 'found'].map(t => (
                      <button key={t} type="button" onClick={() => setForm(f => ({ ...f, type: t as any }))}
                        className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${form.type === t ? 'gradient-bg text-white shadow-lg' : 'text-cos-text-muted hover:text-white'}`}>
                        {t}
                      </button>
                    ))}
                 </div>

                 <div className="grid md:grid-cols-2 gap-6">
                    <div className="md:col-span-2 space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-cos-text-muted ml-1">Item Title</label>
                       <input className="input-field py-4" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} required placeholder="Ex: Black Nike Wallet" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-cos-text-muted ml-1">Location Reported</label>
                       <input className="input-field py-4" value={form.locationFound} onChange={e => setForm(f => ({ ...f, locationFound: e.target.value }))} required placeholder="Ex: Canteen / LH-204" />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-cos-text-muted ml-1">Item Category</label>
                       <input className="input-field py-4" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="Ex: Electronics" />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-cos-text-muted ml-1">Description</label>
                       <textarea className="input-field py-4 min-h-[100px] resize-none" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} required placeholder="Describe the item in detail..." />
                    </div>
                    <div className="md:col-span-2 space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-cos-text-muted ml-1">Item Photograph (Optional)</label>
                       <div className="relative group">
                          <input type="file" accept="image/*" onChange={e => setImage(e.target.files?.[0] || null)} 
                            className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                          <div className="btn-secondary w-full py-6 flex flex-col items-center gap-2 group-hover:border-cos-primary/50 transition-colors">
                             <Camera className="w-8 h-8 opacity-20 group-hover:text-cos-primary transition-colors" />
                             <span className="text-[10px] font-black uppercase tracking-widest">{image ? image.name : 'Upload Image'}</span>
                          </div>
                       </div>
                    </div>
                 </div>

                 <button type="submit" disabled={creating} className="btn-primary w-full py-4 text-xs font-black uppercase tracking-widest shadow-lg shardow-orange-500/20">
                    {creating ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Broadcast Publication'}
                 </button>
              </form>
           </div>
        </div>
      )}
    </div>
  );
}
