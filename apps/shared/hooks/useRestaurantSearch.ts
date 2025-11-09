import { useState, useCallback } from 'react';
import { apiService, NaverPlaceSearchResult, RestaurantSearchRequest } from '../services';

export interface UseRestaurantSearchResult {
  searchResult: NaverPlaceSearchResult | null;
  isLoading: boolean;
  error: string | null;
  selectedRestaurantNames: string[];
  extractedPlaceIds: Array<{ name: string; placeId: string | null; url: string | null }>;
  isExtracting: boolean;
  searchRestaurants: (params: RestaurantSearchRequest) => Promise<void>;
  clearResults: () => void;
  toggleRestaurantSelection: (name: string) => void;
  clearSelection: () => void;
  selectAll: () => void;
  extractPlaceIds: () => Promise<void>;
}

export const useRestaurantSearch = (): UseRestaurantSearchResult => {
  const [searchResult, setSearchResult] = useState<NaverPlaceSearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRestaurantNames, setSelectedRestaurantNames] = useState<string[]>([]);
  const [extractedPlaceIds, setExtractedPlaceIds] = useState<Array<{ name: string; placeId: string | null; url: string | null }>>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [lastSearchKeyword, setLastSearchKeyword] = useState<string>('');

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

  return {
    searchResult,
    isLoading,
    error,
    selectedRestaurantNames,
    extractedPlaceIds,
    isExtracting,
    searchRestaurants,
    clearResults,
    toggleRestaurantSelection,
    clearSelection,
    selectAll,
    extractPlaceIds
  };
};
