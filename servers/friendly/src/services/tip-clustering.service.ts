/**
 * 팁 클러스터링 서비스 (카테고리 기반)
 *
 * 3단계 프로세스:
 * Step 1: 팁 → 카테고리 추출 (배치 병렬)
 * Step 2: 카테고리 중복제거 + 대표명 정리
 * Step 3: 전체 팁을 카테고리에 매핑 (배치 병렬)
 */

import { createUnifiedChatService } from './ollama-chat/ollama-chat.factory';
import type { UnifiedOllamaChatService } from './ollama-chat/unified-ollama-chat.service';
import type { BatchAskRequest } from './ollama-chat/ollama-chat.types';
import type { TipGroup } from '../types/db.types';

const CHUNK_SIZE = 30;

// ============================================
// Step 1: 카테고리 추출 프롬프트
// ============================================
const EXTRACT_CATEGORY_PROMPT = `당신은 음식점 리뷰 팁들을 분석하여 카테고리로 분류하는 AI입니다.

각 팁에 대해 구체적인 카테고리를 추출하세요.

⚠️ 카테고리 작성 규칙:
- 추상적이지 않고 구체적으로 작성 (예: "주차" → "무료 주차장")
- 팁의 핵심 내용을 반영하는 카테고리명
- 비슷한 의미의 팁들은 같은 카테고리로

카테고리 예시:
- "주차 가능" → "무료 주차장 이용"
- "예약 필수" → "예약/웨이팅 필요"
- "삼겹살 맛있어요" → "삼겹살 추천"
- "직원 친절" → "친절한 서비스"
- "2인 세트 추천" → "세트 메뉴 추천"

반드시 JSON 형식으로만 응답하세요:
{
  "items": [
    {"tip": "원본 팁", "category": "구체적 카테고리명"},
    ...
  ]
}`;

// ============================================
// Step 2: 카테고리 중복제거 프롬프트
// ============================================
const DEDUPE_CATEGORY_PROMPT = `당신은 카테고리 목록을 정리하여 중복을 제거하고 대표 카테고리명으로 통합하는 AI입니다.

⚠️ 규칙:
- 의미가 같거나 유사한 카테고리는 하나로 병합
- 대표 카테고리명은 구체적이고 명확하게
- 너무 세분화하지 말고 적극적으로 통합

병합 예시:
- "무료 주차장", "주차 가능", "주차장 있음" → "무료 주차장 이용 가능"
- "예약 필수", "웨이팅 있음", "예약 추천" → "예약/웨이팅 필요"
- "삼겹살 맛있음", "고기 질 좋음" → "고기류 메뉴 추천"

반드시 JSON 형식으로만 응답하세요:
{
  "categories": [
    {
      "name": "대표 카테고리명",
      "originalCategories": ["원본1", "원본2", ...]
    },
    ...
  ]
}`;

// ============================================
// Step 3: 카테고리 매핑 프롬프트
// ============================================
const MAP_TO_CATEGORY_PROMPT = `당신은 팁들을 주어진 카테고리 목록에 매핑하는 AI입니다.

⚠️ 규칙:
- 각 팁은 반드시 주어진 카테고리 목록 중 하나에 매핑
- 가장 적합한 카테고리를 선택
- 완벽히 맞지 않아도 가장 유사한 카테고리를 선택하세요
- "기타" 카테고리는 사용하지 마세요
- confidence는 0.0~1.0 사이 값 (확신도)

반드시 JSON 형식으로만 응답하세요:
{
  "mappings": [
    {"tip": "원본 팁", "category": "카테고리명", "confidence": 0.95},
    ...
  ]
}`;

// ============================================
// 타입 정의
// ============================================
interface ExtractedItem {
  tip: string;
  category: string;
}

interface ExtractResult {
  items: ExtractedItem[];
}

interface DedupeCategory {
  name: string;
  originalCategories: string[];
}

interface DedupeResult {
  categories: DedupeCategory[];
}

interface MappingItem {
  tip: string;
  category: string;
  confidence: number;
}

interface MappingResult {
  mappings: MappingItem[];
}

