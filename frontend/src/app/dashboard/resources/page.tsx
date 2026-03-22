'use client';

import { useEffect, useState, useMemo } from 'react';
import { resourceAPI, departmentAPI } from '@/lib/api';
import { useAuthStore } from '@/stores/auth.store';
import { formatDateTime, getStatusColor } from '@/lib/utils';
import { 
  Calendar, Plus, Loader2, X, Send, Clock, MapPin, 
  Users, Monitor, Search, Edit2, Trash2, AlertTriangle, Check,
  ChevronLeft, ChevronRight, Info
} from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { 
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
  addDays, isSameMonth, isSameDay, addMonths, subMonths, parseISO 
} from 'date-fns';

type TabType = 'resources' | 'requests' | 'bookings';

export default function ResourcesPage() {
  const { user } = useAuthStore();
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as any) || 'resources';

  const [resources, setResources] = useState<any[]>([]);
  const [allBookings, setAllBookings] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals
  const [showManageResource, setShowManageResource] = useState(false);
  const [editingResource, setEditingResource] = useState<any>(null);
  const [showBook, setShowBook] = useState(false);
  const [showCalendarDetail, setShowCalendarDetail] = useState<any>(null);
  
  const [tab, setTab] = useState<TabType>(initialTab);
  const [conflicts, setConflicts] = useState<Record<string, any[]>>({});
  const [verifiedRequests, setVerifiedRequests] = useState<Record<string, boolean>>({});

  // Calendar State
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());

  const [resourceForm, setResourceForm] = useState({
    name: '', type: 'seminar_hall', location: '', capacity: '', department_id: '', description: ''
  });
  
  const [bookForm, setBookForm] = useState({
    resourceId: '', title: '', purpose: '', startTime: '', endTime: '',
  });

  const [processing, setProcessing] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [resRes, bookRes, deptRes] = await Promise.allSettled([
        resourceAPI.getAll(),
        resourceAPI.getBookings(),
        departmentAPI.getAll()
      ]);
      
      if (resRes.status === 'fulfilled') setResources(resRes.value.data.data || []);
      if (bookRes.status === 'fulfilled') {
        const bookingsData = bookRes.value.data.data || [];
        setAllBookings(bookingsData);
        // Pre-check conflicts for pending bookings
        bookingsData.forEach((b: any) => {
          if (b.status === 'pending') checkConflicts(b);
        });
      }
      if (deptRes.status === 'fulfilled') setDepartments(deptRes.value.data.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const checkConflicts = async (booking: any) => {
    try {
      const res = await resourceAPI.checkConflicts(
        booking.resource_id, 
        booking.start_time, 
        booking.end_time, 
        booking.id
      );
      setConflicts(prev => ({ ...prev, [booking.id]: res.data.conflicts }));
    } catch (err) { console.error(err); }
  };

  // Filter bookings for tabs
  const pendingRequests = useMemo(() => 
    allBookings.filter(b => b.status === 'pending').sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()), 
  [allBookings]);
  
  const approvedAllocations = useMemo(() => 
    allBookings.filter(b => b.status === 'approved'), 
  [allBookings]);

  const handleResourceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    try {
      if (editingResource) {
        await resourceAPI.update(editingResource.id, resourceForm);
      } else {
        await resourceAPI.create(resourceForm);
      }
      setShowManageResource(false);
      loadData();
    } catch (err: any) { alert(err.response?.data?.message || 'Action failed'); }
    finally { setProcessing(false); }
  };

  const handleDeleteResource = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this asset?')) return;
    try {
      await resourceAPI.delete(id);
      loadData();
    } catch (err: any) { alert(err.response?.data?.message || 'Delete failed'); }
  };

  const handleBookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    try {
      await resourceAPI.book(bookForm);
      setShowBook(false);
      setBookForm({ resourceId: '', title: '', purpose: '', startTime: '', endTime: '' });
      loadData();
    } catch (err: any) { alert(err.response?.data?.message || 'Booking failed'); }
    finally { setProcessing(false); }
  };

  const handleApproveBooking = async (id: string, action: string) => {
    try {
      await resourceAPI.approveBooking(id, action);
      loadData();
    } catch (err: any) { alert(err.response?.data?.message || 'Failed'); }
  };

  const isSuperAdmin = user?.role === 'super_admin';
  const isFaculty = user?.role === 'faculty';
  const isAdmin = ['department_admin', 'super_admin'].includes(user?.role || '');

  // Calendar Rendering
  const renderHeader = () => {
    return (
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-black uppercase tracking-widest text-cos-text-muted">{format(currentMonth, 'MMMM yyyy')}</h3>
        <div className="flex gap-2">
          <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1 hover:bg-white/5 rounded"><ChevronLeft className="w-4 h-4" /></button>
          <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1 hover:bg-white/5 rounded"><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>
    );
  };

  const renderDays = () => {
    const dateFormat = "EEEEEE";
    const days = [];
    let startDate = startOfWeek(currentMonth);
    for (let i = 0; i < 7; i++) {
      days.push(
        <div key={i} className="text-[10px] font-black uppercase tracking-widest text-cos-text-muted text-center py-2 bg-white/5 rounded-md">
          {format(addDays(startDate, i), dateFormat)}
        </div>
      );
    }
    return <div className="grid grid-cols-7 gap-1 mb-1">{days}</div>;
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const rows = [];
    let days = [];
    let day = startDate;
    let formattedDate = "";

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        formattedDate = format(day, "d");
        const cloneDay = day;
        const bookingsForDay = approvedAllocations.filter(b => isSameDay(parseISO(b.start_time), cloneDay));
        const hasBooking = bookingsForDay.length > 0;

        days.push(
          <div key={day.toString()} 
            className={`h-12 border border-white/5 rounded-md relative cursor-pointer hover:bg-white/10 transition-colors ${!isSameMonth(day, monthStart) ? 'opacity-20 pointer-events-none' : ''} ${isSameDay(day, selectedDate) ? 'bg-cos-primary/10 border-cos-primary/30' : 'bg-cos-bg-card'}`}
            onClick={() => { setSelectedDate(cloneDay); if(hasBooking) setShowCalendarDetail(bookingsForDay); }}>
            <span className="absolute top-1 left-1.5 text-[10px] font-bold text-cos-text-secondary">{formattedDate}</span>
            {hasBooking && (
                <div className="absolute bottom-1 right-1 flex gap-0.5">
                    {bookingsForDay.slice(0, 3).map((_, idx) => (
                        <div key={idx} className="w-1.5 h-1.5 rounded-full bg-cos-primary" />
                    ))}
                    {bookingsForDay.length > 3 && <div className="w-1.5 h-1.5 rounded-full bg-white/20" />}
                </div>
            )}
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(<div className="grid grid-cols-7 gap-1" key={day.toString()}>{days}</div>);
      days = [];
    }
    return <div className="space-y-1">{rows}</div>;
  };

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
            <Calendar className="w-5 h-5 text-emerald-400" /> Resource Matrix
          </h2>
          <p className="text-sm text-cos-text-secondary mt-1">
            {isSuperAdmin ? 'Full institutional asset governance' : 'Access and book campus facilities'}
          </p>
        </div>
        <div className="flex gap-2">
          {isSuperAdmin && (
            <button onClick={() => { setEditingResource(null); setResourceForm({ name: '', type: 'seminar_hall', location: '', capacity: '', department_id: '', description: '' }); setShowManageResource(true); }} 
              className="btn-secondary flex items-center gap-2 text-sm border-cos-primary/20 text-cos-primary">
              <Plus className="w-4 h-4" /> Add Asset
            </button>
          )}
          {isFaculty && (
            <button onClick={() => setShowBook(true)} className="btn-primary flex items-center gap-2 text-sm">
              <Plus className="w-4 h-4" /> Request Allocation
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-black/20 rounded-xl border border-white/5 w-fit">
        {(isSuperAdmin ? ['resources', 'requests', 'bookings'] : ['resources', 'bookings']).map((t: any) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${tab === t ? 'gradient-bg text-white' : 'text-cos-text-muted hover:text-white'}`}>
            {t === 'resources' ? 'Assets' : t === 'requests' ? 'Requests' : 'Allocations'}
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
              <div key={res.id} className="glass-card glass-card-hover p-5 border-white/5">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm tracking-tight">{res.name}</h3>
                      <p className="text-[10px] text-cos-text-muted uppercase tracking-widest font-bold">{res.type?.replace(/_/g, ' ')}</p>
                    </div>
                  </div>
                  {isSuperAdmin && (
                    <div className="flex gap-1">
                      <button onClick={() => { setEditingResource(res); setResourceForm({ ...res }); setShowManageResource(true); }}
                        className="p-1.5 rounded-lg hover:bg-white/5 text-cos-text-muted hover:text-cos-primary transition-colors">
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDeleteResource(res.id)}
                        className="p-1.5 rounded-lg hover:bg-white/5 text-cos-text-muted hover:text-red-400 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-xs text-cos-text-secondary">
                    <MapPin className="w-3.5 h-3.5 text-cos-text-muted" /> {res.location}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-cos-text-secondary">
                    <Users className="w-3.5 h-3.5 text-cos-text-muted" /> Capacity: {res.capacity}
                  </div>
                  {res.department_name && (
                    <div className="flex items-center gap-2 text-xs text-cos-text-secondary">
                      <Monitor className="w-3.5 h-3.5 text-cos-text-muted" /> {res.department_name}
                    </div>
                  )}
                </div>

                {isFaculty && (
                  <button onClick={() => { setBookForm(p => ({ ...p, resourceId: res.id })); setShowBook(true); }}
                    className="btn-primary w-full text-xs font-bold py-2.5">
                    Request Booking
                  </button>
                )}
              </div>
            );
          })}
        </div>
      ) : tab === 'requests' && isSuperAdmin ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4 space-y-4">
                <div className="glass-card p-5 border-white/5">
                    <h3 className="text-sm font-black uppercase tracking-widest text-cos-text-muted mb-4">Institutional Calendar</h3>
                    <div className="bg-black/20 p-4 rounded-xl border border-white/5">
                        {renderHeader()}
                        {renderDays()}
                        {renderCells()}
                    </div>
                    <div className="mt-4 p-3 rounded-lg bg-cos-primary/5 border border-cos-primary/10 flex items-start gap-3">
                        <Info className="w-4 h-4 text-cos-primary mt-0.5" />
                        <p className="text-[10px] text-cos-text-muted leading-relaxed">
                            Select a date to view existing allocations. Dots indicate active bookings for that day. 
                            <strong> Verification is mandatory before approval.</strong>
                        </p>
                    </div>
                </div>
            </div>

            <div className="lg:col-span-8 space-y-4">
                {pendingRequests.length === 0 ? (
                    <div className="glass-card p-12 text-center border-dashed border-white/5">
                        <Calendar className="w-12 h-12 text-cos-text-muted mx-auto mb-3 opacity-10" />
                        <p className="text-cos-text-secondary font-medium uppercase tracking-[0.2em] text-[10px]">Registry is empty</p>
                    </div>
                ) : pendingRequests.map((b, idx) => {
                    const hasConflict = conflicts[b.id]?.length > 0;
                    const isVerified = verifiedRequests[b.id];
                    return (
                        <div key={b.id} className="glass-card p-6 border-white/5 relative overflow-hidden">
                            <div className="absolute top-0 right-0 px-3 py-1 bg-white/5 text-[9px] font-black tracking-widest text-cos-text-muted uppercase italic border-b border-l border-white/5">
                                FCFS RANK: {idx + 1}
                            </div>
                            
                            <div className="flex flex-col md:flex-row gap-6">
                                <div className="flex-1 space-y-4">
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h3 className="font-bold text-lg leading-tight mb-1">{b.title}</h3>
                                            <div className="flex items-center gap-2 text-xs font-bold text-cos-primary uppercase tracking-widest">
                                                {b.resource_name} <span className="text-white/20">/</span> {b.resource_location}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 py-3 border-y border-white/5">
                                        <div className="space-y-1">
                                            <div className="text-[10px] font-black uppercase tracking-widest text-cos-text-muted">Commencement</div>
                                            <div className="text-xs font-medium flex items-center gap-2 uppercase tracking-tighter">
                                                <Clock className="w-3.5 h-3.5 text-cos-primary" /> {formatDateTime(b.start_time)}
                                            </div>
                                        </div>
                                        <div className="space-y-1">
                                            <div className="text-[10px] font-black uppercase tracking-widest text-cos-text-muted">Conclusion</div>
                                            <div className="text-xs font-medium flex items-center gap-2 uppercase tracking-tighter">
                                                <Clock className="w-3.5 h-3.5 text-cos-primary" /> {formatDateTime(b.end_time)}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between text-[10px] text-cos-text-muted font-bold tracking-widest">
                                        <span>REQUESTED BY: {b.booked_by_name?.toUpperCase()}</span>
                                        <span>DEPT: {b.department_name || 'GENERAL'}</span>
                                    </div>
                                </div>

                                <div className="md:w-56 flex flex-col gap-2 justify-center md:pl-6 md:border-l border-white/5">
                                    {hasConflict ? (
                                        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 space-y-2 mb-2">
                                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-red-400">
                                                <AlertTriangle className="w-3 h-3" /> Schedule Overlap
                                            </div>
                                            <div className="text-[10px] text-red-300 leading-tight">
                                                Resource already booked for this interval.
                                            </div>
                                        </div>
                                    ) : (
                                        <div className={`p-3 rounded-xl border transition-all mb-2 ${isVerified ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-white/5 border-white/10'}`}>
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-cos-text-muted">Verification</span>
                                                <Check className={`w-3 h-3 ${isVerified ? 'text-emerald-400' : 'text-white/20'}`} />
                                            </div>
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input type="checkbox" className="hidden" checked={isVerified} onChange={(e) => setVerifiedRequests(prev => ({ ...prev, [b.id]: e.target.checked }))} />
                                                <div className={`w-8 h-4 rounded-full relative transition-colors ${isVerified ? 'bg-emerald-500' : 'bg-white/10'}`}>
                                                    <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${isVerified ? 'left-4.5' : 'left-0.5'}`} />
                                                </div>
                                                <span className="text-[9px] font-bold text-cos-text-secondary uppercase">Availability Match</span>
                                            </label>
                                        </div>
                                    )}

                                    <button 
                                        onClick={() => handleApproveBooking(b.id, 'approve')} 
                                        disabled={hasConflict || !isVerified}
                                        className={`btn-primary text-[10px] font-black uppercase tracking-widest py-3 ${hasConflict || !isVerified ? 'opacity-30 grayscale cursor-not-allowed' : ''}`}>
                                        Confirm Allocation
                                    </button>
                                    <button 
                                        onClick={() => handleApproveBooking(b.id, 'reject')} 
                                        className="btn-secondary text-[10px] font-black uppercase tracking-widest py-3 text-red-400 border-red-500/10">
                                        Deny Request
                                    </button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {approvedAllocations.length === 0 ? (
            <div className="glass-card p-12 text-center col-span-full border-dashed border-white/5 opacity-50">
              <Calendar className="w-12 h-12 text-cos-text-muted mx-auto mb-3 opacity-20" />
              <p className="text-cos-text-secondary font-medium text-[10px] uppercase tracking-widest">Active allocations will appear here</p>
            </div>
          ) : approvedAllocations.map((b: any) => (
              <div key={b.id} className="glass-card p-6 border-white/5 relative overflow-hidden group">
                <div className="flex flex-col md:flex-row gap-6 justify-between">
                  <div className="flex-1 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-bold text-lg leading-tight mb-1">{b.title}</h3>
                        <div className="flex items-center gap-2 text-xs font-bold text-cos-primary uppercase tracking-widest">
                          {b.resource_name} <span className="text-white/20">/</span> {b.resource_location}
                        </div>
                      </div>
                      <span className={`badge text-[10px] font-black uppercase tracking-widest bg-emerald-500/15 text-emerald-400 border-emerald-500/30`}>
                        Active
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 py-3 border-y border-white/5">
                      <div className="space-y-1">
                        <div className="text-[10px] font-black uppercase tracking-widest text-cos-text-muted">Commencement</div>
                        <div className="text-xs font-medium flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-cos-primary" /> {formatDateTime(b.start_time)}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="text-[10px] font-black uppercase tracking-widest text-cos-text-muted">Conclusion</div>
                        <div className="text-xs font-medium flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-cos-primary" /> {formatDateTime(b.end_time)}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-cos-text-muted font-bold tracking-widest">
                      <span>ALLOCATED TO: {b.booked_by_name?.toUpperCase()}</span>
                      {b.approved_by_name && <span>VERIFIED BY: {b.approved_by_name?.toUpperCase()}</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Calendar Detail Modal */}
      {showCalendarDetail && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 modal-overlay" onClick={() => setShowCalendarDetail(null)}>
              <div className="glass-card p-6 w-full max-w-md animate-fade-in border-white/10" onClick={e => e.stopPropagation()}>
                  <h3 className="text-sm font-black uppercase tracking-widest text-cos-text-muted mb-4">Allocations for {format(selectedDate, 'PP')}</h3>
                  <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                      {showCalendarDetail.map((b: any) => (
                          <div key={b.id} className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-2">
                              <h4 className="font-bold text-sm">{b.title}</h4>
                              <div className="flex items-center gap-2 text-[10px] text-cos-primary font-bold uppercase tracking-widest">
                                  {b.resource_name}
                              </div>
                              <div className="text-[10px] text-cos-text-secondary">
                                  {format(parseISO(b.start_time), 'p')} - {format(parseISO(b.end_time), 'p')}
                              </div>
                              <div className="pt-2 border-t border-white/5 text-[9px] text-cos-text-muted font-bold uppercase tracking-widest">
                                  Faculty: {b.booked_by_name}
                              </div>
                          </div>
                      ))}
                  </div>
                  <button onClick={() => setShowCalendarDetail(null)} className="btn-secondary w-full mt-6 py-2 text-xs font-bold">Close Insight</button>
              </div>
          </div>
      )}

      {/* Manage Resource Modal (CRUD) */}
      {showManageResource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay" onClick={() => setShowManageResource(false)}>
          <div className="glass-card p-8 w-full max-w-xl animate-fade-in border-white/10" onClick={e => e.stopPropagation()}>
            <header className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-bold tracking-tight">{editingResource ? 'Modify Asset' : 'Catalog New Asset'}</h3>
                <p className="text-xs text-cos-text-muted mt-1 uppercase tracking-widest font-black">Institutional Hardware/Space Registration</p>
              </div>
              <button onClick={() => setShowManageResource(false)}><X className="w-5 h-5 text-cos-text-muted hover:text-white transition-colors" /></button>
            </header>
            
            <form onSubmit={handleResourceSubmit} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-cos-text-muted ml-1">Asset Nomenclature</label>
                  <input className="input-field" value={resourceForm.name} onChange={e => setResourceForm(p => ({ ...p, name: e.target.value }))} required />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-cos-text-muted ml-1">Classification</label>
                  <select className="input-field" value={resourceForm.type} onChange={e => setResourceForm(p => ({ ...p, type: e.target.value }))}>
                    <option value="seminar_hall">Seminar Hall</option>
                    <option value="lab">Laboratary</option>
                    <option value="projector">Portable Logic / Projector</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-cos-text-muted ml-1">Geographic Location</label>
                  <input className="input-field" value={resourceForm.location} onChange={e => setResourceForm(p => ({ ...p, location: e.target.value }))} required />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-cos-text-muted ml-1">Maximum Capacity</label>
                  <input type="number" className="input-field" value={resourceForm.capacity} onChange={e => setResourceForm(p => ({ ...p, capacity: e.target.value }))} required />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-cos-text-muted ml-1">Custodian Department</label>
                <select className="input-field" value={resourceForm.department_id} onChange={e => setResourceForm(p => ({ ...p, department_id: e.target.value }))} required>
                  <option value="">Select Department</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-cos-text-muted ml-1">Technical Specification / Description</label>
                <textarea className="input-field min-h-[80px]" value={resourceForm.description} onChange={e => setResourceForm(p => ({ ...p, description: e.target.value }))} />
              </div>

              <button type="submit" disabled={processing} className="btn-primary w-full py-4 text-sm font-black uppercase tracking-widest flex items-center justify-center gap-3">
                {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <>{editingResource ? 'Update Registry' : 'Provision Asset'}</>}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Book Modal */}
      {showBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-overlay" onClick={() => setShowBook(false)}>
          <div className="glass-card p-8 w-full max-w-xl animate-fade-in border-white/10" onClick={e => e.stopPropagation()}>
             <header className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-bold tracking-tight">Resource Allocation Request</h3>
                <p className="text-xs text-cos-text-muted mt-1 uppercase tracking-widest font-black">Submit credentials for facility access</p>
              </div>
              <button onClick={() => setShowBook(false)}><X className="w-5 h-5 text-cos-text-muted" /></button>
            </header>

            <form onSubmit={handleBookSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-cos-text-muted ml-1">Facility selection</label>
                <select className="input-field" value={bookForm.resourceId} onChange={e => setBookForm(p => ({ ...p, resourceId: e.target.value }))} required>
                  <option value="">Select Resource</option>
                  {resources.map((r: any) => <option key={r.id} value={r.id}>{r.name} ({r.location})</option>)}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-cos-text-muted ml-1">Strategic Logic / Title</label>
                <input className="input-field" value={bookForm.title} onChange={e => setBookForm(p => ({ ...p, title: e.target.value }))} required placeholder="Research Symposium / IoT Workshop" />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-cos-text-muted ml-1">Commencement</label>
                  <input type="datetime-local" className="input-field" value={bookForm.startTime} onChange={e => setBookForm(p => ({ ...p, startTime: e.target.value }))} required />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-widest text-cos-text-muted ml-1">Conclusion</label>
                  <input type="datetime-local" className="input-field" value={bookForm.endTime} onChange={e => setBookForm(p => ({ ...p, endTime: e.target.value }))} required />
                </div>
              </div>

              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <p className="text-[10px] font-medium text-amber-200 leading-relaxed italic">
                  Note: All allocations are subject to administrative verification and schedule availability. Ensure timestamps include setup and teardown duration.
                </p>
              </div>

              <button type="submit" disabled={processing} className="btn-primary w-full py-4 text-sm font-black uppercase tracking-widest flex items-center justify-center gap-3">
                {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-4 h-4" /> Secure Allocation</>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
