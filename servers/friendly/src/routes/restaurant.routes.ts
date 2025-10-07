import { FastifyPluginAsync } from 'fastify';
import { Type } from '@sinclair/typebox';
import restaurantRepository from '../db/repositories/restaurant.repository';
import reviewRepository from '../db/repositories/review.repository';
import { ResponseHelper } from '../utils/response.utils';

/**
 * TypeBox 스키마 정의
 */

// 카테고리별 카운트 스키마
const CategoryCountSchema = Type.Object({
  category: Type.String({ description: '카테고리 이름 (null인 경우 Unknown)' }),
  count: Type.Number({ description: '해당 카테고리의 음식점 수' })
});

// 방문 정보 스키마
const VisitInfoSchema = Type.Object({
  visitDate: Type.Union([Type.String(), Type.Null()], { description: '방문 날짜' }),
  visitCount: Type.Union([Type.String(), Type.Null()], { description: '방문 횟수 (예: 3번째 방문)' }),
  verificationMethod: Type.Union([Type.String(), Type.Null()], { description: '인증 방법 (예: 영수증 인증)' })
});

// 리뷰 스키마
const ReviewSchema = Type.Object({
  id: Type.Number({ description: '리뷰 ID' }),
  userName: Type.Union([Type.String(), Type.Null()], { description: '작성자 이름' }),
  visitKeywords: Type.Array(Type.String(), { description: '방문 키워드 (예: ["혼밥", "재방문"])' }),
  waitTime: Type.Union([Type.String(), Type.Null()], { description: '대기시간 (예: "바로 입장")' }),
  reviewText: Type.Union([Type.String(), Type.Null()], { description: '리뷰 텍스트' }),
  emotionKeywords: Type.Array(Type.String(), { description: '감정 키워드 (예: ["맛있어요", "친절해요"])' }),
  visitInfo: VisitInfoSchema,
  crawledAt: Type.String({ description: '크롤링 시간 (ISO 8601)' }),
  createdAt: Type.String({ description: '생성 시간 (ISO 8601)' })
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
   * GET /api/restaurants/:id/reviews
   * Restaurant ID로 리뷰 조회 (페이지네이션)
   */
  fastify.get('/:id/reviews', {
    schema: {
      tags: ['restaurants'],
      summary: 'Restaurant ID로 리뷰 조회',
      description: '특정 Restaurant ID의 음식점 리뷰를 페이지네이션으로 조회합니다.',
      params: Type.Object({
        id: Type.Number({ description: 'Restaurant ID' })
      }),
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
            total: Type.Number({ description: '전체 리뷰 수' }),
            limit: Type.Number({ description: '페이지당 항목 수' }),
            offset: Type.Number({ description: '시작 위치' }),
            reviews: Type.Array(ReviewSchema)
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
    const { limit = 20, offset = 0 } = request.query as { limit?: number; offset?: number };

    try {
      // 1. Restaurant ID로 음식점 조회
      const restaurant = await restaurantRepository.findById(id);

      if (!restaurant) {
        return ResponseHelper.notFound(reply, `Restaurant ID ${id}에 해당하는 음식점을 찾을 수 없습니다`);
      }

      // 2. 리뷰 조회
      const [reviewsDB, total] = await Promise.all([
        reviewRepository.findByRestaurantId(id, limit, offset),
        reviewRepository.countByRestaurantId(id)
      ]);

      // 3. DB 데이터를 API 응답 형식으로 변환 (쉼표 구분 문자열 → 배열)
      const reviews = reviewsDB.map(review => ({
        id: review.id,
        userName: review.user_name,
        visitKeywords: review.visit_keywords ? review.visit_keywords.split(',') : [],
        waitTime: review.wait_time,
        reviewText: review.review_text,
        emotionKeywords: review.emotion_keywords ? review.emotion_keywords.split(',') : [],
        visitInfo: {
          visitDate: review.visit_date,
          visitCount: review.visit_count,
          verificationMethod: review.verification_method
        },
        crawledAt: review.crawled_at,
        createdAt: review.created_at
      }));

      return ResponseHelper.success(
        reply,
        {
          total,
          limit,
          offset,
          reviews
        },
        `${reviews.length}개 리뷰 조회 성공`
      );
    } catch (error) {
      console.error('리뷰 조회 에러:', error);
      return ResponseHelper.error(
        reply,
        error instanceof Error ? error.message : 'Failed to fetch reviews',
        500
      );
    }
  });

  /**
   * GET /api/restaurants/place/:placeId/reviews
   * Place ID로 리뷰 조회 (페이지네이션)
   * @deprecated 하위 호환성을 위해 유지, /api/restaurants/:id/reviews 사용 권장
   */
  fastify.get('/place/:placeId/reviews', {
    schema: {
      tags: ['restaurants'],
      summary: 'Place ID로 리뷰 조회 (Deprecated)',
      description: '특정 Place ID의 음식점 리뷰를 페이지네이션으로 조회합니다. (하위 호환성을 위해 유지, /api/restaurants/:id/reviews 사용 권장)',
      deprecated: true,
      params: Type.Object({
        placeId: Type.String({ description: 'Naver Place ID' })
      }),
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
            total: Type.Number({ description: '전체 리뷰 수' }),
            limit: Type.Number({ description: '페이지당 항목 수' }),
            offset: Type.Number({ description: '시작 위치' }),
            reviews: Type.Array(ReviewSchema)
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
    const { placeId } = request.params as { placeId: string };
    const { limit = 20, offset = 0 } = request.query as { limit?: number; offset?: number };

    try {
      // 1. Place ID로 음식점 조회
      const restaurant = await restaurantRepository.findByPlaceId(placeId);

      if (!restaurant) {
        return ResponseHelper.notFound(reply, `Place ID ${placeId}에 해당하는 음식점을 찾을 수 없습니다`);
      }

      // 2. 리뷰 조회
      const [reviewsDB, total] = await Promise.all([
        reviewRepository.findByRestaurantId(restaurant.id, limit, offset),
        reviewRepository.countByRestaurantId(restaurant.id)
      ]);

      // 3. DB 데이터를 API 응답 형식으로 변환 (쉼표 구분 문자열 → 배열)
      const reviews = reviewsDB.map(review => ({
        id: review.id,
        userName: review.user_name,
        visitKeywords: review.visit_keywords ? review.visit_keywords.split(',') : [],
        waitTime: review.wait_time,
        reviewText: review.review_text,
        emotionKeywords: review.emotion_keywords ? review.emotion_keywords.split(',') : [],
        visitInfo: {
          visitDate: review.visit_date,
          visitCount: review.visit_count,
          verificationMethod: review.verification_method
        },
        crawledAt: review.crawled_at,
        createdAt: review.created_at
      }));

      return ResponseHelper.success(
        reply,
        {
          total,
          limit,
          offset,
          reviews
        },
        `${reviews.length}개 리뷰 조회 성공`
      );
    } catch (error) {
      console.error('리뷰 조회 에러:', error);
      return ResponseHelper.error(
        reply,
        error instanceof Error ? error.message : 'Failed to fetch reviews',
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
