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
