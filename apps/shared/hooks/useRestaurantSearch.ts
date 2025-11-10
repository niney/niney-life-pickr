import { useState, useCallback } from 'react';
import { apiService, NaverPlaceSearchResult, RestaurantSearchRequest } from '../services';

export interface QueueResult {
  success: string[];
  failed: string[];
  errors: { placeId: string; name: string; error: string }[];
}

export interface UseRestaurantSearchResult {
  searchResult: NaverPlaceSearchResult | null;
  isLoading: boolean;
  error: string | null;
  selectedRestaurantNames: string[];
  extractedPlaceIds: Array<{ name: string; placeId: string | null; url: string | null }>;
  isExtracting: boolean;
  isAddingToQueue: boolean;
  queueResults: QueueResult;
  searchRestaurants: (params: RestaurantSearchRequest) => Promise<void>;
  clearResults: () => void;
  toggleRestaurantSelection: (name: string) => void;
  clearSelection: () => void;
  selectAll: () => void;
  extractPlaceIds: () => Promise<void>;
  addToQueue: () => Promise<void>;
}

export const useRestaurantSearch = (): UseRestaurantSearchResult => {
  const [searchResult, setSearchResult] = useState<NaverPlaceSearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRestaurantNames, setSelectedRestaurantNames] = useState<string[]>([]);
  const [extractedPlaceIds, setExtractedPlaceIds] = useState<Array<{ name: string; placeId: string | null; url: string | null }>>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [lastSearchKeyword, setLastSearchKeyword] = useState<string>('');
  const [isAddingToQueue, setIsAddingToQueue] = useState(false);
  const [queueResults, setQueueResults] = useState<QueueResult>({
    success: [],
    failed: [],
    errors: [],
  });

  const searchRestaurants = useCallback(async (params: RestaurantSearchRequest) => {
    if (!params.keyword || params.keyword.trim().length === 0) {
      setError('검색 키워드를 입력해주세요.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await apiService.searchRestaurants(params);
      
      if (response.result && response.data) {
        setSearchResult(response.data);
        setError(null);
        setLastSearchKeyword(params.keyword);
        // 검색 시 선택 및 추출 결과 초기화
        setSelectedRestaurantNames([]);
        setExtractedPlaceIds([]);
      } else {
        setError(response.message || '검색에 실패했습니다.');
        setSearchResult(null);
      }
    } catch (err: any) {
      console.error('Restaurant search error:', err);
      setError(err.message || '검색 중 오류가 발생했습니다.');
      setSearchResult(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearResults = useCallback(() => {
    setSearchResult(null);
    setError(null);
    setSelectedRestaurantNames([]);
    setExtractedPlaceIds([]);
    setLastSearchKeyword('');
  }, []);

  const toggleRestaurantSelection = useCallback((name: string) => {
    setSelectedRestaurantNames(prev => {
      if (prev.includes(name)) {
        return prev.filter(n => n !== name);
      } else {
        return [...prev, name];
      }
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedRestaurantNames([]);
    setExtractedPlaceIds([]);
  }, []);

  const selectAll = useCallback(() => {
    if (searchResult?.places) {
      const allNames = searchResult.places
        .map(place => place.name)
        .filter((name): name is string => name !== undefined && name.length > 0);
      setSelectedRestaurantNames(allNames);
    }
  }, [searchResult]);

  const extractPlaceIds = useCallback(async () => {
    if (selectedRestaurantNames.length === 0) {
      setError('추출할 레스토랑을 선택해주세요.');
      return;
    }

    if (!lastSearchKeyword) {
      setError('검색 키워드를 찾을 수 없습니다.');
      return;
    }

    setIsExtracting(true);
    setError(null);

    try {
      const response = await apiService.extractPlaceIds({
        keyword: lastSearchKeyword,
        restaurantNames: selectedRestaurantNames,
        headless: true
      });

      if (response.result && response.data) {
        setExtractedPlaceIds(response.data);
        setError(null);
      } else {
        setError(response.message || 'Place ID 추출에 실패했습니다.');
      }
    } catch (err: any) {
      console.error('Place ID extraction error:', err);
      setError(err.message || 'Place ID 추출 중 오류가 발생했습니다.');
    } finally {
      setIsExtracting(false);
    }
  }, [selectedRestaurantNames, lastSearchKeyword]);

  /**
   * 대기열에 일괄 추가
   */
  const addToQueue = useCallback(async () => {
    if (extractedPlaceIds.length === 0) {
      setError('추출된 Place ID가 없습니다. 먼저 Place ID를 추출해주세요.');
      return;
    }

    setIsAddingToQueue(true);
    setError(null);

    const results: QueueResult = {
      success: [],
      failed: [],
      errors: [],
    };

    try {
      // 성공한 Place ID만 필터링
      const validPlaceIds = extractedPlaceIds.filter(r => r.placeId);

      if (validPlaceIds.length === 0) {
        setError('유효한 Place ID가 없습니다.');
        return;
      }

      console.log(`[RestaurantSearch] ${validPlaceIds.length}개 Place ID를 대기열에 추가 시작...`);

      // 순차적으로 Queue에 추가 (rate limiting 고려)
      for (const result of validPlaceIds) {
        try {
          const response = await apiService.addToQueue({
            url: result.url || undefined,
          });

          if (response.result) {
            results.success.push(result.placeId!);
            console.log(`✅ Queue 추가 성공: ${result.name} (${result.placeId})`);
          } else {
            const errorMessage = response.message || 'Failed to add to queue';
            results.failed.push(result.placeId!);
            results.errors.push({
              placeId: result.placeId!,
              name: result.name,
              error: errorMessage,
            });
            console.error(`❌ Queue 추가 실패: ${result.name}`, errorMessage);
          }

          // Rate limiting: 100ms 대기
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error: any) {
          results.failed.push(result.placeId!);
          results.errors.push({
            placeId: result.placeId!,
            name: result.name,
            error: error.message || 'Unknown error',
          });
          console.error(`❌ Queue 추가 실패: ${result.name}`, error);
        }
      }

      setQueueResults(results);
      console.log(`[RestaurantSearch] 대기열 추가 완료 - 성공: ${results.success.length}, 실패: ${results.failed.length}`);
    } catch (err: any) {
      console.error('Queue 추가 중 오류:', err);
      setError(err.message || '대기열 추가 중 오류가 발생했습니다.');
    } finally {
      setIsAddingToQueue(false);
    }
  }, [extractedPlaceIds]);

  return {
    searchResult,
    isLoading,
    error,
    selectedRestaurantNames,
    extractedPlaceIds,
    isExtracting,
    isAddingToQueue,
    queueResults,
    searchRestaurants,
    clearResults,
    toggleRestaurantSelection,
    clearSelection,
    selectAll,
    extractPlaceIds,
    addToQueue,
  };
};
