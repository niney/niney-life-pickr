import { FastifyPluginAsync } from 'fastify';
import { Type } from '@sinclair/typebox';
import foodCategoryNormalizeService from '../services/food-category/food-category-normalize.service';
import foodCategoryNormalizedRepository from '../db/repositories/food-category-normalized.repository';
import { ResponseHelper } from '../utils/response.utils';

/**
 * Food Category 라우트
 */
const foodCategoryRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * POST /api/food-categories/normalize
   * 음식 카테고리 정규화 실행
   */
  fastify.post('/normalize', {
    schema: {
      tags: ['food-category'],
      summary: '음식 카테고리 정규화 실행',
      description: '중복 없는 데이터는 그대로 복사하고, 같은 name에 다른 category_path가 있는 경우 LLM으로 병합하여 정규화 테이블에 저장합니다.',
      querystring: Type.Object({
        truncate: Type.Optional(Type.Boolean({
          description: '기존 정규화 데이터 삭제 후 재생성 (기본: false)',
          default: false,
        })),
      }),
      response: {
        200: Type.Object({
          result: Type.Boolean(),
          message: Type.String(),
          data: Type.Object({
            success: Type.Boolean(),
            uniqueCopied: Type.Number({ description: '중복 없이 복사된 항목 수' }),
            merged: Type.Number({ description: 'LLM 병합 후 저장된 항목 수' }),
            total: Type.Number({ description: '총 정규화된 항목 수' }),
            errors: Type.Optional(Type.Array(Type.String())),
          }),
          timestamp: Type.String(),
        }),
        500: Type.Object({
          result: Type.Boolean(),
          message: Type.String(),
          statusCode: Type.Number(),
          timestamp: Type.String(),
        }),
      },
    },
  }, async (request, reply) => {
    const { truncate = false } = request.query as { truncate?: boolean };

    try {
      await foodCategoryNormalizeService.init();
      const result = await foodCategoryNormalizeService.normalize({ truncate });

      return ResponseHelper.success(
        reply,
        result,
        `정규화 완료: ${result.uniqueCopied}개 복사, ${result.merged}개 병합, 총 ${result.total}개`
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ 정규화 실패:', errorMessage);
      return ResponseHelper.error(reply, `정규화 실패: ${errorMessage}`, 500);
    }
  });

  /**
   * GET /api/food-categories/normalize/stats
   * 정규화 통계 조회
   */
  fastify.get('/normalize/stats', {
    schema: {
      tags: ['food-category'],
      summary: '정규화 통계 조회',
      description: '정규화된 데이터와 원본 데이터의 통계를 조회합니다.',
      response: {
        200: Type.Object({
          result: Type.Boolean(),
          message: Type.String(),
          data: Type.Object({
            totalNormalized: Type.Number({ description: '정규화된 항목 수' }),
            totalOriginal: Type.Number({ description: '원본 고유 메뉴명 수' }),
            duplicateCount: Type.Number({ description: '중복 경로가 있는 메뉴명 수' }),
            categoryStats: Type.Array(Type.Object({
              category_path: Type.String(),
              count: Type.Number(),
            })),
          }),
          timestamp: Type.String(),
        }),
        500: Type.Object({
          result: Type.Boolean(),
          message: Type.String(),
          statusCode: Type.Number(),
          timestamp: Type.String(),
        }),
      },
    },
  }, async (_request, reply) => {
    try {
      const stats = await foodCategoryNormalizeService.getStats();
      return ResponseHelper.success(reply, stats, '정규화 통계 조회 완료');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ 통계 조회 실패:', errorMessage);
      return ResponseHelper.error(reply, `통계 조회 실패: ${errorMessage}`, 500);
    }
  });

  /**
   * GET /api/food-categories/normalized
   * 정규화된 카테고리 목록 조회
   */
  fastify.get('/normalized', {
    schema: {
      tags: ['food-category'],
      summary: '정규화된 카테고리 목록 조회',
      description: '정규화된 음식 카테고리 전체 목록을 조회합니다.',
      response: {
        200: Type.Object({
          result: Type.Boolean(),
          message: Type.String(),
          data: Type.Array(Type.Object({
            id: Type.Number(),
            name: Type.String(),
            category_path: Type.String(),
            source_count: Type.Number(),
            created_at: Type.String(),
            updated_at: Type.String(),
          })),
          timestamp: Type.String(),
        }),
        500: Type.Object({
          result: Type.Boolean(),
          message: Type.String(),
          statusCode: Type.Number(),
          timestamp: Type.String(),
        }),
      },
    },
  }, async (_request, reply) => {
    try {
      const data = await foodCategoryNormalizedRepository.findAll();
      return ResponseHelper.success(reply, data, `${data.length}개 조회 완료`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ 목록 조회 실패:', errorMessage);
      return ResponseHelper.error(reply, `목록 조회 실패: ${errorMessage}`, 500);
    }
  });

  /**
   * GET /api/food-categories/normalized/:name
   * 메뉴명으로 정규화된 카테고리 조회
   */
  fastify.get('/normalized/:name', {
    schema: {
      tags: ['food-category'],
      summary: '메뉴명으로 정규화된 카테고리 조회',
      params: Type.Object({
        name: Type.String({ description: '메뉴명' }),
      }),
      response: {
        200: Type.Object({
          result: Type.Boolean(),
          message: Type.String(),
          data: Type.Union([
            Type.Object({
              id: Type.Number(),
              name: Type.String(),
              category_path: Type.String(),
              source_count: Type.Number(),
              created_at: Type.String(),
              updated_at: Type.String(),
            }),
            Type.Null(),
          ]),
          timestamp: Type.String(),
        }),
        404: Type.Object({
          result: Type.Boolean(),
          message: Type.String(),
          statusCode: Type.Number(),
          timestamp: Type.String(),
        }),
      },
    },
  }, async (request, reply) => {
    const { name } = request.params as { name: string };

    try {
      const data = await foodCategoryNormalizedRepository.findByName(decodeURIComponent(name));
      
      if (!data) {
        return ResponseHelper.error(reply, `'${name}' 메뉴를 찾을 수 없습니다.`, 404);
      }

      return ResponseHelper.success(reply, data, '조회 완료');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ 조회 실패:', errorMessage);
      return ResponseHelper.error(reply, `조회 실패: ${errorMessage}`, 500);
    }
  });
};

export default foodCategoryRoutes;
