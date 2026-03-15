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
    open: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    in_progress: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    resolved: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    closed: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
    rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
    escalated: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    pending: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    approved: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    active: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    expired: 'bg-red-500/20 text-red-400 border-red-500/30',
    completed: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    pending_faculty: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    pending_hod: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    pending_super_admin: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    published: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    pending_approval: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  };
  return colors[status] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
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
    super_admin: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    department_admin: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    faculty: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    student: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    security_staff: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    maintenance_staff: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
  };
  return colors[role] || 'bg-gray-500/20 text-gray-300 border-gray-500/40';
}

export function formatRoleName(role: string): string {
  const names: Record<string, string> = {
    super_admin: 'Super Admin',
    department_admin: 'HOD',
    faculty: 'Faculty',
    student: 'Student',
    security_staff: 'Security',
    maintenance_staff: 'Maintenance',
  };
  return names[role] || role;
}
