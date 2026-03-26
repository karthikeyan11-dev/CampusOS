'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { authAPI } from '@/lib/api';
import { 
  User, Mail, Phone, Shield, Building2, Calendar, 
  Hash, Home, Loader2, Heart, GraduationCap, Briefcase,
  Edit2, Timer, X, Save
} from 'lucide-react';
import { formatRoleName, getRoleBadgeColor } from '@/lib/utils';
import { motion } from 'framer-motion';

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const [syncing, setSyncing] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    name: '', phone: '', fatherName: '', fatherPhone: '', motherName: '', motherPhone: '',
  });

  useEffect(() => {
    const syncProfile = async () => {
      setSyncing(true);
      try {
        const res = await authAPI.getProfile();
        if (res.data?.success) {
          const u = res.data.data;
          setUser(u);
          setEditForm({
            name: u.name || '',
            phone: u.phone || '',
            fatherName: u.student?.parents?.father?.name || '',
            fatherPhone: u.student?.parents?.father?.phone || '',
            motherName: u.student?.parents?.mother?.name || '',
            motherPhone: u.student?.parents?.mother?.phone || '',
          });
        }
      } catch (err) {
        console.error('Failed to sync profile:', err);
      } finally {
        setSyncing(false);
      }
    };
    syncProfile();
  }, [setUser]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await authAPI.updateProfile(editForm);
      const res = await authAPI.getProfile();
      if (res.data?.success) setUser(res.data.data);
      setShowEdit(false);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (!user) return (
    <div className="flex items-center justify-center p-20">
      <Loader2 className="w-8 h-8 animate-spin text-cos-primary" />
    </div>
  );

  const isStudent = user?.role === 'student' || !!user?.student;
  const s = (user as any)?.student || (isStudent ? user : null) as any;

  const canEdit = () => {
    if (user.role === 'super_admin') return true;
    if (isStudent && user.approved_at) {
      const diffDays = Math.floor((new Date().getTime() - new Date(user.approved_at).getTime()) / (1000 * 3600 * 24));
      return diffDays <= 5;
    }
    return !isStudent;
  };

  const getDaysRemaining = () => {
    if (!user.approved_at) return 5;
    const diffDays = Math.floor((new Date().getTime() - new Date(user.approved_at).getTime()) / (1000 * 3600 * 24));
    return Math.max(0, 5 - diffDays);
  };

  const editAllowed = canEdit();
  const daysLeft = getDaysRemaining();

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in pb-20">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black tracking-tight">Personal <span className="gradient-text">Identity</span></h2>
          <p className="text-cos-text-secondary font-medium">Verified credentials and associations</p>
        </div>
        {editAllowed && (
          <button onClick={() => setShowEdit(true)}
            className="btn-primary flex items-center gap-2 text-xs font-black uppercase tracking-widest px-6 shadow-lg shadow-cos-primary/20">
            <Edit2 className="w-4 h-4" /> Edit Profile
          </button>
        )}
      </header>

      <div className="grid lg:grid-cols-4 gap-8">
        {/* Identity Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-card p-1 relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-2 gradient-bg" />
            <div className="p-8 text-center text-cos-text-primary">
              <div className="w-24 h-24 rounded-[30px] gradient-bg mx-auto mb-6 flex items-center justify-center text-white text-3xl font-black shadow-[0_10px_30px_rgba(255,106,0,0.3)] group-hover:scale-105 transition-transform">
                {user.avatar_url ? (
                   <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover rounded-[30px]" />
                ) : user.name.charAt(0)}
              </div>
              <h3 className="text-xl font-black mb-1">{user.name}</h3>
              <p className="text-cos-text-muted text-xs font-bold uppercase tracking-widest mb-4">{user.id.substring(0, 8)}</p>
              <div className={`badge py-1.5 px-4 font-bold border-2 ${getRoleBadgeColor(user.role)}`}>
                {formatRoleName(user.role)}
              </div>
            </div>
          </div>

          <div className="glass-card p-6">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-cos-text-muted mb-6">Session Controls</h4>
            <div className="space-y-4">
              {isStudent && (
                 <div className={`p-4 rounded-xl border text-center space-y-2 mb-2 ${editAllowed ? 'bg-amber-500/10 border-amber-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
                    <div className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest text-amber-500">
                      <Timer className="w-3 h-3" /> Profile Window
                    </div>
                    <div className="text-xs font-bold text-cos-text-primary">
                      {editAllowed ? `${daysLeft} days remaining` : 'Update window expired'}
                    </div>
                 </div>
              )}
            </div>
          </div>
        </div>

        {/* Info Sections */}
        <div className="lg:col-span-3 space-y-8">
          <div className="glass-card p-8">
             <h4 className="text-lg font-black mb-8 flex items-center gap-3">
               <User className="w-5 h-5 text-cos-primary" /> Basic Information
             </h4>
             <div className="grid md:grid-cols-2 gap-x-12 gap-y-8">
                <InfoItem icon={Mail} label="Email Access" value={user.email} />
                <InfoItem icon={Phone} label="Contact Voice" value={user.phone || 'Not Registered'} />
                <InfoItem icon={Building2} label="Institution Dept" value={user.department?.name || 'Central Administration'} />
                <InfoItem icon={Shield} label="Verification Status" value={user.status || 'Active'} highlight />
             </div>
          </div>

          {isStudent && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              <div className="glass-card p-8 border-cos-primary/10">
                <h4 className="text-lg font-black mb-8 flex items-center gap-3">
                  <GraduationCap className="w-5 h-5 text-cos-primary" /> Academic Profile
                </h4>
                <div className="grid md:grid-cols-3 gap-8">
                   <InfoItem icon={Hash} label="In-Roll ID" value={user.roll_number || s?.roll_number} />
                   <InfoItem icon={Calendar} label="Class" value={user.class_name || s?.class_name || '—'} />
                   <InfoItem icon={Home} label="Living Status" value={(user.residence_type || s?.residence_type || '').replace(/_/g, ' ')} />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                <div className="glass-card p-8">
                  <h4 className="text-lg font-black mb-6 flex items-center gap-3">
                    <Heart className="w-5 h-5 text-red-400" /> Parent/Guardian
                  </h4>
                  <div className="space-y-6">
                    <InfoItem label="Father's Identity" value={s?.parents?.father?.name || 'N/A'} />
                    <InfoItem label="Father's Contact" value={s?.parents?.father?.phone || 'N/A'} isPhone />
                    <div className="pt-4 border-t border-white/5">
                      <InfoItem label="Mother's Identity" value={s?.parents?.mother?.name || 'N/A'} />
                      <InfoItem label="Mother's Contact" value={s?.parents?.mother?.phone || 'N/A'} isPhone />
                    </div>
                  </div>
                </div>

                <div className="glass-card p-8">
                  <h4 className="text-lg font-black mb-6 flex items-center gap-3">
                    <Briefcase className="w-5 h-5 text-blue-400" /> Academic Oversight
                  </h4>
                  <div className="space-y-6">
                    <InfoItem label="Mentor In-Charge" value={s?.academic?.mentor?.name || 'Not assigned'} />
                    <InfoItem label="Mentor Contact" value={s?.academic?.mentor?.phone || 'N/A'} isPhone />
                    <div className="pt-4 border-t border-white/5">
                      <InfoItem label="HOD In-Charge" value={s?.academic?.hod?.name || 'Department Admin'} />
                      <InfoItem label="HOD Contact" value={s?.academic?.hod?.phone || 'N/A'} isPhone />
                    </div>
                  </div>
                </div>
              </div>

              {(user.residence_type === 'hosteller' || s?.residence_type === 'hosteller') && (
                <div className="glass-card p-8 border-blue-500/10">
                   <h4 className="text-lg font-black mb-8 flex items-center gap-3">
                     <Home className="w-5 h-5 text-blue-400" /> Residential (Hostel)
                   </h4>
                   <div className="grid md:grid-cols-2 gap-12">
                      <InfoItem label="Building Name" value={s?.hostel?.name || 'Assigned Block'} />
                      <InfoItem label="Warden Name" value={s?.hostel?.warden?.name || 'Resident Warden'} />
                      <InfoItem label="Warden Contact" value={s?.hostel?.warden?.phone || 'N/A'} isPhone />
                   </div>
                </div>
              )}
            </motion.div>
          )}

          {!isStudent && (user as any).faculty_id_number && (
             <div className="glass-card p-8 border-cos-primary/10">
                <h4 className="text-lg font-black mb-8 flex items-center gap-3">
                  <Shield className="w-5 h-5 text-cos-primary" /> Official Verification
                </h4>
                <div className="grid md:grid-cols-2 gap-12">
                   <InfoItem icon={Hash} label="Faculty/Official ID" value={(user as any).faculty_id_number} />
                   <InfoItem icon={Shield} label="Designation" value={(user as any).designation || 'Academic Staff'} />
                </div>
             </div>
          )}
        </div>
      </div>

      {/* Edit Profile Modal */}
      {showEdit && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 modal-overlay" onClick={() => setShowEdit(false)}>
          <div className="glass-card p-8 w-full max-w-xl animate-scale-in max-h-[90vh] overflow-y-auto scrollbar-hide" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-black tracking-tight">Edit <span className="gradient-text">Profile</span></h3>
                <p className="text-[10px] text-cos-text-muted uppercase tracking-widest mt-1">Update your identity credentials</p>
              </div>
              <button onClick={() => setShowEdit(false)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                <X className="w-5 h-5 text-cos-text-muted" />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-cos-text-muted">Full Name</label>
                  <input className="input-field" value={editForm.name} onChange={e => setEditForm(p => ({...p, name: e.target.value}))} placeholder="Your full name" />
                </div>
                <div className="space-y-2 col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-cos-text-muted">Phone Number</label>
                  <input className="input-field" value={editForm.phone} onChange={e => setEditForm(p => ({...p, phone: e.target.value}))} placeholder="+91 XXXXX XXXXX" />
                </div>
              </div>
              {isStudent && (
                <div className="border-t border-white/10 pt-6 space-y-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-cos-text-muted">Parent / Guardian Info</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] text-cos-text-muted uppercase tracking-widest">Father's Name</label>
                      <input className="input-field" value={editForm.fatherName} onChange={e => setEditForm(p => ({...p, fatherName: e.target.value}))} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] text-cos-text-muted uppercase tracking-widest">Father's Phone</label>
                      <input className="input-field" value={editForm.fatherPhone} onChange={e => setEditForm(p => ({...p, fatherPhone: e.target.value}))} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] text-cos-text-muted uppercase tracking-widest">Mother's Name</label>
                      <input className="input-field" value={editForm.motherName} onChange={e => setEditForm(p => ({...p, motherName: e.target.value}))} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] text-cos-text-muted uppercase tracking-widest">Mother's Phone</label>
                      <input className="input-field" value={editForm.motherPhone} onChange={e => setEditForm(p => ({...p, motherPhone: e.target.value}))} />
                    </div>
                  </div>
                </div>
              )}
              <button type="submit" disabled={saving}
                className="btn-primary w-full py-4 text-xs font-black uppercase tracking-[0.3em] flex items-center justify-center gap-3">
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-4 h-4" /> Save Changes</>}
              </button>
            </form>
          </div>
        </div>
      )}

      {syncing && (
        <div className="fixed bottom-8 right-8 px-4 py-2 rounded-full bg-cos-primary/10 border border-cos-primary/20 flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-cos-primary animate-pulse">
           <Loader2 className="w-3 h-3 animate-spin" /> Syncing Details
        </div>
      )}
    </div>
  );
}

function InfoItem({ icon: Icon, label, value, highlight, isPhone }: any) {
  return (
    <div className="group">
      <div className="flex items-center gap-2 text-[10px] font-black text-cos-text-muted mb-2 uppercase tracking-widest group-hover:text-cos-primary transition-colors">
        {Icon && <Icon className="w-3.5 h-3.5" />} {label}
      </div>
      <div className={`text-sm font-bold tracking-tight capitalize ${highlight ? 'text-cos-primary' : isPhone ? 'text-cos-text-primary underline decoration-cos-primary/20' : 'text-cos-text-primary'}`}>
        {value || '—'}
      </div>
    </div>
  );
}
