/**
 * 팁 클러스터링 서비스
 * 유사한 팁들을 그룹화하여 대표 팁으로 병합
 */

import { createUnifiedChatService } from './ollama-chat/ollama-chat.factory';
import type { UnifiedOllamaChatService } from './ollama-chat/unified-ollama-chat.service';
import type { BatchAskRequest } from './ollama-chat/ollama-chat.types';
import type { TipGroup, TipClusterResult } from '../types/db.types';

const CHUNK_SIZE = 30;
const MAX_MERGE_DEPTH = 5;

const SYSTEM_PROMPT = `당신은 음식점 리뷰 팁들을 분석하여 의미적으로 유사한 팁들을 그룹화하는 AI입니다.

⚠️ 핵심 원칙: 비슷한 내용은 반드시 같은 그룹으로!
- 같은 주제(주차, 예약, 메뉴, 분위기 등)는 하나의 그룹으로 병합
- 표현이 달라도 의미가 같으면 같은 그룹
- 지나치게 세분화하지 말고 적극적으로 병합하세요

🔍 같은 그룹으로 묶어야 하는 예시:
- "주차 가능" + "주차장 있음" + "무료 주차" + "주차 편함" → 모두 주차 관련
- "예약 필수" + "예약하고 가세요" + "웨이팅 있음" → 모두 예약/대기 관련
- "맛있어요" + "음식 훌륭" + "요리가 좋음" → 모두 음식 맛 관련
- "친절해요" + "서비스 좋음" + "직원 친절" → 모두 서비스 관련

규칙:
1. 반드시 JSON 형식으로만 응답하세요
2. 비슷한 의미/내용의 팁들을 하나의 그룹으로 묶으세요
3. 단독으로 완전히 고유한 팁만 별도 그룹으로 유지하세요
4. 더 이상 병합할 수 없다고 판단되면 canMergeMore를 false로 설정하세요
5. 그룹 수가 많으면 추가 병합이 필요하므로 canMergeMore를 true로 설정하세요

⭐ 대표 팁(representative) 작성 규칙:
- 추상적이지 않고 구체적인 정보를 포함해야 합니다
- 그룹 내 팁들의 핵심 키워드를 반드시 포함하세요
- 단순히 "좋다", "추천" 같은 모호한 표현 금지
- 구체적인 대상(메뉴명, 장소, 시간 등)이 있으면 명시하세요

대표 팁 좋은/나쁜 예시:
- ❌ "주차 편리" → ✅ "무료 주차장 있음"
- ❌ "음식 추천" → ✅ "꼼장어 구이 맛있음"
- ❌ "분위기 좋음" → ✅ "2층 창가석 분위기 좋음"
- ❌ "예약 필수" → ✅ "주말 저녁 예약 필수"

JSON 형식:
{
  "groups": [
    {
      "representative": "구체적인 대표 팁 문장",
      "originalTips": ["원본 팁1", "원본 팁2", ...],
      "count": 2
    }
  ],
  "canMergeMore": true
}

예시 입력: ["주차 가능", "주차장 있음", "무료 주차됨", "삼겹살 맛있어요", "고기 질이 좋아요", "예약 필수", "웨이팅 길어요"]
예시 출력:
{
  "groups": [
    {"representative": "무료 주차장 이용 가능", "originalTips": ["주차 가능", "주차장 있음", "무료 주차됨"], "count": 3},
    {"representative": "삼겹살 고기 질 좋음", "originalTips": ["삼겹살 맛있어요", "고기 질이 좋아요"], "count": 2},
    {"representative": "예약 필수, 웨이팅 있음", "originalTips": ["예약 필수", "웨이팅 길어요"], "count": 2}
  ],
  "canMergeMore": false
}`;

export class TipClusteringService {
  private chatService: UnifiedOllamaChatService;
  private isReady = false;

