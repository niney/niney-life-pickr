/**
 * 메뉴 정규화 서비스
 * AI를 사용하여 메뉴명에서 음식명과 메뉴명을 추출
 */

import { UnifiedOllamaService } from './ollama/unified-ollama.service';
import type { MenuItem } from '../types/crawler.types';

/**
 * 메뉴 정규화 결과
 */
export interface MenuNormalizationResult {
  foodName: string;      // 순수 음식명 (LA갈비, 보쌈, 싸이버거)
  menuName: string;      // 전체 메뉴명 (LA갈비 600G 한상, 보쌈(대))
  normalizedName: string; // 음식명|메뉴명 (같으면 하나만)
}

/**
 * 공통 유틸리티 함수들
 */

/**
 * 단일 메뉴 정규화 프롬프트 생성
 * - 메뉴 1개당 프롬프트 1개 생성
 * - Cloud 병렬 처리를 위한 구조
 */
function createSingleMenuPrompt(menuName: string): string {
  return `다음 메뉴명에서 음식명과 메뉴명을 추출해주세요.

규칙:
1. 브랜드명 제거 (오봉집, 맘스터치, BBQ 등)
2. 음식명: 순수한 음식 이름만 (LA갈비, 보쌈, 싸이버거, 김치찌개 등)
3. 메뉴명: 용량, 구성 등이 포함된 전체 메뉴명 (LA갈비 600G 한상, 보쌈(대), 싸이버거 세트 등)
4. 특선, 점심특선, 추천 등 부가 설명 제거
5. 음식명과 메뉴명이 같으면 foodName과 menuName에 동일한 값 입력
6. 가격 정보는 제거

메뉴: ${menuName}

JSON 형식으로 출력:
{
  "foodName": "음식명",
  "menuName": "메뉴명"
}

예시:
입력: "오봉집 LA갈비 600G 한상(특선)"
출력: { "foodName": "LA갈비", "menuName": "LA갈비 600G 한상" }

입력: "김치찌개"
출력: { "foodName": "김치찌개", "menuName": "김치찌개" }

입력: "맘스터치 싸이버거 세트"
출력: { "foodName": "싸이버거", "menuName": "싸이버거 세트" }

JSON 응답만 출력하세요:`;
}

/**
 * AI 실패 시 폴백 결과 생성
 */
function createFallbackResult(menuName: string): MenuNormalizationResult {
  return {
    foodName: menuName,
    menuName: menuName,
    normalizedName: menuName
  };
}

/**
 * normalizedName 생성 (음식명|메뉴명, 같으면 하나만)
 */
function buildNormalizedName(foodName: string, menuName: string): string {
  if (foodName === menuName) {
    return foodName;
  }
  return `${foodName}|${menuName}`;
}

/**
 * 통합 메뉴 정규화 서비스
 * - UnifiedOllamaService를 직접 사용
 * - Cloud 우선 → 실패 시 Local 자동 전환
 * - 병렬 처리 기본 지원
 */
class MenuNormalizationService extends UnifiedOllamaService {

  /**
   * 메뉴 배치 정규화
   * - 메뉴당 1개 프롬프트 생성
   * - Cloud: 병렬 처리 (Promise.all)
   * - Local: 순차 처리 (for loop) - UnifiedService가 자동 변환
   */
  async normalizeMenuBatch(menuNames: string[]): Promise<MenuNormalizationResult[]> {
    if (menuNames.length === 0) {
      return [];
    }

    try {
      // 1. 각 메뉴당 프롬프트 1개씩 생성
      const prompts = menuNames.map(name => createSingleMenuPrompt(name));
      
      // 2. 병렬/순차 자동 처리 (UnifiedService가 알아서)
      //    - Cloud: generateBatch() → Promise.all로 병렬
      //    - Local: generateBatchLocal() → for loop로 순차
      const responses = await this.generateBatch(prompts, { num_ctx: 2048 });

      // 3. 각 응답 파싱
      const results = responses.map((response, index) => {
        const parsed = this.parseJsonResponse<MenuNormalizationResult>(response);
        
        if (!parsed || !parsed.foodName || !parsed.menuName) {
          console.warn(`⚠️  [${index + 1}/${menuNames.length}] "${menuNames[index]}" 파싱 실패, 원본 사용`);
          return createFallbackResult(menuNames[index]);
        }

        return {
          foodName: parsed.foodName,
          menuName: parsed.menuName,
          normalizedName: buildNormalizedName(parsed.foodName, parsed.menuName)
        };
      });

      return results;

    } catch (error) {
      console.error('❌ 메뉴 정규화 실패:', error);
      // 전체 실패 시 모든 메뉴를 fallback
      return menuNames.map(name => createFallbackResult(name));
    }
  }

  /**
   * MenuItem 배열에 normalized_name 추가
   */
  async addNormalizedNames(menuItems: MenuItem[]): Promise<MenuItem[]> {
    if (menuItems.length === 0) {
      return menuItems;
    }

    await this.ensureReady(); // 서비스 준비 확인
    
    const serviceType = this.getCurrentServiceType();
    console.log(`🤖 ${serviceType.toUpperCase()} AI로 ${menuItems.length}개 메뉴 정규화 중...`);
    const startTime = Date.now();

    // 메뉴명 추출
    const menuNames = menuItems.map(item => item.name);

    // AI로 정규화
    const results = await this.normalizeMenuBatch(menuNames);

    // normalizedName 생성 및 추가
    const enrichedMenuItems = menuItems.map((item, index) => {
      const result = results[index];
      const normalizedName = buildNormalizedName(result.foodName, result.menuName);

      return {
        ...item,
        normalizedName
      };
    });

    const elapsed = Date.now() - startTime;
    console.log(`✅ 메뉴 정규화 완료 (${(elapsed / 1000).toFixed(2)}초)`);

    return enrichedMenuItems;
  }
}

/**
 * 메뉴 정규화 서비스 팩토리
 * @param useCloud - Cloud 사용 시도 여부 (실패 시 자동 Local 전환)
 */
export function createMenuNormalizationService(useCloud: boolean = false) {
  return new MenuNormalizationService(useCloud);
}

/**
 * 메뉴 아이템에 normalized_name 추가하는 헬퍼 함수
 * @param menuItems - 원본 메뉴 아이템 배열
 * @param useCloud - Cloud 사용 시도 여부 (기본: false, 실패 시 자동 Local 전환)
 * @returns normalized_name이 추가된 메뉴 아이템 배열
 */
export async function normalizeMenuItems(
  menuItems: MenuItem[],
  useCloud: boolean = false
): Promise<MenuItem[]> {
  const service = createMenuNormalizationService(useCloud);
  return await service.addNormalizedNames(menuItems);
}

export default {
  createMenuNormalizationService,
  normalizeMenuItems
};
