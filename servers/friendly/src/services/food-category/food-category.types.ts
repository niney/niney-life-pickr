/**
 * 음식 카테고리 분류 타입 정의
 */

/**
 * 분류된 카테고리 경로
 */
export interface CategoryPath {
  /** 입력 항목 (예: "감자전") */
  item: string;
  /** 분류 경로 (예: "음식 > 반찬 > 전") */
  path: string;
  /** 분리된 레벨 (예: ["음식", "반찬", "전"]) */
  levels: string[];
}

/**
 * 분류 결과
 */
export interface ClassifyResult {
  success: boolean;
  categories: CategoryPath[];
  /** 분류 실패한 항목들 */
  errors?: string[];
}

/**
 * 분류 옵션
 */
export interface ClassifyOptions {
  /** 한 번에 처리할 항목 수 (기본: 50) */
  batchSize?: number;
  /** 진행률 콜백 */
  onProgress?: (completed: number, total: number) => void;
}

/**
 * 카테고리 트리 노드
 */
export interface CategoryTreeNode {
  name: string;
  children: Map<string, CategoryTreeNode>;
  items: string[];
}

/**
 * LLM 응답 타입 (JSON)
 */
export interface ClassifyResponse {
  [item: string]: string;
}
