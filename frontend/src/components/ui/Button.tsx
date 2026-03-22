'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  loading?: boolean;
  icon?: React.ReactNode;
}

export function Button({
  children,
  className,
  variant = 'primary',
  size = 'md',
  loading,
  icon,
  disabled,
  ...props
}: ButtonProps) {
  const variants = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    danger: 'btn-secondary text-red-500 hover:bg-red-500/10 border-red-500/20',
    ghost: 'bg-transparent border-transparent hover:bg-white/5 text-cos-text-muted hover:text-white',
  };

  const sizes = {
    sm: 'px-4 py-2 text-xs',
    md: 'px-6 py-2.5 text-sm',
    lg: 'px-8 py-3.5 text-base',
    icon: 'p-2.5 w-10 h-10 items-center justify-center',
  };

  return (
    <button
      disabled={disabled || loading}
      className={cn(
        'relative inline-flex items-center justify-center font-bold uppercase tracking-widest transition-all outline-none active:scale-[0.98]',
        variants[variant],
        sizes[size as keyof typeof sizes],
        className
      )}
      {...props}
    >
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
      ) : icon && (
        <span className="mr-2">{icon}</span>
      )}
      {children}
    </button>
  );
}
