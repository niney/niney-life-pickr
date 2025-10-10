import { useState, useEffect } from 'react';
import { storage } from '../utils';
import type { User } from '../services';

export interface AuthHookReturn {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (user: User, token?: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

/**
 * 인증 상태 관리 Hook
 */
export const useAuth = (): AuthHookReturn => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * 로그인 상태 확인 (초기 로드 시)
   */
  const checkAuth = async () => {
    try {
      setIsLoading(true);
      const savedUser = await storage.getUserInfo<User>();

      if (savedUser) {
        setUser(savedUser);
      }
    } catch (error) {
      console.error('Failed to check auth:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 로그인
   */
  const login = async (user: User, token?: string) => {
    try {
      await storage.setUserInfo(user);

      if (token) {
        await storage.setAuthToken(token);
      }

      setUser(user);
    } catch (error) {
      console.error('Failed to login:', error);
      throw error;
    }
  };

  /**
   * 로그아웃
   */
  const logout = async () => {
    try {
      await storage.logout();
      setUser(null);
    } catch (error) {
      console.error('Failed to logout:', error);
      throw error;
    }
  };

  // 초기 로드 시 인증 상태 확인
  useEffect(() => {
    checkAuth();
  }, []);

  return {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    checkAuth,
  };
};
