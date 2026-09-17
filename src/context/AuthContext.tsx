import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import type { User, Role } from '../types/erp';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('erp_token'));
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    async function loadUser() {
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }
      try {
        const currentUser = await api.getCurrentUser();
        const resolvedUser = (currentUser as any)?.user || currentUser;
        setUser(resolvedUser);
      } catch (err) {
        console.error('Failed to authenticate token:', err);
        localStorage.removeItem('erp_token');
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, [token]);

  const login = async (email: string, password: string) => {
    const res = await api.login(email, password);
    localStorage.setItem('erp_token', res.token);
    setToken(res.token);
    const resolvedUser = (res.user as any)?.user || res.user;
    setUser(resolvedUser);

    // Explicitly verify and refresh from authoritative /api/auth/me
    try {
      const me = await api.getCurrentUser();
      const authoritativeUser = (me as any)?.user || me;
      setUser(authoritativeUser);
    } catch {
      // Keep resolvedUser from login payload
    }
  };

  const logout = () => {
    localStorage.removeItem('erp_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
