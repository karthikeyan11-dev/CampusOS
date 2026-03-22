'use client';

import { useEffect, useState } from 'react';
import { authAPI, departmentAPI, governanceAPI } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { formatDateTime, getRoleBadgeColor, formatRoleName, getStatusColor } from '@/lib/utils';
import { useSearchParams } from 'next/navigation';
import { 
  Users, Loader2, CheckCircle2, XCircle, Clock, Shield, 
  Search, List, Map, UserPlus, Trash2, Building2 
} from 'lucide-react';

export default function UsersPage() {
  const { user: currentUser } = useAuthStore();
  const searchParams = useSearchParams();
  
  const [mode, setMode] = useState<'directory' | 'mappings'>('directory');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  // Data States
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [faculty, setFaculty] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [hostels, setHostels] = useState<any[]>([]);
  
  // Filter for Directory
  const [roleFilter, setRoleFilter] = useState('all');

  // Promotion State
  const [promotingId, setPromotingId] = useState<string | null>(null);
  const [newDesignation, setNewDesignation] = useState('');
  const [newRole, setNewRole] = useState('');

  // Mappings State
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [mappingForm, setMappingForm] = useState({
    type: 'class' as 'class' | 'department' | 'hostel',
    className: '',
    mentorId: '',
    departmentId: '',
    hodId: '',
    hostelId: '',
    wardenId: '' // NEW: LINKING WARDEN TO HOSTEL
  });

  useEffect(() => {
    loadData();
  }, [mode]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (mode === 'directory') {
        const res = await authAPI.getAllUsers();
        if (res.data?.success) {
          setAllUsers(res.data.data || []);
        }
      } else if (mode === 'mappings') {
        const [facRes, deptRes, hostelRes] = await Promise.all([
          authAPI.getFacultyMapping(),
          governanceAPI.lookupDepartments(),
          governanceAPI.lookupHostels()
        ]);
        
        if (facRes.data?.success) setFaculty(facRes.data.data || []);
        if (deptRes.data?.success) setDepartments(deptRes.data.data || []);
        if (hostelRes.data?.success) setHostels(hostelRes.data.data || []);
      }
    } catch (err: any) {
      console.error('Governance Data Fetch Error:', err);
      if (err.response?.status === 401) {
        // Redirect if auth failed
        // window.location.href = '/login';
      }
      alert('Failed to load institutional data. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handlePromote = async (id: string) => {
    try {
      await authAPI.promote(id, { 
        role: newRole || undefined, 
        designation: newDesignation || undefined 
      });
      setPromotingId(null);
      setNewDesignation('');
      setNewRole('');
      loadData();
      alert('Governance state updated.');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Promotion failed');
    }
  };

  const handleCreateMapping = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (mappingForm.type === 'class') {
        await authAPI.updateClassAssignment({
          className: mappingForm.className,
          mentorId: mappingForm.mentorId,
          departmentId: mappingForm.departmentId
        });
      } else if (mappingForm.type === 'department') {
        await authAPI.updateDepartmentAssignment({
          departmentId: mappingForm.departmentId,
          hodId: mappingForm.hodId
        });
      } else if (mappingForm.type === 'hostel') {
        await governanceAPI.createHostelMapping({
          hostelId: mappingForm.hostelId,
          wardenId: mappingForm.wardenId
        });
      }
      setShowMappingModal(false);
      alert('Mapping updated successfully.');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Mapping failed');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header & Modes */}
      <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
        <div>
          <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
             <Users className="w-7 h-7 text-cos-primary" /> Identity <span className="gradient-text">Hub</span>
          </h2>
          <p className="text-xs text-cos-text-secondary font-bold uppercase tracking-widest mt-1">Directory & Organizational Mappings</p>
        </div>
        
        <div className="flex p-1 bg-black/20 rounded-2xl border border-white/5 w-fit">
          <button onClick={() => setMode('directory')} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'directory' ? 'gradient-bg text-white' : 'text-cos-text-muted hover:text-white'}`}>Directory</button>
          <button onClick={() => setMode('mappings')} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mode === 'mappings' ? 'gradient-bg text-white' : 'text-cos-text-muted hover:text-white'}`}>Mappings</button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="glass-card overflow-hidden">
        {/* Mode Filters (Directory) */}
        {mode === 'directory' && (
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
                <input className="input-field py-2.5 pl-10 text-xs" placeholder="Search identity..." value={search} onChange={e => setSearch(e.target.value)} />
             </div>
          </div>
        )}

        {/* Mappings Header */}
        {mode === 'mappings' && (
          <div className="p-6 border-b border-cos-border flex justify-between items-center bg-black/10">
            <h3 className="text-sm font-bold uppercase tracking-widest text-cos-text-primary flex items-center gap-2">
              <Map className="w-4 h-4 text-cos-primary" /> Authority Mappings
            </h3>
            <button onClick={() => setShowMappingModal(true)} className="btn-primary px-4 py-2 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
              <UserPlus className="w-3.5 h-3.5" /> Set Mapping
            </button>
          </div>
        )}

        <div className="p-6">
          {loading ? (
            <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 animate-spin text-cos-primary" /></div>
          ) : mode === 'mappings' ? (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-10">
                {/* ... existing mappings UI ... */}
                <div className="text-center p-12 bg-white/5 rounded-3xl border border-dashed border-white/10">
                  <GraduationCap className="w-12 h-12 text-cos-primary/30 mx-auto mb-4" />
                  <h4 className="font-bold text-cos-text-primary">Academic Assignments</h4>
                  <p className="text-xs text-cos-text-secondary mt-2">Mappings for Class Mentors and HODs</p>
                  <div className="mt-8 text-[10px] text-cos-text-muted font-bold uppercase tracking-[0.2em]">Active Relationships via Config</div>
                </div>
                <div className="text-center p-12 bg-white/5 rounded-3xl border border-dashed border-white/10">
                  <Shield className="w-12 h-12 text-emerald-400/30 mx-auto mb-4" />
                  <h4 className="font-bold text-cos-text-primary">Operations Mappings</h4>
                  <p className="text-xs text-cos-text-secondary mt-2">Warden and Administrative assignments</p>
                  <div className="mt-8 text-[10px] text-cos-text-muted font-bold uppercase tracking-[0.2em]">Automated based on Resource IDs</div>
                </div>
             </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Identity</th>
                    <th>Role</th>
                    <th>Dept / Type</th>
                    <th>Joined</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {allUsers
                    .filter(u => u.role !== 'student') // STATIC: Focus exclusively on staff/faculty for governance
                    .filter(u => (roleFilter === 'all' || u.role === roleFilter) && (u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())))
                    .map((u: any) => (
                      <tr key={u.id} className="group hover:bg-white/[0.02] transition-colors border-b border-white/[0.03] last:border-0">
                        <td className="py-4">
                          <div className="flex items-center gap-3">
                             <div className="w-8 h-8 rounded-lg gradient-bg flex items-center justify-center text-white text-[10px] font-black">{u.name ? u.name.split(' ').map((n:any)=>n[0]).join('').toUpperCase().slice(0,2) : '??'}</div>
                             <div>
                               <div className="font-bold text-cos-text-primary capitalize">{u.name || 'Anonymous User'}</div>
                               <div className="text-[10px] text-cos-text-muted">{u.email || 'no-email@campusos.edu'}</div>
                             </div>
                          </div>
                        </td>
                        <td>
                          <span className={`badge text-[9px] font-black ${getRoleBadgeColor(u.role || 'student')}`}>
                            {formatRoleName(u.role || 'student')}
                          </span>
                        </td>
                        <td>
                          <div className="text-xs font-bold text-cos-text-secondary uppercase">{u.department_code || u.department_name || 'CENTRAL'}</div>
                          <div className="text-[10px] text-cos-text-muted">{u.designation || (u.role === 'student' ? (u.class_name || 'B.Tech') : 'Administrative')}</div>
                        </td>
                        <td>
                           <div className="text-[10px] font-bold text-cos-text-primary">{u.roll_number || 'STAFF-ID'}</div>
                        </td>
                        <td className="text-cos-text-muted text-[10px]">{formatDateTime(u.approved_at || u.created_at)}</td>
                        <td>
                          <span className="badge bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[9px] font-black uppercase tracking-widest">{u.status || 'Active'}</span>
                        </td>
                        <td className="text-right pr-6">
                           {currentUser?.role === 'super_admin' && (
                             <button onClick={() => setPromotingId(u.id)} className="p-2 rounded-xl bg-white/5 border border-white/5 text-cos-text-muted hover:text-cos-primary hover:border-cos-primary/20 transition-all">
                                <Shield className="w-4 h-4" />
                             </button>
                           )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Promotion Modal - Orange + Black Refactor */}
      {promotingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
           <div className="bg-zinc-950 p-8 w-full max-w-md border border-orange-500/30 rounded-[2rem] shadow-[0_0_50px_rgba(255,106,0,0.15)] animate-scale-up">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500 shadow-[0_0_20px_rgba(255,106,0,0.2)]"><Shield className="w-6 h-6" /></div>
                <div>
                  <h3 className="text-xl font-black text-orange-500 tracking-tight">Identity <span className="text-white">Governance</span></h3>
                  <p className="text-[10px] text-cos-text-muted uppercase tracking-[0.2em] font-bold">Promote Tier & Access</p>
                </div>
              </div>
              
              <div className="space-y-6 pt-4">
                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-500/70 ml-1">New Assignment</label>
                  <select 
                    className="w-full bg-black/40 border border-white/5 rounded-2xl p-4 text-sm font-bold text-white focus:border-orange-500/40 outline-none transition-all appearance-none" 
                    value={newDesignation} 
                    onChange={e => {
                      setNewDesignation(e.target.value);
                      // Auto-map role based on designation logic
                      if (['Mentor', 'HOD'].includes(e.target.value)) setNewRole('faculty');
                      if (e.target.value === 'Warden') setNewRole('warden');
                      if (e.target.value === 'Deputy Warden') setNewRole('deputy_warden');
                    }}
                  >
                    <option value="" className="bg-zinc-950">Maintain Current</option>
                    <option value="Mentor" className="bg-zinc-950">Mentor (Academic)</option>
                    <option value="HOD" className="bg-zinc-950">Head of Department (Academic)</option>
                    <option value="Warden" className="bg-zinc-950">General Warden (Non-Academic)</option>
                    <option value="Deputy Warden" className="bg-zinc-950">Deputy Warden (Non-Academic)</option>
                    <option value="Staff" className="bg-zinc-950">Regular Staff Personnel</option>
                  </select>
                </div>

                <div className="flex gap-4 pt-6">
                  <button onClick={() => setPromotingId(null)} className="flex-1 py-4 rounded-2xl bg-white/5 text-cos-text-muted text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all">Cancel</button>
                  <button onClick={() => handlePromote(promotingId)} className="flex-1 py-4 rounded-2xl bg-orange-500 text-black text-[10px] font-black uppercase tracking-widest shadow-[0_10px_30px_rgba(255,106,0,0.3)] hover:scale-[1.02] active:scale-95 transition-all">Apply Flux</button>
                </div>
              </div>
           </div>
        </div>
      )}

      {/* Mappings Modal */}
      {showMappingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
           <div className="glass-card p-8 w-full max-w-lg border-cos-primary/30 animate-scale-up">
              <h3 className="text-xl font-black mb-1">Set <span className="gradient-text">Authority Mapping</span></h3>
              <p className="text-[10px] text-cos-text-muted mb-8 uppercase tracking-widest font-black">Link personnel roles to organizational structures</p>
              
              <div className="flex gap-2 p-1 bg-black/20 rounded-xl mb-8 border border-white/5">
                <button type="button" onClick={() => setMappingForm(p => ({ ...p, type: 'class' }))} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${mappingForm.type === 'class' ? 'gradient-bg text-white' : 'text-cos-text-muted'}`}>Academic Class</button>
                <button type="button" onClick={() => setMappingForm(p => ({ ...p, type: 'department' }))} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${mappingForm.type === 'department' ? 'gradient-bg text-white' : 'text-cos-text-muted'}`}>Executive Dept</button>
                <button type="button" onClick={() => setMappingForm(p => ({ ...p, type: 'hostel' }))} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${mappingForm.type === 'hostel' ? 'gradient-bg text-white' : 'text-cos-text-muted'}`}>Residential Block</button>
              </div>

              <form onSubmit={handleCreateMapping} className="space-y-5">
                {mappingForm.type === 'class' ? (
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-cos-text-muted ml-1">Class Identity</label>
                      <input className="input-field" value={mappingForm.className} onChange={e => setMappingForm(p => ({ ...p, className: e.target.value }))} required placeholder="Ex: CSE-A, ECE-B" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-cos-text-muted ml-1">Academic Department</label>
                      <select className="orange-select w-full" value={mappingForm.departmentId} onChange={e => setMappingForm(p => ({ ...p, departmentId: e.target.value }))} required>
                        <option value="">Select Dept...</option>
                        {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-cos-text-muted ml-1">Assigned Mentor</label>
                      <select className="orange-select w-full" value={mappingForm.mentorId} onChange={e => setMappingForm(p => ({ ...p, mentorId: e.target.value }))} required>
                        <option value="">Select Faculty...</option>
                        {faculty.map(f => <option key={f.id} value={f.id}>{f.name} ({f.designation})</option>)}
                      </select>
                    </div>
                  </>
                ) : mappingForm.type === 'department' ? (
                  <>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-cos-text-muted ml-1">Target Department</label>
                       <select className="orange-select w-full" value={mappingForm.departmentId} onChange={e => setMappingForm(p => ({ ...p, departmentId: e.target.value }))} required>
                          <option value="">{departments.length === 0 ? "No Departments Available" : "Select Dept..."}</option>
                          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                       </select>
                       {departments.length === 0 && <p className="text-[9px] text-orange-500 font-bold uppercase tracking-widest mt-2">Initialize structure in Institution Management first.</p>}
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-cos-text-muted ml-1">Assigned HOD</label>
                       <select className="orange-select w-full" value={mappingForm.hodId} onChange={e => setMappingForm(p => ({ ...p, hodId: e.target.value }))} required>
                          <option value="">Select Faculty...</option>
                          {faculty.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                       </select>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-cos-text-muted ml-1">Residential Building</label>
                       <select className="orange-select w-full" value={mappingForm.hostelId} onChange={e => setMappingForm(p => ({ ...p, hostelId: e.target.value }))} required>
                          <option value="">{hostels.length === 0 ? "No Hostels Available" : "Select Building..."}</option>
                          {hostels.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                       </select>
                       {hostels.length === 0 && <p className="text-[9px] text-orange-500 font-bold uppercase tracking-widest mt-2">Create Residential Blocks in Governance Hub first.</p>}
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-black uppercase tracking-widest text-cos-text-muted ml-1">Assigned Warden</label>
                       <select className="orange-select w-full" value={mappingForm.wardenId} onChange={e => setMappingForm(p => ({ ...p, wardenId: e.target.value }))} required>
                          <option value="">Select Personnel...</option>
                          {/* Filter for Warden designations if possible, else show relevant faculty */}
                          {faculty
                            .filter(f => ['Warden', 'Deputy Warden', 'Staff'].includes(f.designation) || f.role === 'warden' || f.role === 'deputy_warden')
                            .map(f => <option key={f.id} value={f.id}>{f.name} ({f.designation || f.role})</option>)}
                       </select>
                       <p className="text-[8px] text-cos-text-muted uppercase font-bold tracking-widest mt-2 pl-1">Only verified faculty with Warden tier enabled.</p>
                    </div>
                  </>
                )}

                <div className="flex gap-4 pt-6">
                  <button type="button" onClick={() => setShowMappingModal(false)} className="flex-1 btn-secondary py-3 text-[10px] font-black uppercase tracking-widest">Cancel</button>
                  <button type="submit" className="flex-1 btn-primary py-3 text-[10px] font-black uppercase tracking-widest">Deploy Mapping</button>
                </div>
              </form>
           </div>
        </div>
      )}
    </div>
  );
}

function GraduationCap(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5L2 10Z"/><path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5"/></svg>
  );
}
