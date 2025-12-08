const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');

// Config 로드 함수 (Web의 vite.config.ts와 동일한 방식)
function loadConfig() {
  try {
    const configDir = path.resolve(__dirname, '../../config');
    const basePath = path.join(configDir, 'base.yml');

    // base.yml 로드
    const baseFile = fs.readFileSync(basePath, 'utf8');
    const baseConfig = yaml.load(baseFile);

    // NODE_ENV에 따라 추가 config 로드 (production.yml, test.yml 등)
    const env = process.env.NODE_ENV || 'development';
    const envPath = path.join(configDir, `${env}.yml`);

    if (env !== 'development' && fs.existsSync(envPath)) {
      const envFile = fs.readFileSync(envPath, 'utf8');
      const envConfig = yaml.load(envFile);

      // Deep merge: envConfig가 baseConfig를 override
      return deepMerge(baseConfig, envConfig);
    }

    return baseConfig;
  } catch (error) {
    console.warn('Config file not found, using default values');
    return {
      api: {
        url: 'http://localhost:4000',
        mobile: {
          android: 'http://10.0.2.2:4000',
          ios: 'http://localhost:4000',
        },
      },
    };
  }
}

// Deep merge utility
function deepMerge(target, source) {
  const output = { ...target };
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] });
        } else {
          output[key] = deepMerge(target[key], source[key]);
        }
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }
  return output;
}

function isObject(item) {
  return item && typeof item === 'object' && !Array.isArray(item);
}

// YAML config 로드
const loadedConfig = loadConfig();
const apiConfig = loadedConfig.api || {};
const vworldConfig = loadedConfig.vworld || {};

// 환경변수로 주입 (babel-plugin-transform-inline-environment-variables가 치환)
process.env.API_MOBILE_ANDROID = apiConfig.mobile?.android || 'http://10.0.2.2:4000';
process.env.API_MOBILE_IOS = apiConfig.mobile?.ios || 'http://localhost:4000';

// VWorld API 설정
process.env.VWORLD_API_KEY = vworldConfig.apiKey || '';
process.env.VWORLD_GEOCODE_URL = vworldConfig.geocodeUrl || 'https://api.vworld.kr/req/address';
process.env.VWORLD_WMTS_URL = vworldConfig.wmtsUrl || 'https://api.vworld.kr/req/wmts/1.0.0';

module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    // 환경변수를 컴파일 타임에 문자열로 치환
    'babel-plugin-transform-inline-environment-variables',
    // Reanimated plugin은 반드시 마지막에 위치해야 함
    'react-native-reanimated/plugin',
  ],
};
