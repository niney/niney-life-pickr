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
      const restaurantRepository = await import('../db/repositories/restaurant.repository');
      const jobService = await import('../services/job-socket.service');
      
      let targetRestaurantId: number;
      let placeId: string | null = null;
      let standardUrl: string | null = null;
      let isNewCrawl = false;

      // ============================================
      // 1. restaurantId 확보 (신규 크롤링 or 재크롤링)
      // ============================================
      if (url) {
        // ✅ 신규 크롤링: URL → 레스토랑 정보 크롤 → DB 저장 → restaurantId 획득
        isNewCrawl = true;

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

        // 레스토랑 정보 크롤링
        const crawlResult = await restaurantService.crawlRestaurantInfo(url);
        
        if (!crawlResult.success || !crawlResult.data) {
          return ResponseHelper.error(reply, crawlResult.error || 'Crawling failed', 500);
        }

        const restaurantData = crawlResult.data;

        // 레스토랑 정보만 먼저 DB에 저장하여 restaurantId 획득
        const restaurantInput = {
          place_id: restaurantData.placeId || '',
          name: restaurantData.name,
          place_name: restaurantData.placeName,
          category: restaurantData.category,
          phone: restaurantData.phone,
          address: restaurantData.address,
          description: restaurantData.description,
          business_hours: restaurantData.businessHours,
          lat: restaurantData.coordinates?.lat || null,
          lng: restaurantData.coordinates?.lng || null,
          url: restaurantData.url,
          crawled_at: restaurantData.crawledAt
        };
        
        targetRestaurantId = await restaurantRepository.default.upsertRestaurant(restaurantInput);
        placeId = restaurantData.placeId;
        standardUrl = restaurantData.url;

        console.log(`[통합 크롤링] 신규 레스토랑 ${targetRestaurantId} 정보 저장 완료`);

      } else if (restaurantId) {
        // ✅ 재크롤링: DB에서 레스토랑 조회
        const restaurant = await restaurantRepository.default.findById(restaurantId);
        
        if (!restaurant) {
          return ResponseHelper.error(reply, 'Restaurant not found', 404);
        }

        targetRestaurantId = restaurantId;
        placeId = restaurant.place_id;
        standardUrl = restaurant.place_id 
          ? `https://m.place.naver.com/restaurant/${restaurant.place_id}/home`
          : restaurant.url;

        console.log(`[통합 크롤링] 레스토랑 ${targetRestaurantId} 재크롤링 시작`);
      } else {
        // 이 코드는 실행되지 않지만 TypeScript를 위해 유지
        return ResponseHelper.error(reply, 'Invalid request', 400);
      }

      // ============================================
      // 2. 공통 크롤링 로직 (Job 생성 + 백그라운드 실행)
      // ============================================
      const jobId = await jobService.default.start({
        restaurantId: targetRestaurantId,
        metadata: {
          step: 'started',
          isNewCrawl,
          crawlMenus,
          crawlReviews,
          createSummary,
          placeId,
          url: standardUrl
        }
      });

      console.log(`[Job ${jobId}] 크롤링 작업 시작 (신규: ${isNewCrawl})`);

      // 백그라운드에서 순차 실행
      (async () => {
        try {
          // 1️⃣ 메뉴 크롤링
          if (crawlMenus && standardUrl) {
            console.log(`[Job ${jobId}] 메뉴 크롤링 시작`);
            
            const result = await restaurantService.crawlAndSaveMenusOnly(
              standardUrl,
              targetRestaurantId,
              jobId
            );

            console.log(`[Job ${jobId}] 메뉴 크롤링 완료 - ${result.menusCount}개 저장`);
          }

          // 2️⃣ 리뷰 크롤링
          if (crawlReviews && placeId) {
            console.log(`[Job ${jobId}] 리뷰 크롤링 시작`);
            const reviewUrl = `https://m.place.naver.com/restaurant/${placeId}/review/visitor?reviewSort=recent`;
            const reviewCrawlerProcessor = await import('../services/review-crawler-processor.service');

            const reviews = await reviewCrawlerProcessor.default.processWithJobId(
              jobId,
              placeId,
              reviewUrl,
              targetRestaurantId
            );

            // 리뷰 크롤링 완료 처리
            if (jobService.default.isCancelled(jobId)) {
              console.log(`[Job ${jobId}] 리뷰 크롤링 취소됨`);
              await jobService.default.cancel(jobId, {
                step: 'reviews_cancelled',
                totalReviews: reviews.length
              });
              return; // 후속 작업 중단
            }

            console.log(`[Job ${jobId}] 리뷰 크롤링 완료 - ${reviews.length}개`);
          }

          // 3️⃣ 리뷰 요약 생성
          if (createSummary) {
            console.log(`[Job ${jobId}] 리뷰 요약 시작`);

            if (resetSummary) {
              const reviewSummaryRepository = await import('../db/repositories/review-summary.repository');
              await reviewSummaryRepository.default.deleteByRestaurantId(targetRestaurantId);
              console.log(`[Job ${jobId}] 기존 요약 삭제 완료`);
            }

            const reviewSummaryProcessor = await import('../services/review-summary-processor.service');
            
            const summaryResult = await reviewSummaryProcessor.default.processWithJobId(
              jobId,
              targetRestaurantId,
              true // useCloud
            );

            console.log(`[Job ${jobId}] 리뷰 요약 완료 - ${summaryResult.completed}개 성공, ${summaryResult.failed}개 실패`);
          }

          // 모든 작업 완료
          await jobService.default.complete(jobId, {
            step: 'completed',
            isNewCrawl,
            crawlMenus,
            crawlReviews,
            createSummary,
            completedAt: Date.now()
          });

          console.log(`[Job ${jobId}] 크롤링 작업 완료`);

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          console.error(`[Job ${jobId}] 크롤링 실패:`, errorMessage);

          await jobService.default.error(jobId, errorMessage, {
            step: 'error',
            error: errorMessage
          });
        }
      })().catch(err => {
        console.error(`[통합 크롤링] 레스토랑 ${targetRestaurantId} 실행 오류:`, err);
      });

      // 즉시 202 응답 (백그라운드 실행)
      return reply.code(202).send({
        result: true,
        message: `${isNewCrawl ? '신규' : '재'} 크롤링 작업 시작 (백그라운드 실행)`,
        data: {
          jobId,
          restaurantId: targetRestaurantId,
          isNewCrawl,
          crawlMenus,
          crawlReviews,
          createSummary
        },
        timestamp: new Date().toISOString()
      });

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

  /**
   * ✅ POST /api/crawler/crawl-queued
   * Queue 방식 크롤링 API (리뷰 크롤링만 지원)
   */
  fastify.post('/crawl-queued', {
    schema: {
      tags: ['crawler'],
      summary: 'Queue 방식 크롤링 API',
      description: '리뷰 크롤링을 Queue에 추가하여 순차적으로 처리합니다. 중복 요청은 자동으로 거부됩니다.',
      body: Type.Object({
        url: Type.Optional(Type.String({
          description: '네이버맵 URL 또는 Place ID',
          examples: [
            'https://map.naver.com/p/entry/place/1234567890',
            'https://m.place.naver.com/restaurant/1234567890/home',
            '1234567890'
          ]
        })),
        restaurantId: Type.Optional(Type.Number({
          description: '레스토랑 ID (DB에 이미 저장된 경우)'
        }))
      }),
      response: {
        200: Type.Object({
          result: Type.Boolean(),
          message: Type.String(),
          data: Type.Object({
            queueId: Type.String({ description: 'Queue 고유 ID' }),
            restaurantId: Type.Number(),
            position: Type.Number({ description: 'Queue 내 위치' }),
            status: Type.String({ description: 'Queue 상태 (queued)' })
          }),
          timestamp: Type.String()
        }),
        400: Type.Object({
          result: Type.Boolean(),
          message: Type.String(),
          statusCode: Type.Number(),
          timestamp: Type.String()
        }),
        409: Type.Object({
          result: Type.Boolean(),
          message: Type.String(),
          statusCode: Type.Number(),
          timestamp: Type.String()
        })
      }
    }
  }, async (request, reply) => {
    let { url, restaurantId } = request.body as {
      url?: string;
      restaurantId?: number;
    };

    // URL 또는 restaurantId 중 하나는 필수
    if (!url && !restaurantId) {
      return ResponseHelper.validationError(
        reply,
        'Either url or restaurantId is required'
      );
    }

    try {
      const restaurantRepository = await import('../db/repositories/restaurant.repository');
      const jobQueueManager = await import('../services/job-queue-manager.service');

      let targetRestaurantId: number;
      let placeId: string;
      let reviewUrl: string;

      // restaurantId 확보
      if (url) {
        // Place ID만 입력된 경우 모바일 URL로 변환
        if (/^\d+$/.test(url.trim())) {
          url = `https://m.place.naver.com/restaurant/${url.trim()}/home`;
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

        // 레스토랑 정보 크롤링 및 저장
        const crawlResult = await restaurantService.crawlRestaurantInfo(url);
        
        if (!crawlResult.success || !crawlResult.data) {
          return ResponseHelper.error(reply, crawlResult.error || 'Crawling failed', 500);
        }

        const restaurantData = crawlResult.data;

        // DB 저장
        const restaurantInput = {
          place_id: restaurantData.placeId || '',
          name: restaurantData.name,
          place_name: restaurantData.placeName,
          category: restaurantData.category,
          phone: restaurantData.phone,
          address: restaurantData.address,
          description: restaurantData.description,
          business_hours: restaurantData.businessHours,
          lat: restaurantData.coordinates?.lat || null,
          lng: restaurantData.coordinates?.lng || null,
          url: restaurantData.url,
          crawled_at: restaurantData.crawledAt
        };
        
        targetRestaurantId = await restaurantRepository.default.upsertRestaurant(restaurantInput);
        placeId = restaurantData.placeId || '';
        reviewUrl = `https://m.place.naver.com/restaurant/${placeId}/review/visitor?reviewSort=recent`;

      } else {
        // restaurantId로 조회
        const restaurant = await restaurantRepository.default.findById(restaurantId!);
        
        if (!restaurant) {
          return ResponseHelper.error(reply, 'Restaurant not found', 404);
        }

        targetRestaurantId = restaurantId!;
        placeId = restaurant.place_id;
        reviewUrl = `https://m.place.naver.com/restaurant/${placeId}/review/visitor?reviewSort=recent`;
      }

      // Queue에 추가
      const queueId = jobQueueManager.default.enqueue({
        type: 'review_crawl',
        restaurantId: targetRestaurantId,
        placeId,
        url: reviewUrl,
      });

      const stats = jobQueueManager.default.getStats();

      return ResponseHelper.success(reply, {
        queueId,
        restaurantId: targetRestaurantId,
        position: stats.waiting + stats.processing,
        status: 'queued'
      }, 'Job added to queue successfully');

    } catch (error: any) {
      if (error.message.includes('already queued')) {
        return ResponseHelper.error(reply, error.message, 409);
      }
      return ResponseHelper.error(
        reply,
        error instanceof Error ? error.message : 'Failed to add job to queue',
        500
      );
    }
  });

  /**
   * ✅ POST /api/crawler/queue/:queueId/cancel
   * Queue 아이템 취소
   */
  fastify.post('/queue/:queueId/cancel', {
    schema: {
      tags: ['crawler'],
      summary: 'Queue 아이템 취소',
      description: 'Queue에 대기 중인 작업을 취소합니다. 이미 처리 중인 작업은 취소할 수 없습니다.',
      params: Type.Object({
        queueId: Type.String({ description: 'Queue ID' })
      }),
      response: {
        200: Type.Object({
          result: Type.Boolean(),
          message: Type.String(),
          data: Type.Object({
            queueId: Type.String(),
            status: Type.String()
          }),
          timestamp: Type.String()
        }),
        400: Type.Object({
          result: Type.Boolean(),
          message: Type.String(),
          statusCode: Type.Number(),
          timestamp: Type.String()
        })
      }
    }
  }, async (request, reply) => {
    const { queueId } = request.params as { queueId: string };

    try {
      const jobQueueManager = await import('../services/job-queue-manager.service');
      
      jobQueueManager.default.cancelQueueItem(queueId);

      return ResponseHelper.success(reply, {
        queueId,
        status: 'cancelled'
      }, 'Queue item cancelled successfully');

    } catch (error: any) {
      return ResponseHelper.error(
        reply,
        error instanceof Error ? error.message : 'Failed to cancel queue item',
        400
      );
    }
  });

  /**
   * ✅ GET /api/crawler/queue/stats
   * Queue 통계 조회
   */
  fastify.get('/queue/stats', {
    schema: {
      tags: ['crawler'],
      summary: 'Queue 통계 조회',
      description: 'Queue의 현재 상태를 조회합니다.',
      response: {
        200: Type.Object({
          result: Type.Boolean(),
          message: Type.String(),
          data: Type.Object({
            total: Type.Number(),
            waiting: Type.Number(),
            processing: Type.Number(),
            completed: Type.Number(),
            failed: Type.Number(),
            cancelled: Type.Number()
          }),
          timestamp: Type.String()
        })
      }
    }
  }, async (_request, reply) => {
    try {
      const jobQueueManager = await import('../services/job-queue-manager.service');
      
      const stats = jobQueueManager.default.getStats();

      return ResponseHelper.success(reply, stats, 'Queue stats retrieved successfully');

    } catch (error: any) {
      return ResponseHelper.error(
        reply,
        error instanceof Error ? error.message : 'Failed to get queue stats',
        500
      );
    }
  });
};

export default crawlerRoutes;
