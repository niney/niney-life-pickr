/**
 * TypeScript 타입 정의: 환경변수 및 모듈
 * babel.config.js에서 YAML config를 로드하여 주입한 환경변수
 */

// SVG imports (react-native-svg-transformer)
declare module '*.svg' {
  import React from 'react';
  import { SvgProps } from 'react-native-svg';
  const content: React.FC<SvgProps>;
  export default content;
}

declare namespace NodeJS {
  interface ProcessEnv {
    /**
     * Android 플랫폼용 API URL
     * - Development: config/base.yml의 api.mobile.android
     * - Production: config/production.yml의 api.mobile.android
     * @example "http://10.0.2.2:4000"
     */
    API_MOBILE_ANDROID?: string;

    /**
     * iOS 플랫폼용 API URL
     * - Development: config/base.yml의 api.mobile.ios
     * - Production: config/production.yml의 api.mobile.ios
     * @example "http://192.168.0.10:4000"
     */
    API_MOBILE_IOS?: string;

    /**
     * Node 환경 (빌드 타입)
     * - "development": base.yml 사용
     * - "production": base.yml + production.yml merge
     */
    NODE_ENV?: 'development' | 'production' | 'test';

    /**
     * VWorld API Key
     * - config/base.yml의 vworld.apiKey
     * @example "64DA561E-6B4A-32A3-AA29-6F2E6B1D6391"
     */
    VWORLD_API_KEY?: string;

    /**
     * VWorld Geocoding API URL
     * - config/base.yml의 vworld.geocodeUrl
     * @example "https://api.vworld.kr/req/address"
     */
    VWORLD_GEOCODE_URL?: string;

    /**
     * VWorld WMTS API URL
     * - config/base.yml의 vworld.wmtsUrl
     * @example "https://api.vworld.kr/req/wmts/1.0.0"
     */
    VWORLD_WMTS_URL?: string;
  }
}

export {};