  constructor() {
    this.chatService = createUnifiedChatService(
      { prefer: 'cloud', cloudOverrides: { model: 'gpt-oss:120b-cloud' }}
    );
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
   * 팁 클러스터링 실행
   * @param tips 원본 팁 배열
   * @param onProgress 진행 콜백
   * @returns 클러스터링된 그룹 배열
   */
  async cluster(
    tips: string[],
    onProgress?: (stage: string, current: number, total: number) => void
  ): Promise<TipGroup[]> {
    await this.ensureReady();

    console.log(`\n🏷️  팁 클러스터링 시작: ${tips.length}개 팁`);

    if (tips.length === 0) {
      console.log('⚠️  팁이 없습니다');
      return [];
    }
    if (tips.length <= CHUNK_SIZE) {
      // 작은 배열: 단일 요청
      console.log(`📦 단일 요청으로 처리 (${tips.length}개 ≤ ${CHUNK_SIZE})`);
      const result = await this.clusterSingle(tips);
      const groups = result?.groups || tips.map(t => ({ representative: t, originalTips: [t], count: 1 }));
      console.log(`✅ 완료: ${tips.length}개 → ${groups.length}개 그룹`);
      return groups;
    }

    // 1단계: 청크별 클러스터링
    const chunks = this.splitIntoChunks(tips, CHUNK_SIZE);
    console.log(`\n📦 1단계: ${chunks.length}개 청크로 분할 (청크당 최대 ${CHUNK_SIZE}개)`);
    onProgress?.('chunking', 0, chunks.length);

    const requests: BatchAskRequest[] = chunks.map((chunk, idx) => ({
      id: `chunk-${idx}`,
      userMessage: JSON.stringify(chunk),
    }));

    const results = await this.chatService.askBatch<TipClusterResult>(
      SYSTEM_PROMPT,
      requests,
      {
        parseJson: true,
        onProgress: (done, total) => {
          console.log(`  📊 청크 처리: ${done}/${total}`);
          onProgress?.('chunking', done, total);
        },
      }
    );

    // 1차 그룹 수집
    let groups: TipGroup[] = [];
    let successCount = 0;
    let failCount = 0;
    for (const result of results) {
      if (result.success && result.response?.groups) {
        groups.push(...result.response.groups);
        successCount++;
      } else {
        // 실패 시 원본 유지
        const idx = parseInt(result.id.split('-')[1]);
        groups.push(...chunks[idx].map(t => ({ representative: t, originalTips: [t], count: 1 })));
        failCount++;
      }
    }
    console.log(`  ✅ 1단계 완료: ${groups.length}개 그룹 생성 (성공: ${successCount}, 실패: ${failCount})`);

    // 2단계: 재귀적 병합 (최대 MAX_MERGE_DEPTH회)
    let depth = 0;
    let canMergeMore = groups.length > CHUNK_SIZE;

    while (canMergeMore && depth < MAX_MERGE_DEPTH) {
      depth++;
      console.log(`\n🔄 ${depth}단계 병합: ${groups.length}개 그룹 → 재클러스터링`);
      onProgress?.(`merge-${depth}`, 0, 1);

      const representatives = groups.map(g => g.representative);

      if (representatives.length <= CHUNK_SIZE) {
        // 단일 요청으로 병합
        console.log(`  📦 단일 요청으로 병합 (${representatives.length}개)`);
        const mergeResult = await this.clusterSingle(representatives);
        if (mergeResult) {
          const prevCount = groups.length;
          groups = this.mergeGroups(groups, mergeResult.groups);
          canMergeMore = mergeResult.canMergeMore && groups.length > 1;
          console.log(`  ✅ ${prevCount}개 → ${groups.length}개 (canMergeMore: ${canMergeMore})`);
        } else {
          console.log(`  ⚠️ 병합 실패, 종료`);
          canMergeMore = false;
        }
      } else {
        // 청크로 분할하여 병합
        const mergeChunks = Math.ceil(representatives.length / CHUNK_SIZE);
        console.log(`  📦 ${mergeChunks}개 청크로 분할하여 병합`);
        const prevCount = groups.length;
        const mergedGroups = await this.clusterMultiple(representatives, (done, total) => {
          console.log(`    📊 병합 청크: ${done}/${total}`);
          onProgress?.(`merge-${depth}`, done, total);
        });
        groups = this.mergeGroups(groups, mergedGroups);
        canMergeMore = groups.length > CHUNK_SIZE;
        console.log(`  ✅ ${prevCount}개 → ${groups.length}개 (canMergeMore: ${canMergeMore})`);
      }

      onProgress?.(`merge-${depth}`, 1, 1);
    }

    console.log(`✅ 팁 클러스터링 완료: ${tips.length}개 → ${groups.length}개 그룹 (depth: ${depth})`);
    return groups;
  }

  /**
   * 단일 배열 클러스터링
   */
  private async clusterSingle(tips: string[]): Promise<TipClusterResult | null> {
    try {
      const response = await this.chatService.ask(
        SYSTEM_PROMPT,
        JSON.stringify(tips),
        { format: 'json' }
      );
      return JSON.parse(response) as TipClusterResult;
    } catch (error) {
      console.error('❌ 클러스터링 실패:', error);
      return null;
    }
  }

  /**
   * 청크 분할 후 배치 클러스터링
   */
  private async clusterMultiple(
    tips: string[],
    onProgress?: (done: number, total: number) => void
  ): Promise<TipGroup[]> {
    const chunks = this.splitIntoChunks(tips, CHUNK_SIZE);
    const requests: BatchAskRequest[] = chunks.map((chunk, idx) => ({
      id: `merge-${idx}`,
      userMessage: JSON.stringify(chunk),
    }));

    const results = await this.chatService.askBatch<TipClusterResult>(
      SYSTEM_PROMPT,
      requests,
      { parseJson: true, onProgress }
    );

    const groups: TipGroup[] = [];
    for (const result of results) {
      if (result.success && result.response?.groups) {
        groups.push(...result.response.groups);
      }
    }
    return groups;
  }

  /**
   * 기존 그룹과 새 그룹 병합
   * 새 그룹의 representative가 기존 그룹의 representative를 포함하면 병합
   */
  private mergeGroups(existingGroups: TipGroup[], newGroups: TipGroup[]): TipGroup[] {
    const repToGroup = new Map<string, TipGroup>();
    for (const g of existingGroups) {
      repToGroup.set(g.representative, g);
    }

    const result: TipGroup[] = [];

    for (const newGroup of newGroups) {
      // 새 그룹의 originalTips 중 기존 representative에 해당하는 것들 찾기
      const mergedOriginalTips: string[] = [];
      let mergedCount = 0;

      for (const tip of newGroup.originalTips) {
        const existing = repToGroup.get(tip);
        if (existing) {
          mergedOriginalTips.push(...existing.originalTips);
          mergedCount += existing.count;
        } else {
          mergedOriginalTips.push(tip);
          mergedCount++;
        }
      }

      result.push({
        representative: newGroup.representative,
        originalTips: mergedOriginalTips,
        count: mergedCount,
      });
    }

    return result;
  }

  /**
   * 배열을 청크로 분할
   */
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
