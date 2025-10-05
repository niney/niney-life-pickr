import { FastifyPluginAsync } from 'fastify';
import { Type } from '@sinclair/typebox';
import restaurantRepository from '../db/repositories/restaurant.repository';
import { ResponseHelper } from '../utils/response.utils';

/**
 * TypeBox 스키마 정의
 */

// 카테고리별 카운트 스키마
const CategoryCountSchema = Type.Object({
  category: Type.String({ description: '카테고리 이름 (null인 경우 Unknown)' }),
  count: Type.Number({ description: '해당 카테고리의 음식점 수' })
});

/**
 * 음식점 관련 라우트
 */
const restaurantRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/restaurants/categories
   * 카테고리별 음식점 개수 조회
   */
  fastify.get('/categories', {
    schema: {
      tags: ['restaurants'],
      summary: '카테고리별 음식점 개수 조회',
      description: '모든 카테고리를 group by하여 각 카테고리별 음식점 개수를 반환합니다. 개수 내림차순, 카테고리명 오름차순으로 정렬됩니다.',
      response: {
        200: Type.Object({
          result: Type.Boolean(),
          message: Type.String(),
          data: Type.Array(CategoryCountSchema),
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
  }, async (_request, reply) => {
    try {
      const categories = await restaurantRepository.countByCategory();

      return ResponseHelper.success(
        reply,
        categories,
        `${categories.length}개 카테고리 조회 성공`
      );
    } catch (error) {
      console.error('카테고리 조회 에러:', error);
      return ResponseHelper.error(
        reply,
        error instanceof Error ? error.message : 'Failed to fetch categories',
        500
      );
    }
  });

  /**
   * GET /api/restaurants
   * 음식점 목록 조회 (페이지네이션)
   */
  fastify.get('/', {
    schema: {
      tags: ['restaurants'],
      summary: '음식점 목록 조회',
      description: '저장된 음식점 목록을 페이지네이션으로 조회합니다.',
      querystring: Type.Object({
        limit: Type.Optional(Type.Number({
          description: '페이지당 항목 수 (기본: 20)',
          default: 20,
          minimum: 1,
          maximum: 100
        })),
        offset: Type.Optional(Type.Number({
          description: '시작 위치 (기본: 0)',
          default: 0,
          minimum: 0
        }))
      }),
      response: {
        200: Type.Object({
          result: Type.Boolean(),
          message: Type.String(),
          data: Type.Object({
            total: Type.Number({ description: '전체 음식점 수' }),
            limit: Type.Number({ description: '페이지당 항목 수' }),
            offset: Type.Number({ description: '시작 위치' }),
            restaurants: Type.Array(Type.Any())
          }),
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
    const { limit = 20, offset = 0 } = request.query as { limit?: number; offset?: number };

    try {
      const [restaurants, total] = await Promise.all([
        restaurantRepository.findAll(limit, offset),
        restaurantRepository.count()
      ]);

      return ResponseHelper.success(
        reply,
        {
          total,
          limit,
          offset,
          restaurants
        },
        `${restaurants.length}개 음식점 조회 성공`
      );
    } catch (error) {
      console.error('음식점 목록 조회 에러:', error);
      return ResponseHelper.error(
        reply,
        error instanceof Error ? error.message : 'Failed to fetch restaurants',
        500
      );
    }
  });

  /**
   * GET /api/restaurants/:id
   * 특정 음식점 상세 조회 (메뉴 포함)
   */
  fastify.get('/:id', {
    schema: {
      tags: ['restaurants'],
      summary: '음식점 상세 조회',
      description: '특정 음식점의 상세 정보와 메뉴를 조회합니다.',
      params: Type.Object({
        id: Type.Number({ description: '음식점 ID' })
      }),
      response: {
        200: Type.Object({
          result: Type.Boolean(),
          message: Type.String(),
          data: Type.Object({
            restaurant: Type.Any(),
            menus: Type.Array(Type.Any())
          }),
          timestamp: Type.String()
        }),
        404: Type.Object({
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
    const { id } = request.params as { id: number };

    try {
      const restaurant = await restaurantRepository.findById(id);

      if (!restaurant) {
        return ResponseHelper.notFound(reply, `음식점 ID ${id}를 찾을 수 없습니다`);
      }

      const menus = await restaurantRepository.findMenusByRestaurantId(id);

      return ResponseHelper.success(
        reply,
        {
          restaurant,
          menus
        },
        '음식점 상세 조회 성공'
      );
    } catch (error) {
      console.error('음식점 상세 조회 에러:', error);
      return ResponseHelper.error(
        reply,
        error instanceof Error ? error.message : 'Failed to fetch restaurant',
        500
      );
    }
  });
};

export default restaurantRoutes;
