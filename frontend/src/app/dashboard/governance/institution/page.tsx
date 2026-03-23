'use client';

import { useEffect, useState } from 'react';
import { governanceAPI } from '@/lib/api';
import { 
  Building2, Users, GraduationCap, Shield, ChevronRight, 
  Plus, Edit3, Loader2, ArrowRight, LayoutGrid, Home,
  Phone, Mail, MapPin, UserCheck
} from 'lucide-react';

export default function InstitutionPage() {
  const [activeTab, setActiveTab] = useState<'departments' | 'hostels'>('departments');
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drillData, setDrillData] = useState<any>(null);
  const [drillLoading, setDrillLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [selectedFaculty, setSelectedFaculty] = useState<any>(null);
  const [activeClassId, setActiveClassId] = useState<string | null>(null);
  const [showUpsertModal, setShowUpsertModal] = useState(false);
  const [upsertType, setUpsertType] = useState<'add' | 'edit'>('add');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteStep, setDeleteStep] = useState(0);
  const [formLoading, setFormLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    capacity: '',
    type: 'MENS'
  });

  useEffect(() => {
    loadList();
  }, [activeTab]);

  const loadList = async () => {
    setLoading(true);
    try {
      const res = activeTab === 'departments' 
        ? await governanceAPI.getDepartments() 
        : await governanceAPI.getHostels();
      setItems(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadDrillDown = async (id: string) => {
    setSelectedId(id);
    setActiveClassId(null);
    setDrillLoading(true);
    try {
      const res = activeTab === 'departments'
        ? await governanceAPI.getDepartmentDetails(id)
        : await governanceAPI.getHostelDetails(id);
      setDrillData(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setDrillLoading(false);
    }
  };

  const handleOpenUpsert = (type: 'add' | 'edit', item?: any) => {
    setUpsertType(type);
    if (type === 'edit' && item) {
      setFormData({
        name: item.name,
        code: item.code || '',
        description: item.description || '',
        capacity: item.capacity || '',
        type: item.type || 'BOYS'
      });
    } else {
      setFormData({ name: '', code: '', description: '', capacity: '', type: 'BOYS' });
    }
    setShowUpsertModal(true);
  };

  const handleUpsertSync = async () => {
    setFormLoading(true);
    try {
      if (activeTab === 'departments') {
        if (upsertType === 'add') await governanceAPI.createDepartment(formData);
        else await governanceAPI.updateDepartment(selectedId!, formData);
      } else {
        if (upsertType === 'add') await governanceAPI.createHostel(formData);
        else await governanceAPI.updateHostel(selectedId!, formData);
      }
      setShowUpsertModal(false);
      
      // 🔄 FORCE SYNCRONOUS RE-SYNC
      // Added a small delay to ensure backend cache invalidation propagates in development
      setTimeout(async () => {
        await loadList();
        if (selectedId) await loadDrillDown(selectedId);
      }, 300);
      
    } catch (err) { 
      console.error(err); 
      alert('Node synchronization failed. Check nodal connectivity.');
    } finally { 
      setFormLoading(false); 
    }
  };

  const handleDelete = async () => {
     try {
       if (activeTab === 'departments') {
         await governanceAPI.deleteDepartment(deleteConfirmId!);
       } else {
         await governanceAPI.deleteHostel(deleteConfirmId!);
       }
       setDeleteConfirmId(null);
       setDeleteStep(0);
       setSelectedId(null);
       setDrillData(null);
       loadList();
     } catch (err) { console.error(err); }
  };

  return (
    <div className="space-y-6 animate-fade-in relative min-h-screen">
      {/* Student Profile Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in zoom-in-95 duration-300">
          <div className="bg-zinc-950 border border-orange-500/30 rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl shadow-orange-500/10">
            <div className="p-8 border-b border-white/5 bg-gradient-to-br from-orange-500/10 to-transparent flex justify-between items-start">
               <div className="flex gap-6 items-center">
                  <div className="w-20 h-20 rounded-3xl bg-orange-500/20 flex items-center justify-center text-orange-500 text-3xl font-black">{selectedStudent.name?.[0]}</div>
                  <div>
                    <h3 className="text-2xl font-black text-white truncate max-w-[200px] uppercase italic">{selectedStudent.name}</h3>
                    <p className="text-orange-500 text-xs font-bold tracking-widest uppercase mt-1">Roll: {selectedStudent.roll_number}</p>
                    <div className="flex items-center gap-4 mt-3">
                       <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase">Verified Student</span>
                       <span className="text-white/40 text-[10px] uppercase font-bold tracking-tighter">Semester {selectedStudent.semester}</span>
                    </div>
                  </div>
               </div>
               <button onClick={() => setSelectedStudent(null)} className="p-3 rounded-2xl bg-white/5 hover:bg-zinc-900 border border-white/5 text-white/40 hover:text-white transition-all">
                  <ArrowRight className="w-5 h-5 rotate-45" />
               </button>
            </div>
            
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-8 max-h-[60vh] overflow-y-auto custom-scrollbar">
               <div className="space-y-8">
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-500/50 mb-4 ml-1 flex items-center gap-2"><GraduationCap className="w-3 h-3"/> Academic Audit</h4>
                    <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-4 space-y-4">
                       <div className="flex justify-between text-xs items-center px-1"><span className="text-white/40 font-bold uppercase tracking-tight">Assigned Class</span><span className="font-black text-white break-all ml-4 text-right uppercase italic">{selectedStudent.class_name}</span></div>
                       <div className="flex justify-between text-xs items-center px-1"><span className="text-white/40 font-bold uppercase tracking-tight">Academic Year</span><span className="font-black text-white">{selectedStudent.year_of_study} Year</span></div>
                       <div className="flex justify-between text-xs items-center px-1 border-t border-white/5 pt-3"><span className="text-white/30 font-bold uppercase tracking-tight">Reg Batch</span><span className="font-black text-white/60">{selectedStudent.batch_start}-{selectedStudent.batch_end}</span></div>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-500/50 mb-4 ml-1 flex items-center gap-2"><Shield className="w-3 h-3"/> Authority Leads</h4>
                    <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-4 space-y-4">
                       <div className="flex flex-col gap-1 border-b border-white/5 pb-3">
                          <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">Dept Head (HOD)</span>
                          <div className="flex justify-between items-center">
                             <span className="text-xs font-black text-white break-all mr-2 uppercase">{selectedStudent.hod_name || 'Unassigned'}</span>
                             <span className="text-[10px] font-bold text-orange-500 shrink-0">{selectedStudent.hod_phone || '---'}</span>
                          </div>
                       </div>
                       <div className="flex flex-col gap-1">
                          <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">Faculty Mentor</span>
                          <div className="flex justify-between items-center">
                             <span className="text-xs font-black text-white break-all mr-2 uppercase">{selectedStudent.mentor_name || 'Unassigned'}</span>
                             <span className="text-[10px] font-bold text-orange-500 shrink-0">{selectedStudent.mentor_phone || '---'}</span>
                          </div>
                       </div>
                    </div>
                  </div>
               </div>

               <div className="space-y-8">
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-500/50 mb-4 ml-1 flex items-center gap-2"><UserCheck className="w-3 h-3"/> Personal & Guardian</h4>
                    <div className="bg-zinc-900/50 border border-white/5 rounded-2xl p-4 space-y-4">
                       <div className="flex flex-col gap-1">
                          <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">Guardian Details</span>
                          <p className="text-xs font-black text-white break-all uppercase">{selectedStudent.father_name} <span className="text-white/30 text-[10px]">(Father)</span></p>
                          <p className="text-xs font-bold text-orange-500 mt-1 flex items-center gap-2"><Phone className="w-3 h-3"/> {selectedStudent.father_phone || selectedStudent.mother_phone}</p>
                       </div>
                       <div className="flex flex-col gap-1 pt-4 border-t border-white/5">
                          <span className="text-[9px] font-black text-white/20 uppercase tracking-widest flex items-center gap-2"><MapPin className="w-3 h-3"/> Residence Address</span>
                          <p className="text-xs font-medium text-white/80 leading-relaxed italic break-words">{selectedStudent.address || 'Resident address not updated in core database.'}</p>
                       </div>
                    </div>
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Faculty Profile Modal */}
      {selectedFaculty && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in zoom-in-95 duration-300">
          <div className="bg-zinc-950 border border-orange-500/30 rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl shadow-orange-500/10">
            <div className="p-8 border-b border-white/5 bg-gradient-to-br from-orange-500/20 to-transparent flex justify-between items-start">
               <div className="flex gap-6 items-center">
                  <div className="w-20 h-20 rounded-3xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-500 text-3xl font-black italic">{selectedFaculty.name?.[0]}</div>
                  <div>
                    <h3 className="text-2xl font-black text-white truncate max-w-[200px] uppercase italic">{selectedFaculty.name}</h3>
                    <p className="text-orange-500 text-[10px] font-bold tracking-[0.3em] uppercase mt-1">{selectedFaculty.designation || 'Faculty In-Charge'}</p>
                    <div className="flex items-center gap-4 mt-3">
                       <span className="px-2 py-0.5 rounded-lg bg-orange-500/10 text-orange-500 text-[10px] font-black uppercase border border-orange-500/10 italic">Core Staff</span>
                       <span className="text-white/40 text-[10px] uppercase font-bold tracking-tighter">{drillData?.department?.name || 'VCET Institution'}</span>
                    </div>
                  </div>
               </div>
               <button onClick={() => setSelectedFaculty(null)} className="p-3 rounded-2xl bg-white/5 hover:bg-zinc-900 border border-white/5 text-white/40 hover:text-white transition-all">
                  <ArrowRight className="w-5 h-5 rotate-45" />
               </button>
            </div>
            
            <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-10">
               <div className="space-y-8">
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-500/50 flex items-center gap-2"><Mail className="w-3 h-3"/> Communication Link</h4>
                    <div className="p-6 rounded-3xl bg-zinc-900/50 border border-white/5 space-y-4 shadow-inner">
                       <div className="flex flex-col gap-1">
                          <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">Digital Address</span>
                          <p className="text-xs font-black text-white break-all hover:text-orange-500 cursor-pointer transition-colors">{selectedFaculty.email || 'no-email-record@vcet.edu'}</p>
                       </div>
                       <div className="flex flex-col gap-1 pt-3 border-t border-white/5">
                          <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">Nodal Contact</span>
                          <p className="text-xs font-black text-white tracking-widest">{selectedFaculty.phone || 'Contact not listed'}</p>
                       </div>
                    </div>
                  </div>
               </div>

               <div className="space-y-8">
                  <div className="space-y-4">
                    <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-500/50 flex items-center gap-2"><Shield className="w-3 h-3"/> Institutional Standing</h4>
                    <div className="p-6 rounded-3xl bg-zinc-900/50 border border-white/5 space-y-4 shadow-inner">
                       <div className="flex flex-col gap-1">
                          <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">Role Identification</span>
                          <p className="text-xs font-black text-white italic uppercase">{selectedFaculty.role || 'Academic Research'}</p>
                       </div>
                       <div className="flex flex-col gap-1 pt-3 border-t border-white/5">
                          <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">Primary Nodal Node</span>
                          <p className="text-xs font-black text-orange-500/80 uppercase italic tracking-tighter">{drillData?.department?.name || 'Central Command'}</p>
                       </div>
                    </div>
                  </div>
               </div>
            </div>
            
            <div className="p-8 border-t border-white/5 bg-black/40 flex justify-end">
               <button onClick={() => setSelectedFaculty(null)} className="px-8 py-3 rounded-2xl bg-orange-500 text-black text-xs font-black uppercase tracking-widest hover:shadow-xl hover:shadow-orange-500/20 active:scale-95 transition-all italic">Close Audit View</button>
            </div>
          </div>
        </div>
      )}


      {/* Main Header */}
      <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
        <div>
          <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
             <LayoutGrid className="w-7 h-7 text-orange-500" /> Institution <span className="text-white/60">Management</span>
          </h2>
          <p className="text-xs text-cos-text-secondary font-bold uppercase tracking-widest mt-1">Hierarchical Node & Structure Governance</p>
        </div>
        
        <div className="flex p-1 bg-zinc-950 rounded-2xl border border-orange-500/10 w-fit shadow-2xl">
          <button onClick={() => setActiveTab('departments')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${activeTab === 'departments' ? 'bg-orange-500 text-black shadow-lg shadow-orange-500/20' : 'text-cos-text-muted hover:text-white'}`}>Departments</button>
          <button onClick={() => setActiveTab('hostels')} className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${activeTab === 'hostels' ? 'bg-orange-500 text-black shadow-lg shadow-orange-500/20' : 'text-cos-text-muted hover:text-white'}`}>Hostels</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Entity List */}
        <div className="lg:col-span-1 space-y-4">
          <div className="flex justify-between items-center mb-2 px-1">
             <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-500/70">Institutional {activeTab}</h3>
             <button 
               onClick={() => handleOpenUpsert('add')}
               className="p-2 rounded-lg bg-orange-500/10 text-orange-500 border border-orange-500/20 hover:bg-orange-500/20 transition-all"
             >
                <Plus className="w-4 h-4" />
             </button>
          </div>
          
          {loading ? (
            <div className="py-20 flex justify-center"><Loader2 className="w-10 h-10 animate-spin text-orange-500/30" /></div>
          ) : items.map(item => (
            <div 
              key={item.id} 
              onClick={() => loadDrillDown(item.id)}
              className={`p-6 rounded-[2rem] border transition-all duration-500 cursor-pointer group relative overflow-hidden ${selectedId === item.id ? 'bg-zinc-900 border-orange-500/40 shadow-xl scale-[1.02]' : 'bg-black/20 border-white/5 hover:border-white/10 hover:bg-zinc-900/30'}`}
            >
              {selectedId === item.id && <div className="absolute top-0 left-0 w-1 h-full bg-orange-500"></div>}
              <div className="flex justify-between items-start mb-4">
                 <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 ${selectedId === item.id ? 'bg-orange-500 text-black rotate-12' : 'bg-orange-500/5 text-orange-500'}`}>
                    {activeTab === 'departments' ? <Building2 className="w-6 h-6" /> : <Home className="w-6 h-6" />}
                 </div>
                 <ChevronRight className={`w-5 h-5 transition-transform duration-500 ${selectedId === item.id ? 'text-orange-500 rotate-90' : 'text-zinc-800'}`} />
              </div>
              <h4 className="font-black text-white text-lg tracking-tight mb-1 group-hover:text-orange-500 transition-colors uppercase break-all">{item.name}</h4>
              <p className="text-[10px] text-cos-text-muted uppercase tracking-[0.2em] font-black opacity-60">{item.code || item.type}</p>
              
              <div className="mt-6 pt-5 border-t border-white/5 flex gap-6">
                 <div className="flex items-center gap-2 text-white/40">
                    <Users className="w-4 h-4 text-orange-500/40" />
                    <span className="text-xs font-black">{item.student_count || 0}</span>
                 </div>
                 {activeTab === 'departments' && (
                    <div className="flex items-center gap-2 text-white/40">
                       <GraduationCap className="w-4 h-4 text-orange-500/40" />
                       <span className="text-xs font-black">{item.class_count || 0}</span>
                    </div>
                 )}
              </div>
            </div>
          ))}
        </div>

        {/* Right Column: Drill Down Area */}
        <div className="lg:col-span-2">
          {!selectedId ? (
            <div className="h-full min-h-[500px] flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-[3rem] bg-black/5 p-12 text-center">
               <div className="w-24 h-24 rounded-full bg-orange-500/5 flex items-center justify-center mb-8 border border-orange-500/10 animate-pulse">
                  <Shield className="w-10 h-10 text-orange-500/20" />
               </div>
               <p className="text-[11px] font-black uppercase tracking-[0.4em] text-white/20">Select a Nodal Root to audit hierarchy</p>
            </div>
          ) : drillLoading ? (
            <div className="h-full min-h-[500px] flex items-center justify-center"><Loader2 className="w-16 h-16 animate-spin text-orange-500" /></div>
          ) : (
            <div className="space-y-10 animate-fade-in pb-20">
               {/* Central Insight Card */}
               <div className="p-10 rounded-[3rem] bg-zinc-950 border border-orange-500/20 relative overflow-hidden group shadow-2xl">
                  <div className="absolute top-0 right-0 w-80 h-80 bg-orange-500/10 rounded-full blur-[100px] -mr-40 -mt-40"></div>
                  <div className="relative z-10">
                     <div className="flex justify-between items-start">
                         <div className="max-w-[80%]">
                            <div className="flex items-center gap-3">
                               <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse"></span>
                               <span className="text-[10px] font-black uppercase tracking-widest text-orange-500">
                                 {activeTab === 'departments' ? 'Department Insights' : 'Hostel Insights'}
                               </span>
                            </div>
                            <h3 className="text-4xl font-black text-white mt-4 tracking-tighter uppercase italic break-all leading-[0.9]">
                              {activeTab === 'departments' ? drillData?.department?.name : drillData?.hostel?.name}
                            </h3>
                         </div>
                         <div className="flex gap-3 shrink-0">
                            <button 
                              onClick={() => handleOpenUpsert('edit', drillData?.department || drillData?.hostel)}
                              className="p-4 rounded-2xl bg-white/5 text-white/40 hover:text-white hover:bg-zinc-900 transition-all border border-white/5 shadow-lg group/btn"
                            >
                               <Edit3 className="w-5 h-5 group-hover/btn:rotate-12 transition-transform" />
                            </button>
                            <button 
                              onClick={() => {
                                setDeleteConfirmId(selectedId);
                                setDeleteStep(1);
                              }}
                              className="p-4 rounded-2xl bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all border border-red-500/20 shadow-lg group/del"
                            >
                               <Plus className="w-5 h-5 rotate-45 group-hover/del:scale-110 transition-transform" />
                            </button>
                         </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
                          <div className="p-6 rounded-3xl bg-black/60 border border-white/5 hover:border-orange-500/30 transition-all group/stat">
                             <span className="text-[9px] font-black uppercase tracking-widest text-orange-500/50 block mb-3">
                               {activeTab === 'departments' ? 'Head of the Department' : 'Warden Name'}
                             </span>
                             <p className="font-black text-white text-lg tracking-tight group-hover/stat:text-orange-500 transition-colors uppercase break-all">
                               {activeTab === 'departments' ? (drillData?.department?.hod_name || 'Unassigned') : (drillData?.hostel?.warden_name || 'Unassigned')}
                             </p>
                             <p className="text-[10px] text-white/20 font-bold mt-1 uppercase tracking-tighter truncate">
                               {activeTab === 'departments' ? drillData?.department?.hod_email : drillData?.hostel?.warden_email}
                             </p>
                          </div>
                          {activeTab === 'departments' && (
                            <div className="p-6 rounded-3xl bg-black/60 border border-white/5">
                             <span className="text-[9px] font-black uppercase tracking-widest text-orange-500/50 block mb-3">Faculty Count</span>
                             <p className="font-black text-white text-3xl tracking-tighter italic">{drillData?.department?.faculties_count || 0}</p>
                             <p className="text-[10px] text-white/20 font-black uppercase mt-1 tracking-widest">Registered Staff</p>
                            </div>
                          )}
                          <div className="p-6 rounded-3xl bg-black/60 border border-white/5">
                             <span className="text-[9px] font-black uppercase tracking-widest text-orange-500/50 block mb-3">Students Count</span>
                             <p className="font-black text-white text-3xl tracking-tighter italic">{drillData?.department?.students_count || drillData?.students?.length || 0}</p>
                             <p className="text-[10px] text-white/20 font-black uppercase mt-1 tracking-widest">Active Entries</p>
                          </div>
                      </div>
                   </div>
                </div>

                {/* Hierarchy & Audit Visualization */}
                <div className="space-y-12">
                   {activeTab === 'departments' ? (
                     <>
                        {/* 1. Department Audit Section */}
                        <div className="space-y-6">
                           <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 ml-6 flex items-center gap-3">
                             <Shield className="w-3 h-3 text-orange-500"/> Department Audit
                           </h3>
                           
                           <div className="p-8 rounded-[3rem] bg-black/20 border border-white/5 space-y-10">
                              {/* HOD & Faculty Command */}
                              <div className="space-y-4">
                                 <span className="text-[9px] font-black uppercase tracking-widest text-orange-500/40 ml-4 italic">Command Personnel</span>
                                 <div className="flex flex-wrap gap-4">
                                    <div 
                                      onClick={() => drillData?.department?.hod_id && setSelectedFaculty({
                                        id: drillData.department.hod_id,
                                        name: drillData.department.hod_name,
                                        email: drillData.department.hod_email,
                                        phone: drillData.department.hod_phone,
                                        designation: 'Head of Department',
                                        role: 'FACULTY'
                                      })}
                                      className="p-4 rounded-[2rem] bg-orange-500 shadow-xl shadow-orange-500/10 flex items-center gap-4 cursor-pointer hover:rotate-1 hover:scale-105 transition-all group/hod"
                                    >
                                       <div className="w-10 h-10 rounded-2xl bg-black flex items-center justify-center text-orange-500 text-sm font-black italic shadow-2xl">H</div>
                                       <div>
                                          <p className="text-xs font-black text-black uppercase tracking-tight break-all">{drillData?.department?.hod_name || 'No HOD Assigned'}</p>
                                          <p className="text-[8px] text-black/60 uppercase tracking-widest font-black leading-none mt-1">Administrator Reference</p>
                                       </div>
                                       <ArrowRight className="w-3 h-3 text-black/40 group-hover/hod:translate-x-1 transition-transform" />
                                    </div>
                                    
                                    {drillData?.faculties?.map((fac: any) => (
                                       <div 
                                         key={fac.id} 
                                         onClick={() => setSelectedFaculty(fac)}
                                         className="p-4 rounded-[2rem] bg-zinc-950 border border-white/5 flex items-center gap-4 cursor-pointer hover:bg-zinc-900 transition-all group/fac"
                                       >
                                          <div className="w-10 h-10 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center text-white/20 text-xs font-black transition-all group-hover/fac:bg-orange-500 group-hover/fac:text-black shrink-0">{fac.name?.[0]}</div>
                                          <div>
                                             <p className="text-xs font-black text-white group-hover/fac:text-orange-500 transition-colors uppercase tracking-tight break-all">{fac.name}</p>
                                             <p className="text-[8px] text-white/20 uppercase tracking-widest font-bold mt-0.5">{fac.designation || 'Academic Staff'}</p>
                                          </div>
                                       </div>
                                    ))}
                                    {(!drillData?.faculties || drillData.faculties.length === 0) && (
                                       <div className="px-6 py-4 rounded-3xl border border-dashed border-white/5 text-[10px] text-white/20 font-black uppercase tracking-widest italic font-medium">No staff members belong to this department</div>
                                    )}
                                 </div>
                              </div>

                              {/* Academic Sections Structure */}
                              <div className="space-y-4">
                                 <span className="text-[9px] font-black uppercase tracking-widest text-orange-500/40 ml-4 italic">Academic Divisions</span>
                                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {drillData?.classes?.map((cls: any) => (
                                       <div 
                                         key={cls.id} 
                                         onClick={() => setActiveClassId(activeClassId === cls.id ? null : cls.id)}
                                         className={`p-6 rounded-[2.5rem] border transition-all duration-500 flex items-center justify-between cursor-pointer group/node ${activeClassId === cls.id ? 'bg-orange-500 border-orange-500 shadow-xl shadow-orange-500/20' : 'bg-zinc-950 border-white/5 hover:border-white/10'}`}
                                       >
                                          <div className="flex items-center gap-4">
                                             <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${activeClassId === cls.id ? 'bg-black text-orange-500 shadow-lg' : 'bg-black/40 text-white/20'} shrink-0`}>
                                                <GraduationCap className="w-5 h-5" />
                                             </div>
                                             <div>
                                                <p className={`text-sm font-black uppercase italic tracking-tighter break-all ${activeClassId === cls.id ? 'text-black' : 'text-white'}`}>{cls.name}</p>
                                                <p className={`text-[8px] font-black uppercase tracking-widest mt-0.5 ${activeClassId === cls.id ? 'text-black/60' : 'text-white/20'}`}>Audit Sub-Node</p>
                                             </div>
                                          </div>
                                          <div className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all ${activeClassId === cls.id ? 'bg-black/10 border-black/20 text-black' : 'border-white/5 text-white/10'} shrink-0`}>
                                             <ChevronRight className={`w-4 h-4 transition-transform ${activeClassId === cls.id ? 'rotate-90' : ''}`} />
                                          </div>
                                       </div>
                                    ))}
                                    {(!drillData?.classes || drillData.classes.length === 0) && (
                                       <div className="col-span-full py-10 rounded-[2.5rem] border-2 border-dashed border-white/5 text-center text-[10px] font-black text-white/20 uppercase tracking-widest italic font-medium">No academic classes mapped to this department</div>
                                    )}
                                 </div>
                              </div>
                           </div>
                        </div>

                        {/* 2. Section Audit View */}
                        {activeClassId && (
                           <div className="space-y-6 animate-in slide-in-from-top-10 duration-700">
                              <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 ml-6 flex items-center gap-3">
                                <Users className="w-3 h-3 text-orange-500"/> Section Audit: {drillData?.classes?.find((c:any) => c.id === activeClassId)?.name}
                              </h3>
                              <div className="p-8 rounded-[3rem] bg-zinc-950 border border-orange-500/20">
                                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                                    {drillData?.students?.filter((s:any) => s.class_id === activeClassId).map((s:any) => (
                                       <div 
                                         key={s.id} 
                                         onClick={() => setSelectedStudent(s)}
                                         className="p-5 rounded-[2rem] bg-black/40 border border-white/5 flex items-center justify-between group hover:border-orange-500/30 hover:bg-zinc-900 transition-all cursor-pointer shadow-lg"
                                       >
                                          <div className="flex items-center gap-4 truncate">
                                             <div className="w-10 h-10 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-500 font-black italic shrink-0">{s.name?.[0]}</div>
                                             <div className="truncate">
                                                <p className="text-xs font-black text-white group-hover:text-orange-500 transition-colors uppercase italic tracking-tight truncate break-all">{s.name}</p>
                                                <p className="text-[9px] text-white/20 font-black uppercase mt-0.5 truncate">{s.roll_number}</p>
                                             </div>
                                          </div>
                                          <ArrowRight className="w-4 h-4 text-white/10 group-hover:text-orange-500 shrink-0" />
                                       </div>
                                    ))}
                                    {(drillData?.students?.filter((s:any) => s.class_id === activeClassId).length === 0) && (
                                       <div className="col-span-full py-20 text-center text-[11px] font-black uppercase tracking-[0.5em] text-white/10 italic">
                                          No student belongs to this section
                                       </div>
                                    )}
                                 </div>
                              </div>
                           </div>
                        )}
                     </>
                   ) : (
                     /* Hostel Audit Perspective */
                     <div className="space-y-6">
                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30 ml-6 flex items-center gap-3">
                          <Home className="w-3 h-3 text-orange-500"/> Residential Audit
                        </h3>
                        
                        <div className="p-8 rounded-[3rem] bg-black/20 border border-white/5">
                           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                              {drillData?.students?.map((s: any) => (
                                 <div 
                                   key={s.id} 
                                   onClick={() => setSelectedStudent(s)}
                                   className="p-5 rounded-[2rem] bg-zinc-950 border border-white/5 flex items-center justify-between group hover:border-orange-500/30 hover:bg-zinc-900 transition-all cursor-pointer shadow-lg"
                                 >
                                    <div className="flex items-center gap-4 truncate">
                                       <div className="w-10 h-10 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-500 font-black italic shrink-0">{s.name?.[0]}</div>
                                       <div className="truncate">
                                          <p className="text-xs font-black text-white group-hover:text-orange-500 transition-colors uppercase italic tracking-tight truncate break-all">{s.name}</p>
                                          <p className="text-[9px] text-white/20 font-black uppercase mt-0.5 italic">ROOM: {s.room_number || 'TBD'}</p>
                                       </div>
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-white/10 group-hover:text-orange-500 shrink-0" />
                                 </div>
                              ))}
                              {(!drillData?.students || drillData.students.length === 0) && (
                                 <div className="col-span-full py-24 text-center">
                                    <p className="text-[11px] font-black uppercase tracking-[0.5em] text-white/10 italic">
                                      No student residing in {drillData?.hostel?.name || 'this'} hostel
                                    </p>
                                 </div>
                              )}
                           </div>
                        </div>
                     </div>
                   )}
                </div>
            </div>
          )}
        </div>
      </div>
      {/* Upsert Modal (Department/Hostel) */}
      {showUpsertModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
           <div className="bg-zinc-950 border border-orange-500/30 rounded-[3rem] w-full max-w-2xl overflow-hidden shadow-2xl relative">
              <div className="p-8 border-b border-white/5 bg-gradient-to-br from-orange-500/10 to-transparent flex justify-between items-center">
                 <div>
                    <h3 className="text-xl font-black text-white italic uppercase tracking-tight">{upsertType === 'add' ? 'Instantiate' : 'Reconfigure'} {activeTab === 'departments' ? 'Department' : 'Hostel'}</h3>
                    <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-1">Institutional Node Calibration</p>
                 </div>
                 <button onClick={() => setShowUpsertModal(false)} className="p-3 rounded-2xl bg-white/5 hover:bg-zinc-900 border border-white/5 text-white/40 hover:text-white transition-all"><Plus className="w-5 h-5 rotate-45" /></button>
              </div>

              <div className="p-10 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-orange-500/60 uppercase tracking-widest ml-1">Core Name</label>
                       <input 
                         type="text" 
                         value={formData.name}
                         onChange={e => setFormData({...formData, name: e.target.value})}
                         className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm focus:border-orange-500/50 outline-none transition-all font-black uppercase italic"
                         placeholder="e.g. COMPUTER SCIENCE"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-orange-500/60 uppercase tracking-widest ml-1">{activeTab === 'departments' ? 'Dept Code' : 'Capacity'}</label>
                       <input 
                         type={activeTab === 'departments' ? "text" : "number"}
                         value={activeTab === 'departments' ? formData.code : formData.capacity}
                         onChange={e => setFormData({...formData, [activeTab === 'departments' ? 'code' : 'capacity']: e.target.value})}
                         className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm focus:border-orange-500/50 outline-none transition-all font-black uppercase"
                         placeholder={activeTab === 'departments' ? "CS" : "200"}
                       />
                    </div>
                 </div>

                 {activeTab === 'hostels' && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-top-4 duration-500">
                       <label className="text-[9px] font-black text-orange-500/60 uppercase tracking-widest ml-1 italic">Residential Identification (MENS/WOMENS)</label>
                       <div className="flex gap-4 p-1 bg-black/40 border border-white/5 rounded-2xl relative overflow-hidden">
                          <div className={`absolute inset-1 w-[calc(50%-4px)] bg-orange-500 rounded-xl transition-all duration-500 ease-out shadow-lg shadow-orange-500/20 ${formData.type === 'WOMENS' ? 'translate-x-full' : 'translate-x-0'}`} />
                          {['MENS', 'WOMENS'].map(t => (
                             <button
                               key={t}
                               type="button"
                               onClick={() => setFormData({...formData, type: t})}
                               className={`flex-1 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest relative z-10 transition-colors duration-500 ${formData.type === t ? 'text-black' : 'text-white/20 hover:text-white'}`}
                             >
                                {t} HOSTEL
                             </button>
                          ))}
                       </div>
                    </div>
                 )}

                 <div className="space-y-2">
                    <label className="text-[9px] font-black text-orange-500/60 uppercase tracking-widest ml-1">Contextual Description</label>
                    <textarea 
                      value={formData.description}
                      onChange={e => setFormData({...formData, description: e.target.value})}
                      className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-4 text-white text-sm focus:border-orange-500/50 outline-none transition-all font-black uppercase min-h-[100px]"
                      placeholder="Audit context for this nodal root..."
                    />
                 </div>
              </div>

              <div className="p-8 border-t border-white/5 bg-black/40 flex justify-end gap-4">
                 <button onClick={() => setShowUpsertModal(false)} className="px-6 py-3 rounded-xl border border-white/5 text-[10px] font-black uppercase text-white/40 hover:text-white transition-all">Cancel</button>
                 <button 
                   onClick={handleUpsertSync}
                   disabled={formLoading}
                   className="px-10 py-3 rounded-xl bg-orange-500 text-black text-[10px] font-black uppercase tracking-widest hover:shadow-xl hover:shadow-orange-500/20 active:scale-95 transition-all flex items-center gap-2"
                 >
                    {formLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Edit3 className="w-4 h-4" />}
                    {upsertType === 'add' ? 'Commit Node' : 'Update Audit'}
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Delete Confirmation Modal (Defensive) */}
      {deleteStep > 0 && (
         <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/95 backdrop-blur-2xl">
            <div className="bg-zinc-950 border border-red-500/30 rounded-[3rem] w-full max-w-md p-12 text-center space-y-8 shadow-2xl shadow-red-500/10">
               <div className="w-24 h-24 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto animate-pulse">
                  <Shield className="w-10 h-10 text-red-500" />
               </div>
               
               <div className="space-y-2">
                  <h3 className="text-2xl font-black text-white italic uppercase tracking-tighter">
                     {deleteStep === 1 ? 'Structural Sanitization' : 'Final Nodal Purge'}
                  </h3>
                  <p className="text-xs text-white/40 font-bold uppercase tracking-widest leading-relaxed">
                     {deleteStep === 1 
                       ? `Are you absolutely certain to delete this ${activeTab.slice(0, -1)}? All leaf nodes may be affected.` 
                       : 'This is the final barrier. Confirming will permanently expunge this entity from the core database.'}
                  </p>
               </div>

               <div className="flex flex-col gap-3">
                  {deleteStep === 1 ? (
                    <button 
                      onClick={() => setDeleteStep(2)}
                      className="w-full py-4 rounded-2xl bg-red-500 text-black font-black uppercase text-xs tracking-[0.2em] hover:shadow-xl hover:shadow-red-500/30 transition-all italic"
                    >
                       Acknowledge Destruction
                    </button>
                  ) : (
                    <button 
                      onClick={handleDelete}
                      className="w-full py-4 rounded-2xl bg-red-600 text-white font-black uppercase text-xs tracking-[0.3em] hover:bg-red-500 transition-all border-b-4 border-red-900 shadow-2xl"
                    >
                       EXECUTE PURGE
                    </button>
                  )}
                  <button 
                    onClick={() => {
                      setDeleteConfirmId(null);
                      setDeleteStep(0);
                    }}
                    className="w-full py-4 rounded-2xl bg-white/5 text-white/20 font-black uppercase text-xs tracking-widest hover:text-white transition-all"
                  >
                     Abort Operations
                  </button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
}
