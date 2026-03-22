import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatTime(time: string): string {
  const [hours, minutes] = time.split(':');
  const h = parseInt(hours);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayHour = h % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    open: 'bg-cos-primary/15 text-cos-primary border-cos-primary/30',
    in_progress: 'bg-cos-warning/15 text-cos-warning border-cos-warning/30',
    resolved: 'bg-cos-success/15 text-cos-success border-cos-success/30',
    closed: 'bg-white/10 text-cos-text-muted border-white/20',
    rejected: 'bg-cos-danger/15 text-cos-danger border-cos-danger/30',
    escalated: 'bg-cos-danger/20 text-cos-danger border-cos-danger/40',
    pending: 'bg-cos-warning/15 text-cos-warning border-cos-warning/30',
    approved: 'bg-cos-success/15 text-cos-success border-cos-success/30',
    active: 'bg-cos-primary/15 text-cos-primary border-cos-primary/30',
    expired: 'bg-cos-danger/15 text-cos-danger border-cos-danger/30',
    completed: 'bg-cos-success/15 text-cos-success border-cos-success/30',
    exited: 'bg-cos-danger/15 text-cos-danger border-cos-danger/30',
    pending_faculty: 'bg-cos-warning/15 text-cos-warning border-cos-warning/30',
    mentor_approved: 'bg-cos-primary/15 text-cos-primary border-cos-primary/30',
    hod_approved: 'bg-cos-primary/20 text-cos-primary border-cos-primary/40',
    warden_approved: 'bg-cos-primary/25 text-cos-primary border-cos-primary/50',
    published: 'bg-cos-success/15 text-cos-success border-cos-success/30',
    pending_approval: 'bg-cos-warning/15 text-cos-warning border-cos-warning/30',
    opened: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    yet_to_be_closed: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  };
  return colors[status] || 'bg-white/10 text-cos-text-muted border-white/20';
}

export function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    low: 'bg-emerald-500/20 text-emerald-400',
    medium: 'bg-amber-500/20 text-amber-400',
    high: 'bg-orange-500/20 text-orange-400',
    critical: 'bg-red-500/20 text-red-400',
  };
  return colors[priority] || 'bg-gray-500/20 text-gray-400';
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function truncate(str: string, length: number): string {
  return str.length > length ? str.substring(0, length) + '...' : str;
}

export function getRoleBadgeColor(role: string): string {
  const colors: Record<string, string> = {
    super_admin: 'bg-cos-primary/20 text-cos-primary border-cos-primary/40',
    department_admin: 'bg-cos-primary/15 text-cos-primary border-cos-primary/30',
    faculty: 'bg-white/5 text-cos-text-primary border-white/10',
    student: 'bg-white/5 text-cos-text-primary border-white/10',
    security_staff: 'bg-cos-primary/10 text-cos-primary border-cos-primary/20',
    maintenance_staff: 'bg-white/5 text-cos-text-muted border-white/10',
    warden: 'bg-cos-primary/15 text-cos-primary border-cos-primary/30',
    deputy_warden: 'bg-cos-primary/10 text-cos-primary border-cos-primary/20',
  };
  return colors[role] || 'bg-white/5 text-cos-text-muted border-white/10';
}

export function formatRoleName(role: string): string {
  const names: Record<string, string> = {
    super_admin: 'Super Admin',
    department_admin: 'HOD',
    faculty: 'Faculty',
    student: 'Student',
    security_staff: 'Security',
    maintenance_staff: 'Maintenance',
    warden: 'Warden',
    deputy_warden: 'Deputy Warden',
  };
  return names[role] || role;
}
