/**
 * Navigation Types
 * React Navigation 타입 정의
 */

import type { RestaurantData } from 'shared/services';

export type RootTabParamList = {
  Home: undefined;
  Restaurant: undefined; // Stack Navigator로 변경
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
