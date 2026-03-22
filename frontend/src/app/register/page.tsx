'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authAPI, departmentAPI } from '@/lib/api';
import { Zap, ArrowRight, Loader2, CheckCircle2, ChevronLeft, User, GraduationCap, Building2, Shield, Wrench } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const roles = [
  { value: 'student', label: 'Student', icon: GraduationCap, description: 'Request gate passes and view notifications' },
  { value: 'faculty', label: 'Faculty', icon: Users, description: 'Post announcements and approve passes' },
  { value: 'security_staff', label: 'Security', icon: Shield, description: 'Scan QR codes at entry/exit' },
  { value: 'maintenance_staff', label: 'Maintenance Staff', icon: Wrench, description: 'Resolve institutional complaints' },
];

function Users({ className }: { className?: string }) {
  return <User className={className} />;
}

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [departments, setDepartments] = useState<any[]>([]);

  const [form, setForm] = useState({
    email: '', password: '', confirmPassword: '', name: '', phone: '',
    role: '', departmentId: '',
    rollNumber: '', batch: '', residenceType: 'day_scholar', className: '',
    fatherName: '', fatherPhone: '', motherName: '', motherPhone: '',
    facultyIdNumber: '', designation: '',
  });

  useEffect(() => {
    departmentAPI.getAll().then(res => setDepartments(res.data.data || [])).catch(() => {});
  }, []);

  const updateForm = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    setError('');

    try {
      const payload: any = {
        email: form.email, password: form.password, name: form.name,
        phone: form.phone, role: form.role, departmentId: form.departmentId || undefined,
      };

      if (form.role === 'student') {
        payload.rollNumber = form.rollNumber;
        payload.batch = form.batch;
        payload.residenceType = form.residenceType;
        payload.fatherName = form.fatherName;
        payload.fatherPhone = form.fatherPhone;
        payload.motherName = form.motherName;
        payload.motherPhone = form.motherPhone;
        payload.className = form.className;
      } else if (['faculty', 'department_admin', 'warden', 'security_staff', 'maintenance_staff'].includes(form.role)) {
        payload.facultyIdNumber = form.facultyIdNumber;
        payload.designation = form.designation || form.role;
      }

      await authAPI.register(payload);
      setSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-cos-bg-primary flex items-center justify-center px-6">
        <div className="hero-glow" />
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card p-12 max-w-md w-full text-center relative z-10 border-cos-success/20"
        >
          <div className="w-20 h-20 rounded-full bg-cos-success/10 flex items-center justify-center mx-auto mb-8 border border-cos-success/20">
            <CheckCircle2 className="w-10 h-10 text-cos-success" />
          </div>
          <h2 className="text-3xl font-black mb-4">Application Sent!</h2>
          <p className="text-cos-text-secondary font-medium mb-8 leading-relaxed">
            Your account is being reviewed by the administration. You'll be notified via email once approved.
          </p>
          <Link href="/login" className="btn-primary w-full py-4 flex items-center justify-center gap-2 font-bold uppercase tracking-widest">
            Back to Login <ArrowRight className="w-5 h-5" />
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cos-bg-primary py-20 px-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="hero-glow top-[-200px] right-[-200px]" />
      <div className="hero-glow bottom-[-200px] left-[-200px]" style={{ opacity: 0.05 }} />
      <div className="absolute inset-0 grid-pattern pointer-events-none opacity-40" />

      <div className="max-w-3xl mx-auto relative z-10">
        <header className="text-center mb-16">
          <Link href="/" className="inline-flex items-center gap-3 mb-8 group">
            <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center group-hover:rotate-12 transition-transform">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-black tracking-tighter">Campus<span className="gradient-text">OS</span></span>
          </Link>
          <h1 className="text-5xl font-black mb-4 tracking-tight">Join the <span className="gradient-text">Future.</span></h1>
          <p className="text-cos-text-secondary font-medium">Create your credentials to access the platform</p>
        </header>

        {/* Form Container */}
        <div className="glass-card p-1 lg:p-1.5 overflow-hidden">
           <div className="bg-white/5 backdrop-blur-3xl rounded-[22px] p-8 lg:p-12 relative overflow-hidden">
              {/* Step Progress */}
              <div className="flex items-center justify-center gap-3 mb-12">
                {[1, 2, 3].map(s => (
                  <div key={s} className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-black transition-all border-2 ${
                      step >= s ? 'gradient-bg border-transparent text-white scale-110' : 'border-white/10 text-cos-text-muted bg-white/5'
                    }`}>{s}</div>
                    {s < 3 && <div className={`w-16 h-0.5 rounded-full ${step > s ? 'gradient-bg' : 'bg-white/5'}`} />}
                  </div>
                ))}
              </div>

              {error && (
                <div className="mb-10 p-4 rounded-xl bg-cos-danger/10 border border-cos-danger/20 text-cos-danger text-sm font-bold flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-cos-danger animate-pulse" />
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <AnimatePresence mode="wait">
                  {step === 1 && (
                    <motion.div 
                      key="step1" 
                      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                      className="space-y-6"
                    >
                      <h3 className="text-xl font-bold mb-6">What is your role on campus?</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {roles.map(role => (
                          <button
                            key={role.value}
                            type="button"
                            onClick={() => { updateForm('role', role.value); setStep(2); }}
                            className="group relative p-6 rounded-2xl border border-white/5 bg-white/5 text-left hover:border-cos-primary/30 hover:bg-white/10 transition-all overflow-hidden"
                          >
                            <div className="relative z-10 flex flex-col gap-4">
                               <div className="w-10 h-10 rounded-xl bg-cos-primary/10 flex items-center justify-center text-cos-primary group-hover:scale-110 transition-transform">
                                 <role.icon className="w-5 h-5" />
                               </div>
                               <div>
                                 <div className="font-bold text-cos-text-primary">{role.label}</div>
                                 <div className="text-xs text-cos-text-muted mt-1 leading-relaxed">{role.description}</div>
                               </div>
                            </div>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  {step === 2 && (
                    <motion.div 
                      key="step2" 
                      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                      className="space-y-6"
                    >
                      <h3 className="text-xl font-bold mb-6">Identity Details</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2 space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-cos-text-muted ml-1">Full Identity Name</label>
                          <input className="input-field py-4 bg-white/5 border-white/5 focus:bg-white/10 transition-all font-medium" value={form.name} onChange={e => updateForm('name', e.target.value)} required placeholder="Ex: Alex Johnson" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-cos-text-muted ml-1">Communication Email</label>
                          <input className="input-field py-4 bg-white/5 border-white/5 focus:bg-white/10 transition-all font-medium" type="email" value={form.email} onChange={e => updateForm('email', e.target.value)} required placeholder="name@college.edu" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-cos-text-muted ml-1">Access Key (Password)</label>
                          <input className="input-field py-4 bg-white/5 border-white/5 focus:bg-white/10 transition-all font-medium" type="password" value={form.password} onChange={e => updateForm('password', e.target.value)} required placeholder="••••••••" />
                        </div>
                        <div className="md:col-span-2 space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-cos-text-muted ml-1">Academic Department</label>
                          <select className="input-field py-4 bg-white/5 border-white/5 focus:bg-white/10 transition-all font-medium appearance-none" value={form.departmentId} onChange={e => updateForm('departmentId', e.target.value)}>
                            <option value="">Select Department...</option>
                            {departments.map((d: any) => (
                              <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="flex justify-between pt-10">
                        <button type="button" onClick={() => setStep(1)} className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-cos-text-muted hover:text-white transition-colors">
                          <ChevronLeft className="w-4 h-4" /> Change Role
                        </button>
                        <button type="button" onClick={() => setStep(3)} className="btn-primary px-10 py-3 text-xs font-black uppercase tracking-widest" disabled={!form.name || !form.email || !form.password}>
                          Continue <ArrowRight className="w-4 h-4 ml-1" />
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {step === 3 && (
                    <motion.div 
                      key="step3" 
                      initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                      className="space-y-6"
                    >
                      <h3 className="text-xl font-bold mb-6">Verification Data</h3>
                    {form.role === 'student' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div className="space-y-2">
                              <label className="text-[10px] font-black uppercase tracking-widest text-cos-text-muted ml-1">Roll Number</label>
                              <input className="input-field py-4 bg-white/5 border-white/5 font-medium" value={form.rollNumber} onChange={e => updateForm('rollNumber', e.target.value)} required placeholder="Ex: CSE/24/001" />
                           </div>
                           <div className="space-y-2">
                              <label className="text-[10px] font-black uppercase tracking-widest text-cos-text-muted ml-1">Class Identity</label>
                              <input className="input-field py-4 bg-white/5 border-white/5 font-medium" value={form.className} onChange={e => updateForm('className', e.target.value)} required placeholder="Ex: CSE-A, ECE-B" />
                           </div>
                           <div className="space-y-2">
                              <label className="text-[10px] font-black uppercase tracking-widest text-cos-text-muted ml-1">Current Batch / Year</label>
                              <input className="input-field py-4 bg-white/5 border-white/5 font-medium" value={form.batch} onChange={e => updateForm('batch', e.target.value)} placeholder="Ex: 2024 (1st Year)" />
                           </div>
                           <div className="md:col-span-2 space-y-2">
                              <label className="text-[10px] font-black uppercase tracking-widest text-cos-text-muted ml-1">Residence Plan</label>
                              <div className="flex gap-4 p-1.5 bg-black/40 rounded-2xl border border-white/5">
                                {['day_scholar', 'hosteller'].map(type => (
                                  <button key={type} type="button" onClick={() => updateForm('residenceType', type)}
                                    className={`flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${form.residenceType === type ? 'gradient-bg text-white shadow-lg' : 'text-cos-text-muted hover:text-white'}`}>
                                    {type === 'day_scholar' ? 'Day Scholar' : 'Hosteller'}
                                  </button>
                                ))}
                              </div>
                           </div>
                           <div className="border-t border-white/5 pt-6 md:col-span-2">
                              <h4 className="text-xs font-bold text-cos-primary uppercase tracking-widest mb-6">Guardian Verification</h4>
                              <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                  <label className="text-[10px] font-black uppercase tracking-widest text-cos-text-muted ml-1">Father's Full Name</label>
                                  <input className="input-field py-4 bg-white/5 border-white/5 font-medium" value={form.fatherName} onChange={e => updateForm('fatherName', e.target.value)} required placeholder="Primary identity" />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-[10px] font-black uppercase tracking-widest text-cos-text-muted ml-1">Father's Emergency Contact</label>
                                  <input className="input-field py-4 bg-white/5 border-white/5 font-medium" value={form.fatherPhone} onChange={e => updateForm('fatherPhone', e.target.value)} required placeholder="+91 XXX XXXXXX" />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-[10px] font-black uppercase tracking-widest text-cos-text-muted ml-1">Mother's Full Name</label>
                                  <input className="input-field py-4 bg-white/5 border-white/5 font-medium" value={form.motherName} onChange={e => updateForm('motherName', e.target.value)} placeholder="Secondary identity" />
                                </div>
                                <div className="space-y-2">
                                  <label className="text-[10px] font-black uppercase tracking-widest text-cos-text-muted ml-1">Mother's Contact</label>
                                  <input className="input-field py-4 bg-white/5 border-white/5 font-medium" value={form.motherPhone} onChange={e => updateForm('motherPhone', e.target.value)} placeholder="+91 XXX XXXXXX" />
                                </div>
                              </div>
                           </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                           <div className="space-y-2">
                              <label className="text-[10px] font-black uppercase tracking-widest text-cos-text-muted ml-1">Official ID Number</label>
                              <input className="input-field py-4 bg-white/5 border-white/5 font-medium" value={form.facultyIdNumber} onChange={e => updateForm('facultyIdNumber', e.target.value)} required placeholder="ID-001" />
                           </div>
                           <div className="space-y-2">
                              <label className="text-[10px] font-black uppercase tracking-widest text-cos-text-muted ml-1">Designation</label>
                              <input className="input-field py-4 bg-white/5 border-white/5 font-medium" value={form.designation} onChange={e => updateForm('designation', e.target.value)} placeholder="Professor / Warden" />
                           </div>
                        </div>
                      )}
                      
                      <div className="flex justify-between pt-10">
                        <button type="button" onClick={() => setStep(2)} className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-cos-text-muted hover:text-white transition-colors">
                          <ChevronLeft className="w-4 h-4" /> Go Back
                        </button>
                        <button type="submit" disabled={loading} className="btn-primary inline-flex items-center gap-3 px-10 py-3 text-xs font-black uppercase tracking-widest shadow-[0_10px_30px_rgba(255,106,0,0.3)] hover:shadow-orange-500/50 transition-all">
                          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Finalize Application <ArrowRight className="w-5 h-5" /></>}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </form>
           </div>
        </div>

        <footer className="mt-12 text-center">
           <p className="text-cos-text-muted font-medium">
             Part of the Secure Campus Network. <Link href="/login" className="text-cos-primary font-black ml-2 hover:opacity-80 transition-opacity">Sign in Instead</Link>
           </p>
        </footer>
      </div>
    </div>
  );
}
