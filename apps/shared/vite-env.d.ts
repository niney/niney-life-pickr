/**
 * Vite environment variables for Web platform
 * Used by api.config.web.ts
 *
 * Note: This file defines import.meta types for the shared module.
 * The actual values are injected by Vite in the web app.
 */

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly MODE?: string;
  readonly DEV?: boolean;
  readonly PROD?: boolean;
  readonly SSR?: boolean;
}

interface ImportMeta {
  readonly env?: ImportMetaEnv;
}
