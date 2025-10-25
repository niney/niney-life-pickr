/**
 * 리뷰 컴포넌트 타입 정의
 */

/**
 * Review
 *
 * 리뷰 데이터 구조
 */
export interface Review {
  id: number;
  userName: string | null;
  reviewText: string | null;
  images: string[];
  visitKeywords: string[];
  emotionKeywords: string[];
  visitInfo: {
    visitDate: string | null;
    visitCount: string | null;
    verificationMethod: string | null;
  };
  waitTime: string | null;
  summary: ReviewSummary | null;
}

/**
 * ReviewSummary
 *
 * AI 리뷰 요약 데이터
 */
export interface ReviewSummary {
  summary: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  sentimentReason: string | null;
  keyKeywords: string[];
  satisfactionScore: number | null;
  menuItems: MenuItem[];
  tips: string[];
}

/**
 * MenuItem
 *
 * 리뷰에서 언급된 메뉴 아이템
 */
export interface MenuItem {
  name: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  reason?: string;
}

/**
 * ReviewCardProps
 *
 * 리뷰 카드 컴포넌트 Props
 */
export interface ReviewCardProps {
  review: Review;
  theme: 'light' | 'dark';
  colors: any; // THEME_COLORS type
  expandedKeywords: Set<number>;
  onToggleKeywords: (reviewId: number) => void;
  onOpenResummary: (reviewId: number) => void;
  onImagePress: (images: string[], index: number) => void;
}

/**
 * ReviewHeaderProps
 *
 * 리뷰 헤더 컴포넌트 Props
 */
export interface ReviewHeaderProps {
  userName: string | null;
  visitDate: string | null;
  colors: any;
  onOpenResummary: () => void;
}

/**
 * ReviewSummaryProps
 *
 * AI 요약 컴포넌트 Props
 */
export interface ReviewSummaryProps {
  summary: ReviewSummary;
  reviewId: number;
  theme: 'light' | 'dark';
  colors: any;
  expandedKeywords: Set<number>;
  onToggleKeywords: (reviewId: number) => void;
}

/**
 * SentimentFilter
 *
 * 리뷰 감정 필터 타입
 */
export type SentimentFilter = 'all' | 'positive' | 'negative' | 'neutral';
