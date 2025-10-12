import { FastifyPluginAsync } from 'fastify';
import { Type } from '@sinclair/typebox';
import reviewSummaryProcessor from '../services/review-summary-processor.service';
import { ResponseHelper } from '../utils/response.utils';

/**
 * 개별 리뷰 작업 라우트
 * prefix: /api/reviews
 */
const reviewRoutes: FastifyPluginAsync = async (fastify) => {
  
  /**
   * POST /api/reviews/summarize
   * 단일 리뷰 요약 생성 (AI 모델 선택 가능)
   * 
   * 사용 케이스: 
   * - 특정 리뷰만 재요약하고 싶을 때
   * - 다른 AI 모델로 요약을 다시 생성하고 싶을 때
   */
  fastify.post('/summarize', {
    schema: {
      tags: ['reviews'],
      summary: '단일 리뷰 요약 생성 (AI 모델 선택 가능)',
      description: '특정 리뷰 ID에 대해 AI 요약을 생성합니다. 다양한 AI 모델을 선택할 수 있습니다.',
      body: Type.Object({
        reviewId: Type.Number({ description: '리뷰 ID' }),
        useCloud: Type.Optional(Type.Boolean({ 
          description: 'Cloud AI 사용 여부 (기본: false)', 
          default: false 
        })),
        config: Type.Optional(Type.Object({
          model: Type.Optional(Type.String({ 
            description: 'AI 모델 이름 (예: gpt-oss:20b-cloud, gpt-oss:120b-cloud, deepseek-v3.1:671b-cloud)',
            examples: ['gpt-oss:20b-cloud', 'gpt-oss:120b-cloud', 'deepseek-v3.1:671b-cloud']
          })),
          timeout: Type.Optional(Type.Number({ 
            description: '타임아웃 (ms)',
            default: 300000
          }))
        }))
      }),
      response: {
        200: Type.Object({
          result: Type.Boolean(),
          message: Type.String(),
          data: Type.Optional(Type.Object({
            reviewId: Type.Number()
          })),
          timestamp: Type.String()
        }),
        400: Type.Object({
          result: Type.Boolean(),
          message: Type.String(),
          statusCode: Type.Number(),
          timestamp: Type.String()
        }),
        500: Type.Object({
          result: Type.Boolean(),
          message: Type.String(),
          statusCode: Type.Number(),
          timestamp: Type.String()
        })
      }
    }
  }, async (request, reply) => {
    const { reviewId, useCloud = false, config } = request.body as { 
      reviewId: number; 
      useCloud?: boolean; 
      config?: { model?: string; timeout?: number; } 
    };
    
    try {
      await reviewSummaryProcessor.processSingleReview(reviewId, useCloud, config);
      
      const modelInfo = config?.model || 'default';
      const serviceType = useCloud ? 'Cloud' : 'Local';
      
      return ResponseHelper.success(
        reply, 
        { reviewId }, 
        `리뷰 ${reviewId} 요약 완료 (${serviceType}, 모델: ${modelInfo})`
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ 리뷰 요약 실패:', errorMessage);
      return ResponseHelper.error(reply, errorMessage, 500);
    }
  });
};

export default reviewRoutes;
