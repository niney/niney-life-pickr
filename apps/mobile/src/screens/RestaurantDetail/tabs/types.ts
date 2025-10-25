/**
 * 레스토랑 상세 화면 탭 타입 정의
 */

/**
 * TabType
 *
 * 레스토랑 상세 화면의 탭 종류
 * - menu: 메뉴 탭 (레스토랑 메뉴 목록)
 * - review: 리뷰 탭 (리뷰 목록 및 AI 요약)
 * - statistics: 통계 탭 (메뉴별 감정 분석 통계)
 * - map: 지도 탭 (네이버맵 연동)
 */
export type TabType = 'menu' | 'review' | 'statistics' | 'map';

/**
 * TabConfig
 *
 * 탭 설정 인터페이스 (확장 가능)
 */
export interface TabConfig {
  type: TabType;
  label: string;
  icon?: string;
  badge?: number;
}

/**
 * TabChangeHandler
 *
 * 탭 변경 핸들러 함수 타입
 */
export type TabChangeHandler = (tab: TabType) => void;
