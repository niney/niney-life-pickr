/**
 * Ollama Chat 서비스 팩토리
 */

import { CloudOllamaChatService } from './cloud-ollama-chat.service';
import { CloudOllamaWebService } from './cloud-ollama-web.service';
import { LocalOllamaChatService } from './local-ollama-chat.service';
import { UnifiedOllamaChatService } from './unified-ollama-chat.service';
import { createCloudConfig, createLocalConfig } from '../ollama/ollama.config';
import type {
  CloudOllamaChatConfig,
  LocalOllamaChatConfig,
  UnifiedOllamaChatConfig,
} from './ollama-chat.types';

/**
 * Cloud Chat 서비스 생성
 */
export function createCloudChatService(
  overrides?: Partial<CloudOllamaChatConfig>
): CloudOllamaChatService {
  const cloudConfig = createCloudConfig();
  if (!cloudConfig) {
    throw new Error('Cloud 설정이 없습니다. base.yml을 확인하세요.');
  }

  return new CloudOllamaChatService({
    host: cloudConfig.host,
    model: overrides?.model ?? cloudConfig.model,
    apiKey: overrides?.apiKey ?? cloudConfig.apiKey!,
    timeout: overrides?.timeout ?? cloudConfig.timeout,
  });
}

/**
 * Cloud Web 서비스 생성 (Chat + 웹 검색/페치)
 */
export function createCloudWebService(
  overrides?: Partial<CloudOllamaChatConfig>
): CloudOllamaWebService {
  const cloudConfig = createCloudConfig();
  if (!cloudConfig) {
    throw new Error('Cloud 설정이 없습니다. base.yml을 확인하세요.');
  }

  return new CloudOllamaWebService({
    host: cloudConfig.host,
    model: overrides?.model ?? cloudConfig.model,
    apiKey: overrides?.apiKey ?? cloudConfig.apiKey!,
    timeout: overrides?.timeout ?? cloudConfig.timeout,
  });
}

/**
 * Local Chat 서비스 생성
 */
export function createLocalChatService(
  overrides?: Partial<LocalOllamaChatConfig>
): LocalOllamaChatService {
  const localConfig = createLocalConfig();

  return new LocalOllamaChatService({
    url: overrides?.url ?? localConfig.url,
    model: overrides?.model ?? localConfig.model,
    timeout: overrides?.timeout ?? localConfig.timeout,
  });
}

/**
 * Unified Chat 서비스 생성 옵션
 */
export interface CreateUnifiedChatOptions {
  /** 우선 사용할 서비스 ('cloud' | 'local'), 기본값: 'cloud' */
  prefer?: 'cloud' | 'local';
  /** Cloud 설정 활성화 여부, 기본값: true */
  enableCloud?: boolean;
  /** Local 설정 활성화 여부, 기본값: true */
  enableLocal?: boolean;
  /** Cloud 설정 오버라이드 */
  cloudOverrides?: Partial<CloudOllamaChatConfig>;
  /** Local 설정 오버라이드 */
  localOverrides?: Partial<LocalOllamaChatConfig>;
}

/**
 * Unified Chat 서비스 생성 (Cloud + Local 통합)
 */
export function createUnifiedChatService(
  options?: CreateUnifiedChatOptions
): UnifiedOllamaChatService {
  const config: UnifiedOllamaChatConfig = {
    prefer: options?.prefer ?? 'cloud',
  };

  // Cloud 설정
  if (options?.enableCloud !== false) {
    const cloudConfig = createCloudConfig();
    if (cloudConfig) {
      config.cloud = {
        host: options?.cloudOverrides?.host ?? cloudConfig.host,
        model: options?.cloudOverrides?.model ?? cloudConfig.model,
        apiKey: options?.cloudOverrides?.apiKey ?? cloudConfig.apiKey!,
        timeout: options?.cloudOverrides?.timeout ?? cloudConfig.timeout,
      };
    }
  }

  // Local 설정
  if (options?.enableLocal !== false) {
    const localConfig = createLocalConfig();
    config.local = {
      url: options?.localOverrides?.url ?? localConfig.url,
      model: options?.localOverrides?.model ?? localConfig.model,
      timeout: options?.localOverrides?.timeout ?? localConfig.timeout,
    };
  }

  return new UnifiedOllamaChatService(config);
}