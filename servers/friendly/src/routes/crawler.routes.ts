import { FastifyPluginAsync } from 'fastify';
import { Type } from '@sinclair/typebox';
import restaurantService from '../services/restaurant.service';
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
   * POST /api/crawler/crawl
   * 통합 크롤링 API (신규 크롤링 + 재크롤링)
   */
  fastify.post('/crawl', {
    schema: {
      tags: ['crawler'],
      summary: '통합 크롤링 API',
      description: 'URL 또는 Restaurant ID를 사용하여 메뉴, 리뷰, 요약을 선택적으로 크롤링합니다. URL이 있으면 신규 크롤링, restaurantId가 있으면 재크롤링합니다.',
      body: Type.Object({
        url: Type.Optional(Type.String({
          description: '네이버맵 URL 또는 Place ID (신규 크롤링용)',
          examples: [
            'https://map.naver.com/p/entry/place/1234567890',
            'https://m.place.naver.com/restaurant/1234567890/home',
            '1234567890'
          ]
        })),
        restaurantId: Type.Optional(Type.Number({
          description: '레스토랑 ID (재크롤링용)'
        })),
        crawlMenus: Type.Optional(Type.Boolean({
          description: '메뉴 크롤링 여부 (기본: true)',
          default: true
        })),
        crawlReviews: Type.Optional(Type.Boolean({
          description: '리뷰 크롤링 여부 (기본: false)',
          default: false
        })),
        createSummary: Type.Optional(Type.Boolean({
          description: '리뷰 요약 생성 여부 (기본: false)',
          default: false
        })),
        resetSummary: Type.Optional(Type.Boolean({
          description: '기존 요약 삭제 후 재생성 여부 (createSummary: true일 때만 유효, 기본: false)',
          default: false
        }))
      }),
      response: {
        200: Type.Object({
          result: Type.Boolean(),
          message: Type.String(),
          data: Type.Object({
            restaurantId: Type.Number(),
            isNewCrawl: Type.Boolean({ description: '신규 크롤링 여부' }),
            crawlMenus: Type.Boolean(),
            crawlReviews: Type.Boolean(),
            createSummary: Type.Boolean(),
            reviewJobId: Type.Optional(Type.String()),
            restaurantInfo: Type.Optional(RestaurantInfoSchema)
          }),
          timestamp: Type.String()
        }),
        202: Type.Object({
          result: Type.Boolean(),
          message: Type.String(),
          data: Type.Object({
            restaurantId: Type.Number(),
            isNewCrawl: Type.Boolean(),
            crawlMenus: Type.Boolean(),
            crawlReviews: Type.Boolean(),
            createSummary: Type.Boolean(),
            reviewJobId: Type.Optional(Type.String())
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
    let {
      url,
      restaurantId,
      crawlMenus = true,
      crawlReviews = false,
      createSummary = false,
      resetSummary = false
    } = request.body as {
      url?: string;
      restaurantId?: number;
      crawlMenus?: boolean;
      crawlReviews?: boolean;
      createSummary?: boolean;
      resetSummary?: boolean;
    };

    // URL 또는 restaurantId 중 하나는 필수
    if (!url && !restaurantId) {
      return ResponseHelper.validationError(
        reply,
        'Either url or restaurantId is required'
      );
    }

    // 둘 다 있으면 에러
    if (url && restaurantId) {
      return ResponseHelper.validationError(
        reply,
        'Cannot specify both url and restaurantId. Use only one.'
      );
    }

    // 최소 하나의 작업은 선택되어야 함
    if (!crawlMenus && !crawlReviews && !createSummary) {
      return ResponseHelper.validationError(
        reply,
        'At least one option (crawlMenus, crawlReviews, or createSummary) must be selected'
      );
    }

    try {
      // ============================================
      // 1. 신규 크롤링 (URL 사용)
      // ============================================
      if (url) {
        // Place ID만 입력된 경우 모바일 URL로 변환
        if (/^\d+$/.test(url.trim())) {
          url = `https://m.place.naver.com/restaurant/${url.trim()}/home`;
          console.log('Place ID를 모바일 URL로 변환:', url);
        }

        // 네이버맵 URL 검증
        const validDomains = ['map.naver.com', 'm.place.naver.com', 'place.naver.com', 'naver.me'];
        const isValidUrl = validDomains.some(domain => url!.includes(domain));

        if (!isValidUrl) {
          return ResponseHelper.validationError(
            reply,
            'Invalid Naver Map URL or Place ID'
          );
        }

        console.log('[통합 크롤링] 신규 크롤링 시작:', url);
        const result = await restaurantService.crawlAndSaveRestaurant(url, {
          crawlMenus,
          crawlReviews,
          createSummary,
          resetSummary
        });

        return ResponseHelper.success(reply, {
          restaurantId: result.restaurantId!,
          isNewCrawl: true,
          crawlMenus,
          crawlReviews,
          createSummary,
          reviewJobId: result.reviewJobId,
          restaurantInfo: result.restaurantInfo
        }, '신규 크롤링 성공');
      }

      // ============================================
      // 2. 재크롤링 (restaurantId 사용)
      // ============================================
      if (restaurantId) {
        const restaurantRepository = await import('../db/repositories/restaurant.repository');
        const restaurant = await restaurantRepository.default.findById(restaurantId);
        
        if (!restaurant) {
          return ResponseHelper.error(reply, 'Restaurant not found', 404);
        }

        // URL 표준화
        const standardUrl = restaurant.place_id 
          ? `https://m.place.naver.com/restaurant/${restaurant.place_id}/home`
          : restaurant.url;

        console.log(`[통합 크롤링] 레스토랑 ${restaurantId} 재크롤링 시작`);

        // ✅ Job Chain으로 순차 실행 (백그라운드)
        const jobService = await import('../services/job-socket.service');

        // 백그라운드에서 체인 실행 (await 없음)
        jobService.default.executeChain({
          restaurantId,
          jobs: [
            // 1️⃣ 메뉴 크롤링
            ...(crawlMenus && standardUrl ? [{
              type: 'restaurant_crawl' as const,
              metadata: { url: standardUrl, placeId: restaurant.place_id, includeMenus: true },
              execute: async () => {
                console.log(`[Job Chain] 메뉴 크롤링 시작`);
                const result = await restaurantService.crawlAndSaveMenusOnly(standardUrl);
                console.log(`[Job Chain] 메뉴 크롤링 완료 - ${result.menusCount}개 저장`);
              }
            }] : []),

            // 2️⃣ 리뷰 크롤링 (요약 제외)
            ...(crawlReviews && restaurant.place_id ? [{
              type: 'review_crawl' as const,
              metadata: { placeId: restaurant.place_id, url: '', batchSize: 10 },
              execute: async () => {
                console.log(`[Job Chain] 리뷰 크롤링 시작`);
                const reviewUrl = `https://m.place.naver.com/restaurant/${restaurant.place_id}/review/visitor?reviewSort=recent`;
                const reviewCrawlerProcessor = await import('../services/review-crawler-processor.service');

                // 기본 process() 사용 (요약 제외)
                await reviewCrawlerProcessor.default.process(
                  restaurant.place_id,
                  reviewUrl,
                  restaurant.id
                );
                console.log(`[Job Chain] 리뷰 크롤링 완료`);
              }
            }] : []),

            // 3️⃣ 리뷰 요약 생성
            ...(createSummary ? [{
              type: 'review_summary' as const,
              metadata: { useCloud: true, aiService: 'cloud' as const, resetSummary },
              execute: async () => {
                console.log(`[Job Chain] 리뷰 요약 시작`);

                // resetSummary 처리
                if (resetSummary) {
                  const reviewSummaryRepository = await import('../db/repositories/review-summary.repository');
                  await reviewSummaryRepository.default.deleteByRestaurantId(restaurantId);
                  console.log(`[Job Chain] 기존 요약 삭제 완료`);
                }

                const reviewSummaryProcessor = await import('../services/review-summary-processor.service');
                await reviewSummaryProcessor.default.processIncompleteReviews(
                  restaurant.id,
                  true // useCloud
                );
                console.log(`[Job Chain] 리뷰 요약 완료`);
              }
            }] : [])
          ],
          onComplete: (results) => {
            console.log(`[통합 크롤링] 레스토랑 ${restaurantId} 모든 작업 완료:`, results);
          },
          onError: (error, failedJobIndex) => {
            console.error(`[통합 크롤링] 레스토랑 ${restaurantId} Job ${failedJobIndex} 실패:`, error);
          }
        }).catch(err => {
          console.error(`[통합 크롤링] 레스토랑 ${restaurantId} 체인 실행 오류:`, err);
        });

        // 즉시 202 응답 (백그라운드 실행)
        return reply.code(202).send({
          result: true,
          message: '재크롤링 작업 시작 (백그라운드 실행)',
          data: {
            restaurantId,
            isNewCrawl: false,
            crawlMenus,
            crawlReviews,
            createSummary,
            chainLength: [crawlMenus, crawlReviews, createSummary].filter(Boolean).length
          },
          timestamp: new Date().toISOString()
        });
      }

      // 이 코드는 실행되지 않지만 TypeScript를 위해 유지
      return ResponseHelper.error(reply, 'Invalid request', 400);

    } catch (error) {
      console.error('[통합 크롤링] 에러:', error);
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
};

export default crawlerRoutes;
