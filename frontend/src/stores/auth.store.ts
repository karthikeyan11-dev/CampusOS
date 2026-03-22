'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { authAPI } from '@/lib/api';

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  phone?: string;
  avatar_url?: string;
  status?: string;
  department?: {
    id: string;
    name: string;
    code: string;
  };
  roll_number?: string;
  residence_type?: string;
  class_name?: string;
  faculty_id_number?: string;
  designation?: string;
  faculty?: {
    designation: string;
    faculty_id_number: string;
    department_id?: string;
  };
  student?: {
    roll_number: string;
    year_of_study: string;
    residence_type: string;
    parents?: {
      father: { name: string, phone: string };
      mother: { name: string, phone: string };
    };
    academic?: {
      mentor: { name: string, phone: string };
      hod: { name: string, phone: string };
    };
    hostel?: {
      name: string;
      warden: { name: string, phone: string };
    };
  };
  approved_at?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loadUser: () => Promise<void>;
  setUser: (user: User) => void;
  resetError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await authAPI.login(email, password);
          const { accessToken, refreshToken, user } = response.data.data;

          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', refreshToken);
          
          document.cookie = `campusos_token=${accessToken}; path=/; max-age=86400; SameSite=Lax`;
          document.cookie = `campusos_role=${user.role}; path=/; max-age=86400; SameSite=Lax`;

          set({ user, isAuthenticated: true, isLoading: false });
        } catch (error: any) {
          set({ error: error.response?.data?.message || 'Authentication failed', isLoading: false });
          throw error;
        }
      },

      logout: () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        document.cookie = 'campusos_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        document.cookie = 'campusos_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        set({ user: null, isAuthenticated: false, isLoading: false, error: null });
      },

      loadUser: async () => {
        const token = localStorage.getItem('accessToken');
        const state = get();

        if (!token) {
          set({ user: null, isAuthenticated: false, isLoading: false });
          return;
        }

        // 🚀 NON-BLOCKING HYDRATION: If we have a local session, let them in immediately
        if (state.isAuthenticated && state.user) {
          set({ isLoading: false });
        }

        const timeoutPromise = new Promise((_, reject) => 
           setTimeout(() => reject(new Error('AUTH_TIMEOUT')), 5000)
        );

        try {
          console.log('[AUTH] Syncing session with Governance Hub...');
          const response = await Promise.race([
            authAPI.getProfile(),
            timeoutPromise
          ]) as any;

          const verifiedUser = response.data.data;
          set({ user: verifiedUser, isAuthenticated: true, isLoading: false, error: null });

          document.cookie = `campusos_token=${token}; path=/; max-age=86400; SameSite=Lax`;
          document.cookie = `campusos_role=${verifiedUser.role}; path=/; max-age=86400; SameSite=Lax`;
        } catch (error: any) {
          console.warn('[AUTH] Background session sync failed:', error.message);
          
          if (error.message === 'AUTH_TIMEOUT') {
             // If we already had a user, don't crash the UI, just log it.
             if (state.isAuthenticated && state.user) {
                console.warn('[AUTH] Sync timeout, proceeding with local identity.');
                set({ isLoading: false });
             } else {
                set({ error: 'Identity verification timed out. Please check your network.', isLoading: false });
             }
          } else if (error.response?.status === 401) {
             get().logout();
          } else {
             // 500 or other: If already auth'd, just keep going
             if (state.isAuthenticated && state.user) {
                set({ isLoading: false });
             } else {
                set({ error: 'Governance server unreachable.', isLoading: false });
             }
          }
        }
      },

      setUser: (user: User) => set({ user }),
      resetError: () => set({ error: null }),
    }),
    {
      name: 'campusos-auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);
