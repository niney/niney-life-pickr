/// <reference types="node" />

/**
 * API Configuration for Mobile Platform (Android/iOS)
 * Uses YAML config loaded via babel.config.js
 * - Development: config/base.yml
 * - Production: config/production.yml (merged with base.yml)
 */

import { Platform } from 'react-native';

export const getDefaultApiUrl = (): string => {
  // Babel이 컴파일 타임에 YAML에서 로드한 환경변수를 문자열로 치환
  // babel-plugin-transform-inline-environment-variables 사용

  if (Platform.OS === 'android' && process.env.API_MOBILE_ANDROID) {
    return process.env.API_MOBILE_ANDROID;
  }

  if (Platform.OS === 'ios' && process.env.API_MOBILE_IOS) {
    return process.env.API_MOBILE_IOS;
  }

  // Fallback (환경변수가 없는 경우)
  console.warn('API URL not found in config, using fallback');
  return 'https://nlpfriendly.easypcb.co.kr';
};
