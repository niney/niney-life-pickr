import puppeteer, { Browser } from 'puppeteer';
import { promises as fs } from 'fs';
import type { NaverPlaceSearchResult } from '../types/naver-place.types';

/**
 * 네이버 플레이스 검색 서비스
 * 키워드로 검색하여 맛집 리스트를 반환
 */
class NaverPlaceSearchService {
  /**
   * Chrome 실행 파일 경로 자동 감지
   */
  private async getChromePath(): Promise<string | undefined> {
    const possiblePaths = [
      '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', // macOS
      '/usr/bin/google-chrome-stable', // Linux
      '/usr/bin/google-chrome', // Linux
      '/usr/bin/chromium-browser', // Linux
      'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', // Windows
      'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe', // Windows
    ];

    for (const chromePath of possiblePaths) {
      try {
        await fs.access(chromePath);
        return chromePath;
      } catch {
        // 파일이 없으면 다음 경로 시도
      }
    }

    return undefined; // Puppeteer will use bundled Chromium
  }

  /**
   * 브라우저 인스턴스 생성
   */
  private async launchBrowser(headless: boolean = true): Promise<Browser> {
    const chromePath = await this.getChromePath();
    const launchOptions: Parameters<typeof puppeteer.launch>[0] = {
      headless,
      protocolTimeout: 60000,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-extensions',
        '--disable-plugins',
        '--disable-default-apps',
        '--disable-background-networking',
        '--window-size=1920,1080'
      ]
    };

    if (chromePath) {
      launchOptions.executablePath = chromePath;
      console.log('🌐 Using Chrome at:', chromePath);
    } else {
      console.log('🌐 Using bundled Chromium');
    }

