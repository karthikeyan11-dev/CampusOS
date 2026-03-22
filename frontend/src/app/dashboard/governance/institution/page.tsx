'use client';

import { useEffect, useState } from 'react';
import { governanceAPI } from '@/lib/api';
import { 
  Building2, Users, GraduationCap, Shield, ChevronRight, 
  Plus, Trash2, Edit3, Loader2, ArrowRight, LayoutGrid, Home
} from 'lucide-react';

export default function InstitutionPage() {
  const [activeTab, setActiveTab] = useState<'departments' | 'hostels'>('departments');
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drillData, setDrillData] = useState<any>(null);
  const [drillLoading, setDrillLoading] = useState(false);

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

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
        <div>
          <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
             <LayoutGrid className="w-7 h-7 text-orange-500" /> Institution <span className="text-white/60">Management</span>
          </h2>
          <p className="text-xs text-cos-text-secondary font-bold uppercase tracking-widest mt-1">Entity Hierarchy & Structure Governance</p>
        </div>
        
        <div className="flex p-1 bg-zinc-950 rounded-2xl border border-orange-500/10 w-fit">
          <button onClick={() => setActiveTab('departments')} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'departments' ? 'bg-orange-500 text-black shadow-lg shadow-orange-500/20' : 'text-cos-text-muted hover:text-white'}`}>Departments</button>
          <button onClick={() => setActiveTab('hostels')} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'hostels' ? 'bg-orange-500 text-black shadow-lg shadow-orange-500/20' : 'text-cos-text-muted hover:text-white'}`}>Hostels</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Entity List */}
        <div className="lg:col-span-1 space-y-4">
          <div className="flex justify-between items-center mb-2 px-1">
             <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-500/70">Institutional {activeTab}</h3>
             <button className="p-2 rounded-lg bg-orange-500/10 text-orange-500 border border-orange-500/20 hover:bg-orange-500/20"><Plus className="w-4 h-4" /></button>
          </div>
          
          {loading ? (
            <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-orange-500/50" /></div>
          ) : items.map(item => (
            <div 
              key={item.id} 
              onClick={() => loadDrillDown(item.id)}
              className={`p-5 rounded-[1.5rem] border transition-all cursor-pointer group ${selectedId === item.id ? 'bg-zinc-900 border-orange-500/30' : 'bg-black/20 border-white/5 hover:border-white/10'}`}
            >
              <div className="flex justify-between items-start mb-3">
                 <div className="w-10 h-10 rounded-xl bg-orange-500/5 flex items-center justify-center text-orange-500 group-hover:scale-110 transition-transform">
                    {activeTab === 'departments' ? <Building2 className="w-5 h-5" /> : <Home className="w-5 h-5" />}
                 </div>
                 <ChevronRight className={`w-4 h-4 transition-transform ${selectedId === item.id ? 'text-orange-500 rotate-90' : 'text-cos-text-muted'}`} />
              </div>
              <h4 className="font-bold text-white mb-1">{item.name}</h4>
              <p className="text-[10px] text-cos-text-muted uppercase tracking-widest font-bold">{item.code || item.type}</p>
              
              <div className="mt-4 pt-4 border-t border-white/5 flex gap-4">
                 <div className="flex items-center gap-1.5 text-orange-500/50">
                    <Users className="w-3 h-3" />
                    <span className="text-[10px] font-bold">{item.student_count || 0}</span>
                 </div>
                 {activeTab === 'departments' && (
                    <div className="flex items-center gap-1.5 text-cos-text-muted/50">
                       <LayoutGrid className="w-3 h-3" />
                       <span className="text-[10px] font-bold">{item.class_count || 0}</span>
                    </div>
                 )}
              </div>
            </div>
          ))}
        </div>

        {/* Drill Down Area */}
        <div className="lg:col-span-2">
          {!selectedId ? (
            <div className="h-full flex flex-col items-center justify-center py-40 border border-dashed border-white/5 rounded-[2rem] bg-black/5">
               <Shield className="w-16 h-16 text-white/5 mb-6" />
               <p className="text-[10px] font-black uppercase tracking-[0.3em] text-cos-text-muted">Select an entity to audit hierarchy</p>
            </div>
          ) : drillLoading ? (
            <div className="h-full flex items-center justify-center py-40"><Loader2 className="w-12 h-12 animate-spin text-orange-500" /></div>
          ) : (
            <div className="space-y-6 animate-fade-in">
              {/* Header Info */}
              <div className="p-8 rounded-[2.5rem] bg-zinc-950 border border-orange-500/20 relative overflow-hidden group">
                 <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
                 <div className="relative z-10">
                    <div className="flex justify-between items-start">
                        <div>
                           <span className="px-3 py-1 rounded-full bg-orange-500/10 text-orange-500 text-[9px] font-black uppercase tracking-widest border border-orange-500/20">Active Node</span>
                           <h3 className="text-3xl font-black text-white mt-4 tracking-tighter">
                             {activeTab === 'departments' ? drillData?.department?.name : drillData?.hostel?.name}
                           </h3>
                           <p className="text-cos-text-muted text-xs mt-2 font-medium opacity-60">Entity ID: {selectedId}</p>
                        </div>
                        <button className="p-3 rounded-2xl bg-white/5 text-white hover:bg-white/10 transition-all border border-white/10"><Edit3 className="w-5 h-5" /></button>
                     </div>

                     <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 mt-10">
                         <div className="p-4 rounded-2xl bg-black/40 border border-white/5">
                            <span className="text-[9px] font-black uppercase tracking-widest text-orange-500/50 block mb-2">Authority Lead</span>
                            <p className="font-bold text-white text-sm">
                              {activeTab === 'departments' ? drillData?.department?.hod_name : drillData?.hostel?.warden_name}
                              {(activeTab === 'departments' ? !drillData?.department?.hod_name : !drillData?.hostel?.warden_name) && ' Unassigned'}
                            </p>
                         </div>
                         {activeTab === 'departments' && (
                           <div className="p-4 rounded-2xl bg-black/40 border border-white/5">
                            <span className="text-[9px] font-black uppercase tracking-widest text-orange-500/50 block mb-2">Infrastructure</span>
                            <p className="font-bold text-white text-sm">{drillData?.classes?.length || 0} Academic Blocks</p>
                           </div>
                         )}
                         <div className="p-4 rounded-2xl bg-black/40 border border-white/5">
                            <span className="text-[9px] font-black uppercase tracking-widest text-orange-500/50 block mb-2">Aggregate Population</span>
                            <p className="font-bold text-white text-sm">{drillData?.students?.length || 0} Direct Members</p>
                         </div>
                     </div>
                  </div>
               </div>

               {/* Hierarchy Tree Visual */}
               {activeTab === 'departments' ? (
                 <div className="space-y-6">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-4">Academic Groups Hierarchy</h3>
                    {drillData?.classes?.map((cls: any) => (
                      <div key={cls.id} className="p-6 rounded-[2rem] bg-black/20 border border-white/5">
                         <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-4">
                               <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-500"><GraduationCap className="w-5 h-5" /></div>
                               <div>
                                  <h4 className="font-bold text-white">{cls.name}</h4>
                                  <p className="text-[10px] text-cos-text-muted uppercase tracking-widest">Mentor: {cls.mentor_name || 'N/A'}</p>
                               </div>
                            </div>
                            <span className="px-3 py-1 rounded-lg bg-white/5 text-[9px] font-black text-cos-text-muted">
                              {drillData?.students?.filter((s:any) => s.class_name === cls.name).length || 0} Students
                            </span>
                         </div>
                         
                         <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {drillData?.students?.filter((s:any) => s.class_name === cls.name).map((s:any) => (
                               <div key={s.id} className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center gap-2 group hover:bg-white/10 transition-all">
                                  <div className="w-6 h-6 rounded-lg bg-black/20 flex items-center justify-center text-[10px] font-black text-orange-500/50">{s.name[0]}</div>
                                  <div className="truncate">
                                     <p className="text-[10px] font-bold text-white truncate">{s.name}</p>
                                     <p className="text-[8px] text-white/20 uppercase truncate italic">Roll: {s.roll_number}</p>
                                  </div>
                               </div>
                            ))}
                         </div>
                      </div>
                   ))}
                </div>
              ) : (
                <div className="space-y-6">
                   <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-4">Residential Population</h3>
                   <div className="p-6 rounded-[2rem] bg-black/20 border border-white/5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                         {drillData.students.map((s: any) => (
                            <div key={s.id} className="p-4 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between group hover:bg-white/10 transition-all">
                               <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-500 font-black">{s.name[0]}</div>
                                  <div>
                                     <p className="text-[10px] font-black text-white">{s.name}</p>
                                     <p className="text-[8px] text-white/30 uppercase">Room: {s.room_number || 'TBD'}</p>
                                  </div>
                               </div>
                               <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div></div>
                            </div>
                         ))}
                      </div>
                   </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
