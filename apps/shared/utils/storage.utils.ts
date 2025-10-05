/**
 * Cross-platform Storage Utility
 *
 * Web: localStorage
 * Mobile: AsyncStorage
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

/**
 * 스토리지 키 상수
 */
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'auth_token',
  USER_INFO: 'user_info',
  LAST_LOGIN: 'last_login',
} as const;

/**
 * 크로스 플랫폼 Storage 클래스
 */
class Storage {
  /**
   * 값 저장
   */
  async setItem(key: string, value: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        localStorage.setItem(key, value);
      } else {
        await AsyncStorage.setItem(key, value);
      }
    } catch (error) {
      console.error('Storage setItem error:', error);
      throw error;
    }
  }

  /**
   * 값 가져오기
   */
  async getItem(key: string): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        return localStorage.getItem(key);
      } else {
        return await AsyncStorage.getItem(key);
      }
    } catch (error) {
      console.error('Storage getItem error:', error);
      return null;
    }
  }

  /**
   * 값 삭제
   */
  async removeItem(key: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        localStorage.removeItem(key);
      } else {
        await AsyncStorage.removeItem(key);
      }
    } catch (error) {
      console.error('Storage removeItem error:', error);
      throw error;
    }
  }

  /**
   * 모든 값 삭제
   */
  async clear(): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        localStorage.clear();
      } else {
        await AsyncStorage.clear();
      }
    } catch (error) {
      console.error('Storage clear error:', error);
      throw error;
    }
  }

  /**
   * JSON 객체 저장
   */
  async setObject<T>(key: string, value: T): Promise<void> {
    try {
      const jsonValue = JSON.stringify(value);
      await this.setItem(key, jsonValue);
    } catch (error) {
      console.error('Storage setObject error:', error);
      throw error;
    }
  }

  /**
   * JSON 객체 가져오기
   */
  async getObject<T>(key: string): Promise<T | null> {
    try {
      const jsonValue = await this.getItem(key);
      return jsonValue ? JSON.parse(jsonValue) : null;
    } catch (error) {
      console.error('Storage getObject error:', error);
      return null;
    }
  }

  /**
   * 인증 토큰 저장
   */
  async setAuthToken(token: string): Promise<void> {
    await this.setItem(STORAGE_KEYS.AUTH_TOKEN, token);
  }

  /**
   * 인증 토큰 가져오기
   */
  async getAuthToken(): Promise<string | null> {
    return await this.getItem(STORAGE_KEYS.AUTH_TOKEN);
  }

  /**
   * 사용자 정보 저장
   */
  async setUserInfo<T>(userInfo: T): Promise<void> {
    await this.setObject(STORAGE_KEYS.USER_INFO, userInfo);
  }

  /**
   * 사용자 정보 가져오기
   */
  async getUserInfo<T>(): Promise<T | null> {
    return await this.getObject<T>(STORAGE_KEYS.USER_INFO);
  }

  /**
   * 로그아웃 (인증 관련 데이터 삭제)
   */
  async logout(): Promise<void> {
    await this.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    await this.removeItem(STORAGE_KEYS.USER_INFO);
    await this.removeItem(STORAGE_KEYS.LAST_LOGIN);
  }
}

// 싱글톤 인스턴스 export
export const storage = new Storage();
