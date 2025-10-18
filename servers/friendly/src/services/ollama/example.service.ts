/**
 * Ollama 서비스 사용 예시
 *
 * Recipe 생성을 위한 Local/Cloud Ollama 서비스 구현
 */

import { BaseLocalOllamaService } from './local-ollama.service';
import { BaseCloudOllamaService } from './cloud-ollama.service';
import { createLocalConfig, createCloudConfig, printOllamaConfig } from './ollama.config';
import type { LocalOllamaConfig, CloudOllamaConfig } from './ollama.types';

/**
 * Recipe 인터페이스 (예시)
 */
interface Recipe {
  name: string;
  ingredients: string[];
  steps: string[];
  cookingTime: number;
}

/**
 * Local Ollama를 사용한 Recipe 서비스
 */
export class RecipeLocalService extends BaseLocalOllamaService {
  /**
   * 재료 기반 레시피 생성
   */
  async generateRecipe(ingredients: string[]): Promise<Recipe | null> {
    const prompt = `다음 재료로 레시피를 JSON 형식으로 생성해주세요:
재료: ${ingredients.join(', ')}

응답 형식:
{
  "name": "요리 이름",
  "ingredients": ["재료1", "재료2"],
  "steps": ["단계1", "단계2"],
  "cookingTime": 30
}`;

    try {
      const response = await this.generate(prompt, {
        temperature: 0.7,
        num_ctx: 2048,
      });

      return this.parseJsonResponse<Recipe>(response);
    } catch (error) {
      console.error('레시피 생성 실패:', error);
      return null;
    }
  }
}

/**
 * Cloud Ollama를 사용한 Recipe 서비스
 */
export class RecipeCloudService extends BaseCloudOllamaService {
  /**
   * 재료 기반 레시피 생성
   */
  async generateRecipe(ingredients: string[]): Promise<Recipe | null> {
    const prompt = `다음 재료로 레시피를 JSON 형식으로 생성해주세요:
재료: ${ingredients.join(', ')}

응답 형식:
{
  "name": "요리 이름",
  "ingredients": ["재료1", "재료2"],
  "steps": ["단계1", "단계2"],
  "cookingTime": 30
}`;

    try {
      const response = await this.generate(prompt, {
        temperature: 0.7,
        num_ctx: 2048,
      });

      return this.parseJsonResponse<Recipe>(response);
    } catch (error) {
      console.error('레시피 생성 실패:', error);
      return null;
    }
  }

  /**
   * 여러 재료 조합에 대한 레시피 일괄 생성
   */
  async generateRecipeBatch(ingredientsList: string[][]): Promise<(Recipe | null)[]> {
    const prompts = ingredientsList.map(ingredients =>
      `다음 재료로 레시피를 JSON 형식으로 생성해주세요:
재료: ${ingredients.join(', ')}

응답 형식:
{
  "name": "요리 이름",
  "ingredients": ["재료1", "재료2"],
  "steps": ["단계1", "단계2"],
  "cookingTime": 30
}`
    );

    try {
      const responses = await this.generateBatch(prompts, {
        temperature: 0.7,
        num_ctx: 2048,
      });

      return responses.map(response => this.parseJsonResponse<Recipe>(response));
    } catch (error) {
      console.error('레시피 일괄 생성 실패:', error);
      return ingredientsList.map(() => null);
    }
  }
}

/**
 * Recipe 서비스 팩토리 함수
 *
 * @param useCloud - Cloud 사용 여부 (기본값: false)
 * @param customConfig - 커스텀 설정 (선택)
 * @returns RecipeLocalService | RecipeCloudService | null
 */
export function createRecipeService(
  useCloud: boolean = false,
  customConfig?: Partial<LocalOllamaConfig | CloudOllamaConfig>
): RecipeLocalService | RecipeCloudService | null {
  if (useCloud) {
    const cloudConfig = createCloudConfig(customConfig as Partial<CloudOllamaConfig>);

    if (!cloudConfig) {
      console.error('❌ Cloud Ollama 설정 실패 (API 키가 없습니다)');
      console.log('💡 Local Ollama를 사용하려면 useCloud=false로 설정하세요.');
      return null;
    }

    printOllamaConfig('cloud', cloudConfig);
    return new RecipeCloudService(cloudConfig);
  }

  const localConfig = createLocalConfig(customConfig as Partial<LocalOllamaConfig>);
  printOllamaConfig('local', localConfig);
  return new RecipeLocalService(localConfig);
}

/**
 * 사용 예시 (주석 처리)
 */
/*async function example() {
  // 1. Local Ollama 사용 (기본)
  const localService = createRecipeService(false);
  if (localService) {
    const isReady = await localService.checkStatus();
    if (isReady) {
      const recipe = await localService.generateRecipe(['토마토', '달걀', '양파']);
      console.log('생성된 레시피:', recipe);
    }
  }

  // 2. Cloud Ollama 사용
  const cloudService = createRecipeService(true);
  if (cloudService && cloudService instanceof RecipeCloudService) {
    const isReady = await cloudService.checkStatus();
    if (isReady) {
      // 단일 레시피 생성
      const recipe = await cloudService.generateRecipe(['감자', '치즈', '베이컨']);
      console.log('생성된 레시피:', recipe);

      // 병렬 레시피 생성
      const recipes = await cloudService.generateRecipeBatch([
        ['토마토', '달걀'],
        ['감자', '치즈'],
        ['양파', '고기']
      ]);
      console.log('생성된 레시피들:', recipes);
    }
  }

  // 3. 커스텀 설정 사용
  const customService = createRecipeService(false, {
    url: 'http://192.168.1.100:11434',
    model: 'llama3:8b',
    timeout: 30000,
  });
}*/
