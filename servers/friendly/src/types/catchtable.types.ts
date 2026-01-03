/**
 * 캐치테이블 API 타입 정의
 */

// 캐치테이블 외부 API 응답의 리뷰 아이템
export interface CatchtableApiReview {
  reviewSeq: number;
  articleSeq: number;
  isEditable: boolean;
  regDate: number; // Unix timestamp (ms)
  writer: {
    userIdentifier: string;
    displayName: string;
    profileThumbUrl: string | null;
    grade: string | null;
    totalReviewCnt: number | null;
    totalAvgScore: number | null;
  };
  bossReply: string | null;
  content: {
    totalScore: number;
    tasteScore: number;
    moodScore: number;
    serviceScore: number;
    reviewContent: string;
    reviewComment: string | null;
  };
  reservation: {
    reservationType: string;
    isTakeOut: boolean;
    foodType: {
      code: string;
      label: string;
    };
  };
  engagement: {
    replyCnt: number;
    likeCnt: number;
    isLiked: boolean;
  };
}

// 캐치테이블 외부 API 응답
export interface CatchtableApiResponse {
  resultCode: string | null;
  displayMessage: string | null;
  message: string | null;
  data: {
    items: CatchtableApiReview[];
  };
}

// DB 저장용 Input 타입
export interface CatchtableReviewInput {
  restaurant_id: number;
  review_seq: number;
  article_seq: number | null;
  is_editable: boolean;
  reg_date: number | null;
  writer_identifier: string | null;
  writer_display_name: string | null;
  writer_profile_thumb_url: string | null;
  writer_grade: string | null;
  writer_total_review_cnt: number | null;
  writer_total_avg_score: number | null;
  boss_reply: string | null;
  total_score: number | null;
  taste_score: number | null;
  mood_score: number | null;
  service_score: number | null;
  review_content: string | null;
  review_comment: string | null;
  reservation_type: string | null;
  is_take_out: boolean;
  food_type_code: string | null;
  food_type_label: string | null;
  reply_cnt: number;
  like_cnt: number;
  is_liked: boolean;
}

// DB 엔티티 타입
export interface CatchtableReviewDB {
  id: number;
  restaurant_id: number;
  review_seq: number;
  article_seq: number | null;
  is_editable: number; // SQLite boolean (0/1)
  reg_date: number | null;
  writer_identifier: string | null;
  writer_display_name: string | null;
  writer_profile_thumb_url: string | null;
  writer_grade: string | null;
  writer_total_review_cnt: number | null;
  writer_total_avg_score: number | null;
  boss_reply: string | null;
  total_score: number | null;
  taste_score: number | null;
  mood_score: number | null;
  service_score: number | null;
  review_content: string | null;
  review_comment: string | null;
  reservation_type: string | null;
  is_take_out: number; // SQLite boolean (0/1)
  food_type_code: string | null;
  food_type_label: string | null;
  reply_cnt: number;
  like_cnt: number;
  is_liked: number; // SQLite boolean (0/1)
  crawled_at: string;
  created_at: string;
  updated_at: string;
}
