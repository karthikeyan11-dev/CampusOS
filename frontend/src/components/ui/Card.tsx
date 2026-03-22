import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hover?: boolean;
  glass?: boolean;
}

export function Card({ 
  children, 
  className, 
  hover = true, 
  glass = true,
  ...props 
}: CardProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden transition-all duration-400',
        glass && 'glass-card border-white/5 bg-white/5 backdrop-blur-3xl',
        hover && 'hover:border-cos-primary/30 hover:bg-white/10 hover:shadow-2xl hover:shadow-orange-500/10 hover:-translate-y-1',
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('p-6 pb-2', className)}>
      {children}
    </div>
  );
}

export function CardContent({ children, className }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('p-6', className)}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('p-6 pt-2 border-t border-white/5', className)}>
      {children}
    </div>
  );
}
