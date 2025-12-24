import puppeteer from 'puppeteer';
import { promises as fs } from 'fs';
import type { CrawlerContext, BrowserOptions } from './types';

/**
 * Chrome 실행 파일 경로 자동 감지
 */
async function getChromePath(): Promise<string | undefined> {
  const possiblePaths = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ];

  for (const chromePath of possiblePaths) {
    try {
      await fs.access(chromePath);
      return chromePath;
    } catch {
      // 파일이 없으면 다음 경로 시도
    }
  }

  return undefined;
}

/**
 * 브라우저 시작 및 페이지 생성
 */
export async function initBrowser(
  ctx: CrawlerContext,
  options: BrowserOptions = {}
): Promise<void> {
  const { headless = true, protocolTimeout = 600000 } = options;

  const chromePath = await getChromePath();

  const launchOptions: Parameters<typeof puppeteer.launch>[0] = {
    headless,
    protocolTimeout,
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
      '--window-size=1920,1080',
      // 이미지 로딩 최적화 (URL만 추출하면 되므로 실제 이미지 불필요)
      '--blink-settings=imagesEnabled=false',
      '--disable-remote-fonts'
    ]
  };

  if (chromePath) {
    launchOptions.executablePath = chromePath;
    console.log('[Browser] Using Chrome at:', chromePath);
  } else {
    console.log('[Browser] Using bundled Chromium');
  }

  console.log(`[Browser] 시작 모드: ${headless ? 'Headless' : 'Non-headless'}`);

  // 브라우저 시작
  ctx.browser = await puppeteer.launch(launchOptions);

  // 페이지 생성
  ctx.page = await ctx.browser.newPage();

  // 리소스 차단 설정 (성능 최적화)
  await ctx.page.setRequestInterception(true);
  ctx.page.on('request', (req) => {
    const resourceType = req.resourceType();
    if (['stylesheet', 'font', 'media'].includes(resourceType)) {
      req.abort();
    } else {
      req.continue();
    }
  });

  // User Agent 설정
  await ctx.page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  );

  // 뷰포트 설정 (높이 확장으로 더 많은 요소 로딩)
  await ctx.page.setViewport({ width: 1920, height: 4000 });

  console.log('[Browser] 브라우저 및 페이지 초기화 완료');
}

/**
 * 브라우저 안전하게 종료
 */
export async function closeBrowser(ctx: CrawlerContext): Promise<void> {
  if (ctx.page) {
    try {
      await ctx.page.close();
    } catch (error) {
      console.error('[Browser] 페이지 종료 중 오류:', error);
    }
    ctx.page = null;
  }

  if (ctx.browser) {
    try {
      const pages = await ctx.browser.pages();
      await Promise.all(pages.map(page => page.close().catch(() => {})));
      await ctx.browser.close();
      console.log('[Browser] 브라우저가 정상적으로 종료되었습니다.');
    } catch (error) {
      console.error('[Browser] 브라우저 종료 중 오류:', error);
      try {
        const browserProcess = ctx.browser.process();
        if (browserProcess) {
          browserProcess.kill('SIGKILL');
          console.log('[Browser] 브라우저를 강제 종료했습니다.');
        }
      } catch (killError) {
        console.error('[Browser] 브라우저 강제 종료 실패:', killError);
      }
    }
    ctx.browser = null;
  }
}

/**
 * 초기 컨텍스트 생성
 */
export function createContext(url: string): CrawlerContext {
  return {
    browser: null,
    page: null,
    originalUrl: url,
    finalUrl: url,
    crawlUrl: url,
    placeId: null,
    totalReviewCount: 0,
    loadedReviewCount: 0
  };
}
