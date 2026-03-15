'use client';

import { useEffect, useState } from 'react';
import { departmentAPI } from '@/lib/api';
import { Building2, Plus, Loader2, X, Send, Users, BookOpen } from 'lucide-react';

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', description: '' });
  const [creating, setCreating] = useState(false);

  useEffect(() => { loadDepartments(); }, []);

  const loadDepartments = async () => {
    setLoading(true);
    try {
      const res = await departmentAPI.getAll();
      setDepartments(res.data.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await departmentAPI.create(form);
      setShowCreate(false);
      setForm({ name: '', code: '', description: '' });
      loadDepartments();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed');
    } finally { setCreating(false); }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Building2 className="w-5 h-5 text-cos-primary" /> Departments
          </h2>
          <p className="text-sm text-cos-text-secondary mt-1">Manage campus departments</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> Add Department
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-cos-primary" /></div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {departments.map((dept: any) => (
            <div key={dept.id} className="glass-card glass-card-hover p-5">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center text-white font-bold text-sm">
                  {dept.code}
                </div>
                <div>
                  <h3 className="font-semibold">{dept.name}</h3>
                  {dept.hod_name && <p className="text-xs text-cos-text-muted">HOD: {dept.hod_name}</p>}
                </div>
              </div>
              {dept.description && <p className="text-xs text-cos-text-secondary mb-4">{dept.description}</p>}
              <div className="flex items-center gap-4 text-xs text-cos-text-muted">
                <span className="flex items-center gap-1"><BookOpen className="w-3 h-3" /> {dept.class_count || 0} classes</span>
                <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {dept.student_count || 0} students</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="glass-card p-6 w-full max-w-md animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold">Add Department</h3>
              <button onClick={() => setShowCreate(false)}><X className="w-5 h-5 text-cos-text-muted" /></button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm text-cos-text-secondary mb-1.5">Department Name</label>
                <input className="input-field" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required placeholder="e.g., Computer Science" />
              </div>
              <div>
                <label className="block text-sm text-cos-text-secondary mb-1.5">Code</label>
                <input className="input-field" value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))} required placeholder="e.g., CSE" maxLength={10} />
              </div>
              <div>
                <label className="block text-sm text-cos-text-secondary mb-1.5">Description</label>
                <textarea className="input-field min-h-[60px] resize-none" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
              </div>
              <button type="submit" disabled={creating} className="btn-primary w-full flex items-center justify-center gap-2">
                {creating ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-4 h-4" /> Create</>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
