/**
 * TypeScript 타입 정의: 환경변수
 * babel.config.js에서 YAML config를 로드하여 주입한 환경변수
 */

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
  }
}

export {};
