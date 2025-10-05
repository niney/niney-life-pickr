import { FastifyPluginAsync } from 'fastify';
import { Type } from '@sinclair/typebox';
import restaurantService from '../services/restaurant.service';
import jobManager from '../services/job-manager.service';
import crawlJobRepository from '../db/repositories/crawl-job.repository';
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
  menuItems: Type.Optional(Type.Array(MenuItemSchema, { description: '메뉴 목록' })),
  savedToDb: Type.Optional(Type.Boolean({ description: 'DB 저장 여부' })),
  restaurantId: Type.Optional(Type.Number({ description: 'DB에 저장된 음식점 ID' })),
  reviewJobId: Type.Optional(Type.String({ description: '리뷰 크롤링 Job ID (crawlReviews: true인 경우)' }))
});

// 크롤링 결과 스키마
const CrawlResultSchema = Type.Object({
  success: Type.Boolean({ description: '성공 여부' }),
  data: Type.Optional(RestaurantInfoSchema),
  savedToDb: Type.Optional(Type.Boolean({ description: 'DB 저장 여부' })),
  restaurantId: Type.Optional(Type.Number({ description: 'DB에 저장된 음식점 ID' })),
  url: Type.Optional(Type.String({ description: '원본 URL (실패 시)' })),
  error: Type.Optional(Type.String({ description: '에러 메시지 (실패 시)' }))
});

