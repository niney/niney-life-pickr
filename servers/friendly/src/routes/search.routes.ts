import { FastifyPluginAsync } from 'fastify';
import { Type } from '@sinclair/typebox';
import naverPlaceSearchService from '../services/naver-place-search.service';
import { ResponseHelper } from '../utils/response.utils';

/**
 * TypeBox 스키마 정의
 */

// 네이버 플레이스 아이템 스키마
const NaverPlaceItemSchema = Type.Object({
  name: Type.String({ description: '가게명' }),
  category: Type.Optional(Type.String({ description: '카테고리' })),
  address: Type.Optional(Type.String({ description: '주소' })),
  status: Type.Optional(Type.String({ description: '영업 상태' })),
  reviewCount: Type.Optional(Type.Number({ description: '리뷰 수' })),
  isAd: Type.Boolean({ description: '광고 여부' }),
  tvShow: Type.Union([Type.String(), Type.Null()], { description: 'TV 출연 정보' }),
  hasReservation: Type.Boolean({ description: '예약 가능 여부' }),
  hasCoupon: Type.Boolean({ description: '쿠폰 보유 여부' }),
  images: Type.Array(Type.String(), { description: '이미지 URL 목록' }),
  reviewSnippets: Type.Array(Type.String(), { description: '리뷰 스니펫' }),
  placeId: Type.Optional(Type.String({ description: '네이버 Place ID' })),
  url: Type.Optional(Type.String({ description: '상세 페이지 URL' }))
});

// 검색 결과 스키마
const SearchResultSchema = Type.Object({
  keyword: Type.String({ description: '검색 키워드' }),
  totalCount: Type.Number({ description: '총 결과 수' }),
  places: Type.Array(NaverPlaceItemSchema, { description: '검색 결과 목록' }),
  crawledAt: Type.String({ description: '크롤링 시간 (ISO 8601)' }),
  duration: Type.Number({ description: '소요 시간 (ms)' })
});

// 성공 응답 스키마
const SuccessResponseSchema = Type.Object({
  result: Type.Boolean(),
  message: Type.String(),
  data: SearchResultSchema,
  timestamp: Type.String()
});

// 에러 응답 스키마
const ErrorResponseSchema = Type.Object({
  result: Type.Boolean(),
  message: Type.String(),
  statusCode: Type.Number(),
  timestamp: Type.String()
});

/**
 * 네이버 플레이스 레스토랑 검색 라우트
 */
const searchRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/crawler/search
   * 네이버 플레이스 레스토랑 검색
   */
  fastify.get('/search', {
    schema: {
      tags: ['crawler'],
      summary: '네이버 플레이스 레스토랑 검색',
      description: '키워드로 네이버 플레이스를 검색하여 맛집 리스트를 반환합니다.',
      querystring: Type.Object({
        keyword: Type.String({
          description: '검색 키워드',
          examples: ['영등포구청 고기집', '강남 초밥']
        }),
        maxResults: Type.Optional(Type.Number({
          description: '최대 결과 수 (기본: 1000)',
          default: 1000,
          minimum: 1,
          maximum: 1000
        })),
        enableScroll: Type.Optional(Type.Boolean({
          description: '스크롤하여 추가 결과 로드 여부 (기본: true)',
          default: true
        })),
        headless: Type.Optional(Type.Boolean({
          description: 'Headless 모드 여부 (기본: true)',
          default: true
        }))
      }),
      response: {
        200: SuccessResponseSchema,
        400: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    },
    handler: async (request, reply) => {
      try {
        const { keyword, maxResults, enableScroll, headless } = request.query as {
          keyword: string;
          maxResults?: number;
          enableScroll?: boolean;
          headless?: boolean;
        };

        if (!keyword || keyword.trim().length === 0) {
          return ResponseHelper.validationError(reply, '검색 키워드를 입력해주세요.');
        }

        fastify.log.info({ keyword, maxResults, enableScroll, headless }, '네이버 플레이스 검색 요청');

        const result = await naverPlaceSearchService.searchPlaces(keyword, {
          maxResults,
          enableScroll,
          headless
        });

        return ResponseHelper.success(reply, result, '네이버 플레이스 검색 성공');

      } catch (error: any) {
        fastify.log.error(error, '네이버 플레이스 검색 실패');
        return ResponseHelper.error(reply, error.message || '검색 중 오류가 발생했습니다.', 500);
      }
    }
  });

  /**
   * POST /api/crawler/search
   * 네이버 플레이스 레스토랑 검색 (POST 버전)
   */
  fastify.post('/search', {
    schema: {
      tags: ['crawler'],
      summary: '네이버 플레이스 레스토랑 검색 (POST)',
      description: '키워드로 네이버 플레이스를 검색하여 맛집 리스트를 반환합니다. (POST 방식)',
      body: Type.Object({
        keyword: Type.String({
          description: '검색 키워드',
          examples: ['영등포구청 고기집', '강남 초밥']
        }),
        maxResults: Type.Optional(Type.Number({
          description: '최대 결과 수 (기본: 1000)',
          default: 1000,
          minimum: 1,
          maximum: 1000
        })),
        enableScroll: Type.Optional(Type.Boolean({
          description: '스크롤하여 추가 결과 로드 여부 (기본: true)',
          default: true
        })),
        headless: Type.Optional(Type.Boolean({
          description: 'Headless 모드 여부 (기본: true)',
          default: true
        }))
      }),
      response: {
        200: SuccessResponseSchema,
        400: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    },
    handler: async (request, reply) => {
      try {
        const { keyword, maxResults, enableScroll, headless } = request.body as {
          keyword: string;
          maxResults?: number;
          enableScroll?: boolean;
          headless?: boolean;
        };

        if (!keyword || keyword.trim().length === 0) {
          return ResponseHelper.validationError(reply, '검색 키워드를 입력해주세요.');
        }

        fastify.log.info({ keyword, maxResults, enableScroll, headless }, '네이버 플레이스 검색 요청 (POST)');

        const result = await naverPlaceSearchService.searchPlaces(keyword, {
          maxResults,
          enableScroll,
          headless
        });

        return ResponseHelper.success(reply, result, '네이버 플레이스 검색 성공');

      } catch (error: any) {
        fastify.log.error(error, '네이버 플레이스 검색 실패');
        return ResponseHelper.error(reply, error.message || '검색 중 오류가 발생했습니다.', 500);
      }
    }
  });

  /**
   * POST /api/crawler/extract-place-ids
   * 선택된 레스토랑들의 Place ID 추출
   */
  fastify.post('/extract-place-ids', {
    schema: {
      tags: ['crawler'],
      summary: '선택된 레스토랑 Place ID 추출',
      description: '사용자가 선택한 레스토랑들의 Place ID를 CHC5F 영역 클릭을 통해 추출합니다.',
      body: Type.Object({
        keyword: Type.String({
          description: '원본 검색 키워드',
          examples: ['영등포구청 고기집']
        }),
        restaurantNames: Type.Array(Type.String(), {
          description: '추출할 레스토랑 이름 배열',
          examples: [['육대장', '고기집 1번가', '소문난 고기집']]
        }),
        maxResults: Type.Optional(Type.Number({
          description: '최대 결과 수 (기본: 1000) - searchPlaces와 동일하게 설정해야 함',
          default: 1000,
          minimum: 1,
          maximum: 1000
        })),
        headless: Type.Optional(Type.Boolean({
          description: 'Headless 모드 여부 (기본: true)',
          default: true
        }))
      }),
      response: {
        200: Type.Object({
          result: Type.Boolean(),
          message: Type.String(),
          data: Type.Array(Type.Object({
            name: Type.String({ description: '레스토랑 이름' }),
            placeId: Type.Union([Type.String(), Type.Null()], { description: '추출된 Place ID' }),
            url: Type.Union([Type.String(), Type.Null()], { description: '상세 페이지 URL' })
          })),
          timestamp: Type.String()
        }),
        400: ErrorResponseSchema,
        500: ErrorResponseSchema
      }
    },
    handler: async (request, reply) => {
      try {
        const { keyword, restaurantNames, maxResults, headless } = request.body as {
          keyword: string;
          restaurantNames: string[];
          maxResults?: number;
          headless?: boolean;
        };

        if (!keyword || keyword.trim().length === 0) {
          return ResponseHelper.validationError(reply, '검색 키워드를 입력해주세요.');
        }

        if (!restaurantNames || restaurantNames.length === 0) {
          return ResponseHelper.validationError(reply, '레스토랑 이름을 입력해주세요.');
        }

        fastify.log.info(
          { keyword, count: restaurantNames.length, maxResults, headless },
          'Place ID 추출 요청'
        );

        const result = await naverPlaceSearchService.extractPlaceIds(keyword, restaurantNames, {
          maxResults,
          headless
        });

        return ResponseHelper.success(reply, result, 'Place ID 추출 완료');

      } catch (error: any) {
        fastify.log.error(error, 'Place ID 추출 실패');
        return ResponseHelper.error(reply, error.message || 'Place ID 추출 중 오류가 발생했습니다.', 500);
      }
    }
  });
};

export default searchRoutes;
