import crypto from 'crypto';

/**
 * 리뷰 고유 해시 생성
 * placeId + userName + visitDate + visitCount + receiptVerified 조합
 */
export function generateReviewHash(
  placeId: string,
  userName: string | null,
  visitDate: string | null,
  visitCount: string | null,
  verificationMethod: string | null
): string {
  // 정규화 (공백, 특수문자 제거)
  const normalizedUserName = userName?.trim() || 'anonymous';
  const normalizedVisitDate = visitDate?.replace(/[\.\s]/g, '') || '';
  const normalizedVisitCount = visitCount?.replace(/[^\d]/g, '') || '0';  // "1번째 방문" → "1"
  const hasReceipt = verificationMethod?.includes('영수증') ? 'Y' : 'N';

  const data = `${placeId}|${normalizedUserName}|${normalizedVisitDate}|${normalizedVisitCount}|${hasReceipt}`;

  return crypto.createHash('md5').update(data).digest('hex');
}

/**
 * 리뷰 이미지 폴더명용 짧은 해시 생성
 * 전체 해시의 앞 16자만 사용하여 파일시스템 호환성 향상
 */
export function generateReviewImageHash(
  placeId: string,
  userName: string | null,
  visitDate: string | null,
  visitCount: string | null,
  verificationMethod: string | null
): string {
  const fullHash = generateReviewHash(placeId, userName, visitDate, visitCount, verificationMethod);
  return fullHash.substring(0, 16);
}