// 일괄 크롤링 응답 스키마
const BulkCrawlResponseSchema = Type.Object({
  total: Type.Number({ description: '전체 URL 개수' }),
  successful: Type.Number({ description: '성공한 개수' }),
  failed: Type.Number({ description: '실패한 개수' }),
  savedToDb: Type.Number({ description: 'DB에 저장된 개수' }),
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
        })),
        crawlReviews: Type.Optional(Type.Boolean({
          description: '리뷰 크롤링 여부 (기본: false, 백그라운드 Job으로 실행)',
          default: false
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
    let { url, crawlMenus = true, crawlReviews = false } = request.body as {
      url: string;
      crawlMenus?: boolean;
      crawlReviews?: boolean;
    };

    // URL 검증
    if (!url) {
      return ResponseHelper.validationError(reply, 'URL is required');
    }

    // Place ID만 입력된 경우 (숫자로만 구성) 모바일 URL로 변환
    if (/^\d+$/.test(url.trim())) {
      url = `https://m.place.naver.com/restaurant/${url.trim()}/home`;
      console.log('Place ID를 모바일 URL로 변환:', url);
    }

    // 네이버맵 URL 검증
    const validDomains = ['map.naver.com', 'm.place.naver.com', 'place.naver.com', 'naver.me'];
    const isValidUrl = validDomains.some(domain => url.includes(domain));

    if (!isValidUrl) {
      return ResponseHelper.validationError(
        reply,
        'Invalid Naver Map URL or Place ID. Expected: map.naver.com, m.place.naver.com, place.naver.com, naver.me, or numeric Place ID'
      );
    }

    try {
      console.log('크롤링 및 DB 저장 시작:', url);
      const result = await restaurantService.crawlAndSaveRestaurant(url, { crawlMenus, crawlReviews });

      return ResponseHelper.success(reply, {
        ...result.restaurantInfo,
        savedToDb: result.savedToDb,
        restaurantId: result.restaurantId,
        reviewJobId: result.reviewJobId
      }, '식당 정보 크롤링 성공');
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
    let { urls } = request.body as { urls: string[] };

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

    // Place ID만 입력된 경우 모바일 URL로 변환
    urls = urls.map(url => {
      const trimmedUrl = url.trim();
      if (/^\d+$/.test(trimmedUrl)) {
        const convertedUrl = `https://m.place.naver.com/restaurant/${trimmedUrl}/home`;
        console.log('Place ID를 모바일 URL로 변환:', trimmedUrl, '->', convertedUrl);
        return convertedUrl;
      }
      return url;
    });

    // 유효한 네이버맵 URL 필터링
    const validUrls = urls.filter((url: string) =>
      url.includes('map.naver.com') ||
      url.includes('m.place.naver.com') ||
      url.includes('place.naver.com') ||
      url.includes('naver.me')
    );

    if (validUrls.length === 0) {
      return ResponseHelper.validationError(reply, 'No valid Naver Map URLs or Place IDs found');
    }

    try {
      console.log(`${validUrls.length}개 URL 일괄 크롤링 및 DB 저장 시작...`);
      const bulkResult = await restaurantService.crawlAndSaveMultiple(validUrls);

      return ResponseHelper.success(
        reply,
        bulkResult,
        `${bulkResult.successful}/${bulkResult.total}개 크롤링 성공, ${bulkResult.savedToDb}개 DB 저장`
      );
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
   * 네이버플레이스 리뷰 크롤링 (백그라운드 Job)
   */
  fastify.post('/reviews', {
    schema: {
      tags: ['crawler'],
      summary: '네이버플레이스 리뷰 크롤링',
      description: '네이버플레이스 리뷰 페이지를 크롤링하여 리뷰 정보를 추출합니다. 백그라운드로 실행되며 Job ID를 즉시 반환합니다.',
      body: Type.Object({
        url: Type.String({
          description: '네이버플레이스 리뷰 URL 또는 Place URL',
          examples: [
            'https://m.place.naver.com/restaurant/1234567890/review/visitor?reviewSort=recent',
            'https://m.place.naver.com/restaurant/1234567890/home'
          ]
        }),
        placeId: Type.String({
          description: 'Place ID (Restaurant 찾기용)',
          examples: ['1234567890']
        })
      }),
      response: {
        202: Type.Object({
          result: Type.Boolean(),
          message: Type.String(),
          data: Type.Object({
            jobId: Type.String(),
            placeId: Type.String(),
            restaurantId: Type.Number(),
            status: Type.String(),
            url: Type.String()
          }),
          timestamp: Type.String()
        }),
        400: Type.Object({
          result: Type.Boolean(),
          message: Type.String(),
          statusCode: Type.Number(),
          timestamp: Type.String()
        }),
        404: Type.Object({
          result: Type.Boolean(),
          message: Type.String(),
          statusCode: Type.Number(),
          timestamp: Type.String()
        })
      }
    }
  }, async (request, reply) => {
    const { url, placeId } = request.body as { url: string; placeId: string };

    // URL 검증
    if (!url) {
      return ResponseHelper.validationError(reply, 'URL is required');
    }

    if (!placeId) {
      return ResponseHelper.validationError(reply, 'placeId is required');
    }

    try {
      // 1. Restaurant 확인
      const restaurant = await restaurantService.findByPlaceId(placeId);
      if (!restaurant) {
        return ResponseHelper.notFound(reply, 'Restaurant not found. Please crawl restaurant first.');
      }

      // 2. Job 생성
      const { v4: uuidv4 } = await import('uuid');
      const jobId = uuidv4();

      jobManager.createJob(jobId, {
        restaurantId: restaurant.id,
        placeId,
        url
      });

      await crawlJobRepository.create({
        job_id: jobId,
        restaurant_id: restaurant.id,
        place_id: placeId,
        url,
        status: 'waiting'
      });

      // 3. 백그라운드 실행
      const reviewCrawlerProcessor = await import('../services/review-crawler-processor.service');
      reviewCrawlerProcessor.default.process(jobId, placeId, url, restaurant.id).catch(err => {
        console.error(`[Job ${jobId}] Background processing error:`, err);
      });

      // 4. 즉시 응답 (202 Accepted)
      return reply.code(202).send({
        result: true,
        message: 'Review crawling job started',
        data: {
          jobId,
          placeId,
          restaurantId: restaurant.id,
          status: 'waiting',
          url
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('리뷰 크롤링 Job 생성 실패:', error);
      return ResponseHelper.error(
        reply,
        error instanceof Error ? error.message : 'Failed to start review crawling job',
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