    console.log(`🚀 브라우저 시작 모드: ${headless ? 'Headless' : 'Non-headless'}`);
    return await puppeteer.launch(launchOptions);
  }

  /**
   * iframe 내에서 자동 스크롤하여 추가 결과 로드 (최적화)
   */
  private async autoScroll(frame: any, maxResults: number = 50): Promise<void> {
    await frame.evaluate(async (targetCount: number) => {
      const scrollContainer = document.querySelector('#_pcmap_list_scroll_container');
      if (!scrollContainer) return;

      await new Promise<void>((resolve) => {
        let previousHeight = 0;
        let stableCount = 0;
        const maxStableCount = 3; // 3번 연속 높이 변화 없으면 종료
        const scrollSpeed = 300; // 빠른 스크롤 (이전 100 -> 300)
        const checkInterval = 50; // 체크 주기 (이전 100 -> 50)

        const timer = setInterval(() => {
          const currentHeight = scrollContainer.scrollHeight;
          const itemCount = document.querySelectorAll('#_pcmap_list_scroll_container ul > li').length;

          // 목표 개수 도달하면 조기 종료
          if (itemCount >= targetCount) {
            console.log(`✅ 목표 개수 도달: ${itemCount}개`);
            clearInterval(timer);
            resolve();
            return;
          }

          // 스크롤 실행
          scrollContainer.scrollBy(0, scrollSpeed);

          // 높이 변화 감지
          if (currentHeight === previousHeight) {
            stableCount++;
            if (stableCount >= maxStableCount) {
              console.log(`📏 더 이상 콘텐츠가 없음 (최종: ${itemCount}개)`);
              clearInterval(timer);
              resolve();
            }
          } else {
            stableCount = 0;
            previousHeight = currentHeight;
          }
        }, checkInterval);

        // 최대 30초 타임아웃
        setTimeout(() => {
          clearInterval(timer);
          resolve();
        }, 30000);
      });
    }, maxResults);

    // 마지막 로딩 대기 (이전 2000 -> 500)
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  /**
   * 네이버 플레이스 검색
   * @param keyword 검색 키워드
   * @param options 검색 옵션
   */
  async searchPlaces(
    keyword: string,
    options: {
      maxResults?: number;
      enableScroll?: boolean;
      headless?: boolean;
    } = {}
  ): Promise<NaverPlaceSearchResult> {
    const {
      maxResults = 50,
      enableScroll = true,
      headless = true
    } = options;

    let browser: Browser | null = null;

    try {
      const startTime = Date.now();
      console.log(`🔍 네이버 플레이스 검색 시작: "${keyword}"`);

      browser = await this.launchBrowser(headless);
      const page = await browser.newPage();

      // 네이버 플레이스 검색 URL로 이동
      const searchUrl = `https://map.naver.com/v5/search/${encodeURIComponent(keyword)}`;
      console.log(`📍 검색 URL: ${searchUrl}`);

      await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });

      // iframe 대기 및 찾기 (재시도 로직 추가)
      await page.waitForSelector('iframe#searchIframe', { timeout: 10000 });

      // iframe이 로드될 때까지 대기
      await new Promise(resolve => setTimeout(resolve, 1000));

      // iframe을 찾을 때까지 재시도
      let searchFrame: any = null;
      let retries = 0;
      const maxRetries = 20;

      while (!searchFrame && retries < maxRetries) {
        const frames = page.frames();
        searchFrame = frames.find(f => f.name() === 'searchIframe');

        if (!searchFrame) {
          await new Promise(resolve => setTimeout(resolve, 100));
          retries++;
        }
      }

      if (!searchFrame) {
        // iframe을 이름으로 못 찾으면 URL로 시도
        const frames = page.frames();
        searchFrame = frames.find(f => f.url().includes('searchIframe'));

        if (!searchFrame) {
          console.log('📋 사용 가능한 frames:', frames.map(f => ({ name: f.name(), url: f.url() })));
          throw new Error('검색 결과 iframe을 찾을 수 없습니다.');
        }
      }

      // 리스트 컨테이너 대기
      await searchFrame.waitForSelector('#_pcmap_list_scroll_container ul', { timeout: 10000 });

      // 스크롤을 통한 추가 결과 로드
      if (enableScroll) {
        console.log('📜 스크롤하여 추가 결과 로드 중...');
        await this.autoScroll(searchFrame, maxResults);
      }

      // 데이터 추출
      console.log('📊 데이터 추출 중...');
      const places = await searchFrame.evaluate(() => {
        const items: any[] = [];
        const liElements = document.querySelectorAll('#_pcmap_list_scroll_container ul > li');

        liElements.forEach((li) => {
          try {
            const placeData: any = {};

            // 가게명
            const nameEl = li.querySelector('.TYaxT');
            placeData.name = nameEl ? nameEl.textContent?.trim() : '';

            // 카테고리
            const categoryEl = li.querySelector('.KCMnt');
            placeData.category = categoryEl ? categoryEl.textContent?.trim() : '';

            // 광고 여부
            placeData.isAd = !!li.querySelector('.gU6bV._DHlh');

            // 영업 상태 및 리뷰 수
            const statusEls = li.querySelectorAll('.MVx6e .h69bs');
            statusEls.forEach(el => {
              const text = el.textContent?.trim() || '';
              if (text.includes('영업') || text.includes('운영')) {
                placeData.status = text;
              } else if (text.includes('리뷰')) {
                placeData.reviewCount = parseInt(text.replace(/[^0-9]/g, ''), 10) || 0;
              }
            });

            // TV 출연 정보
            const tvEl = li.querySelector('.V1dzc .Uv2x8');
            placeData.tvShow = tvEl ? tvEl.textContent?.trim() : null;

            // 예약/쿠폰 라벨
            const labels = li.querySelectorAll('.urQl1 .place_blind');
            placeData.hasReservation = Array.from(labels).some(label =>
              label.textContent?.includes('예약')
            );
            placeData.hasCoupon = Array.from(labels).some(label =>
              label.textContent?.includes('쿠폰')
            );

            // 이미지 URL 수집
            const imgEls = li.querySelectorAll('.yLaWz img.K0PDV');
            placeData.images = Array.from(imgEls).map(img => (img as HTMLImageElement).src);

            // 리뷰 스니펫
            const reviewEls = li.querySelectorAll('.ZUcHo .u4vcQ span');
            placeData.reviewSnippets = Array.from(reviewEls)
              .map(span => span.textContent?.trim() || '')
              .filter(text => text.length > 0);

            // 주소 정보
            const addressEl = li.querySelector('.MVx6e .h69bs');
            if (addressEl && !addressEl.textContent?.includes('리뷰')) {
              placeData.address = addressEl.textContent?.trim();
            }

            // Place ID 추출은 하지 않음 (성능 최적화)
            // 사용자가 선택한 레스토랑만 별도 API로 추출

            if (Object.keys(placeData).length > 0 && placeData.name) {
              items.push(placeData);
            }
          } catch (error) {
            console.error('아이템 파싱 오류:', error);
          }
        });

        return items;
      });

      // 최대 결과 수 제한
      const limitedPlaces = places.slice(0, maxResults);

      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(`✅ 검색 완료: ${limitedPlaces.length}개 결과 (${duration}ms)`);

      return {
        keyword,
        totalCount: limitedPlaces.length,
        places: limitedPlaces,
        crawledAt: new Date().toISOString(),
        duration
      };
    } finally {
      if (browser) {
        await browser.close();
        console.log('🔒 브라우저 종료');
      }
    }
  }

  /**
   * 선택된 레스토랑들의 Place ID 추출
   * CHC5F 영역을 클릭하여 URL 변경을 감지하고 Place ID를 추출
   * @param keyword 검색 키워드
   * @param restaurantNames 추출할 레스토랑 이름 배열
   * @param options 검색 옵션
   */
  async extractPlaceIds(
    keyword: string,
    restaurantNames: string[],
    options: {
      headless?: boolean;
    } = {}
  ): Promise<Array<{ name: string; placeId: string | null; url: string | null }>> {
    const { headless = true } = options;

    let browser: Browser | null = null;

    try {
      const startTime = Date.now();
      console.log(`🔍 Place ID 추출 시작: ${restaurantNames.length}개 레스토랑`);

      browser = await this.launchBrowser(headless);
      const page = await browser.newPage();

      // 네이버 플레이스 검색 URL로 이동
      const searchUrl = `https://map.naver.com/v5/search/${encodeURIComponent(keyword)}`;
      await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 30000 });

      // iframe 대기 및 찾기
      await page.waitForSelector('iframe#searchIframe', { timeout: 10000 });
      await new Promise(resolve => setTimeout(resolve, 1000));

      // iframe 찾기
      let searchFrame: any = null;
      let retries = 0;
      const maxRetries = 20;

      while (!searchFrame && retries < maxRetries) {
        const frames = page.frames();
        searchFrame = frames.find(f => f.name() === 'searchIframe');

        if (!searchFrame) {
          await new Promise(resolve => setTimeout(resolve, 100));
          retries++;
        }
      }

      if (!searchFrame) {
        const frames = page.frames();
        searchFrame = frames.find(f => f.url().includes('searchIframe'));

        if (!searchFrame) {
          throw new Error('검색 결과 iframe을 찾을 수 없습니다.');
        }
      }

      // 리스트 컨테이너 대기
      await searchFrame.waitForSelector('#_pcmap_list_scroll_container ul', { timeout: 10000 });

      const results: Array<{ name: string; placeId: string | null; url: string | null }> = [];

      // 각 레스토랑에 대해 Place ID 추출
      for (const restaurantName of restaurantNames) {
        console.log(`  📍 "${restaurantName}" Place ID 추출 중...`);

        try {
          // a.place_bluelink selector 찾기
          const selector = await searchFrame.evaluate((name: string) => {
            const liElements = document.querySelectorAll('#_pcmap_list_scroll_container ul > li');

            for (let i = 0; i < liElements.length; i++) {
              const li = liElements[i];
              const nameEl = li.querySelector('.TYaxT');
              const itemName = nameEl ? nameEl.textContent?.trim() : '';

              if (itemName === name) {
                return `#_pcmap_list_scroll_container ul > li:nth-child(${i + 1}) .CHC5F a.place_bluelink`;
              }
            }

            return null;
          }, restaurantName);

          if (selector) {
            console.log(`    📍 Selector: ${selector}`);

            // Puppeteer의 frame.click() 사용
            await searchFrame.click(selector, { delay: 100 });

            // 클릭 후 URL 변경 대기
            await new Promise(resolve => setTimeout(resolve, 800));

            // URL에서 Place ID 추출
            const currentUrl = page.url();
            const placeIdMatch = currentUrl.match(/place\/(\d+)/);

            if (placeIdMatch) {
              const extractedPlaceId = placeIdMatch[1];
              console.log(`    ✓ 클릭 완료`);
              console.log(`    ✓ Place ID: ${extractedPlaceId}`);

              results.push({
                name: restaurantName,
                placeId: extractedPlaceId,
                url: `https://m.place.naver.com/restaurant/${extractedPlaceId}/home`
              });
            } else {
              console.log(`    ✗ URL에서 Place ID를 찾을 수 없음`);
              results.push({
                name: restaurantName,
                placeId: null,
                url: null
              });
            }
          } else {
            console.log(`    ✗ 레스토랑을 찾을 수 없음`);
            results.push({
              name: restaurantName,
              placeId: null,
              url: null
            });
          }

          // 다음 항목 처리 전 잠시 대기
          await new Promise(resolve => setTimeout(resolve, 300));

        } catch (error) {
          console.error(`    ✗ "${restaurantName}" 추출 실패:`, error);
          results.push({
            name: restaurantName,
            placeId: null,
            url: null
          });
        }
      }      const endTime = Date.now();
      const duration = endTime - startTime;

      const successCount = results.filter(r => r.placeId !== null).length;
      console.log(`✅ Place ID 추출 완료: ${successCount}/${restaurantNames.length}개 성공 (${duration}ms)`);

      return results;
    } finally {
      if (browser) {
        await browser.close();
        console.log('🔒 브라우저 종료');
      }
    }
  }
}

export default new NaverPlaceSearchService();
