/**
 * Cloud Ollama Web 서비스
 * CloudOllamaChatService 상속, 웹 검색/페치 기능 추가
 */

import { CloudOllamaChatService } from './cloud-ollama-chat.service';
import type {
  ChatMessage,
  ChatOptions,
  CloudOllamaChatConfig,
  WebSearchResult,
  WebSearchResultItem,
  WebFetchResult,
} from './ollama-chat.types';

export interface WebSearchOptions {
  maxResults?: number;
}

export class CloudOllamaWebService extends CloudOllamaChatService {
  constructor(config: CloudOllamaChatConfig) {
    super(config);
  }

  /**
   * 웹 검색
   */
  async webSearch(query: string, options?: WebSearchOptions): Promise<WebSearchResult> {
    try {
      const response = await this.client.webSearch({
        query,
        maxResults: options?.maxResults ?? 5,
      });

      // 응답 정규화
      const results: WebSearchResultItem[] = (response.results || []).map((r: any) => ({
        title: r.title || r.name || '',
        url: r.url || r.link || '',
        snippet: r.snippet || r.description || '',
        description: r.description || r.snippet || '',
      }));

      return { results };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`웹 검색 오류: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * 웹 페이지 페치 (URL의 콘텐츠 가져오기)
   */
  async webFetch(url: string): Promise<WebFetchResult> {
    try {
      // ollama 라이브러리에 webFetch가 있는지 확인 필요
      // 없으면 fetch API로 대체
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; OllamaBot/1.0)',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const content = await response.text();

      // 간단한 제목 추출
      const titleMatch = content.match(/<title[^>]*>([^<]+)<\/title>/i);
      const title = titleMatch ? titleMatch[1].trim() : undefined;

      return { url, content, title };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`웹 페치 오류: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * 웹 검색 결과를 기반으로 채팅
   */
  async chatWithSearch(
    query: string,
    question: string,
    options?: ChatOptions & WebSearchOptions
  ): Promise<string> {
    // 1. 웹 검색
    const searchResult = await this.webSearch(query, {
      maxResults: options?.maxResults ?? 3,
    });

    // 2. 검색 결과 컨텍스트 구성
    const searchContext = searchResult.results
      .map((r, i) => `[${i + 1}] ${r.title}\n${r.snippet}`)
      .join('\n\n');

    // 3. 검색 결과와 함께 채팅
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: '웹 검색 결과를 바탕으로 사용자 질문에 정확하게 답하세요. 검색 결과에 없는 내용은 추측하지 마세요.',
      },
      {
        role: 'user',
        content: `웹 검색 결과:\n${searchContext}\n\n질문: ${question}`,
      },
    ];

    return this.chat(messages, options);
  }

  /**
   * URL 페이지 내용을 기반으로 채팅
   */
  async chatWithFetch(
    url: string,
    question: string,
    options?: ChatOptions
  ): Promise<string> {
    // 1. 웹 페이지 페치
    const fetchResult = await this.webFetch(url);

    // HTML에서 텍스트만 추출 (간단한 버전)
    const textContent = fetchResult.content
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 8000); // 컨텍스트 제한

    // 2. 페이지 내용과 함께 채팅
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: '웹 페이지 내용을 바탕으로 사용자 질문에 답하세요.',
      },
      {
        role: 'user',
        content: `페이지 제목: ${fetchResult.title || 'N/A'}\nURL: ${url}\n\n페이지 내용:\n${textContent}\n\n질문: ${question}`,
      },
    ];

    return this.chat(messages, options);
  }
}
