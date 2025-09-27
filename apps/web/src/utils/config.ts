import yaml from 'js-yaml';

// Config 타입 정의
export interface AppConfig {
  app: {
    name: string;
    version: string;
    description: string;
  };
  server: {
    web: {
      host: string;
      port: number;
    };
    friendly: {
      host: string;
      port: number;
      cors: {
        origin: string;
      };
      logLevel: string;
    };
    smart: {
      host: string;
      port: number;
    };
  };
  vite: {
    clearScreen: boolean;
    logLevel: string;
  };
  pwa: {
    enabled: boolean;
    registerType: string;
  };
  api: {
    timeout: number;
    retries: number;
  };
}

// 기본 설정값
const defaultConfig: AppConfig = {
  app: {
    name: 'Niney Life Pickr',
    version: '1.0.0',
    description: 'Life decision picker app'
  },
  server: {
    web: {
      host: 'localhost',
      port: 3000
    },
    friendly: {
      host: 'localhost',
      port: 4000,
      cors: {
        origin: 'http://localhost:3000'
      },
      logLevel: 'debug'
    },
    smart: {
      host: 'localhost',
      port: 5000
    }
  },
  vite: {
    clearScreen: true,
    logLevel: 'info'
  },
  pwa: {
    enabled: true,
    registerType: 'autoUpdate'
  },
  api: {
    timeout: 30000,
    retries: 3
  }
};

// Config 로드 함수
export async function loadConfig(): Promise<AppConfig> {
  try {
    // public 폴더의 config 파일을 읽어옴
    const configPath = '/config.yml';
    const response = await fetch(configPath);
    
    if (!response.ok) {
      console.warn('Config file not found, using default config');
      return defaultConfig;
    }
    
    const yamlText = await response.text();
    const config = yaml.load(yamlText) as AppConfig;
    
    // 기본값과 병합
    return {
      ...defaultConfig,
      ...config,
      app: { ...defaultConfig.app, ...config.app },
      server: {
        ...defaultConfig.server,
        ...config.server,
        web: { ...defaultConfig.server.web, ...config.server?.web },
        friendly: { 
          ...defaultConfig.server.friendly, 
          ...config.server?.friendly,
          cors: { 
            ...defaultConfig.server.friendly.cors, 
            ...config.server?.friendly?.cors 
          }
        },
        smart: { ...defaultConfig.server.smart, ...config.server?.smart }
      },
      vite: { ...defaultConfig.vite, ...config.vite },
      pwa: { ...defaultConfig.pwa, ...config.pwa },
      api: { ...defaultConfig.api, ...config.api }
    };
  } catch (error) {
    console.warn('Error loading config:', error);
    return defaultConfig;
  }
}

// 싱글톤 패턴으로 config 관리
let configInstance: AppConfig | null = null;

export async function getConfig(): Promise<AppConfig> {
  if (!configInstance) {
    configInstance = await loadConfig();
  }
  return configInstance;
}

// 특정 설정값 가져오기 헬퍼 함수들
export async function getAppInfo() {
  const config = await getConfig();
  return config.app;
}

export async function getServerConfig() {
  const config = await getConfig();
  return config.server;
}

export async function getPWAConfig() {
  const config = await getConfig();
  return config.pwa;
}

export async function getAPIConfig() {
  const config = await getConfig();
  return config.api;
}
