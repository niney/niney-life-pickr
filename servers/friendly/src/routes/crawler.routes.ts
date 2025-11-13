import { FastifyPluginAsync } from 'fastify';
import { Type } from '@sinclair/typebox';
import restaurantService from '../services/restaurant.service';
import { ResponseHelper } from '../utils/response.utils';
import crawlerInputHandler from '../services/crawler-input-handler.service';
import crawlerExecutor from '../services/crawler-executor.service';

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
      const jobService = await import('../services/job-socket.service');

      // ============================================
      // 1. 입력 정규화 (신규 크롤링 or 재크롤링)
      // ============================================
      const normalized = await crawlerInputHandler.normalizeInput({ url, restaurantId });
      const { restaurantId: targetRestaurantId, placeId, standardUrl, isNewCrawl } = normalized;

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

      // 백그라운드에서 순차 실행 (공통 서비스 사용)
      (async () => {
        try {
          await crawlerExecutor.executeCrawlWorkflow({
            restaurantId: targetRestaurantId,
            placeId,
            standardUrl,
            crawlMenus,
            crawlReviews,
            createSummary,
            resetSummary,
            jobId
          });

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
   * Queue 방식 통합 크롤링 API
   */
  fastify.post('/crawl-queued', {
    schema: {
      tags: ['crawler'],
      summary: 'Queue 방식 통합 크롤링 API',
      description: '메뉴, 리뷰, 요약 크롤링을 Queue에 추가하여 순차적으로 처리합니다. 중복 요청은 자동으로 거부됩니다.',
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
        })),
        crawlMenus: Type.Optional(Type.Boolean({
          description: '메뉴 크롤링 여부 (기본: true)',
          default: true
        })),
        crawlReviews: Type.Optional(Type.Boolean({
          description: '리뷰 크롤링 여부 (기본: true)',
          default: true
        })),
        createSummary: Type.Optional(Type.Boolean({
          description: '리뷰 요약 생성 여부 (기본: true)',
          default: true
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
    let {
      url,
      restaurantId,
      crawlMenus = true,
      crawlReviews = true,
      createSummary = true,
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

    // 최소 하나의 작업은 선택되어야 함
    if (!crawlMenus && !crawlReviews && !createSummary) {
      return ResponseHelper.validationError(
        reply,
        'At least one option (crawlMenus, crawlReviews, or createSummary) must be selected'
      );
    }

    try {
      const jobQueueManager = await import('../services/job-queue-manager.service');

      // 입력 정규화 (공통 서비스 사용)
      const normalized = await crawlerInputHandler.normalizeInput({ url, restaurantId });
      const { restaurantId: targetRestaurantId, placeId, standardUrl } = normalized;

      // Queue에 추가 (통합 크롤링)
      const queueId = jobQueueManager.default.enqueue({
        type: 'restaurant_crawl',
        restaurantId: targetRestaurantId,
        placeId: placeId || '',
        url: standardUrl || '',
        metadata: {
          crawlMenus,
          crawlReviews,
          createSummary,
          resetSummary
        }
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
   * ✅ POST /api/crawler/bulk-queue
   * 여러 URL을 Queue에 일괄 추가
   */
  fastify.post('/bulk-queue', {
    schema: {
      tags: ['crawler'],
      summary: 'Queue 일괄 추가 API',
      description: '여러 URL을 Queue에 한번에 추가합니다. 각 URL은 별도의 Queue Item으로 생성됩니다. 이미 DB에 저장된 레스토랑은 건너뜁니다.',
      body: Type.Object({
        urls: Type.Array(Type.String(), {
          description: '네이버맵 URL 또는 Place ID 목록',
          minItems: 1
        }),
        crawlMenus: Type.Optional(Type.Boolean({
          description: '메뉴 크롤링 여부 (기본: true)',
          default: true
        })),
        crawlReviews: Type.Optional(Type.Boolean({
          description: '리뷰 크롤링 여부 (기본: true)',
          default: true
        })),
        createSummary: Type.Optional(Type.Boolean({
          description: '리뷰 요약 생성 여부 (기본: true)',
          default: true
        })),
        resetSummary: Type.Optional(Type.Boolean({
          description: '기존 요약 삭제 후 재생성 여부 (기본: false)',
          default: false
        }))
      }),
      response: {
        200: Type.Object({
          result: Type.Boolean(),
          message: Type.String(),
          data: Type.Object({
            total: Type.Number({ description: '전체 URL 개수' }),
            queued: Type.Number({ description: 'Queue에 추가된 개수' }),
            skipped: Type.Number({ description: '중복/에러로 건너뛴 개수' }),
            alreadyExists: Type.Number({ description: 'DB에 이미 존재하는 개수' }),
            results: Type.Array(Type.Object({
              url: Type.String(),
              queueId: Type.Optional(Type.String()),
              restaurantId: Type.Optional(Type.Number()),
              position: Type.Optional(Type.Number()),
              status: Type.String({ description: 'queued | duplicate | already_exists | error' }),
              error: Type.Optional(Type.String())
            }))
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
    let {
      urls,
      crawlMenus = true,
      crawlReviews = true,
      createSummary = true,
      resetSummary = false
    } = request.body as {
      urls: string[];
      crawlMenus?: boolean;
      crawlReviews?: boolean;
      createSummary?: boolean;
      resetSummary?: boolean;
    };

    // 검증
    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return ResponseHelper.validationError(reply, 'URLs array is required and must not be empty');
    }

    if (!crawlMenus && !crawlReviews && !createSummary) {
      return ResponseHelper.validationError(
        reply,
        'At least one option (crawlMenus, crawlReviews, or createSummary) must be selected'
      );
    }

    try {
      const jobQueueManager = await import('../services/job-queue-manager.service');
      const restaurantRepository = await import('../db/repositories/restaurant.repository');

      // Place ID 변환
      urls = urls.map(url => {
        const trimmed = url.trim();
        return /^\d+$/.test(trimmed)
          ? `https://m.place.naver.com/restaurant/${trimmed}/home`
          : trimmed;
      });

      const results = [];
      let queuedCount = 0;
      let skippedCount = 0;
      let alreadyExistsCount = 0;

      console.log(`[BulkQueue] ${urls.length}개 URL 일괄 추가 시작`);

      // 각 URL에 대해 Queue Item 생성
      for (const url of urls) {
        try {
          // 1. URL에서 Place ID 추출
          const placeIdMatch = url.match(/\/restaurant\/(\d+)/);
          const placeId = placeIdMatch ? placeIdMatch[1] : null;

          // 2. DB에 이미 존재하는지 체크
          if (placeId) {
            const existingRestaurant = await restaurantRepository.default.findByPlaceId(placeId);
            
            if (existingRestaurant) {
              results.push({
                url,
                restaurantId: existingRestaurant.id,
                status: 'already_exists'
              });
              alreadyExistsCount++;
              console.log(`⏭️  [BulkQueue] ${url} → DB에 이미 존재 (restaurantId: ${existingRestaurant.id})`);
              continue;
            }
          }

          // 3. 입력 정규화 (DB 저장 포함)
          const normalized = await crawlerInputHandler.normalizeInput({ url });

          // 4. Queue에 추가
          const queueId = jobQueueManager.default.enqueue({
            type: 'restaurant_crawl',
            restaurantId: normalized.restaurantId,
            placeId: normalized.placeId || '',
            url: normalized.standardUrl || '',
            metadata: { crawlMenus, crawlReviews, createSummary, resetSummary }
          });

          const stats = jobQueueManager.default.getStats();

          results.push({
            url,
            queueId,
            restaurantId: normalized.restaurantId,
            position: stats.waiting + stats.processing,
            status: 'queued'
          });
          queuedCount++;

          console.log(`✅ [BulkQueue] ${url} → Queue 추가 성공 (queueId: ${queueId})`);

        } catch (error: any) {
          const errorMessage = error.message || 'Unknown error';

          results.push({
            url,
            status: errorMessage.includes('already queued') ? 'duplicate' : 'error',
            error: errorMessage
          });
          skippedCount++;

          console.log(`⏭️  [BulkQueue] ${url} → ${errorMessage.includes('already queued') ? '중복' : '에러'}`);
        }
      }

      console.log(`[BulkQueue] 완료 - 성공: ${queuedCount}, 이미 존재: ${alreadyExistsCount}, 건너뜀: ${skippedCount}`);

      return ResponseHelper.success(reply, {
        total: urls.length,
        queued: queuedCount,
        skipped: skippedCount,
        alreadyExists: alreadyExistsCount,
        results
      }, `${queuedCount}/${urls.length}개 Queue에 추가됨, ${alreadyExistsCount}개 이미 존재`);

    } catch (error: any) {
      console.error('[BulkQueue] 에러:', error);
      return ResponseHelper.error(
        reply,
        error instanceof Error ? error.message : 'Failed to add jobs to queue',
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
