import {FastifyPluginAsync} from 'fastify';
import {Type} from '@sinclair/typebox';
import menuStatisticsService from '../services/menu-statistics.service';
import {ResponseHelper} from '../utils/response.utils';

/**
 * TypeBox 스키마 정의
 */

// Top 메뉴 스키마
const TopMenuSchema = Type.Object({
  menuName: Type.String({description: '메뉴명'}),
  positiveRate: Type.Optional(Type.Number({description: '긍정률 (%)'})),
  negativeRate: Type.Optional(Type.Number({description: '부정률 (%)'})),
  mentions: Type.Number({description: '언급 횟수'}),
  positive: Type.Number({description: '긍정 언급 수'}),
  negative: Type.Number({description: '부정 언급 수'}),
  neutral: Type.Number({description: '중립 언급 수'})
});

// 메뉴별 감정 통계 스키마
const MenuSentimentStatsSchema = Type.Object({
  menuName: Type.String({description: '메뉴명'}),
  totalMentions: Type.Number({description: '총 언급 횟수'}),
  positive: Type.Number({description: '긍정 언급 수'}),
  negative: Type.Number({description: '부정 언급 수'}),
  neutral: Type.Number({description: '중립 언급 수'}),
  positiveRate: Type.Number({description: '긍정률 (%)'}),
  sentiment: Type.String({description: '전체 감정 평가 (positive/negative/neutral)'}),
  topReasons: Type.Object({
    positive: Type.Array(Type.String(), {description: '주요 긍정 이유'}),
    negative: Type.Array(Type.String(), {description: '주요 부정 이유'}),
    neutral: Type.Array(Type.String(), {description: '주요 중립 이유'})
  })
});

// 레스토랑 메뉴 통계 스키마
const RestaurantMenuStatisticsSchema = Type.Object({
  restaurantId: Type.Number({description: '레스토랑 ID'}),
  totalReviews: Type.Number({description: '전체 리뷰 수'}),
  analyzedReviews: Type.Number({description: '분석 완료된 리뷰 수'}),
  menuStatistics: Type.Array(MenuSentimentStatsSchema, {description: '메뉴별 통계'}),
  topPositiveMenus: Type.Array(TopMenuSchema, {description: 'Top 긍정 메뉴'}),
  topNegativeMenus: Type.Array(TopMenuSchema, {description: 'Top 부정 메뉴'})
});

/**
 * 메뉴 통계 라우트
 */
const menuStatisticsRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /api/restaurants/:id/menu-grouping
   * 메뉴명별 그룹핑 + 정규화 테이블에서 카테고리 조회
   */
  fastify.get('/:id/menu-grouping', {
    schema: {
      tags: ['menu-statistics'],
      summary: '메뉴명별 그룹핑 및 카테고리 조회',
      description: '메뉴명을 정규화하여 그룹핑하고, 정규화 테이블에서 카테고리를 조회합니다. 정규화 테이블에 없는 메뉴가 있으면 실패로 응답합니다.',
      params: Type.Object({
        id: Type.String({description: '레스토랑 ID'})
      }),
      querystring: Type.Object({
        source: Type.Optional(Type.Union([
          Type.Literal('naver'),
          Type.Literal('catchtable'),
          Type.Literal('all')
        ], {description: '리뷰 소스 (기본: naver)', default: 'naver'}))
      }),
      response: {
        200: Type.Object({
          result: Type.Boolean(),
          message: Type.String(),
          data: Type.Object({
            allMenusNormalized: Type.Boolean({ description: '모든 메뉴가 정규화 테이블에 존재하는지 여부' }),
            restaurantId: Type.Number(),
            source: Type.String(),
            totalItems: Type.Number(),
            groupedMenus: Type.Array(Type.Object({
              normalizedName: Type.String(),
              categoryPath: Type.Union([Type.String(), Type.Null()]),
              items: Type.Array(Type.Object({
                name: Type.String(),
                sentiment: Type.String(),
                reason: Type.Optional(Type.String())
              })),
              count: Type.Number()
            })),
            categories: Type.Array(Type.Object({
              item: Type.String(),
              path: Type.String(),
              levels: Type.Array(Type.String())
            })),
            missingMenus: Type.Optional(Type.Array(Type.String()))
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
    const {id} = request.params as { id: string };
    const {source = 'naver'} = request.query as {
      source?: 'naver' | 'catchtable' | 'all';
    };
    const restaurantId = parseInt(id, 10);

    if (isNaN(restaurantId)) {
      return ResponseHelper.error(reply, '유효하지 않은 레스토랑 ID입니다.', 400);
    }

    try {
      const groupingResult = await menuStatisticsService.getMenuGrouping(
        restaurantId,
        source
      );

      const message = groupingResult.allMenusNormalized
        ? `메뉴 그룹핑 완료: ${groupingResult.categories.length}개 카테고리 조회됨`
        : `정규화 테이블에 없는 메뉴가 있습니다: ${groupingResult.missingMenus?.slice(0, 5).join(', ')}${(groupingResult.missingMenus?.length ?? 0) > 5 ? ` 외 ${(groupingResult.missingMenus?.length ?? 0) - 5}개` : ''}`;

      return ResponseHelper.success(reply, groupingResult, message);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ 메뉴 그룹핑 조회 실패:', errorMessage);
      return ResponseHelper.error(reply, `메뉴 그룹핑 조회에 실패했습니다: ${errorMessage}`, 500);
    }
  });

  /**
   * GET /api/restaurants/:id/menu-statistics
   * 레스토랑별 메뉴 감정 통계 조회
   */
  fastify.get('/:id/menu-statistics', {
    schema: {
      tags: ['menu-statistics'],
      summary: '레스토랑별 메뉴 감정 통계 조회',
      description: '레스토랑의 리뷰에서 언급된 메뉴별로 긍정/부정/중립 통계를 집계합니다. source 파라미터로 네이버/캐치테이블/전체를 선택할 수 있습니다.',
      params: Type.Object({
        id: Type.String({description: '레스토랑 ID'})
      }),
      querystring: Type.Object({
        minMentions: Type.Optional(Type.Number({
          description: '최소 언급 횟수 필터 (기본: 1)',
          default: 1,
          minimum: 1
        })),
        source: Type.Optional(Type.Union([
          Type.Literal('naver'),
          Type.Literal('catchtable'),
          Type.Literal('all')
        ], {description: '리뷰 소스 (기본: naver)', default: 'naver'}))
      }),
      response: {
        200: Type.Object({
          result: Type.Boolean(),
          message: Type.String(),
          data: RestaurantMenuStatisticsSchema,
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
    const {id} = request.params as { id: string };
    const {minMentions = 1, source = 'naver'} = request.query as {
      minMentions?: number;
      source?: 'naver' | 'catchtable' | 'all';
    };
    const restaurantId = parseInt(id, 10);

    if (isNaN(restaurantId)) {
      return ResponseHelper.error(reply, '유효하지 않은 레스토랑 ID입니다.', 400);
    }

    try {
      let stats = await menuStatisticsService.calculateMenuStatistics(restaurantId, source);

      // 최소 언급 횟수 필터링
      if (minMentions > 1) {
        stats = {
          ...stats,
          menuStatistics: stats.menuStatistics.filter(
            (m) => m.totalMentions >= minMentions
          ),
        };
      }

      const sourceLabel = source === 'all' ? '전체' : source === 'catchtable' ? '캐치테이블' : '네이버';
      return ResponseHelper.success(
        reply,
        stats,
        `${sourceLabel} 메뉴 통계를 성공적으로 조회했습니다.`
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ 메뉴 통계 조회 실패:', errorMessage);
      return ResponseHelper.error(
        reply,
        `메뉴 통계 조회에 실패했습니다: ${errorMessage}`,
        500
      );
    }
  });
};

export default menuStatisticsRoutes;
