'use client';

import { useEffect } from 'react';
import { useAuthStore } from '@/stores/auth.store';

export function AuthLoader() {
  const loadUser = useAuthStore((state) => state.loadUser);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  return null;
}
