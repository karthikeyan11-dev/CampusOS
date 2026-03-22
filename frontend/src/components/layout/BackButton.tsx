'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

export function BackButton({ className = '' }: { className?: string }) {
  const router = useRouter();

  return (
    <button
      onClick={() => router.back()}
      className={`inline-flex items-center gap-2 text-sm text-cos-text-secondary hover:text-cos-primary transition-colors ${className}`}
    >
      <ArrowLeft className="w-4 h-4" /> Back
    </button>
  );
}
