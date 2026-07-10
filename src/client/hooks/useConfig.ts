import { useState, useEffect } from 'react';
import { AppConfig, UserInfo } from '../types';

export function useConfig() {
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/config')
      .then(r => r.json())
      .then(setConfig)
      .catch(() => setConfig({ mode: 'standalone', features: { auth: false, registration: false, multiFamily: false } }))
      .finally(() => setLoading(false));
  }, []);

  return { config, loading };
}

export function useAuth(config: AppConfig | null) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [user, setUser] = useState<UserInfo | null>(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });

  const isAuthenticated = config?.mode === 'standalone' || !!token;

  const handleLoginSuccess = (userInfo: UserInfo, newToken: string) => {
    setToken(newToken);
    setUser(userInfo);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  return { token, user, isAuthenticated, handleLoginSuccess, logout };
}

// 为 fetch 请求添加 Authorization header
export function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('token');
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}