// ============================================
// 서비스 클래스
// ============================================
export class TipClusteringService {
  private chatService: UnifiedOllamaChatService;
  private isReady = false;

  constructor() {
    this.chatService = createUnifiedChatService({ prefer: 'cloud', cloudOverrides: { model: 'gpt-oss:120b-cloud' } });
  }

  /**
   * 서비스 초기화
   */
  async ensureReady(): Promise<void> {
    if (this.isReady) return;
    await this.chatService.ensureReady();
    this.isReady = true;
  }

  /**
   * 팁 클러스터링 실행 (3단계 프로세스)
   */
  async cluster(tips: string[]): Promise<TipGroup[]> {
    await this.ensureReady();

    console.log(`\n🏷️  팁 클러스터링 시작: ${tips.length}개 팁`);

    if (tips.length === 0) {
      console.log('⚠️  팁이 없습니다');
      return [];
    }

    // Step 1: 카테고리 추출
    console.log(`\n📦 Step 1: 카테고리 추출`);
    const extractedItems = await this.extractCategories(tips);
    const uniqueCategories = [...new Set(extractedItems.map(item => item.category))];
    console.log(`  ✅ ${extractedItems.length}개 팁 → ${uniqueCategories.length}개 카테고리 추출`);

    // Step 2: 카테고리 중복제거
    console.log(`\n🔄 Step 2: 카테고리 중복제거`);
    const dedupeCategories = await this.dedupeCategories(uniqueCategories);
    console.log(`  ✅ ${uniqueCategories.length}개 → ${dedupeCategories.length}개 카테고리로 통합`);

    // Step 3: 팁을 카테고리에 매핑
    console.log(`\n📍 Step 3: 팁 → 카테고리 매핑`);
    const categoryNames = dedupeCategories.map(c => c.name);
    const mappings = await this.mapToCategories(tips, categoryNames);
    console.log(`  ✅ ${mappings.length}개 팁 매핑 완료`);

    // 결과 그룹화
    const groups = this.buildGroups(mappings);
    console.log(`\n✅ 클러스터링 완료: ${tips.length}개 팁 → ${groups.length}개 그룹`);

    return groups;
  }

  // ============================================
  // Step 1: 카테고리 추출
  // ============================================
  private async extractCategories(tips: string[]): Promise<ExtractedItem[]> {
    const chunks = this.splitIntoChunks(tips, CHUNK_SIZE);

    const requests: BatchAskRequest[] = chunks.map((chunk, idx) => ({
      id: `extract-${idx}`,
      userMessage: JSON.stringify(chunk),
    }));

    const results = await this.chatService.askBatch<ExtractResult>(
      EXTRACT_CATEGORY_PROMPT,
      requests,
      {
        parseJson: true,
        onProgress: (done, total) => console.log(`  📊 추출 진행: ${done}/${total}`),
      }
    );

    const allItems: ExtractedItem[] = [];
    results.forEach((result, idx) => {
      if (result.success && result.response?.items) {
        allItems.push(...result.response.items);
      } else {
        // 실패 시 원본 팁을 카테고리로 사용
        chunks[idx].forEach(tip => {
          allItems.push({ tip, category: tip });
        });
        console.warn(`  ⚠️ 청크 ${idx} 추출 실패: ${result.error}`);
      }
    });

    return allItems;
  }

