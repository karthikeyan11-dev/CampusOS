'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/auth.store';
import { authAPI } from '@/lib/api';
import { 
  User, Mail, Phone, Shield, Building2, Calendar, 
  Hash, Home, Loader2, Heart, GraduationCap, Briefcase 
} from 'lucide-react';
import { formatRoleName, getRoleBadgeColor, formatDateTime } from '@/lib/utils';
import { BackButton } from '@/components/layout/BackButton';
import { motion } from 'framer-motion';
import { Edit2, Timer } from 'lucide-react';

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const syncProfile = async () => {
      setSyncing(true);
      try {
        const res = await authAPI.getProfile();
        if (res.data?.success) {
          setUser(res.data.data);
        }
      } catch (err) {
        console.error('Failed to sync profile:', err);
      } finally {
        setSyncing(false);
      }
    };
    syncProfile();
  }, [setUser]);

  if (!user) return (
    <div className="flex items-center justify-center p-20">
      <Loader2 className="w-8 h-8 animate-spin text-cos-primary" />
    </div>
  );

  const isStudent = user?.role === 'student' || !!user?.student;
  const s = user?.student || (isStudent ? user : null) as any;

  const canEdit = () => {
    if (user.role === 'super_admin') return true;
    if (isStudent && user.approved_at) {
      const approvedDate = new Date(user.approved_at);
      const diffDays = Math.floor((new Date().getTime() - approvedDate.getTime()) / (1000 * 3600 * 24));
      return diffDays <= 5;
    }
    return !isStudent; // Faculty currently have default access unless restricted later
  };

  const getDaysRemaining = () => {
    if (!user.approved_at) return 0;
    const approvedDate = new Date(user.approved_at);
    const diffDays = Math.floor((new Date().getTime() - approvedDate.getTime()) / (1000 * 3600 * 24));
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
        <div className="flex gap-3">
          {editAllowed && (
            <button className="btn-primary flex items-center gap-2 text-xs font-black uppercase tracking-widest px-6 shadow-lg shadow-cos-primary/20">
              <Edit2 className="w-4 h-4" /> Edit Profile
            </button>
          )}
          <BackButton />
        </div>
      </header>

      <div className="grid lg:grid-cols-4 gap-8">
        {/* Left Card - Identity Card */}
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
              <p className="text-cos-text-muted text-xs font-bold uppercase tracking-widest mb-4">
                {user.id.substring(0, 8)}
              </p>
              <div className={`badge py-1.5 px-4 font-bold border-2 ${getRoleBadgeColor(user.role)}`}>
                {formatRoleName(user.role)}
              </div>
            </div>
          </div>

          <div className="glass-card p-6">
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-cos-text-muted mb-6">Security & Logs</h4>
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
              <button className="w-full btn-secondary text-xs py-3 font-bold uppercase tracking-widest">Update Password</button>
              <button className="w-full text-xs font-bold text-cos-text-muted hover:text-red-400 transition-colors uppercase tracking-widest">Request Account Termination</button>
            </div>
          </div>
        </div>

        {/* Info Sections */}
        <div className="lg:col-span-3 space-y-8">
          {/* Universal Details */}
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

          {/* Role Specific: STUDENT */}
          {isStudent && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              <div className="glass-card p-8 border-cos-primary/10">
                <h4 className="text-lg font-black mb-8 flex items-center gap-3">
                  <GraduationCap className="w-5 h-5 text-cos-primary" /> Academic Profile
                </h4>
                <div className="grid md:grid-cols-3 gap-8">
                   <InfoItem icon={Hash} label="In-Roll ID" value={user.roll_number || s.roll_number} />
                   <InfoItem icon={Calendar} label="Active Batch" value={user.class_name || s.class_name || 'Class of 2024'} />
                   <InfoItem icon={Home} label="Living Status" value={user.residence_type?.replace(/_/g, ' ') || s.residence_type?.replace(/_/g, ' ')} />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                <div className="glass-card p-8">
                  <h4 className="text-lg font-black mb-6 flex items-center gap-3">
                    <Heart className="w-5 h-5 text-cos-danger" /> Parent/Guardian
                  </h4>
                  <div className="space-y-6">
                    <InfoItem label="Father's Identity" value={s.parents?.father?.name || s.father_name || 'N/A'} />
                    <InfoItem label="Father's Contact" value={s.parents?.father?.phone || s.father_phone || 'N/A'} isPhone />
                    <div className="pt-4 border-t border-white/5">
                      <InfoItem label="Mother's Identity" value={s.parents?.mother?.name || s.mother_name || 'N/A'} />
                      <InfoItem label="Mother's Contact" value={s.parents?.mother?.phone || s.mother_phone || 'N/A'} isPhone />
                    </div>
                  </div>
                </div>

                <div className="glass-card p-8">
                  <h4 className="text-lg font-black mb-6 flex items-center gap-3">
                    <Briefcase className="w-5 h-5 text-cos-secondary" /> Academic Oversight
                  </h4>
                  <div className="space-y-6">
                    <InfoItem label="Mentor In-Charge" value={s.academic?.mentor?.name || s.mentor_name || 'Assigning...'} />
                    <InfoItem label="Mentor Contact" value={s.academic?.mentor?.phone || s.mentor_phone || 'N/A'} isPhone />
                    <div className="pt-4 border-t border-white/5">
                      <InfoItem label="HOD In-Charge" value={s.academic?.hod?.name || s.hod_name || 'Department Admin'} />
                      <InfoItem label="HOD Contact" value={s.academic?.hod?.phone || s.hod_phone || 'N/A'} isPhone />
                    </div>
                  </div>
                </div>
              </div>

              {/* Hostel Section */}
              {(user.residence_type === 'hosteller' || s.residence_type === 'hosteller') && (
                <div className="glass-card p-8 border-cos-accent/10">
                   <h4 className="text-lg font-black mb-8 flex items-center gap-3">
                     <Home className="w-5 h-5 text-cos-accent" /> Residential Details (Hostel)
                   </h4>
                   <div className="grid md:grid-cols-2 gap-12">
                      <InfoItem label="Building Name" value={s.hostel?.name || s.hostel_name || 'Assigned Block'} />
                      <div className="flex gap-12">
                        <InfoItem label="Warden Name" value={s.hostel?.warden?.name || s.warden_name || 'Resident Warden'} />
                        <InfoItem label="Warden Contact" value={s.hostel?.warden?.phone || s.warden_phone || 'N/A'} isPhone />
                      </div>
                   </div>
                </div>
              )}
            </motion.div>
          )}

          {/* Role Specific: FACULTY / STAFF */}
          {!isStudent && user.faculty_id_number && (
             <div className="glass-card p-8 border-cos-primary/10">
                <h4 className="text-lg font-black mb-8 flex items-center gap-3">
                  <Shield className="w-5 h-5 text-cos-primary" /> Official Verification
                </h4>
                <div className="grid md:grid-cols-2 gap-12">
                   <InfoItem icon={Hash} label="Faculty/Official ID" value={user.faculty_id_number} />
                   <InfoItem icon={Shield} label="Official Designation" value={user.designation || 'Academic Staff'} />
                </div>
             </div>
          )}
        </div>
      </div>
      
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
