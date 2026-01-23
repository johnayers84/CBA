import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { JudgeContext, UserRole } from '../types';
import { setAuthToken, getAuthToken } from '../lib/api';

interface AuthState {
  // Auth state
  token: string | null;
  role: UserRole | null;
  judgeContext: JudgeContext | null;

  // Actions
  setToken: (token: string | null) => void;
  setRole: (role: UserRole | null) => void;
  setJudgeContext: (context: JudgeContext | null) => void;
  loginAsJudge: (token: string, context: JudgeContext) => void;
  loginAsAdmin: (token: string) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
  isJudge: () => boolean;
  isAdmin: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: getAuthToken(),
      role: null,
      judgeContext: null,

      setToken: (token) => {
        setAuthToken(token);
        set({ token });
      },

      setRole: (role) => set({ role }),

      setJudgeContext: (judgeContext) => set({ judgeContext }),

      loginAsJudge: (token, context) => {
        setAuthToken(token);
        set({ token, role: 'judge', judgeContext: context });
      },

      loginAsAdmin: (token) => {
        setAuthToken(token);
        set({ token, role: 'admin', judgeContext: null });
      },

      logout: () => {
        setAuthToken(null);
        set({ token: null, role: null, judgeContext: null });
      },

      isAuthenticated: () => !!get().token,

      isJudge: () => get().role === 'judge',

      isAdmin: () => get().role === 'admin' || get().role === 'operator',
    }),
    {
      name: 'cba-auth',
      partialize: (state) => ({
        token: state.token,
        role: state.role,
        judgeContext: state.judgeContext,
      }),
    }
  )
);