  // ============================================
  // Step 2: 카테고리 중복제거
  // ============================================
  private async dedupeCategories(categories: string[]): Promise<DedupeCategory[]> {
    if (categories.length <= CHUNK_SIZE) {
      // 작은 배열: 단일 요청
      return await this.dedupeSingle(categories);
    }

    // 큰 배열: 청크로 분할 후 재귀적 처리
    const chunks = this.splitIntoChunks(categories, CHUNK_SIZE);
    const requests: BatchAskRequest[] = chunks.map((chunk, idx) => ({
      id: `dedupe-${idx}`,
      userMessage: JSON.stringify(chunk),
    }));

    const results = await this.chatService.askBatch<DedupeResult>(
      DEDUPE_CATEGORY_PROMPT,
      requests,
      {
        parseJson: true,
        onProgress: (done, total) => console.log(`  📊 중복제거 진행: ${done}/${total}`),
      }
    );

    // 1차 결과 수집
    let deduped: DedupeCategory[] = [];
    results.forEach((result, idx) => {
      if (result.success && result.response?.categories) {
        deduped.push(...result.response.categories);
      } else {
        // 실패 시 원본 유지
        chunks[idx].forEach(cat => {
          deduped.push({ name: cat, originalCategories: [cat] });
        });
      }
    });

    // 아직 많으면 한 번 더 중복제거
    if (deduped.length > CHUNK_SIZE) {
      console.log(`  🔄 2차 중복제거: ${deduped.length}개`);
      const secondPassNames = deduped.map(d => d.name);
      const secondResult = await this.dedupeSingle(secondPassNames);

      // 원본 카테고리 병합
      return secondResult.map(sr => ({
        name: sr.name,
        originalCategories: sr.originalCategories.flatMap(origName => {
          const found = deduped.find(d => d.name === origName);
          return found ? found.originalCategories : [origName];
        }),
      }));
    }

    return deduped;
  }

  private async dedupeSingle(categories: string[]): Promise<DedupeCategory[]> {
    try {
      const response = await this.chatService.ask(
        DEDUPE_CATEGORY_PROMPT,
        JSON.stringify(categories),
        { format: 'json' }
      );
      const parsed = JSON.parse(response) as DedupeResult;
      return parsed.categories || categories.map(c => ({ name: c, originalCategories: [c] }));
    } catch (error) {
      console.error('  ❌ 중복제거 실패:', error);
      return categories.map(c => ({ name: c, originalCategories: [c] }));
    }
  }

  // ============================================
  // Step 3: 카테고리 매핑
  // ============================================
  private async mapToCategories(tips: string[], categoryNames: string[]): Promise<MappingItem[]> {
    const chunks = this.splitIntoChunks(tips, CHUNK_SIZE);

    // 카테고리 목록을 프롬프트에 포함
    const promptWithCategories = `${MAP_TO_CATEGORY_PROMPT}

사용 가능한 카테고리 목록:
${JSON.stringify(categoryNames)}

위 카테고리 중에서 반드시 하나를 선택하세요. 가장 유사한 카테고리를 선택하세요.`;

    const requests: BatchAskRequest[] = chunks.map((chunk, idx) => ({
      id: `map-${idx}`,
      userMessage: JSON.stringify(chunk),
    }));

    const results = await this.chatService.askBatch<MappingResult>(
      promptWithCategories,
      requests,
      {
        parseJson: true,
        onProgress: (done, total) => console.log(`  📊 매핑 진행: ${done}/${total}`),
      }
    );

    const allMappings: MappingItem[] = [];
    results.forEach((result, idx) => {
      if (result.success && result.response?.mappings) {
        allMappings.push(...result.response.mappings);
      } else {
        // 실패 시 원본 팁을 카테고리로 사용
        chunks[idx].forEach(tip => {
          allMappings.push({ tip, category: tip, confidence: 0 });
        });
        console.warn(`  ⚠️ 청크 ${idx} 매핑 실패: ${result.error}`);
      }
    });

    return allMappings;
  }

  // ============================================
  // 결과 그룹화
  // ============================================
  private buildGroups(mappings: MappingItem[]): TipGroup[] {
    // 카테고리별로 팁 그룹화
    const categoryMap = new Map<string, string[]>();

    for (const mapping of mappings) {
      const category = mapping.category;
      if (!categoryMap.has(category)) {
        categoryMap.set(category, []);
      }
      categoryMap.get(category)!.push(mapping.tip);
    }

    // TipGroup 배열로 변환
    const groups: TipGroup[] = [];
    for (const [categoryName, tips] of categoryMap) {
      groups.push({
        representative: categoryName,
        originalTips: tips,
        count: tips.length,
      });
    }

    // count 기준 내림차순 정렬
    groups.sort((a, b) => b.count - a.count);

    return groups;
  }

  // ============================================
  // 유틸리티
  // ============================================
  private splitIntoChunks<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  }
}

export function createTipClusteringService(): TipClusteringService {
  return new TipClusteringService();
}

export default { createTipClusteringService };
