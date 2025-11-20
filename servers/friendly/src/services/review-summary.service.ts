/**
 * 리뷰 요약 AI 서비스
 * UnifiedOllamaService를 상속하여 리뷰 요약 기능 제공
 */

import { UnifiedOllamaService } from './ollama/unified-ollama.service';
import type { ReviewDB } from '../types/db.types';
import type { ReviewSummaryData } from '../types/db.types';
import type { BaseOllamaConfig } from './ollama/ollama.types';

class ReviewSummaryService extends UnifiedOllamaService {
  constructor(useCloud: boolean = false, config?: Partial<BaseOllamaConfig>) {
    super(useCloud, config);
  }

  /**
   * 여러 리뷰를 개별적으로 요약 (병렬/순차)
   * @param reviews - 리뷰 배열
   * @param onProgress - 진행 상황 콜백 (선택) (current: number, total: number, batchResults?: string[]) => void
   * @returns 각 리뷰의 요약 결과 배열
   */
  async summarizeReviews(
    reviews: ReviewDB[],
    onProgress?: (current: number, total: number, batchResults?: string[]) => void
  ): Promise<ReviewSummaryData[]> {
    if (reviews.length === 0) {
      return [];
    }

    try {
      // 1. 각 리뷰당 프롬프트 1개 생성
      const prompts = reviews.map(review =>
        this.createSingleReviewPrompt(review)
      );

      // 2. Cloud: 병렬 / Local: 순차 (진행 상황 콜백 전달)
      const responses = await this.generateBatch(
        prompts,
        { num_ctx: 2048 },
        onProgress
      );

      // 3. 초기 파싱 (null 허용)
      const results: (ReviewSummaryData | null)[] = responses.map((response, index) => {
        const parsed = this.parseJsonResponse<ReviewSummaryData>(response);

        if (!parsed || !parsed.summary) {
          console.warn(`⚠️ 리뷰 ${reviews[index].id} 요약 파싱 실패 (1차 시도)`);
          return null;
        }

        return parsed;
      });

      // 4. 파싱 실패 항목 수집
      const failedIndices: number[] = [];
      results.forEach((result, index) => {
        if (result === null) {
          failedIndices.push(index);
        }
      });

      // 5. 재시도 로직
      if (failedIndices.length > 0) {
        console.log(`\n🔄 파싱 실패 ${failedIndices.length}개 항목 재시도...`);

        for (const idx of failedIndices) {
          const review = reviews[idx];

          // 5-1. 현재 서비스로 재시도
          console.log(`  [${idx + 1}/${reviews.length}] 재시도 (리뷰 ${review.id})`);
          const retried = await this.retrySingleReview(review);

          if (retried) {
            console.log(`  ✅ 재시도 성공 (리뷰 ${review.id})`);
            results[idx] = retried;
            continue;
          }

          // 5-2. Local로 재시도 (Cloud였다면)
          const localRetried = await this.tryWithLocalFallback(review);

          if (localRetried) {
            results[idx] = localRetried;
            continue;
          }

          // 5-3. 최종 실패 로그
          console.warn(`  ⚠️ 최종 파싱 실패, Fallback 사용 (리뷰 ${review.id})`);
        }
      }

      // 6. 최종 결과 반환 (null은 fallback으로 대체)
      const finalResults = results.map((result, index) =>
        result || this.createFallbackSummary(reviews[index])
      );

      // 7. 통계 출력
      const successCount = results.filter(r => r !== null).length;
      const fallbackCount = results.filter(r => r === null).length;
      console.log(`\n📊 요약 결과: 성공 ${successCount}, Fallback ${fallbackCount} / 전체 ${reviews.length}`);

      return finalResults;

    } catch (error) {
      console.error('❌ 리뷰 요약 실패:', error);
      return reviews.map(review => this.createFallbackSummary(review));
    }
  }

