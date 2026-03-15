'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authAPI, departmentAPI } from '@/lib/api';
import { Zap, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';

const roles = [
  { value: 'student', label: 'Student', description: 'View notifications, submit complaints, request gate passes' },
  { value: 'faculty', label: 'Faculty', description: 'Approve passes, post announcements, book resources' },
  { value: 'department_admin', label: 'HOD / Department Admin', description: 'Manage department, approve requests' },
  { value: 'security_staff', label: 'Security Staff', description: 'Scan gate passes, manage entry/exit' },
  { value: 'maintenance_staff', label: 'Maintenance Staff', description: 'Handle maintenance complaints' },
];

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
    // Student fields
    rollNumber: '', classId: '', batch: '', residenceType: 'day_scholar',
    fatherName: '', fatherPhone: '', motherName: '', motherPhone: '',
    // Faculty fields
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
      } else if (form.role === 'faculty' || form.role === 'department_admin') {
        payload.facultyIdNumber = form.facultyIdNumber;
        payload.designation = form.designation;
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
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/3 w-[500px] h-[500px] rounded-full bg-emerald-500/5 blur-[120px]" />
        </div>
        <div className="glass-card p-10 max-w-md w-full text-center relative z-10 animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold mb-3">Registration Submitted!</h2>
          <p className="text-cos-text-secondary mb-6">
            Your account is pending approval. You&apos;ll receive an email once approved.
          </p>
          <Link href="/login" className="btn-primary inline-flex items-center gap-2">
            Go to Login <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cos-bg-primary flex items-center justify-center px-6 py-12">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] rounded-full bg-cos-primary/5 blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-cos-secondary/5 blur-[120px]" />
        <div className="grid-pattern absolute inset-0 opacity-20" />
      </div>

      <div className="w-full max-w-2xl relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold">Campus<span className="gradient-text">OS</span></span>
          </Link>
          <h1 className="text-2xl font-bold">Create Account</h1>
          <p className="text-sm text-cos-text-secondary mt-1">Select your role and fill in your details</p>
        </div>

        {/* Step Indicators */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map(s => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                step >= s ? 'gradient-bg text-white' : 'bg-cos-bg-card border border-cos-border text-cos-text-muted'
              }`}>{s}</div>
              {s < 3 && <div className={`w-12 h-0.5 ${step > s ? 'bg-cos-primary' : 'bg-cos-border'}`} />}
            </div>
          ))}
        </div>

        <div className="glass-card p-8">
          {error && (
            <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Step 1: Role Selection */}
            {step === 1 && (
              <div className="space-y-3 animate-fade-in">
                <h3 className="text-lg font-semibold mb-4">Select Your Role</h3>
                {roles.map(role => (
                  <button
                    key={role.value}
                    type="button"
                    onClick={() => { updateForm('role', role.value); setStep(2); }}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      form.role === role.value
                        ? 'border-cos-primary bg-cos-primary/10'
                        : 'border-cos-border hover:border-cos-primary/30 bg-cos-bg-secondary/50'
                    }`}
                  >
                    <div className="font-medium">{role.label}</div>
                    <div className="text-xs text-cos-text-muted mt-1">{role.description}</div>
                  </button>
                ))}
              </div>
            )}

            {/* Step 2: Basic Info */}
            {step === 2 && (
              <div className="space-y-4 animate-fade-in">
                <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm text-cos-text-secondary mb-1.5">Full Name</label>
                    <input className="input-field" value={form.name} onChange={e => updateForm('name', e.target.value)} required placeholder="John Doe" />
                  </div>
                  <div>
                    <label className="block text-sm text-cos-text-secondary mb-1.5">Email</label>
                    <input className="input-field" type="email" value={form.email} onChange={e => updateForm('email', e.target.value)} required placeholder="you@college.edu" />
                  </div>
                  <div>
                    <label className="block text-sm text-cos-text-secondary mb-1.5">Phone</label>
                    <input className="input-field" value={form.phone} onChange={e => updateForm('phone', e.target.value)} placeholder="+91 9876543210" />
                  </div>
                  <div>
                    <label className="block text-sm text-cos-text-secondary mb-1.5">Password</label>
                    <input className="input-field" type="password" value={form.password} onChange={e => updateForm('password', e.target.value)} required minLength={8} placeholder="Min 8 characters" />
                  </div>
                  <div>
                    <label className="block text-sm text-cos-text-secondary mb-1.5">Confirm Password</label>
                    <input className="input-field" type="password" value={form.confirmPassword} onChange={e => updateForm('confirmPassword', e.target.value)} required placeholder="Re-enter password" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm text-cos-text-secondary mb-1.5">Department</label>
                    <select className="input-field" value={form.departmentId} onChange={e => updateForm('departmentId', e.target.value)}>
                      <option value="">Select department</option>
                      {departments.map((d: any) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="flex justify-between pt-4">
                  <button type="button" onClick={() => setStep(1)} className="btn-secondary">Back</button>
                  <button type="button" onClick={() => setStep(3)} className="btn-primary flex items-center gap-2" disabled={!form.name || !form.email || !form.password}>
                    Next <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Role-specific details */}
            {step === 3 && (
              <div className="space-y-4 animate-fade-in">
                <h3 className="text-lg font-semibold mb-4">
                  {form.role === 'student' ? 'Student Details' : form.role === 'faculty' || form.role === 'department_admin' ? 'Faculty Details' : 'Additional Info'}
                </h3>

                {form.role === 'student' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-cos-text-secondary mb-1.5">Roll Number</label>
                      <input className="input-field" value={form.rollNumber} onChange={e => updateForm('rollNumber', e.target.value)} required placeholder="CSE2024001" />
                    </div>
                    <div>
                      <label className="block text-sm text-cos-text-secondary mb-1.5">Batch</label>
                      <input className="input-field" value={form.batch} onChange={e => updateForm('batch', e.target.value)} placeholder="2024" />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm text-cos-text-secondary mb-1.5">Residence Type</label>
                      <div className="flex gap-4">
                        {['day_scholar', 'hosteller'].map(type => (
                          <button key={type} type="button" onClick={() => updateForm('residenceType', type)}
                            className={`flex-1 py-2.5 rounded-lg border text-sm transition-all ${form.residenceType === type ? 'border-cos-primary bg-cos-primary/10 text-cos-primary' : 'border-cos-border text-cos-text-secondary'}`}>
                            {type === 'day_scholar' ? 'Day Scholar' : 'Hosteller'}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-cos-text-secondary mb-1.5">Father&apos;s Name</label>
                      <input className="input-field" value={form.fatherName} onChange={e => updateForm('fatherName', e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-sm text-cos-text-secondary mb-1.5">Father&apos;s Phone</label>
                      <input className="input-field" value={form.fatherPhone} onChange={e => updateForm('fatherPhone', e.target.value)} placeholder="+91 9876543210" />
                    </div>
                    <div>
                      <label className="block text-sm text-cos-text-secondary mb-1.5">Mother&apos;s Name</label>
                      <input className="input-field" value={form.motherName} onChange={e => updateForm('motherName', e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-sm text-cos-text-secondary mb-1.5">Mother&apos;s Phone</label>
                      <input className="input-field" value={form.motherPhone} onChange={e => updateForm('motherPhone', e.target.value)} placeholder="+91 9876543210" />
                    </div>
                  </div>
                )}

                {(form.role === 'faculty' || form.role === 'department_admin') && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-cos-text-secondary mb-1.5">Faculty ID</label>
                      <input className="input-field" value={form.facultyIdNumber} onChange={e => updateForm('facultyIdNumber', e.target.value)} required placeholder="FAC-CSE-001" />
                    </div>
                    <div>
                      <label className="block text-sm text-cos-text-secondary mb-1.5">Designation</label>
                      <input className="input-field" value={form.designation} onChange={e => updateForm('designation', e.target.value)} placeholder="Assistant Professor" />
                    </div>
                  </div>
                )}

                {(form.role === 'security_staff' || form.role === 'maintenance_staff') && (
                  <p className="text-cos-text-secondary text-sm p-4 bg-cos-bg-secondary/50 rounded-lg">
                    No additional details required. Your account will be reviewed by the administration.
                  </p>
                )}

                <div className="flex justify-between pt-4">
                  <button type="button" onClick={() => setStep(2)} className="btn-secondary">Back</button>
                  <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Register <ArrowRight className="w-4 h-4" /></>}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>

        <div className="mt-4 text-center text-sm text-cos-text-secondary">
          Already have an account? <Link href="/login" className="text-cos-primary hover:underline font-medium">Sign In</Link>
        </div>
      </div>
    </div>
  );
}
