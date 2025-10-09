/**
 * 네이버 리뷰 방문 날짜 파싱 유틸리티
 * 
 * 예시:
 * - "8.16.토" -> "2024-08-16" (올해)
 * - "24.10.6.일" -> "2024-10-06"
 * - "23.12.29.금" -> "2023-12-29"
 */

/**
 * 네이버 리뷰 날짜 형식을 ISO 날짜 문자열로 변환
 * @param visitDateStr 네이버 리뷰 날짜 (예: "8.16.토", "24.10.6.일")
 * @returns ISO 날짜 문자열 (YYYY-MM-DD) 또는 null
 */
export function parseVisitDate(visitDateStr: string | null): string | null {
  if (!visitDateStr) {
    return null;
  }

  try {
    // 요일 제거 (토, 일, 월, 화, 수, 목, 금)
    const cleaned = visitDateStr.replace(/\.(토|일|월|화|수|목|금)$/, '');
    
    // "." 으로 분리
    const parts = cleaned.split('.');
    
    if (parts.length < 2) {
      console.warn(`Invalid visit date format: ${visitDateStr}`);
      return null;
    }

    const currentYear = new Date().getFullYear();
    let year: number;
    let month: number;
    let day: number;

    if (parts.length === 2) {
      // "8.16" 형식 - 년도 없음, 올해로 간주
      year = currentYear;
      month = parseInt(parts[0], 10);
      day = parseInt(parts[1], 10);
    } else if (parts.length === 3) {
      // "24.10.6" 형식 - 년도 있음 (2자리)
      const yearPart = parseInt(parts[0], 10);
      
      // 2자리 년도를 4자리로 변환
      // 00-99 -> 2000-2099
      year = yearPart < 100 ? 2000 + yearPart : yearPart;
      
      month = parseInt(parts[1], 10);
      day = parseInt(parts[2], 10);
    } else {
      console.warn(`Unexpected visit date format: ${visitDateStr}`);
      return null;
    }

    // 유효성 검사
    if (isNaN(year) || isNaN(month) || isNaN(day)) {
      console.warn(`Invalid date components in: ${visitDateStr}`);
      return null;
    }

    if (month < 1 || month > 12 || day < 1 || day > 31) {
      console.warn(`Invalid month or day in: ${visitDateStr}`);
      return null;
    }

    // ISO 형식 문자열 생성 (YYYY-MM-DD)
    const isoDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    // 날짜 유효성 재검증 (예: 2월 30일 같은 경우)
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) {
      console.warn(`Invalid date created: ${isoDate} from ${visitDateStr}`);
      return null;
    }

    return isoDate;
  } catch (error) {
    console.error(`Error parsing visit date "${visitDateStr}":`, error);
    return null;
  }
}

/**
 * ISO 날짜 문자열을 네이버 형식으로 변환 (역변환, 필요 시 사용)
 * @param isoDate ISO 날짜 문자열 (YYYY-MM-DD)
 * @returns 네이버 형식 (YY.M.D) 또는 null
 */
export function formatToNaverDate(isoDate: string | null): string | null {
  if (!isoDate) {
    return null;
  }

  try {
    const date = new Date(isoDate);
    if (isNaN(date.getTime())) {
      return null;
    }

    const year = date.getFullYear() % 100; // 2024 -> 24
    const month = date.getMonth() + 1;
    const day = date.getDate();

    return `${year}.${month}.${day}`;
  } catch (error) {
    console.error(`Error formatting date "${isoDate}":`, error);
    return null;
  }
}