  /**
   * 단일 리뷰에 대한 프롬프트 생성
   */
  private createSingleReviewPrompt(review: ReviewDB): string {
    const reviewText = review.review_text || '(텍스트 없음)';
    const keywords = review.emotion_keywords || '';
    const visitKeywords = review.visit_keywords || '';
    
    return `다음 리뷰를 분석하여 요약해주세요.

리뷰 내용:
${reviewText}

방문 키워드: ${visitKeywords}
감정 키워드: ${keywords}

중요 규칙:
- 반드시 JSON 형식으로만 응답하세요
- 일반 텍스트나 설명 문장을 절대 포함하지 마세요
- 리뷰 내용이 없거나 분석이 불가능한 경우, summary에 "요약 내용이 없습니다"를 반환하세요

분석 요구사항:
1. 핵심 요약: 리뷰의 핵심 내용을 1-2문장으로 요약
2. 주요 키워드: 리뷰에서 중요한 키워드 3-5개 추출
3. 만족도: 긍정(positive), 부정(negative), 중립(neutral) 판단
4. 만족도 이유: 왜 긍정/부정/중립인지 핵심 이유를 한 문장으로 설명
   - positive 예시: "꼼장어의 맛과 양", "친절한 서비스", "분위기가 좋음"
   - negative 예시: "음식이 짜고 불친절함", "가격 대비 양이 적음"
   - neutral 예시: "평범한 맛", "특별한 점 없음"
5. 만족도 점수: 1-100 사이 숫자로 평가
6. 팁: 이 리뷰에서 얻을 수 있는 유용한 팁 1-3개 (없으면 빈 배열)
7. ✨ 메뉴별 감정 분석:
   - 리뷰에서 언급된 구체적인 메뉴나 음식 이름 추출
   - 각 메뉴에 대한 감정 분석 (positive/negative/neutral)
   - 감정 이유를 10자 이내로 간단히 작성
   - 구체적인 메뉴명만 추출 (예: "꼼장어", "된장찌개", "삼겹살", "냉면", "김치찌개")
   - 일반적인 단어는 제외 (예: "음식", "메뉴", "요리", "반찬", "국")
   - 중복 제거하여 최대 5개까지 추출
   - 없으면 빈 배열 반환

JSON 형식:
{
  "summary": "핵심 요약",
  "keyKeywords": ["키워드1", "키워드2", "키워드3"],
  "sentiment": "positive|negative|neutral",
  "sentimentReason": "만족도 이유",
  "satisfactionScore": 85,
  "tips": ["팁1", "팁2"],
  "menuItems": [
    {"name": "메뉴1", "sentiment": "positive", "reason": "맛있음"},
    {"name": "메뉴2", "sentiment": "negative", "reason": "너무 짬"}
  ]
}

예시 1 (긍정):
{
  "summary": "꼼장어가 정말 맛있고 양도 푸짐했습니다. 서비스도 친절했습니다.",
  "keyKeywords": ["맛있어요", "양 많아요", "친절해요"],
  "sentiment": "positive",
  "sentimentReason": "꼼장어의 맛과 양",
  "satisfactionScore": 90,
  "tips": ["꼼장어 추천", "2인 이상 방문 추천"],
  "menuItems": [
    {"name": "꼼장어", "sentiment": "positive", "reason": "맛있고 양 많음"}
  ]
}

예시 2 (부정):
{
  "summary": "음식이 너무 짜고 직원이 불친절했습니다.",
  "keyKeywords": ["짜요", "불친절", "실망"],
  "sentiment": "negative",
  "sentimentReason": "음식이 짜고 불친절한 서비스",
  "satisfactionScore": 30,
  "tips": [],
  "menuItems": []
}

예시 3 (중립):
{
  "summary": "평범한 맛이었고 특별한 점은 없었습니다.",
  "keyKeywords": ["평범해요", "무난해요"],
  "sentiment": "neutral",
  "sentimentReason": "평범한 맛",
  "satisfactionScore": 50,
  "tips": [],
  "menuItems": []
}

예시 4 (리뷰 내용 없음/분석 불가):
{
  "summary": "요약 내용이 없습니다",
  "keyKeywords": [],
  "sentiment": "neutral",
  "sentimentReason": "",
  "satisfactionScore": 0,
  "tips": [],
  "menuItems": []
}

예시 5 (여러 메뉴 언급 - 긍정/부정 혼합):
{
  "summary": "된장찌개와 삼겹살이 맛있었지만, 냉면은 너무 달았습니다.",
  "keyKeywords": ["맛있어요", "달아요", "푸짐해요"],
  "sentiment": "positive",
  "sentimentReason": "대부분 메뉴의 훌륭한 맛",
  "satisfactionScore": 75,
  "tips": ["된장찌개 추천", "냉면은 호불호"],
  "menuItems": [
    {"name": "된장찌개", "sentiment": "positive", "reason": "맛있음"},
    {"name": "삼겹살", "sentiment": "positive", "reason": "맛있음"},
    {"name": "냉면", "sentiment": "negative", "reason": "너무 달음"}
  ]
}

반드시 위 형식의 JSON만 출력하세요. 다른 텍스트는 포함하지 마세요.`;
  }

