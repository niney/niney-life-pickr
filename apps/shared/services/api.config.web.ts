/**
 * API Configuration for Web Platform
 * Uses Vite's import.meta for environment variables
 */

const API_PORT = 4000;

export const getDefaultApiUrl = (): string => {
  // Vite 빌드 시 YAML에서 주입된 값 사용 (Production)
  if (import.meta.env?.MODE === 'production' && import.meta.env?.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }

  // Development: 현재 브라우저의 호스트 사용 (localhost, IP, 도메인 자동 감지)
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    return `${protocol}//${hostname}:${API_PORT}`;
  }

  // Fallback
  return `http://localhost:${API_PORT}`;
};
