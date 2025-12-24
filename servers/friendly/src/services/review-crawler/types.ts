import type { Page, Browser } from 'puppeteer';

/**
 * 리뷰 크롤러 컨텍스트
 * 각 스텝 간에 공유되는 상태
 */
export interface CrawlerContext {
  /** Puppeteer 브라우저 인스턴스 */
  browser: Browser | null;
  /** Puppeteer 페이지 인스턴스 */
  page: Page | null;
  /** 원본 URL */
  originalUrl: string;
  /** 최종 URL (리다이렉트 후) */
  finalUrl: string;
  /** 크롤링할 URL */
  crawlUrl: string;
  /** Place ID */
  placeId: string | null;
  /** 전체 리뷰 개수 */
  totalReviewCount: number;
  /** 로드된 리뷰 개수 */
  loadedReviewCount: number;
}

/**
 * 브라우저 옵션
 */
export interface BrowserOptions {
  /** Headless 모드 여부 (기본: true) */
  headless?: boolean;
  /** 프로토콜 타임아웃 (기본: 600000 = 10분) */
  protocolTimeout?: number;
}

/**
 * 크롤링 옵션
 */
export interface CrawlOptions {
  /** 브라우저 옵션 */
  browserOptions?: BrowserOptions;
  /** 스크롤 활성화 (기본: true) */
  enableScroll?: boolean;
  /** 이미지 다운로드 활성화 (기본: true) */
  downloadImages?: boolean;
  /** 더보기 최대 클릭 횟수 (기본: 5000) */
  maxMoreClicks?: number;
}

/**
 * 진행 상황 콜백
 */
export interface ProgressCallbacks {
  /** 크롤링 진행 (더보기 클릭) */
  onCrawlProgress?: (current: number, total: number) => void;
  /** 리뷰 처리 진행 */
  onReviewProgress?: (current: number, total: number, review: RawReviewData) => void;
  /** 이미지 다운로드 진행 */
  onImageProgress?: (current: number, total: number) => void;
}

/**
 * 원시 리뷰 데이터 (DOM에서 추출한 그대로)
 */
export interface RawReviewData {
  userName: string | null;
  visitKeywords: string[];
  waitTime: string | null;
  reviewText: string | null;
  emotionKeywords: string[];
  visitInfo: {
    visitDate: string | null;
    visitCount: string | null;
    verificationMethod: string | null;
  };
  imageUrls: string[];
}

/**
 * 처리된 리뷰 데이터 (이미지 다운로드 후)
 */
export interface ProcessedReviewData {
  userName: string | null;
  visitKeywords: string[];
  waitTime: string | null;
  reviewText: string | null;
  emotionKeywords: string[];
  visitInfo: {
    visitDate: string | null;
    visitCount: string | null;
    verificationMethod: string | null;
  };
  images?: string[];
}

/**
 * 크롤링 결과
 */
export interface CrawlResult {
  /** 성공 여부 */
  success: boolean;
  /** 리뷰 목록 */
  reviews: ProcessedReviewData[];
  /** Place ID */
  placeId: string | null;
  /** 전체 리뷰 개수 */
  totalReviewCount: number;
  /** 에러 메시지 (실패 시) */
  error?: string;
}
