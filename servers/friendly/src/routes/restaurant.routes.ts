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

// 메뉴 아이템 (감정 포함) 스키마
const MenuItemWithSentimentSchema = Type.Object({
  name: Type.String({ description: '메뉴명' }),
  sentiment: Type.String({ description: '감정 (positive/negative/neutral)' }),
  reason: Type.Optional(Type.String({ description: '감정 이유 (10자 이내)' }))
});

// 리뷰 요약 스키마
const ReviewSummarySchema = Type.Object({
  summary: Type.String({ description: '핵심 요약' }),
  keyKeywords: Type.Array(Type.String(), { description: '주요 키워드' }),
  sentiment: Type.String({ description: '감정 (positive/negative/neutral)' }),
  sentimentReason: Type.String({ description: '감정 이유' }),
  satisfactionScore: Type.Union([Type.Number(), Type.Null()], { description: '만족도 점수 (1-100)' }),
  tips: Type.Array(Type.String(), { description: '팁' }),
  menuItems: Type.Optional(Type.Array(MenuItemWithSentimentSchema, { description: '언급된 메뉴/음식명 + 감정' }))
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
  images: Type.Array(Type.String(), { description: '이미지 URL 배열 (예: ["/data/images/reviews/123/abc/0.jpg"])' }),
  crawledAt: Type.String({ description: '크롤링 시간 (ISO 8601)' }),
  createdAt: Type.String({ description: '생성 시간 (ISO 8601)' }),
  summary: Type.Optional(Type.Union([ReviewSummarySchema, Type.Null()], { description: 'AI 요약 데이터 (있는 경우)' }))
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
   * 음식점 목록 조회 (페이지네이션 + 카테고리 필터)
   */
  fastify.get('/', {
    schema: {
      tags: ['restaurants'],
      summary: '음식점 목록 조회',
      description: '저장된 음식점 목록을 페이지네이션으로 조회합니다. 카테고리 필터링을 지원합니다.',
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
        })),
        category: Type.Optional(Type.String({
          description: '카테고리 필터 (예: 한식, 일식, 중식)'
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
    const { limit = 20, offset = 0, category } = request.query as { 
      limit?: number; 
      offset?: number;
      category?: string;
    };

    try {
      const [restaurants, total] = await Promise.all([
        restaurantRepository.findAll(limit, offset, category),
        restaurantRepository.count(category)
      ]);

      return ResponseHelper.success(
        reply,
        {
          total,
          limit,
          offset,
          restaurants
        },
        category 
          ? `${restaurants.length}개 음식점 조회 성공 (카테고리: ${category})`
          : `${restaurants.length}개 음식점 조회 성공`
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
        })),
        sentiment: Type.Optional(Type.Union([
          Type.String({ enum: ['positive', 'negative', 'neutral'] }),
          Type.Array(Type.String({ enum: ['positive', 'negative', 'neutral'] }))
        ], {
          description: '감정 필터 (positive/negative/neutral, 쉼표로 구분하여 다중 선택 가능)'
        })),
        searchText: Type.Optional(Type.String({
          description: '리뷰 내용 검색어'
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
    const { limit = 20, offset = 0, sentiment, searchText } = request.query as {
      limit?: number;
      offset?: number;
      sentiment?: string | string[];
      searchText?: string;
    };

    try {
      // 1. Restaurant ID로 음식점 조회
      const restaurant = await restaurantRepository.findById(id);

      if (!restaurant) {
        return ResponseHelper.notFound(reply, `Restaurant ID ${id}에 해당하는 음식점을 찾을 수 없습니다`);
      }

      // 2. Sentiment 파라미터 정규화 (문자열 또는 배열을 배열로 변환)
      let sentiments: string[] | undefined;
      if (sentiment) {
        sentiments = Array.isArray(sentiment) ? sentiment : [sentiment];
      }

      // 3. 리뷰 조회 (요약 데이터 포함 - LEFT JOIN 사용)
      const [reviewsWithSummary, total] = await Promise.all([
        reviewRepository.findByRestaurantIdWithSummary(id, limit, offset, sentiments, searchText),
        reviewRepository.countByRestaurantId(id, sentiments, searchText)
      ]);

      // 3. DB 데이터를 API 응답 형식으로 변환
      const reviews = reviewsWithSummary.map(row => {
        let summaryData = null;

        // summary_data가 있으면 JSON 파싱
        if (row.summary_data) {
          try {
            const parsed = JSON.parse(row.summary_data);
            
            // ✨ 하위 호환성: 기존 string[] → MenuItemWithSentiment[] 변환
            let menuItems = [];
            if (parsed.menuItems && Array.isArray(parsed.menuItems)) {
              if (parsed.menuItems.length > 0 && typeof parsed.menuItems[0] === 'string') {
                // 기존 형식 (string[])
                menuItems = parsed.menuItems.map((name: string) => ({
                  name,
                  sentiment: 'neutral' as const,
                  reason: undefined
                }));
              } else {
                // 새 형식 (MenuItemWithSentiment[])
                menuItems = parsed.menuItems;
              }
            }
            
            summaryData = {
              summary: parsed.summary || '',
              keyKeywords: parsed.keyKeywords || [],
              sentiment: parsed.sentiment || 'neutral',
              sentimentReason: parsed.sentimentReason || '',
              satisfactionScore: parsed.satisfactionScore,
              tips: parsed.tips || [],
              menuItems
            };
          } catch (error) {
            console.error(`Failed to parse summary_data for review ${row.id}:`, error);
          }
        }

        // images JSON 파싱
        let images: string[] = [];
        if (row.images) {
          try {
            images = JSON.parse(row.images);
          } catch (error) {
            console.error(`Failed to parse images for review ${row.id}:`, error);
          }
        }

        return {
          id: row.id,
          userName: row.user_name,
          visitKeywords: row.visit_keywords ? row.visit_keywords.split(',') : [],
          waitTime: row.wait_time,
          reviewText: row.review_text,
          emotionKeywords: row.emotion_keywords ? row.emotion_keywords.split(',') : [],
          visitInfo: {
            visitDate: row.visit_date,
            visitCount: row.visit_count,
            verificationMethod: row.verification_method
          },
          images,
          crawledAt: row.crawled_at,
          createdAt: row.created_at,
          summary: summaryData
        };
      });

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
      const reviews = reviewsDB.map(review => {
        // images JSON 파싱
        let images: string[] = [];
        if (review.images) {
          try {
            images = JSON.parse(review.images);
          } catch (error) {
            console.error(`Failed to parse images for review ${review.id}:`, error);
          }
        }

        return {
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
          images,
          crawledAt: review.crawled_at,
          createdAt: review.created_at
        };
      });

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
