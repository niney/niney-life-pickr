import { FastifyPluginAsync } from 'fastify';
import { Type } from '@sinclair/typebox';
import naverCrawlerService from '../services/naver-crawler.service';
import { ResponseHelper } from '../utils/response.utils';

/**
 * TypeBox 스키마 정의
 */

// 메뉴 아이템 스키마
const MenuItemSchema = Type.Object({
  name: Type.String({ description: '메뉴 이름' }),
  description: Type.Optional(Type.String({ description: '메뉴 설명' })),
  price: Type.String({ description: '메뉴 가격' }),
  image: Type.Optional(Type.String({ description: '메뉴 이미지 URL' }))
});

// 좌표 스키마
const CoordinatesSchema = Type.Object({
  lat: Type.Number({ description: '위도' }),
  lng: Type.Number({ description: '경도' })
});

// 음식점 정보 스키마
const RestaurantInfoSchema = Type.Object({
  name: Type.String({ description: '식당 이름' }),
  address: Type.Union([Type.String(), Type.Null()], { description: '주소' }),
  category: Type.Union([Type.String(), Type.Null()], { description: '카테고리 (예: 한식, 중식)' }),
  phone: Type.Union([Type.String(), Type.Null()], { description: '전화번호' }),
  description: Type.Union([Type.String(), Type.Null()], { description: '설명' }),
  businessHours: Type.Union([Type.String(), Type.Null()], { description: '영업시간' }),
  coordinates: Type.Union([CoordinatesSchema, Type.Null()], { description: '좌표' }),
  url: Type.String({ description: '원본 URL' }),
  placeId: Type.Union([Type.String(), Type.Null()], { description: '네이버 Place ID' }),
  placeName: Type.Union([Type.String(), Type.Null()], { description: '장소 이름' }),
  crawledAt: Type.String({ description: '크롤링 시간 (ISO 8601)' }),
  menuItems: Type.Optional(Type.Array(MenuItemSchema, { description: '메뉴 목록' }))
});

// 방문 정보 스키마
const VisitInfoSchema = Type.Object({
  visitDate: Type.Union([Type.String(), Type.Null()], { description: '방문 날짜' }),
  visitCount: Type.Union([Type.String(), Type.Null()], { description: '방문 횟수' }),
  verificationMethod: Type.Union([Type.String(), Type.Null()], { description: '인증 방법' })
});

// 리뷰 정보 스키마
const ReviewInfoSchema = Type.Object({
  userName: Type.Union([Type.String(), Type.Null()], { description: '작성자 이름' }),
  visitKeywords: Type.Array(Type.String(), { description: '방문 키워드' }),
  waitTime: Type.Union([Type.String(), Type.Null()], { description: '대기시간' }),
  reviewText: Type.Union([Type.String(), Type.Null()], { description: '리뷰 텍스트' }),
  emotionKeywords: Type.Array(Type.String(), { description: '감정 키워드' }),
  visitInfo: VisitInfoSchema
});

// 크롤링 결과 스키마
const CrawlResultSchema = Type.Object({
  success: Type.Boolean({ description: '성공 여부' }),
  data: Type.Optional(RestaurantInfoSchema),
  url: Type.Optional(Type.String({ description: '원본 URL (실패 시)' })),
  error: Type.Optional(Type.String({ description: '에러 메시지 (실패 시)' }))
});

// 일괄 크롤링 응답 스키마
const BulkCrawlResponseSchema = Type.Object({
  total: Type.Number({ description: '전체 URL 개수' }),
  successful: Type.Number({ description: '성공한 개수' }),
  failed: Type.Number({ description: '실패한 개수' }),
  results: Type.Array(CrawlResultSchema, { description: '개별 크롤링 결과' })
});

/**
 * 네이버 맛집 크롤링 라우트
 */
const crawlerRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * POST /api/crawler/restaurant
   * 단일 음식점 크롤링
   */
  fastify.post('/restaurant', {
    schema: {
      tags: ['crawler'],
      summary: '네이버맵 맛집 정보 크롤링',
      description: '네이버맵 URL을 입력받아 식당 정보와 메뉴를 크롤링합니다. naver.me 단축 URL도 지원합니다.',
      body: Type.Object({
        url: Type.String({
          description: '네이버맵 URL (map.naver.com, m.place.naver.com, place.naver.com, naver.me)',
          examples: [
            'https://map.naver.com/p/entry/place/1234567890',
            'https://m.place.naver.com/restaurant/1234567890/home',
            'https://naver.me/xxxxx'
          ]
        }),
        crawlMenus: Type.Optional(Type.Boolean({
          description: '메뉴 크롤링 여부 (기본: true)',
          default: true
        }))
      }),
      response: {
        200: Type.Object({
          result: Type.Boolean(),
          message: Type.String(),
          data: RestaurantInfoSchema,
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
    const { url, crawlMenus = true } = request.body as { url: string; crawlMenus?: boolean };

    // URL 검증
    if (!url || typeof url !== 'string') {
      return ResponseHelper.validationError(reply, 'URL is required');
    }

    // 네이버맵 URL 검증
    const validDomains = ['map.naver.com', 'm.place.naver.com', 'place.naver.com', 'naver.me'];
    const isValidUrl = validDomains.some(domain => url.includes(domain));

    if (!isValidUrl) {
      return ResponseHelper.validationError(
        reply,
        'Invalid Naver Map URL. Expected: map.naver.com, m.place.naver.com, place.naver.com, or naver.me'
      );
    }

    try {
      console.log('크롤링 시작:', url);
      const restaurantInfo = await naverCrawlerService.crawlRestaurant(url, { crawlMenus });

      return ResponseHelper.success(reply, restaurantInfo, '식당 정보 크롤링 성공');
    } catch (error) {
      console.error('크롤링 에러:', error);
      return ResponseHelper.error(
        reply,
        error instanceof Error ? error.message : 'Crawling failed',
        500
      );
    }
  });

  /**
   * POST /api/crawler/bulk
   * 여러 URL 일괄 크롤링
   */
  fastify.post('/bulk', {
    schema: {
      tags: ['crawler'],
      summary: '여러 음식점 일괄 크롤링',
      description: '최대 5개의 네이버맵 URL을 일괄 크롤링합니다. 각 크롤링은 순차적으로 실행됩니다.',
      body: Type.Object({
        urls: Type.Array(Type.String(), {
          description: '크롤링할 URL 목록 (최대 5개)',
          minItems: 1,
          maxItems: 5,
          examples: [
            [
              'https://map.naver.com/p/entry/place/1234567890',
              'https://m.place.naver.com/restaurant/9876543210/home'
            ]
          ]
        })
      }),
      response: {
        200: Type.Object({
          result: Type.Boolean(),
          message: Type.String(),
          data: BulkCrawlResponseSchema,
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
    const { urls } = request.body as { urls: string[] };

    // URLs 검증
    if (!urls || !Array.isArray(urls)) {
      return ResponseHelper.validationError(reply, 'URLs array is required');
    }

    // 최대 5개 URL 제한
    if (urls.length > 5) {
      return ResponseHelper.validationError(reply, 'Maximum 5 URLs allowed at once');
    }

    if (urls.length === 0) {
      return ResponseHelper.validationError(reply, 'At least 1 URL is required');
    }

    // 유효한 네이버맵 URL 필터링
    const validUrls = urls.filter((url: string) =>
      url.includes('map.naver.com') ||
      url.includes('m.place.naver.com') ||
      url.includes('place.naver.com') ||
      url.includes('naver.me')
    );

    if (validUrls.length === 0) {
      return ResponseHelper.validationError(reply, 'No valid Naver Map URLs found');
    }

    try {
      console.log(`${validUrls.length}개 URL 크롤링 시작...`);
      const results = await naverCrawlerService.crawlMultipleRestaurants(validUrls);

      const response = {
        total: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length,
        results
      };

      return ResponseHelper.success(reply, response, `${response.successful}/${response.total}개 크롤링 성공`);
    } catch (error) {
      console.error('일괄 크롤링 에러:', error);
      return ResponseHelper.error(
        reply,
        error instanceof Error ? error.message : 'Bulk crawling failed',
        500
      );
    }
  });

  /**
   * POST /api/crawler/reviews
   * 네이버플레이스 리뷰 크롤링
   */
  fastify.post('/reviews', {
    schema: {
      tags: ['crawler'],
      summary: '네이버플레이스 리뷰 크롤링',
      description: '네이버플레이스 리뷰 페이지를 크롤링하여 리뷰 정보를 추출합니다.',
      body: Type.Object({
        url: Type.String({
          description: '네이버플레이스 리뷰 URL',
          examples: [
            'https://m.place.naver.com/restaurant/1234567890/review/visitor?reviewSort=recent'
          ]
        })
      }),
      response: {
        200: Type.Object({
          result: Type.Boolean(),
          message: Type.String(),
          data: Type.Array(ReviewInfoSchema),
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
    const { url } = request.body as { url: string };

    // URL 검증
    if (!url || typeof url !== 'string') {
      return ResponseHelper.validationError(reply, 'URL is required');
    }

    // 리뷰 URL 검증
    if (!url.includes('review/visitor') && !url.includes('m.place.naver.com')) {
      return ResponseHelper.validationError(
        reply,
        'Invalid review URL. Expected format: https://m.place.naver.com/restaurant/{placeId}/review/visitor?reviewSort=recent'
      );
    }

    try {
      console.log('리뷰 크롤링 시작:', url);
      const reviewData = await naverCrawlerService.crawlReviews(url);

      return ResponseHelper.success(reply, reviewData, `${reviewData.length}개 리뷰 크롤링 성공`);
    } catch (error) {
      console.error('리뷰 크롤링 에러:', error);
      return ResponseHelper.error(
        reply,
        error instanceof Error ? error.message : 'Review crawling failed',
        500
      );
    }
  });

  /**
   * POST /api/crawler/cleanup
   * 크롤링 서비스 정리 (현재는 불필요)
   */
  fastify.post('/cleanup', {
    schema: {
      tags: ['crawler'],
      summary: '크롤링 서비스 정리',
      description: '브라우저는 각 크롤링 후 자동으로 정리되므로 별도 cleanup 불필요합니다.',
      response: {
        200: Type.Object({
          result: Type.Boolean(),
          message: Type.String(),
          timestamp: Type.String()
        })
      }
    }
  }, async (_request, reply) => {
    return ResponseHelper.success(
      reply,
      null,
      'Cleanup not required - browser is automatically closed after each crawl'
    );
  });
};

export default crawlerRoutes;