  /**
   * 단일 리뷰 재시도 (현재 서비스)
   * @returns 파싱된 결과 또는 null
   */
  private async retrySingleReview(review: ReviewDB): Promise<ReviewSummaryData | null> {
    try {
      const prompt = this.createSingleReviewPrompt(review);
      const response = await this.generateSingle(prompt, { num_ctx: 2048 });
      const parsed = this.parseJsonResponse<ReviewSummaryData>(response);

      if (parsed && parsed.summary) {
        return parsed;
      }
      return null;
    } catch (error) {
      console.error(`  ❌ 재시도 실패 (리뷰 ${review.id}):`, error instanceof Error ? error.message : error);
      return null;
    }
  }

  /**
   * Local로 재시도 (Cloud였던 경우만)
   * @returns 파싱된 결과 또는 null
   */
  private async tryWithLocalFallback(review: ReviewDB): Promise<ReviewSummaryData | null> {
    // Cloud 사용 중이 아니면 skip
    if (this.getCurrentServiceType() !== 'cloud') {
      return null;
    }

    try {
      console.log(`  🔄 Local로 재시도 (리뷰 ${review.id})`);

      // 임시로 Local 서비스 직접 접근 (protected localService)
      // UnifiedOllamaService의 localService를 사용
      const prompt = this.createSingleReviewPrompt(review);

      // Local 서비스 강제 사용을 위해 isCloudAvailable를 임시로 false로 설정하고 generateSingle 호출
      // 더 나은 방법: UnifiedOllamaService에 generateWithLocal 같은 메서드 추가
      // 일단은 새 Local 서비스 인스턴스 생성
      const localService = new ReviewSummaryService(false, this.customConfig);
      const response = await localService.generateSingle(prompt, { num_ctx: 2048 });
      const parsed = this.parseJsonResponse<ReviewSummaryData>(response);

      if (parsed && parsed.summary) {
        console.log(`  ✅ Local 재시도 성공 (리뷰 ${review.id})`);
        return parsed;
      }
      return null;
    } catch (error) {
      console.error(`  ❌ Local 재시도 실패 (리뷰 ${review.id}):`, error instanceof Error ? error.message : error);
      return null;
    }
  }

  /**
   * AI 실패 시 폴백
   */
  private createFallbackSummary(review: ReviewDB): ReviewSummaryData {
    const keywords = review.emotion_keywords?.split(',').map(k => k.trim()) || [];

    return {
      summary: review.review_text || '리뷰 내용 없음',
      keyKeywords: keywords.slice(0, 5),
      sentiment: 'neutral',
      sentimentReason: '정보 부족',
      satisfactionScore: undefined,
      tips: [],
      menuItems: []
    };
  }

  /**
   * JSON 응답 파싱 (Public 메서드)
   */
  parseResponse(response: string): ReviewSummaryData | null {
    const parsed = this.parseJsonResponse<ReviewSummaryData>(response);
    
    // parsed가 없거나 summary 속성이 없으면 null 반환
    // 빈 문자열("")은 유효한 응답으로 처리
    if (!parsed || parsed.summary === undefined || parsed.summary === null) {
      return null;
    }

    return parsed;
  }
}

export function createReviewSummaryService(
  useCloud: boolean = false,
  config?: Partial<BaseOllamaConfig>
) {
  return new ReviewSummaryService(useCloud, config);
}

export default { createReviewSummaryService };
