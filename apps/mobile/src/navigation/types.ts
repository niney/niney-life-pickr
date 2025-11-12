/**
 * Navigation Types
 * React Navigation 타입 정의
 */

import type { RestaurantData } from 'shared/services';
import type { NavigatorScreenParams } from '@react-navigation/native';

export type RootTabParamList = {
  Home: undefined;
  Restaurant: NavigatorScreenParams<RestaurantStackParamList>; // Stack Navigator 파라미터 지원
  RestaurantSearch: undefined;
  JobMonitor: undefined;
  Settings: undefined;
};

// Restaurant Stack Navigator 타입
export type RestaurantStackParamList = {
  RestaurantList: { searchAddress?: string } | undefined;
  RestaurantDetail: {
    restaurantId: number;
    restaurant?: RestaurantData;
  };
  RestaurantMap: undefined;
};
