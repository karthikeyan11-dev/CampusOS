'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth.store';

export function AuthLoader() {
  const loadUser = useAuthStore((state) => state.loadUser);
  const updateActivity = useAuthStore((state) => state.updateActivity);

  useEffect(() => {
    loadUser();

    // 🛡️ Activity Tracking for Inactivity Timeout
    let lastUpdate = 0;
    const handleActivity = () => {
      const now = Date.now();
      if (now - lastUpdate > 10000) { // Throttle updates to every 10s
        updateActivity();
        lastUpdate = now;
      }
    };

    window.addEventListener('mousedown', handleActivity);
    window.addEventListener('keydown', handleActivity);
    window.addEventListener('scroll', handleActivity);
    window.addEventListener('touchstart', handleActivity);

    return () => {
      window.removeEventListener('mousedown', handleActivity);
      window.removeEventListener('keydown', handleActivity);
      window.removeEventListener('scroll', handleActivity);
      window.removeEventListener('touchstart', handleActivity);
    };
  }, [loadUser, updateActivity]);

  return null;
}
