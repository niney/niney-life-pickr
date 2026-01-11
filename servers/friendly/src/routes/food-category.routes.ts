import { FastifyPluginAsync } from 'fastify';
import { Type } from '@sinclair/typebox';
import foodCategoryNormalizeService from '../services/food-category/food-category-normalize.service';
import foodCategoryNormalizedRepository from '../db/repositories/food-category-normalized.repository';
import foodCategoryRepository from '../db/repositories/food-category.repository';
import { FoodCategoryService } from '../services/food-category';
import { ResponseHelper } from '../utils/response.utils';
import menuStatisticsService from '../services/menu-statistics.service';

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
      description: '기존 정규화 데이터를 삭제하고, 중복 없는 데이터는 그대로 복사, 같은 name에 다른 category_path가 있는 경우 LLM으로 병합하여 정규화 테이블에 저장합니다.',
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
  }, async (_request, reply) => {
    try {
      await foodCategoryNormalizeService.init();
      const result = await foodCategoryNormalizeService.normalize();

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

  /**
   * POST /api/food-categories/classify/:restaurantId
   * 특정 레스토랑의 메뉴를 LLM으로 분류
   */
  fastify.post('/classify/:restaurantId', {
    schema: {
      tags: ['food-category'],
      summary: '레스토랑 메뉴 LLM 분류',
      description: '특정 레스토랑의 메뉴를 LLM을 사용해 카테고리로 분류하고 DB에 저장합니다.',
      params: Type.Object({
        restaurantId: Type.String({ description: '레스토랑 ID' }),
      }),
      querystring: Type.Object({
        source: Type.Optional(Type.Union([
          Type.Literal('naver'),
          Type.Literal('catchtable'),
          Type.Literal('all'),
        ], { description: '리뷰 소스 (기본: naver)', default: 'naver' })),
        forceReclassify: Type.Optional(Type.Boolean({
          description: '기존 데이터가 있어도 삭제 후 재분류 (기본: false)',
          default: false,
        })),
        model: Type.Optional(Type.String({
          description: 'LLM 모델명 (기본: config 설정값). 예: gemma3:27b, qwen3:32b',
        })),
        prefer: Type.Optional(Type.Union([
          Type.Literal('cloud'),
          Type.Literal('local'),
        ], { description: 'LLM 서비스 우선순위 (기본: cloud)', default: 'cloud' })),
      }),
      response: {
        200: Type.Object({
          result: Type.Boolean(),
          message: Type.String(),
          data: Type.Object({
            classificationSuccess: Type.Boolean(),
            restaurantId: Type.Number(),
            categories: Type.Array(Type.Object({
              item: Type.String(),
              path: Type.String(),
              levels: Type.Array(Type.String()),
            })),
            dbStats: Type.Object({
              inserted: Type.Number(),
            }),
            errors: Type.Optional(Type.Array(Type.String())),
            missingInNormalized: Type.Optional(Type.Array(Type.String())),
            normalizedCoverage: Type.Optional(Type.Object({
              total: Type.Number(),
              missing: Type.Number(),
              allNormalized: Type.Boolean(),
            })),
          }),
          timestamp: Type.String(),
        }),
        400: Type.Object({
          result: Type.Boolean(),
          message: Type.String(),
          statusCode: Type.Number(),
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
    const { restaurantId: idStr } = request.params as { restaurantId: string };
    const { source = 'naver', forceReclassify = false, model, prefer } = request.query as {
      source?: 'naver' | 'catchtable' | 'all';
      forceReclassify?: boolean;
      model?: string;
      prefer?: 'cloud' | 'local';
    };
    const restaurantId = parseInt(idStr, 10);

    if (isNaN(restaurantId)) {
      return ResponseHelper.error(reply, '유효하지 않은 레스토랑 ID입니다.', 400);
    }

    try {
      // 1. 기존 데이터 체크
      const existingCategories = await foodCategoryRepository.findByRestaurantId(restaurantId);

      if (existingCategories.length > 0 && !forceReclassify) {
        // 기존 데이터도 정규화 테이블에 있는지 체크
        const existingNames = existingCategories.map(c => c.name);
        let missingInNormalized = await foodCategoryNormalizedRepository.findMissingNames(existingNames);

        // 정규화 안된 메뉴가 있으면 전체 정규화 진행
        let normalizeResult = null;
        if (missingInNormalized.length > 0) {
          console.log(`⚠️ 정규화 테이블에 없는 메뉴: ${missingInNormalized.length}개 → 전체 정규화 진행`);
          await foodCategoryNormalizeService.init();
          normalizeResult = await foodCategoryNormalizeService.normalize();
          console.log(`✅ 정규화 완료: ${normalizeResult.uniqueCopied}개 복사, ${normalizeResult.merged}개 병합`);

          // 정규화 후 다시 체크
          missingInNormalized = await foodCategoryNormalizedRepository.findMissingNames(existingNames);
        }

        return ResponseHelper.success(reply, {
          classificationSuccess: true,
          restaurantId,
          categories: existingCategories.map(c => ({
            item: c.name,
            path: c.category_path,
            levels: c.category_path.split(' > '),
          })),
          dbStats: { inserted: 0 },
          skipped: true,
          missingInNormalized,
          normalizedCoverage: {
            total: existingNames.length,
            missing: missingInNormalized.length,
            allNormalized: missingInNormalized.length === 0,
          },
          normalizeResult,
        }, normalizeResult
          ? `기존 카테고리 데이터가 있습니다 (${existingCategories.length}개), 정규화 ${normalizeResult.total}개 처리. forceReclassify=true로 재분류 가능`
          : `기존 카테고리 데이터가 있습니다 (${existingCategories.length}개, 모두 정규화됨). forceReclassify=true로 재분류 가능`);
      }

      // 2. 강제 재분류 시 기존 데이터 삭제
      if (existingCategories.length > 0 && forceReclassify) {
        const deletedCount = await foodCategoryRepository.deleteByRestaurantId(restaurantId);
        console.log(`🗑️ 기존 카테고리 데이터 삭제: ${deletedCount}개`);
      }

      // 3. 메뉴명 추출 (menu-statistics 서비스 활용)
      const groupingResult = await menuStatisticsService.getMenuGrouping(restaurantId, source);
      // categories에 있는 메뉴 + missingMenus에 있는 메뉴 = 전체 메뉴
      const menuNames = [
        ...groupingResult.categories.map(c => c.item),
        ...(groupingResult.missingMenus ?? []),
      ];

      if (menuNames.length === 0) {
        return ResponseHelper.error(reply, '분류할 메뉴가 없습니다.', 400);
      }

      console.log(`📋 분류할 메뉴: ${menuNames.length}개`);

      // 4. LLM 분류 실행
      const foodCategoryService = new FoodCategoryService({ model, prefer });
      await foodCategoryService.init();
      const classification = await foodCategoryService.classifyAndSave(restaurantId, menuNames);

      // 5. 분류된 메뉴 중 정규화 테이블에 없는 것 체크
      const classifiedNames = classification.categories.map(c => c.item);
      let missingInNormalized = await foodCategoryNormalizedRepository.findMissingNames(classifiedNames);

      // 6. 정규화 안된 메뉴가 있으면 전체 정규화 진행
      let normalizeResult = null;
      if (missingInNormalized.length > 0) {
        console.log(`⚠️ 정규화 테이블에 없는 메뉴: ${missingInNormalized.length}개 → 전체 정규화 진행`);
        await foodCategoryNormalizeService.init();
        normalizeResult = await foodCategoryNormalizeService.normalize();
        console.log(`✅ 정규화 완료: ${normalizeResult.uniqueCopied}개 복사, ${normalizeResult.merged}개 병합`);

        // 정규화 후 다시 체크
        missingInNormalized = await foodCategoryNormalizedRepository.findMissingNames(classifiedNames);
      }

      return ResponseHelper.success(reply, {
        classificationSuccess: classification.success,
        restaurantId,
        categories: classification.categories,
        dbStats: classification.dbStats,
        errors: classification.errors,
        missingInNormalized,
        normalizedCoverage: {
          total: classifiedNames.length,
          missing: missingInNormalized.length,
          allNormalized: missingInNormalized.length === 0,
        },
        normalizeResult,
      }, normalizeResult
        ? `카테고리 분류 완료: ${classification.dbStats.inserted}개 저장, 정규화 ${normalizeResult.total}개 처리`
        : `카테고리 분류 완료: ${classification.dbStats.inserted}개 저장 (모두 정규화됨)`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ 카테고리 분류 실패:', errorMessage);
      return ResponseHelper.error(reply, `카테고리 분류 실패: ${errorMessage}`, 500);
    }
  });
};

export default foodCategoryRoutes;
