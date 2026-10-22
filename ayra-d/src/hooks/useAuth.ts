'use client';

import { useState, useEffect } from 'react';
import { AuthRepository, type User } from '@/repositories/AuthRepository';
import { AUTH_EXPIRED_EVENT, clearAuthTokens } from '@/lib/apiClient';
import { disconnectSocket } from '@/lib/socketClient';

interface UseAuthReturn {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load current user on mount
   */
  useEffect(() => {
    refreshUser();
  }, []);

  /**
   * `useAuth` has no shared context — every component that calls it holds its
   * own `user` state. Listen for a broadcast so all instances (e.g. the
   * dashboard header badge) pick up changes made from elsewhere (e.g. the
   * Settings page plan/role switcher) without a full page reload.
   */
  useEffect(() => {
    const onAuthChanged = () => refreshUser();
    window.addEventListener('auth:changed', onAuthChanged);
    return () => window.removeEventListener('auth:changed', onAuthChanged);
  }, []);

  useEffect(() => {
    const onAuthExpired = () => {
      disconnectSocket();
      setUser(null);
      setError(null);
      setLoading(false);
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, onAuthExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onAuthExpired);
  }, []);

  /**
   * Login user
   */
  const login = async (email: string, password: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      disconnectSocket();
      const response = await AuthRepository.login({ email, password });
      setUser(response.user);
    } catch (err: any) {
      setError(err.error || 'Failed to login');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Register new user
   */
  const register = async (email: string, password: string, displayName: string): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      disconnectSocket();
      const response = await AuthRepository.register({ email, password, display_name: displayName });
      setUser(response.user);
    } catch (err: any) {
      setError(err.error || 'Failed to register');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Logout user
   */
  const logout = async (): Promise<void> => {
    try {
      await AuthRepository.logout();
    } catch (err) {
      // Ignore logout errors, still clear user state
      console.error('Logout error:', err);
    } finally {
      setUser(null);
      clearAuthTokens();
      disconnectSocket();
    }
  };

  /**
   * Refresh current user data.
   * The API client already performs one shared refresh-and-retry on 401.
   * A terminal refresh rejection emits auth:expired and clears the session.
   */
  const refreshUser = async (): Promise<void> => {
    try {
      setLoading(true);
      const user = await AuthRepository.getCurrentUser();
      setUser(user);
      setError(null);
    } catch (err: any) {
      if (err.status === 401 || err.status === 403) {
        clearAuthTokens();
        disconnectSocket();
        setUser(null);
        setError(null);
      } else {
        setError(err.error || 'Unable to verify your session');
      }
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    loading,
    error,
    login,
    register,
    logout,
    refreshUser,
  };
}
