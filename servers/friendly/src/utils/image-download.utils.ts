import {promises as fs} from 'fs';
import path from 'path';
import fetch from 'node-fetch';

/**
 * 이미지 다운로드 유틸리티
 * 네이버 리뷰 이미지를 로컬에 저장
 */
export class ImageDownloader {
  private baseDir: string;

  constructor() {
    // data/images 디렉토리 (reviews, menus 하위 디렉토리 생성)
    this.baseDir = path.join(process.cwd(), 'data', 'images');
  }

  /**
   * 이미지 다운로드 및 저장
   * @param imageUrl 이미지 URL
   * @param placeId 레스토랑 Place ID
   * @param reviewHash 리뷰 해시 (중복 방지)
   * @param index 이미지 순번
   * @returns 저장된 파일 경로 (상대 경로) 또는 null
   */
  async downloadImage(
    imageUrl: string,
    placeId: string,
    reviewHash: string,
    index: number
  ): Promise<string | null> {
    try {
      // 1. 디렉토리 생성 (reviews/placeId/reviewHash)
      const reviewDir = path.join(this.baseDir, 'reviews', placeId, reviewHash);
      await fs.mkdir(reviewDir, { recursive: true });

      // 2. 이미지 다운로드
      const response = await fetch(imageUrl, {
        timeout: 10000, // 10초 타임아웃
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (!response.ok) {
        console.error(`이미지 다운로드 실패 (HTTP ${response.status}):`, imageUrl);
        return null;
      }

      // 3. 파일 크기 제한 체크 (5MB)
      const contentLength = response.headers.get('content-length');
      if (contentLength && parseInt(contentLength, 10) > 5 * 1024 * 1024) {
        console.warn('이미지 크기가 5MB를 초과하여 건너뜁니다:', imageUrl);
        return null;
      }

      const buffer = await response.buffer();

      // 4. 파일 확장자 추출
      const ext = this.getExtension(imageUrl) || 'jpg';
      const filename = `${index}.${ext}`;
      const filePath = path.join(reviewDir, filename);

      // 5. 파일 저장
      await fs.writeFile(filePath, buffer);

      // 6. 상대 경로 반환 (API에서 서빙할 경로, /data/ 프리픽스 포함)
      const relativePath = `/data/images/reviews/${placeId}/${reviewHash}/${filename}`;
      console.log(`✅ 이미지 저장 완료: ${relativePath}`);

      return relativePath;

    } catch (error) {
      console.error('이미지 다운로드 중 오류:', error);
      return null;
    }
  }

  /**
   * 여러 이미지를 병렬로 다운로드 (최대 3개 동시)
   * @param imageUrls 이미지 URL 배열
   * @param placeId 레스토랑 Place ID
   * @param reviewHash 리뷰 해시
   * @returns 저장된 파일 경로 배열
   */
  async downloadImages(
    imageUrls: string[],
    placeId: string,
    reviewHash: string
  ): Promise<string[]> {
    const downloadedPaths: string[] = [];
    const batchSize = 3; // 동시에 다운로드할 이미지 수

    for (let i = 0; i < imageUrls.length; i += batchSize) {
      const batch = imageUrls.slice(i, i + batchSize);
      const promises = batch.map((url, batchIndex) =>
        this.downloadImage(url, placeId, reviewHash, i + batchIndex)
      );

      const results = await Promise.all(promises);

      // null이 아닌 경로만 추가
      results.forEach(path => {
        if (path) {
          downloadedPaths.push(path);
        }
      });
    }

    return downloadedPaths;
  }

  /**
   * 메뉴 이미지 다운로드
   * @param imageUrl 이미지 URL
   * @param placeId 레스토랑 Place ID
   * @param menuIndex 메뉴 순번
   * @returns 저장된 파일 경로 (상대 경로) 또는 null
   */
  async downloadMenuImage(
    imageUrl: string,
    placeId: string,
    menuIndex: number
  ): Promise<string | null> {
    try {
      // 1. 디렉토리 생성 (menus/placeId)
      const menuDir = path.join(this.baseDir, 'menus', placeId);
      await fs.mkdir(menuDir, { recursive: true });

      // 2. 이미지 다운로드
      const response = await fetch(imageUrl, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (!response.ok) {
        console.error(`메뉴 이미지 다운로드 실패 (HTTP ${response.status}):`, imageUrl);
        return null;
      }

      // 3. 파일 크기 제한 체크 (5MB)
      const contentLength = response.headers.get('content-length');
      if (contentLength && parseInt(contentLength, 10) > 5 * 1024 * 1024) {
        console.warn('메뉴 이미지 크기가 5MB를 초과하여 건너뜁니다');
        return null;
      }

      const buffer = await response.buffer();

      // 4. 파일 확장자 추출
      const ext = this.getExtension(imageUrl) || 'jpg';
      const filename = `menu_${menuIndex}.${ext}`;
      const filePath = path.join(menuDir, filename);

      // 5. 파일 저장
      await fs.writeFile(filePath, buffer);

      // 6. 상대 경로 반환 (API에서 서빙할 경로)
      return `/data/images/menus/${placeId}/${filename}`;

    } catch (error) {
      console.error('메뉴 이미지 다운로드 중 오류:', error);
      return null;
    }
  }

  /**
   * URL에서 파일 확장자 추출
   * @param url 이미지 URL
   * @returns 확장자 (jpg, png, gif, webp 등) 또는 null
   */
  private getExtension(url: string): string | null {
    const match = url.match(/\.(jpg|jpeg|png|gif|webp)(\?|$)/i);
    return match ? match[1] : null;
  }
}

// Singleton instance
const imageDownloader = new ImageDownloader();
export default imageDownloader;
