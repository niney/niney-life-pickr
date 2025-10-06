import puppeteer, { Browser, Page } from 'puppeteer';
import { promises as fs } from 'fs';
import type {
  MenuItem,
  RestaurantInfo,
  ReviewInfo,
  CrawlResult,
  CrawlOptions
} from '../types/crawler.types';

/**
 * DOM 타입 선언 (page.evaluate() 내부에서 사용)
 * 브라우저 컨텍스트에서 실행되는 코드이므로 DOM API 사용 가능
 */
declare global {
  interface Window {
    location: Location;
    getComputedStyle(element: Element): CSSStyleDeclaration;
  }
}

class NaverCrawlerService {
  /**
   * 성능 측정용 타이밍 로그
   */
  private logTiming(step: string, startTime: number): number {
    const currentTime = Date.now();
    const elapsed = currentTime - startTime;
    console.log(`⏱️ ${step}: ${elapsed}ms`);
    return currentTime;
  }

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
        continue;
      }
    }

    return undefined; // Puppeteer will use bundled Chromium
  }

  /**
   * 브라우저 인스턴스 생성
   */
  async launchBrowser(): Promise<Browser> {
    const chromePath = await this.getChromePath();
    const launchOptions: Parameters<typeof puppeteer.launch>[0] = {
      headless: false, // 디버깅을 위해 브라우저 창 표시
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
      console.log('Using Chrome at:', chromePath);
    } else {
      console.log('Using bundled Chromium');
    }

    return await puppeteer.launch(launchOptions);
  }

  /**
   * 브라우저 안전하게 종료
   */
  async closeBrowser(browser: Browser | null): Promise<void> {
    if (browser) {
      try {
        // 모든 페이지 닫기
        const pages = await browser.pages();
        await Promise.all(pages.map(page => page.close().catch(() => {})));

        // 브라우저 닫기
        await browser.close();
        console.log('브라우저가 정상적으로 종료되었습니다.');
      } catch (error) {
        console.error('브라우저 종료 중 오류:', error);
        // 강제 종료 시도
        try {
          const browserProcess = browser.process();
          if (browserProcess) {
            browserProcess.kill('SIGKILL');
            console.log('브라우저를 강제 종료했습니다.');
          }
        } catch (killError) {
          console.error('브라우저 강제 종료 실패:', killError);
        }
      }
    }
  }

  /**
   * URL에서 Place ID 추출 (다양한 형태 지원)
   */
  extractPlaceId(url: string): string | null {
    console.log('Place ID 추출 시도:', url);

    // 0. naver.me 단축 URL은 리다이렉트 후 처리되어야 함
    if (url.includes('naver.me')) {
      console.warn('naver.me URL은 리다이렉트 후 처리되어야 합니다');
      return null;
    }

    // 1. PC 버전: https://map.naver.com/p/entry/place/12345
    let match = url.match(/map\.naver\.com\/p\/entry\/place\/(\d+)/);
    if (match) {
      console.log('PC p/entry/place에서 Place ID 추출:', match[1]);
      return match[1];
    }

    // 2. PC 버전: https://map.naver.com/v5/entry/place/12345
    match = url.match(/map\.naver\.com\/v5\/entry\/place\/(\d+)/);
    if (match) {
      console.log('PC v5/entry/place에서 Place ID 추출:', match[1]);
      return match[1];
    }

    // 3. 모바일 버전: https://m.place.naver.com/restaurant/12345
    match = url.match(/m\.place\.naver\.com\/restaurant\/(\d+)/);
    if (match) {
      console.log('모바일 버전에서 Place ID 추출:', match[1]);
      return match[1];
    }

    // 4. Place 직접 링크: https://place.naver.com/restaurant/12345
    match = url.match(/place\.naver\.com\/restaurant\/(\d+)/);
    if (match) {
      console.log('Place 직접 링크에서 Place ID 추출:', match[1]);
      return match[1];
    }

    // 5. 기존 패턴: place/12345
    match = url.match(/place\/(\d+)/);
    if (match) {
      console.log('기존 패턴에서 Place ID 추출:', match[1]);
      return match[1];
    }

    // 6. 검색 URL에서 placeUid 추출: ?placeUid=12345
    match = url.match(/[?&]placeUid=(\d+)/);
    if (match) {
      console.log('placeUid에서 Place ID 추출:', match[1]);
      return match[1];
    }

    // 7. 검색 URL에서 id 추출: ?id=12345
    match = url.match(/[?&]id=(\d+)/);
    if (match) {
      console.log('id 파라미터에서 Place ID 추출:', match[1]);
      return match[1];
    }

    console.warn('Place ID를 추출할 수 없는 URL:', url);
    return null;
  }

  /**
   * 네이버맵 맛집 정보 크롤링 (홈 + 메뉴 페이지)
   */
  async crawlRestaurant(url: string, options?: CrawlOptions): Promise<RestaurantInfo> {
    const { crawlMenus = true } = options || {};
    let startTime = Date.now();
    startTime = this.logTiming('크롤링 시작', startTime);

    let browser: Browser | null = null;
    let page: Page | null = null;

    try {
      // 매번 새 브라우저 인스턴스 생성
      browser = await this.launchBrowser();
      startTime = this.logTiming('브라우저 시작', startTime);

      page = await browser.newPage();
      startTime = this.logTiming('브라우저 페이지 생성', startTime);

      // 성능 최적화를 위한 리소스 차단
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        const resourceType = req.resourceType();
        // 이미지, 스타일시트, 폰트, 미디어 차단으로 속도 향상
        if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
          req.abort();
        } else {
          req.continue();
        }
      });

      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      await page.setViewport({ width: 1920, height: 1080 });

      // 1단계: 홈 페이지에서 기본 정보 크롤링
      console.log('1단계: 홈 페이지 크롤링 시작:', url);

      // naver.me 단축 URL 처리
      let finalUrl = url;
      let crawlUrl = url; // 실제 크롤링할 URL

      if (url.includes('naver.me')) {
        console.log('naver.me 단축 URL 감지, 리다이렉트 처리...');
        await page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: 20000
        });
        finalUrl = page.url(); // 리다이렉트된 최종 URL 가져오기
        console.log('리다이렉트된 URL:', finalUrl);

        // Place ID 추출 후 모바일 URL로 변환
        const placeId = this.extractPlaceId(finalUrl);
        if (placeId) {
          crawlUrl = `https://m.place.naver.com/restaurant/${placeId}/home`;
          console.log('모바일 URL로 변환하여 크롤링:', crawlUrl);
          await page.goto(crawlUrl, {
            waitUntil: 'domcontentloaded',
            timeout: 20000
          });
        }
      } else {
        // 일반 URL도 모바일 URL인지 확인
        if (!url.includes('m.place.naver.com')) {
          const placeId = this.extractPlaceId(url);
          if (placeId) {
            crawlUrl = `https://m.place.naver.com/restaurant/${placeId}/home`;
            console.log('모바일 URL로 변환:', crawlUrl);
          }
        }
        await page.goto(crawlUrl, {
          waitUntil: 'domcontentloaded',
          timeout: 20000
        });
      }
      startTime = this.logTiming('홈 페이지 로드 완료', startTime);

      // 핵심 요소가 로드될 때까지 대기
      console.log('핵심 요소 로드 대기 중...');
      try {
        await page.waitForSelector('#_title > div > span.GHAhO', { timeout: 5000 });
        console.log('제목 요소 로드 완료');
      } catch (error) {
        console.log('제목 요소 대기 시간 초과, 계속 진행...');
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      startTime = this.logTiming('요소 대기 완료', startTime);

      // 기본 정보 추출 - 동적 로딩 대기
      console.log('식당 기본 정보 추출 시작...');

      // 전화번호와 주소 요소가 텍스트를 가질 때까지 대기
      console.log('전화번호/주소 텍스트 로딩 대기 중...');
      try {
        await page.waitForFunction(
          () => {
            const phoneEl = document.querySelector('.O8qbU.nbXkr span.xlx7Q');
            const addressEl = document.querySelector('.O8qbU.tQY7D span.LDgIH');

            const phoneHasText = phoneEl && phoneEl.textContent && phoneEl.textContent.trim().length > 0;
            const addressHasText = addressEl && addressEl.textContent && addressEl.textContent.trim().length > 0;

            return phoneHasText || addressHasText;
          },
          {
            timeout: 5000,
            polling: 500
          }
        );
        console.log('전화번호/주소 텍스트 로드 완료');
      } catch (error) {
        console.log('전화번호/주소 텍스트 로딩 타임아웃, 계속 진행...');
      }

      // 추가 대기 (렌더링 완료 보장)
      await new Promise(resolve => setTimeout(resolve, 1000));

      const restaurantInfo = await page.evaluate(() => {
        const getName = (): string | null => {
          const nameElement = document.querySelector('#_title > div > span.GHAhO');
          return nameElement?.textContent?.trim() || null;
        };

        const getCategory = (): string | null => {
          const categoryElement = document.querySelector('#_title > div > span.lnJFt');
          return categoryElement?.textContent?.trim() || null;
        };

        const getPhone = (): string | null => {
          const selectors = [
            '.O8qbU.nbXkr span.xlx7Q',
            '#app-root > div > div > div:nth-child(6) > div > div:nth-child(2) > div.place_section_content > div > div.O8qbU.nbXkr > div > span.xlx7Q',
            'span.xlx7Q'
          ];

          for (const selector of selectors) {
            const phoneElement = document.querySelector(selector);
            if (phoneElement) {
              const text = phoneElement.textContent?.trim();
              if (text && text.length > 0) {
                return text;
              }
            }
          }

          return null;
        };

        const getAddress = (): string | null => {
          const selectors = [
            '.O8qbU.tQY7D span.LDgIH',
            '#app-root > div > div > div:nth-child(6) > div > div:nth-child(2) > div.place_section_content > div > div.O8qbU.tQY7D > div > a > span.LDgIH',
            'span.LDgIH'
          ];

          for (const selector of selectors) {
            const addressElement = document.querySelector(selector);
            if (addressElement) {
              const text = addressElement.textContent?.trim();
              if (text && text.length > 0) {
                return text;
              }
            }
          }

          return null;
        };

        return {
          name: getName(),
          category: getCategory(),
          phone: getPhone(),
          address: getAddress()
        };
      });
      startTime = this.logTiming('기본 정보 추출 완료', startTime);

      console.log('추출된 식당 기본 정보:', restaurantInfo);

      // 2단계: 메뉴 페이지로 이동하여 메뉴 정보 크롤링
      const placeId = this.extractPlaceId(finalUrl || url);
      let menuItems: MenuItem[] = [];

      if (!crawlMenus) {
        console.log('메뉴 크롤링 건너뜀 (crawlMenus = false)');
      } else if (placeId) {
        const menuUrl = `https://m.place.naver.com/restaurant/${placeId}/menu/list`;
        console.log('2단계: 메뉴 페이지 크롤링 시작:', menuUrl);

        try {
          await page.goto(menuUrl, {
            waitUntil: 'domcontentloaded',
            timeout: 15000
          });

          // 메뉴 요소가 로드될 때까지 대기
          console.log('메뉴 요소 로드 대기 중...');
          try {
            await page.waitForSelector('li.E2jtL', { timeout: 3000 });
            console.log('메뉴 요소 로드 완료');
          } catch (error) {
            console.log('메뉴 요소 대기 시간 초과, 계속 진행...');
          }

          // 메뉴 더보기 버튼 모두 클릭
          console.log('메뉴 더보기 버튼(.TeItc) 클릭 시작...');
          let clickCount = 0;
          const maxClicks = 10;

          while (clickCount < maxClicks) {
            const moreButtonExists = await page.evaluate(() => {
              const buttons = document.querySelectorAll('.TeItc');

              for (let i = 0; i < buttons.length; i++) {
                const button = buttons[i] as HTMLElement;
                const rect = button.getBoundingClientRect();
                const isVisible = rect.width > 0 && rect.height > 0 &&
                                window.getComputedStyle(button).visibility !== 'hidden' &&
                                window.getComputedStyle(button).display !== 'none';

                if (isVisible) {
                  return true;
                }
              }

              return false;
            });

            if (moreButtonExists) {
              const clickResult = await page.evaluate(() => {
                const buttons = document.querySelectorAll('.TeItc');

                for (let i = 0; i < buttons.length; i++) {
                  const button = buttons[i] as HTMLElement;
                  const rect = button.getBoundingClientRect();
                  const isVisible = rect.width > 0 && rect.height > 0 &&
                                  window.getComputedStyle(button).visibility !== 'hidden' &&
                                  window.getComputedStyle(button).display !== 'none';

                  if (isVisible) {
                    button.click();
                    return true;
                  }
                }

                return false;
              });

              if (clickResult) {
                clickCount++;
                console.log(`메뉴 더보기 버튼 클릭 ${clickCount}/${maxClicks}`);
                await new Promise(resolve => setTimeout(resolve, 1500));
              } else {
                console.log('더보기 버튼 클릭 실패');
                break;
              }
            } else {
              console.log('더보기 버튼 없음 - 모든 메뉴 로드 완료');
              break;
            }
          }

          console.log(`총 ${clickCount}번의 메뉴 더보기 버튼 클릭 완료`);

          // 메뉴 정보 추출
          console.log('메뉴 정보 추출 시작...');
          menuItems = await page.evaluate(() => {
            const menuSelectors = [
              'li.E2jtL',
              '.menu_list li',
              '[class*="menu"] li',
              '.place_section_content li'
            ];

            let menuElements: NodeListOf<Element> | null = null;

            for (const selector of menuSelectors) {
              menuElements = document.querySelectorAll(selector);
              if (menuElements.length > 0) {
                console.log(`메뉴 요소 발견: ${selector}, 개수: ${menuElements.length}`);
                break;
              }
            }

            if (!menuElements || menuElements.length === 0) {
              console.log('메뉴 요소를 찾을 수 없습니다.');
              return [];
            }

            const items: MenuItem[] = [];

            menuElements.forEach((element) => {
              const nameSelectors = ['span.lPzHi', '.menu_name', '[class*="name"]'];
              let name: string | null = null;

              for (const selector of nameSelectors) {
                const nameElement = element.querySelector(selector);
                if (nameElement?.textContent?.trim()) {
                  name = nameElement.textContent.trim();
                  break;
                }
              }

              const descSelectors = ['div.kPogF', '.menu_desc', '[class*="desc"]'];
              let description: string | null = null;

              for (const selector of descSelectors) {
                const descElement = element.querySelector(selector);
                if (descElement?.textContent?.trim()) {
                  description = descElement.textContent.trim();
                  break;
                }
              }

              const priceSelectors = ['div.GXS1X', '.menu_price', '[class*="price"]'];
              let price: string | null = null;

              for (const selector of priceSelectors) {
                const priceElement = element.querySelector(selector);
                if (priceElement?.textContent?.trim()) {
                  price = priceElement.textContent.trim();
                  break;
                }
              }

              if (name) {
                items.push({
                  name,
                  description: description || undefined,
                  price: price || '가격 정보 없음',
                  image: undefined
                });
              }
            });

            return items;
          });
          startTime = this.logTiming('메뉴 페이지 크롤링 완료', startTime);

          console.log(`메뉴 페이지에서 ${menuItems.length}개의 메뉴 발견`);

        } catch (menuError) {
          console.log('메뉴 페이지 크롤링 실패:', menuError);
        }
      } else if (crawlMenus) {
        console.log('Place ID를 찾을 수 없어 메뉴 크롤링 불가');
      }

      // URL에서 좌표 정보 추출 시도
      const coordinates = await page.evaluate(() => {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('y') && urlParams.get('x')) {
          return {
            lat: parseFloat(urlParams.get('y')!),
            lng: parseFloat(urlParams.get('x')!)
          };
        }
        return null;
      });

      const result: RestaurantInfo = {
        name: restaurantInfo.name || 'Unknown',
        address: restaurantInfo.address || null,
        category: restaurantInfo.category || null,
        phone: restaurantInfo.phone || null,
        description: `${restaurantInfo.category || ''} - 메뉴 ${menuItems.length}개`,
        businessHours: null,
        coordinates,
        url: finalUrl || url,
        placeId: this.extractPlaceId(finalUrl || url),
        placeName: restaurantInfo.name,
        crawledAt: new Date().toISOString(),
        menuItems
      };

      startTime = this.logTiming('전체 크롤링 완료', startTime);

      console.log('전체 크롤링 완료:', {
        name: result.name,
        category: result.category,
        address: result.address,
        phone: result.phone,
        menuCount: menuItems.length
      });

      return result;

    } catch (error) {
      console.error('크롤링 에러:', error);
      throw error;
    } finally {
      if (page) {
        try {
          await page.close();
        } catch (pageCloseError) {
          console.error('페이지 종료 중 오류:', pageCloseError);
        }
      }

      await this.closeBrowser(browser);
    }
  }

  /**
   * 네이버플레이스 리뷰 크롤링
   */
  async crawlReviews(
    url: string,
    onProgress?: (current: number, total: number, review: ReviewInfo) => void,
    onCrawlProgress?: (current: number, total: number) => void
  ): Promise<ReviewInfo[]> {
    let startTime = Date.now();
    startTime = this.logTiming('리뷰 크롤링 시작', startTime);

    let browser: Browser | null = null;
    let page: Page | null = null;

    try {
      browser = await this.launchBrowser();
      startTime = this.logTiming('브라우저 시작', startTime);

      page = await browser.newPage();
      startTime = this.logTiming('브라우저 페이지 생성', startTime);

      // 성능 최적화를 위한 리소스 차단
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        const resourceType = req.resourceType();
        if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
          req.abort();
        } else {
          req.continue();
        }
      });

      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
      await page.setViewport({ width: 1920, height: 1080 });

      console.log('리뷰 페이지 로드 시작:', url);

      // naver.me 단축 URL 처리
      let finalUrl = url;
      let crawlUrl = url;

      if (url.includes('naver.me')) {
        console.log('naver.me 단축 URL 감지, 리다이렉트 처리...');
        await page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: 20000
        });
        finalUrl = page.url();
        console.log('리다이렉트된 URL:', finalUrl);

        const placeId = this.extractPlaceId(finalUrl);
        if (placeId) {
          crawlUrl = `https://m.place.naver.com/restaurant/${placeId}/review/visitor?reviewSort=recent`;
          console.log('모바일 리뷰 URL로 변환하여 크롤링:', crawlUrl);
          await page.goto(crawlUrl, {
            waitUntil: 'domcontentloaded',
            timeout: 20000
          });
        }
      } else {
        await page.goto(crawlUrl, {
          waitUntil: 'domcontentloaded',
          timeout: 20000
        });
      }
      startTime = this.logTiming('리뷰 페이지 로드 완료', startTime);

      // 리뷰 목록이 로드될 때까지 대기
      console.log('리뷰 목록 로드 대기 중...');
      try {
        await page.waitForSelector('#_review_list', { timeout: 10000 });
        await page.waitForSelector('#_review_list li.place_apply_pui', { timeout: 5000 });
        console.log('리뷰 목록 로드 완료');
      } catch (error) {
        console.log('리뷰 목록 대기 시간 초과, 계속 진행...');
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
      startTime = this.logTiming('요소 대기 완료', startTime);

      // 전체 리뷰 개수 추출
      let totalReviewCount = 0;
      try {
        totalReviewCount = await page.evaluate(() => {
          const countElement = document.querySelector('.place_section_count');
          if (countElement) {
            const text = countElement.textContent?.trim() || '';
            const match = text.match(/\d+/);
            return match ? parseInt(match[0], 10) : 0;
          }
          return 0;
        });
        console.log(`전체 리뷰 개수: ${totalReviewCount}개`);
      } catch (error) {
        console.log('전체 리뷰 개수 추출 실패:', error);
      }

      // 리뷰 목록 "더보기" 버튼을 반복 클릭
      console.log('리뷰 목록 더보기 버튼 클릭 시작...');

      let clickCount = 0;
      const maxClicks = 5000;
      let previousReviewCount = 0;
      let stableCount = 0;

      while (clickCount < maxClicks) {
        try {
          const currentReviewCount = await page.evaluate(() => {
            return document.querySelectorAll('#_review_list li.place_apply_pui').length;
          });

          console.log(`현재 로드된 리뷰 개수: ${currentReviewCount}`);

          // 리뷰가 증가했을 때 크롤링 진행 상황 콜백 호출
          if (currentReviewCount !== previousReviewCount && onCrawlProgress) {
            onCrawlProgress(currentReviewCount, totalReviewCount || currentReviewCount);
          }

          if (currentReviewCount === previousReviewCount) {
            stableCount++;
          } else {
            stableCount = 0;
            previousReviewCount = currentReviewCount;
          }

          if (stableCount >= 2) {
            console.log('리뷰 개수가 2번 연속 변하지 않음, 로딩 완료로 간주');
            break;
          }

          const moreButtonExists = await page.evaluate(() => {
            const buttons = document.querySelectorAll('a.fvwqf');
            for (let i = 0; i < buttons.length; i++) {
              const button = buttons[i];
              const text = button.textContent?.trim() || '';

              if (text.includes('펼쳐서 더보기') &&
                  !text.includes('팔로우') &&
                  !text.includes('follow') &&
                  !text.includes('구독')) {
                return true;
              }
            }
            return false;
          });

          if (moreButtonExists) {
            console.log(`리뷰 더보기 버튼 클릭 시도 ${clickCount + 1}/${maxClicks}`);

            const clickResult = await page.evaluate(() => {
              const buttons = document.querySelectorAll('a.fvwqf');
              for (let i = 0; i < buttons.length; i++) {
                const button = buttons[i];
                const text = button.textContent?.trim() || '';

                if (text.includes('펼쳐서 더보기') &&
                    !text.includes('팔로우') &&
                    !text.includes('follow') &&
                    !text.includes('구독')) {
                  (button as HTMLElement).click();
                  return true;
                }
              }
              return false;
            });

            if (clickResult) {
              clickCount++;
              await new Promise(resolve => setTimeout(resolve, 1000));
            } else {
              console.log('더보기 버튼 클릭 실패');
              stableCount++;
            }
          } else {
            console.log('더보기 버튼을 찾을 수 없음, 모든 리뷰 로드 완료');
            break;
          }

        } catch (error) {
          console.log('더보기 버튼 클릭 중 오류:', error);
          stableCount++;

          if (stableCount >= 3) {
            console.log('연속 3번 실패, 크롤링 중단');
            break;
          }
        }
      }

      console.log(`총 ${clickCount}번의 더보기 버튼 클릭 완료`);

      // 크롤링 완료 후 최종 리뷰 개수 확인 및 콜백 호출
      const loadedReviewCount = await page.evaluate(() => {
        return document.querySelectorAll('#_review_list li.place_apply_pui').length;
      });
      console.log(`로드된 리뷰 개수: ${loadedReviewCount}개`);

      // 최종 100% 진행 상황 콜백
      if (onCrawlProgress) {
        onCrawlProgress(loadedReviewCount, totalReviewCount || loadedReviewCount);
      }

      // 감정 키워드 더보기 버튼 클릭
      console.log('감정 키워드 더보기 버튼 클릭 중...');
      try {
        await page.evaluate(() => {
          const moreButtons = document.querySelectorAll('.pui__HLNvmI .pui__jhpEyP.pui__ggzZJ8[data-pui-click-code="keywordmore"]');
          for (let i = 0; i < moreButtons.length; i++) {
            try {
              (moreButtons[i] as HTMLElement).click();
            } catch {
              // 무시
            }
          }
        });
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.log('더보기 버튼 처리 중 오류:', error);
      }

      // 리뷰 정보 추출
      console.log('리뷰 정보 추출 시작...');
      const reviews = await page.evaluate(() => {
        const reviewElements = document.querySelectorAll('#_review_list li.place_apply_pui');
        console.log(`발견된 리뷰 요소 수: ${reviewElements.length}`);

        const reviews: ReviewInfo[] = [];

        reviewElements.forEach((element) => {
          try {
            const userNameElement = element.querySelector('.pui__NMi-Dp');
            const userName = userNameElement?.textContent?.trim() || null;

            // 방문 키워드 추출 (중복 제거)
            const visitKeywordElements = element.querySelectorAll('.pui__uqSlGl .pui__V8F9nN em, .pui__uqSlGl .pui__V8F9nN');
            const visitKeywords: string[] = [];
            const seenKeywords = new Set<string>();

            visitKeywordElements.forEach(el => {
              const text = el.textContent?.trim();
              if (text &&
                  !text.includes('대기 시간') &&
                  !text.includes('바로 입장') &&
                  !seenKeywords.has(text)) {
                seenKeywords.add(text);
                visitKeywords.push(text);
              }
            });

            // 대기시간 정보
            const waitTimeElements = element.querySelectorAll('.pui__uqSlGl .pui__V8F9nN');
            let waitTime = null;
            waitTimeElements.forEach(el => {
              const text = el.textContent?.trim();
              if (text?.includes('대기 시간')) {
                waitTime = text.includes('바로 입장') ? '바로 입장' : text;
              }
            });

            // 리뷰 텍스트
            const reviewTextElement = element.querySelector('.pui__vn15t2 a');
            const reviewText = reviewTextElement?.textContent?.trim() || null;

            // 감정 키워드 (중복 제거)
            const emotionKeywords: string[] = [];
            const seenEmotions = new Set<string>();
            const emotionElements = element.querySelectorAll('.pui__HLNvmI .pui__jhpEyP');

            emotionElements.forEach(el => {
              if (!el.hasAttribute('data-pui-click-code') || el.getAttribute('data-pui-click-code') !== 'keywordmore') {
                const text = el.textContent?.trim();
                if (text &&
                    !text.includes('개의 리뷰가 더 있습니다') &&
                    !text.includes('펼쳐보기') &&
                    !seenEmotions.has(text)) {
                  seenEmotions.add(text);
                  emotionKeywords.push(text);
                }
              }
            });

            // 방문 정보
            const visitInfoElements = element.querySelectorAll('.pui__QKE5Pr .pui__gfuUIT');
            let visitDate = null;
            let visitCount = null;
            let verificationMethod = null;

            visitInfoElements.forEach(el => {
              const text = el.textContent?.trim();
              if (text?.includes('번째 방문')) {
                visitCount = text;
              } else if (text?.includes('영수증') || text?.includes('카드결제')) {
                verificationMethod = text;
              } else if (text?.match(/^\d+\.\d+\./)) {
                visitDate = text;
              }
            });

            if (!visitDate) {
              const timeElement = element.querySelector('time');
              if (timeElement) {
                visitDate = timeElement.textContent?.trim() || null;
              }
            }

            if (userName || reviewText) {
              reviews.push({
                userName,
                visitKeywords,
                waitTime,
                reviewText,
                emotionKeywords,
                visitInfo: {
                  visitDate,
                  visitCount,
                  verificationMethod
                }
              });
            }
          } catch (error) {
            console.error('리뷰 추출 중 오류:', error);
          }
        });

        return reviews;
      });

      startTime = this.logTiming('리뷰 정보 추출 완료', startTime);
      console.log(`총 ${reviews.length}개의 리뷰 추출 완료`);

      // 진행 상황 콜백 호출 (실시간 전송)
      if (onProgress) {
        const total = reviews.length;
        for (let i = 0; i < reviews.length; i++) {
          onProgress(i + 1, total, reviews[i]);
        }
      }

      return reviews;

    } catch (error) {
      console.error('리뷰 크롤링 에러:', error);
      throw error;
    } finally {
      if (page) {
        try {
          await page.close();
        } catch (pageCloseError) {
          console.error('페이지 종료 중 오류:', pageCloseError);
        }
      }

      await this.closeBrowser(browser);
    }
  }

  /**
   * 여러 URL 일괄 처리
   */
  async crawlMultipleRestaurants(urls: string[]): Promise<CrawlResult<RestaurantInfo>[]> {
    const results: CrawlResult<RestaurantInfo>[] = [];

    for (const url of urls) {
      try {
        const data = await this.crawlRestaurant(url);
        results.push({
          success: true,
          data
        });
      } catch (error) {
        results.push({
          success: false,
          url,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return results;
  }
}

// Singleton instance
const naverCrawlerService = new NaverCrawlerService();

export default naverCrawlerService;
