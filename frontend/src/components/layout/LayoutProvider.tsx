'use client';

import { usePathname } from 'next/navigation';
import { Navbar } from '@/components/navbar/Navbar';

export function LayoutProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDashboard = pathname?.startsWith('/dashboard');

  return (
    <>
      {/* Show Navbar and Spacer only on non-dashboard pages */}
      {!isDashboard && (
        <>
          <Navbar />
          <div className="pt-16" />
        </>
      )}
      {children}
    </>
  );
}
