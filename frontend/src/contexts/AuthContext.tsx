import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { authAPI } from '../services/api';

export interface AuthUser {
  id: number;
  email: string;
  username: string;
  language: string;
  phone?: string | null;
  avatarUrl?: string | null;
  onboardingDone?: boolean;
  isAdmin?: boolean;
}

export interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, username: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const redirectIfOnboardingPending = (u: AuthUser) => {
    if (u.isAdmin) {
      navigate('/admin', { replace: true });
      return;
    }
    if (!u.onboardingDone && location.pathname !== '/onboarding') {
      navigate('/onboarding', { replace: true });
    }
  };

  // Check session on mount
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setIsLoading(false);
      return;
    }
    authAPI
      .me()
      .then(({ data }) => {
        const u: AuthUser = data.data;
        setUser(u);
        redirectIfOnboardingPending(u);
      })
      .catch(() => {
        localStorage.removeItem('accessToken');
      })
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (email: string, password: string) => {
    const { data } = await authAPI.login(email, password);
    const payload = data.data;
    if (payload.accessToken) {
      localStorage.setItem('accessToken', payload.accessToken);
    }
    // Fetch full user (with onboardingDone) from /me after login
    const meRes = await authAPI.me();
    const u: AuthUser = meRes.data.data;
    setUser(u);
    redirectIfOnboardingPending(u);
  };

  const register = async (email: string, password: string, username: string) => {
    const { data } = await authAPI.register(email, password, username);
    const payload = data.data;
    if (payload.accessToken) {
      localStorage.setItem('accessToken', payload.accessToken);
    }
    // New users always need onboarding; fetch /me to confirm onboardingDone status
    const meRes = await authAPI.me();
    const u: AuthUser = meRes.data.data;
    setUser(u);
    redirectIfOnboardingPending(u);
  };

  const refreshUser = async () => {
    const meRes = await authAPI.me();
    const u: AuthUser = meRes.data.data;
    setUser(u);
  };

  const logout = () => {
    authAPI.logout().catch(() => {});
    localStorage.removeItem('accessToken');
    setUser(null);
    queryClient.clear();
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

export default AuthContext;
