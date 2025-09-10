import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface ServerConfig {
  host: string;
  port: number;
  strictPort?: boolean;
  open?: boolean;
}

interface ViteConfig {
  clearScreen: boolean;
  logLevel: 'info' | 'warn' | 'error' | 'silent';
}

interface AppConfig {
  name: string;
  version: string;
  description: string;
}

interface ApiConfig {
  baseUrl?: string;
  timeout: number;
  retries: number;
  mockEnabled?: boolean;
}

interface Config {
  app: AppConfig;
  server: ServerConfig;
  vite: ViteConfig;
  pwa: {
    enabled: boolean;
    registerType: 'prompt' | 'autoUpdate';
  };
  api: ApiConfig;
  build?: {
    minify: boolean;
    sourcemap: boolean;
    chunkSizeWarningLimit?: number;
  };
  debug?: {
    enabled: boolean;
    showErrorOverlay: boolean;
    showNetworkRequests: boolean;
  };
  performance?: {
    preload: boolean;
    prefetch: boolean;
    compression: boolean;
  };
}

function loadYamlConfig(filename: string): any {
  // Load from root config directory
  const filePath = path.join(__dirname, '../../../../config', filename);
  if (!fs.existsSync(filePath)) {
    return {};
  }
  const fileContents = fs.readFileSync(filePath, 'utf8');
  return yaml.load(fileContents);
}

function mergeConfigs(...configs: any[]): Config {
  return configs.reduce((merged, config) => {
    return { ...merged, ...config };
  }, {});
}

export function loadConfig(): Config {
  const env = process.env.NODE_ENV || 'development';

  // Load base configuration
  const baseConfig = loadYamlConfig('base.yml');

  // Load environment-specific configuration (production only if exists)
  const envConfig = env === 'production' ? loadYamlConfig('production.yml') : {};

  // Merge configurations (env config overrides base config)
  const config = mergeConfigs(baseConfig, envConfig);

  // Allow environment variables to override
  if (process.env.VITE_PORT) {
    config.server.port = parseInt(process.env.VITE_PORT, 10);
  }

  if (process.env.VITE_HOST) {
    config.server.host = process.env.VITE_HOST;
  }

  return config;
}

export const config = loadConfig();